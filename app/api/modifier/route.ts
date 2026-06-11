// app/api/modifier/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { envoyerMail } from "../../../lib/mailer";

function frDate(s: string): string {
  const [a, m, j] = s.split("-");
  return `${j}/${m}/${a}`;
}
function frDateHeure(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} à ${p(d.getHours())}:${p(d.getMinutes())}`;
}
function chevauche(d1: string, f1: string, d2: string, f2: string): boolean {
  return d1 < f2 && d2 < f1;
}

export async function POST(req: Request) {
  try {
    const sb = getSupabaseAdmin();
    const b = await req.json();
    const { reservation_id, access_token,
      salle_id, date_resa, heure_debut, heure_fin,
      groupe, objet, responsable_nom, responsable_tel, responsable_email } = b;

    if (!access_token) {
      return NextResponse.json({ ok: false, error: "Connexion requise." }, { status: 401 });
    }
    const { data: u } = await sb.auth.getUser(access_token);
    if (!u?.user) {
      return NextResponse.json({ ok: false, error: "Session invalide, reconnectez-vous." }, { status: 401 });
    }

    if (heure_fin <= heure_debut) {
      return NextResponse.json({ ok: false, error: "L'heure de fin doit être après l'heure de début." }, { status: 400 });
    }

    // Récupérer la réservation AVANT modification (pour le comparatif avant/après)
    const { data: avant } = await sb
      .from("salles_reservations").select("*, salles_salles(lieu, nom)").eq("id", reservation_id).single();
    if (!avant) return NextResponse.json({ ok: false, error: "Réservation introuvable." }, { status: 404 });

    // Conflit avec les AUTRES réservations actives (exclure soi-même)
    const { data: existantes } = await sb
      .from("salles_reservations")
      .select("id, heure_debut, heure_fin")
      .eq("salle_id", salle_id)
      .eq("date_resa", date_resa)
      .eq("statut", "active");

    for (const r of existantes ?? []) {
      if (r.id === reservation_id) continue;
      if (chevauche(heure_debut, heure_fin, r.heure_debut.slice(0, 5), r.heure_fin.slice(0, 5))) {
        return NextResponse.json({ ok: false, error: `Créneau indisponible : conflit avec une réservation de ${r.heure_debut.slice(0,5)} à ${r.heure_fin.slice(0,5)}.` }, { status: 400 });
      }
    }

    const { error } = await sb.from("salles_reservations").update({
      salle_id, date_resa, heure_debut, heure_fin,
      groupe, objet, responsable_nom, responsable_tel,
      responsable_email: responsable_email?.trim() || null,
    }).eq("id", reservation_id);
    if (error) throw error;

    // Récupérer la réservation APRÈS (avec le nom de la nouvelle salle)
    const { data: apres } = await sb
      .from("salles_reservations").select("*, salles_salles(lieu, nom)").eq("id", reservation_id).single();

    // Nom de la personne qui modifie
    let modifiePar = "l'équipe paroissiale";
    const { data: prof } = await sb.from("profiles").select("nom_complet").eq("id", u.user.id).single();
    if (prof?.nom_complet) modifiePar = prof.nom_complet;

    // Mail au responsable si email (on écrit à l'email à jour = après modif, sinon avant)
    const destinataire = apres?.responsable_email || avant.responsable_email;
    let mailEnvoye = false;
    if (destinataire) {
      const ligneAvant = `${frDate(avant.date_resa)}, ${avant.heure_debut.slice(0,5)}–${avant.heure_fin.slice(0,5)}, ${avant.salles_salles.lieu} — ${avant.salles_salles.nom}`;
      const ligneApres = `${frDate(apres.date_resa)}, ${apres.heure_debut.slice(0,5)}–${apres.heure_fin.slice(0,5)}, ${apres.salles_salles.lieu} — ${apres.salles_salles.nom}`;
      await envoyerMail({
        to: [destinataire],
        subject: `Modification de votre réservation — ${apres.salles_salles.nom}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#2563eb">Réservation modifiée</h2>
            <p>Bonjour ${apres.responsable_nom},</p>
            <p>Votre réservation a été modifiée le <b>${frDateHeure(new Date())}</b> par <b>${modifiePar}</b>.</p>
            <table style="border-collapse:collapse;width:100%;margin:10px 0">
              <tr style="background:#f3f4f6"><td style="padding:8px;border:1px solid #e5e7eb"><b>Avant</b></td><td style="padding:8px;border:1px solid #e5e7eb">${ligneAvant}</td></tr>
              <tr><td style="padding:8px;border:1px solid #e5e7eb"><b>Après</b></td><td style="padding:8px;border:1px solid #e5e7eb">${ligneApres}</td></tr>
            </table>
            <p>
              <b>Groupe :</b> ${apres.groupe}<br/>
              <b>Objet :</b> ${apres.objet}<br/>
              <b>Responsable :</b> ${apres.responsable_nom} (${apres.responsable_tel})
            </p>
            <p style="color:#888;font-size:13px">Pour toute question, contactez la paroisse.</p>
          </div>`,
      });
      mailEnvoye = true;
    }

    return NextResponse.json({ ok: true, mailEnvoye });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
