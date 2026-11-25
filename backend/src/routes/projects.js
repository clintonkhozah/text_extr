const express = require('express');
const { z } = require('zod');
const {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  listPeople,
  addPerson,
  updatePerson,
  deletePerson,
} = require('../services/projectStore');

const router = express.Router();

const ProjectBody = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional(),
});

const PersonBody = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email().optional().or(z.literal('')),
  type: z.enum(['person', 'group']).default('person'),
  status: z.string().max(40).optional(),
});

const PersonPatch = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email().optional().or(z.literal('')),
  type: z.enum(['person', 'group']).optional(),
  status: z.string().max(40).optional(),
});

/**
 * @openapi
 * /api/projects:
 *   get:
 *     tags: [Projects]
 *     summary: List the signed-in user's projects
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: Project count and project records
 *       '401':
 *         description: Missing or invalid Supabase access token
 *   post:
 *     tags: [Projects]
 *     summary: Create a project
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 160
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       '201':
 *         description: Created project
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
router.get('/projects', async (req, res, next) => {
  try {
    const projects = await listProjects({ supabase: req.supabase });
    res.json({ count: projects.length, projects });
  } catch (error) {
    next(error);
  }
});

router.post('/projects', async (req, res, next) => {
  try {
    const body = ProjectBody.parse(req.body);
    const project = await createProject({
      ...body,
      supabase: req.supabase,
      userId: req.user.id,
    });
    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/projects/{id}:
 *   patch:
 *     tags: [Projects]
 *     summary: Update a project
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 160
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *     responses:
 *       '200':
 *         description: Updated project
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Missing or invalid Supabase access token
 *   delete:
 *     tags: [Projects]
 *     summary: Delete a project and its tasks
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Project deleted
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
router.patch('/projects/:id', async (req, res, next) => {
  try {
    const body = ProjectBody.partial().parse(req.body);
    const project = await updateProject({
      ...body,
      supabase: req.supabase,
      projectId: req.params.id,
    });
    res.json({ project });
  } catch (error) {
    next(error);
  }
});

router.delete('/projects/:id', async (req, res, next) => {
  try {
    await deleteProject({ supabase: req.supabase, projectId: req.params.id });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/people:
 *   get:
 *     tags: [People]
 *     summary: List the signed-in user's people and groups
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       '200':
 *         description: People count and person/group records
 *       '401':
 *         description: Missing or invalid Supabase access token
 *   post:
 *     tags: [People]
 *     summary: Add a person or group
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 80
 *               email:
 *                 type: string
 *                 format: email
 *               type:
 *                 type: string
 *                 enum: [person, group]
 *               status:
 *                 type: string
 *                 maxLength: 40
 *     responses:
 *       '201':
 *         description: Created person or group
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
router.get('/people', async (req, res, next) => {
  try {
    const people = await listPeople({ supabase: req.supabase });
    res.json({ count: people.length, people });
  } catch (error) {
    next(error);
  }
});

router.post('/people', async (req, res, next) => {
  try {
    const body = PersonBody.parse(req.body);
    const person = await addPerson({
      ...body,
      supabase: req.supabase,
      userId: req.user.id,
    });
    res.status(201).json({ person });
  } catch (error) {
    next(error);
  }
});

/**
 * @openapi
 * /api/people/{id}:
 *   patch:
 *     tags: [People]
 *     summary: Update a person or group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 80
 *               email:
 *                 type: string
 *                 format: email
 *               type:
 *                 type: string
 *                 enum: [person, group]
 *               status:
 *                 type: string
 *                 maxLength: 40
 *     responses:
 *       '200':
 *         description: Updated person or group
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Missing or invalid Supabase access token
 *   delete:
 *     tags: [People]
 *     summary: Delete a person or group
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       '200':
 *         description: Person or group deleted
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
router.patch('/people/:id', async (req, res, next) => {
  try {
    const patch = PersonPatch.parse(req.body);
    const person = await updatePerson({
      supabase: req.supabase,
      personId: req.params.id,
      patch,
    });
    res.json({ person });
  } catch (error) {
    next(error);
  }
});

router.delete('/people/:id', async (req, res, next) => {
  try {
    await deletePerson({ supabase: req.supabase, personId: req.params.id });
    res.json({ deleted: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
