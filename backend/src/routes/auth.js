const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { z } = require('zod');
const config = require('../config');

const router = express.Router();

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: Sign in with Supabase email and password for Swagger testing
 *     description: Returns a short-lived access token. Copy it into Authorize as a Bearer token. The refresh token is not returned.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       '200':
 *         description: Signed in; response contains an access token and user details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [access_token, token_type, expires_in, user]
 *               properties:
 *                 access_token:
 *                   type: string
 *                   description: Short-lived Supabase access token; use with Swagger Authorize
 *                 token_type:
 *                   type: string
 *                   example: bearer
 *                 expires_in:
 *                   type: integer
 *                   description: Token lifetime in seconds
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                     email:
 *                       type: string
 *                       format: email
 *       '400':
 *         description: Invalid request body
 *       '401':
 *         description: Invalid credentials or unconfirmed account
 *       '429':
 *         description: Supabase sign-in rate limit reached
 *       '503':
 *         description: Supabase authentication is not configured
 */
router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = LoginSchema.parse(req.body);
    if (!config.hasSupabase) {
      const error = new Error('Supabase authentication is not configured');
      error.status = 503;
      throw error;
    }

    const supabase = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      const providerStatus = Number(authError.status);
      const error = new Error(
        providerStatus === 429
          ? 'Too many sign-in attempts. Try again later.'
          : providerStatus >= 400 && providerStatus < 500
            ? 'Invalid email or password, or the account needs email confirmation.'
            : 'Unable to complete sign-in with Supabase.'
      );
      error.status =
        providerStatus === 429
          ? 429
          : providerStatus >= 400 && providerStatus < 500
            ? 401
            : 502;
      throw error;
    }
    if (!data.session) {
      const error = new Error('Supabase sign-in did not return a session');
      error.status = 502;
      throw error;
    }

    res.json({
      access_token: data.session.access_token,
      token_type: data.session.token_type,
      expires_in: data.session.expires_in,
      user: {
        id: data.session.user.id,
        email: data.session.user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
