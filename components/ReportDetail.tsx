"use client";
import { useState } from "react";
import { Heart, Bell, X, Camera, EyeOff, Eye, Check, ThumbsDown } from "lucide-react";
import { PubUser, Report, TEMPLATES } from "@/lib/data";
import { resizePhoto } from "@/lib/photo";
import { T } from "@/lib/i18n";
import Tracker from "./Tracker";

interface Props { r: Report; t: T; user: PubUser | null; staff: boolean; sup: boolean; photoUrl?: string; afterUrl?: string; onAct: (id: string, body: Record<string, unknown>) => Promise<void>; onClose: () => void }
const Photo = ({ src, label, t }: { src?: string; label: string; t: T }) => (
  <figure className="flex-1"><div className="grid h-24 place-items-center overflow-hidden rounded bg-zinc-800 text-[11px] text-zinc-500">{src ? <img src={src} alt={label} className="h-full w-full object-cover" /> : t("no_photo")}</div><figcaption className="mt-1 text-center text-[11px] text-zinc-400">{label}</figcaption></figure>
);
export default function ReportDetail({ r, t, user, staff, sup, photoUrl, afterUrl, onAct, onClose }: Props) {
  const [text, setText] = useState("");
  const btn = "flex items-center gap-1.5 rounded border border-zinc-600 px-2.5 py-1 text-xs hover:bg-white/10";
  return (
    <section className="panel space-y-3 p-3" aria-label={r.id}>
      <div className="flex items-start justify-between gap-2">
        <div><p className="text-sm font-semibold">{r.id} · {r.street}{r.hidden && <span className="ml-2 text-xs text-red-400">({t("hidden")})</span>}</p><p className="text-xs text-zinc-400">{r.desc}{r.authorName ? ` — ${r.authorName}` : ""}</p></div>
        <button onClick={onClose} aria-label={t("close")} className="text-zinc-400"><X size={16} /></button>
      </div>
      <Tracker r={r} t={t} />
      {(r.hasPhoto || r.hasAfter) && <div className="flex gap-2"><Photo t={t} label={t("before")} src={photoUrl} /><Photo t={t} label={t("after")} src={afterUrl} /></div>}
      <div className="flex flex-wrap gap-2">
        <button className={btn} aria-pressed={r.voted} onClick={() => onAct(r.id, { action: "vote" })}><Heart size={13} className={r.voted ? "fill-red-500 text-red-500" : ""} /> {r.voted ? t("supported") : t("support")} · {r.supporters}</button>
        <button className={btn} aria-pressed={r.following} onClick={() => onAct(r.id, { action: "follow" })}><Bell size={13} /> {r.following ? t("following") : t("follow")}</button>
        {sup && <button className={btn} onClick={() => onAct(r.id, { action: "moderate", hide: !r.hidden })}>{r.hidden ? <Eye size={13} /> : <EyeOff size={13} />} {r.hidden ? t("unhide") : t("hide")}</button>}
      </div>
      {r.mine && r.status === "resolved" && !r.confirmed && (
        <div className="rounded border border-emerald-600/50 bg-emerald-950/30 p-2 text-xs"><p className="mb-2 font-medium">{t("confirm_q")}</p>
          <div className="flex gap-2"><button className={btn} onClick={() => onAct(r.id, { action: "confirm", ok: true })}><Check size={13} /> {t("yes_fixed")}</button><button className={btn} onClick={() => onAct(r.id, { action: "confirm", ok: false })}><ThumbsDown size={13} /> {t("still")}</button></div></div>
      )}
      {staff && (
        <div className="space-y-2 rounded border border-white/10 p-2">
          <select className="w-full rounded border border-zinc-600 bg-black/40 px-2 py-1 text-xs" value="" aria-label={t("tpl")} onChange={(e) => e.target.value && onAct(r.id, { action: "reply", text: e.target.value })}><option value="">{t("tpl")}</option>{TEMPLATES.map((x) => <option key={x}>{x}</option>)}</select>
          {r.status === "resolved" && <label className={`${btn} cursor-pointer`}><Camera size={13} /> {t("upload_after")}<input type="file" accept="image/*" className="sr-only" onChange={async (e) => { const f = e.target.files?.[0]; if (f) onAct(r.id, { action: "status", status: "resolved", after: await resizePhoto(f) }); }} /></label>}
        </div>
      )}
      <div>
        <p className="mb-1 text-xs font-medium text-zinc-300">{t("comments")} ({r.comments.length})</p>
        <ul className="max-h-36 space-y-1 overflow-auto text-xs">
          {r.comments.map((c) => (
            <li key={c.id} className={`rounded bg-white/5 px-2 py-1 ${c.hidden ? "opacity-50" : ""}`}>
              <b className={c.role === "citizen" ? "" : "text-cyan-300"}>{c.by}</b> <span className="text-zinc-500">{new Date(c.t).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" })}</span> {c.text}
              {sup && <button className="ml-2 text-zinc-500 underline" onClick={() => onAct(r.id, { action: "moderate", commentId: c.id })}>{c.hidden ? t("unhide") : t("hide")}</button>}
            </li>))}
        </ul>
        {user && <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onAct(r.id, { action: "comment", text }); setText(""); } }}>
          <input className="flex-1 rounded border border-zinc-600 bg-black/40 px-2 py-1 text-xs" value={text} maxLength={300} onChange={(e) => setText(e.target.value)} placeholder={t("comment_ph")} aria-label={t("comment_ph")} />
          <button className={btn}>{t("post")}</button></form>}
      </div>
    </section>
  );
}
