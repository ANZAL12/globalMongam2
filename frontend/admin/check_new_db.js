import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cjjewehmdqlxptkcowhw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamV3ZWhtZHFseHB0a2Nvd2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDc4ODgsImV4cCI6MjA5MTMyMzg4OH0.COQz8rpLHTAy_JK75MR-v9OYrCP0DKCWB1LGQxSC_rQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
  const { data, error } = await supabase.from('users').select('*').limit(1);
  if (error) {
    console.error('Error fetching data:', error.message);
  } else if (data && data.length > 0) {
    console.log('Columns in users table:', Object.keys(data[0]));
  } else {
    console.log('No data found, but table exists.');
  }
}

checkSchema();
