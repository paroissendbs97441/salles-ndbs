// app/reserver/page.tsx — Formulaire de réservation (public, pré-rempli si connecté) — fenêtre macOS Liquid Glass
"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabaseClient";

const URL_INTRANET = "https://intranet-ndbs.vercel.app";

export default function Reserver() {
  const [salles, setSalles] = useState<any[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    salle_id: "", date_resa: "", heure_debut: "", heure_fin: "",
    groupe: "", objet: "", responsable_nom: "", responsable_tel: "", responsable_email: "",
  });
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [horloge, setHorloge] = useState("");
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    async function init() {
      if (typeof window !== "undefined" && window.location.hash.includes("sso_at")) {
        const params = new URLSearchParams(window.location.hash.slice(1));
        const at = params.get("sso_at"); const rt = params.get("sso_rt");
        if (at && rt) {
          await getSupabase().auth.setSession({ access_token: at, refresh_token: rt });
          window.history.replaceState(null, "", window.location.pathname);
        }
      }
      const { data } = await getSupabase().auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        const { data: p } = await getSupabase().from("profiles").select("nom_complet,email").eq("id", data.user.id).single();
        if (p) setForm((f) => ({ ...f, responsable_nom: p.nom_complet ?? "", responsable_email: p.email ?? "" }));
      }
      const { data: s } = await getSupabase().from("salles_salles").select("*").eq("actif", true).order("ordre");
      setSalles(s ?? []);
    }
    init();
  }, []);

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

  const lieux = Array.from(new Set(salles.map((s) => s.lieu)));

  function fermer() { window.location.href = "/"; }

  async function envoyer() {
    setMsg("");
    setEnvoi(true);
    const res = await fetch("/api/reserver", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, cree_par: userId }),
    });
    const j = await res.json();
    setEnvoi(false);
    if (j.ok) setOk(true);
    else setMsg(j.error || "Erreur lors de la réservation.");
  }

  return (
    <Wrapper horloge={horloge} zoom={zoom} setZoom={setZoom} fermer={fermer}>
      {ok ? (
        <div style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1b6b44", margin: "0 0 8px" }}>✅ Réservation confirmée</h1>
          <p style={{ color: "#2a2a30" }}>Votre réservation a bien été enregistrée.</p>
          {form.responsable_email && <p style={{ color: "#5a5a62", fontSize: 14 }}>Un email de confirmation vous a été envoyé.</p>}
          <a href="/" style={btnPlein}>Voir le calendrier</a>
        </div>
      ) : (
        <div style={card}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px", color: "#1d1d1f", letterSpacing: "-.3px" }}>Réserver une salle</h1>
          <p style={{ color: "#8a8a92", fontSize: 14, margin: "0 0 12px" }}>Les champs marqués * sont obligatoires.</p>

          <label style={lbl}>Salle *</label>
          <select style={inp} value={form.salle_id} onChange={(e) => setForm({ ...form, salle_id: e.target.value })}>
            <option value="">— Choisir une salle —</option>
            {lieux.map((lieu) => (
              <optgroup key={lieu} label={lieu}>
                {salles.filter((s) => s.lieu === lieu).map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </optgroup>
            ))}
          </select>

          <label style={lbl}>Date *</label>
          <input style={inp} type="date" value={form.date_resa} onChange={(e) => setForm({ ...form, date_resa: e.target.value })} />

          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Heure de début *</label>
              <input style={inp} type="time" value={form.heure_debut} onChange={(e) => setForm({ ...form, heure_debut: e.target.value })} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Heure de fin *</label>
              <input style={inp} type="time" value={form.heure_fin} onChange={(e) => setForm({ ...form, heure_fin: e.target.value })} />
            </div>
          </div>

          <label style={lbl}>Nom du groupe *</label>
          <input style={inp} value={form.groupe} onChange={(e) => setForm({ ...form, groupe: e.target.value })} />

          <label style={lbl}>Objet de la réservation *</label>
          <input style={inp} value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} />

          <label style={lbl}>Nom et prénom du responsable *</label>
          <input style={inp} value={form.responsable_nom} onChange={(e) => setForm({ ...form, responsable_nom: e.target.value })} />

          <label style={lbl}>Téléphone du responsable *</label>
          <input style={inp} value={form.responsable_tel} onChange={(e) => setForm({ ...form, responsable_tel: e.target.value })} />

          <label style={lbl}>Adresse email (facultatif, pour recevoir une confirmation)</label>
          <input style={inp} value={form.responsable_email} onChange={(e) => setForm({ ...form, responsable_email: e.target.value })} />

          <button style={{ ...btnPlein, opacity: envoi ? 0.6 : 1, border: "none", cursor: "pointer", width: "100%", marginTop: 14 }} disabled={envoi} onClick={envoyer}>
            {envoi ? "Envoi…" : "Confirmer la réservation"}</button>
          {msg && <p style={{ color: "#b3261e", marginTop: 10, fontSize: 14 }}>{msg}</p>}

          <p style={{ marginTop: 16 }}><a href="/" style={lien}>← Retour au calendrier</a></p>
        </div>
      )}
    </Wrapper>
  );
}

function Wrapper({ children, horloge, zoom, setZoom, fermer }: { children: React.ReactNode; horloge: string; zoom: boolean; setZoom: (v: boolean) => void; fermer: () => void }) {
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
            <img src="/logo.png" alt="" style={{ height: 17, width: 17, objectFit: "contain" }} /> Réserver une salle
          </span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
            <a href="/" style={menuLien}>Calendrier</a>
            <a href={URL_INTRANET} style={menuLien}>⌂ Intranet</a>
            <span style={{ opacity: 0.9 }}>{horloge}</span>
          </span>
        </div>

        {/* Fenêtre d'application macOS */}
        <div style={{ ...fenetreWrap, maxWidth: zoom ? "100%" : 560, padding: zoom ? "12px 12px 50px" : "30px 20px 50px", transition: "max-width .3s ease, padding .3s ease" }}>
          <div style={fenetre}>
            {/* Title bar */}
            <div style={titleBar}>
              <span style={feux}>
                <i title="Fermer" onClick={fermer} style={{ ...feu, background: "#ff5f57", cursor: "pointer" }} />
                <i title="Retour au calendrier" onClick={fermer} style={{ ...feu, background: "#febc2e", cursor: "pointer" }} />
                <i title="Plein écran" onClick={() => setZoom(!zoom)} style={{ ...feu, background: "#28c840", cursor: "pointer" }} />
              </span>
              <span style={titreFenetre}>Réserver une salle</span>
              <img src="/logo.png" alt="" style={{ marginLeft: "auto", height: 26, objectFit: "contain" }} />
            </div>

            {/* Contenu */}
            <div style={corps}>
              {children}
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
const fenetreWrap: React.CSSProperties = { position: "relative", zIndex: 1, maxWidth: 560, margin: "0 auto", padding: "30px 20px 50px", width: "100%", boxSizing: "border-box" };
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
const card: React.CSSProperties = {
  background: "rgba(255,255,255,.6)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)",
  border: "1px solid rgba(255,255,255,.7)", borderRadius: 16, padding: 22,
  boxShadow: "0 8px 26px rgba(150,90,70,.1), inset 0 1px 0 rgba(255,255,255,.7)",
};
const inp: React.CSSProperties = { display: "block", width: "100%", padding: 10, margin: "4px 0 10px", borderRadius: 10, border: "1px solid rgba(60,60,67,.18)", boxSizing: "border-box", fontSize: 14, fontFamily: "inherit", background: "rgba(255,255,255,.7)", color: "#1d1d1f", outline: "none" };
const lbl: React.CSSProperties = { fontSize: 13, color: "#5a5a62", fontWeight: 600 };
const btnPlein: React.CSSProperties = { display: "inline-block", background: "linear-gradient(180deg,#cd7b62,#b5634c)", color: "#fff", padding: "11px 18px", borderRadius: 10, textDecoration: "none", fontSize: 14.5, fontWeight: 600, marginTop: 8, fontFamily: "inherit", boxShadow: "0 4px 12px rgba(181,99,76,.3)", textAlign: "center" };
const lien: React.CSSProperties = { background: "none", border: "none", color: "#b5634c", cursor: "pointer", fontSize: 14, fontFamily: "inherit", padding: 0, textDecoration: "none", fontWeight: 600 };
const pied: React.CSSProperties = { textAlign: "center", padding: "20px 14px 0", fontSize: 12, color: "#8a8a92" };
