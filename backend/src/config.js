require('dotenv').config({ path: require('node:path').resolve(__dirname, '../.env') });

const config = {
  port: Number(process.env.PORT) || 4000,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://127.0.0.1:3000',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabasePublishableKey: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
};

config.hasSupabase = Boolean(config.supabaseUrl && config.supabasePublishableKey);
config.hasLlm = Boolean(config.openaiApiKey);

module.exports = config;
