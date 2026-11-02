"use client";
import { useEffect, useRef } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DEPTS, Report, STATUS_COLOR, STATUS_LABEL } from "@/lib/data";

export interface LogLine { t: string; m: string; c: string }
interface Props { reports: Report[]; logs: LogLine[]; selected: string | null; onSelect: (id: string) => void; onDispatch: (id: string) => void }

export default function CommandPanel({ reports, logs, selected, onSelect, onDispatch }: Props) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => { box.current?.scrollTo({ top: box.current.scrollHeight }); }, [logs]);
  const data = DEPTS.map((d) => {
    const rs = reports.filter((r) => r.dept === d);
    return { name: d, Bekleyen: rs.filter((r) => r.status === "pending").length, "Devam eden": rs.filter((r) => r.status === "enroute" || r.status === "working").length, Çözüldü: rs.filter((r) => r.status === "resolved").length };
  });
  const open = reports.filter((r) => r.status !== "resolved").length;
  const stats = [["Açık ihbar", String(open)], ["Çözülen", String(reports.length - open)], ["Ortalama müdahale (MTTR)", "42 dk"], ["SLA uyumu", "%94"]];
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {stats.map(([k, v]) => (
          <div key={k} className="panel p-3"><p className="text-xs text-zinc-400">{k}</p><p className="text-2xl font-semibold">{v}</p></div>
        ))}
      </div>

      <div className="panel p-3">
        <p className="mb-2 text-sm font-medium">Müdürlüklere göre bilet dağılımı</p>
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#a1a1aa", fontSize: 10 }} width={20} />
              <Tooltip contentStyle={{ background: "#09090b", border: "1px solid #3f3f46" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Bekleyen" stackId="a" fill={STATUS_COLOR.pending} />
              <Bar dataKey="Devam eden" stackId="a" fill={STATUS_COLOR.enroute} />
              <Bar dataKey="Çözüldü" stackId="a" fill={STATUS_COLOR.resolved} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-3">
        <p className="mb-2 text-sm font-medium">İhbar kuyruğu</p>
        <ul className="max-h-40 space-y-1 overflow-auto text-xs">
          {reports.filter((r) => r.status !== "resolved").map((r) => (
            <li key={r.id} className={`flex items-center justify-between gap-2 rounded px-2 py-1 ${selected === r.id ? "bg-zinc-800" : ""}`}>
              <button onClick={() => onSelect(r.id)} className="flex-1 truncate text-left"><i className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[r.status] }} />{r.id} · {r.cat} · {r.hood}</button>
              {r.status === "pending" ? <button onClick={() => onDispatch(r.id)} className="rounded bg-white px-2 py-0.5 font-medium text-black">Ekip yönlendir</button> : <span className="text-zinc-400">{STATUS_LABEL[r.status]}</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg border border-zinc-700 bg-black p-3">
        <p className="mb-2 text-sm font-medium">Canlı işlem günlüğü</p>
        <div ref={box} className="h-40 space-y-0.5 overflow-auto font-mono text-[11px]">
          {logs.length === 0 && <p className="text-zinc-500">Simülasyon başlatıldığında kayıtlar burada akar.</p>}
          {logs.map((l, i) => <p key={i} className={l.c}><span className="text-zinc-600">{l.t}</span> {l.m}</p>)}
        </div>
      </div>
    </section>
  );
}
