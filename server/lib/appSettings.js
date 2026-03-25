import db from '../db.js';

const getSetting = db.prepare('SELECT value FROM app_settings WHERE key = ?');
const upsertSetting = db.prepare(
  `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
   ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
);

// Simple in-memory cache (cleared on set)
let cache = {};

export function getAppSetting(key) {
  if (key in cache) return cache[key];
  const row = getSetting.get(key);
  const val = row?.value ?? null;
  cache[key] = val;
  return val;
}

export function setAppSetting(key, value) {
  upsertSetting.run(key, String(value));
  cache[key] = String(value);
}

export function isLaunchMode() {
  return getAppSetting('launch_mode') === 'true';
}
