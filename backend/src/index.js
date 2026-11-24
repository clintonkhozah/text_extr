const { createApp } = require('./app');
const config = require('./config');

const app = createApp();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
  console.log(`Swagger UI: http://localhost:${config.port}/api/docs`);
  console.log(`ChatGPT API: ${config.hasLlm ? 'configured' : 'not configured'}`);
  console.log(`Database: ${config.hasSupabase ? 'Supabase' : 'not configured'}`);
});
