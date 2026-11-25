const assert = require('node:assert/strict');
const { test } = require('node:test');
const { validateExtraction } = require('../src/services/llmExtractor');

function createTask(deadline, priority = null) {
  return {
    description: 'Complete the work',
    owner: null,
    deadline,
    priority,
    confidence: 0.9,
    evidence: 'Complete the work by the stated time.',
    unknowns: [],
  };
}

test('extraction keeps only valid exact ISO calendar dates as deadlines', () => {
  const result = validateExtraction({
    tasks: [
      createTask('2027-03-09'),
      createTask('week of March 9'),
      createTask('end of February'),
      createTask('as soon as possible', 'urgent'),
      createTask('2027-02-29'),
    ],
    notes: [],
  });

  assert.deepEqual(
    result.tasks.map(({ deadline, priority }) => ({ deadline, priority })),
    [
      { deadline: '2027-03-09', priority: null },
      { deadline: null, priority: null },
      { deadline: null, priority: null },
      { deadline: null, priority: 'urgent' },
      { deadline: null, priority: null },
    ]
  );
});
