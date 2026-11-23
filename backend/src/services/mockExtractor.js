const SAMPLE_TASKS = [
  {
    description: 'Review the new university course pages',
    owner: null,
    deadline: 'before the end of the month',
    priority: null,
    confidence: 0.86,
    evidence: '“We need the new university course pages reviewed before the end of the month.”',
    unknowns: ['owner', 'priority'],
  },
  {
    description: 'Provide the final approved copy for the university course pages',
    owner: 'Sarah',
    deadline: null,
    priority: null,
    confidence: 0.9,
    evidence: '“Sarah will provide the final approved copy.”',
    unknowns: ['deadline', 'priority'],
  },
  {
    description: 'Check all application links',
    owner: 'website team',
    deadline: null,
    priority: 'urgent',
    confidence: 0.92,
    evidence: '“The website team needs to check all application links” · “The links are urgent”',
    unknowns: ['deadline'],
  },
  {
    description: 'Confirm that the mobile layout works',
    owner: 'website team',
    deadline: null,
    priority: null,
    confidence: 0.84,
    evidence: '“confirm that the mobile layout works”',
    unknowns: ['deadline', 'priority'],
  },
  {
    description: 'Investigate why application conversions have dropped',
    owner: 'reporting team',
    deadline: null,
    priority: 'high',
    confidence: 0.88,
    evidence:
      '“The reporting team should also investigate why application conversions have dropped.” · needs investigating before a change is decided — not treated as a calendar date',
    unknowns: ['deadline'],
  },
];

function looksLikeSample(text) {
  const lower = String(text || '').toLowerCase();
  return (
    lower.includes('university course') ||
    lower.includes('application links') ||
    lower.includes('application conversions') ||
    lower.includes('sarah will provide the final approved copy')
  );
}

function looksBinary(text) {
  const head = String(text || '').slice(0, 120);
  return head.includes('%PDF') || /[\x00-\x08\x0E-\x1F]/.test(head);
}

function fileTitle(name) {
  return String(name || 'attached paper')
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function blankCard(description, extras = {}) {
  return {
    description,
    owner: extras.owner || null,
    deadline: extras.deadline || null,
    priority: extras.priority || null,
    confidence: extras.confidence ?? 0.42,
    evidence: extras.evidence || null,
    unknowns: extras.unknowns || ['owner', 'deadline', 'priority'],
  };
}

function cardsFromAttachments(text) {
  const names = [...String(text).matchAll(/--- Document:\s*([^\n]+) ---/g)].map((match) => match[1].trim());
  const notes = String(text).split(/--- Additional notes ---/i)[1]?.trim();
  const tasks = names.map((name) => blankCard(`Review ${fileTitle(name)}`));
  if (notes) tasks.push(blankCard(notes.split(/\n/)[0].slice(0, 180)));
  if (!tasks.length) tasks.push(blankCard('Review the attached paper'));
  return {
    tasks,
    notes: [],
    source: 'mock',
  };
}

/**
 * Deterministic fallback when no LLM API key is configured.
 * Mirrors a careful human reading of the sample interview message —
 * unknowns stay null; nothing is invented.
 */
function extractWithMock(text) {
  if (looksLikeSample(text)) {
    return {
      tasks: SAMPLE_TASKS,
      notes: [],
      source: 'mock',
    };
  }

  if (looksBinary(text) || String(text).toLowerCase().includes('[attached paper')) {
    return cardsFromAttachments(text);
  }

  const lines = String(text)
    .split(/\n+/)
    .map((line) => line.replace(/^--- Document:.*$/i, '').trim())
    .filter((line) => line && !line.startsWith('[Attached') && line.length > 12)
    .slice(0, 6);
  const tasks = (lines.length ? lines : [String(text).trim().slice(0, 180) || 'Untitled request']).map((line) =>
    blankCard(line.slice(0, 180))
  );
  return { tasks, notes: [], source: 'mock' };
}

module.exports = { extractWithMock, SAMPLE_TASKS, looksLikeSample };
