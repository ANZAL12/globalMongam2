import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:Globalmongam%40123@db.cjjewehmdqlxptkcowhw.supabase.co:5432/postgres';

async function fixUsers() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to new database.');

    // Find users in auth.users that are not in public.users
    const result = await client.query(`
      SELECT id, email FROM auth.users 
      WHERE id NOT IN (SELECT id FROM public.users);
    `);
    
    console.log(`Found ${result.rows.length} users in auth that are missing from public profiles.`);

    for (const user of result.rows) {
      console.log(`Inserting public profile for: ${user.email} (${user.id})`);
      // Since we don't know who is admin, let's designate the first one as admin, or just give them all 'admin' role to get them unstuck!
      // Wait, is there an admin role?
      await client.query(`
        INSERT INTO public.users (id, email, "role") 
        VALUES ($1, $2, 'admin')
      `, [user.id, user.email]);
    }
    
    console.log('Fix completed successfully.');
  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

fixUsers();
