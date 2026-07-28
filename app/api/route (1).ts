import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PLANT_CHECK_SERVICE_URL =
  process.env.PLANT_CHECK_SERVICE_URL ?? "http://localhost:8001";

// ===== Upload foto -> teruskan ke FastAPI (OpenCV) -> simpan hasil ke Postgres =====
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const incoming = await req.formData();
  const image = incoming.get("image");
  const kind = (incoming.get("kind") as string) ?? "daun";
  const species = incoming.get("species") as string | null;

  if (!image || !(image instanceof File)) {
    return NextResponse.json({ error: "Gambar tidak ditemukan" }, { status: 400 });
  }

  const forwardForm = new FormData();
  forwardForm.append("image", image);
  forwardForm.append("kind", kind);
  if (species) forwardForm.append("species", species);

  let analysis;
  try {
    const serviceRes = await fetch(`${PLANT_CHECK_SERVICE_URL}/analyze`, {
      method: "POST",
      body: forwardForm,
    });

    if (!serviceRes.ok) {
      const errBody = await serviceRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errBody.detail ?? "Layanan analisis gagal memproses gambar" },
        { status: 502 }
      );
    }
    analysis = await serviceRes.json();
  } catch (err) {
    console.error("Plant-check service unreachable:", err);
    return NextResponse.json(
      {
        error:
          "Layanan pemeriksaan tanaman (Python) tidak bisa dihubungi. Pastikan service FastAPI sedang berjalan.",
      },
      { status: 503 }
    );
  }

  // Catatan: penyimpanan foto asli (imageUrl) sebaiknya pakai object storage
  // (mis. Vercel Blob/S3). Untuk versi ini kita simpan hasil analisisnya saja.

  // ===== Perkaya hasil: cocokkan nama spesies ke katalog e-book, lalu
  // bandingkan kondisi ideal spesies itu dengan pembacaan sensor terakhir
  // dari device user (kalau ada) =====
  let speciesMatch = null as null | { id: string; nama: string };
  let envComparison: string | null = null;
  let matchedDeviceId: string | null = null;

  if (species && species.trim().length > 0) {
    const matched = await prisma.plantSpecies.findFirst({
      where: {
        OR: [
          { nama: { contains: species.trim(), mode: "insensitive" } },
          { namaLatin: { contains: species.trim(), mode: "insensitive" } },
        ],
      },
    });

    if (matched) {
      speciesMatch = { id: matched.id, nama: matched.nama };

      const device = await prisma.device.findFirst({ where: { userId } });
      matchedDeviceId = device?.id ?? null;
      const latestReading = device
        ? await prisma.sensorReading.findFirst({
            where: { deviceId: device.id },
            orderBy: { recordedAt: "desc" },
          })
        : null;

      if (latestReading) {
        const notesParts: string[] = [];
        if (matched.suhuMin != null && matched.suhuMax != null) {
          if (latestReading.suhu > matched.suhuMax) {
            notesParts.push(
              `Suhu lingkungan saat ini ${latestReading.suhu}°C, di atas rentang ideal ${matched.nama} (${matched.suhuMin}-${matched.suhuMax}°C) — kemungkinan berkontribusi pada stres panas.`
            );
          } else if (latestReading.suhu < matched.suhuMin) {
            notesParts.push(
              `Suhu lingkungan saat ini ${latestReading.suhu}°C, di bawah rentang ideal ${matched.nama} (${matched.suhuMin}-${matched.suhuMax}°C).`
            );
          }
        }
        if (matched.kelembabanMin != null && matched.kelembabanMax != null) {
          if (latestReading.kelembaban < matched.kelembabanMin) {
            notesParts.push(
              `Kelembaban udara saat ini ${latestReading.kelembaban}%, di bawah ideal ${matched.nama} (${matched.kelembabanMin}-${matched.kelembabanMax}%).`
            );
          }
        }
        envComparison =
          notesParts.length > 0
            ? notesParts.join(" ")
            : `Kondisi lingkungan saat ini masih dalam rentang wajar untuk ${matched.nama}.`;
      }
    }
  }

  const saved = await prisma.plantCheck.create({
    data: {
      userId,
      deviceId: matchedDeviceId,
      speciesId: speciesMatch?.id ?? null,
      imageUrl: "",
      healthScore: analysis.healthScore,
      healthLabel: analysis.healthLabel,
      ripenessScore: analysis.ripenessScore ?? null,
      ripenessLabel: analysis.ripenessLabel ?? null,
      greenRatio: analysis.greenRatio,
      yellowRatio: analysis.yellowRatio,
      brownRatio: analysis.brownRatio,
      notes: analysis.notes,
      rawAnalysis: analysis,
    },
  });

  return NextResponse.json({ result: saved, analysis, speciesMatch, envComparison });
}

// ===== Riwayat pemeriksaan tanaman milik user =====
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as { id: string }).id;

  const checks = await prisma.plantCheck.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ checks });
}
