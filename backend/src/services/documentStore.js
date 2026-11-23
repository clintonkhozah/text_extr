const { v4: uuidv4 } = require('uuid');
const { getSupabase } = require('./supabaseClient');

const memory = {
  documents: [],
};

function mapRow(row, { includeContent = false } = {}) {
  const content = row.content || '';
  const item = {
    id: row.id,
    clientId: row.client_id || row.clientId,
    projectId: row.project_id || row.projectId || null,
    projectName: row.project_name || row.projectName || null,
    name: row.name,
    mimeType: row.mime_type || row.mimeType || 'text/plain',
    byteSize: row.byte_size ?? row.byteSize ?? content.length,
    preview: content.slice(0, 220),
    createdAt: row.created_at || row.createdAt,
  };
  if (includeContent) item.content = content;
  return item;
}

async function saveDocument({ clientId, name, content, mimeType, projectId, projectName }) {
  const now = new Date().toISOString();
  const row = {
    id: uuidv4(),
    client_id: clientId,
    project_id: projectId || null,
    project_name: projectName || null,
    name: name || 'untitled.txt',
    mime_type: mimeType || 'text/plain',
    content: String(content || ''),
    byte_size: String(content || '').length,
    created_at: now,
  };

  const supabase = getSupabase();
  if (!supabase) {
    memory.documents.unshift(row);
    return { document: mapRow(row), storage: 'memory' };
  }

  const { error } = await supabase.from('documents').insert({
    id: row.id,
    client_id: row.client_id,
    project_id: row.project_id,
    project_name: row.project_name,
    name: row.name,
    mime_type: row.mime_type,
    content: row.content,
    byte_size: row.byte_size,
    created_at: row.created_at,
  });
  if (error) {
    const err = new Error(`Supabase insert failed: ${error.message}`);
    err.status = 502;
    throw err;
  }

  return { document: mapRow(row), storage: 'supabase' };
}

async function listDocuments(clientId) {
  const supabase = getSupabase();
  if (!supabase) {
    return memory.documents
      .filter((doc) => doc.client_id === clientId)
      .map((row) => mapRow(row));
  }

  const { data, error } = await supabase
    .from('documents')
      .select('id, client_id, project_id, project_name, name, mime_type, content, byte_size, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });

  if (error) {
    const err = new Error(`Supabase query failed: ${error.message}`);
    err.status = 502;
    throw err;
  }

  return (data || []).map((row) => mapRow(row));
}

async function getDocument(clientId, id) {
  const supabase = getSupabase();
  if (!supabase) {
    const row = memory.documents.find(
      (doc) => doc.id === id && doc.client_id === clientId
    );
    return row ? mapRow(row, { includeContent: true }) : null;
  }

  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('client_id', clientId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    const err = new Error(`Supabase query failed: ${error.message}`);
    err.status = 502;
    throw err;
  }

  return mapRow(data, { includeContent: true });
}

async function updateDocument(clientId, id, { name, content }) {
  const nextName = name !== undefined ? String(name).trim() : undefined;
  const nextContent = content !== undefined ? String(content) : undefined;
  if (nextName !== undefined && !nextName) {
    const error = new Error('Name is required');
    error.status = 400;
    throw error;
  }

  const supabase = getSupabase();
  if (!supabase) {
    const row = memory.documents.find(
      (doc) => doc.id === id && doc.client_id === clientId
    );
    if (!row) {
      const error = new Error('Document not found');
      error.status = 404;
      throw error;
    }
    if (nextName !== undefined) row.name = nextName;
    if (nextContent !== undefined) {
      row.content = nextContent;
      row.byte_size = nextContent.length;
    }
    return mapRow(row, { includeContent: true });
  }

  const patch = {};
  if (nextName !== undefined) patch.name = nextName;
  if (nextContent !== undefined) {
    patch.content = nextContent;
    patch.byte_size = nextContent.length;
  }

  const { data, error } = await supabase
    .from('documents')
    .update(patch)
    .eq('id', id)
    .eq('client_id', clientId)
    .select('*')
    .single();

  if (error) {
    const err = new Error(`Supabase update failed: ${error.message}`);
    err.status = 502;
    throw err;
  }

  return mapRow(data, { includeContent: true });
}

module.exports = {
  saveDocument,
  listDocuments,
  getDocument,
  updateDocument,
};
