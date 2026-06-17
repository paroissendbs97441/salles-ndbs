// app/page.tsx — Accueil public : calendrier vue semaine — fenêtre macOS Liquid Glass
"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { getSupabase } from "../lib/supabaseClient";
import { lundiDeLaSemaine, ymd, frDate, JOURS_SEMAINE } from "../lib/dates";

const URL_INTRANET = "https://intranet-ndbs.vercel.app";

export default function Accueil() {
  const [salles, setSalles] = useState<any[]>([]);
  const [resas, setResas] = useState<any[]>([]);
  const [lundi, setLundi] = useState<Date>(lundiDeLaSemaine(new Date()));
  const [salleFiltre, setSalleFiltre] = useState<string>("");
  const [chargement, setChargement] = useState(true);
  const [horloge, setHorloge] = useState("");
  const [zoom, setZoom] = useState(false);

  useEffect(() => { charger(); }, [lundi]);

  useEffect(() => {
    const maj = () => {
      const d = new Date();
      const jours = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
      const mois = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
      setHorloge(`${jours[d.getDay()]} ${d.getDate()} ${mois[d.getMonth()]}  ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    };
    maj();
    const id = setInterval(maj, 10000);
    return () => clearInterval(id);
  }, []);

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

  function fermer() { window.location.href = URL_INTRANET; }

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
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />

      <div style={pageWrap}>
        <div style={wall} />

        {/* Barre de menu système */}
        <div style={menubar}>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
            <img src="/logo.png" alt="" style={{ height: 17, width: 17, objectFit: "contain" }} /> Réservation de salles
          </span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <a href={URL_INTRANET} style={menuLien}>⌂ Intranet</a>
            <span style={{ opacity: 0.9 }}>{horloge}</span>
          </span>
        </div>

        {/* Fenêtre d'application macOS */}
        <div style={{ ...fenetreWrap, maxWidth: zoom ? "100%" : 1120, padding: zoom ? "12px 12px 50px" : "30px 20px 50px", transition: "max-width .3s ease, padding .3s ease" }}>
          <div style={fenetre}>
            {/* Title bar */}
            <div style={titleBar}>
              <span style={feux}>
                <i title="Fermer" onClick={fermer} style={{ ...feu, background: "#ff5f57", cursor: "pointer" }} />
                <i title="Retour à l'intranet" onClick={fermer} style={{ ...feu, background: "#febc2e", cursor: "pointer" }} />
                <i title="Plein écran" onClick={() => setZoom(!zoom)} style={{ ...feu, background: "#28c840", cursor: "pointer" }} />
              </span>
              <span style={titreFenetre}>Réservation de salles</span>
              <img src="/logo.png" alt="" style={{ marginLeft: "auto", height: 26, objectFit: "contain" }} />
            </div>

            {/* Contenu */}
            <div style={corps}>
              <div style={{ marginBottom: 6 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: "#1d1d1f", letterSpacing: "-.4px" }}>Réservation de salles</h1>
                <p style={{ fontSize: 14.5, color: "#5a5a62", margin: "3px 0 0" }}>Paroisse Notre-Dame du Bon Secours</p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", margin: "16px 0" }}>
                <a href="/reserver" style={btnPlein}>+ Réserver une salle</a>
                <a href="/gerer" style={btnLeger}>Gérer les réservations</a>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", margin: "10px 0 16px" }}>
                <button style={navBtn} onClick={() => { const d = new Date(lundi); d.setDate(d.getDate() - 7); setLundi(d); }}>← Semaine préc.</button>
                <button style={navBtn} onClick={() => setLundi(lundiDeLaSemaine(new Date()))}>Aujourd'hui</button>
                <button style={navBtn} onClick={() => { const d = new Date(lundi); d.setDate(d.getDate() + 7); setLundi(d); }}>Semaine suiv. →</button>
                <span style={{ fontWeight: 600, marginLeft: 8, color: "#1d1d1f" }}>
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

              {chargement ? <p style={{ color: "#8a8a92" }}>Chargement…</p> : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                  {jours.map((jour, i) => {
                    const liste = resasDuJour(jour);
                    const estAujourdhui = ymd(jour) === ymd(new Date());
                    return (
                      <div key={i} style={{
                        background: "rgba(255,255,255,.6)", backdropFilter: "blur(16px) saturate(180%)", WebkitBackdropFilter: "blur(16px) saturate(180%)",
                        borderRadius: 14, padding: 9, minHeight: 130,
                        boxShadow: estAujourdhui ? "0 0 0 2px rgba(196,110,90,.7), 0 6px 18px rgba(150,90,70,.12)" : "0 6px 18px rgba(150,90,70,.1), inset 0 1px 0 rgba(255,255,255,.7)",
                        border: "1px solid rgba(255,255,255,.7)" }}>
                        <div style={{ fontWeight: 600, fontSize: 13, textAlign: "center", marginBottom: 8, color: "#1d1d1f" }}>
                          {JOURS_SEMAINE[i]}<br />
                          <span style={{ color: "#9a8a86", fontWeight: 400 }}>{jour.getDate()}/{jour.getMonth() + 1}</span>
                        </div>
                        {liste.length === 0 && <div style={{ color: "#c2b6b2", fontSize: 12, textAlign: "center", marginTop: 12 }}>—</div>}
                        {liste.map((r) => (
                          <div key={r.id} style={{ background: "rgba(196,110,90,.14)", borderLeft: "3px solid #c46e5a", borderRadius: 6, padding: "5px 7px", marginBottom: 6, fontSize: 11.5 }}>
                            <div style={{ fontWeight: 600, color: "#1d1d1f" }}>{r.heure_debut.slice(0, 5)}–{r.heure_fin.slice(0, 5)}</div>
                            <div style={{ color: "#2a2a30" }}>{r.salles_salles?.nom}</div>
                            <div style={{ color: "#7a6a66" }}>{r.groupe}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              <p style={{ color: "#8a8a92", fontSize: 12, marginTop: 18 }}>
                Cliquez sur « Réserver une salle » pour faire une demande. Les réservations s'affichent automatiquement une fois validées.
              </p>
            </div>
          </div>

          <p style={pied}>Alexandre FAMARE © 2026</p>
        </div>
      </div>
    </>
  );
}

const pageWrap: React.CSSProperties = { position: "relative", minHeight: "100vh", fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", color: "#1d1d1f", WebkitFontSmoothing: "antialiased" };
const wall: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 0,
  background: "radial-gradient(circle at 15% 16%, #f3d9cf 0%, rgba(243,217,207,0) 46%), radial-gradient(circle at 85% 14%, #f0d3c8 0%, rgba(240,211,200,0) 48%), radial-gradient(circle at 82% 88%, #eedcd2 0%, rgba(238,220,210,0) 46%), linear-gradient(160deg, #f7ece6 0%, #f1e0d8 55%, #ead4ca 100%)",
};
const menubar: React.CSSProperties = {
  position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 18,
  height: 28, padding: "0 16px", fontSize: 12.5, fontWeight: 500, color: "#2a2a30",
  background: "rgba(255,255,255,.5)", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)",
  borderBottom: "1px solid rgba(255,255,255,.55)",
};
const menuLien: React.CSSProperties = { color: "#2a2a30", textDecoration: "none", fontWeight: 500 };
const fenetreWrap: React.CSSProperties = { position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "30px 20px 50px", width: "100%", boxSizing: "border-box" };
const fenetre: React.CSSProperties = {
  borderRadius: 16, overflow: "hidden",
  background: "rgba(255,255,255,.5)", backdropFilter: "blur(40px) saturate(180%)", WebkitBackdropFilter: "blur(40px) saturate(180%)",
  border: "1px solid rgba(255,255,255,.6)",
  boxShadow: "0 30px 80px rgba(150,90,70,.24), 0 4px 14px rgba(150,90,70,.13), inset 0 1px 0 rgba(255,255,255,.7)",
};
const titleBar: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 14, height: 46, padding: "0 16px",
  background: "rgba(255,255,255,.4)", borderBottom: "1px solid rgba(60,60,67,.1)",
};
const feux: React.CSSProperties = { display: "flex", gap: 8, flexShrink: 0 };
const feu: React.CSSProperties = { width: 12, height: 12, borderRadius: "50%", display: "inline-block", boxShadow: "inset 0 0 0 .5px rgba(0,0,0,.12)" };
const titreFenetre: React.CSSProperties = { fontSize: 13.5, fontWeight: 600, color: "#3a3a40", whiteSpace: "nowrap" };
const corps: React.CSSProperties = { padding: "20px 22px", background: "rgba(255,255,255,.3)" };
const btnPlein: React.CSSProperties = { background: "linear-gradient(180deg,#cd7b62,#b5634c)", color: "#fff", padding: "10px 18px", borderRadius: 10, textDecoration: "none", fontSize: 14.5, fontWeight: 600, boxShadow: "0 4px 12px rgba(181,99,76,.3)" };
const btnLeger: React.CSSProperties = { background: "rgba(255,255,255,.6)", color: "#7a4a3a", padding: "10px 18px", borderRadius: 10, textDecoration: "none", fontSize: 14.5, fontWeight: 500, border: "1px solid rgba(255,255,255,.7)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" };
const navBtn: React.CSSProperties = { background: "rgba(255,255,255,.65)", border: "1px solid rgba(60,60,67,.15)", borderRadius: 9, padding: "7px 13px", cursor: "pointer", fontSize: 13, fontFamily: "inherit", color: "#3a3a40", fontWeight: 500, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" };
const select: React.CSSProperties = { padding: "8px 12px", borderRadius: 10, border: "1px solid rgba(60,60,67,.18)", fontSize: 14, fontFamily: "inherit", background: "rgba(255,255,255,.7)", color: "#1d1d1f", outline: "none" };
const pied: React.CSSProperties = { textAlign: "center", padding: "20px 14px 0", fontSize: 12, color: "#8a8a92" };
