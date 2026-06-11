// app/api/reserver/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { envoyerMail } from "../../../lib/mailer";

function frDate(s: string): string {
  const [a, m, j] = s.split("-");
  return `${j}/${m}/${a}`;
}
function chevauche(d1: string, f1: string, d2: string, f2: string): boolean {
  return d1 < f2 && d2 < f1;
}

export async function POST(req: Request) {
  try {
    const sb = getSupabaseAdmin();
    const b = await req.json();
    const {
      salle_id, date_resa, heure_debut, heure_fin,
      groupe, objet, responsable_nom, responsable_tel, responsable_email,
      cree_par,
    } = b;

    // Champs obligatoires
    if (!salle_id || !date_resa || !heure_debut || !heure_fin ||
        !groupe?.trim() || !objet?.trim() || !responsable_nom?.trim() || !responsable_tel?.trim()) {
      return NextResponse.json({ ok: false, error: "Merci de remplir tous les champs obligatoires." }, { status: 400 });
    }

    // Cohérence horaire
    if (heure_fin <= heure_debut) {
      return NextResponse.json({ ok: false, error: "L'heure de fin doit être après l'heure de début." }, { status: 400 });
    }

    // Pas dans le passé / au moins 1h avant le début
    const debutCreneau = new Date(`${date_resa}T${heure_debut}:00`);
    const limite = new Date(Date.now() + 60 * 60 * 1000);
    if (debutCreneau < limite) {
      return NextResponse.json({ ok: false, error: "La réservation doit être posée au moins 1 heure avant le début du créneau." }, { status: 400 });
    }

    // Conflit : réservations actives de la même salle, même date
    const { data: existantes } = await sb
      .from("salles_reservations")
      .select("heure_debut, heure_fin")
      .eq("salle_id", salle_id)
      .eq("date_resa", date_resa)
      .eq("statut", "active");

    for (const r of existantes ?? []) {
      if (chevauche(heure_debut, heure_fin, r.heure_debut.slice(0, 5), r.heure_fin.slice(0, 5))) {
        return NextResponse.json({ ok: false, error: `Créneau indisponible : cette salle est déjà réservée de ${r.heure_debut.slice(0, 5)} à ${r.heure_fin.slice(0, 5)} ce jour-là.` }, { status: 400 });
      }
    }

    // Création
    const { data: resa, error } = await sb
      .from("salles_reservations")
      .insert({
        salle_id, date_resa, heure_debut, heure_fin,
        groupe, objet, responsable_nom, responsable_tel,
        responsable_email: responsable_email?.trim() || null,
        cree_par: cree_par || null,
      })
      .select("*, salles_salles(lieu, nom)")
      .single();
    if (error) throw error;

    // Mail de confirmation si email fourni
    if (resa.responsable_email) {
      await envoyerMail({
        to: [resa.responsable_email],
        subject: `Confirmation de réservation — ${resa.salles_salles.nom}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px">
            <h2 style="color:#16a34a">Réservation confirmée</h2>
            <p>Votre réservation a bien été enregistrée :</p>
            <p>
              <b>Lieu :</b> ${resa.salles_salles.lieu}<br/>
              <b>Salle :</b> ${resa.salles_salles.nom}<br/>
              <b>Date :</b> ${frDate(resa.date_resa)}<br/>
              <b>Horaire :</b> ${resa.heure_debut.slice(0,5)} – ${resa.heure_fin.slice(0,5)}<br/>
              <b>Groupe :</b> ${resa.groupe}<br/>
              <b>Objet :</b> ${resa.objet}<br/>
              <b>Responsable :</b> ${resa.responsable_nom} (${resa.responsable_tel})
            </p>
            <p style="color:#888;font-size:13px">Pour toute modification ou annulation, contactez la paroisse.</p>
          </div>`,
      });
    }

    return NextResponse.json({ ok: true, id: resa.id });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
