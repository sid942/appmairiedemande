# Demande Mairie — Guide de démarrage

## 1. Installation

```bash
npm install
cp .env.local.example .env.local
```

## 2. Configurer Supabase

1. Créez un projet sur [supabase.com](https://supabase.com)
2. Allez dans **SQL Editor** et exécutez le fichier `supabase/schema.sql`
3. Allez dans **Storage** → créez un bucket nommé `photos` (public: ✓)
4. Copiez vos clés dans `.env.local` :
   - `NEXT_PUBLIC_SUPABASE_URL` → Settings > API > Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Settings > API > anon public
   - `SUPABASE_SERVICE_ROLE_KEY` → Settings > API > service_role

## 3. Configurer les emails (Resend)

1. Créez un compte sur [resend.com](https://resend.com) (gratuit)
2. Créez une API key
3. Ajoutez dans `.env.local` :
   - `RESEND_API_KEY=re_xxxxx`
   - `FROM_EMAIL=noreply@votre-domaine.fr`

> Si vous n'avez pas de domaine, utilisez le domaine sandbox Resend

## 4. Créer le compte admin

Dans **Supabase > Authentication > Users** :
- Cliquez "Add user"
- Email + mot de passe de votre choix
- Ce compte sera utilisé pour `/admin`

## 5. Lancer l'application

```bash
npm run dev
```

- **Interface citoyen** : http://localhost:3000/demande
- **Back-office mairie** : http://localhost:3000/admin

## 6. Déployer sur Vercel

```bash
npx vercel
```

Puis ajoutez les variables d'environnement dans le dashboard Vercel.

---

## Structure des fichiers

```
app/
  demande/page.tsx        → Interface citoyen (form multi-étapes)
  admin/page.tsx          → Login mairie
  admin/dashboard/page.tsx → Liste des tickets
  admin/tickets/[id]/page.tsx → Fiche ticket
  api/tickets/route.ts    → POST créer, GET lister
  api/tickets/[id]/route.ts → GET détail, PATCH modifier
  api/services/route.ts   → GET services
components/citizen/       → Composants du formulaire citoyen
lib/supabase.ts           → Client Supabase
lib/email.ts              → Envoi emails (Resend)
types/index.ts            → Types TypeScript + labels
supabase/schema.sql       → Script SQL à exécuter
```
