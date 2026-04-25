import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cjjewehmdqlxptkcowhw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamV3ZWhtZHFseHB0a2Nvd2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDc4ODgsImV4cCI6MjA5MTMyMzg4OH0.COQz8rpLHTAy_JK75MR-v9OYrCP0DKCWB1LGQxSC_rQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function findColumn() {
  const possibleNames = ['upi_id', 'up_id', 'upid', 'UPI_ID', 'UPID'];
  
  for (const col of possibleNames) {
    // We try to select just that column. If it doesn't exist, Supabase throws an error
    const { error } = await supabase.from('users').select(col).limit(1);
    if (!error) {
      console.log(`FOUND COLUMN: ${col}`);
      return;
    } else {
      console.log(`Column ${col} error: ${error.message}`);
    }
  }
}

findColumn();
