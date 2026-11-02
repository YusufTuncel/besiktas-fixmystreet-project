export const slaHours = (sla: string) => parseInt(sla, 10) || 24;
const W: Record<string, number> = { "Sokak Lambası": 3, "Bozuk Asfalt": 3, "Kaçak Çöp": 2, "Kırık Kaldırım": 2, "Çölleşmiş Park": 1 };
// Öncelik skoru: destekçi sayısı + SLA'ya yaklaşma + kategori ağırlığı
export const priority = (cat: string, supporters: number, ageH: number, sla: string) =>
  Math.round(supporters * 3 + (ageH / slaHours(sla)) * 40 + (W[cat] ?? 1) * 5);
export const risk = (ageH: number, sla: string): "late" | "risk" | "ok" => {
  const k = ageH / slaHours(sla); return k >= 1 ? "late" : k >= 0.7 ? "risk" : "ok";
};
const KW: Record<string, string[]> = {
  "Bozuk Asfalt": ["asfalt", "çukur", "yol", "delik", "çökme"],
  "Kırık Kaldırım": ["kaldırım", "taş", "yaya", "parke", "rampa"],
  "Çölleşmiş Park": ["park", "ağaç", "bank", "çim", "oyun", "bahçe"],
  "Kaçak Çöp": ["çöp", "atık", "moloz", "koku", "konteyner"],
  "Sokak Lambası": ["lamba", "aydınlatma", "ışık", "karanlık", "direk"],
};
// Metinden kategori önerisi (anahtar kelime tabanlı, simüle akıllı yardımcı)
export function suggestCategory(text: string): { cat: string; conf: number } | null {
  const t = text.toLocaleLowerCase("tr"); let best: [string, number] | null = null;
  for (const [cat, ws] of Object.entries(KW)) { const n = ws.filter((w) => t.includes(w)).length; if (n && (!best || n > best[1])) best = [cat, n]; }
  return best ? { cat: best[0], conf: Math.min(97, 70 + best[1] * 9) } : null;
}
