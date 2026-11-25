const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const { swaggerSpec } = require('./swagger');
const { errorHandler } = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/authenticate');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const extractRoutes = require('./routes/extract');
const agentRoutes = require('./routes/agent');
const taskRoutes = require('./routes/tasks');
const projectRoutes = require('./routes/projects');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin: config.clientOrigin,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    })
  );
  app.use(express.json({ limit: '8mb' }));

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Task Assistant API',
  }));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));

  app.use('/api', healthRoutes);
  app.use('/api', authRoutes);
  app.use('/api', authenticate);
  app.use('/api', extractRoutes);
  app.use('/api', agentRoutes);
  app.use('/api', taskRoutes);
  app.use('/api', projectRoutes);

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
