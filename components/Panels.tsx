"use client";
import { Heart, Trophy } from "lucide-react";
import { HOODS, Notif, PubUser, Report, STATUS_COLOR } from "@/lib/data";
import { risk } from "@/lib/smart";
import { T } from "@/lib/i18n";

export function HoodList({ reports, t, selected, onSelect, onVote }: { reports: Report[]; t: T; selected: string | null; onSelect: (id: string) => void; onVote: (id: string) => void }) {
  const list = reports.filter((r) => r.status !== "resolved").sort((a, b) => b.priority - a.priority);
  return (
    <div className="panel p-3"><p className="mb-2 text-sm font-medium">{t("hood_list")}</p>
      <ul className="max-h-72 space-y-1 overflow-auto text-xs">{list.map((r) => (
        <li key={r.id} className={`flex items-center gap-2 rounded px-2 py-1 ${selected === r.id ? "bg-zinc-800" : ""}`}>
          <button className="flex-1 truncate text-left" onClick={() => onSelect(r.id)}><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[r.status] }} />{r.id} · {t("c:" + r.cat)} · {r.hood}</button>
          <button onClick={() => onVote(r.id)} aria-pressed={r.voted} aria-label={t("support")} className="flex items-center gap-1 rounded border border-zinc-600 px-1.5 py-0.5"><Heart size={11} className={r.voted ? "fill-red-500 text-red-500" : ""} />{r.supporters}</button>
        </li>))}</ul></div>
  );
}
export function Leaders({ stats, t }: { stats: { leaders: { users: { name: string; karma: number }[]; hoods: { name: string; solved: number }[] } } | null; t: T }) {
  if (!stats) return null;
  const Row = ({ i, a, b }: { i: number; a: string; b: string }) => <li className="flex justify-between rounded bg-white/5 px-2 py-1"><span>{i + 1}. {a}</span><b>{b}</b></li>;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="panel p-3"><p className="mb-2 flex items-center gap-1.5 text-sm font-medium"><Trophy size={14} /> {t("top_users")}</p><ul className="space-y-1 text-xs">{stats.leaders.users.map((u, i) => <Row key={u.name} i={i} a={u.name} b={`${u.karma}`} />)}</ul></div>
      <div className="panel p-3"><p className="mb-2 text-sm font-medium">{t("top_hoods")}</p><ul className="space-y-1 text-xs">{stats.leaders.hoods.map((h, i) => <Row key={h.name} i={i} a={h.name} b={`${h.solved} ${t("solved")}`} />)}</ul></div>
    </div>
  );
}
export function Notifs({ notifs, t, user, onRead, onSelect, onSubs }: { notifs: Notif[]; t: T; user: PubUser | null; onRead: () => void; onSelect: (id: string) => void; onSubs: (h: string[]) => void }) {
  if (!user) return <p className="panel p-3 text-sm text-zinc-400">{t("need_login")}</p>;
  return (
    <div className="space-y-3">
      <div className="panel p-3"><p className="mb-2 text-sm font-medium">{t("subs")}</p>
        <div className="flex flex-wrap gap-2">{HOODS.map((h) => { const on = user.hoods.includes(h.name); return (
          <label key={h.name} className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs ${on ? "border-white bg-white text-black" : "border-zinc-600"}`}><input type="checkbox" className="sr-only" checked={on} onChange={() => onSubs(on ? user.hoods.filter((x) => x !== h.name) : [...user.hoods, h.name])} />{h.name}</label>); })}</div></div>
      <div className="panel p-3"><div className="mb-2 flex justify-between text-sm font-medium"><span>{t("tab_notif")}</span><button className="text-xs underline" onClick={onRead}>{t("read_all")}</button></div>
        <ul className="max-h-60 space-y-1 overflow-auto text-xs">{notifs.length === 0 && <li className="text-zinc-500">{t("no_notif")}</li>}
          {notifs.map((n) => <li key={n.id}><button onClick={() => n.rid && onSelect(n.rid)} className={`w-full rounded px-2 py-1 text-left ${n.read ? "text-zinc-400" : "bg-white/10"}`}>{n.text}</button></li>)}</ul></div>
    </div>
  );
}
export const riskBadge = (r: Report, t: T) => { const k = risk(r.ageH, r.sla); return k === "ok" ? null : <span className={`rounded px-1 text-[10px] ${k === "late" ? "bg-red-600" : "bg-amber-600"} text-white`}>{t(k)}</span>; };
