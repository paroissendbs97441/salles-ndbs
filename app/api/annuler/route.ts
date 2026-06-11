// app/api/annuler/route.ts
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

export async function POST(req: Request) {
  try {
    const sb = getSupabaseAdmin();
    const { reservation_id, access_token, motif_annulation } = await req.json();

    if (!access_token) {
      return NextResponse.json({ ok: false, error: "Connexion requise." }, { status: 401 });
    }
    const { data: u } = await sb.auth.getUser(access_token);
    if (!u?.user) {
      return NextResponse.json({ ok: false, error: "Session invalide, reconnectez-vous." }, { status: 401 });
    }

    if (!motif_annulation?.trim()) {
      return NextResponse.json({ ok: false, error: "Le motif d'annulation est obligatoire." }, { status: 400 });
    }

    const { data: resa } = await sb
      .from("salles_reservations").select("*, salles_salles(lieu, nom)").eq("id", reservation_id).single();
    if (!resa) return NextResponse.json({ ok: false, error: "Réservation introuvable." }, { status: 404 });
    if (resa.statut !== "active") {
      return NextResponse.json({ ok: false, error: "Cette réservation n'est plus active." }, { status: 400 });
    }

    const debutCreneau = new Date(`${resa.date_resa}T${resa.heure_debut}`);
    if (debutCreneau < new Date(Date.now() + 60 * 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "Annulation impossible : il reste moins d'1 heure avant le début." }, { status: 400 });
    }

    let annulePar = "l'équipe paroissiale";
    const { data: prof } = await sb.from("profiles").select("nom_complet").eq("id", u.user.id).single();
    if (prof?.nom_complet) annulePar = prof.nom_complet;

    const maintenant = new Date();
    const { error } = await sb.from("salles_reservations").update({
      statut: "annulee",
      annulee_le: maintenant.toISOString(),
      motif_annulation: motif_annulation.trim(),
    }).eq("id", reservation_id);
    if (error) throw error;

    let mailEnvoye = false;
    if (resa.responsable_email) {
      await envoyerMail({
        to: [resa.responsable_email],
        subject: `Annulation de votre réservation — ${resa.salles_salles.nom}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#b45309">Réservation annulée</h2>
            <p>Bonjour ${resa.responsable_nom},</p>
            <p>Votre demande de réservation faite pour le <b>${frDate(resa.date_resa)}</b>,
               pour le créneau de <b>${resa.heure_debut.slice(0,5)} à ${resa.heure_fin.slice(0,5)}</b>
               (${resa.salles_salles.lieu} — ${resa.salles_salles.nom}),
               a été annulée le <b>${frDateHeure(maintenant)}</b> par <b>${annulePar}</b>.</p>
            <p><b>Motif :</b> ${motif_annulation.trim()}</p>
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
