import psycopg2
import os

def setup_auto_confirm():
    try:
        # Using explicit parameters to avoid URL encoding issues
        conn = psycopg2.connect(
            host="db.cqodtpuuhhfvcuceshfs.supabase.co",
            database="postgres",
            user="postgres",
            password="Anzal@7306049755",
            port="5432"
        )
        cur = conn.cursor()
        
        sql = """
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
      """
        
        cur.execute(sql)
        conn.commit()
        print("Auto-confirm trigger and function created successfully.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error executing SQL: {e}")

if __name__ == "__main__":
    setup_auto_confirm()
