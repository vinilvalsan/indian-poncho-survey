// ── Deployment configuration ──────────────────────────────────────────
// Fill these two values from your Supabase project:
//   Dashboard → Project Settings → API
//   - "Project URL"      → SUPABASE_URL
//   - "anon public" key  → SUPABASE_ANON_KEY
//
// The anon key is SAFE to expose in the browser — the database policy
// (setup.sql) only allows inserting new responses, never reading them.
//
// While both values are empty the app runs in DEMO MODE: responses are
// kept in the browser's localStorage so you can test the full flow.

const APP_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  TABLE_NAME: "survey_responses",
};
