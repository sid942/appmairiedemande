/**
 * Logo officiel de la ville de Fresnes.
 * Source : /public/logo-fresnes.svg — couleur brand #046982.
 *
 * La prop `background` affiche le logo sur un rectangle blanc arrondi
 * (requis sur fonds colorés / sombres pour respecter la charte).
 */
/* eslint-disable @next/next/no-img-element */

interface Props {
  /** Taille du logo (hauteur du bloc). */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Rectangle blanc sous le logo (requis sur fond sombre/coloré). */
  background?: boolean;
  /** Affiche le sous-titre "Demande Mairie / Back-office" à côté. */
  tagline?: string;
  className?: string;
}

const SIZE: Record<NonNullable<Props["size"]>, { img: string; pad: string; text: string }> = {
  xs: { img: "h-5",  pad: "px-2 py-1",     text: "text-[10px]" },
  sm: { img: "h-7",  pad: "px-2.5 py-1.5", text: "text-[11px]" },
  md: { img: "h-9",  pad: "px-3 py-2",     text: "text-xs"    },
  lg: { img: "h-12", pad: "px-4 py-2.5",   text: "text-sm"    },
  xl: { img: "h-16", pad: "px-5 py-3",     text: "text-sm"    },
};

export default function Logo({
  size = "md",
  background = false,
  tagline,
  className = "",
}: Props) {
  const s = SIZE[size];

  const inner = (
    <div className="flex items-center gap-3">
      <img
        src="/logo-fresnes.svg"
        alt="Ville de Fresnes"
        className={`${s.img} w-auto block`}
        draggable={false}
      />
      {tagline && (
        <div className="flex flex-col leading-tight border-l border-slate-200 pl-3">
          <span className={`${s.text} font-bold text-slate-700`}>Demande Mairie</span>
          <span className={`${s.text} text-slate-400`}>{tagline}</span>
        </div>
      )}
    </div>
  );

  if (background) {
    return (
      <div
        className={`inline-flex items-center bg-white rounded-xl shadow-sm border border-slate-200/60 ${s.pad} ${className}`}
      >
        {inner}
      </div>
    );
  }

  return <div className={`inline-flex items-center ${className}`}>{inner}</div>;
}
