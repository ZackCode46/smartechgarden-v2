import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import PlantForm from "@/components/PlantForm";

export const dynamic = "force-dynamic";

export default async function NewPlantPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (role !== "ADMIN") redirect("/dashboard");

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Tambah Tanaman</h1>
        <p className="text-ink/60 text-sm mt-1">Isi detail tanaman baru untuk katalog e-book.</p>
      </header>
      <PlantForm mode="create" />
    </div>
  );
}
