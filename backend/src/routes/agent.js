const express = require('express');
const { z } = require('zod');
const { askAgent } = require('../services/deskAgent');
const { listTasks } = require('../services/taskStore');
const { listProjects, listPeople } = require('../services/projectStore');

const router = express.Router();

const BodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })
    )
    .min(1)
    .max(20),
});

router.post('/agent', async (req, res, next) => {
  try {
    const body = BodySchema.parse(req.body);
    const [tasks, projects, people] = await Promise.all([
      listTasks({ supabase: req.supabase }),
      listProjects({ supabase: req.supabase }),
      listPeople({ supabase: req.supabase }),
    ]);
    const result = await askAgent({
      messages: body.messages,
      workspace: {
        tasks: tasks.slice(0, 200),
        projects: projects.slice(0, 200),
        people: people.map(({ name, type, status }) => ({ name, type, status })).slice(0, 200),
      },
    });
    res.json({
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
