"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

const LINKS = [
  { href: "/dashboard", label: "Dasbor", icon: "🌡️" },
  { href: "/start-planting", label: "Mulai Tanam", icon: "🌱" },
  { href: "/plant-check", label: "Cek Tanaman", icon: "🔍" },
  { href: "/history", label: "Riwayat", icon: "📜" },
  { href: "/e-book", label: "E-book", icon: "📖" },
  { href: "/profile", label: "Profil", icon: "👤" },
  { href: "/settings", label: "Pengaturan", icon: "⚙️" },
];

const ADMIN_LINK = { href: "/admin", label: "Admin", icon: "🛠️" };

export default function NavRail() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const displayName = session?.user?.name ?? session?.user?.email ?? "Petani";
  const role = (session?.user as { role?: string } | undefined)?.role;
  const links = role === "ADMIN" ? [...LINKS, ADMIN_LINK] : LINKS;
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <nav className="md:w-60 bg-moss-deep text-canvas md:min-h-screen flex md:flex-col">
      <div className="px-5 py-6 hidden md:block">
        <p className="font-display text-xl font-semibold leading-tight">🌿 Smartech<br />Garden</p>
        <p className="text-canvas/50 text-xs mt-1 italic font-display">Buku kebun digital</p>
      </div>

      <ul className="flex md:flex-col overflow-x-auto md:overflow-visible md:gap-1 md:px-3 md:py-2 flex-1">
        {links.map((link) => {
          const active = pathname === link.href;
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                className={`stake-tab flex items-center gap-2 px-4 md:px-4 py-3 md:py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-brass text-moss-deep"
                    : "text-canvas/80 hover:bg-canvas/10"
                }`}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden md:block px-5 py-5 border-t border-canvas/10">
        <Link href="/profile" className="flex items-center gap-2.5 mb-3 group">
          <div className="h-9 w-9 rounded-full overflow-hidden bg-canvas/15 border border-brass/40 flex items-center justify-center shrink-0">
            {session?.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.user.image} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-semibold">{initials}</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate group-hover:underline">{displayName}</p>
            <p className="text-[11px] text-canvas/50 truncate">Lihat profil</p>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full text-left text-sm text-canvas/70 hover:text-canvas flex items-center gap-2"
        >
          🚪 Keluar
        </button>
      </div>
    </nav>
  );
}
