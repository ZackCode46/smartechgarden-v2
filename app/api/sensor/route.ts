import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const readingSchema = z.object({
  deviceKey: z.string().min(1),
  suhu: z.number(),
  kelembaban: z.number(),
  tanah: z.number(),
  tanahRaw: z.number().optional(),
  cahaya: z.number(),
  ssid: z.string().optional(),
  ipAddress: z.string().optional(),
});

// ===== ESP32 → server: kirim data sensor =====
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = readingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload tidak valid" }, { status: 400 });
    }
    const { deviceKey, suhu, kelembaban, tanah, tanahRaw, cahaya, ssid, ipAddress } = parsed.data;

    const device = await prisma.device.findUnique({ where: { deviceKey } });
    if (!device) {
      return NextResponse.json({ error: "Device key tidak dikenali" }, { status: 401 });
    }

    const pumpActive = device.mode === "AUTO" ? tanah < 30 : device.pumpState;

    const [reading] = await prisma.$transaction([
      prisma.sensorReading.create({
        data: { deviceId: device.id, suhu, kelembaban, tanah, tanahRaw, cahaya, pumpActive },
      }),
      prisma.device.update({
        where: { id: device.id },
        data: {
          isOnline: true,
          lastSeenAt: new Date(),
          ssid: ssid ?? device.ssid,
          ipAddress: ipAddress ?? device.ipAddress,
          pumpState: device.mode === "AUTO" ? pumpActive : device.pumpState,
        },
      }),
    ]);

    // Notifikasi kondisi ekstrem — hanya dilihat lewat panel notifikasi user, bukan spam tiap request
    if (tanah < 20 || suhu > 38) {
      await prisma.notification.create({
        data: {
          userId: device.userId,
          type: tanah < 20 ? "dry_soil" : "high_temp",
          title: tanah < 20 ? "Tanah sangat kering" : "Suhu tinggi terdeteksi",
          message:
            tanah < 20
              ? `Kelembaban tanah ${tanah}% — pertimbangkan penyiraman segera.`
              : `Suhu terdeteksi ${suhu}°C — pastikan ventilasi/naungan memadai.`,
        },
      });
    }

    return NextResponse.json({ ok: true, pumpActive, reading }, { status: 201 });
  } catch (err) {
    console.error("Sensor POST error:", err);
    return NextResponse.json({ error: "Terjadi kesalahan pada server" }, { status: 500 });
  }
}

// ===== Dashboard → server: ambil data terbaru + history singkat =====
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as { id: string }).id;
  const device = await prisma.device.findFirst({ where: { userId } });

  if (!device) {
    return NextResponse.json({ device: null, latest: null, history: [] });
  }

  const history = await prisma.sensorReading.findMany({
    where: { deviceId: device.id },
    orderBy: { recordedAt: "desc" },
    take: 20,
  });

  // isOnline dihitung dari lastSeenAt, bukan dipercaya dari kolom statis di DB —
  // ESP32 upload tiap 10-30 detik, kalau lebih dari 60 detik gak ada kabar,
  // anggap offline (kabel lepas, WiFi mati, dsb), meski dulu pernah online.
  const ONLINE_THRESHOLD_MS = 60_000;
  const isOnline = device.lastSeenAt
    ? Date.now() - new Date(device.lastSeenAt).getTime() < ONLINE_THRESHOLD_MS
    : false;

  return NextResponse.json({
    device: { ...device, isOnline },
    latest: history[0] ?? null,
    history: history.reverse(),
  });
}
