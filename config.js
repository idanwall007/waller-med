/* =============================================================================
 * Waller Meditation · Backend Configuration
 * =============================================================================
 * Paste your Supabase project credentials here.
 * Find them in:  Supabase Dashboard → Project Settings → API
 *
 * IMPORTANT:
 *   - The ANON key is safe to expose publicly (that's its design).
 *   - Never paste the SERVICE ROLE key here — that one's secret.
 *
 * Leave BOTH values empty to run the app in "demo mode" (the simulated
 * 49 users + local-only data). Filling them in switches every layer of
 * the app to talk to the real backend.
 * =============================================================================
 */
window.WMConfig = {
  SUPABASE_URL:      "https://fgtjilmrsdkzyfjpwmoa.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZndGppbG1yc2RrenlmanB3bW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Mzk3NzksImV4cCI6MjA5NDQxNTc3OX0.AzZnstforj4Vv1_fSSYNYLi1ijZtnrs0dbdzI5-w-m0",

  // Optional: tighten the timezone for streak day-rollover (default Asia/Jerusalem)
  TIMEZONE: "Asia/Jerusalem",

  // Optional: minimum friends to unlock app (default 3, per product spec)
  UNLOCK_THRESHOLD: 3,
};
