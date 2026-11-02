"use client";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { BASE, BOUNDS, HOODS, Report, STATUS_COLOR, llToXY, xyToLL } from "@/lib/data";

const ICON: Record<string, string> = { "Bozuk Asfalt": "🛣️", "Kırık Kaldırım": "🚧", "Çölleşmiş Park": "🌳", "Kaçak Çöp": "🗑️", "Sokak Lambası": "💡" };
interface Props {
  photoUrl?: string; reports: Report[]; vehicle: { x: number; y: number } | null; selected: string | null;
  onSelect: (id: string | null) => void; pick: { x: number; y: number }; onPick: (p: { x: number; y: number }) => void; showPick: boolean; heat?: boolean; onHeat?: () => void;
}
const pin = (html: string, size = 30) => L.divIcon({ className: "", html, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });

export default function BesiktasMap({ reports, vehicle, selected, onSelect, pick, onPick, showPick, heat, onHeat }: Props) {
  const el = useRef<HTMLDivElement>(null), map = useRef<L.Map>(), grp = useRef<L.LayerGroup>(), cb = useRef({ onPick, onSelect });
  cb.current = { onPick, onSelect };
  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true }).fitBounds([[BOUNDS.s, BOUNDS.w], [BOUNDS.n, BOUNDS.e]]);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(m);
    grp.current = L.layerGroup().addTo(m);
    m.on("click", (e) => { cb.current.onPick(llToXY(e.latlng.lat, e.latlng.lng)); cb.current.onSelect(null); });
    map.current = m; setTimeout(() => m.invalidateSize(), 100);
    return () => { m.remove(); };
  }, []);
  useEffect(() => {
    const g = grp.current; if (!g) return; g.clearLayers();
    for (const h of HOODS) {
      const n = reports.filter((r) => r.status !== "resolved" && r.hood === h.name).length;
      L.marker(xyToLL(h.c[0], h.c[1]), { interactive: false, icon: pin(`<div class="bs-hood">${h.name}${n ? `<br><b>${n} açık</b>` : ""}</div>`, 1) }).addTo(g);
    }
    L.marker(xyToLL(BASE.x, BASE.y), { interactive: false, icon: pin(`<div class="bs-pin" style="background:#e5e7eb">🏢</div>`) }).addTo(g);
    if (heat) for (const r of reports) L.circle(xyToLL(r.x, r.y), { radius: 120 + Math.min(r.supporters, 20) * 12, stroke: false, fillColor: "#f97316", fillOpacity: r.status === "resolved" ? 0.12 : 0.35, interactive: false }).addTo(g);
    if (showPick) L.circleMarker(xyToLL(pick.x, pick.y), { radius: 9, color: "#38bdf8", weight: 2, dashArray: "3 3", fillOpacity: 0.15, interactive: false }).addTo(g);
    for (const r of reports) {
      const big = selected === r.id, sz = big ? 36 : 30;
      L.marker(xyToLL(r.x, r.y), { title: `${r.id} ${r.cat} ${r.hood}`, icon: pin(`<div class="bs-pin ${r.status === "pending" ? "bs-pulse" : ""}" style="background:${STATUS_COLOR[r.status]};width:${sz}px;height:${sz}px;${big ? "outline:3px solid #fff;" : ""}">${ICON[r.cat] ?? "📍"}</div>`, sz) })
        .on("click", (e) => { L.DomEvent.stopPropagation(e); cb.current.onSelect(r.id); }).addTo(g);
    }
    if (vehicle) {
      L.polyline([xyToLL(BASE.x, BASE.y), xyToLL(vehicle.x, vehicle.y)], { color: "#facc15", weight: 3, dashArray: "6 6" }).addTo(g);
      L.marker(xyToLL(vehicle.x, vehicle.y), { interactive: false, zIndexOffset: 1000, icon: pin(`<div class="bs-pin" style="background:#facc15">🚛</div>`) }).addTo(g);
    }
  }, [reports, vehicle, selected, pick, showPick, heat]);
  return (
    <div className="panel relative isolate overflow-hidden p-1.5">
      <div ref={el} className="bs-map h-[440px] w-full rounded-[10px]" role="application" aria-label="Beşiktaş haritası" />
      <span className="absolute left-4 top-4 z-[1000] flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px]"><i className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />Canlı harita</span>
      {onHeat && <button onClick={onHeat} aria-pressed={heat} className={`absolute right-4 top-4 z-[1000] rounded-full px-3 py-1 text-[11px] ${heat ? "bg-orange-500 text-black" : "bg-black/70"}`}>🔥 Isı haritası</button>}
      <div className="absolute bottom-4 left-4 z-[1000] flex gap-3 rounded-full bg-black/70 px-3 py-1 text-[11px]">
        {(["pending", "enroute", "resolved"] as const).map((k) => <span key={k} className="flex items-center gap-1"><i className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[k] }} />{k === "pending" ? "Bekleyen" : k === "enroute" ? "Ekip yolda" : "Çözüldü"}</span>)}
      </div>
    </div>
  );
}
