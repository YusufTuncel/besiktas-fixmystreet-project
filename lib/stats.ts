import { CATS, DEPTS, HOODS, Report } from "./data";
import { slaHours } from "./smart";
export interface Stats { kpi: { total: number; open: number; resolved: number; mttrH: number; slaPct: number; active: number }; byDept: any[]; byHood: any[]; trend: any[]; leaders: { users: { name: string; karma: number }[]; hoods: { name: string; solved: number }[] } }
export function computeStats(rs: Report[], users: { name: string; karma: number }[]): Stats {
  const now = Date.now(), D = 864e5, isOpen = (r: Report) => r.status !== "resolved";
  const done = rs.filter((r) => r.status === "resolved" && r.resolvedAt);
  const hrs = (r: Report) => (r.resolvedAt! - r.createdAt) / 3600e3;
  const mttrH = done.length ? done.reduce((a, r) => a + hrs(r), 0) / done.length : 0;
  const slaPct = done.length ? Math.round((done.filter((r) => hrs(r) <= slaHours(CATS[r.cat]?.sla ?? r.sla)).length / done.length) * 100) : 100;
  const byDept = DEPTS.map((n) => { const x = rs.filter((r) => r.dept === n); return { name: n, Bekleyen: x.filter((r) => r.status === "pending").length, "Devam eden": x.filter((r) => r.status === "enroute" || r.status === "working").length, Çözüldü: x.filter((r) => r.status === "resolved").length }; });
  const byHood = HOODS.map((h) => { const x = rs.filter((r) => r.hood === h.name); return { name: h.name, Açık: x.filter(isOpen).length, Çözüldü: x.length - x.filter(isOpen).length }; });
  const trend = Array.from({ length: 7 }, (_, i) => { const t0 = now - (6 - i) * D, inDay = (t: number) => t > t0 - D / 2 && t <= t0 + D / 2; return { day: new Date(t0).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" }), Yeni: rs.filter((r) => inDay(r.createdAt)).length, Çözülen: rs.filter((r) => r.resolvedAt && inDay(r.resolvedAt)).length }; });
  const hoods = HOODS.map((h) => ({ name: h.name, solved: rs.filter((r) => r.hood === h.name && r.status === "resolved").length })).sort((a, b) => b.solved - a.solved);
  return { kpi: { total: rs.length, open: rs.filter(isOpen).length, resolved: done.length, mttrH: Math.round(mttrH * 10) / 10, slaPct, active: rs.filter((r) => r.status === "enroute" || r.status === "working").length }, byDept, byHood, trend, leaders: { users, hoods } };
}
