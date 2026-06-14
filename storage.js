// Response storage — Supabase REST insert with localStorage fallback.
// Never throws at the respondent: if the network fails, the response is
// queued locally and the user still reaches the thank-you screen.

const STORAGE_BACKUP_KEY = "ipc_survey_backup";

function isSupabaseConfigured() {
  return Boolean(APP_CONFIG.SUPABASE_URL && APP_CONFIG.SUPABASE_ANON_KEY);
}

function backupLocally(payload) {
  try {
    const existing = JSON.parse(localStorage.getItem(STORAGE_BACKUP_KEY) || "[]");
    const updated = existing.concat([payload]);
    localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error("[survey] localStorage backup failed:", err);
    return false;
  }
}

async function insertIntoSupabase(payload) {
  const endpoint =
    APP_CONFIG.SUPABASE_URL.replace(/\/$/, "") +
    "/rest/v1/" +
    APP_CONFIG.TABLE_NAME;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: APP_CONFIG.SUPABASE_ANON_KEY,
      Authorization: "Bearer " + APP_CONFIG.SUPABASE_ANON_KEY,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error("Supabase insert failed (" + response.status + "): " + detail);
  }
}

// Returns { saved: "supabase" | "local" | "failed" } — the UI always
// proceeds to the thank-you screen; this result is for logging only.
async function submitResponse(payload) {
  if (!isSupabaseConfigured()) {
    console.warn("[survey] DEMO MODE — Supabase not configured; saving to localStorage.");
    const ok = backupLocally(payload);
    return { saved: ok ? "local" : "failed" };
  }

  try {
    await insertIntoSupabase(payload);
    return { saved: "supabase" };
  } catch (err) {
    console.error("[survey] submit error, backing up locally:", err);
    const ok = backupLocally(payload);
    return { saved: ok ? "local" : "failed" };
  }
}
