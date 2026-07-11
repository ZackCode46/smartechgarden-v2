import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  const [userCount, speciesCount, deviceCount, checkCount] = await Promise.all([
    prisma.user.count(),
    prisma.plantSpecies.count(),
    prisma.device.count(),
    prisma.plantCheck.count(),
  ]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Panel Admin</h1>
        <p className="text-ink/60 text-sm mt-1">Kelola katalog e-book dan pantau data aplikasi.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total User" value={userCount} icon="👤" />
        <StatCard label="Spesies E-book" value={speciesCount} icon="🌿" />
        <StatCard label="Perangkat Terdaftar" value={deviceCount} icon="📡" />
        <StatCard label="Cek Tanaman" value={checkCount} icon="🔍" />
      </div>

      <Link
        href="/admin/plants"
        className="seed-card p-6 flex items-center justify-between hover:bg-white/40 transition-colors"
      >
        <div>
          <h2 className="font-display text-lg font-semibold">📖 Kelola Katalog E-book</h2>
          <p className="text-sm text-ink/60 mt-1">Tambah, edit, atau hapus tanaman di katalog.</p>
        </div>
        <span className="text-2xl">→</span>
      </Link>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div className="seed-card p-4">
      <p className="text-xs uppercase tracking-wide text-ink/50 font-medium">
        {icon} {label}
      </p>
      <p className="font-mono text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}
