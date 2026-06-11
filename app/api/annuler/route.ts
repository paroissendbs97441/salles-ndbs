// app/api/annuler/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const sb = getSupabaseAdmin();
    const { reservation_id, access_token, motif_annulation } = await req.json();

    // Vérifier que l'appelant est un utilisateur connecté valide
    if (!access_token) {
      return NextResponse.json({ ok: false, error: "Connexion requise." }, { status: 401 });
    }
    const { data: u } = await sb.auth.getUser(access_token);
    if (!u?.user) {
      return NextResponse.json({ ok: false, error: "Session invalide, reconnectez-vous." }, { status: 401 });
    }

    const { data: resa } = await sb
      .from("salles_reservations").select("*").eq("id", reservation_id).single();
    if (!resa) return NextResponse.json({ ok: false, error: "Réservation introuvable." }, { status: 404 });
    if (resa.statut !== "active") {
      return NextResponse.json({ ok: false, error: "Cette réservation n'est plus active." }, { status: 400 });
    }

    // Au moins 1h avant le début
    const debutCreneau = new Date(`${resa.date_resa}T${resa.heure_debut}`);
    if (debutCreneau < new Date(Date.now() + 60 * 60 * 1000)) {
      return NextResponse.json({ ok: false, error: "Annulation impossible : il reste moins d'1 heure avant le début." }, { status: 400 });
    }

    const { error } = await sb.from("salles_reservations").update({
      statut: "annulee",
      annulee_le: new Date().toISOString(),
      motif_annulation: motif_annulation || null,
    }).eq("id", reservation_id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
