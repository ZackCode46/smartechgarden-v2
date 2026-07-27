import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET — dipanggil FIRMWARE tiap 5 detik (bukan dashboard, jadi tanpa session)
export async function GET(req: NextRequest) {
  const deviceKey = req.nextUrl.searchParams.get("deviceKey");
  if (!deviceKey) {
    return NextResponse.json({ error: "deviceKey wajib diisi" }, { status: 400 });
  }

  try {
    const device = await prisma.device.findUnique({
      where: { deviceKey },
      include: {
        schedules: { where: { enabled: true }, orderBy: { hour: "asc" } },
      },
    });

    if (!device) {
      return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
    }

    await prisma.device.update({
      where: { id: device.id },
      data: { isOnline: true, lastSeenAt: new Date() },
    });

    return NextResponse.json({
      mode: device.mode,
      pumpState: device.pumpState,
      schedules: device.schedules.map((s) => ({
        hour: s.hour,
        minute: s.minute,
        durationSec: s.durationSec,
        enabled: s.enabled,
      })),
    });
  } catch (err) {
    console.error("[GET /api/control]", err);
    return NextResponse.json({ error: "Gagal mengambil kontrol" }, { status: 500 });
  }
}

// POST — dipanggil DASHBOARD buat ganti mode / pompa manual
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { deviceId, mode, pumpState } = await req.json();
    if (!deviceId) {
      return NextResponse.json({ error: "deviceId wajib diisi" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device || device.userId !== session.user.id) {
      return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
    }

    const data: { mode?: "AUTO" | "MANUAL"; pumpState?: boolean } = {};
    if (mode === "AUTO" || mode === "MANUAL") data.mode = mode;
    if (typeof pumpState === "boolean") data.pumpState = pumpState;

    const updated = await prisma.device.update({ where: { id: deviceId }, data });

    return NextResponse.json({ ok: true, mode: updated.mode, pumpState: updated.pumpState });
  } catch (err) {
    console.error("[POST /api/control]", err);
    return NextResponse.json({ error: "Gagal update kontrol" }, { status: 500 });
  }
}
