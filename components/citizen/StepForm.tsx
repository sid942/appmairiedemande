"use client";

import { useState, useRef } from "react";
import { TicketType, TicketCategory, TYPE_LABELS, CATEGORY_LABELS, CATEGORY_ICONS } from "@/types";
import { supabase } from "@/lib/supabase";
import { DEMO_MODE, demoCreateTicketWithDedup } from "@/lib/demo-store";

interface Props {
  type: TicketType;
  category: TicketCategory;
  onSuccess: (id: string, linkedTo?: { masterId: string; signalNumber: number }) => void;
  onBack: () => void;
}

export default function StepForm({ type, category, onSuccess, onBack }: Props) {
  const [adresse, setAdresse] = useState("");
  const [description, setDescription] = useState("");
  const [nom, setNom] = useState("");
  const [contact, setContact] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Photo trop volumineuse (max 5 Mo)"); return; }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    setError("");
  }

  function handleGeolocate() {
    if (!navigator.geolocation) return;
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
          const data = await res.json();
          setAdresse(data.display_name || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        } catch {
          setAdresse(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        } finally { setGeoLoading(false); }
      },
      () => { setError("Géolocalisation refusée"); setGeoLoading(false); }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contact.trim()) { setError("Votre contact est obligatoire"); return; }
    setError(""); setLoading(true);
    try {
      if (DEMO_MODE) {
        const { ticket, linkedTo } = await demoCreateTicketWithDedup({ type, categorie: category, description, adresse: adresse || "Non précisée", contact, nom: nom || undefined });
        onSuccess(ticket.id, linkedTo ? { masterId: linkedTo.masterId, signalNumber: linkedTo.signalNumber } : undefined); return;
      }
      let photoUrl = "";
      if (photo) {
        const ext = photo.name.split(".").pop();
        const fileName = `${Date.now()}.${ext}`;
        const { data: up, error: upErr } = await supabase.storage.from("photos").upload(fileName, photo, { contentType: photo.type });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("photos").getPublicUrl(up.path);
        photoUrl = urlData.publicUrl;
      }
      const res = await fetch("/api/tickets", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, categorie: category, description, adresse, photo_url: photoUrl || undefined, contact, nom: nom || undefined }),
      });
      if (!res.ok) { const { error: e } = await res.json(); throw new Error(e || "Erreur"); }
      const { id } = await res.json();
      onSuccess(id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally { setLoading(false); }
  }

  return (
    <div>
      <button onClick={onBack} className="btn-ghost mb-6">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Retour
      </button>

      <div className="flex items-center gap-2 mb-8">
        <span className="text-xl">{CATEGORY_ICONS[category]}</span>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">{CATEGORY_LABELS[category]}</h1>
          <p className="text-xs text-slate-400">{TYPE_LABELS[type]}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Description */}
        <div className="card !p-0 overflow-hidden">
          <label className="label px-4 pt-4">
            Description <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décrivez votre demande en quelques mots..."
            rows={4}
            required
            className="w-full px-4 pb-4 text-sm bg-transparent focus:outline-none resize-none placeholder:text-slate-300 text-slate-800"
          />
        </div>

        {/* Adresse */}
        <div>
          <label className="label">Adresse concernée</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={adresse}
              onChange={(e) => setAdresse(e.target.value)}
              placeholder="Ex : 12 rue de la République…"
              className="input flex-1"
            />
            <button
              type="button"
              onClick={handleGeolocate}
              disabled={geoLoading}
              className="w-12 h-12 flex-shrink-0 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-colors disabled:opacity-50"
              title="Ma position"
            >
              {geoLoading
                ? <svg className="animate-spin w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                : <span className="text-lg">📍</span>
              }
            </button>
          </div>
        </div>

        {/* Photo */}
        <div>
          <label className="label">Photo (optionnel)</label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoChange} className="hidden" />
          {photoPreview ? (
            <div className="relative rounded-2xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoPreview} alt="Aperçu" className="w-full h-44 object-cover" />
              <button
                type="button"
                onClick={() => { setPhoto(null); setPhotoPreview(""); if (fileRef.current) fileRef.current.value = ""; }}
                className="absolute top-3 right-3 bg-black/50 backdrop-blur text-white rounded-full w-7 h-7 flex items-center justify-center text-xs hover:bg-black/70"
              >✕</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-7 text-slate-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex flex-col items-center gap-2"
            >
              <span className="text-3xl">📷</span>
              <span className="text-sm font-medium">Ajouter une photo</span>
              <span className="text-xs text-slate-300">JPG, PNG · max 5 Mo</span>
            </button>
          )}
        </div>

        {/* Contact + Nom */}
        <div className="card flex flex-col gap-4">
          <div>
            <label className="label">
              Email ou téléphone <span className="text-red-400 normal-case tracking-normal font-normal">*</span>
            </label>
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="jean@email.fr ou 06 12 34 56 78"
              className="input"
              required
            />
            <p className="text-xs text-slate-400 mt-1.5">Pour le suivi de votre demande</p>
          </div>
          <div>
            <label className="label">Votre nom <span className="font-normal normal-case text-slate-400">(optionnel)</span></label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Jean Dupont"
              className="input"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-100 text-red-600 rounded-2xl px-4 py-3.5 text-sm">
            <span className="text-base mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-1">
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Envoi en cours…
            </>
          ) : (
            <>
              Envoyer ma demande
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3"/>
              </svg>
            </>
          )}
        </button>

        <p className="text-center text-xs text-slate-400">
          Vos données sont traitées de façon confidentielle
        </p>
      </form>
    </div>
  );
}
