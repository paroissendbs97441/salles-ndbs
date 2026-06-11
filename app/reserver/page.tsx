// app/reserver/page.tsx — Formulaire de réservation (public, pré-rempli si connecté)
"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabaseClient";

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

  useEffect(() => {
    // SSO : récupérer la session si on arrive depuis l'intranet
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

  const lieux = Array.from(new Set(salles.map((s) => s.lieu)));

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

  if (ok) {
    return (
      <Wrapper>
        <div style={card}>
          <h1 style={{ fontSize: 21, color: "#16a34a" }}>✅ Réservation confirmée</h1>
          <p>Votre réservation a bien été enregistrée.</p>
          {form.responsable_email && <p style={{ color: "#555", fontSize: 14 }}>Un email de confirmation vous a été envoyé.</p>}
          <a href="/" style={btnPlein}>Voir le calendrier</a>
        </div>
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <div style={card}>
        <h1 style={{ fontSize: 21 }}>Réserver une salle</h1>
        <p style={{ color: "#666", fontSize: 14 }}>Les champs marqués * sont obligatoires.</p>

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

        <button style={{ ...btnPlein, opacity: envoi ? 0.6 : 1, border: "none", cursor: "pointer" }} disabled={envoi} onClick={envoyer}>
          {envoi ? "Envoi…" : "Confirmer la réservation"}</button>
        {msg && <p style={{ color: "#dc2626", marginTop: 10 }}>{msg}</p>}

        <p style={{ marginTop: 14 }}><a href="/" style={{ color: "#2563eb" }}>← Retour au calendrier</a></p>
      </div>
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}>
        <img src="/logo.png" alt="Logo paroisse" style={{ height: 64 }} />
      </div>
      <div style={{ flex: 1 }}>{children}</div>
      <footer style={pied}>Alexandre FAMARE © 2026</footer>
    </div>
  );
}

const card: React.CSSProperties = { maxWidth: 480, margin: "20px auto", background: "#fff", padding: 26, borderRadius: 12, boxShadow: "0 1px 4px rgba(0,0,0,.1)" };
const inp: React.CSSProperties = { display: "block", width: "100%", padding: 9, margin: "4px 0 10px", borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 13, color: "#555", fontWeight: 600 };
const btnPlein: React.CSSProperties = { display: "inline-block", background: "#2563eb", color: "#fff", padding: "11px 18px", borderRadius: 8, textDecoration: "none", fontSize: 15, fontWeight: 600, marginTop: 8 };
const pied: React.CSSProperties = { textAlign: "center", padding: 14, fontSize: 12, color: "#999" };
