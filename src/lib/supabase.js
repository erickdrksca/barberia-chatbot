import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "TU_URL_SUPABASE";
const supabaseAnonKey = "TU_ANON_KEY";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
