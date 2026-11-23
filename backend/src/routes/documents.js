const express = require('express');
const { z } = require('zod');
const {
  saveDocument,
  listDocuments,
  getDocument,
  updateDocument,
} = require('../services/documentStore');

const router = express.Router();

const CreateSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  content: z.string().min(1),
  mimeType: z.string().optional(),
  projectId: z.string().optional(),
  projectName: z.string().optional(),
});

router.post('/documents', async (req, res, next) => {
  try {
    const body = CreateSchema.parse(req.body);
    const result = await saveDocument(body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/documents', async (req, res, next) => {
  try {
    const clientId = String(req.query.clientId || '').trim();
    if (!clientId) {
      return res.status(400).json({ error: 'clientId query parameter is required' });
    }
    const documents = await listDocuments(clientId);
    res.json({ clientId, count: documents.length, documents });
  } catch (error) {
    next(error);
  }
});

router.get('/documents/:id', async (req, res, next) => {
  try {
    const clientId = String(req.query.clientId || '').trim();
    if (!clientId) {
      return res.status(400).json({ error: 'clientId query parameter is required' });
    }
    const document = await getDocument(clientId, req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json({ document });
  } catch (error) {
    next(error);
  }
});

router.patch('/documents/:id', async (req, res, next) => {
  try {
    const clientId = String(req.body?.clientId || req.query.clientId || '').trim();
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required' });
    }
    const document = await updateDocument(clientId, req.params.id, {
      name: req.body?.name,
      content: req.body?.content,
    });
    res.json({ document });
  } catch (error) {
    next(error);
  }
});

router.get('/documents/:id/download', async (req, res, next) => {
  try {
    const clientId = String(req.query.clientId || '').trim();
    if (!clientId) {
      return res.status(400).json({ error: 'clientId query parameter is required' });
    }
    const document = await getDocument(clientId, req.params.id);
    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }
    res.setHeader('Content-Type', document.mimeType || 'text/plain; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${document.name.replace(/"/g, '')}"`
    );
    res.send(document.content);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
