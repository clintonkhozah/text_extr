const swaggerJsdoc = require('swagger-jsdoc');
const config = require('./config');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Project Desk API',
      version: '1.0.0',
      description:
        'Extract brief text, require human approval, and save tasks under authenticated projects.',
    },
    servers: [{ url: `http://localhost:${config.port}`, description: 'Local development' }],
    tags: [
      { name: 'System', description: 'Health and configuration' },
      { name: 'Extraction', description: 'Document text extraction and LLM task extraction' },
      { name: 'Tasks', description: 'Human review, persistence, and export' },
    ],
  },
  apis: [
    './src/routes/health.js',
    './src/routes/extract.js',
    './src/routes/tasks.js',
    './src/routes/projects.js',
  ],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerSpec };
