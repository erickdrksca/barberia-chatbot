import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xyyelqitwyxuoxsjkuap.supabase.co";

const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5eWVscWl0d3l4dW94c2prdWFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MDUwOTAsImV4cCI6MjA5NTk4MTA5MH0.-UWvVMTeYOpiN7waclYqPA7w2lF9CO6eR-rHr81Qk44";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
