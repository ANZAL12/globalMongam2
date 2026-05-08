import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zefsyngtxzqhjnylzlcg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnN5bmd0eHpxaGpueWx6bGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDYxMzcsImV4cCI6MjA5MzQ4MjEzN30.yv8XT1oUQCRTUOBHI2fhxon_pyJ8eGrPnpdEIukirr4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const tables = ['logs', 'system_logs', 'activity_logs', 'audit_logs'];
  
  for (const table of tables) {
    console.log(`\nChecking table: ${table}`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    
    if (error) {
      console.log(`Error checking table ${table}: ${error.message}`);
    } else {
      console.log(`Table ${table} exists.`);
      if (data && data.length > 0) {
        console.log(`Columns: ${Object.keys(data[0]).join(', ')}`);
      } else {
        console.log('Table is empty, trying to fetch schema via another way if possible...');
        // We can't easily get schema with anon key if empty without RPC, 
        // but usually we can insert a dummy row or check metadata.
      }
    }
  }
}

checkSchema();
