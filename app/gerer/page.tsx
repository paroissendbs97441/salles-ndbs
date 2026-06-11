// app/gerer/page.tsx — Espace gestion (connecté) : annuler / modifier
"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { getSupabase } from "../../lib/supabaseClient";
import { frDate, ymd } from "../../lib/dates";

export default function Gerer() {
  const [user, setUser] = useState<any>(null);
  const [salles, setSalles] = useState<any[]>([]);
  const [resas, setResas] = useState<any[]>([]);
  const [token, setToken] = useState<string>("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>(null);
  const [annulId, setAnnulId] = useState<string | null>(null);
  const [motifAnnul, setMotifAnnul] = useState("");
  const [msg, setMsg] = useState("");
  const [chargement, setChargement] = useState(true);

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
      if (!data.user) { window.location.href = "/login"; return; }
      setUser(data.user);
      const { data: sess } = await getSupabase().auth.getSession();
      setToken(sess.session?.access_token ?? "");
      const { data: s } = await getSupabase().from("salles_salles").select("*").eq("actif", true).order("ordre");
      setSalles(s ?? []);
      await charger();
      setChargement(false);
    }
    init();
  }, []);

  async function charger() {
    const aujourdhui = ymd(new Date());
    const { data: r } = await getSupabase()
      .from("salles_reservations")
      .select("*, salles_salles(lieu, nom)")
      .eq("statut", "active")
      .gte("date_resa", aujourdhui)
      .order("date_resa").order("heure_debut");
    setResas(r ?? []);
  }

  async function annuler(id: string) {
    setMsg("");
    if (!motifAnnul.trim()) { setMsg("Le motif d'annulation est obligatoire."); return; }
    const res = await fetch("/api/annuler", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservation_id: id, access_token: token, motif_annulation: motifAnnul }),
    });
    const j = await res.json();
    if (j.ok) {
      setAnnulId(null); setMotifAnnul("");
      if (!j.mailEnvoye) setMsg("Réservation annulée. (Aucun email n'a été envoyé : le responsable n'avait pas fourni d'adresse email.)");
      charger();
    } else setMsg(j.error);
  }

  function ouvrirEdition(r: any) {
    setEditId(r.id);
    setEditForm({
      salle_id: r.salle_id, date_resa: r.date_resa,
      heure_debut: r.heure_debut.slice(0, 5), heure_fin: r.heure_fin.slice(0, 5),
      groupe: r.groupe, objet: r.objet,
      responsable_nom: r.responsable_nom, responsable_tel: r.responsable_tel,
      responsable_email: r.responsable_email ?? "",
    });
  }

  async function enregistrerEdition() {
    setMsg("");
    const res = await fetch("/api/modifier", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reservation_id: editId, access_token: token, ...editForm }),
    });
    const j = await res.json();
    if (j.ok) { setEditId(null); setEditForm(null); charger(); }
    else setMsg(j.error);
  }

  const lieux = Array.from(new Set(salles.map((s) => s.lieu)));

  if (chargement) return <p style={{ padding: 40 }}>Chargement…</p>;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ maxWidth: 800, margin: "0 auto", padding: 16, width: "100%", boxSizing: "border-box", flex: 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h1 style={{ fontSize: 21 }}>Gérer les réservations</h1>
          <img src="/logo.png" alt="Logo paroisse" style={{ height: 60 }} />
        </div>

        <div style={{ textAlign: "right", margin: "8px 0" }}>
          <a href="https://intranet-ndbs.vercel.app" style={{ color: "#2563eb", fontSize: 14, textDecoration: "none", marginRight: 16 }}>⌂ Retour à l'intranet</a>
          <a href="/" style={{ color: "#2563eb", fontSize: 14, textDecoration: "none", marginRight: 16 }}>Calendrier</a>
          <button style={lien} onClick={() => getSupabase().auth.signOut().then(() => window.location.href = "/")}>Déconnexion</button>
        </div>

        {msg && <div style={{ background: "#fef3c7", color: "#92400e", padding: 10, borderRadius: 6, margin: "8px 0" }}>{msg}</div>}

        <p style={{ color: "#666", fontSize: 14 }}>Réservations à venir (de la date du jour aux suivantes).</p>
        {resas.length === 0 && <p style={{ color: "#777" }}>Aucune réservation à venir.</p>}

        {resas.map((r) => (
          <div key={r.id} style={carte}>
            {editId === r.id ? (
              <div>
                <h3 style={{ fontSize: 15 }}>Modifier la réservation</h3>
                <label style={lbl}>Salle</label>
                <select style={inp} value={editForm.salle_id} onChange={(e) => setEditForm({ ...editForm, salle_id: e.target.value })}>
                  {lieux.map((lieu) => (
                    <optgroup key={lieu} label={lieu}>
                      {salles.filter((s) => s.lieu === lieu).map((s) => <option key={s.id} value={s.id}>{s.nom}</option>)}
                    </optgroup>
                  ))}
                </select>
                <label style={lbl}>Date</label>
                <input style={inp} type="date" value={editForm.date_resa} onChange={(e) => setEditForm({ ...editForm, date_resa: e.target.value })} />
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}><label style={lbl}>Début</label>
                    <input style={inp} type="time" value={editForm.heure_debut} onChange={(e) => setEditForm({ ...editForm, heure_debut: e.target.value })} /></div>
                  <div style={{ flex: 1 }}><label style={lbl}>Fin</label>
                    <input style={inp} type="time" value={editForm.heure_fin} onChange={(e) => setEditForm({ ...editForm, heure_fin: e.target.value })} /></div>
                </div>
                <label style={lbl}>Groupe</label>
                <input style={inp} value={editForm.groupe} onChange={(e) => setEditForm({ ...editForm, groupe: e.target.value })} />
                <label style={lbl}>Objet</label>
                <input style={inp} value={editForm.objet} onChange={(e) => setEditForm({ ...editForm, objet: e.target.value })} />
                <label style={lbl}>Responsable</label>
                <input style={inp} value={editForm.responsable_nom} onChange={(e) => setEditForm({ ...editForm, responsable_nom: e.target.value })} />
                <label style={lbl}>Téléphone</label>
                <input style={inp} value={editForm.responsable_tel} onChange={(e) => setEditForm({ ...editForm, responsable_tel: e.target.value })} />
                <label style={lbl}>Email</label>
                <input style={inp} value={editForm.responsable_email} onChange={(e) => setEditForm({ ...editForm, responsable_email: e.target.value })} />
                <button style={btn} onClick={enregistrerEdition}>Enregistrer</button>
                <button style={{ ...lien, marginLeft: 10 }} onClick={() => { setEditId(null); setMsg(""); }}>Annuler l'édition</button>
              </div>
            ) : (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <b>{frDate(r.date_resa)} · {r.heure_debut.slice(0, 5)}–{r.heure_fin.slice(0, 5)}</b><br />
                    <span style={{ color: "#555", fontSize: 14 }}>{r.salles_salles?.lieu} — {r.salles_salles?.nom}</span><br />
                    <span style={{ fontSize: 14 }}>Groupe : {r.groupe} · {r.objet}</span><br />
                    <span style={{ fontSize: 13, color: "#666" }}>Responsable : {r.responsable_nom} ({r.responsable_tel}){r.responsable_email ? ` · ${r.responsable_email}` : " · (pas d'email)"}</span>
                  </div>
                  {annulId !== r.id && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button style={btnMini} onClick={() => ouvrirEdition(r)}>Modifier</button>
                      <button style={{ ...btnMini, background: "#b91c1c" }} onClick={() => { setAnnulId(r.id); setMotifAnnul(""); setMsg(""); }}>Annuler</button>
                    </div>
                  )}
                </div>
                {annulId === r.id && (
                  <div style={{ background: "#fff7ed", padding: 12, borderRadius: 8, marginTop: 10 }}>
                    <label style={lbl}>Motif de l'annulation (obligatoire)</label>
                    <textarea style={{ ...inp, minHeight: 60 }} value={motifAnnul}
                      onChange={(e) => setMotifAnnul(e.target.value)} />
                    {!r.responsable_email && (
                      <p style={{ color: "#b45309", fontSize: 12, margin: "4px 0" }}>
                        ⚠️ Le responsable n'a pas fourni d'email : aucun message d'annulation ne pourra lui être envoyé.
                      </p>
                    )}
                    <button style={{ ...btn, background: "#b91c1c" }} onClick={() => annuler(r.id)}>Confirmer l'annulation</button>
                    <button style={{ ...lien, marginLeft: 10 }} onClick={() => { setAnnulId(null); setMotifAnnul(""); setMsg(""); }}>Retour</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <footer style={pied}>Alexandre FAMARE © 2026</footer>
    </div>
  );
}

const carte: React.CSSProperties = { background: "#fff", padding: 16, borderRadius: 10, margin: "10px 0", boxShadow: "0 1px 3px rgba(0,0,0,.07)" };
const inp: React.CSSProperties = { display: "block", width: "100%", padding: 8, margin: "3px 0 8px", borderRadius: 6, border: "1px solid #ccc", boxSizing: "border-box" };
const lbl: React.CSSProperties = { fontSize: 12, color: "#555", fontWeight: 600 };
const btn: React.CSSProperties = { padding: "9px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 };
const btnMini: React.CSSProperties = { padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const lien: React.CSSProperties = { background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 14 };
const pied: React.CSSProperties = { textAlign: "center", padding: 14, fontSize: 12, color: "#999" };
