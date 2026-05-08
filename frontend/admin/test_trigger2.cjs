require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testTrigger() {
  console.log('Testing trigger with a BRAND NEW announcement...');
  
  // Create a new announcement
  const { data: newAnn, error: annError } = await supabase.from('announcements').insert({
    title: 'Test Push Notification',
    description: 'This is a test announcement to verify push notifications.'
  }).select().single();

  if (annError) {
    console.error('Failed to create announcement:', annError);
    return;
  }

  // Get a user ID that has a push token
  const { data: users } = await supabase.from('users').select('id, expo_push_token').not('expo_push_token', 'is', null).limit(1);

  if (!users || users.length === 0) {
    console.error('Could not find user with push token for testing');
    return;
  }

  const annId = newAnn.id;
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
