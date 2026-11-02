"use client";
import { useEffect, useRef } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, Flame } from "lucide-react";
import { Report, STATUS_COLOR } from "@/lib/data";
import { T } from "@/lib/i18n";
import type { Stats } from "@/lib/stats";
import { riskBadge } from "./Panels";

export interface LogLine { t: string; m: string; c: string }
export type { Stats };
interface Props { t: T; reports: Report[]; stats: Stats | null; logs: LogLine[]; selected: string | null; heat: boolean; onHeat: () => void; onSelect: (id: string) => void; onDispatch: (id: string) => void; onExport: () => void }
const tip = { contentStyle: { background: "#09090b", border: "1px solid #3f3f46" } }, ax = { fill: "#a1a1aa", fontSize: 10 };

export default function CommandPanel({ t, reports, stats, logs, selected, heat, onHeat, onSelect, onDispatch, onExport }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [logs]);
  const k = stats?.kpi, queue = reports.filter((r) => r.status !== "resolved").sort((a, b) => b.priority - a.priority);
  const kp = k ? [[t("k_open"), String(k.open)], [t("k_resolved"), String(k.resolved)], [t("k_mttr"), `${k.mttrH} sa`], [t("k_sla"), `%${k.slaPct}`]] : [];
  const chart = (title: string, children: React.ReactNode) => <div className="panel p-3"><p className="mb-2 text-sm font-medium">{title}</p><div className="h-44"><ResponsiveContainer>{children as any}</ResponsiveContainer></div></div>;
  return (
    <section className="space-y-4">
      <div className="no-print flex flex-wrap gap-2 text-xs">
        <button onClick={onHeat} aria-pressed={heat} className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${heat ? "border-orange-400 text-orange-300" : "border-zinc-600"}`}><Flame size={13} /> {t("heat")}</button>
        <button onClick={onExport} className="flex items-center gap-1.5 rounded-full border border-zinc-600 px-3 py-1"><Download size={13} /> {t("export")}</button>
      </div>
      <div className="grid grid-cols-2 gap-2">{kp.map(([a, v]) => <div key={a} className="panel p-3"><p className="text-xs text-zinc-400">{a}</p><p className="text-2xl font-semibold">{v}</p></div>)}</div>
      {stats && chart(t("by_dept"), <BarChart data={stats.byDept}><CartesianGrid stroke="#27272a" vertical={false} /><XAxis dataKey="name" tick={ax} /><YAxis allowDecimals={false} tick={ax} width={20} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Bekleyen" stackId="a" fill={STATUS_COLOR.pending} /><Bar dataKey="Devam eden" stackId="a" fill={STATUS_COLOR.enroute} /><Bar dataKey="Çözüldü" stackId="a" fill={STATUS_COLOR.resolved} /></BarChart>)}
      {stats && chart(t("by_hood"), <BarChart data={stats.byHood}><CartesianGrid stroke="#27272a" vertical={false} /><XAxis dataKey="name" tick={ax} /><YAxis allowDecimals={false} tick={ax} width={20} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="Açık" stackId="a" fill={STATUS_COLOR.pending} /><Bar dataKey="Çözüldü" stackId="a" fill={STATUS_COLOR.resolved} /></BarChart>)}
      {stats && chart(t("trend"), <LineChart data={stats.trend}><CartesianGrid stroke="#27272a" vertical={false} /><XAxis dataKey="day" tick={ax} /><YAxis allowDecimals={false} tick={ax} width={20} /><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} />
        <Line dataKey="Yeni" stroke="#ef4444" dot={false} /><Line dataKey="Çözülen" stroke="#22c55e" dot={false} /></LineChart>)}
      <div className="panel p-3"><p className="mb-2 text-sm font-medium">{t("queue")}</p>
        <ul className="max-h-48 space-y-1 overflow-auto text-xs">{queue.map((r) => (
          <li key={r.id} className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${selected === r.id ? "bg-zinc-800" : ""}`}>
            <button onClick={() => onSelect(r.id)} className="flex-1 truncate text-left"><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[r.status] }} />{r.id} · {t("c:" + r.cat)} · {r.hood} · P{r.priority} {riskBadge(r, t)}</button>
            {r.status === "pending" ? <button onClick={() => onDispatch(r.id)} className="rounded bg-white px-2 py-0.5 font-medium text-black">{t("dispatch")}</button> : <span className="text-zinc-400">{t("s:" + r.status)}</span>}
          </li>))}</ul></div>
      <div className="rounded-lg border border-zinc-700 bg-black p-3"><p className="mb-2 text-sm font-medium">{t("log")}</p>
        <div ref={box} className="h-36 space-y-0.5 overflow-auto font-mono text-[11px]">{logs.length === 0 && <p className="text-zinc-500">{t("log_empty")}</p>}{logs.map((l, i) => <p key={i} className={l.c}><span className="text-zinc-600">{l.t}</span> {l.m}</p>)}</div></div>
    </section>
  );
}
