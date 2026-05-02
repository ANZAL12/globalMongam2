import { supabase } from '../lib/supabase';

const LOG_RETENTION_DAYS = 7;
const CLEANUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
let lastCleanupAt = 0;

async function cleanupOldLogs() {
  const now = Date.now();
  // Run cleanup at most once every 7 days per browser session.
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) return;
  lastCleanupAt = now;

  const cutoff = new Date(now - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabase.from('system_logs').delete().lt('created_at', cutoff);
  if (error) {
    // Keep login flow resilient even if cleanup policy is restricted.
    console.warn('Failed to cleanup old system logs:', error.message);
  }
}

export async function logActivity(action: string, details: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await cleanupOldLogs();

    const { error } = await supabase.from('system_logs').insert([{
      action,
      details,
      user_email: user.email,
    }]);

    if (error) {
      console.error('Failed to write system log:', error);
    }
  } catch (err) {
    console.error('Error in logActivity:', err);
  }
}
