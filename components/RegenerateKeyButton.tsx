"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function RegenerateKeyButton({ deviceId }: { deviceId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    if (!confirm("Kunci lama akan berhenti berfungsi. ESP32 perlu di-update dengan kunci baru. Lanjutkan?")) {
      return;
    }
    setLoading(true);
    await fetch("/api/device/regenerate-key", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="text-xs font-medium border border-ink/15 hover:bg-ink/5 rounded-lg px-3 py-2"
    >
      {loading ? "Memproses…" : "🔄 Buat Kunci Baru"}
    </button>
  );
}
