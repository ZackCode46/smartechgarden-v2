"use client";

import { useEffect, useState, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import GardenGauge from "@/components/GardenGauge";

type Reading = {
  suhu: number;
  kelembaban: number;
  tanah: number;
  cahaya: number;
  recordedAt: string;
};

type Device = {
  id: string;
  name: string;
  mode: "AUTO" | "MANUAL";
  pumpState: boolean;
  isOnline: boolean;
  ssid: string | null;
};

type Schedule = {
  id: string;
  hour: number;
  minute: number;
  durationSec: number;
  enabled: boolean;
};

export default function DashboardClient({ userName }: { userName: string }) {
  const [device, setDevice] = useState<Device | null>(null);
  const [latest, setLatest] = useState<Reading | null>(null);
  const [history, setHistory] = useState<Reading[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newHour, setNewHour] = useState(6);
  const [newMinute, setNewMinute] = useState(0);
  const [newDuration, setNewDuration] = useState(30);

  const loadSchedules = useCallback(async () => {
    try {
      const res = await fetch("/api/schedules", { cache: "no-store" });
      const data = await res.json();
      setSchedules(data.schedules ?? []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/sensor", { cache: "no-store" });
      const data = await res.json();
      setDevice(data.device);
      setLatest(data.latest);
      setHistory(data.history ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadSchedules();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load, loadSchedules]);

  async function setMode(mode: "AUTO" | "MANUAL") {
    setBusy(true);
    await fetch("/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    await load();
    setBusy(false);
  }

  async function setPump(pumpState: boolean) {
    setBusy(true);
    await fetch("/api/control", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pumpState }),
    });
    await load();
    setBusy(false);
  }

  async function addSchedule() {
    setBusy(true);
    await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hour: newHour, minute: newMinute, durationSec: newDuration }),
    });
    await loadSchedules();
    setBusy(false);
  }

  async function toggleSchedule(id: string, enabled: boolean) {
    setBusy(true);
    await fetch(`/api/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    await loadSchedules();
    setBusy(false);
  }

  async function deleteSchedule(id: string) {
    setBusy(true);
    await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    await loadSchedules();
    setBusy(false);
  }

  const chartData = history.map((h) => ({
    time: new Date(h.recordedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
    Suhu: h.suhu,
    Kelembaban: h.kelembaban,
    Tanah: h.tanah,
    Cahaya: h.cahaya,
  }));

  return (
    <div>
      <header className="mb-8">
        <p className="text-ink/50 text-sm font-mono uppercase tracking-widest">
          {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
        <h1 className="font-display text-3xl font-semibold mt-1">Selamat datang, {userName} 🌿</h1>
        <div className="flex items-center gap-2 mt-2">
          <span
            className={`h-2 w-2 rounded-full ${device?.isOnline ? "bg-moss" : "bg-clay"}`}
          />
          <span className="text-sm text-ink/60">
            {device?.isOnline ? `${device.name} sedang online` : "Perangkat belum terhubung"}
            {device?.ssid ? ` · WiFi: ${device.ssid}` : ""}
          </span>
        </div>
      </header>

      {loading ? (
        <p className="text-ink/50">Membuka catatan kebun…</p>
      ) : (
        <>
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <GardenGauge
              label="Suhu"
              value={latest?.suhu ?? null}
              unit="°C"
              min={0}
              max={50}
              accent="clay"
              icon={<span>🌡️</span>}
              warn={!!latest && latest.suhu > 35}
              warnMessage="Suhu tinggi, siapkan naungan"
            />
            <GardenGauge
              label="Kelembaban Udara"
              value={latest?.kelembaban ?? null}
              unit="%"
              min={0}
              max={100}
              accent="rain"
              icon={<span>💧</span>}
            />
            <GardenGauge
              label="Kelembaban Tanah"
              value={latest?.tanah ?? null}
              unit="%"
              min={0}
              max={100}
              accent="moss"
              icon={<span>🌱</span>}
              warn={!!latest && latest.tanah < 30}
              warnMessage="Tanah kering, perlu disiram"
            />
            <GardenGauge
              label="Cahaya"
              value={latest?.cahaya ?? null}
              unit="lux"
              min={0}
              max={2000}
              accent="brass"
              icon={<span>☀️</span>}
            />
          </section>

          <section className="seed-card p-6 mb-8">
            <h2 className="font-display text-lg font-semibold mb-4">Kendali Penyiraman</h2>
            <div className="flex flex-wrap gap-3 mb-4">
              <button
                disabled={busy}
                onClick={() => setMode("AUTO")}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  device?.mode === "AUTO"
                    ? "bg-moss text-canvas border-moss"
                    : "border-ink/15 hover:bg-ink/5"
                }`}
              >
                🤖 Mode Otomatis
              </button>
              <button
                disabled={busy}
                onClick={() => setMode("MANUAL")}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  device?.mode === "MANUAL"
                    ? "bg-moss text-canvas border-moss"
                    : "border-ink/15 hover:bg-ink/5"
                }`}
              >
                🖐️ Mode Manual
              </button>
            </div>

            {device?.mode === "MANUAL" && (
              <div className="flex gap-3">
                <button
                  disabled={busy}
                  onClick={() => setPump(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-rain text-canvas"
                >
                  💦 Nyalakan Pompa
                </button>
                <button
                  disabled={busy}
                  onClick={() => setPump(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-ink/15"
                >
                  ⏹ Matikan Pompa
                </button>
              </div>
            )}

            <p className="text-xs text-ink/50 mt-3">
              Status pompa saat ini:{" "}
              <span className="font-medium">{device?.pumpState ? "Menyala" : "Mati"}</span>
              {device?.mode === "AUTO" && " (otomatis berdasarkan kelembaban tanah < 30%)"}
            </p>
          </section>

          <section className="seed-card p-6 mb-8">
            <h2 className="font-display text-lg font-semibold mb-1">Jadwal Siram Otomatis</h2>
            <p className="text-xs text-ink/50 mb-4">
              Jadwal ini hanya jalan saat Mode Otomatis aktif. Durasi = perkiraan "debit" (makin lama pompa
              nyala, makin banyak air keluar) — alat belum punya sensor volume air.
            </p>

            {schedules.length === 0 ? (
              <p className="text-ink/50 text-sm mb-4">Belum ada jadwal siram.</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {schedules.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between gap-3 border border-ink/10 rounded-lg px-3 py-2"
                  >
                    <span className="text-sm">
                      🕒 {String(s.hour).padStart(2, "0")}:{String(s.minute).padStart(2, "0")} —{" "}
                      {s.durationSec} detik
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={busy}
                        onClick={() => toggleSchedule(s.id, !s.enabled)}
                        className={`px-3 py-1 rounded-md text-xs font-medium border ${
                          s.enabled ? "bg-moss text-canvas border-moss" : "border-ink/15"
                        }`}
                      >
                        {s.enabled ? "Aktif" : "Nonaktif"}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => deleteSchedule(s.id)}
                        className="px-3 py-1 rounded-md text-xs font-medium border border-ink/15 hover:bg-ink/5"
                      >
                        Hapus
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col text-xs text-ink/60">
                Jam
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={newHour}
                  onChange={(e) => setNewHour(Number(e.target.value))}
                  className="w-16 border border-ink/15 rounded-md px-2 py-1 mt-1"
                />
              </label>
              <label className="flex flex-col text-xs text-ink/60">
                Menit
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={newMinute}
                  onChange={(e) => setNewMinute(Number(e.target.value))}
                  className="w-16 border border-ink/15 rounded-md px-2 py-1 mt-1"
                />
              </label>
              <label className="flex flex-col text-xs text-ink/60">
                Durasi (detik)
                <input
                  type="number"
                  min={1}
                  max={3600}
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="w-24 border border-ink/15 rounded-md px-2 py-1 mt-1"
                />
              </label>
              <button
                disabled={busy || schedules.length >= 10}
                onClick={addSchedule}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-moss text-canvas"
              >
                + Tambah Jadwal
              </button>
            </div>
            {schedules.length >= 10 && (
              <p className="text-xs text-clay mt-2">Maksimal 10 jadwal per alat.</p>
            )}
          </section>

          <section className="seed-card p-6">
            <h2 className="font-display text-lg font-semibold mb-4">Grafik 20 Pembacaan Terakhir</h2>
            {chartData.length === 0 ? (
              <p className="text-ink/50 text-sm">Belum ada data sensor masuk.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(35,48,29,0.1)" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                  {/* Sumbu kiri: Suhu (°C), Kelembaban (%), Tanah (%) — semua range 0-100an */}
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} domain={[0, 100]} />
                  {/* Sumbu kanan: Cahaya (lux) — range 0-10000, dipisah biar gak "menenggelamkan" garis lain */}
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 10000]} />
                  <Tooltip />
                  <Line yAxisId="left" type="monotone" dataKey="Suhu" stroke="#A6472F" dot={false} strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="Kelembaban" stroke="#3E6E85" dot={false} strokeWidth={2} />
                  <Line yAxisId="left" type="monotone" dataKey="Tanah" stroke="#3F6B3D" dot={false} strokeWidth={2} />
                  <Line yAxisId="right" type="monotone" dataKey="Cahaya" stroke="#B8862E" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </section>
        </>
      )}
    </div>
  );
}
