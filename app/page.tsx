"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, Smartphone, Download, Camera, AlertTriangle, Truck, Gift, WifiOff, Wifi, Activity, LogOut } from "lucide-react";
import BesiktasMap from "@/components/BesiktasMap";
import Tracker from "@/components/Tracker";
import ReportForm from "@/components/ReportForm";
import CommandPanel, { LogLine } from "@/components/CommandPanel";
import { BASE, CATS, DEFAULT_LOC, Report, Scan, Status, TEAMS, hoodOf, slug, streetOf } from "@/lib/data";
import AuthGate, { Sess } from "@/components/AuthGate";
import { supabase } from "@/lib/supabase";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { id: string; code: string; category: string; department: string; sla: string | null; status: Status; x: number | null; y: number | null; hood: string | null; street: string | null; description: string | null; supporters: number; team: string | null; photo_path: string | null; created_by: string | null; created_at: string };
const toReport = (r: Row, uid: string): Report => ({
  id: r.code, uid: r.id, x: r.x ?? 0, y: r.y ?? 0, cat: r.category, dept: r.department, sla: r.sla ?? "", status: r.status,
  supporters: r.supporters, team: r.team ?? "—", hood: r.hood ?? "", street: r.street ?? "", desc: r.description ?? "",
  ageH: (Date.now() - new Date(r.created_at).getTime()) / 36e5, photo: r.photo_path ?? undefined, mine: r.created_by === uid,
});

function App({ user, role, signOut: onSignOut }: Sess) {
  const staff = role === "supervisor" || role === "field";
  const [mode, setMode] = useState<"citizen" | "command">("citizen");
  const [dbReports, setDbReports] = useState<Report[]>([]);
  const [etas, setEtas] = useState<Record<string, number>>({});
  const [rewarded, setRewarded] = useState<string[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [scan, setScan] = useState<Scan>({ phase: "idle" });
  const [dup, setDup] = useState<Report | null>(null);
  const [toast, setToast] = useState("");
  const [offline, setOffline] = useState(false);
  const [queue, setQueue] = useState<Record<string, unknown>[]>([]);
  const [karma, setKarma] = useState(120);
  const [vehicle, setVehicle] = useState<{ x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>();
  const [pick, setPick] = useState(DEFAULT_LOC);
  const reports = dbReports.map((r) => ({ ...r, eta: etas[r.id] ?? r.eta, rewarded: rewarded.includes(r.id) }));
  const rep = useRef(reports); rep.current = reports;
  const off = useRef(offline); off.current = offline;
  const busy = useRef(false);

  const log = (m: string, c = "text-zinc-300") => setLogs((l) => [...l.slice(-60), { t: new Date().toLocaleTimeString("tr-TR"), m, c }]);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  async function load() {
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: true });
    if (error) return notify("Veri alınamadı: " + error.message);
    setDbReports((data as Row[]).map((r) => toReport(r, user.id)));
  }
  useEffect(() => {
    load();
    const ch = supabase.channel("reports-live").on("postgres_changes", { event: "*", schema: "public", table: "reports" }, () => load()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  useEffect(() => { try { setQueue(JSON.parse(localStorage.getItem("bs-queue") || "[]")); } catch {} }, []);
  useEffect(() => { try { localStorage.setItem("bs-queue", JSON.stringify(queue)); } catch {} }, [queue]);
  const selPhoto = reports.find((x) => x.id === selected)?.photo;
  useEffect(() => {
    setPhotoUrl(undefined);
    if (selPhoto) supabase.storage.from("report-photos").createSignedUrl(selPhoto, 300).then(({ data }) => setPhotoUrl(data?.signedUrl));
  }, [selPhoto]);

  async function submit(loc = pick, catName?: string, file?: File) {
    if (busy.current) return;
    busy.current = true;
    try {
      setScan({ phase: "scanning" });
      log("[IMAGE_RECEIVED] fotoğraf alındı");
      await sleep(1500);
      const names = Object.keys(CATS);
      const cat = catName ?? names[Math.floor(Math.random() * names.length)];
      const conf = Math.round(90 + Math.random() * 8);
      setScan({ phase: "done", cat, conf });
      log(`[IMAGE_ANALYZED] ${cat} (%${conf})`, "text-cyan-400");
      await sleep(800);
      const d = rep.current.find((r) => r.status !== "resolved" && r.ageH < 48 && Math.hypot(r.x - loc.x, r.y - loc.y) < 30);
      if (d) { log(`[DUPLICATE_DETECTED] ${d.id} ile eşleşti (50 m / 48 sa)`, "text-amber-400"); setDup(d); return; }
      log("[DUPLICATE_CHECK_PASSED]", "text-emerald-400");
      const { dept, sla } = CATS[cat];
      const hood = hoodOf(loc.x, loc.y);
      const payload: Record<string, unknown> = { category: cat, department: dept, sla, status: "pending", x: loc.x, y: loc.y, hood, street: streetOf(hood), description: `${hood} bölgesinde ${cat.toLowerCase()}`, supporters: 1 };
      if (off.current) { setQueue((q) => [...q, payload]); log("[OFFLINE_QUEUED] ihbar cihazda saklandı", "text-amber-400"); notify("Bağlantı yok: ihbar cihazda saklandı"); return; }
      if (file) {
        const path = `${user.id}/${crypto.randomUUID()}.${(file.name.split(".").pop() || "jpg").toLowerCase()}`;
        const { error: ue } = await supabase.storage.from("report-photos").upload(path, file);
        if (ue) notify("Fotoğraf yüklenemedi: " + ue.message); else payload.photo_path = path;
      }
      const { data, error } = await supabase.from("reports").insert(payload).select().single();
      if (error) return notify("İhbar kaydedilemedi: " + error.message);
      await load(); setSelected((data as Row).code);
      log(`[AUTO_DISPATCHED_TO_${slug(dept)}] SLA ${sla}`, "text-fuchsia-400");
      notify(`${(data as Row).code} oluşturuldu → ${dept}`);
    } finally { busy.current = false; }
  }

  async function dispatch(id?: string) {
    if (!staff) return notify("Ekip yönlendirmek için amir veya saha hesabı gerekir");
    const pend = rep.current.filter((r) => r.status === "pending");
    const t = pend.find((r) => r.id === id) || pend.find((r) => r.id === selected) || pend.find((r) => r.mine) || pend[0];
    if (!t) return notify("Bekleyen ihbar yok");
    const team = TEAMS[t.dept];
    const set = async (status: Status, tm?: string) => {
      const { error } = await supabase.from("reports").update(tm ? { status, team: tm } : { status }).eq("code", t.id);
      if (error) notify("Güncellenemedi: " + error.message);
      else await load();
      return !error;
    };
    if (!(await set("enroute", team))) return;
    setSelected(t.id); log(`[TEAM_EN_ROUTE] ${team} → ${t.id}`, "text-yellow-400");
    const N = 30;
    for (let i = 1; i <= N; i++) {
      await sleep(110);
      setVehicle({ x: BASE.x + ((t.x - BASE.x) * i) / N, y: BASE.y + ((t.y - BASE.y) * i) / N });
      if (i % 3 === 0) setEtas((e) => ({ ...e, [t.id]: Math.max(1, Math.ceil(14 * (1 - i / N))) }));
    }
    await set("working"); log("[REPAIR_IN_PROGRESS]", "text-yellow-400");
    await sleep(2200);
    await set("resolved"); setVehicle(null); log(`[TICKET_RESOLVED] ${t.id}`, "text-emerald-400");
    notify(t.mine ? "İhbarınız çözüldü! Karma puanınızı alabilirsiniz." : `${t.id} çözüldü`);
  }

  function claim() {
    const r = rep.current.find((x) => x.mine && x.status === "resolved" && !x.rewarded);
    if (!r) return notify("Puan için önce bir ihbarın çözülmesi gerekir");
    setRewarded((x) => [...x, r.id]); setKarma((k) => k + 50); log(`[KARMA_AWARDED] +50 → ${r.id}`, "text-emerald-400");
    notify("Tebrikler! İhbarınız çözüldü, 50 Beşiktaş Puan kazandınız.");
  }

  async function supportDup() {
    if (!dup) return;
    const { error } = await supabase.rpc("add_supporter", { rid: dup.uid });
    if (error) return notify("Destek eklenemedi: " + error.message);
    log(`[SUPPORTER_ADDED] ${dup.id}`, "text-emerald-400"); setSelected(dup.id); setDup(null); await load();
    notify("İki kayıt birleştirildi, takipçi olarak eklendiniz.");
  }

  async function toggleOffline() {
    if (offline && queue.length) {
      const { error } = await supabase.from("reports").insert(queue);
      if (error) return notify("Eşitlenemedi: " + error.message);
      log(`[SYNC_COMPLETE] ${queue.length} ihbar merkeze eşitlendi`, "text-emerald-400");
      notify(`${queue.length} bekleyen ihbar merkeze eşitlendi`); setQueue([]); await load();
    }
    setOffline(!offline);
  }

  const demo = "flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm transition hover:bg-white/10";
  return (
    <main className="mx-auto max-w-7xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-black shadow-[0_0_32px_rgba(255,255,255,.25)]"><Shield size={24} /></div>
          <div><p className="text-xs text-zinc-400">Beşiktaş Belediyesi · Bilgi İşlem Müdürlüğü</p><h1 className="text-2xl font-bold tracking-tight">Beşiktaş Sokak – Akıllı İhbar Portalı</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex overflow-hidden rounded-full border border-white/15 bg-black/30 p-0.5">
            <button onClick={() => setMode("citizen")} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${mode === "citizen" ? "bg-white font-medium text-black" : "text-zinc-300"}`}><Smartphone size={14} /> Vatandaş modu</button>
            <button disabled={role !== "supervisor"} title="Sadece amir hesapları" onClick={() => setMode("command")} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition disabled:opacity-40 ${mode === "command" ? "bg-white font-medium text-black" : "text-zinc-300"}`}><Shield size={14} /> Amir komuta paneli</button>
          </div>
          <button onClick={onSignOut} className={demo}><LogOut size={14} /> {user.email}</button>
          <button onClick={() => window.print()} className={demo}><Download size={14} /> Saha operasyon raporu (PDF)</button>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {([["Canlı ihbar", String(1284 + reports.length), "bugün +" + (reports.length + 38)], ["Çözüm oranı", "%94", "son 30 gün"], ["Ort. müdahale (MTTR)", "42 dk", "hedef 60 dk"], ["Sahadaki ekip", String(reports.filter((r) => r.status === "enroute" || r.status === "working").length), "4 müdürlük"]] as const).map(([k, v, n]) => (
          <div key={k} className="panel px-4 py-3"><p className="flex items-center gap-1.5 text-xs text-zinc-400">{k === "Canlı ihbar" && <Activity size={12} className="text-emerald-400" />}{k}</p><p className="text-3xl font-bold tabular-nums">{v}</p><p className="text-[11px] text-zinc-500">{n}</p></div>
        ))}
      </div>

      <div className="no-print flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-zinc-400">Demo akışı</span>
        <button className={demo} onClick={() => { setPick(DEFAULT_LOC); setMode("citizen"); submit(DEFAULT_LOC, "Bozuk Asfalt"); }}><b className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] text-black">1</b> <Camera size={14} /> İhbar simüle et</button>
        <button className={demo} onClick={() => { setMode("citizen"); submit({ x: DEFAULT_LOC.x + 3, y: DEFAULT_LOC.y + 3 }, "Bozuk Asfalt"); }}><b className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] text-black">2</b> <AlertTriangle size={14} /> Mükerrer ihbar yakala</button>
        <button className={demo} onClick={() => dispatch()}><b className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] text-black">3</b> <Truck size={14} /> Saha ekibini yönlendir</button>
        <button className={demo} onClick={claim}><b className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] text-black">4</b> <Gift size={14} /> Karma puan kazan</button>
        <button className={`${demo} ml-auto`} onClick={toggleOffline}>{offline ? <WifiOff size={14} className="text-amber-400" /> : <Wifi size={14} />} {offline ? "Çevrimdışı (bağlantıyı aç)" : "Maç günü / afet modu"}</button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <BesiktasMap photoUrl={photoUrl} reports={reports} vehicle={vehicle} selected={selected} onSelect={setSelected} pick={pick} onPick={setPick} showPick={mode === "citizen"} />
        {mode === "citizen"
          ? <div className="space-y-4"><ReportForm scan={scan} pick={pick} offline={offline} queueLen={queue.length} karma={karma} onSubmit={(f) => submit(pick, undefined, f)} onClaim={claim} /><Tracker r={[...reports].reverse().find((x) => x.mine)} /></div>
          : <CommandPanel reports={reports} logs={logs} selected={selected} onSelect={setSelected} onDispatch={dispatch} />}
      </div>

      <AnimatePresence>
        {dup && (
          <motion.div key="dup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="w-full max-w-md rounded-lg border border-amber-500/60 bg-zinc-950 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-300"><AlertTriangle size={18} /> Mükerrer ihbar algılandı</h2>
              <p className="mt-2 text-sm text-zinc-300">Bu sorun {dup.street} üzerinde {dup.ageH < 1 ? "az önce" : `${Math.round(dup.ageH)} saat önce`} bildirildi ({dup.id}). “Ben de destekliyorum” diyerek süreci hızlandırabilirsiniz; yeni bilet açılmaz.</p>
              <div className="mt-4 flex gap-2">
                <button onClick={supportDup} className="flex-1 rounded bg-white py-2 text-sm font-semibold text-black">Ben de destekliyorum</button>
                <button onClick={() => setDup(null)} className="rounded border border-zinc-600 px-4 text-sm">Kapat</button>
              </div>
            </motion.div>
          </motion.div>
        )}
        {toast && (
          <motion.div key="toast" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-xl">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

export default function Page() {
  return <AuthGate>{(s) => <App {...s} />}</AuthGate>;
}
