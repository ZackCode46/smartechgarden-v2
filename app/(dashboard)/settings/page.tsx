"use client";

import { useEffect, useState } from "react";

type Settings = {
  tempUnit: string;
  notifyDrySoil: boolean;
  notifyHighTemp: boolean;
  notifyLowLight: boolean;
  dryThreshold: number;
  highTempThreshold: number;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings))
      .finally(() => setLoading(false));
  }, []);

  async function save(patch: Partial<Settings>) {
    if (!settings) return;
    const updated = { ...settings, ...patch };
    setSettings(updated);
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading || !settings) {
    return <p className="text-ink/50">Memuat pengaturan…</p>;
  }

  return (
    <div className="max-w-2xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Pengaturan</h1>
        <p className="text-ink/60 text-sm mt-1">Atur ambang batas notifikasi dan preferensi tampilan.</p>
      </header>

      <section className="seed-card p-6 mb-6">
        <h2 className="font-display text-lg font-semibold mb-4">🔔 Notifikasi</h2>

        <ToggleRow
          label="Tanah kering"
          checked={settings.notifyDrySoil}
          onChange={(v) => save({ notifyDrySoil: v })}
        >
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-ink/50">Ambang:</span>
            <input
              type="number"
              value={settings.dryThreshold}
              onChange={(e) => save({ dryThreshold: Number(e.target.value) })}
              className="input-field w-20 py-1"
            />
            <span className="text-xs text-ink/50">% kelembaban tanah</span>
          </div>
        </ToggleRow>

        <ToggleRow
          label="Suhu tinggi"
          checked={settings.notifyHighTemp}
          onChange={(v) => save({ notifyHighTemp: v })}
        >
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-ink/50">Ambang:</span>
            <input
              type="number"
              value={settings.highTempThreshold}
              onChange={(e) => save({ highTempThreshold: Number(e.target.value) })}
              className="input-field w-20 py-1"
            />
            <span className="text-xs text-ink/50">°C</span>
          </div>
        </ToggleRow>

        <ToggleRow
          label="Cahaya rendah"
          checked={settings.notifyLowLight}
          onChange={(v) => save({ notifyLowLight: v })}
        />
      </section>

      <section className="seed-card p-6">
        <h2 className="font-display text-lg font-semibold mb-4">🌡️ Satuan Suhu</h2>
        <div className="flex gap-2">
          <button
            onClick={() => save({ tempUnit: "celsius" })}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              settings.tempUnit === "celsius" ? "bg-moss text-canvas border-moss" : "border-ink/15"
            }`}
          >
            Celsius (°C)
          </button>
          <button
            onClick={() => save({ tempUnit: "fahrenheit" })}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              settings.tempUnit === "fahrenheit" ? "bg-moss text-canvas border-moss" : "border-ink/15"
            }`}
          >
            Fahrenheit (°F)
          </button>
        </div>
      </section>

      {saved && <p className="text-sm text-moss-deep mt-4">✓ Tersimpan otomatis.</p>}
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  children,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="py-3 border-b border-ink/10 last:border-0">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`shrink-0 w-11 h-6 rounded-full relative transition-colors duration-200 ${
            checked ? "bg-moss" : "bg-ink/20"
          }`}
        >
          <span
            className="absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform duration-200"
            style={{ transform: checked ? "translateX(20px)" : "translateX(0)" }}
          />
        </button>
      </div>
      {checked && children}
    </div>
  );
}
