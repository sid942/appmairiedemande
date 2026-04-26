import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase";

// GET /api/tickets/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tickets")
      .select("*, service:services(id, nom, email)")
      .eq("id", id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Ticket non trouvé" }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/tickets/[id]:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// PATCH /api/tickets/[id] — mise à jour statut / service
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { statut, service_id } = body;

    const updateData: Record<string, string> = {};
    if (statut) updateData.statut = statut;
    if (service_id) updateData.service_id = service_id;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Aucune donnée à mettre à jour" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("tickets")
      .update(updateData)
      .eq("id", id)
      .select("*, service:services(id, nom, email)")
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("PATCH /api/tickets/[id]:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
