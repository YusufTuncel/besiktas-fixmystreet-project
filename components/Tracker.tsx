import { ClipboardCheck, Truck, Wrench, CheckCircle2 } from "lucide-react";
import { Report, STEP_IDX, STATUS_COLOR } from "@/lib/data";
import { T } from "@/lib/i18n";
const icons = [ClipboardCheck, Truck, Wrench, CheckCircle2];
export default function Tracker({ r, t }: { r?: Report; t: T }) {
  if (!r) return <div className="panel p-4 text-sm text-zinc-400">{t("tr_empty")}</div>;
  const idx = STEP_IDX[r.status], col = STATUS_COLOR[r.status];
  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between text-sm"><b>{r.id} · {t("c:" + r.cat)}</b><span className="text-zinc-400">{r.team}</span></div>
      <p className="mt-1 text-xs text-zinc-400" aria-live="polite">{t("s:" + r.status)}{r.status === "enroute" && r.eta ? ` · ${r.eta} dk` : ""} · {r.dept} · SLA {r.sla}</p>
      <ol className="mt-4 flex items-start">
        {[0, 1, 2, 3].map((i) => { const I = icons[i], done = i <= idx; return (
          <li key={i} className="relative flex flex-1 flex-col items-center gap-1 text-center">
            {i > 0 && <span className="absolute right-1/2 top-4 h-0.5 w-full" style={{ background: done ? col : "#27272a" }} />}
            <span className="relative grid h-8 w-8 place-items-center rounded-full border transition-colors duration-500" style={{ background: done ? col : "#0a0c10", borderColor: done ? col : "#3f3f46", color: done ? "#000" : "#71717a" }}><I size={15} /></span>
            <span className={`text-[10px] ${done ? "text-zinc-200" : "text-zinc-500"}`}>{t("st" + i)}</span>
          </li>); })}
      </ol>
    </div>
  );
}
