const express = require('express');
const { z } = require('zod');
const { extractTasks, refineTask } = require('../services/llmExtractor');
const { extractDocumentText } = require('../services/documentText');

const router = express.Router();

const BodySchema = z.object({
  text: z.string().max(60000).default(''),
  documents: z.array(z.object({
    name: z.string().min(1).max(255),
    contentBase64: z.string().min(1),
  })).max(5).default([]),
});

/**
 * @openapi
 * /api/extract:
 *   post:
 *     tags: [Extraction]
 *     summary: Extract text from supplied documents and identify tasks with the configured LLM
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *               documents:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [name, contentBase64]
 *                   properties:
 *                     name:
 *                       type: string
 *                     contentBase64:
 *                       type: string
 *     responses:
 *       200:
 *         description: Structured extraction result for human review
 *       400:
 *         description: Invalid request body or unsupported document
 *       503:
 *         description: ChatGPT API is not configured
 */
router.post('/extract', async (req, res, next) => {
  try {
    const body = BodySchema.parse(req.body);
    const sourceText = await extractDocumentText(body.documents, body.text);
    const result = await extractTasks(sourceText);

    res.json({
      extractedAt: new Date().toISOString(),
      sourceText,
      ...result,
      reviewRequired: true,
      message: 'Review and approve tasks before saving. Nothing has been persisted yet.',
    });
  } catch (error) {
    next(error);
  }
});

const RefineSchema = z.object({
  description: z.string().min(1),
  evidence: z.string().optional(),
  prompt: z.string().min(1).max(400),
});

/**
 * @openapi
 * /api/extract/refine:
 *   post:
 *     tags: [Extraction]
 *     summary: Rewrite a task description using its evidence and an instruction
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [description, prompt]
 *             properties:
 *               description:
 *                 type: string
 *               evidence:
 *                 type: string
 *               prompt:
 *                 type: string
 *                 maxLength: 400
 *     responses:
 *       '200':
 *         description: Refined task description
 *       '400':
 *         description: Invalid request
 *       '401':
 *         description: Missing or invalid Supabase access token
 */
router.post('/extract/refine', async (req, res, next) => {
  try {
    const body = RefineSchema.parse(req.body);
    const result = await refineTask(body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
