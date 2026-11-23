const { ZodError } = require('zod');

function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((item) => ({
        path: item.path.join('.'),
        message: item.message,
      })),
    });
  }

  const status = err.status || 500;
  console.error('[api]', err.message);
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
}

module.exports = { errorHandler };
