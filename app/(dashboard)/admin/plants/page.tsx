import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import DeletePlantButton from "@/components/DeletePlantButton";

export const dynamic = "force-dynamic";

export default async function AdminPlantsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  const species = await prisma.plantSpecies.findMany({ orderBy: { nama: "asc" } });

  return (
    <div>
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Kelola E-book</h1>
          <p className="text-ink/60 text-sm mt-1">{species.length} tanaman terdaftar.</p>
        </div>
        <Link
          href="/admin/plants/new"
          className="bg-moss hover:bg-moss-deep transition-colors text-canvas font-medium rounded-lg px-4 py-2.5 text-sm"
        >
          + Tambah Tanaman
        </Link>
      </header>

      <div className="seed-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-ink/50 text-xs uppercase tracking-wide border-b border-ink/10 bg-white/40">
              <th className="py-3 px-4">Foto</th>
              <th className="py-3 px-4">Nama</th>
              <th className="py-3 px-4">Jenis</th>
              <th className="py-3 px-4">Masa Panen</th>
              <th className="py-3 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {species.map((s) => (
              <tr key={s.id} className="border-b border-ink/5 last:border-0">
                <td className="py-2 px-4">
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-ink/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.gambar} alt={s.nama} className="h-full w-full object-cover" />
                  </div>
                </td>
                <td className="py-2 px-4">
                  <p className="font-medium">{s.nama}</p>
                  {s.namaLatin && <p className="text-xs italic text-ink/50">{s.namaLatin}</p>}
                </td>
                <td className="py-2 px-4 capitalize">{s.jenis}</td>
                <td className="py-2 px-4 text-ink/60">{s.masaPanen ?? "-"}</td>
                <td className="py-2 px-4 text-right space-x-2 whitespace-nowrap">
                  <Link
                    href={`/admin/plants/${s.id}`}
                    className="text-xs font-medium border border-ink/15 hover:bg-ink/5 rounded-lg px-3 py-1.5 inline-block"
                  >
                    ✏️ Edit
                  </Link>
                  <DeletePlantButton id={s.id} nama={s.nama} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
