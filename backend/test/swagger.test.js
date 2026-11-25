const assert = require('node:assert/strict');
const { test } = require('node:test');
const { swaggerSpec } = require('../src/swagger');

test('Swagger documents task, project, and people endpoints with bearer auth', () => {
  const expectedOperations = {
    '/api/tasks': ['get', 'post'],
    '/api/tasks/approve': ['post'],
    '/api/tasks/export': ['get'],
    '/api/tasks/{id}': ['patch', 'delete'],
    '/api/projects': ['get', 'post'],
    '/api/projects/{id}': ['patch', 'delete'],
    '/api/people': ['get', 'post'],
    '/api/people/{id}': ['patch', 'delete'],
  };

  for (const [path, methods] of Object.entries(expectedOperations)) {
    for (const method of methods) {
      assert.ok(swaggerSpec.paths[path]?.[method], `${method.toUpperCase()} ${path} is documented`);
      assert.deepEqual(swaggerSpec.paths[path][method].security, [{ bearerAuth: [] }]);
    }
  }

  assert.ok(swaggerSpec.paths['/api/auth/login']?.post);
  assert.equal(swaggerSpec.paths['/api/auth/login'].post.security, undefined);
  assert.equal(swaggerSpec.components.securitySchemes.bearerAuth.scheme, 'bearer');
});
