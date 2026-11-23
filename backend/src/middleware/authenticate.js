const { createClient } = require('@supabase/supabase-js');
const config = require('../config');
const { getSupabase } = require('../services/supabaseClient');

async function authenticate(req, _res, next) {
  try {
    if (!config.hasSupabase) {
      const error = new Error('Supabase authentication is not configured');
      error.status = 503;
      throw error;
    }

    const authorization = req.get('authorization') || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) {
      const error = new Error('Sign in to continue');
      error.status = 401;
      throw error;
    }

    const verifier = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error: authError } = await verifier.auth.getUser(token);
    if (authError || !data.user) {
      const error = new Error('Your session is invalid or has expired. Sign in again.');
      error.status = 401;
      throw error;
    }

    req.user = data.user;
    req.accessToken = token;
    req.supabase = getSupabase(token);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };
