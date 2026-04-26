import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const serviceId = req.nextUrl.searchParams.get("service_id");
    const admin = createAdminClient();

    let query = admin.from("agents").select("*").order("nom");
    if (serviceId) query = query.eq("service_id", serviceId);

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/agents:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, service_id } = body;

    if (!nom?.trim()) {
      return NextResponse.json({ error: "Le nom de l'agent est requis" }, { status: 400 });
    }
    if (!service_id) {
      return NextResponse.json({ error: "Le service est requis" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("agents")
      .insert({ nom: nom.trim(), service_id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/agents:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
