import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zefsyngtxzqhjnylzlcg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InplZnN5bmd0eHpxaGpueWx6bGNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MDYxMzcsImV4cCI6MjA5MzQ4MjEzN30.yv8XT1oUQCRTUOBHI2fhxon_pyJ8eGrPnpdEIukirr4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTokens() {
  try {
    console.log('Fetching users from users table...');
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, fcm_web_push_token, expo_push_token');
    
    if (error) {
      console.error('Error fetching users:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('No users found in the database.');
      return;
    }

    console.log('\n--- Active Users & Push Token Status ---');
    users.forEach(user => {
      console.log(`Email: ${user.email}`);
      console.log(`  Full Name: ${user.full_name || 'N/A'}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  FCM Web Token: ${user.fcm_web_push_token ? '✅ REGISTERED (' + user.fcm_web_push_token.substring(0, 15) + '...)' : '❌ MISSING (NULL)'}`);
      console.log(`  Expo Mobile Token: ${user.expo_push_token ? '✅ REGISTERED (' + user.expo_push_token.substring(0, 15) + '...)' : '❌ MISSING (NULL)'}`);
      console.log('-----------------------------------------');
    });
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkTokens();
