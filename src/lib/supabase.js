import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xyyelqitwyxuoxsjkuap.supabase.co";

const supabaseAnonKey = "TU_KEY";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
