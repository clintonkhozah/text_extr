const assert = require('node:assert/strict');
const { test } = require('node:test');
const { saveApprovedTasks } = require('../src/services/taskStore');

function createSupabaseMock() {
  const project = { id: 'project-id', name: 'Project' };
  const people = [];
  const savedTasks = [];

  function query(table) {
    let operation = 'select';
    let values;

    const builder = {
      select() {
        return this;
      },
      eq() {
        return this;
      },
      ilike(_column, name) {
        return Promise.resolve({
          data: people
            .filter((person) => person.name.toLowerCase() === name.toLowerCase())
            .map(({ id, name: personName }) => ({ id, name: personName })),
          error: null,
        });
      },
      insert(rows) {
        operation = 'insert';
        values = rows;
        if (table === 'people') {
          const created = {
            ...rows,
            code: null,
            email: null,
            created_at: '2026-01-01T00:00:00.000Z',
          };
          people.push(created);
          values = created;
        } else if (table === 'tasks') {
          savedTasks.push(...rows);
        }
        return this;
      },
      single() {
        if (table === 'projects') return Promise.resolve({ data: project, error: null });
        return Promise.resolve({ data: values, error: null });
      },
      then(resolve, reject) {
        let data;
        if (table === 'projects') data = [project];
        else if (table === 'people') data = people;
        else if (operation === 'insert' && table === 'tasks') data = values;
        else data = [];
        return Promise.resolve({ data, error: null }).then(resolve, reject);
      },
    };

    return builder;
  }

  return {
    supabase: { from: query },
    people,
    savedTasks,
  };
}

test('approved tasks create and reuse a missing extracted assignee', async () => {
  const { supabase, people, savedTasks } = createSupabaseMock();
  const result = await saveApprovedTasks({
    supabase,
    userId: 'user-id',
    projectId: 'project-id',
    tasks: [
      { description: 'Prepare report', owner: 'Mina Chen', approved: true },
      { description: 'Review report', owner: 'mina chen', approved: true },
    ],
  });

  assert.equal(people.length, 1);
  assert.equal(people[0].name, 'Mina Chen');
  assert.equal(people[0].user_id, 'user-id');
  assert.equal(people[0].type, 'person');
  assert.equal(savedTasks.length, 2);
  assert.equal(savedTasks[0].assignee_id, people[0].id);
  assert.equal(savedTasks[1].assignee_id, people[0].id);
  assert.equal(result.people.length, 1);
  assert.equal(result.tasks.length, 2);
  assert.equal(result.tasks[0].owner, people[0].name);
});
