
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqodtpuuhhfvcuceshfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2R0cHV1aGhmdmN1Y2VzaGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODk1NTQsImV4cCI6MjA4OTE2NTU1NH0.8B3q65aF1GXI7RO6AcIx9XHQJMr_yaHa8Rmmoa7b8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listTables() {
    const tables = ['announcements', 'announcement_targets'];
    for (const table of tables) {
        const { data, error } = await supabase.from(table).select('*').limit(1);
        if (error) {
            console.log(`Table ${table} error:`, error.message);
        } else {
            console.log(`Table ${table} exists. Columns:`, data.length > 0 ? Object.keys(data[0]) : 'Empty');
            if (data.length === 0) {
                // Try to get columns even if empty
                const { data: cols, error: colError } = await supabase.from(table).select().limit(0);
                if (!colError) console.log(`Table ${table} is empty but select worked.`);
            }
        }
    }
}

listTables();
