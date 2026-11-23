const { v4: uuidv4 } = require('uuid');

const STATUSES = ['incoming', 'in_progress', 'waiting', 'done', 'approved'];
const PRIORITIES = ['urgent', 'high', 'medium', 'low'];
const TASK_FIELDS =
  'id, batch_id, user_id, project_id, assignee_id, description, deadline, priority, status, confidence, evidence, unknowns, created_at';

function storeError(action, error) {
  const err = new Error(`Supabase ${action} failed: ${error.message}`);
  err.status = 502;
  return err;
}

function normalizeStatus(status) {
  if (status === 'approved') return 'incoming';
  return STATUSES.includes(status) ? status : 'incoming';
}

function validateProjectId(projectId) {
  if (projectId) return;
  const error = new Error('Choose a project before saving a task');
  error.status = 400;
  throw error;
}

async function findProject(supabase, projectId) {
  validateProjectId(projectId);
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single();
  if (error && error.code !== 'PGRST116') throw storeError('project lookup', error);
  if (!data) {
    const notFound = new Error('Project not found. Choose one of your projects.');
    notFound.status = 400;
    throw notFound;
  }
  return data;
}

async function findAssigneeId(supabase, owner) {
  const name = String(owner || '').trim();
  if (!name) return null;
  const { data, error } = await supabase
    .from('people')
    .select('id, name')
    .ilike('name', name);
  if (error) throw storeError('assignee lookup', error);
  const person = (data || []).find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (!person) {
    const notFound = new Error(
      `${name} is not in People & groups. Add the record or clear the assignment before saving.`
    );
    notFound.status = 400;
    throw notFound;
  }
  return person.id;
}

async function hydrateTasks(supabase, rows) {
  if (!rows.length) return [];
  const [projectResult, peopleResult] = await Promise.all([
    supabase.from('projects').select('id, name'),
    supabase.from('people').select('id, name, type'),
  ]);
  if (projectResult.error) throw storeError('project lookup', projectResult.error);
  if (peopleResult.error) throw storeError('assignee lookup', peopleResult.error);
  const projects = new Map((projectResult.data || []).map((item) => [item.id, item]));
  const people = new Map((peopleResult.data || []).map((item) => [item.id, item]));

  return rows.map((row) => ({
    id: row.id,
    batchId: row.batch_id,
    projectId: row.project_id,
    projectName: projects.get(row.project_id)?.name || null,
    assigneeId: row.assignee_id || null,
    owner: people.get(row.assignee_id)?.name || null,
    assigneeType: people.get(row.assignee_id)?.type || null,
    description: row.description,
    deadline: row.deadline,
    priority: row.priority,
    status: row.status,
    confidence: row.confidence,
    evidence: row.evidence,
    unknowns: row.unknowns || [],
    createdAt: row.created_at,
  }));
}

async function saveApprovedTasks({ supabase, userId, tasks, projectId }) {
  const approved = tasks.filter((task) => task.approved);
  if (approved.length === 0) {
    const error = new Error('No approved tasks to save');
    error.status = 400;
    throw error;
  }

  const batchId = uuidv4();
  const createdAt = new Date().toISOString();
  const projects = new Map();
  const rows = await Promise.all(
    approved.map(async (task) => {
      const selectedProjectId = task.projectId !== undefined ? task.projectId : projectId;
      const project = await findProject(supabase, selectedProjectId);
      projects.set(project.id, project);
      const description = String(task.editedDescription || task.description).trim();
      if (!description) {
        const error = new Error('Task description is required');
        error.status = 400;
        throw error;
      }
      return {
        id: uuidv4(),
        batch_id: batchId,
        user_id: userId,
        project_id: project.id,
        assignee_id: await findAssigneeId(
          supabase,
          task.editedOwner !== undefined ? task.editedOwner : task.owner
        ),
        description,
        deadline: task.editedDeadline !== undefined ? task.editedDeadline : task.deadline || null,
        priority: task.editedPriority !== undefined ? task.editedPriority : task.priority || null,
        status: normalizeStatus(task.status || 'incoming'),
        confidence: task.confidence ?? null,
        evidence: task.evidence ?? null,
        unknowns: task.unknowns || [],
        created_at: createdAt,
      };
    })
  );

  const { data, error } = await supabase
    .from('tasks')
    .insert(rows)
    .select(TASK_FIELDS);
  if (error) throw storeError('insert', error);

  return {
    batchId,
    projects: [...projects.values()],
    savedCount: rows.length,
    tasks: await hydrateTasks(supabase, data || rows),
  };
}

async function listTasks({ supabase }) {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_FIELDS)
    .order('created_at', { ascending: false });
  if (error) throw storeError('query', error);
  return hydrateTasks(supabase, data || []);
}

async function updateTask({ supabase, taskId, patch = {} }) {
  const updates = {};
  if (patch.description !== undefined) {
    updates.description = String(patch.description || '').trim();
    if (!updates.description) {
      const error = new Error('Description is required');
      error.status = 400;
      throw error;
    }
  }
  if (patch.owner !== undefined) updates.assignee_id = await findAssigneeId(supabase, patch.owner);
  if (patch.deadline !== undefined) updates.deadline = patch.deadline || null;
  if (patch.priority !== undefined) {
    if (patch.priority && !PRIORITIES.includes(patch.priority)) {
      const error = new Error('Invalid priority');
      error.status = 400;
      throw error;
    }
    updates.priority = patch.priority || null;
  }
  if (patch.status !== undefined) {
    if (!STATUSES.includes(patch.status)) {
      const error = new Error('Invalid status');
      error.status = 400;
      throw error;
    }
    updates.status = normalizeStatus(patch.status);
  }
  if (patch.projectId !== undefined) {
    const project = await findProject(supabase, patch.projectId);
    updates.project_id = project.id;
  }

  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(TASK_FIELDS)
    .single();
  if (error) throw storeError('update', error);
  const [task] = await hydrateTasks(supabase, [data]);
  return task;
}

async function createTask({ supabase, userId, projectId, description, owner, deadline, priority, status }) {
  const text = String(description || '').trim();
  if (!text) {
    const error = new Error('Description is required');
    error.status = 400;
    throw error;
  }
  const project = await findProject(supabase, projectId);
  if (priority && !PRIORITIES.includes(priority)) {
    const error = new Error('Invalid priority');
    error.status = 400;
    throw error;
  }
  const row = {
    id: uuidv4(),
    batch_id: uuidv4(),
    user_id: userId,
    project_id: project.id,
    assignee_id: await findAssigneeId(supabase, owner),
    description: text,
    deadline: deadline || null,
    priority: priority || null,
    status: normalizeStatus(status || 'incoming'),
    unknowns: [],
  };
  const { data, error } = await supabase
    .from('tasks')
    .insert(row)
    .select(TASK_FIELDS)
    .single();
  if (error) throw storeError('insert', error);
  const [task] = await hydrateTasks(supabase, [data]);
  return task;
}

async function deleteTask({ supabase, taskId }) {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) throw storeError('delete', error);
}

async function deleteByProject({ supabase, projectId }) {
  const { error } = await supabase.from('tasks').delete().eq('project_id', projectId);
  if (error) throw storeError('delete', error);
}

async function exportTasks({ supabase }) {
  const tasks = await listTasks({ supabase });
  return { exportedAt: new Date().toISOString(), count: tasks.length, tasks };
}

module.exports = {
  saveApprovedTasks,
  listTasks,
  updateTask,
  createTask,
  deleteTask,
  deleteByProject,
  exportTasks,
};
