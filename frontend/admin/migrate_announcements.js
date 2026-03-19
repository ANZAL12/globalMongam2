
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cqodtpuuhhfvcuceshfs.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxb2R0cHV1aGhmdmN1Y2VzaGZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODk1NTQsImV4cCI6MjA4OTE2NTU1NH0.8B3q65aF1GXI7RO6AcIx9XHQJMr_yaHa8Rmmoa7b8oQ';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function migrateAnnouncements() {
    console.log('--- Migrating Existing Announcements ---');
    
    // 1. Fetch all announcements
    const { data: announcements, error: annError } = await supabase.from('announcements').select('id');
    if (annError) {
        console.error('Error fetching announcements:', annError);
        return;
    }
    
    // 2. Fetch all promoters
    const { data: promoters, error: promError } = await supabase.from('users').select('id').eq('role', 'promoter');
    if (promError) {
        console.error('Error fetching promoters:', promError);
        return;
    }
    
    if (!announcements || announcements.length === 0 || !promoters || promoters.length === 0) {
        console.log('Nothing to migrate.');
        return;
    }
    
    console.log(`Found ${announcements.length} announcements and ${promoters.length} promoters.`);
    
    // 3. Create target records
    const targetRecords = [];
    for (const ann of announcements) {
        for (const prom of promoters) {
            targetRecords.push({
                announcement_id: ann.id,
                user_id: prom.id
            });
        }
    }
    
    // 4. Insert with upsert/ignore logic if possible, or just insert
    // We'll just insert and let it fail on duplicates if any constraints exist
    const { error: insertError } = await supabase.from('announcement_targets').insert(targetRecords);
    
    if (insertError) {
        console.log('Some inserts might have failed (possibly due to existing records):', insertError.message);
    } else {
        console.log('Migration completed successfully!');
    }
}

migrateAnnouncements();
