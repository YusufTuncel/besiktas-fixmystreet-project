"use client";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { supabase, configured } from "@/lib/supabase";

export interface Sess { user: { id: string; email?: string }; role: string; signOut: () => void }
export default function AuthGate({ children }: { children: (s: Sess) => React.ReactNode }) {
  const [user, setUser] = useState<Sess["user"] | null>(null);
  const [role, setRole] = useState("citizen");
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState(""); const [pw, setPw] = useState(""); const [name, setName] = useState("");
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setUser(data.session?.user ?? null); setReady(true); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("role").eq("id", user.id).single().then(({ data }) => setRole(data?.role ?? "citizen"));
  }, [user?.id]);

  async function go(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg("");
    const r = mode === "in"
      ? await supabase.auth.signInWithPassword({ email, password: pw })
      : await supabase.auth.signUp({ email, password: pw, options: { data: { full_name: name } } });
    if (r.error) setMsg(r.error.message);
    else if (mode === "up" && !r.data.session) setMsg("Kayıt alındı. E-postandaki bağlantıyla hesabı doğrula, sonra giriş yap.");
    setBusy(false);
  }

  if (user) return <>{children({ user, role, signOut: () => supabase.auth.signOut() })}</>;
  const inp = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm outline-none focus:border-white/50";
  return (
    <main className="grid min-h-screen place-items-center p-4">
      <div className="panel w-full max-w-sm space-y-4 p-6">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-white text-black"><Shield size={20} /></div><div><p className="text-xs text-zinc-400">Beşiktaş Belediyesi</p><h1 className="font-bold">Beşiktaş Sokak</h1></div></div>
        {!configured && <p className="rounded bg-amber-950/50 p-2 text-xs text-amber-300">Supabase ortam değişkenleri bulunamadı (.env.local / Vercel).</p>}
        {!ready ? <p className="text-sm text-zinc-400">Yükleniyor…</p> : (
          <form onSubmit={go} className="space-y-3">
            {mode === "up" && <input className={inp} placeholder="Ad Soyad" value={name} onChange={(e) => setName(e.target.value)} />}
            <input className={inp} type="email" required placeholder="E-posta" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className={inp} type="password" required minLength={6} placeholder="Parola (en az 6 karakter)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button disabled={busy} className="w-full rounded-lg bg-white py-2 text-sm font-semibold text-black disabled:opacity-50">{mode === "in" ? "Giriş yap" : "Kayıt ol"}</button>
            {msg && <p className="text-xs text-amber-300">{msg}</p>}
            <button type="button" onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(""); }} className="text-xs text-zinc-400 underline">{mode === "in" ? "Hesabın yok mu? Kayıt ol" : "Zaten hesabın var mı? Giriş yap"}</button>
          </form>
        )}
      </div>
    </main>
  );
}
