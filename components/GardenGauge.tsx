"use client";

/**
 * GardenGauge — elemen signature dashboard.
 * Dibuat menyerupai alat ukur kebun jadul (termometer/rain-gauge kuningan)
 * alih-alih kartu angka generik. Jarum + arc bergerak sesuai nilai sensor.
 */

type Props = {
  label: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  accent: "clay" | "rain" | "moss" | "brass";
  icon: React.ReactNode;
  warn?: boolean;
  warnMessage?: string;
};

const ACCENTS: Record<Props["accent"], string> = {
  clay: "#A6472F",
  rain: "#3E6E85",
  moss: "#3F6B3D",
  brass: "#B8862E",
};

export default function GardenGauge({
  label,
  value,
  unit,
  min,
  max,
  accent,
  icon,
  warn,
  warnMessage,
}: Props) {
  const color = ACCENTS[accent];
  const safeValue = value ?? min;
  const clamped = Math.min(max, Math.max(min, safeValue));
  const pct = (clamped - min) / (max - min);

  // Arc goes from -120deg to 120deg (240deg sweep)
  const startAngle = -120;
  const sweep = 240;
  const angle = startAngle + sweep * pct;

  const radius = 46;
  const circumference = (sweep / 360) * 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="seed-card p-4 flex flex-col items-center gap-2 min-w-[150px]">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-ink/60 font-medium">
        {icon}
        <span>{label}</span>
      </div>

      <svg viewBox="0 0 120 120" className="w-28 h-28">
        {/* brass rim */}
        <circle cx="60" cy="60" r="56" fill="none" stroke="#B8862E" strokeWidth="2" opacity="0.35" />
        {/* track */}
        <path
          d={describeArc(60, 60, radius, startAngle, startAngle + sweep)}
          fill="none"
          stroke="rgba(35,48,29,0.12)"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* value arc */}
        <path
          className="gauge-ring"
          d={describeArc(60, 60, radius, startAngle, startAngle + sweep)}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
        {/* needle */}
        <g className="gauge-needle" style={{ transform: `rotate(${angle}deg)` }}>
          <line x1="60" y1="60" x2="60" y2="22" stroke="#23301D" strokeWidth="2" strokeLinecap="round" />
        </g>
        <circle cx="60" cy="60" r="4.5" fill="#23301D" />

        <text
          x="60"
          y="78"
          textAnchor="middle"
          className="font-mono"
          fontSize="17"
          fontWeight="600"
          fill="#23301D"
        >
          {value === null ? "--" : Math.round(value * 10) / 10}
        </text>
        <text x="60" y="92" textAnchor="middle" className="font-mono" fontSize="9" fill="#23301D" opacity="0.55">
          {unit}
        </text>
      </svg>

      {warn && (
        <p className="text-[11px] text-clay font-medium text-center leading-snug">{warnMessage}</p>
      )}
    </div>
  );
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}
