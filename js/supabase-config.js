// ==========================================
// CONFIGURATION SUPABASE
// ==========================================

// Import Supabase using a CDN module (or typical script tag in HTML)
// E.g. <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

/* 
  INSTRUCTIONS :
  Une fois que tu as ton projet Supabase, remplace ces valeurs par celles
  trouvées dans Settings > API.
*/

const SUPABASE_URL = 'VOTRE_URL_SUPABASE';
const SUPABASE_KEY = 'VOTRE_CLE_ANON_SUPABASE';

// Initialize the Supabase client
// Uncomment the line below when you link the Supabase CDN in your HTML files.
// const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase file loaded. Attente des credentials...");
