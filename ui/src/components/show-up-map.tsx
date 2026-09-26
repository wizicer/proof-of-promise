import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type ShowUpLocation = {
  lat: number;
  lng: number;
};

const AREA_RADIUS_METERS = 500;

export function ShowUpMap({ value, onChange, interactive = true }: { value: ShowUpLocation; onChange?: (location: ShowUpLocation) => void; interactive?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const areaRef = useRef<L.Circle | null>(null);
  const centerRef = useRef<L.CircleMarker | null>(null);
  const onChangeRef = useRef(onChange);
  const initialCenterRef = useRef(value);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter = initialCenterRef.current;
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([initialCenter.lat, initialCenter.lng], 12);

    if (interactive) L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    areaRef.current = L.circle([initialCenter.lat, initialCenter.lng], {
      radius: AREA_RADIUS_METERS,
      color: "#dc7624",
      fillColor: "#f39a43",
      fillOpacity: 0.2,
      weight: 2,
    }).addTo(map);

    centerRef.current = L.circleMarker([initialCenter.lat, initialCenter.lng], {
      radius: 6,
      color: "#ffffff",
      fillColor: "#0c1739",
      fillOpacity: 1,
      weight: 3,
    }).addTo(map);

    if (interactive) {
      map.on("click", ({ latlng }) => {
        onChangeRef.current?.({ lat: latlng.lat, lng: latlng.lng });
      });
    } else {
      map.dragging.disable();
      map.touchZoom.disable();
      map.doubleClickZoom.disable();
      map.scrollWheelZoom.disable();
      map.boxZoom.disable();
      map.keyboard.disable();
    }

    mapRef.current = map;
    window.setTimeout(() => map.invalidateSize(), 0);

    return () => {
      map.remove();
      mapRef.current = null;
      areaRef.current = null;
      centerRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    const nextCenter = L.latLng(value.lat, value.lng);
    areaRef.current?.setLatLng(nextCenter);
    centerRef.current?.setLatLng(nextCenter);
  }, [value]);

  return <div ref={containerRef} className="show-up-map" aria-label={interactive ? "Choose your show-up area on the map" : "Committed show-up area"} />;
}
