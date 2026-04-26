-- =============================================
-- DEMANDE MAIRIE - Schéma Supabase
-- Exécuter ce script dans l'éditeur SQL Supabase
-- =============================================

-- Table services
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table agents
CREATE TABLE IF NOT EXISTS agents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nom TEXT NOT NULL,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table tickets
CREATE TABLE IF NOT EXISTS tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('probleme', 'question', 'demande')),
  categorie TEXT NOT NULL CHECK (categorie IN ('eclairage', 'voirie', 'dechets', 'espaces_verts', 'autre')),
  description TEXT NOT NULL,
  adresse TEXT NOT NULL,
  photo_url TEXT,
  contact TEXT NOT NULL,
  nom TEXT,
  statut TEXT NOT NULL DEFAULT 'nouveau' CHECK (statut IN ('nouveau', 'en_cours', 'transmis', 'termine', 'ferme')),
  priorite TEXT NOT NULL DEFAULT 'normale' CHECK (priorite IN ('faible', 'normale', 'haute', 'urgente')),
  service_id UUID REFERENCES services(id),
  agent_id UUID REFERENCES agents(id),
  citoyen_contacte BOOLEAN DEFAULT false,
  transmis_prestataire BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table règles de routage
CREATE TABLE IF NOT EXISTS routing_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categorie TEXT NOT NULL UNIQUE CHECK (categorie IN ('eclairage', 'voirie', 'dechets', 'espaces_verts', 'autre')),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT
);

-- Table notes/historique
CREATE TABLE IF NOT EXISTS ticket_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'note',
  contenu TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Données de démonstration
-- =============================================

-- Services par défaut
INSERT INTO services (id, nom, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Service Technique', 'technique@mairie.fr'),
  ('22222222-2222-2222-2222-222222222222', 'Service Propreté', 'proprete@mairie.fr'),
  ('33333333-3333-3333-3333-333333333333', 'Service Voirie', 'voirie@mairie.fr'),
  ('44444444-4444-4444-4444-444444444444', 'Espaces Verts', 'espacesverts@mairie.fr'),
  ('55555555-5555-5555-5555-555555555555', 'Accueil Général', 'accueil@mairie.fr')
ON CONFLICT DO NOTHING;

-- Agents par défaut
INSERT INTO agents (nom, service_id) VALUES
  ('Thomas Renard',  '11111111-1111-1111-1111-111111111111'),
  ('Claire Morin',   '11111111-1111-1111-1111-111111111111'),
  ('Marc Petit',     '22222222-2222-2222-2222-222222222222'),
  ('Sophie Lambert', '33333333-3333-3333-3333-333333333333'),
  ('Paul Bernard',   '33333333-3333-3333-3333-333333333333'),
  ('Julie Fontaine', '44444444-4444-4444-4444-444444444444'),
  ('Antoine Blanc',  '55555555-5555-5555-5555-555555555555')
ON CONFLICT DO NOTHING;

-- Règles de routage automatique
INSERT INTO routing_rules (categorie, service_id) VALUES
  ('eclairage',     '11111111-1111-1111-1111-111111111111'),
  ('voirie',        '33333333-3333-3333-3333-333333333333'),
  ('dechets',       '22222222-2222-2222-2222-222222222222'),
  ('espaces_verts', '44444444-4444-4444-4444-444444444444'),
  ('autre',         '55555555-5555-5555-5555-555555555555')
ON CONFLICT DO NOTHING;

-- =============================================
-- Trigger updated_at sur tickets
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- Sécurité RLS (Row Level Security)
-- =============================================

ALTER TABLE tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_notes  ENABLE ROW LEVEL SECURITY;

-- Citoyens : peuvent créer des tickets et lire les services/routage (pour le formulaire)
CREATE POLICY "tickets_insert_public" ON tickets
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "services_read_public" ON services
  FOR SELECT TO anon USING (true);

CREATE POLICY "routing_rules_read_public" ON routing_rules
  FOR SELECT TO anon USING (true);

-- Admins authentifiés : accès complet
CREATE POLICY "tickets_all_authenticated" ON tickets
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "services_all_authenticated" ON services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "agents_all_authenticated" ON agents
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "routing_rules_all_authenticated" ON routing_rules
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "ticket_notes_all_authenticated" ON ticket_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Le service role key bypass RLS automatiquement

-- =============================================
-- Index pour performances
-- =============================================

CREATE INDEX IF NOT EXISTS idx_tickets_statut     ON tickets(statut);
CREATE INDEX IF NOT EXISTS idx_tickets_service_id ON tickets(service_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agents_service_id  ON agents(service_id);
CREATE INDEX IF NOT EXISTS idx_notes_ticket_id    ON ticket_notes(ticket_id);

-- =============================================
-- Bucket Supabase Storage pour photos
-- Créer manuellement dans Storage > New bucket
-- Nom: "photos" | Public: true
-- =============================================
