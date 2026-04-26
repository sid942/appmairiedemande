import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase";

export async function GET() {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("services")
      .select("*")
      .order("nom");

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/services:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, email } = body;

    if (!nom?.trim()) {
      return NextResponse.json({ error: "Le nom du service est requis" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("services")
      .insert({ nom: nom.trim(), email: email?.trim() ?? "" })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error("POST /api/services:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
