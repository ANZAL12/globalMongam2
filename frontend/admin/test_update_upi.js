import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cjjewehmdqlxptkcowhw.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqamV3ZWhtZHFseHB0a2Nvd2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDc4ODgsImV4cCI6MjA5MTMyMzg4OH0.COQz8rpLHTAy_JK75MR-v9OYrCP0DKCWB1LGQxSC_rQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testUpdate() {
  // Try to find a promoter user first
  const { data: users } = await supabase.from('users').select('id, email, upi_id').eq('role', 'promoter').limit(1);
  if (!users || users.length === 0) {
    console.log('No promoters found to test update.');
    return;
  }
  
  const user = users[0];
  console.log(`Testing update for user ${user.id} (${user.email}), current upi_id: ${user.upi_id}`);
  
  const { data, error } = await supabase.from('users').update({ upi_id: 'test@upi' }).eq('id', user.id).select();
  
  if (error) {
    console.log(`Update error:`, error);
  } else {
    console.log(`Update success! Data:`, data);
  }
}

testUpdate();
