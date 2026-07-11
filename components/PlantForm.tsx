"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PlantFormData = {
  nama: string;
  namaLatin: string;
  jenis: "sayur" | "buah" | "hias" | "rempah";
  gambar: string;
  deskripsi: string;
  perawatan: string;
  suhuMin: string;
  suhuMax: string;
  kelembabanMin: string;
  kelembabanMax: string;
  kebutuhanCahaya: "" | "rendah" | "sedang" | "tinggi";
  masaPanen: string;
};

const EMPTY: PlantFormData = {
  nama: "",
  namaLatin: "",
  jenis: "sayur",
  gambar: "",
  deskripsi: "",
  perawatan: "",
  suhuMin: "",
  suhuMax: "",
  kelembabanMin: "",
  kelembabanMax: "",
  kebutuhanCahaya: "",
  masaPanen: "",
};

export default function PlantForm({
  mode,
  plantId,
  initial,
}: {
  mode: "create" | "edit";
  plantId?: string;
  initial?: Partial<PlantFormData>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PlantFormData>({ ...EMPTY, ...initial });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set<K extends keyof PlantFormData>(key: K, value: PlantFormData[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      nama: form.nama,
      namaLatin: form.namaLatin || null,
      jenis: form.jenis,
      gambar: form.gambar,
      deskripsi: form.deskripsi,
      perawatan: form.perawatan,
      suhuMin: form.suhuMin ? Number(form.suhuMin) : null,
      suhuMax: form.suhuMax ? Number(form.suhuMax) : null,
      kelembabanMin: form.kelembabanMin ? Number(form.kelembabanMin) : null,
      kelembabanMax: form.kelembabanMax ? Number(form.kelembabanMax) : null,
      kebutuhanCahaya: form.kebutuhanCahaya || null,
      masaPanen: form.masaPanen || null,
    };

    const url = mode === "create" ? "/api/admin/plants" : `/api/admin/plants/${plantId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan");
      return;
    }
    router.push("/admin/plants");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="seed-card p-6 space-y-4 max-w-2xl">
      {error && (
        <div className="text-sm bg-clay/10 text-clay border border-clay/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Nama">
          <input
            className="input-field"
            value={form.nama}
            onChange={(e) => set("nama", e.target.value)}
            required
          />
        </Field>
        <Field label="Nama Latin">
          <input
            className="input-field"
            value={form.namaLatin}
            onChange={(e) => set("namaLatin", e.target.value)}
            placeholder="Opsional"
          />
        </Field>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Jenis">
          <select
            className="input-field"
            value={form.jenis}
            onChange={(e) => set("jenis", e.target.value as PlantFormData["jenis"])}
          >
            <option value="sayur">Sayur</option>
            <option value="buah">Buah</option>
            <option value="hias">Hias</option>
            <option value="rempah">Rempah</option>
          </select>
        </Field>
        <Field label="Kebutuhan Cahaya">
          <select
            className="input-field"
            value={form.kebutuhanCahaya}
            onChange={(e) => set("kebutuhanCahaya", e.target.value as PlantFormData["kebutuhanCahaya"])}
          >
            <option value="">- pilih -</option>
            <option value="rendah">Rendah</option>
            <option value="sedang">Sedang</option>
            <option value="tinggi">Tinggi</option>
          </select>
        </Field>
      </div>

      <Field label="URL Gambar">
        <input
          className="input-field"
          value={form.gambar}
          onChange={(e) => set("gambar", e.target.value)}
          placeholder="/plants/nama-file.jpg  atau  https://..."
          required
        />
        <p className="text-[11px] text-ink/40 mt-1">
          Bisa path lokal (taruh file di folder <code className="font-mono">public/plants/</code>) atau
          link gambar langsung dari internet.
        </p>
      </Field>

      {form.gambar && (
        <div className="h-32 w-32 rounded-lg overflow-hidden bg-ink/5 border border-ink/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={form.gambar}
            alt="Pratinjau"
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.opacity = "0.2")}
          />
        </div>
      )}

      <Field label="Deskripsi">
        <textarea
          className="input-field"
          rows={3}
          value={form.deskripsi}
          onChange={(e) => set("deskripsi", e.target.value)}
          required
        />
      </Field>

      <Field label="Perawatan">
        <textarea
          className="input-field"
          rows={3}
          value={form.perawatan}
          onChange={(e) => set("perawatan", e.target.value)}
          required
        />
      </Field>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Suhu Min (°C)">
          <input
            type="number"
            className="input-field"
            value={form.suhuMin}
            onChange={(e) => set("suhuMin", e.target.value)}
          />
        </Field>
        <Field label="Suhu Max (°C)">
          <input
            type="number"
            className="input-field"
            value={form.suhuMax}
            onChange={(e) => set("suhuMax", e.target.value)}
          />
        </Field>
        <Field label="Kelembaban Min (%)">
          <input
            type="number"
            className="input-field"
            value={form.kelembabanMin}
            onChange={(e) => set("kelembabanMin", e.target.value)}
          />
        </Field>
        <Field label="Kelembaban Max (%)">
          <input
            type="number"
            className="input-field"
            value={form.kelembabanMax}
            onChange={(e) => set("kelembabanMax", e.target.value)}
          />
        </Field>
      </div>

      <Field label="Masa Panen">
        <input
          className="input-field"
          value={form.masaPanen}
          onChange={(e) => set("masaPanen", e.target.value)}
          placeholder="Misal: 70-90 hari"
        />
      </Field>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-moss hover:bg-moss-deep transition-colors text-canvas font-medium rounded-lg px-5 py-2.5 disabled:opacity-60"
        >
          {loading ? "Menyimpan…" : mode === "create" ? "Tambah Tanaman" : "Simpan Perubahan"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/plants")}
          className="border border-ink/15 hover:bg-ink/5 rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          Batal
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wide text-ink/60 font-medium">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
