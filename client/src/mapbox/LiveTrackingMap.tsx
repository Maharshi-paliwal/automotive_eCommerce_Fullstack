import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { socket } from "./socket";

type Props = {
  orderId: string;
  destination: [number, number]; // [lng, lat]
  liveLocation?: RiderLocation | null;
};

type RiderLocation = { lng: number; lat: number };

export default function LiveTrackingMap({ orderId, destination, liveLocation }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;
  const [trackingAuthError, setTrackingAuthError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !token) return;

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: destination,
      zoom: 13,
    });

    // Green marker = delivery address
    new mapboxgl.Marker({ color: "#16a34a" })
      .setLngLat(destination)
      .addTo(map);

    // Red marker = rider (added when a location is available)
    const riderMarker = new mapboxgl.Marker({ color: "#dc2626" });
    let riderAdded = false;

    if (liveLocation && Number.isFinite(liveLocation.lng) && Number.isFinite(liveLocation.lat)) {
      riderMarker.setLngLat([liveLocation.lng, liveLocation.lat]).addTo(map);
      riderAdded = true;
      map.setCenter([liveLocation.lng, liveLocation.lat]);
    }

    const handleLocation = ({ lng, lat }: RiderLocation) => {
      riderMarker.setLngLat([lng, lat]);
      if (!riderAdded) {
        riderMarker.addTo(map);
        riderAdded = true;
      }
      map.easeTo({ center: [lng, lat] });
    };

    // Join after each successful connection so token refreshes/reconnects work.
    const joinOrderRoom = () => {
      setTrackingAuthError(false);
      socket.emit("order:join", orderId);
    };
    const handleConnectError = () => setTrackingAuthError(true);
    socket.on("connect", joinOrderRoom);
    socket.on("connect_error", handleConnectError);
    socket.on("rider:location", handleLocation);
    if (!localStorage.getItem("token")) setTrackingAuthError(true);
    else if (!socket.connected) socket.connect();
    if (socket.connected) joinOrderRoom();

    // Cleanup: stop listening and destroy the map
    return () => {
      socket.off("connect", joinOrderRoom);
      socket.off("connect_error", handleConnectError);
      socket.off("rider:location", handleLocation);
      socket.disconnect();
      map.remove();
    };
  }, [orderId, destination[0], destination[1], token]);

  if (!token) {
    return (
      <div className="flex h-full items-center justify-center bg-app-green/5 px-4 text-center text-sm text-app-green/60">
        Mapbox is not configured. Add a VITE_MAPBOX_TOKEN to the frontend environment.
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {trackingAuthError && (
        <div className="absolute bottom-3 left-3 rounded-lg bg-white/95 px-3 py-2 text-xs text-app-blue shadow" role="status">
          Sign in again to view live rider tracking.
        </div>
      )}
    </div>
  );
}
