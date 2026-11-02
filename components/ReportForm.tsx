"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Camera, ScanSearch, WifiOff, Award, Wand2 } from "lucide-react";
import { CATS, PubUser, Report, Scan, hoodOf } from "@/lib/data";
import { suggestCategory } from "@/lib/smart";
import { resizePhoto } from "@/lib/photo";
import { T } from "@/lib/i18n";

export interface Draft { cat: string; desc: string; anonymous: boolean; photo?: string }
interface Props { t: T; scan: Scan; pick: { x: number; y: number }; offline: boolean; queueLen: number; user: PubUser | null; reports: Report[]; onSubmit: (d: Draft) => void }
export default function ReportForm({ t, scan, pick, offline, queueLen, user, reports, onSubmit }: Props) {
  const [open, setOpen] = useState(false), [cat, setCat] = useState(Object.keys(CATS)[0]), [desc, setDesc] = useState(""), [anon, setAnon] = useState(false), [photo, setPhoto] = useState<string>();
  const show = open || scan.phase !== "idle", sug = suggestCategory(desc), meta = CATS[scan.cat ?? cat];
  const near = reports.find((r) => r.status !== "resolved" && r.cat === cat && Math.hypot(r.x - pick.x, r.y - pick.y) < 30);
  const sel = "w-full rounded border border-zinc-600 bg-black/40 px-2 py-1.5 text-sm";
  return (
    <section className="space-y-4">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={show} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-3 font-semibold text-black hover:bg-zinc-200"><Camera size={18} /> {t("new_report")}</button>
      {show && (
        <div className="space-y-3 panel p-3">
          <label className="relative block h-40 cursor-pointer overflow-hidden rounded bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900">
            <input type="file" accept="image/*" className="sr-only" aria-label={t("upload")} onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPhoto(await resizePhoto(f)); }} />
            {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-zinc-400"><Camera size={16} /> {t("upload")}</span>}
            {scan.phase === "scanning" && <motion.div className="absolute inset-x-0 h-0.5 bg-cyan-400 shadow-[0_0_12px_#22d3ee]" initial={{ top: 0 }} animate={{ top: "100%" }} transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }} />}
            {scan.phase === "done" && <motion.div initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }} className="absolute left-[22%] top-[38%] h-[34%] w-[50%] border-2 border-red-500"><span className="absolute -top-5 left-[-2px] whitespace-nowrap bg-red-500 px-1 text-[11px] font-medium text-white">{t("c:" + scan.cat)} (%{scan.conf})</span></motion.div>}
          </label>
          <label className="block text-xs text-zinc-400">{t("cat")}<select className={sel} value={cat} onChange={(e) => setCat(e.target.value)}>{Object.keys(CATS).map((c) => <option key={c} value={c}>{t("c:" + c)}</option>)}</select></label>
          <textarea className={sel} rows={2} maxLength={300} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("desc_ph")} aria-label={t("desc_ph")} />
          {sug && sug.cat !== cat && <button onClick={() => setCat(sug.cat)} className="flex items-center gap-1.5 text-xs text-cyan-300 underline-offset-2 hover:underline"><Wand2 size={13} /> {t("suggest")}: {t("c:" + sug.cat)} (%{sug.conf}) — {t("use")}</button>}
          {near && <p role="status" className="rounded border border-amber-600/50 bg-amber-950/40 p-2 text-xs text-amber-300">{t("nearby")}: {near.id}</p>}
          <p className="flex items-center gap-2 text-sm text-zinc-300"><ScanSearch size={15} /> {scan.phase === "scanning" ? t("analyzing") : `${t("routed")}: ${meta.dept} · SLA ${meta.sla}`}</p>
          <p className="text-xs text-zinc-400">{t("loc")}: {hoodOf(pick.x, pick.y)} ({t("loc_hint")})</p>
          {user && <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} /> {t("anon")}</label>}
          <button disabled={scan.phase === "scanning"} onClick={() => { onSubmit({ cat, desc, anonymous: anon, photo }); setDesc(""); setPhoto(undefined); }} className="w-full rounded bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50">{offline ? t("queue_add") : t("send")}</button>
        </div>
      )}
      {offline && <p className="flex items-center gap-2 rounded border border-amber-600/50 bg-amber-950/40 p-2 text-xs text-amber-300"><WifiOff size={14} /> {t("offline_on")}: {t("offline_note")} {queueLen}</p>}
      {user && (
        <div className="panel p-3">
          <div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><Award size={16} /> {t("karma")}</span><b>{user.karma}</b></div>
          <div className="mt-2 h-1.5 rounded bg-zinc-700"><div className="h-full rounded bg-white" style={{ width: `${Math.min(100, (user.karma / 250) * 100)}%` }} /></div>
          <p className="mt-2 text-xs text-zinc-400">{t("karma_note")}</p>
        </div>
      )}
    </section>
  );
}
