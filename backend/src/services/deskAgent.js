const config = require('../config');
const { listTasks, createTask, updateTask, deleteTask } = require('./taskStore');
const {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listPeople,
  addPerson,
} = require('./projectStore');
const { listDocuments, getDocument } = require('./documentStore');
const { extractTasks } = require('./llmExtractor');
const { deleteByProject } = require('./taskStore');

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'list_tasks',
      description: 'List saved board cards for this client.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a card on the board.',
      parameters: {
        type: 'object',
        required: ['description'],
        properties: {
          description: { type: 'string' },
          owner: { type: 'string' },
          deadline: { type: 'string' },
          priority: { type: 'string', enum: ['urgent', 'high', 'medium', 'low'] },
          status: { type: 'string', enum: ['incoming', 'in_progress', 'waiting', 'done'] },
          projectId: { type: 'string' },
          projectName: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_task',
      description: 'Patch a saved card by id.',
      parameters: {
        type: 'object',
        required: ['taskId'],
        properties: {
          taskId: { type: 'string' },
          description: { type: 'string' },
          owner: { type: 'string' },
          deadline: { type: 'string' },
          priority: { type: 'string' },
          status: { type: 'string' },
          projectId: { type: 'string' },
          projectName: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_task',
      description: 'Remove a saved card by id.',
      parameters: {
        type: 'object',
        required: ['taskId'],
        properties: { taskId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_projects',
      description: 'List projects on the register.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_project',
      description: 'Open a new project folder.',
      parameters: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_project',
      description: 'Rename a project.',
      parameters: {
        type: 'object',
        required: ['projectId', 'name'],
        properties: {
          projectId: { type: 'string' },
          name: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_project',
      description: 'Remove a project and its cards.',
      parameters: {
        type: 'object',
        required: ['projectId'],
        properties: { projectId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_people',
      description: 'List people on the register.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_person',
      description: 'Invite or add a person.',
      parameters: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          email: { type: 'string' },
          role: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_documents',
      description: 'List filed papers.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_document',
      description: 'Read a filed paper by id.',
      parameters: {
        type: 'object',
        required: ['documentId'],
        properties: { documentId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_brief',
      description: 'Extract candidate tasks from unstructured text. Does not save until the person confirms.',
      parameters: {
        type: 'object',
        required: ['text'],
        properties: { text: { type: 'string' } },
      },
    },
  },
];

const MUTATING = new Set([
  'create_task',
  'update_task',
  'delete_task',
  'create_project',
  'update_project',
  'delete_project',
  'add_person',
]);

const SYSTEM_PROMPT = `You are the desk agent for this register.
You answer from live tools only: board cards, projects, people, papers, and extract.
Never invent ids, names, dates, or counts. If a tool returns empty, say so.
Keep replies short, formal, and useful. After a change, confirm what changed.`;

function parseArgs(raw) {
  if (!raw) return {};
  if (typeof raw === 'object') return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function compact(value, limit = 24) {
  if (Array.isArray(value)) return value.slice(0, limit);
  return value;
}

async function runTool(name, args, clientId) {
  switch (name) {
    case 'list_tasks':
      return { tasks: compact(await listTasks(clientId)) };
    case 'create_task':
      return { task: await createTask({ clientId, ...args }) };
    case 'update_task': {
      const { taskId, ...patch } = args;
      return { task: await updateTask(clientId, taskId, patch) };
    }
    case 'delete_task':
      await deleteTask(clientId, args.taskId);
      return { deleted: true };
    case 'list_projects':
      return { projects: compact(await listProjects(clientId)) };
    case 'create_project':
      return { project: await createProject({ clientId, name: args.name }) };
    case 'update_project':
      return { project: await updateProject(clientId, args.projectId, { name: args.name }) };
    case 'delete_project':
      await deleteByProject(clientId, args.projectId);
      await deleteProject(clientId, args.projectId);
      return { deleted: true };
    case 'list_people':
      return { people: compact(await listPeople(clientId)) };
    case 'add_person':
      return { person: await addPerson({ clientId, ...args }) };
    case 'list_documents':
      return { documents: compact(await listDocuments(clientId)) };
    case 'get_document': {
      const document = await getDocument(clientId, args.documentId);
      if (!document) return { document: null };
      return {
        document: {
          ...document,
          content: String(document.content || '').slice(0, 4000),
        },
      };
    }
    case 'extract_brief':
      return extractTasks(args.text || '');
    default:
      return { error: `Unknown tool ${name}` };
  }
}

function summariseStore(label, rows, pick) {
  if (!rows.length) return `${label}: none.`;
  return `${label} (${rows.length}): ${rows.slice(0, 8).map(pick).join('; ')}`;
}

async function mockReply(messages, clientId) {
  const last = [...messages].reverse().find((item) => item.role === 'user')?.content || '';
  const q = String(last).toLowerCase();
  const [tasks, projects, people, documents] = await Promise.all([
    listTasks(clientId),
    listProjects(clientId),
    listPeople(clientId),
    listDocuments(clientId),
  ]);

  const parts = [];
  const wantsTasks = /task|card|board|lane|incoming|deadline|owner/.test(q);
  const wantsProjects = /project|folder|brief/.test(q);
  const wantsPeople = /people|person|who|assign|roster/.test(q);
  const wantsDocs = /document|paper|file|upload/.test(q);
  const specific = wantsTasks || wantsProjects || wantsPeople || wantsDocs;

  if (!specific || wantsTasks) {
    parts.push(
      summariseStore('Board', tasks, (task) => `${task.description} [${task.status}${task.owner ? ` · ${task.owner}` : ''}]`)
    );
  }
  if (!specific || wantsProjects) {
    parts.push(summariseStore('Projects', projects, (project) => project.name));
  }
  if (!specific || wantsPeople) {
    parts.push(summariseStore('People', people, (person) => person.name));
  }
  if (!specific || wantsDocs) {
    parts.push(summariseStore('Papers', documents, (doc) => doc.name));
  }

  if (!specific) {
    parts.unshift('Live register (no model key — answers from the store):');
  }

  return {
    reply: parts.join('\n'),
    source: 'mock',
    refresh: false,
  };
}

async function llmReply(messages, clientId) {
  const history = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages
      .filter((item) => item.role === 'user' || item.role === 'assistant')
      .slice(-12)
      .map((item) => ({ role: item.role, content: String(item.content || '') })),
  ];

  let refresh = false;
  let rounds = 0;

  while (rounds < 6) {
    rounds += 1;
    const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0.2,
        tools: TOOLS,
        messages: history,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Agent request failed (${response.status}): ${body}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0]?.message;
    if (!choice) throw new Error('Agent returned an empty response');

    if (choice.tool_calls?.length) {
      history.push({
        role: 'assistant',
        content: choice.content || '',
        tool_calls: choice.tool_calls,
      });
      for (const call of choice.tool_calls) {
        const name = call.function?.name;
        const args = parseArgs(call.function?.arguments);
        if (MUTATING.has(name)) refresh = true;
        let result;
        try {
          result = await runTool(name, args, clientId);
        } catch (error) {
          result = { error: error.message };
        }
        history.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    return {
      reply: String(choice.content || '').trim() || 'Nothing to add.',
      source: 'llm',
      refresh,
    };
  }

  return { reply: 'Stopped after too many tool rounds.', source: 'llm', refresh };
}

async function askAgent({ clientId, messages = [] }) {
  if (!config.hasLlm) {
    return mockReply(messages, clientId);
  }
  try {
    return await llmReply(messages, clientId);
  } catch (error) {
    console.error('[deskAgent]', error.message);
    const fallback = await mockReply(messages, clientId);
    fallback.notes = `Model unavailable (${error.message}). Answered from the store.`;
    return fallback;
  }
}

module.exports = { askAgent };
