
import "server-only";
import { supabaseAdmin } from "./supabase-admin";

const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase();

export async function isAdminUser(
  accessToken: string
): Promise<boolean> {
  if (!ADMIN_EMAIL || !accessToken) {
    return false;
  }

  try {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (error || !user?.email) {
      return false;
    }

    return (
      user.email.trim().toLowerCase() === ADMIN_EMAIL
    );
  } catch {
    return false;
  }
}
