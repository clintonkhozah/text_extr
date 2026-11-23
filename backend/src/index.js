const { createApp } = require('./app');
const config = require('./config');

const app = createApp();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Swagger UI: http://localhost:${config.port}/api/docs`);
  console.log(`LLM mode: ${config.hasLlm ? 'OpenAI-compatible API' : 'mock extractor'}`);
  console.log(`Database: ${config.hasSupabase ? 'Supabase' : 'not configured'}`);
});
