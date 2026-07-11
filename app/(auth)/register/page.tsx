"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Pendaftaran gagal");
      setLoading(false);
      return;
    }

    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);

    if (signInRes?.error) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="inline-block text-3xl">🌿</span>
          <h1 className="font-display text-3xl font-semibold text-moss-deep mt-2">
            Tanam Akun Baru
          </h1>
          <p className="text-ink/60 text-sm mt-1 italic font-display">
            "Setiap kebun besar dimulai dari satu benih"
          </p>
        </div>

        <div className="seed-card p-7">
          {error && (
            <div className="mb-4 text-sm bg-clay/10 text-clay border border-clay/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nama Lengkap">
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                placeholder="Nama kamu"
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="nama@email.com"
              />
            </Field>
            <Field label="Kata Sandi">
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Minimal 8 karakter"
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-moss hover:bg-moss-deep transition-colors text-canvas font-medium rounded-lg py-2.5 disabled:opacity-60"
            >
              {loading ? "Menanam…" : "Daftar"}
            </button>
          </form>

          <p className="text-center text-sm text-ink/60 mt-6">
            Sudah punya akun?{" "}
            <Link href="/login" className="text-moss-deep font-medium underline underline-offset-2">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </main>
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
