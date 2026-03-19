import pkg from 'pg';
const { Client } = pkg;

const connectionString = 'postgresql://postgres:Anzal%407306049755@db.ptrychlituduchydhshi.supabase.co:5432/postgres';

async function setupAutoConfirm() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    await client.connect();
    console.log('Connected to database.');

    const sql = `
      -- Function to auto-confirm users in auth.users when they are added to public.users
      CREATE OR REPLACE FUNCTION public.auto_confirm_user()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE auth.users 
        SET email_confirmed_at = NOW(), 
            confirmed_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      -- Trigger to run the function after a new user is inserted into public.users
      DROP TRIGGER IF EXISTS tr_auto_confirm_user ON public.users;
      CREATE TRIGGER tr_auto_confirm_user
      AFTER INSERT ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_confirm_user();
      
      console.log('Auto-confirm trigger and function created successfully.');
    `;

    // We can't use console.log inside the SQL string for execution, fixing the prompt.
    const realSql = `
      CREATE OR REPLACE FUNCTION public.auto_confirm_user()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE auth.users 
        SET email_confirmed_at = NOW(), 
            confirmed_at = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS tr_auto_confirm_user ON public.users;
      CREATE TRIGGER tr_auto_confirm_user
      AFTER INSERT ON public.users
      FOR EACH ROW
      EXECUTE FUNCTION public.auto_confirm_user();
    `;

    await client.query(realSql);
    console.log('SQL executed successfully. Auto-confirm is now active.');

  } catch (err) {
    console.error('Error executing SQL:', err);
  } finally {
    await client.end();
  }
}

setupAutoConfirm();
