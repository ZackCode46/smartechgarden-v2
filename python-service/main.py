"""
Smartech Garden — Plant Check Service (v2, detail lengkap)
============================================================
Microservice FastAPI terpisah dari aplikasi Next.js utama, khusus untuk
menganalisis foto tanaman (daun/buah) memakai OpenCV.

Kenapa masih berbasis warna (bukan deep learning)?
Sesuai keputusan bareng: supaya instalasi tetap ringan dan gak butuh
GPU/model besar (~1-2GB), tapi analisisnya dibikin sedalam mungkin lewat
teknik computer vision klasik:

  1. Rasio warna per kategori (hijau/kuning/coklat/merah) — dasar skor.
  2. Deteksi BERCAK (contour detection) — bukan cuma "ada X% kuning", tapi
     berapa bercak, seberapa besar tiap bercak, dan bentuknya gimana.
  3. Analisis ZONAL (tepi vs tengah daun) — pola sebaran kerusakan sering
     jadi petunjuk penyebab: kering dari tepi biasanya kekurangan air/
     kalium, bercak tersebar acak biasanya jamur/bakteri, menguning merata
     biasanya kekurangan nitrogen.
  4. FINDINGS bertingkat — daftar "kemungkinan penyebab" dengan alasan,
     bukan cuma satu skor angka, supaya bisa dikoreksi/dibaca detail.
  5. CONFIDENCE — seberapa yakin sistem, berdasarkan kualitas segmentasi
     foto (apakah latar belakang berhasil dipisahkan dengan baik).

Cara pakai cepat (lokal):
    pip install -r requirements.txt
    uvicorn main:app --reload --port 8001

Next.js tinggal fetch ke: POST http://localhost:8001/analyze
dengan form-data: image=<file>, kind=daun|buah, species=tomat (opsional)
"""

from __future__ import annotations

import os
from typing import Literal, Optional

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(
    title="Smartech Garden — Plant Check Service",
    description="Analisis kesehatan daun & kematangan buah berbasis OpenCV (versi detail)",
    version="2.0.0",
)

ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =============================================================================
# Skema respons
# =============================================================================

class Finding(BaseModel):
    """Satu temuan/kemungkinan penyebab spesifik, dengan alasan singkat."""

    kode: str  # id unik-per-jenis-temuan, dipakai frontend kalau perlu ikon/warna
    label: str  # judul singkat, mis. "Kemungkinan kekurangan nitrogen"
    tingkat: Literal["ringan", "sedang", "berat"]
    deskripsi: str  # penjelasan + alasan kenapa temuan ini muncul


class SpotAnalysis(BaseModel):
    """Ringkasan bercak/lesion yang terdeteksi lewat contour detection."""

    jumlah: int
    totalAreaRatio: float  # proporsi luas daun/buah yang tertutup bercak
    ukuranRataRata: float  # rata-rata luas satu bercak, dalam % area objek
    terbesarRatio: float  # luas bercak terbesar, dalam % area objek
    pola: Literal["tidak_ada", "beberapa_titik_kecil", "menyebar", "menyatu_luas"]


class ZonalAnalysis(BaseModel):
    """Perbandingan kondisi zona tepi vs zona tengah objek."""

    tepiRasakRusak: float  # rasio piksel rusak (kuning+coklat) di zona tepi
    tengahRasakRusak: float  # rasio piksel rusak di zona tengah
    pola: Literal["merata", "dominan_tepi", "dominan_tengah"]


class AnalysisResult(BaseModel):
    kind: str
    healthScore: float
    healthLabel: str
    ripenessScore: Optional[float] = None
    ripenessLabel: Optional[str] = None

    greenRatio: float
    yellowRatio: float
    brownRatio: float
    redRatio: float

    spots: SpotAnalysis
    zonal: ZonalAnalysis
    findings: list[Finding]
    confidence: float = Field(ge=0, le=1)

    notes: str  # ringkasan singkat, gabungan dari findings (buat tampilan cepat)


# =============================================================================
# Endpoint utama
# =============================================================================

@app.get("/")
def root():
    return {"service": "smartech-plant-check", "status": "ready", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze", response_model=AnalysisResult)
async def analyze(
    image: UploadFile = File(..., description="Foto daun atau buah, format JPEG/PNG/WebP"),
    kind: Literal["daun", "buah"] = Form("daun"),
    species: Optional[str] = Form(None),
):
    if image.content_type not in ("image/jpeg", "image/png", "image/jpg", "image/webp"):
        raise HTTPException(400, "Format gambar harus JPEG, PNG, atau WebP")

    raw = await image.read()
    if len(raw) == 0:
        raise HTTPException(400, "File gambar kosong")

    np_arr = np.frombuffer(raw, dtype=np.uint8)
    img_bgr = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise HTTPException(400, "Gagal membaca gambar. Pastikan file tidak korup.")

    img_bgr = _resize_max(img_bgr, max_dim=640)

    mask_object, mask_confidence = _foreground_mask(img_bgr)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    ratios, masks = _color_ratios(hsv, mask_object)

    if kind == "daun":
        result = _evaluate_leaf(ratios, masks, mask_object, mask_confidence, species)
    else:
        result = _evaluate_fruit(ratios, masks, mask_object, mask_confidence, species)

    return result


# =============================================================================
# Tahap 1: pra-pemrosesan gambar
# =============================================================================

def _resize_max(img: np.ndarray, max_dim: int = 640) -> np.ndarray:
    h, w = img.shape[:2]
    scale = max_dim / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    return img


def _foreground_mask(img_bgr: np.ndarray) -> tuple[np.ndarray, float]:
    """
    Pisahkan objek (daun/buah) dari background terang/putih memakai Otsu
    threshold di kanal saturation. Return mask + skor confidence segmentasi
    (dipakai untuk menurunkan confidence hasil akhir kalau segmentasinya
    ragu-ragu / fallback ke seluruh frame).
    """
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    sat = hsv[:, :, 1]
    _, mask = cv2.threshold(sat, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)

    coverage = np.count_nonzero(mask) / mask.size

    if coverage < 0.03 or coverage > 0.97:
        # Segmentasi gagal wajar (background kompleks / foto terlalu close-up).
        # Fallback ke seluruh frame, tapi confidence diturunkan karena kita
        # gak yakin semua piksel benar-benar bagian dari daun/buah.
        return np.full(sat.shape, 255, dtype=np.uint8), 0.55

    # Confidence tinggi kalau area objek proporsional wajar (gak kepotong,
    # gak kekecilan). Objek yang mengisi 15%-80% frame dianggap ideal.
    if 0.15 <= coverage <= 0.80:
        confidence = 0.95
    else:
        confidence = 0.75

    return mask, confidence


# =============================================================================
# Tahap 2: analisis warna dasar
# =============================================================================

def _color_ratios(hsv: np.ndarray, mask: np.ndarray) -> tuple[dict, dict]:
    """Hitung rasio tiap kategori warna, dan kembalikan juga mask biner
    per-kategori (dipakai lagi untuk deteksi bercak & analisis zonal)."""
    total = max(np.count_nonzero(mask), 1)

    def category_mask(lower1, upper1, lower2=None, upper2=None):
        m = cv2.inRange(hsv, lower1, upper1)
        if lower2 is not None:
            m2 = cv2.inRange(hsv, lower2, upper2)
            m = cv2.bitwise_or(m, m2)
        return cv2.bitwise_and(m, mask)

    # Catatan rentang Hue (skala OpenCV 0-180): jingga (~10-18) sengaja masuk
    # kategori "red" karena secara visual & agronomis representasi warna
    # transisi matang (oranye->merah), bukan celah kosong antara merah-kuning.
    masks = {
        "green": category_mask(np.array([35, 40, 40]), np.array([85, 255, 255])),
        "yellow": category_mask(np.array([19, 40, 100]), np.array([34, 255, 255])),
        "brown": category_mask(np.array([5, 40, 20]), np.array([19, 200, 140])),
        "red": category_mask(
            np.array([0, 70, 50]), np.array([18, 255, 255]),
            np.array([170, 70, 50]), np.array([180, 255, 255]),
        ),
    }
    ratios = {k: float(np.count_nonzero(v)) / total for k, v in masks.items()}
    return ratios, masks


# =============================================================================
# Tahap 3: deteksi bercak (contour detection)
# =============================================================================

def _detect_spots(damage_mask: np.ndarray, object_mask: np.ndarray) -> SpotAnalysis:
    """
    Cari blob-blob terpisah di dalam damage_mask (biasanya union dari
    kuning+coklat untuk daun, atau coklat untuk buah) memakai contour
    detection. Bercak yang terlalu kecil (kemungkinan noise) diabaikan.
    """
    object_area = max(np.count_nonzero(object_mask), 1)
    min_area_px = max(object_area * 0.0015, 12)  # abaikan noise < 0.15% luas objek

    contours, _ = cv2.findContours(damage_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    spot_areas = [cv2.contourArea(c) for c in contours]
    spot_areas = [a for a in spot_areas if a >= min_area_px]

    if not spot_areas:
        return SpotAnalysis(jumlah=0, totalAreaRatio=0.0, ukuranRataRata=0.0, terbesarRatio=0.0, pola="tidak_ada")

    total_ratio = sum(spot_areas) / object_area
    avg_ratio = (sum(spot_areas) / len(spot_areas)) / object_area
    max_ratio = max(spot_areas) / object_area

    if max_ratio > 0.20:
        pola = "menyatu_luas"
    elif len(spot_areas) >= 6 and avg_ratio < 0.02:
        pola = "menyebar"
    else:
        pola = "beberapa_titik_kecil"

    return SpotAnalysis(
        jumlah=len(spot_areas),
        totalAreaRatio=round(total_ratio, 3),
        ukuranRataRata=round(avg_ratio, 4),
        terbesarRatio=round(max_ratio, 3),
        pola=pola,
    )


# =============================================================================
# Tahap 4: analisis zonal (tepi vs tengah)
# =============================================================================

def _zonal_analysis(damage_mask: np.ndarray, object_mask: np.ndarray) -> ZonalAnalysis:
    """
    Bandingkan proporsi kerusakan di zona TEPI vs zona TENGAH objek.
    Caranya: erosi mask objek untuk dapat "inti" (zona tengah), sisanya
    (objek - inti) jadi zona tepi. Pola sebaran ini indikatif:
      - dominan_tepi   -> biasanya kekeringan / kekurangan kalium
      - dominan_tengah -> biasanya kerusakan mekanis/hama di tengah daun
      - merata         -> biasanya kekurangan nitrogen / penyakit sistemik
    """
    object_area = np.count_nonzero(object_mask)
    if object_area < 200:
        return ZonalAnalysis(tepiRasakRusak=0.0, tengahRasakRusak=0.0, pola="merata")

    approx_radius = int(np.sqrt(object_area / np.pi))
    erode_px = max(3, min(25, approx_radius // 4))
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (erode_px * 2 + 1, erode_px * 2 + 1))

    core_mask = cv2.erode(object_mask, kernel)
    edge_mask = cv2.subtract(object_mask, core_mask)

    core_area = max(np.count_nonzero(core_mask), 1)
    edge_area = max(np.count_nonzero(edge_mask), 1)

    damage_in_core = np.count_nonzero(cv2.bitwise_and(damage_mask, core_mask)) / core_area
    damage_in_edge = np.count_nonzero(cv2.bitwise_and(damage_mask, edge_mask)) / edge_area

    if damage_in_edge < 0.02 and damage_in_core < 0.02:
        pola = "merata"
    elif damage_in_edge > damage_in_core * 1.8:
        pola = "dominan_tepi"
    elif damage_in_core > damage_in_edge * 1.8:
        pola = "dominan_tengah"
    else:
        pola = "merata"

    return ZonalAnalysis(
        tepiRasakRusak=round(damage_in_edge, 3),
        tengahRasakRusak=round(damage_in_core, 3),
        pola=pola,
    )


# =============================================================================
# Tahap 5: evaluasi DAUN
# =============================================================================

def _evaluate_leaf(
    ratios: dict, masks: dict, object_mask: np.ndarray, mask_confidence: float, species: Optional[str]
) -> AnalysisResult:
    green, yellow, brown = ratios["green"], ratios["yellow"], ratios["brown"]

    damage_mask = cv2.bitwise_or(masks["yellow"], masks["brown"])
    spots = _detect_spots(damage_mask, object_mask)
    zonal = _zonal_analysis(damage_mask, object_mask)

    score = 100 * green - 60 * yellow - 90 * brown
    score = max(0.0, min(100.0, score + 20))

    findings: list[Finding] = []

    if yellow > 0.35 and zonal.pola == "merata":
        findings.append(Finding(
            kode="kekurangan_nitrogen",
            label="Kemungkinan kekurangan nitrogen",
            tingkat="sedang" if yellow < 0.55 else "berat",
            deskripsi=(
                f"Menguning tersebar merata ({round(yellow * 100)}% area), bukan cuma di tepi atau "
                "titik tertentu — pola ini khas gejala klorosis akibat kekurangan nitrogen. "
                "Coba tambah pupuk nitrogen (mis. urea/kompos kaya N) dan pantau daun baru."
            ),
        ))

    if zonal.pola == "dominan_tepi" and zonal.tepiRasakRusak > 0.15:
        findings.append(Finding(
            kode="kering_tepi",
            label="Tepi daun mulai kering/coklat",
            tingkat="ringan" if zonal.tepiRasakRusak < 0.35 else "sedang",
            deskripsi=(
                "Kerusakan terkonsentrasi di tepi daun (leaf scorch), sering disebabkan "
                "penyiraman kurang konsisten, kelembaban udara rendah, atau kekurangan kalium. "
                "Cek jadwal siram dan kelembaban tanah."
            ),
        ))

    if spots.pola == "menyebar" and spots.jumlah >= 6:
        findings.append(Finding(
            kode="bercak_menyebar",
            label="Bercak kecil tersebar di permukaan daun",
            tingkat="sedang" if spots.totalAreaRatio < 0.15 else "berat",
            deskripsi=(
                f"Terdeteksi {spots.jumlah} bercak kecil terpisah menutupi sekitar "
                f"{round(spots.totalAreaRatio * 100)}% permukaan daun. Pola bercak tersebar seperti "
                "ini sering mengindikasikan infeksi jamur/bakteri (leaf spot disease) — periksa "
                "kelembaban berlebih di sekitar daun & sirkulasi udara."
            ),
        ))

    already_explained_large_area = any(f.kode == "kering_tepi" for f in findings)
    if spots.pola == "menyatu_luas" and zonal.pola != "merata" and not already_explained_large_area:
        findings.append(Finding(
            kode="kerusakan_luas",
            label="Area kerusakan luas dan menyatu",
            tingkat="berat",
            deskripsi=(
                f"Bercak terbesar mencakup {round(spots.terbesarRatio * 100)}% luas daun tanpa "
                "batas jelas — bisa jadi tanda layu lanjut, terbakar sinar matahari langsung "
                "(sunscald), atau kerusakan mekanis. Periksa langsung kondisi fisik daunnya."
            ),
        ))

    if brown > 0.4 and not findings:
        findings.append(Finding(
            kode="layu_umum",
            label="Sebagian besar daun kecoklatan",
            tingkat="berat",
            deskripsi=(
                f"Area coklat mencapai {round(brown * 100)}% dari daun. Kemungkinan daun sudah "
                "layu/mati sebagian, akibat kekeringan berkepanjangan atau usia daun yang tua."
            ),
        ))

    if not findings:
        findings.append(Finding(
            kode="sehat",
            label="Tidak ditemukan indikasi masalah signifikan",
            tingkat="ringan",
            deskripsi=f"Daun didominasi warna hijau segar ({round(green * 100)}% area hijau).",
        ))

    if score >= 75:
        label = "Sehat"
    elif score >= 45:
        label = "Perlu Perhatian"
    else:
        label = "Stres/Sakit"

    # Sinkronkan skor headline dengan tingkat keparahan findings — skor dari
    # rasio warna saja bisa terlalu lunak untuk kerusakan yang terlokalisasi
    # (mis. bercak tersebar hanya menutup ~6% area tapi jelas patut
    # diwaspadai). Temuan "berat"/"sedang" jadi batas atas skor supaya label
    # akhir gak menyesatkan (misal tetap bilang "Sehat" padahal ada bercak
    # penyakit yang sudah terdeteksi jelas).
    real_findings = [f for f in findings if f.kode != "sehat"]
    worst = max((f.tingkat for f in real_findings), default=None,
                key=lambda t: {"ringan": 1, "sedang": 2, "berat": 3}.get(t, 0))
    if worst == "berat":
        score = min(score, 40)
    elif worst == "sedang":
        score = min(score, 65)

    if score >= 75:
        label = "Sehat"
    elif score >= 45:
        label = "Perlu Perhatian"
    else:
        label = "Stres/Sakit"

    notes = " ".join(f.deskripsi for f in findings[:2])
    if species:
        notes += f" (Referensi spesies: {species})"

    confidence = round(mask_confidence * (1.0 if spots.jumlah < 50 else 0.85), 2)

    return AnalysisResult(
        kind="daun",
        healthScore=round(score, 1),
        healthLabel=label,
        greenRatio=round(green, 3),
        yellowRatio=round(yellow, 3),
        brownRatio=round(brown, 3),
        redRatio=round(ratios["red"], 3),
        spots=spots,
        zonal=zonal,
        findings=findings,
        confidence=confidence,
        notes=notes,
    )


# =============================================================================
# Tahap 6: evaluasi BUAH
# =============================================================================

def _evaluate_fruit(
    ratios: dict, masks: dict, object_mask: np.ndarray, mask_confidence: float, species: Optional[str]
) -> AnalysisResult:
    green, yellow, brown, red = ratios["green"], ratios["yellow"], ratios["brown"], ratios["red"]

    spots = _detect_spots(masks["brown"], object_mask)  # bercak coklat = indikasi memar/busuk
    zonal = _zonal_analysis(masks["brown"], object_mask)

    # Kematangan dihitung sebagai PROPORSI warna matang (merah+kuning) dari
    # total area berwarna (matang + hijau) — bukan selisih red-green mentah.
    # Kenapa: kalau dihitung sebagai selisih, buah yang separuh hijau-separuh
    # merah (jelas-jelas sedang proses matang) bisa salah kebaca "Belum
    # Matang" karena kedua komponen saling menetralkan jadi ~0.
    ripe_color = red + yellow * 0.6
    color_total = ripe_color + green
    ripeness = (ripe_color / color_total * 100) if color_total > 0.02 else 0.0
    ripeness = max(0.0, min(100.0, ripeness))

    findings: list[Finding] = []

    if spots.jumlah >= 1 and spots.totalAreaRatio > 0.03:
        tingkat = "ringan" if spots.totalAreaRatio < 0.08 else ("sedang" if spots.totalAreaRatio < 0.2 else "berat")
        findings.append(Finding(
            kode="bercak_memar_busuk",
            label=f"Terdeteksi {spots.jumlah} titik memar/busuk",
            tingkat=tingkat,
            deskripsi=(
                f"Area coklat/gelap menutupi sekitar {round(spots.totalAreaRatio * 100)}% permukaan "
                f"buah, tersebar dalam {spots.jumlah} titik. Kemungkinan memar akibat benturan atau "
                "awal pembusukan — sebaiknya segera diperiksa/dikonsumsi lebih dulu."
            ),
        ))

    if brown > 0.15:
        ripeness_label = "Terlalu Matang"
        stage_note = "Proporsi area coklat/gelap tinggi, kemungkinan sudah lewat matang atau mulai busuk."
    elif ripeness < 30:
        ripeness_label = "Belum Matang"
        stage_note = "Warna masih didominasi hijau. Tunggu beberapa hari lagi sebelum panen."
    elif ripeness < 55:
        ripeness_label = "Mengkal"
        stage_note = "Mulai berubah warna tapi belum optimal — bisa dipanen kalau butuh waktu simpan/kirim lebih lama."
    else:
        ripeness_label = "Matang"
        stage_note = "Warna menunjukkan tingkat kematangan optimal, baik untuk dipanen/dikonsumsi segera."

    if not findings:
        findings.append(Finding(
            kode="kondisi_baik",
            label="Tidak ada tanda memar/busuk signifikan",
            tingkat="ringan",
            deskripsi=stage_note,
        ))
    else:
        findings.insert(0, Finding(
            kode="status_kematangan",
            label=f"Status kematangan: {ripeness_label}",
            tingkat="ringan",
            deskripsi=stage_note,
        ))

    health_score = max(0.0, min(100.0, 100 - brown * 150 - spots.totalAreaRatio * 60))
    health_label = "Sehat" if health_score >= 70 else ("Perlu Perhatian" if health_score >= 40 else "Berpotensi Busuk")

    notes = " ".join(f.deskripsi for f in findings[:2])
    if species:
        notes += f" (Referensi spesies: {species})"

    confidence = round(mask_confidence * (1.0 if spots.jumlah < 50 else 0.85), 2)

    return AnalysisResult(
        kind="buah",
        healthScore=round(health_score, 1),
        healthLabel=health_label,
        ripenessScore=round(ripeness, 1),
        ripenessLabel=ripeness_label,
        greenRatio=round(green, 3),
        yellowRatio=round(yellow, 3),
        brownRatio=round(brown, 3),
        redRatio=round(red, 3),
        spots=spots,
        zonal=zonal,
        findings=findings,
        confidence=confidence,
        notes=notes,
    )
