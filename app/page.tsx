// app/page.tsx — Accueil public : calendrier vue semaine
"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabaseClient";
import { lundiDeLaSemaine, ymd, frDate, JOURS_SEMAINE } from "../lib/dates";

export default function Accueil() {
  const [salles, setSalles] = useState<any[]>([]);
  const [resas, setResas] = useState<any[]>([]);
  const [lundi, setLundi] = useState<Date>(lundiDeLaSemaine(new Date()));
  const [salleFiltre, setSalleFiltre] = useState<string>("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => { charger(); }, [lundi]);

  async function charger() {
    setChargement(true);
    const { data: s } = await getSupabase().from("salles_salles").select("*").eq("actif", true).order("ordre");
    setSalles(s ?? []);
    const debut = ymd(lundi);
    const finDate = new Date(lundi); finDate.setDate(finDate.getDate() + 6);
    const fin = ymd(finDate);
    const { data: r } = await getSupabase()
      .from("salles_reservations")
      .select("*, salles_salles(lieu, nom)")
      .eq("statut", "active")
      .gte("date_resa", debut).lte("date_resa", fin)
      .order("heure_debut");
    setResas(r ?? []);
    setChargement(false);
  }

  const jours = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(lundi); d.setDate(d.getDate() + i); return d;
  });

  const sallesAffichees = salleFiltre ? salles.filter((s) => s.id === salleFiltre) : salles;

  function resasDuJour(jour: Date) {
    const j = ymd(jour);
    return resas
      .filter((r) => r.date_resa === j && (!salleFiltre || r.salle_id === salleFiltre))
      .sort((a, b) => a.heure_debut.localeCompare(b.heure_debut));
  }

  const lieux = Array.from(new Set(salles.map((s) => s.lieu)));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16, width: "100%", boxSizing: "border-box", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, lineHeight: 1.3 }}>
              Réservation de salles<br />
              <span style={{ fontSize: 15, color: "#555" }}>Paroisse Notre Dame du Bon Secours</span>
            </h1>
          </div>
          <img src="/logo.png" alt="Logo paroisse" style={{ height: 110 }} />
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "16px 0" }}>
          <a href="/reserver" style={btnPlein}>+ Réserver une salle</a>
          <a href="/gerer" style={btnLeger}>Gérer les réservations</a>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "10px 0" }}>
          <button style={navBtn} onClick={() => { const d = new Date(lundi); d.setDate(d.getDate() - 7); setLundi(d); }}>← Semaine préc.</button>
          <button style={navBtn} onClick={() => setLundi(lundiDeLaSemaine(new Date()))}>Aujourd'hui</button>
          <button style={navBtn} onClick={() => { const d = new Date(lundi); d.setDate(d.getDate() + 7); setLundi(d); }}>Semaine suiv. →</button>
          <span style={{ fontWeight: 600, marginLeft: 8 }}>
            Semaine du {frDate(ymd(lundi))}
          </span>
          <select style={{ ...select, marginLeft: "auto" }} value={salleFiltre} onChange={(e) => setSalleFiltre(e.target.value)}>
            <option value="">Toutes les salles</option>
            {lieux.map((lieu) => (
              <optgroup key={lieu} label={lieu}>
                {salles.filter((s) => s.lieu === lieu).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {chargement ? <p>Chargement…</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {jours.map((jour, i) => {
              const liste = resasDuJour(jour);
              const estAujourdhui = ymd(jour) === ymd(new Date());
              return (
                <div key={i} style={{ background: "#fff", borderRadius: 10, padding: 8, minHeight: 120, boxShadow: "0 1px 3px rgba(0,0,0,.07)", border: estAujourdhui ? "2px solid #2563eb" : "1px solid #eee" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, textAlign: "center", marginBottom: 6 }}>
                    {JOURS_SEMAINE[i]}<br />
                    <span style={{ color: "#888", fontWeight: 400 }}>{jour.getDate()}/{jour.getMonth() + 1}</span>
                  </div>
                  {liste.length === 0 && <div style={{ color: "#bbb", fontSize: 12, textAlign: "center", marginTop: 10 }}>—</div>}
                  {liste.map((r) => (
                    <div key={r.id} style={{ background: "#eff6ff", borderLeft: "3px solid #2563eb", borderRadius: 4, padding: "4px 6px", marginBottom: 5, fontSize: 11.5 }}>
                      <div style={{ fontWeight: 600 }}>{r.heure_debut.slice(0, 5)}–{r.heure_fin.slice(0, 5)}</div>
                      <div>{r.salles_salles?.nom}</div>
                      <div style={{ color: "#555" }}>{r.groupe}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <p style={{ color: "#888", fontSize: 12, marginTop: 16 }}>
          Cliquez sur « Réserver une salle » pour faire une demande. Les réservations s'affichent automatiquement une fois validées.
        </p>
      </div>
      <footer style={pied}>Alexandre FAMARE © 2026</footer>
    </div>
  );
}

const btnPlein: React.CSSProperties = { background: "#2563eb", color: "#fff", padding: "10px 18px", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 600 };
const btnLeger: React.CSSProperties = { background: "#e5e7eb", color: "#374151", padding: "10px 18px", borderRadius: 8, textDecoration: "none", fontSize: 15 };
const navBtn: React.CSSProperties = { background: "#fff", border: "1px solid #ccc", borderRadius: 6, padding: "6px 12px", cursor: "pointer", fontSize: 13 };
const select: React.CSSProperties = { padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 };
const pied: React.CSSProperties = { textAlign: "center", padding: 14, fontSize: 12, color: "#999" };
