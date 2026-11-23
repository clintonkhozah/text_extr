const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

function getSupabase(accessToken) {
  if (!config.hasSupabase) {
    const error = new Error('Supabase is not configured on the backend');
    error.status = 503;
    throw error;
  }
  if (!accessToken) {
    const error = new Error('An authenticated Supabase session is required');
    error.status = 401;
    throw error;
  }
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

module.exports = { getSupabase };
