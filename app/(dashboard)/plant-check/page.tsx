"use client";

import { useState } from "react";

type Finding = {
  kode: string;
  label: string;
  tingkat: "ringan" | "sedang" | "berat";
  deskripsi: string;
};

type SpotAnalysis = {
  jumlah: number;
  totalAreaRatio: number;
  terbesarRatio: number;
  pola: string;
};

type ZonalAnalysis = {
  tepiRasakRusak: number;
  tengahRasakRusak: number;
  pola: string;
};

type Analysis = {
  healthScore: number;
  healthLabel: string;
  ripenessScore: number | null;
  ripenessLabel: string | null;
  greenRatio: number;
  yellowRatio: number;
  brownRatio: number;
  spots: SpotAnalysis;
  zonal: ZonalAnalysis;
  findings: Finding[];
  confidence: number;
  notes: string;
};

const ZONAL_LABEL: Record<string, string> = {
  merata: "Merata di seluruh permukaan",
  dominan_tepi: "Lebih parah di bagian tepi",
  dominan_tengah: "Lebih parah di bagian tengah",
};

const SPOT_POLA_LABEL: Record<string, string> = {
  tidak_ada: "Tidak ada bercak terdeteksi",
  beberapa_titik_kecil: "Beberapa titik kecil (kemungkinan goresan/kerusakan lokal)",
  menyebar: "Tersebar merata (pola khas infeksi jamur/bakteri)",
  menyatu_luas: "Area besar yang menyatu",
};

const TINGKAT_STYLE: Record<Finding["tingkat"], string> = {
  ringan: "bg-moss/10 text-moss-deep border-moss/30",
  sedang: "bg-brass/10 text-brass border-brass/40",
  berat: "bg-clay/10 text-clay border-clay/30",
};

export default function PlantCheckPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [kind, setKind] = useState<"daun" | "buah">("daun");
  const [species, setSpecies] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [speciesMatch, setSpeciesMatch] = useState<{ nama: string } | null>(null);
  const [envComparison, setEnvComparison] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handleFile(f: File | null) {
    setFile(f);
    setAnalysis(null);
    setError(null);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);

    const form = new FormData();
    form.append("image", file);
    form.append("kind", kind);
    if (species) form.append("species", species);

    try {
      const res = await fetch("/api/plant-check", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal menganalisis gambar");
      } else {
        setAnalysis(data.analysis);
        setSpeciesMatch(data.speciesMatch ?? null);
        setEnvComparison(data.envComparison ?? null);
      }
    } catch {
      setError("Tidak bisa terhubung ke server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold">Cek Kesehatan Tanaman</h1>
        <p className="text-ink/60 text-sm mt-1">
          Unggah foto daun atau buah — dianalisis pakai OpenCV: rasio warna, deteksi
          bercak, dan pola sebaran kerusakan (tepi vs tengah) buat nebak kemungkinan
          penyebabnya.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="seed-card p-6 mb-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs uppercase tracking-wide text-ink/60 font-medium mb-2">
              Foto Tanaman
            </label>
            <div className="border-2 border-dashed border-ink/20 rounded-lg aspect-square flex items-center justify-center overflow-hidden bg-white/50">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Pratinjau" className="object-cover w-full h-full" />
              ) : (
                <span className="text-ink/40 text-sm">Belum ada foto</span>
              )}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="mt-3 text-sm"
              required
            />
            <p className="text-[11px] text-ink/40 mt-1.5">
              Tips: foto dari jarak dekat, latar polos (meja/kertas putih), pencahayaan cukup.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-ink/60 font-medium mb-2">
                Jenis Objek
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setKind("daun")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                    kind === "daun" ? "bg-moss text-canvas border-moss" : "border-ink/15"
                  }`}
                >
                  🍃 Daun
                </button>
                <button
                  type="button"
                  onClick={() => setKind("buah")}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                    kind === "buah" ? "bg-moss text-canvas border-moss" : "border-ink/15"
                  }`}
                >
                  🍅 Buah
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wide text-ink/60 font-medium mb-2">
                Nama Spesies (opsional)
              </label>
              <input
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="Misal: Tomat, Monstera…"
                className="input-field"
              />
              <p className="text-[11px] text-ink/40 mt-1.5">
                Kalau namanya cocok dengan katalog e-book, hasilnya dibandingkan dengan
                data sensor kebun kamu saat ini.
              </p>
            </div>

            <button
              type="submit"
              disabled={!file || loading}
              className="w-full bg-moss hover:bg-moss-deep transition-colors text-canvas font-medium rounded-lg py-2.5 disabled:opacity-50"
            >
              {loading ? "Menganalisis…" : "Analisis Sekarang"}
            </button>

            {error && (
              <div className="text-sm bg-clay/10 text-clay border border-clay/30 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>
        </div>
      </form>

      {analysis && (
        <div className="space-y-4">
          {/* Ringkasan skor */}
          <div className="seed-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-semibold">Hasil Analisis</h2>
              <span className="text-[11px] font-mono text-ink/40">
                keyakinan segmentasi: {Math.round(analysis.confidence * 100)}%
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
              <Stat label="Skor Kesehatan" value={`${analysis.healthScore}`} sub={analysis.healthLabel} />
              {analysis.ripenessScore !== null && (
                <Stat
                  label="Skor Kematangan"
                  value={`${analysis.ripenessScore}`}
                  sub={analysis.ripenessLabel ?? ""}
                />
              )}
              <Stat label="Rasio Hijau" value={`${Math.round(analysis.greenRatio * 100)}%`} />
              <Stat label="Rasio Kuning" value={`${Math.round(analysis.yellowRatio * 100)}%`} />
              <Stat label="Rasio Coklat" value={`${Math.round(analysis.brownRatio * 100)}%`} />
            </div>
          </div>

          {/* Temuan detail */}
          <div className="seed-card p-6">
            <h2 className="font-display text-lg font-semibold mb-3">🔎 Temuan Detail</h2>
            <div className="space-y-2.5">
              {analysis.findings.map((f) => (
                <div key={f.kode} className={`border rounded-lg p-3 ${TINGKAT_STYLE[f.tingkat]}`}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <p className="font-medium text-sm">{f.label}</p>
                    <span className="text-[10px] uppercase tracking-wide font-semibold shrink-0">
                      {f.tingkat}
                    </span>
                  </div>
                  <p className="text-sm opacity-90">{f.deskripsi}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Deteksi bercak & pola zonal */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="seed-card p-5">
              <h3 className="font-display font-semibold mb-2">🔬 Deteksi Bercak</h3>
              <dl className="text-sm space-y-1.5">
                <Row label="Jumlah bercak" value={`${analysis.spots.jumlah}`} />
                <Row label="Total luas tertutup" value={`${Math.round(analysis.spots.totalAreaRatio * 100)}%`} />
                <Row label="Bercak terbesar" value={`${Math.round(analysis.spots.terbesarRatio * 100)}%`} />
                <Row label="Pola" value={SPOT_POLA_LABEL[analysis.spots.pola] ?? analysis.spots.pola} />
              </dl>
            </div>
            <div className="seed-card p-5">
              <h3 className="font-display font-semibold mb-2">📍 Analisis Zonal</h3>
              <dl className="text-sm space-y-1.5">
                <Row label="Kerusakan di tepi" value={`${Math.round(analysis.zonal.tepiRasakRusak * 100)}%`} />
                <Row label="Kerusakan di tengah" value={`${Math.round(analysis.zonal.tengahRasakRusak * 100)}%`} />
                <Row label="Pola sebaran" value={ZONAL_LABEL[analysis.zonal.pola] ?? analysis.zonal.pola} />
              </dl>
            </div>
          </div>

          {/* Perbandingan lingkungan (kalau spesies cocok + ada data sensor) */}
          {speciesMatch && envComparison && (
            <div className="bg-rain/10 border border-rain/30 rounded-lg p-4 text-sm">
              <p className="font-medium mb-1">🌡️ Dibandingkan Kondisi Sensor Kebun ({speciesMatch.nama})</p>
              <p className="text-ink/80">{envComparison}</p>
            </div>
          )}

          <div className="bg-brass/10 border border-brass/30 rounded-lg p-4 text-sm">
            <p className="font-medium mb-1">📋 Ringkasan</p>
            <p className="text-ink/80">{analysis.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white/60 rounded-lg p-3 border border-ink/10">
      <p className="text-[10px] uppercase tracking-wide text-ink/50 font-medium">{label}</p>
      <p className="font-mono text-xl font-semibold mt-0.5">{value}</p>
      {sub && <p className="text-xs text-moss-deep font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-ink/50">{label}</dt>
      <dd className="font-medium text-right">{value}</dd>
    </div>
  );
}
