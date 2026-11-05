import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { LocateFixed } from "lucide-react";

type Coordinates = { lat: number; lng: number };

export default function AddressLocationPicker({
  value,
  onChange,
}: {
  value: Coordinates | null;
  onChange: (coordinates: Coordinates) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const [locationError, setLocationError] = useState("");
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  useEffect(() => {
    if (!containerRef.current || !token) return;
    mapboxgl.accessToken = token;

    const start: [number, number] = value ? [value.lng, value.lat] : [78.9629, 20.5937];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: start,
      zoom: value ? 15 : 4,
    });
    const marker = new mapboxgl.Marker({ color: "#24445F", draggable: true }).setLngLat(start);
    if (value) marker.addTo(map);
    mapRef.current = map;
    markerRef.current = marker;

    const publish = () => {
      const position = marker.getLngLat();
      onChangeRef.current({ lat: position.lat, lng: position.lng });
    };
    map.on("click", (event) => {
      marker.setLngLat(event.lngLat);
      marker.addTo(map);
      publish();
    });
    marker.on("dragend", publish);
    if (value) onChangeRef.current(value);

    return () => {
      marker.remove();
      map.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  // The map is mounted once when the address modal opens; subsequent pin changes do not recreate it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const useCurrentLocation = () => {
    setLocationError("");
    if (!navigator.geolocation) {
      setLocationError("Location is unavailable in this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates = { lat: coords.latitude, lng: coords.longitude };
        markerRef.current?.setLngLat([coordinates.lng, coordinates.lat]);
        if (mapRef.current) markerRef.current?.addTo(mapRef.current);
        mapRef.current?.easeTo({ center: [coordinates.lng, coordinates.lat], zoom: 15 });
        onChange(coordinates);
      },
      (error) => setLocationError(error.message || "Could not determine your location."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  if (!token) {
    return <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">Mapbox is not configured. Add a VITE_MAPBOX_TOKEN to the frontend environment.</p>;
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-medium text-app-blue">Pin your delivery location</label>
          <p className="mt-0.5 text-xs text-app-text-light">Click the map or drag the pin to the delivery entrance.</p>
        </div>
        <button type="button" onClick={useCurrentLocation} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-app-border px-2.5 py-2 text-xs font-medium text-app-blue hover:bg-app-background">
          <LocateFixed className="size-3.5" /> Use my location
        </button>
      </div>
      <div ref={containerRef} className="h-56 overflow-hidden rounded-xl border border-app-border" aria-label="Select delivery location on map" />
      {value ? <p className="mt-2 text-xs text-app-text-light">Location selected: {value.lat.toFixed(6)}, {value.lng.toFixed(6)}</p> : <p className="mt-2 text-xs font-medium text-app-amber-dark">Select your location on the map to continue.</p>}
      {locationError && <p role="alert" className="mt-1 text-xs text-red-600">{locationError}</p>}
    </div>
  );
}
