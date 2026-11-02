"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, ScanSearch, WifiOff, Award } from "lucide-react";
import { CATS, Scan, hoodOf } from "@/lib/data";

interface Props {
  scan: Scan; pick: { x: number; y: number }; offline: boolean; queueLen: number; karma: number;
  onSubmit: () => void; onClaim: () => void;
}
export default function ReportForm({ scan, pick, offline, queueLen, karma, onSubmit, onClaim }: Props) {
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string>();
  const show = open || scan.phase !== "idle";
  const meta = scan.cat ? CATS[scan.cat] : undefined;
  return (
    <section className="space-y-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 font-semibold text-black hover:bg-zinc-200">
        <Camera size={18} /> Yeni ihbar oluştur
      </button>

      {show && (
        <div className="space-y-3 panel p-3">
          <label className="relative block h-44 cursor-pointer overflow-hidden rounded bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(URL.createObjectURL(f)); }} />
            {photo ? <img src={photo} alt="Yüklenen fotoğraf" className="h-full w-full object-cover" /> : (
              <span className="absolute inset-0 flex flex-col items-center justify-center text-sm text-zinc-400">
                <svg viewBox="0 0 200 60" className="mb-2 w-40 opacity-50"><path d="M0 40 L60 38 L80 30 L100 44 L130 36 L200 38" stroke="#9ca3af" strokeWidth="3" fill="none" /></svg>
                Fotoğraf yükle veya simülasyon görselini kullan
              </span>
            )}
            {scan.phase === "scanning" && (
              <motion.div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee]" initial={{ top: 0 }} animate={{ top: "100%" }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />
            )}
            {scan.phase === "done" && (
              <motion.div initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} className="absolute left-[22%] top-[38%] h-[34%] w-[50%] border-2 border-red-500">
                <span className="absolute -top-5 left-[-2px] whitespace-nowrap bg-red-500 px-1 text-[11px] font-medium text-white">Tespit edilen: {scan.cat} (%{scan.conf})</span>
              </motion.div>
            )}
          </label>

          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2 text-zinc-300"><ScanSearch size={15} /> {scan.phase === "scanning" ? "Görsel analiz ediliyor…" : scan.phase === "done" ? `Yönlendirilen birim: ${meta?.dept} · SLA ${meta?.sla}` : "Fotoğraf analizi bekleniyor"}</p>
            <p className="text-zinc-400">Konum: {hoodOf(pick.x, pick.y)} (haritaya tıklayarak değiştir)</p>
          </div>

          <button disabled={scan.phase === "scanning"} onClick={onSubmit} className="w-full rounded bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50">
            {offline ? "Çevrimdışı kuyruğa ekle" : "İhbarı gönder"}
          </button>
        </div>
      )}

      {offline && (
        <p className="flex items-center gap-2 rounded border border-amber-600/50 bg-amber-950/40 p-2 text-xs text-amber-300">
          <WifiOff size={14} /> Maç günü / afet modu: ihbarlar cihazda saklanır, bağlantı gelince eşitlenir. Kuyrukta: {queueLen}
        </p>
      )}

      <div className="panel p-3">
        <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Award size={16} /> Beşiktaş Karma Puanı</span><b>{karma}</b></div>
        <div className="mt-2 h-1.5 rounded bg-zinc-700"><div className="h-full rounded bg-white" style={{ width: `${Math.min(100, (karma / 250) * 100)}%` }} /></div>
        <p className="mt-2 text-xs text-zinc-400">250 puanda Çarşı esnafında indirim kuponu açılır.</p>
        <button onClick={onClaim} className="mt-2 text-xs underline underline-offset-2">Çözülen ihbarlar için puanı al</button>
      </div>
    </section>
  );
}
