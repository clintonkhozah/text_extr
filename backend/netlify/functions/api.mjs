import serverless from 'serverless-http';
import backend from '../../src/app.js';

const app = backend.createApp();
const handleRequest = serverless(app);

export const config = {
  path: '/api/*',
};

export default async function api(request, context) {
  const url = new URL(request.url);
  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.text();
  const result = await handleRequest({
    httpMethod: request.method,
    path: url.pathname,
    headers: Object.fromEntries(request.headers.entries()),
    queryStringParameters: Object.fromEntries(url.searchParams.entries()),
    body,
    isBase64Encoded: false,
  }, context);

  const responseBody = result.isBase64Encoded
    ? Buffer.from(result.body, 'base64')
    : result.body || null;

  return new Response(responseBody, {
    status: result.statusCode || 200,
    headers: result.headers,
  });
}
