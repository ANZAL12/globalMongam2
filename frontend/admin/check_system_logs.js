import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqodtpuuhhfvcuceshfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2R0cHV1aGhmdmN1Y2VzaGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODk1NTQsImV4cCI6MjA4OTE2NTU1NH0.8B3q65aF1GXI7RO6AcIx9XHQJMr_yaHa8Rmmoa7b8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSystemLogs() {
  const { data, error } = await supabase.from('system_logs').select('*');
  if (error) {
    console.error('Error fetching system_logs:', error.message);
    return;
  }
  console.log(`System Logs count: ${data.length}`);
  if (data.length > 0) {
      console.log('Sample log:', data[0]);
  }
}

checkSystemLogs();
