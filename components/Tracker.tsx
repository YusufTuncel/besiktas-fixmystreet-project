import { ClipboardCheck, Truck, Wrench, CheckCircle2 } from "lucide-react";
import { Report, STEPS, STEP_IDX, STATUS_COLOR } from "@/lib/data";
const icons = [ClipboardCheck, Truck, Wrench, CheckCircle2];
export default function Tracker({ r }: { r?: Report }) {
  if (!r) return <div className="panel p-4 text-sm text-zinc-400">İhbar gönderdiğinde ekibin canlı durumu burada görünür.</div>;
  const idx = STEP_IDX[r.status], col = STATUS_COLOR[r.status];
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between text-sm"><b>{r.id} · {r.cat}</b><span className="text-zinc-400">{r.team}</span></div>
      <p className="mt-1 text-xs text-zinc-400">{r.status === "enroute" && r.eta ? `Ekip yolda · tahmini varış ${r.eta} dk` : r.status === "pending" ? `${r.dept} birimine atandı · SLA ${r.sla}` : r.status === "working" ? "Ekip noktada, onarım sürüyor" : "Sorun giderildi"}</p>
      <ol className="mt-4 flex items-start">
        {STEPS.map((s, i) => { const I = icons[i], done = i <= idx; return (
          <li key={s} className="relative flex flex-1 flex-col items-center gap-1 text-center">
            {i > 0 && <span className="absolute right-1/2 top-4 h-0.5 w-full" style={{ background: done ? col : "#27272a" }} />}
            <span className="relative grid h-8 w-8 place-items-center rounded-full border transition-colors duration-500" style={{ background: done ? col : "#0a0c10", borderColor: done ? col : "#3f3f46", color: done ? "#000" : "#71717a" }}><I size={15} /></span>
            <span className={`text-[10px] ${done ? "text-zinc-200" : "text-zinc-500"}`}>{s}</span>
          </li>); })}
      </ol>
    </div>
  );
}
