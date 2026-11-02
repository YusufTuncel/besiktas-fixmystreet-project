"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Shield, Smartphone, Download, Camera, AlertTriangle, Truck, CheckCircle2, WifiOff, Wifi, Activity, LogOut } from "lucide-react";
import dynamic from "next/dynamic";
const BesiktasMap = dynamic(() => import("@/components/BesiktasMap"), { ssr: false, loading: () => <div className="panel grid h-[440px] place-items-center text-sm text-zinc-400">Harita yükleniyor…</div> });
import Tracker from "@/components/Tracker";
import ReportForm, { Draft } from "@/components/ReportForm";
import ReportDetail from "@/components/ReportDetail";
import CommandPanel, { LogLine } from "@/components/CommandPanel";
import AuthGate, { Sess } from "@/components/AuthGate";
import { HoodList, Leaders, Notifs } from "@/components/Panels";
import { BASE, CATS, DEFAULT_LOC, Notif, PubUser, Report, Role, Scan, Status, TEAMS, hoodOf, slug, streetOf } from "@/lib/data";
import { Lang, LANGS, mk } from "@/lib/i18n";
import { priority } from "@/lib/smart";
import { computeStats } from "@/lib/stats";
import { supabase } from "@/lib/supabase";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type Tab = "report" | "hood" | "lead" | "notif";
type Row = { id: string; code: string; category: string; department: string; sla: string | null; status: Status; x: number | null; y: number | null; hood: string | null; street: string | null; description: string | null; supporters: number; team: string | null; photo_path: string | null; after_photo_path: string | null; created_by: string | null; created_at: string; resolved_at: string | null; confirmed: boolean | null; hidden: boolean | null; anonymous: boolean | null; rewarded: boolean | null };
type CRow = { id: string; report_id: string; author: string | null; role: string | null; body: string; hidden: boolean | null; created_at: string };
const store = {
  get: <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || "") as T; } catch { return d; } },
  set: (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const blobOf = async (dataUrl: string) => (await fetch(dataUrl)).blob();

function App({ user, role, signOut }: Sess) {
  const staff = role === "supervisor" || role === "field", sup = role === "supervisor";
  const [mode, setMode] = useState<"citizen" | "command">("citizen"), [tab, setTab] = useState<Tab>("report");
  const [rows, setRows] = useState<Row[]>([]), [comments, setComments] = useState<CRow[]>([]), [votes, setVotes] = useState<string[]>([]), [follows, setFollows] = useState<string[]>([]);
  const [notifs, setNotifs] = useState<Notif[]>([]), [lb, setLb] = useState<{ name: string; karma: number }[]>([]), [me, setMe] = useState({ karma: 0, hoods: [] as string[], name: "" });
  const [etas, setEtas] = useState<Record<string, number>>({}), [logs, setLogs] = useState<LogLine[]>([]), [scan, setScan] = useState<Scan>({ phase: "idle" });
  const [dup, setDup] = useState<Report | null>(null), [toast, setToast] = useState(""), [offline, setOffline] = useState(false), [queue, setQueue] = useState<Record<string, unknown>[]>([]);
  const [vehicle, setVehicle] = useState<{ x: number; y: number } | null>(null), [selected, setSelected] = useState<string | null>(null), [pick, setPick] = useState(DEFAULT_LOC);
  const [urls, setUrls] = useState<{ before?: string; after?: string }>({}), [heat, setHeat] = useState(false);
  const [lang, setLang] = useState<Lang>("tr"), [hc, setHc] = useState(false), [big, setBig] = useState(false);
  const busy = useRef(false), t = mk(lang), [needsMig, setNeedsMig] = useState(false);

  const reports: Report[] = rows.filter((r) => sup || !r.hidden).map((r) => {
    const cat = r.category, sla = r.sla ?? CATS[cat]?.sla ?? "24 saat", createdAt = Date.parse(r.created_at), ageH = (Date.now() - createdAt) / 36e5, hood = r.hood ?? hoodOf(r.x ?? 0, r.y ?? 0);
    return {
      id: r.code, uid: r.id, x: r.x ?? 0, y: r.y ?? 0, cat, dept: r.department, sla, status: r.status, supporters: r.supporters, team: r.team ?? "—", hood, street: r.street ?? streetOf(hood), desc: r.description ?? "",
      ageH, eta: etas[r.code], mine: r.created_by === user.id, rewarded: !!r.rewarded, createdAt, resolvedAt: r.resolved_at ? Date.parse(r.resolved_at) : undefined, anonymous: !!r.anonymous,
      hasPhoto: !!r.photo_path, hasAfter: !!r.after_photo_path, photo: r.photo_path ?? undefined, afterPhoto: r.after_photo_path ?? undefined, voted: votes.includes(r.id), following: follows.includes(r.id),
      confirmed: !!r.confirmed, hidden: !!r.hidden, priority: priority(cat, r.supporters, ageH, sla),
      comments: comments.filter((c) => c.report_id === r.id && (sup || !c.hidden)).map((c) => ({ id: c.id, by: c.author ?? "—", role: c.role ?? "citizen", text: c.body, t: Date.parse(c.created_at), hidden: !!c.hidden })),
    };
  });
  const rep = useRef(reports); rep.current = reports;
  const off = useRef(offline); off.current = offline;
  const stats = computeStats(reports, lb);

  const log = (m: string, c = "text-zinc-300") => setLogs((l) => [...l.slice(-60), { t: new Date().toLocaleTimeString("tr-TR"), m, c }]);
  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4000); };

  const load = useCallback(async () => {
    const [r, v, f, c, n, p, l] = await Promise.all([
      supabase.from("reports").select("*").order("created_at", { ascending: true }),
      supabase.from("report_votes").select("report_id").eq("user_id", user.id),
      supabase.from("report_follows").select("report_id").eq("user_id", user.id),
      supabase.from("comments").select("*").order("created_at", { ascending: true }),
      supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("leaderboard").select("*"),
    ]);
    if (r.error) return notify("Veri alınamadı: " + r.error.message);
    setRows(r.data as Row[]);
    if (v.error || c.error || n.error) { setNeedsMig(true); return; }
    setNeedsMig(false);
    setVotes((v.data ?? []).map((x: any) => x.report_id)); setFollows((f.data ?? []).map((x: any) => x.report_id)); setComments(c.data as CRow[]);
    setNotifs((n.data ?? []).map((x: any) => ({ id: x.id, text: x.body, t: Date.parse(x.created_at), read: x.read, rid: (r.data as Row[]).find((y) => y.id === x.report_id)?.code })));
    if (p.data) setMe({ karma: p.data.karma ?? 0, hoods: p.data.hoods ?? [], name: p.data.full_name ?? "" });
    setLb((l.data ?? []).map((x: any) => ({ name: x.full_name, karma: x.karma })));
  }, [user.id]);

  useEffect(() => {
    load();
    let tm: ReturnType<typeof setTimeout>;
    const again = () => { clearTimeout(tm); tm = setTimeout(load, 300); };
    let ch = supabase.channel("bs-live");
    for (const table of ["reports", "comments", "report_votes", "notifications"]) ch = ch.on("postgres_changes", { event: "*", schema: "public", table }, again);
    ch.subscribe();
    return () => { clearTimeout(tm); supabase.removeChannel(ch); };
  }, [load]);
  useEffect(() => {
    setQueue(store.get("bs-queue", [])); setLang(store.get("bs-lang", "tr")); setHc(store.get("bs-hc", false)); setBig(store.get("bs-big", false));
  }, []);
  useEffect(() => {
    const e = document.documentElement; e.lang = lang; e.dir = lang === "ar" ? "rtl" : "ltr"; e.classList.toggle("hc", hc); e.classList.toggle("big", big);
    store.set("bs-lang", lang); store.set("bs-hc", hc); store.set("bs-big", big);
  }, [lang, hc, big]);
  useEffect(() => store.set("bs-queue", queue), [queue]);

  const sel = reports.find((r) => r.id === selected), selB = sel?.photo, selA = sel?.afterPhoto;
  useEffect(() => {
    setUrls({});
    const sign = async (p: string | undefined, k: "before" | "after") => { if (p) { const { data } = await supabase.storage.from("report-photos").createSignedUrl(p, 300); setUrls((u) => ({ ...u, [k]: data?.signedUrl })); } };
    sign(selB, "before"); sign(selA, "after");
  }, [selB, selA]);

  async function upload(dataUrl: string): Promise<string | null> {
    const path = `${user.id}/${crypto.randomUUID()}.jpg`;
    const { error } = await supabase.storage.from("report-photos").upload(path, await blobOf(dataUrl), { contentType: "image/jpeg" });
    if (error) { notify("Fotoğraf yüklenemedi: " + error.message); return null; }
    return path;
  }

  // ihbar üzerindeki tüm eylemler (id = kod, örn. BS-2041)
  async function act(code: string, b: Record<string, unknown>) {
    const r = rep.current.find((x) => x.id === code); if (!r) return;
    let err: { message: string } | null = null;
    switch (b.action) {
      case "vote": err = (r.voted ? await supabase.from("report_votes").delete().eq("report_id", r.uid).eq("user_id", user.id) : await supabase.from("report_votes").insert({ report_id: r.uid })).error; break;
      case "follow": err = (r.following ? await supabase.from("report_follows").delete().eq("report_id", r.uid).eq("user_id", user.id) : await supabase.from("report_follows").insert({ report_id: r.uid })).error; break;
      case "comment": case "reply": err = (await supabase.from("comments").insert({ report_id: r.uid, body: String(b.text).slice(0, 300) })).error; break;
      case "confirm": err = (await supabase.rpc("confirm_report", { rid: r.uid, ok: !!b.ok })).error; log(`[${b.ok ? "KARMA_AWARDED +50" : "TICKET_REOPENED"}] ${code}`, b.ok ? "text-emerald-400" : "text-amber-400"); break;
      case "moderate": err = (b.commentId ? await supabase.rpc("moderate_comment", { cid: b.commentId }) : await supabase.rpc("moderate_report", { rid: r.uid, hide: !!b.hide })).error; break;
      case "status": {
        const patch: Record<string, unknown> = {};
        if (b.status) patch.status = b.status;
        if (b.status === "enroute") patch.team = TEAMS[r.dept];
        if (b.after) { const p = await upload(b.after as string); if (!p) return; patch.after_photo_path = p; }
        err = (await supabase.from("reports").update(patch).eq("id", r.uid)).error; break;
      }
    }
    if (err) return notify("⚠ " + err.message);
    await load();
  }

  async function submit(d: Draft, loc = pick) {
    if (busy.current) return; busy.current = true;
    try {
      if (d.photo || !d.desc) { setScan({ phase: "scanning" }); log("[IMAGE_RECEIVED] fotoğraf alındı"); await sleep(1300); const conf = Math.round(90 + Math.random() * 8); setScan({ phase: "done", cat: d.cat, conf }); log(`[IMAGE_ANALYZED] ${d.cat} (%${conf})`, "text-cyan-400"); await sleep(600); }
      const near = rep.current.find((r) => r.status !== "resolved" && r.cat === d.cat && r.ageH < 48 && Math.hypot(r.x - loc.x, r.y - loc.y) < 30);
      if (near) { log(`[DUPLICATE_DETECTED] ${near.id} ile eşleşti (50 m / 48 sa)`, "text-amber-400"); setDup(near); return; }
      log("[DUPLICATE_CHECK_PASSED]", "text-emerald-400");
      const { dept, sla } = CATS[d.cat], hood = hoodOf(loc.x, loc.y);
      const payload: Record<string, unknown> = { category: d.cat, department: dept, sla, status: "pending", x: loc.x, y: loc.y, hood, street: streetOf(hood), description: d.desc.trim().slice(0, 300) || `${hood} bölgesinde ${d.cat.toLowerCase()}`, supporters: 0, anonymous: d.anonymous };
      if (off.current) { setQueue((q) => [...q, payload]); log("[OFFLINE_QUEUED] ihbar cihazda saklandı", "text-amber-400"); return notify(t("offline_on")); }
      if (d.photo) { const p = await upload(d.photo); if (p) payload.photo_path = p; }
      const { data, error } = await supabase.from("reports").insert(payload).select().single();
      if (error) return notify("İhbar kaydedilemedi: " + error.message);
      await load(); setSelected((data as Row).code);
      log(`[AUTO_DISPATCHED_TO_${slug(dept)}] SLA ${sla}`, "text-fuchsia-400"); notify(`${(data as Row).code} → ${dept}`);
    } finally { busy.current = false; }
  }

  async function dispatch(id?: string) {
    if (!staff) return notify("Ekip yönlendirmek için amir veya saha hesabı gerekir");
    const pend = rep.current.filter((r) => r.status === "pending").sort((a, b) => b.priority - a.priority);
    const tg = pend.find((r) => r.id === id) || pend.find((r) => r.id === selected) || pend.find((r) => r.mine) || pend[0];
    if (!tg) return notify("—");
    const set = async (status: Status) => { const { error } = await supabase.from("reports").update(status === "enroute" ? { status, team: TEAMS[tg.dept] } : { status }).eq("id", tg.uid); if (error) notify("Güncellenemedi: " + error.message); else await load(); return !error; };
    if (!(await set("enroute"))) return;
    setSelected(tg.id); log(`[TEAM_EN_ROUTE] ${TEAMS[tg.dept]} → ${tg.id}`, "text-yellow-400");
    const N = 30; for (let i = 1; i <= N; i++) { await sleep(110); setVehicle({ x: BASE.x + ((tg.x - BASE.x) * i) / N, y: BASE.y + ((tg.y - BASE.y) * i) / N }); if (i % 3 === 0) setEtas((e) => ({ ...e, [tg.id]: Math.max(1, Math.ceil(14 * (1 - i / N))) })); }
    await set("working"); log("[REPAIR_IN_PROGRESS]", "text-yellow-400"); await sleep(1800);
    await set("resolved"); setVehicle(null); log(`[TICKET_RESOLVED] ${tg.id} — vatandaş onayı bekleniyor`, "text-emerald-400");
  }

  function confirmMine() {
    const r = rep.current.find((x) => x.mine && x.status === "resolved" && !x.confirmed);
    if (!r) return notify(t("confirm_q"));
    act(r.id, { action: "confirm", ok: true });
  }
  async function toggleOffline() {
    if (offline && queue.length) {
      const { error } = await supabase.from("reports").insert(queue);
      if (error) return notify("Eşitlenemedi: " + error.message);
      log(`[SYNC_COMPLETE] ${queue.length} ihbar merkeze eşitlendi`, "text-emerald-400"); setQueue([]); await load();
    }
    setOffline(!offline);
  }
  const supportDup = async () => { if (!dup) return; if (!dup.voted) await act(dup.id, { action: "vote" }); setSelected(dup.id); setDup(null); };
  const setSubs = async (h: string[]) => { const { error } = await supabase.rpc("set_hoods", { h }); if (error) notify(error.message); else load(); };
  const readAll = async () => { await supabase.from("notifications").update({ read: true }).eq("user_id", user.id); load(); };
  function exportCsv() {
    const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows2 = reports.map((r) => [r.id, r.cat, r.dept, r.hood, r.status, r.supporters, r.priority, new Date(r.createdAt).toISOString(), r.resolvedAt ? new Date(r.resolvedAt).toISOString() : "", r.desc]);
    const csv = "\uFEFF" + [["ID", "Kategori", "Müdürlük", "Mahalle", "Durum", "Destekçi", "Öncelik", "Oluşturma", "Çözüm", "Açıklama"], ...rows2].map((l) => l.map(q).join(";")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); a.download = "ihbarlar.csv"; a.click();
  }

  const pu: PubUser = { id: user.id, name: me.name || user.email || "", role: role as Role, karma: me.karma, hoods: me.hoods };
  const myLast = [...reports].reverse().find((r) => r.mine);
  const demo = "flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm transition hover:bg-white/10";
  const num = (n: number) => <b className="grid h-5 w-5 place-items-center rounded-full bg-white text-[11px] text-black">{n}</b>;
  const unread = notifs.filter((n) => !n.read).length, k = stats.kpi;
  const kpis: [string, string, string][] = [[t("k_live"), String(k.total), `${k.open} ${t("k_open").toLowerCase()}`], [t("k_rate"), `%${Math.round((k.resolved / Math.max(1, k.total)) * 100)}`, `SLA %${k.slaPct}`], [t("k_mttr"), `${k.mttrH} sa`, ""], [t("k_field"), String(k.active), "4"]];
  return (
    <main id="main" className="mx-auto max-w-7xl space-y-4 p-4">
      <a href="#main" className="skip">{t("skip")}</a>
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-black shadow-[0_0_32px_rgba(255,255,255,.25)]"><Shield size={24} /></div>
          <div><p className="text-xs text-zinc-400">{t("org")}</p><h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1></div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="flex overflow-hidden rounded-full border border-white/15 bg-black/30 p-0.5">
            <button onClick={() => setMode("citizen")} aria-pressed={mode === "citizen"} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition ${mode === "citizen" ? "bg-white font-medium text-black" : "text-zinc-300"}`}><Smartphone size={14} /> {t("citizen")}</button>
            <button disabled={!sup} title="Sadece amir hesapları" onClick={() => setMode("command")} aria-pressed={mode === "command"} className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 transition disabled:opacity-40 ${mode === "command" ? "bg-white font-medium text-black" : "text-zinc-300"}`}><Shield size={14} /> {t("command")}</button>
          </div>
          <select aria-label="Language" value={lang} onChange={(e) => setLang(e.target.value as Lang)} className="rounded-full border border-white/15 bg-black/30 px-2 py-1.5">{LANGS.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select>
          <button className={demo} aria-pressed={hc} onClick={() => setHc(!hc)}>◐ {t("contrast")}</button>
          <button className={demo} aria-pressed={big} onClick={() => setBig(!big)}>A+ {t("bigtext")}</button>
          <button onClick={signOut} className={demo}><LogOut size={14} /> {user.email}</button>
          <button onClick={() => window.print()} className={demo}><Download size={14} /> {t("pdf")}</button>
        </div>
      </header>
      {needsMig && <div role="alert" className="rounded-lg border border-amber-500/60 bg-amber-950/50 p-3 text-sm text-amber-200"><b>Yeni özellikler kapalı:</b> veritabanı güncellemesi yapılmamış. Supabase → SQL Editor'de <code>migration.sql</code> dosyasını çalıştırın, sonra sayfayı yenileyin (oy, yorum, bildirim, puan, onay bunlara bağlı).</div>}
      <div className="no-print flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-full bg-emerald-500 px-2 py-0.5 font-semibold text-black">YENİ</span>
        {([["📸 Fotoğraf + öncesi/sonrası", () => { setMode("citizen"); setTab("report"); }], ["🗳 Oylama", () => setTab("hood")], ["💬 Yorum / takip", () => setTab("hood")], ["🔔 Bildirim + abonelik", () => setTab("notif")], ["🏆 Liderlik", () => setTab("lead")], ["🔥 Isı haritası", () => setHeat(!heat)], ["📊 Analitik (amir)", () => (sup ? setMode("command") : notify("Amir hesabı gerekir"))]] as [string, () => void][]).map(([l, f]) => <button key={l} onClick={f} className="rounded-full border border-white/15 px-2.5 py-1 hover:bg-white/10">{l}</button>)}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map(([a, v, n], i) => <div key={i} className="panel px-4 py-3"><p className="flex items-center gap-1.5 text-xs text-zinc-400">{i === 0 && <Activity size={12} className="text-emerald-400" />}{a}</p><p className="text-3xl font-bold tabular-nums">{v}</p><p className="text-[11px] text-zinc-500">{n}</p></div>)}
      </div>
      <div className="no-print flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-zinc-400">{t("demo")}</span>
        <button className={demo} onClick={() => { setPick(DEFAULT_LOC); setMode("citizen"); setTab("report"); submit({ cat: "Bozuk Asfalt", desc: "", anonymous: false }, DEFAULT_LOC); }}>{num(1)} <Camera size={14} /> {t("d1")}</button>
        <button className={demo} onClick={() => { setMode("citizen"); submit({ cat: "Bozuk Asfalt", desc: "", anonymous: false }, { x: DEFAULT_LOC.x + 3, y: DEFAULT_LOC.y + 3 }); }}>{num(2)} <AlertTriangle size={14} /> {t("d2")}</button>
        <button className={demo} onClick={() => dispatch()}>{num(3)} <Truck size={14} /> {t("d3")}</button>
        <button className={demo} onClick={confirmMine}>{num(4)} <CheckCircle2 size={14} /> {t("d4")}</button>
        <button className={`${demo} ms-auto`} onClick={toggleOffline}>{offline ? <WifiOff size={14} className="text-amber-400" /> : <Wifi size={14} />} {offline ? t("offline_off") : t("offline_on")}</button>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-4">
          <BesiktasMap photoUrl={urls.before} reports={reports} vehicle={vehicle} selected={selected} onSelect={setSelected} pick={pick} onPick={setPick} showPick={mode === "citizen"} heat={heat} onHeat={() => setHeat(!heat)} />
          {sel && <ReportDetail r={sel} t={t} user={pu} staff={staff} sup={sup} photoUrl={urls.before} afterUrl={urls.after} onAct={act} onClose={() => setSelected(null)} />}
        </div>
        {mode === "citizen" || !sup ? (
          <div className="space-y-4">
            <div role="tablist" className="flex gap-1 rounded-full border border-white/15 bg-black/30 p-0.5 text-xs">
              {(["report", "hood", "lead", "notif"] as Tab[]).map((k2) => <button key={k2} role="tab" aria-selected={tab === k2} onClick={() => setTab(k2)} className={`flex-1 rounded-full px-2 py-1.5 ${tab === k2 ? "bg-white font-medium text-black" : "text-zinc-300"}`}>{t("tab_" + k2)}{k2 === "notif" && unread > 0 ? ` (${unread})` : ""}</button>)}
            </div>
            {tab === "report" && <><ReportForm t={t} scan={scan} pick={pick} offline={offline} queueLen={queue.length} user={pu} reports={reports} onSubmit={(d) => submit(d)} /><Tracker r={myLast} t={t} /></>}
            {tab === "hood" && <HoodList reports={reports} t={t} selected={selected} onSelect={setSelected} onVote={(id) => act(id, { action: "vote" })} />}
            {tab === "lead" && <Leaders stats={stats} t={t} />}
            {tab === "notif" && <Notifs notifs={notifs} t={t} user={pu} onRead={readAll} onSelect={setSelected} onSubs={setSubs} />}
          </div>
        ) : <CommandPanel t={t} reports={reports} stats={stats} logs={logs} selected={selected} heat={heat} onHeat={() => setHeat(!heat)} onSelect={setSelected} onDispatch={dispatch} onExport={exportCsv} />}
      </div>
      <AnimatePresence>
        {dup && (
          <motion.div key="dup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="alertdialog" aria-label={t("dup_title")}>
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="w-full max-w-md rounded-lg border border-amber-500/60 bg-zinc-950 p-5">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-300"><AlertTriangle size={18} /> {t("dup_title")}</h2>
              <p className="mt-2 text-sm text-zinc-300">{dup.street} · {dup.id} — {t("dup_text")}</p>
              <div className="mt-4 flex gap-2"><button onClick={supportDup} className="flex-1 rounded bg-white py-2 text-sm font-semibold text-black">{t("support")}</button><button onClick={() => setDup(null)} className="rounded border border-zinc-600 px-4 text-sm">{t("close")}</button></div>
            </motion.div>
          </motion.div>
        )}
        {toast && <motion.div key="toast" role="status" aria-live="polite" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black shadow-xl">{toast}</motion.div>}
      </AnimatePresence>
    </main>
  );
}

export default function Page() { return <AuthGate>{(s) => <App {...s} />}</AuthGate>; }
