"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DeletePlantButton({ id, nama }: { id: string; nama: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Hapus "${nama}" dari katalog e-book? Tindakan ini tidak bisa dibatalkan.`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/plants/${id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      alert("Gagal menghapus. Coba lagi.");
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="text-xs font-medium text-clay border border-clay/30 hover:bg-clay/10 rounded-lg px-3 py-1.5"
    >
      {loading ? "…" : "🗑️ Hapus"}
    </button>
  );
}
