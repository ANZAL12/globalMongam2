import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqodtpuuhhfvcuceshfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2R0cHV1aGhmdmN1Y2VzaGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODk1NTQsImV4cCI6MjA4OTE2NTU1NH0.8B3q65aF1GXI7RO6AcIx9XHQJMr_yaHa8Rmmoa7b8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
  console.log('Querying for tables...');
  // Since we don't have direct access to postgres catalogs via supabase-js easily without RPC
  // we can try to guess from the known tables and common patterns, 
  // or use a clever trick if RPC exists.
  
  // Let's try to query the public schema information if allowed, otherwise we'll rely on known tables.
  const tables = ['sales', 'users', 'announcements', 'activity_logs', 'promoters']; // guessing promoters might be a view or table
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error) {
      console.log(`Table exists: ${table}`);
    } else {
      console.log(`Table ${table} check error: ${error.message}`);
    }
  }
}

listTables();
