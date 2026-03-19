import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  const { data, error } = await supabase
    .from('sales')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error fetching data:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns in sales table:', Object.keys(data[0]));
  } else {
    // If no data, try to fetch table definition or just assume 'transaction_id'
    console.log('No data in sales table to infer columns.');
    const { data: columnData, error: columnError } = await supabase.rpc('get_column_names', { table_name: 'sales' });
    if (columnError) {
       console.log('RPC failed, likely get_column_names not defined.');
    } else {
       console.log('Column details from RPC:', columnData);
    }
  }
}

checkSchema();
