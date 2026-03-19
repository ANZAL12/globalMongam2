import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqodtpuuhhfvcuceshfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2R0cHV1aGhmdmN1Y2VzaGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODk1NTQsImV4cCI6MjA4OTE2NTU1NH0.8B3q65aF1GXI7RO6AcIx9XHQJMr_yaHa8Rmmoa7b8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function clearDatabase() {
  console.log('Starting database cleanup...');

  // 1. Clear Sales (Depends on users)
  console.log('Clearing sales...');
  const { error: salesError } = await supabase.from('sales').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // delete all
  if (salesError) console.error('Error clearing sales:', salesError.message);

  // 2. Clear Announcements
  console.log('Clearing announcements...');
  const { error: annError } = await supabase.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (annError) console.error('Error clearing announcements:', annError.message);

  // 3. Clear System Logs
  console.log('Clearing system_logs...');
  const { error: logsError } = await supabase.from('system_logs').delete().neq('id', 0); // Assuming integer ID or just use a dummy filter
  if (logsError) {
      // Try string ID filter if integer fails
      const { error: logsError2 } = await supabase.from('system_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (logsError2) console.error('Error clearing system_logs:', logsError2.message);
  }

  // 4. Clear Users (KEEP ADMINS)
  console.log('Clearing non-admin users...');
  const { error: usersError } = await supabase.from('users').delete().neq('role', 'admin');
  if (usersError) console.error('Error clearing users:', usersError.message);

  console.log('Cleanup complete!');
}

clearDatabase();
