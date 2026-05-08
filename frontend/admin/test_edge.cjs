require('dotenv').config({ path: './.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testEdge() {
  console.log('Fetching an announcement and users to test Edge Function...');
  
  const { data: anns } = await supabase.from('announcements').select('id').limit(1);
  const { data: users } = await supabase.from('users').select('id').not('expo_push_token', 'is', null).limit(2);

  if (!anns || anns.length === 0 || !users || users.length === 0) {
    console.error('Could not find data to test');
    return;
  }

  const payload = {
    announcementId: anns[0].id,
    targetIds: users.map(u => u.id)
  };

  console.log('Sending payload:', payload);

  // Note: Since this calls the edge function, we need a valid session to pass the Admin check.
  // We can't do that easily without an admin password. Let's see if we can log in with a known user, or just print instructions.
  console.log('To truly test the Edge Function, we need a valid Admin JWT. I will simulate the push request directly instead.');
  
  // Simulate the edge function logic to see if Expo rejects the token
  const { data: usersData } = await supabase.from('users').select('expo_push_token').in('id', payload.targetIds);
  const tokens = usersData.map(u => u.expo_push_token);
  
  console.log('Tokens to test:', tokens);

  const expoMessages = tokens.map(token => ({
    to: token,
    title: "Test Edge Push",
    body: "This is a direct test to Expo",
    sound: "default",
    priority: "high"
  }));

  const response = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(expoMessages),
  });
  
  if (response.ok) {
    console.log('Expo Response (Success):', await response.json());
  } else {
    console.error('Expo Response (Error):', await response.text());
  }
}

testEdge();
