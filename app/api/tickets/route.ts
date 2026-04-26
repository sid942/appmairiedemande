import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { createAdminClient } from "@/lib/supabase";
import {
  sendServiceNotification,
  sendCitizenConfirmation,
} from "@/lib/email";
import { Ticket, Service } from "@/types";

// POST /api/tickets — création publique
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, categorie, description, adresse, photo_url, contact, nom } =
      body;

    if (!type || !categorie || !description || !contact) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Routage automatique
    const { data: rule } = await admin
      .from("routing_rules")
      .select("service_id")
      .eq("categorie", categorie)
      .single();

    const serviceId = rule?.service_id ?? null;

    // Insertion ticket
    const { data: ticket, error } = await admin
      .from("tickets")
      .insert({
        type,
        categorie,
        description,
        adresse: adresse || "Non précisée",
        photo_url: photo_url || null,
        contact,
        nom: nom || null,
        statut: "nouveau",
        service_id: serviceId,
      })
      .select()
      .single();

    if (error) throw error;

    // Notifications email (non bloquant)
    if (serviceId) {
      const { data: service } = await admin
        .from("services")
        .select("*")
        .eq("id", serviceId)
        .single();

      if (service) {
        sendServiceNotification(ticket as Ticket, service as Service).catch(
          console.error
        );
      }
    }

    sendCitizenConfirmation(contact, ticket.id).catch(console.error);

    return NextResponse.json({ id: ticket.id }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/tickets:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

// GET /api/tickets — liste pour admin (authentifié)
export async function GET(req: NextRequest) {
  try {
    const admin = createAdminClient();
    const { searchParams } = new URL(req.url);
    const statut = searchParams.get("statut");
    const service = searchParams.get("service");

    let query = admin
      .from("tickets")
      .select("*, service:services(id, nom, email)")
      .order("created_at", { ascending: false });

    if (statut) query = query.eq("statut", statut);
    if (service) query = query.eq("service_id", service);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data);
  } catch (err) {
    console.error("GET /api/tickets:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
