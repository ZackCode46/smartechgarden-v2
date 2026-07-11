"use client";

import { useRef, useState } from "react";
import { useSession } from "next-auth/react";

type Initial = {
  name: string;
  email: string;
  bio: string;
  location: string;
  phone: string;
  image: string | null;
};

const MAX_DIMENSION = 320; // px, sisi terpanjang avatar setelah diresize
const JPEG_QUALITY = 0.82;

export default function ProfileForm({ initial }: { initial: Initial }) {
  const { update: updateSession } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    name: initial.name,
    bio: initial.bio,
    location: initial.location,
    phone: initial.phone,
  });
  const [avatar, setAvatar] = useState<string | null>(initial.image);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  async function handleAvatarSelect(file: File | null) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar (JPEG/PNG/WebP).");
      return;
    }

    setAvatarLoading(true);
    try {
      const resized = await resizeImageToDataUrl(file, MAX_DIMENSION, JPEG_QUALITY);
      setAvatar(resized);

      // Simpan langsung begitu dipilih, biar gak nunggu tombol "Simpan" terpisah
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, image: resized }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Gagal mengunggah foto");
      } else {
        await updateSession({ image: resized });
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setError("Gagal memproses gambar. Coba file lain.");
    } finally {
      setAvatarLoading(false);
    }
  }

  function handleRemoveAvatar() {
    setAvatar(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    setError(null);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        bio: form.bio,
        location: form.location,
        phone: form.phone,
        image: avatar ?? "",
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Gagal menyimpan");
      return;
    }
    await updateSession({ name: form.name, image: avatar });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const initials = (form.name || initial.email)
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <form onSubmit={handleSubmit} className="seed-card p-6 space-y-5">
      {/* ===== Avatar ===== */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 rounded-full overflow-hidden bg-moss/15 border-2 border-brass/40 flex items-center justify-center shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="Foto profil" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-2xl text-moss-deep font-semibold">{initials}</span>
            )}
          </div>
          {avatarLoading && (
            <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
              <span className="text-white text-[10px]">...</span>
            </div>
          )}
        </div>

        <div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-medium border border-ink/15 hover:bg-ink/5 rounded-lg px-3 py-2"
            >
              📷 Ganti Foto
            </button>
            {avatar && (
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="text-xs font-medium text-clay hover:bg-clay/10 rounded-lg px-3 py-2"
              >
                Hapus
              </button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleAvatarSelect(e.target.files?.[0] ?? null)}
          />
          <p className="text-[11px] text-ink/40 mt-1.5">JPG/PNG/WebP, otomatis dikompres.</p>
        </div>
      </div>

      <Field label="Nama">
        <input
          className="input-field"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </Field>
      <Field label="Email">
        <input className="input-field opacity-60" value={initial.email} disabled />
      </Field>
      <Field label="Bio">
        <textarea
          className="input-field"
          rows={3}
          value={form.bio}
          onChange={(e) => setForm({ ...form, bio: e.target.value })}
          placeholder="Ceritakan sedikit tentang kebun kamu…"
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Lokasi">
          <input
            className="input-field"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Depok, Jawa Barat"
          />
        </Field>
        <Field label="No. HP">
          <input
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="08xxxxxxxxxx"
          />
        </Field>
      </div>

      {error && <p className="text-sm text-clay">{error}</p>}
      {saved && <p className="text-sm text-moss-deep">✓ Perubahan disimpan.</p>}

      <button
        type="submit"
        disabled={loading}
        className="bg-moss hover:bg-moss-deep transition-colors text-canvas font-medium rounded-lg px-5 py-2.5 disabled:opacity-60"
      >
        {loading ? "Menyimpan…" : "Simpan Perubahan"}
      </button>
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

/** Resize gambar di kanvas browser supaya avatar tidak menyimpan file mentah yang besar. */
function resizeImageToDataUrl(file: File, maxDim: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas tidak didukung"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
