// lib/dates.ts — utilitaires dates/heures

export function frDate(s: string): string {
  if (!s) return "—";
  const [a, m, j] = s.split("-");
  if (!a || !m || !j) return s;
  return `${j}/${m}/${a}`;
}

// Deux créneaux [d1,f1] et [d2,f2] (chaînes "HH:MM") se chevauchent-ils ?
export function chevauche(d1: string, f1: string, d2: string, f2: string): boolean {
  return d1 < f2 && d2 < f1;
}

// Lundi de la semaine contenant la date donnée (objet Date local)
export function lundiDeLaSemaine(d: Date): Date {
  const r = new Date(d);
  const jour = (r.getDay() + 6) % 7; // 0 = lundi
  r.setDate(r.getDate() - jour);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
