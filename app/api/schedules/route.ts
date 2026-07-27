import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST — tombol "+ Tambah Jadwal"
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { deviceId, hour, minute, durationSec } = await req.json();

    if (!deviceId || hour == null || minute == null || durationSec == null) {
      return NextResponse.json({ error: "Data jadwal tidak lengkap" }, { status: 400 });
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || durationSec <= 0) {
      return NextResponse.json({ error: "Jam/menit/durasi tidak valid" }, { status: 400 });
    }

    const device = await prisma.device.findUnique({ where: { id: deviceId } });
    if (!device || device.userId !== session.user.id) {
      return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
    }

    const schedule = await prisma.schedule.create({
      data: { deviceId, hour, minute, durationSec, enabled: true },
    });

    return NextResponse.json({ ok: true, schedule }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/schedule]", err);
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 });
  }
}

// GET — list jadwal punya satu device (buat dashboard refresh)
export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId wajib diisi" }, { status: 400 });
  }
  const schedules = await prisma.schedule.findMany({
    where: { deviceId },
    orderBy: { hour: "asc" },
  });
  return NextResponse.json({ schedules });
}
