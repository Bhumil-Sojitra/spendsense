import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tivmlwfpnamqenesedpb.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpdm1sd2ZwbmFtcWVuZXNlZHBiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNDM1MDYsImV4cCI6MjEwNzcxOTUwNn0.Aj6KmS3rNc0GSo6XH9AORA9OK07z81QirokqN3GgpA0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
