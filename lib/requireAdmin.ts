import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Pastikan yang mengakses adalah user dengan role ADMIN.
 * Return session kalau valid, atau null kalau tidak (caller yang
 * bertanggung jawab mengembalikan response 401/403).
 */
export async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || role !== "ADMIN") return null;
  return session;
}
