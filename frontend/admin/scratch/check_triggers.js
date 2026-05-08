import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zefsyngtxzqhjnylzlcg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnN5bmd0eHpxaGpueWx6bGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDYxMzcsImV4cCI6MjA5MzQ4MjEzN30.yv8XT1oUQCRTUOBHI2fhxon_pyJ8eGrPnpdEIukirr4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTriggers() {
  // We can query information_schema or pg_trigger via RPC if available, 
  // but usually anon key can't do that directly.
  // However, we can try to find if there's any trigger by trying to cause it? 
  // No, let's try to fetch from pg_trigger if we have an RPC.
  
  console.log('Attempting to list triggers via SQL...');
  const { data, error } = await supabase.rpc('get_triggers', { table_name: 'system_logs' });
  
  if (error) {
    console.log('RPC get_triggers not found or failed. Trying a different way...');
    // Try a raw select if the user has a view or something
    const { data: data2, error: error2 } = await supabase.from('pg_trigger').select('*');
    if (error2) {
      console.log('Failed to query pg_trigger directly (expected for anon key).');
    }
  } else {
    console.log('Triggers on system_logs:', data);
  }
}

listTriggers();
