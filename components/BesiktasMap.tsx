"use client";
import { Camera, Users, Truck } from "lucide-react";
import { HOODS, BASE, Report, STATUS_COLOR, STATUS_LABEL, STEPS, STEP_IDX, hoodOf } from "@/lib/data";

const ICON: Record<string, string> = { "Bozuk Asfalt": "🛣️", "Kırık Kaldırım": "🚧", "Çölleşmiş Park": "🌳", "Kaçak Çöp": "🗑️", "Sokak Lambası": "💡" };
interface Props {
  reports: Report[]; vehicle: { x: number; y: number } | null; selected: string | null;
  onSelect: (id: string | null) => void; pick: { x: number; y: number }; onPick: (p: { x: number; y: number }) => void; showPick: boolean;
}
export default function BesiktasMap({ reports, vehicle, selected, onSelect, pick, onPick, showPick }: Props) {
  const sel = reports.find((r) => r.id === selected);
  return (
    <div className="panel relative overflow-hidden p-1.5">
      <svg viewBox="0 0 600 400" className="h-auto w-full cursor-crosshair rounded-[10px]" role="img" aria-label="Beşiktaş ilçe haritası"
        onClick={(e) => { const b = e.currentTarget.getBoundingClientRect(); onPick({ x: ((e.clientX - b.left) / b.width) * 600, y: ((e.clientY - b.top) / b.height) * 400 }); onSelect(null); }}>
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f4c75" /><stop offset="1" stopColor="#06182a" /></linearGradient>
          <pattern id="blocks" width="14" height="14" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="9" height="9" rx="1.5" fill="#fff" opacity=".035" /></pattern>
          <radialGradient id="glow"><stop offset="0" stopColor="#facc15" stopOpacity=".5" /><stop offset="1" stopColor="#facc15" stopOpacity="0" /></radialGradient>
        </defs>
        <rect width="600" height="400" fill="#0e1218" />
        {HOODS.map((h) => {
          const n = reports.filter((r) => r.status !== "resolved" && hoodOf(r.x, r.y) === h.name).length;
          return (
            <g key={h.name}>
              <polygon points={h.pts} fill="#161b23" stroke="#323a47" strokeWidth="1.5" strokeLinejoin="round" />
              <polygon points={h.pts} fill="url(#blocks)" />
              <polygon points={h.pts} fill="#ef4444" opacity={Math.min(0.28, n * 0.09)} />
              <text x={h.c[0]} y={h.c[1] + 36} textAnchor="middle" fill="#cbd5e1" fontSize="11.5" fontWeight="600" pointerEvents="none">{h.name}</text>
              {n > 0 && <text x={h.c[0]} y={h.c[1] + 49} textAnchor="middle" fill="#f87171" fontSize="9.5" pointerEvents="none">{n} açık ihbar</text>}
            </g>
          );
        })}
        <g stroke="#2b3340" strokeLinecap="round" fill="none">
          <path d="M115 305 Q250 345 450 322" strokeWidth="7" /><path d="M130 200 L440 250" strokeWidth="5" /><path d="M270 160 L280 335" strokeWidth="5" /><path d="M420 150 L450 320" strokeWidth="5" />
        </g>
        <path d="M0 340 Q90 328 170 342 T330 338 T490 346 T600 336 L600 400 L0 400Z" fill="url(#sea)" />
        <path d="M0 340 Q90 328 170 342 T330 338 T490 346 T600 336" fill="none" stroke="#38bdf8" strokeOpacity=".5" />
        <text x="300" y="378" textAnchor="middle" fill="#5aa7cf" fontSize="12" fontStyle="italic" opacity=".8">İstanbul Boğazı</text>
        <ellipse cx="438" cy="298" rx="15" ry="9" fill="#1f2937" stroke="#e5e7eb" strokeWidth="1.5" /><text x="438" y="320" textAnchor="middle" fill="#e5e7eb" fontSize="9">Tüpraş Stadyumu</text>
        <rect x={BASE.x - 8} y={BASE.y - 8} width="16" height="16" rx="3" fill="#e5e7eb" /><text x={BASE.x} y={BASE.y + 4} textAnchor="middle" fontSize="10">🏢</text>
        {vehicle && <><line x1={BASE.x} y1={BASE.y} x2={vehicle.x} y2={vehicle.y} stroke="#facc15" strokeWidth="2" strokeDasharray="5 5" /><circle cx={vehicle.x} cy={vehicle.y} r="34" fill="url(#glow)" /></>}
        {showPick && <g><circle cx={pick.x} cy={pick.y} r="13" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" /><circle cx={pick.x} cy={pick.y} r="2.5" fill="#38bdf8" /></g>}
        {reports.map((r) => (
          <g key={r.id} onClick={(e) => { e.stopPropagation(); onSelect(r.id); }} className="cursor-pointer">
            {r.status === "pending" && <circle cx={r.x} cy={r.y} r="11" fill={STATUS_COLOR.pending} opacity=".35"><animate attributeName="r" values="11;24;11" dur="1.8s" repeatCount="indefinite" /><animate attributeName="opacity" values=".4;0;.4" dur="1.8s" repeatCount="indefinite" /></circle>}
            <circle cx={r.x} cy={r.y} r={selected === r.id ? 13 : 11} fill={STATUS_COLOR[r.status]} stroke="#fff" strokeWidth="2" />
            <text x={r.x} y={r.y + 4} textAnchor="middle" fontSize="11" pointerEvents="none">{ICON[r.cat]}</text>
          </g>
        ))}
        {vehicle && <g transform={`translate(${vehicle.x},${vehicle.y})`} pointerEvents="none"><circle r="13" fill="#facc15" stroke="#fff" strokeWidth="2" /><text y="5" textAnchor="middle" fontSize="14">🚛</text></g>}
      </svg>
      <span className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Canlı harita</span>
      <div className="absolute bottom-4 left-4 flex gap-3 rounded-full bg-black/60 px-3 py-1 text-[11px]">
        {(["pending", "enroute", "resolved"] as const).map((k) => (
          <span key={k} className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[k] }} />{k === "pending" ? "Bekleyen" : k === "enroute" ? "Ekip yolda" : "Çözüldü"}</span>
        ))}
      </div>
      {sel && (
        <div className="absolute z-10 w-60 rounded-xl border border-white/15 bg-zinc-950/95 p-3 text-xs shadow-2xl"
          style={{ left: `clamp(8px, calc(${sel.x / 6}% - 120px), calc(100% - 248px))`, top: sel.y < 200 ? `${sel.y / 4 + 6}%` : undefined, bottom: sel.y >= 200 ? `${100 - sel.y / 4 + 6}%` : undefined }}>
          <div className="mb-2 flex h-20 items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-zinc-300"><Camera size={16} /> {sel.cat}</div>
          <p className="font-semibold">{sel.id} · {sel.street}</p>
          <p className="mt-1 text-zinc-400">{sel.desc}</p>
          <p className="mt-2 flex items-center gap-1"><Users size={13} /> {sel.supporters} vatandaş destekliyor</p>
          <p className="mt-1 flex items-center gap-1"><Truck size={13} /> {sel.team}{sel.status === "enroute" && sel.eta ? ` · varış ${sel.eta} dk` : ""}</p>
          <ol className="mt-2 flex gap-1">
            {STEPS.map((st, i) => (
              <li key={st} className="flex-1"><div className="h-1 rounded" style={{ background: i <= STEP_IDX[sel.status] ? STATUS_COLOR[sel.status] : "#3f3f46" }} /><span className={`mt-1 block text-[9px] leading-tight ${i <= STEP_IDX[sel.status] ? "text-zinc-200" : "text-zinc-500"}`}>{st}</span></li>
            ))}
          </ol>
          <p className="mt-2 text-zinc-400">{STATUS_LABEL[sel.status]} · SLA {sel.sla}</p>
        </div>
      )}
    </div>
  );
}
