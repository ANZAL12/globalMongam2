require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkPushSetup() {
  console.log('--- Checking Users for Expo Push Tokens ---');
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('email, role, expo_push_token');
    
  if (userError) {
    console.error('Error fetching users:', userError.message);
  } else {
    const usersWithTokens = users.filter(u => u.expo_push_token);
    console.log(`Found ${users.length} total users. ${usersWithTokens.length} have an expo_push_token.`);
    usersWithTokens.forEach(u => console.log(`- ${u.email} (${u.role}): ${u.expo_push_token.substring(0, 20)}...`));
  }

  console.log('\n--- Checking System Logs for Push Attempts ---');
  const { data: logs, error: logError } = await supabase
    .from('system_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logError) {
    console.error('Error fetching system logs (maybe table does not exist?):', logError.message);
  } else {
    if (logs.length === 0) console.log('No recent logs found.');
    logs.forEach(l => {
      if (l.action && l.action.includes('PUSH')) {
        console.log(`[${l.created_at}] ${l.action}: ${l.details}`);
      }
    });
  }
}

checkPushSetup();
