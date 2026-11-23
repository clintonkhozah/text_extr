const express = require('express');
const { z } = require('zod');
const { ReviewDecisionSchema, PrioritySchema } = require('../schemas/taskSchema');
const {
  saveApprovedTasks,
  listTasks,
  updateTask,
  exportTasks,
  createTask,
  deleteTask,
} = require('../services/taskStore');

const router = express.Router();

const TaskPatchSchema = z.object({
  description: z.string().min(1).optional(),
  owner: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  priority: PrioritySchema.optional(),
  status: z.enum(['incoming', 'in_progress', 'waiting', 'done', 'approved']).optional(),
  projectId: z.string().uuid().optional(),
});

const TaskCreateSchema = z.object({
  description: z.string().min(1),
  owner: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  priority: PrioritySchema.optional(),
  status: z.enum(['incoming', 'in_progress', 'waiting', 'done']).optional(),
  projectId: z.string().uuid(),
});

router.post('/tasks/approve', async (req, res, next) => {
  try {
    const payload = ReviewDecisionSchema.parse(req.body);
    const result = await saveApprovedTasks({
      ...payload,
      supabase: req.supabase,
      userId: req.user.id,
    });
    res.status(201).json({
      ...result,
      message: 'Only approved tasks were saved. Rejected items were discarded.',
    });
  } catch (error) {
    next(error);
  }
});

router.get('/tasks', async (req, res, next) => {
  try {
    const tasks = await listTasks({ supabase: req.supabase });
    res.json({ count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
});

router.post('/tasks', async (req, res, next) => {
  try {
    const payload = TaskCreateSchema.parse(req.body);
    const task = await createTask({
      ...payload,
      supabase: req.supabase,
      userId: req.user.id,
    });
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

router.patch('/tasks/:id', async (req, res, next) => {
  try {
    const payload = TaskPatchSchema.parse(req.body);
    const task = await updateTask({
      supabase: req.supabase,
      taskId: req.params.id,
      patch: payload,
    });
    res.json({ task });
  } catch (error) {
    next(error);
  }
});

router.delete('/tasks/:id', async (req, res, next) => {
  try {
    await deleteTask({ supabase: req.supabase, taskId: req.params.id });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

router.get('/tasks/export', async (req, res, next) => {
  try {
    const payload = await exportTasks({ supabase: req.supabase });
    res.setHeader('Content-Disposition', 'attachment; filename="tasks.json"');
    res.json(payload);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
