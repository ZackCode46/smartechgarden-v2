import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;

  const device = userId ? await prisma.device.findFirst({ where: { userId } }) : null;

  const [readings, plantChecks] = await Promise.all([
    device
      ? prisma.sensorReading.findMany({
          where: { deviceId: device.id },
          orderBy: { recordedAt: "desc" },
          take: 50,
        })
      : Promise.resolve([]),
    userId
      ? prisma.plantCheck.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Riwayat Kebun</h1>
        <p className="text-ink/60 text-sm mt-1">
          Catatan pembacaan sensor dan hasil pemeriksaan tanaman dari waktu ke waktu.
        </p>
      </header>

      <section className="seed-card p-6 mb-8">
        <h2 className="font-display text-lg font-semibold mb-4">📜 Pembacaan Sensor (50 terakhir)</h2>
        {readings.length === 0 ? (
          <p className="text-ink/50 text-sm">Belum ada data sensor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-ink/50 text-xs uppercase tracking-wide border-b border-ink/10">
                  <th className="py-2 pr-4">Waktu</th>
                  <th className="py-2 pr-4">Suhu</th>
                  <th className="py-2 pr-4">Kelembaban Udara</th>
                  <th className="py-2 pr-4">Kelembaban Tanah</th>
                  <th className="py-2 pr-4">Cahaya</th>
                  <th className="py-2">Pompa</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r.id} className="border-b border-ink/5">
                    <td className="py-2 pr-4 font-mono text-xs text-ink/70">
                      {new Date(r.recordedAt).toLocaleString("id-ID")}
                    </td>
                    <td className="py-2 pr-4">{r.suhu}°C</td>
                    <td className="py-2 pr-4">{r.kelembaban}%</td>
                    <td className="py-2 pr-4">{r.tanah}%</td>
                    <td className="py-2 pr-4">{r.cahaya} lux</td>
                    <td className="py-2">{r.pumpActive ? "🟢 Aktif" : "⚪ Mati"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="seed-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">🔍 Riwayat Cek Tanaman</h2>
        {plantChecks.length === 0 ? (
          <p className="text-ink/50 text-sm">Belum ada pemeriksaan tanaman.</p>
        ) : (
          <div className="space-y-3">
            {plantChecks.map((c) => (
              <div key={c.id} className="flex items-center justify-between bg-white/60 rounded-lg px-4 py-3 border border-ink/10">
                <div>
                  <p className="font-medium text-sm">
                    {c.healthLabel}
                    {c.ripenessLabel ? ` · ${c.ripenessLabel}` : ""}
                  </p>
                  <p className="text-xs text-ink/50 font-mono">
                    {new Date(c.createdAt).toLocaleString("id-ID")}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">{c.healthScore}/100</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
