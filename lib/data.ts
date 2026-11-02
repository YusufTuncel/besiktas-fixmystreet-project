export type Status = "pending" | "enroute" | "working" | "resolved";
export interface Report {
  id: string; x: number; y: number; cat: string; dept: string; sla: string; status: Status;
  supporters: number; team: string; hood: string; street: string; desc: string;
  ageH: number; eta?: number; mine?: boolean; rewarded?: boolean; uid?: string; photo?: string;
}
export interface Scan { phase: "idle" | "scanning" | "done"; cat?: string; conf?: number }

export const CATS: Record<string, { dept: string; sla: string }> = {
  "Bozuk Asfalt": { dept: "Fen İşleri", sla: "24 saat" },
  "Kırık Kaldırım": { dept: "Fen İşleri", sla: "48 saat" },
  "Çölleşmiş Park": { dept: "Park ve Bahçeler", sla: "72 saat" },
  "Kaçak Çöp": { dept: "Temizlik İşleri", sla: "12 saat" },
  "Sokak Lambası": { dept: "Fen İşleri", sla: "24 saat" },
};
export const DEPTS = ["Fen İşleri", "Park ve Bahçeler", "Temizlik İşleri", "Zabıta"];
export const TEAMS: Record<string, string> = {
  "Fen İşleri": "Fen İşleri Ekip-4", "Park ve Bahçeler": "Park Ekip-2",
  "Temizlik İşleri": "Temizlik Ekip-7", "Zabıta": "Zabıta Ekip-1",
};
export const STATUS_COLOR: Record<Status, string> = {
  pending: "#ef4444", enroute: "#facc15", working: "#facc15", resolved: "#22c55e",
};
export const STATUS_LABEL: Record<Status, string> = {
  pending: "Bekliyor", enroute: "Ekip yolda", working: "Onarım yapılıyor", resolved: "Çözüldü",
};
export const STEPS = ["Atandı", "Ekip Yolda", "Onarım Yapılıyor", "Çözüldü"];
export const STEP_IDX: Record<Status, number> = { pending: 0, enroute: 1, working: 2, resolved: 3 };

export const HOODS = [
  { name: "Ihlamurdere", street: "Ihlamurdere Cad.", pts: "240,50 400,40 420,150 270,160", c: [330, 100] },
  { name: "Ortaköy", street: "Muallim Naci Cad.", pts: "400,40 570,70 580,170 420,150", c: [495, 110] },
  { name: "Abbasağa", street: "Abbasağa Cad.", pts: "110,110 240,50 270,160 130,200", c: [180, 130] },
  { name: "Nisbetiye", street: "Nisbetiye Cad.", pts: "270,160 420,150 440,250 280,260", c: [355, 205] },
  { name: "Çarşı", street: "Çarşı Sk.", pts: "130,200 270,160 280,260 200,335 100,300", c: [200, 240] },
  { name: "Akaretler", street: "Spor Cad.", pts: "280,260 440,250 450,320 300,335", c: [370, 292] },
];
export const hoodOf = (x: number, y: number) =>
  HOODS.reduce((b, h) => (Math.hypot(h.c[0] - x, h.c[1] - y) < Math.hypot(b.c[0] - x, b.c[1] - y) ? h : b)).name;
export const streetOf = (hood: string) => HOODS.find((h) => h.name === hood)!.street;

export const BASE = { x: 200, y: 322 };
export const DEFAULT_LOC = { x: 330, y: 100 }; // Ihlamurdere Cad.

const s = (id: string, x: number, y: number, cat: string, status: Status, supporters: number, ageH: number, dept?: string): Report => {
  const hood = hoodOf(x, y);
  const d = dept ?? CATS[cat].dept;
  return { id, x, y, cat, dept: d, sla: CATS[cat].sla, status, supporters, team: status === "pending" ? "—" : TEAMS[d], hood, street: streetOf(hood), desc: `${hood} bölgesinde ${cat.toLowerCase()}`, ageH, eta: status === "enroute" ? 6 : undefined };
};
export const SEED: Report[] = [
  s("BS-2041", 200, 240, "Kırık Kaldırım", "pending", 7, 20),
  s("BS-2038", 180, 130, "Çölleşmiş Park", "resolved", 12, 90),
  s("BS-2044", 495, 110, "Sokak Lambası", "enroute", 4, 5),
  s("BS-2046", 370, 292, "Kaçak Çöp", "pending", 9, 30, "Zabıta"),
  s("BS-2035", 355, 205, "Bozuk Asfalt", "resolved", 21, 120),
];
export const slug = (t: string) =>
  t.toLocaleUpperCase("tr").replace(/İ/g, "I").replace(/Ş/g, "S").replace(/Ç/g, "C").replace(/Ü/g, "U").replace(/Ö/g, "O").replace(/Ğ/g, "G").replace(/[^A-Z]+/g, "_");
