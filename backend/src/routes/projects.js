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
