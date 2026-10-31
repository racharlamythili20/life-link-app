// src/config/supabase.js
const { createClient } = require('@supabase/supabase-js');
const logger = require('../utils/logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

let supabase = null;

if (supabaseUrl && supabaseServiceKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    logger.info('✅ Supabase client initialized successfully');
  } catch (err) {
    logger.error(`❌ Failed to initialize Supabase client: ${err.message}`);
  }
} else {
  logger.warn('⚠️ Supabase config is missing required environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY). Storage and Supabase Auth will be disabled until configured.');
}

module.exports = supabase;

