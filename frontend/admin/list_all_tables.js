import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqodtpuuhhfvcuceshfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2R0cHV1aGhmdmN1Y2VzaGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODk1NTQsImV4cCI6MjA4OTE2NTU1NH0.8B3q65aF1GXI7RO6AcIx9XHQJMr_yaHa8Rmmoa7b8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listAllTables() {
  console.log('Fetching all tables from public schema via RPC...');
  // Note: This relies on a common helper or custom SQL function. 
  // If not available, we'll try to brute force common names.
  
  const commonTables = [
    'sales', 'users', 'announcements', 'system_logs', 'logs', 'activity', 
    'activity_logs', 'audit_logs', 'announcement_targets', 'notifications',
    'payouts', 'incentives', 'promoter_details', 'profiles'
  ];
  
  for (const table of commonTables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (!error) {
      console.log(`Table '${table}' exists. Count: ${count}`);
    } else if (error.code !== 'PGRST116' && !error.message.includes('does not exist')) {
      console.log(`Table '${table}' error: ${error.message}`);
    }
  }
}

listAllTables();
