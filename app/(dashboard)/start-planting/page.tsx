import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import RegenerateKeyButton from "@/components/RegenerateKeyButton";

export const dynamic = "force-dynamic";

export default async function StartPlantingPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string })?.id;
  const device = userId ? await prisma.device.findFirst({ where: { userId } }) : null;

  return (
    <div className="max-w-3xl">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold">Mulai Tanam</h1>
        <p className="text-ink/60 text-sm mt-1">
          Hubungkan ESP32 kamu ke akun ini supaya data sensor otomatis masuk ke dashboard.
        </p>
      </header>

      <section className="seed-card p-6 mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">1. Kunci Perangkat (Device Key)</h2>
        <p className="text-sm text-ink/70 mb-3">
          Kunci ini dipakai firmware ESP32 untuk mengirim data ke server tanpa perlu login.
          Jangan bagikan ke orang lain.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <code className="bg-ink/5 border border-ink/15 rounded-lg px-3 py-2 font-mono text-sm break-all">
            {device?.deviceKey ?? "Belum ada perangkat"}
          </code>
          {device && <RegenerateKeyButton deviceId={device.id} />}
        </div>
      </section>

      <section className="seed-card p-6 mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">2. Endpoint API</h2>
        <p className="text-sm text-ink/70 mb-2">Firmware ESP32 mengirim data sensor lewat HTTP POST:</p>
        <pre className="bg-ink text-canvas text-xs rounded-lg p-4 overflow-x-auto font-mono">
{`POST https://<domain-kamu>/api/sensor
Content-Type: application/json

{
  "deviceKey": "${device?.deviceKey ?? "<device-key>"}",
  "suhu": 27.5,
  "kelembaban": 68,
  "tanah": 45,
  "tanahRaw": 2310,
  "cahaya": 320,
  "ssid": "NamaWiFiKamu",
  "ipAddress": "192.168.1.50"
}`}
        </pre>
      </section>

      <section className="seed-card p-6">
        <h2 className="font-display text-lg font-semibold mb-3">3. Contoh Kode ESP32 (Arduino)</h2>
        <pre className="bg-ink text-canvas text-xs rounded-lg p-4 overflow-x-auto font-mono">
{`#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "NamaWiFiKamu";
const char* password = "PasswordWiFi";
const char* endpoint = "https://<domain-kamu>/api/sensor";
const char* deviceKey = "${device?.deviceKey ?? "<device-key>"}";

void kirimData(float suhu, float kelembaban, float tanah, int tanahRaw, float cahaya) {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");

  String payload = "{";
  payload += "\\"deviceKey\\":\\"" + String(deviceKey) + "\\",";
  payload += "\\"suhu\\":" + String(suhu) + ",";
  payload += "\\"kelembaban\\":" + String(kelembaban) + ",";
  payload += "\\"tanah\\":" + String(tanah) + ",";
  payload += "\\"tanahRaw\\":" + String(tanahRaw) + ",";
  payload += "\\"cahaya\\":" + String(cahaya);
  payload += "}";

  int code = http.POST(payload);
  Serial.printf("Kirim data, status: %d\\n", code);
  http.end();
}`}
        </pre>
        <p className="text-xs text-ink/50 mt-3">
          Sesuaikan pembacaan sensor (DHT22, kelembaban tanah, LDR, dsb) dengan wiring ESP32 kamu,
          lalu panggil <code className="font-mono">kirimData(...)</code> tiap beberapa detik di{" "}
          <code className="font-mono">loop()</code>.
        </p>
      </section>
    </div>
  );
}
