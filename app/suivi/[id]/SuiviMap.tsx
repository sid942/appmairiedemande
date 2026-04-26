"use client";

import { MapContainer, TileLayer, CircleMarker, Tooltip } from "react-leaflet";

interface Props {
  lat: number;
  lng: number;
  label: string;
}

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

export default function SuiviMap({ lat, lng, label }: Props) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={16}
      scrollWheelZoom={false}
      zoomControl={false}
      attributionControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer url={TILE_URL} maxZoom={19} />
      <CircleMarker
        center={[lat, lng]}
        radius={9}
        pathOptions={{
          fillColor: "#046982",
          fillOpacity: 0.95,
          color: "#024253",
          weight: 2,
        }}
      >
        <Tooltip
          permanent
          direction="top"
          offset={[0, -10]}
          className="!bg-fresnes-700 !text-white !border-0 !shadow-md !rounded-lg !text-xs !px-2 !py-1"
        >
          📍 {label.length > 40 ? label.slice(0, 40) + "…" : label}
        </Tooltip>
      </CircleMarker>
    </MapContainer>
  );
}
