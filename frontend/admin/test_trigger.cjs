require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testTrigger() {
  console.log('Testing trigger by inserting a dummy target...');
  
  // First, get an announcement ID
  const { data: anns } = await supabase.from('announcements').select('id').limit(1);
  // Get a user ID that has a push token
  const { data: users } = await supabase.from('users').select('id, expo_push_token').not('expo_push_token', 'is', null).limit(1);

  if (!anns || anns.length === 0 || !users || users.length === 0) {
    console.error('Could not find announcement or user for testing');
    return;
  }

  const annId = anns[0].id;
  const userId = users[0].id;

  console.log(`Inserting target: annId=${annId}, userId=${userId}`);
  
  const { data, error } = await supabase.from('announcement_targets').insert({
    announcement_id: annId,
    user_id: userId
  });

  if (error) {
    console.error('ERROR during insert (This means the trigger failed!):', error);
  } else {
    console.log('Insert successful! No trigger errors.');
  }
}

testTrigger();
