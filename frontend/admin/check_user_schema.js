import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqodtpuuhhfvcuceshfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2R0cHV1aGhmdmN1Y2VzaGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODk1NTQsImV4cCI6MjA4OTE2NTU1NH0.8B3q65aF1GXI7RO6AcIx9XHQJMr_yaHa8Rmmoa7b8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUserSchema() {
  console.log('Fetching single row from users table...');
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching data:', error.message);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in users table:', Object.keys(data[0]));
  } else {
    console.log('No data in users table.');
  }
}

checkUserSchema();
