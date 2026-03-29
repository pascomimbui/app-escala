const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
  console.log("Checking withdrawal_log table...");
  const { data, error } = await supabase.from('withdrawal_log').select('*').limit(1);
  if (error) {
    console.error("Error accessing table:", error.message);
  } else {
    console.log("Table exists! Data:", data);
  }
}

checkTable();
