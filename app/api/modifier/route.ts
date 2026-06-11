// app/api/modifier/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

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

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
