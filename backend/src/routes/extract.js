const express = require('express');
const { z } = require('zod');
const { extractTasks, refineTask } = require('../services/llmExtractor');

const router = express.Router();

const BodySchema = z.object({
  text: z.string().min(10, 'Message text is required'),
});

/**
 * @openapi
 * /api/extract:
 *   post:
 *     tags: [Extraction]
 *     summary: Extract tasks from unstructured client text via LLM (or mock)
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
 *                 example: We need the new university course pages reviewed before the end of the month...
 *     responses:
 *       200:
 *         description: Structured extraction result for human review
 *       400:
 *         description: Invalid request body
 */
router.post('/extract', async (req, res, next) => {
  try {
    const body = BodySchema.parse(req.body);
    const result = await extractTasks(body.text);

    res.json({
      extractedAt: new Date().toISOString(),
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
