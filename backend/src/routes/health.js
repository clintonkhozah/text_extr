const express = require('express');
const config = require('../config');

const router = express.Router();

/**
 * @openapi
 * /api/health:
 *   get:
 *     tags: [System]
 *     summary: Health and configuration status
 *     responses:
 *       200:
 *         description: Service is running
 */
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    llm: config.hasLlm ? 'configured' : 'not_configured',
    database: config.hasSupabase ? 'supabase' : 'not_configured',
  });
});

module.exports = router;
