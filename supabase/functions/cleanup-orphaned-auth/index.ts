/// <reference lib="deno.ns" />

import { createClient } from '@supabase/supabase-js';

Deno.serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const { userId } = await req.json();
    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId is required' }), { status: 400 });
    }

    // Use the service role client — this runs server-side only, key never exposed to client
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Safety check: only delete if there is NO matching public.users row
    // (i.e., this is truly an orphaned OAuth ghost, not a real registered user)
    const { data: profile, error: profileError } = await adminClient
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('Profile lookup error:', profileError.message);
      return new Response(JSON.stringify({ error: 'Failed to verify user profile' }), { status: 500 });
    }

    if (profile) {
      // User exists in public.users — this is a legitimate user, do NOT delete
      console.warn(`Cleanup refused: user ${userId} exists in public.users`);
      return new Response(JSON.stringify({ error: 'User is a registered user, not orphaned' }), { status: 403 });
    }

    // Safe to delete — no public profile exists
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Delete error:', deleteError.message);
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 500 });
    }

    console.log(`Orphaned auth user ${userId} deleted successfully.`);
    return new Response(JSON.stringify({ success: true }), { status: 200 });

  } catch (err) {
    console.error('Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
});
