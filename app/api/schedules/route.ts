import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { hour, minute, durationSec } = await req.json();

    if (hour == null || minute == null || durationSec == null) {
      return NextResponse.json({ error: "Data jadwal tidak lengkap" }, { status: 400 });
    }
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59 || durationSec <= 0) {
      return NextResponse.json({ error: "Jam/menit/durasi tidak valid" }, { status: 400 });
    }

    const device = await prisma.device.findFirst({ where: { userId: session.user.id } });
    if (!device) {
      return NextResponse.json({ error: "Device tidak ditemukan" }, { status: 404 });
    }

    const count = await prisma.wateringSchedule.count({ where: { deviceId: device.id } });
    if (count >= 10) {
      return NextResponse.json({ error: "Maksimal 10 jadwal per alat" }, { status: 400 });
    }

    const schedule = await prisma.wateringSchedule.create({
      data: { deviceId: device.id, hour, minute, durationSec, enabled: true },
    });

    return NextResponse.json({ ok: true, schedule }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/schedules]", err);
    return NextResponse.json({ error: "Gagal menambah jadwal" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const device = await prisma.device.findFirst({ where: { userId: session.user.id } });
  if (!device) {
    return NextResponse.json({ schedules: [] });
  }

  const schedules = await prisma.wateringSchedule.findMany({
    where: { deviceId: device.id },
    orderBy: { hour: "asc" },
  });
  return NextResponse.json({ schedules });
}
