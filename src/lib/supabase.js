import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xyyelqitwyxuoxsjkuap.supabase.co/rest/v1/"; 
const supabaseAnonKey = "sb_publishable_iqwqKy4lgwMf4fwC7dpXDQ_8Z7RvkXm"; 
export const supabase = createClient(

  supabaseUrl,

  supabaseAnonKey

);
