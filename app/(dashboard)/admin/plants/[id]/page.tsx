import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PlantForm from "@/components/PlantForm";

export const dynamic = "force-dynamic";

export default async function EditPlantPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  const plant = await prisma.plantSpecies.findUnique({ where: { id: params.id } });
  if (!plant) notFound();

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Edit Tanaman</h1>
        <p className="text-ink/60 text-sm mt-1">{plant.nama}</p>
      </header>
      <PlantForm
        mode="edit"
        plantId={plant.id}
        initial={{
          nama: plant.nama,
          namaLatin: plant.namaLatin ?? "",
          jenis: plant.jenis as "sayur" | "buah" | "hias" | "rempah",
          gambar: plant.gambar,
          deskripsi: plant.deskripsi,
          perawatan: plant.perawatan,
          suhuMin: plant.suhuMin?.toString() ?? "",
          suhuMax: plant.suhuMax?.toString() ?? "",
          kelembabanMin: plant.kelembabanMin?.toString() ?? "",
          kelembabanMax: plant.kelembabanMax?.toString() ?? "",
          kebutuhanCahaya: (plant.kebutuhanCahaya as "rendah" | "sedang" | "tinggi" | null) ?? "",
          masaPanen: plant.masaPanen ?? "",
        }}
      />
    </div>
  );
}
