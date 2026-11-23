import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_URL || '';

async function request(path, options = {}) {
  if (!supabase) {
    throw new Error('Supabase is not configured. Set the frontend environment variables and restart Vite.');
  }

  const { data, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  const accessToken = data.session?.access_token;
  if (!accessToken) throw new Error('Sign in to continue.');

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options.headers || {}),
    },
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = result?.details?.[0]?.message || result?.error || response.statusText;
    throw new Error(detail);
  }
  return result;
}

export function extractTasks(text) {
  return request('/api/extract', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function refineTask(payload) {
  return request('/api/extract/refine', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function approveTasks(payload) {
  return request('/api/tasks/approve', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function listTasks() {
  return request('/api/tasks');
}

export function updateTask(taskId, payload) {
  return request(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function createTask(payload) {
  return request('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function deleteTask(taskId) {
  return request(`/api/tasks/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
}

export function listProjects() {
  return request('/api/projects');
}

export function createProject(payload) {
  return request('/api/projects', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateProject(projectId, payload) {
  return request(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteProject(projectId) {
  return request(`/api/projects/${encodeURIComponent(projectId)}`, { method: 'DELETE' });
}

export function listPeople() {
  return request('/api/people');
}

export function addPerson(payload) {
  return request('/api/people', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updatePerson(personId, payload) {
  return request(`/api/people/${encodeURIComponent(personId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deletePerson(personId) {
  return request(`/api/people/${encodeURIComponent(personId)}`, { method: 'DELETE' });
}
