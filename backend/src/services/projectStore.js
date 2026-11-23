const { v4: uuidv4 } = require('uuid');

function mapProject(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    createdAt: row.created_at,
  };
}

function mapPerson(row) {
  return {
    id: row.id,
    code: row.code || null,
    name: row.name,
    email: row.email || null,
    type: row.type || 'person',
    status: row.status || 'Active',
    createdAt: row.created_at,
  };
}

function storeError(action, error) {
  const err = new Error(`Supabase ${action} failed: ${error.message}`);
  err.status = 502;
  return err;
}

async function listProjects({ supabase }) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, description, created_at')
    .order('created_at', { ascending: false });
  if (error) throw storeError('query', error);
  return (data || []).map(mapProject);
}

async function createProject({ supabase, userId, name, description }) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    const error = new Error('Project name is required');
    error.status = 400;
    throw error;
  }
  const { data, error } = await supabase
    .from('projects')
    .insert({
      id: uuidv4(),
      user_id: userId,
      name: trimmedName,
      description: String(description || '').trim() || null,
    })
    .select('id, name, description, created_at')
    .single();
  if (error) throw storeError('insert', error);
  return mapProject(data);
}

async function updateProject({ supabase, projectId, name, description }) {
  const patch = {};
  if (name !== undefined) {
    patch.name = String(name || '').trim();
    if (!patch.name) {
      const error = new Error('Project name is required');
      error.status = 400;
      throw error;
    }
  }
  if (description !== undefined) patch.description = String(description || '').trim() || null;
  if (!Object.keys(patch).length) {
    const error = new Error('Provide a project name or description to update');
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from('projects')
    .update(patch)
    .eq('id', projectId)
    .select('id, name, description, created_at')
    .single();
  if (error) throw storeError('update', error);
  return mapProject(data);
}

async function deleteProject({ supabase, projectId }) {
  const { error } = await supabase.from('projects').delete().eq('id', projectId);
  if (error) throw storeError('delete', error);
}

async function listPeople({ supabase }) {
  const { data, error } = await supabase
    .from('people')
    .select('id, code, name, email, type, status, created_at')
    .order('name', { ascending: true });
  if (error) throw storeError('query', error);
  return (data || []).map(mapPerson);
}

async function addPerson({ supabase, userId, name, email, type, status }) {
  const trimmedName = String(name || '').trim();
  if (!trimmedName) {
    const error = new Error('Name is required');
    error.status = 400;
    throw error;
  }
  const personType = type || 'person';
  if (!['person', 'group'].includes(personType)) {
    const error = new Error('Type must be person or group');
    error.status = 400;
    throw error;
  }
  const { data, error } = await supabase
    .from('people')
    .insert({
      id: uuidv4(),
      user_id: userId,
      name: trimmedName,
      email: personType === 'person' ? String(email || '').trim() || null : null,
      type: personType,
      status: status || 'Active',
    })
    .select('id, code, name, email, type, status, created_at')
    .single();
  if (error) throw storeError('insert', error);
  return mapPerson(data);
}

async function updatePerson({ supabase, personId, patch = {} }) {
  const dbPatch = {};
  if (patch.name !== undefined) {
    dbPatch.name = String(patch.name || '').trim();
    if (!dbPatch.name) {
      const error = new Error('Name is required');
      error.status = 400;
      throw error;
    }
  }
  if (patch.email !== undefined) dbPatch.email = String(patch.email || '').trim() || null;
  if (patch.type !== undefined) {
    if (!['person', 'group'].includes(patch.type)) {
      const error = new Error('Type must be person or group');
      error.status = 400;
      throw error;
    }
    dbPatch.type = patch.type;
    if (patch.type === 'group') dbPatch.email = null;
  }
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (!Object.keys(dbPatch).length) {
    const error = new Error('Provide a person or group field to update');
    error.status = 400;
    throw error;
  }

  const { data, error } = await supabase
    .from('people')
    .update(dbPatch)
    .eq('id', personId)
    .select('id, code, name, email, type, status, created_at')
    .single();
  if (error) throw storeError('update', error);
  return mapPerson(data);
}

async function deletePerson({ supabase, personId }) {
  const { error } = await supabase.from('people').delete().eq('id', personId);
  if (error) throw storeError('delete', error);
}

module.exports = {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listPeople,
  addPerson,
  updatePerson,
  deletePerson,
};
