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

/**
 * @openapi
 * /api/tasks/approve:
 *   post:
 *     tags: [Tasks]
 *     summary: Save tasks explicitly approved by a person
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tasks]
 *             properties:
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               tasks:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required: [description, owner, deadline, priority, approved]
 *                   properties:
 *                     description:
 *                       type: string
 *                     owner:
 *                       type: string
 *                       nullable: true
 *                     deadline:
 *                       type: string
 *                       nullable: true
 *                       example: '2026-03-09'
 *                     priority:
 *                       type: string
 *                       nullable: true
 *                       enum: [urgent, high, medium, low]
 *                     approved:
 *                       type: boolean
 *                       example: true
 *     responses:
 *       '201':
 *         description: Approved tasks saved; rejected tasks discarded
 *       '400':
 *         description: Invalid request or no approved tasks
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
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

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     tags: [Tasks]
 *     summary: List the signed-in user's tasks
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Task count and task records
 *       '401':
 *         description: Missing or invalid Supabase access token
 *   post:
 *     tags: [Tasks]
 *     summary: Create a task
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, projectId]
 *             properties:
 *               description:
 *                 type: string
 *               projectId:
 *                 type: string
 *                 format: uuid
 *               owner:
 *                 type: string
 *                 nullable: true
 *               deadline:
 *                 type: string
 *                 nullable: true
 *                 example: '2026-03-09'
 *               priority:
 *                 type: string
 *                 nullable: true
 *                 enum: [urgent, high, medium, low]
 *               status:
 *                 type: string
 *                 enum: [incoming, in_progress, waiting, done]
 *     responses:
 *       '201':
 *         description: Created task
 *       '400':
 *         description: Invalid request or project
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
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

/**
 * @openapi
 * /api/tasks/{id}:
 *   patch:
 *     tags: [Tasks]
 *     summary: Update a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *               owner:
 *                 type: string
 *                 nullable: true
 *               deadline:
 *                 type: string
 *                 nullable: true
 *               priority:
 *                 type: string
 *                 nullable: true
 *                 enum: [urgent, high, medium, low]
 *               status:
 *                 type: string
 *                 enum: [incoming, in_progress, waiting, done, approved]
 *               projectId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       '200':
 *         description: Updated task
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Missing or invalid Supabase access token
 *   delete:
 *     tags: [Tasks]
 *     summary: Delete a task
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Task deleted
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
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

/**
 * @openapi
 * /api/tasks/export:
 *   get:
 *     tags: [Tasks]
 *     summary: Export the signed-in user's tasks as JSON
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: JSON export of task records
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
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
