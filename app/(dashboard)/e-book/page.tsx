import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const JENIS_LABEL: Record<string, string> = {
  sayur: "🥬 Sayur",
  buah: "🍎 Buah",
  hias: "🪴 Hias",
  rempah: "🌶️ Rempah",
};

export default async function EbookPage() {
  const species = await prisma.plantSpecies.findMany({ orderBy: { nama: "asc" } });

  const groups = species.reduce<Record<string, typeof species>>((acc, s) => {
    (acc[s.jenis] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">E-book Tanaman</h1>
        <p className="text-ink/60 text-sm mt-1">
          Katalog referensi perawatan {species.length} jenis tanaman — dari kebutuhan cahaya
          sampai perkiraan masa panen.
        </p>
      </header>

      {Object.entries(groups).map(([jenis, items]) => (
        <section key={jenis} className="mb-10">
          <h2 className="font-display text-lg font-semibold mb-4 text-moss-deep">
            {JENIS_LABEL[jenis] ?? jenis}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((plant) => (
              <article key={plant.id} className="seed-card overflow-hidden flex flex-col">
                <div className="relative h-40 bg-ink/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={plant.gambar}
                    alt={plant.nama}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-display font-semibold text-lg">{plant.nama}</h3>
                  {plant.namaLatin && (
                    <p className="text-xs italic text-ink/50 mb-2">{plant.namaLatin}</p>
                  )}
                  <p className="text-sm text-ink/70 mb-3 flex-1">{plant.deskripsi}</p>

                  <div className="text-xs bg-moss/10 text-moss-deep rounded-lg px-3 py-2 mb-2">
                    <span className="font-medium">Perawatan: </span>
                    {plant.perawatan}
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-ink/60 mt-auto">
                    {plant.suhuMin != null && (
                      <span className="bg-white/70 px-2 py-1 rounded">
                        🌡️ {plant.suhuMin}-{plant.suhuMax}°C
                      </span>
                    )}
                    {plant.kelembabanMin != null && (
                      <span className="bg-white/70 px-2 py-1 rounded">
                        💧 {plant.kelembabanMin}-{plant.kelembabanMax}%
                      </span>
                    )}
                    {plant.kebutuhanCahaya && (
                      <span className="bg-white/70 px-2 py-1 rounded">
                        ☀️ {plant.kebutuhanCahaya}
                      </span>
                    )}
                    {plant.masaPanen && (
                      <span className="bg-white/70 px-2 py-1 rounded">
                        📅 {plant.masaPanen}
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
