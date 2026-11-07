
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "Falta la variable NEXT_PUBLIC_SUPABASE_URL en las variables de entorno."
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "Falta la variable SUPABASE_SERVICE_ROLE_KEY en las variables de entorno."
  );
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
