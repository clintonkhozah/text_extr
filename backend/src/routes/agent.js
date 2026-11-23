const express = require('express');
const { z } = require('zod');
const { askAgent } = require('../services/deskAgent');

const router = express.Router();

const BodySchema = z.object({
  clientId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1),
      })
    )
    .min(1),
});

router.post('/agent', async (req, res, next) => {
  try {
    const body = BodySchema.parse(req.body);
    const result = await askAgent(body);
    res.json({
      clientId: body.clientId,
      ...result,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
