import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const schedule = await prisma.wateringSchedule.findUnique({
      where: { id: params.id },
      include: { device: true },
    });
    if (!schedule || schedule.device.userId !== session.user.id) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
    }

    await prisma.wateringSchedule.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/schedules/:id]", err);
    return NextResponse.json({ error: "Gagal menghapus jadwal" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { enabled } = await req.json();
    const schedule = await prisma.wateringSchedule.findUnique({
      where: { id: params.id },
      include: { device: true },
    });
    if (!schedule || schedule.device.userId !== session.user.id) {
      return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.wateringSchedule.update({
      where: { id: params.id },
      data: { enabled },
    });
    return NextResponse.json({ ok: true, schedule: updated });
  } catch (err) {
    console.error("[PATCH /api/schedules/:id]", err);
    return NextResponse.json({ error: "Gagal update jadwal" }, { status: 500 });
  }
}
