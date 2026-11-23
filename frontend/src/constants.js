export const SAMPLE_MESSAGE =
  'We need the new university course pages reviewed before the end of the month. Sarah will provide the final approved copy. The website team needs to check all application links and confirm that the mobile layout works. The reporting team should also investigate why application conversions have dropped. The links are urgent, but the reporting issue needs investigating before we decide what to change.';

export const SAMPLE_TASKS = [
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
      '“The reporting team should also investigate why application conversions have dropped.”',
    unknowns: ['deadline'],
  },
];

export const CURRENT_USER = {
  name: 'Amara Ndlovu',
  email: 'amara.ndlovu@desk.local',
  role: 'Clerk',
};

export const NAV_ITEMS = [
  { id: 'extract', label: 'Assistant', group: 'Desk' },
  { id: 'saved', label: 'Board', group: 'Register' },
  { id: 'documents', label: 'Data', group: 'Register' },
  { id: 'users', label: 'People & groups', group: 'Register' },
  { id: 'approach', label: 'Notes', group: 'Record' },
];
