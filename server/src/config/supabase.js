const { createClient } = require("@supabase/supabase-js");

const key =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

// This client uses a backend-only secret key. Never send this key to the frontend.
const supabase = createClient(process.env.SUPABASE_URL, key, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
