const config = require('../config');
const { ExtractionResultSchema } = require('../schemas/taskSchema');
const { extractWithMock } = require('./mockExtractor');

const SYSTEM_PROMPT = `You extract actionable tasks from client messages for a project team.

Rules (accuracy over completeness):
1. Only create a task when the text clearly requests work or an action.
2. Never invent owner, deadline, or priority. Use null when not stated.
3. Prefer splitting combined sentences into separate tasks when owners or actions differ.
4. deadline may be a relative phrase from the text (e.g. "before the end of the month").
5. priority must be one of: urgent, high, medium, low, or null. Only set it when the text implies urgency/importance.
6. Include short evidence quotes and list unknown fields in "unknowns".
7. Add confidence between 0 and 1 for each task.
8. Return JSON only, matching:
{
  "tasks": [
    {
      "description": string,
      "owner": string | null,
      "deadline": string | null,
      "priority": "urgent"|"high"|"medium"|"low"|null,
      "confidence": number,
      "evidence": string,
      "unknowns": string[]
    }
  ],
  "notes": string[]
}`;

async function callOpenAi(text) {
  const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
    body: JSON.stringify({
      model: config.openaiModel,
      temperature: 0.1,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`LLM request failed (${response.status}): ${body}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('LLM returned an empty response');
  }

  return JSON.parse(content);
}

/**
 * Validates and normalises model output. Invalid shapes fall back to mock
 * so the prototype never crashes on unexpected LLM JSON.
 */
function validateExtraction(raw, source, originalText) {
  const parsed = ExtractionResultSchema.safeParse({ ...raw, source });
  if (parsed.success) {
    return parsed.data;
  }

  console.warn('[llmExtractor] Invalid LLM payload, falling back to mock:', parsed.error.message);
  const mock = extractWithMock(originalText);
  mock.notes = [
    ...mock.notes,
    'LLM response failed schema validation; mock result returned instead.',
  ];
  return mock;
}

function mockRefine({ description, evidence, prompt }) {
  const ask = String(prompt || '').toLowerCase();
  const quote = String(evidence || '').replace(/[“”"]/g, '').trim();
  const base = String(description || '').trim();
  if (ask.includes('again') || ask.includes('re-descri') || ask.includes('redescri')) {
    return quote
      ? `${base}. Restated from the brief: ${quote}.`
      : `${base}. Rewritten from the same brief, with no new facts added.`;
  }
  if (ask.includes('descrip') || ask.includes('detail') || ask.includes('expand') || ask.includes('clearer')) {
    return quote
      ? `${base} — as stated in the brief (${quote}). Fields that were not named stay blank.`
      : `${base}. Kept to what the brief actually says; nothing extra was added.`;
  }
  return quote ? `${base}. Instruction applied using only: ${quote}.` : `${base}. ${prompt}`.slice(0, 280);
}

async function refineTask({ description, evidence, prompt }) {
  if (!config.hasLlm) {
    return { description: mockRefine({ description, evidence, prompt }), source: 'mock' };
  }
  try {
    const response = await fetch(`${config.openaiBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'Rewrite the task description. Use only the existing description and evidence. Do not invent an owner, date or priority. Return plain text only.',
          },
          {
            role: 'user',
            content: `Description: ${description}\nEvidence: ${evidence || 'none'}\nInstruction: ${prompt}`,
          },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Refine failed (${response.status})`);
    const data = await response.json();
    const next = data.choices?.[0]?.message?.content?.trim();
    if (!next) throw new Error('Empty refine');
    return { description: next, source: 'llm' };
  } catch (error) {
    return { description: mockRefine({ description, evidence, prompt }), source: 'mock' };
  }
}

async function extractTasks(text) {
  if (!config.hasLlm) {
    return extractWithMock(text);
  }

  try {
    const raw = await callOpenAi(text);
    return validateExtraction(raw, 'llm', text);
  } catch (error) {
    console.error('[llmExtractor]', error.message);
    const mock = extractWithMock(text);
    mock.notes = [
      ...mock.notes,
      `LLM unavailable (${error.message}). Mock extractor used.`,
    ];
    return mock;
  }
}

module.exports = { extractTasks, refineTask, SYSTEM_PROMPT };
