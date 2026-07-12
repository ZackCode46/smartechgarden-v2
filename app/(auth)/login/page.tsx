"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "Email ini sudah terdaftar lewat cara login lain. Coba masuk pakai email & kata sandi, atau hubungi admin.",
  OAuthSignin: "Gagal memulai proses login. Coba lagi beberapa saat.",
  OAuthCallback: "Gagal memproses respons dari penyedia login (Google/Facebook). Coba lagi.",
  AccessDenied: "Akses ditolak oleh penyedia login.",
  Configuration: "Konfigurasi login bermasalah. Hubungi admin.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const oauthError = searchParams.get("error");
    if (oauthError) {
      setError(OAUTH_ERROR_MESSAGES[oauthError] ?? `Gagal login (${oauthError}). Coba lagi.`);
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Email atau kata sandi salah. Coba lagi.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="inline-block text-3xl">🌱</span>
          <h1 className="font-display text-3xl font-semibold text-moss-deep mt-2">
            Smartech Garden
          </h1>
          <p className="text-ink/60 text-sm mt-1 italic font-display">
            "Buku catatan kebun digital Anda"
          </p>
        </div>

        <div className="seed-card p-7">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold">Masuk Kebun</h2>
            <span className="text-[10px] uppercase tracking-widest bg-moss/10 text-moss-deep px-2 py-1 rounded-full font-medium">
              Log Masuk
            </span>
          </div>

          {error && (
            <div className="mb-4 text-sm bg-clay/10 text-clay border border-clay/30 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-moss hover:bg-moss-deep transition-colors text-canvas font-medium rounded-lg py-2.5 disabled:opacity-60"
            >
              {loading ? "Memeriksa…" : "Masuk"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px flex-1 bg-ink/10" />
            <span className="text-xs text-ink/40">atau</span>
            <div className="h-px flex-1 bg-ink/10" />
          </div>

          <div className="space-y-2.5">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full border border-ink/15 hover:bg-ink/5 transition-colors rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2"
            >
              🔵 Lanjutkan dengan Google
            </button>
            <button
              onClick={() => signIn("facebook", { callbackUrl: "/dashboard" })}
              className="w-full border border-ink/15 hover:bg-ink/5 transition-colors rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2"
            >
              🔷 Lanjutkan dengan Facebook
            </button>
          </div>

          <p className="text-center text-sm text-ink/60 mt-6">
            Belum punya akun?{" "}
            <Link href="/register" className="text-moss-deep font-medium underline underline-offset-2">
              Daftar dulu
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
