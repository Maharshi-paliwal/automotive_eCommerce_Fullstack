import { MapPinIcon } from "lucide-react";
import LiveTrackingMap from "../../mapbox/LiveTrackingMap";

type Coordinates = { lat: number; lng: number };
type OrderForMap = {
  _id: string;
  status: string;
  shippingAddress?: Coordinates | null;
};

export default function LiveMap({
  order,
  liveLocation,
}: {
  order: OrderForMap;
  liveLocation: Coordinates | null;
}) {
  if (order.status === "Delivered" || order.status === "Cancelled") return null;

  const address = order.shippingAddress;
  const hasDestination =
    typeof address?.lat === "number" &&
    Number.isFinite(address.lat) &&
    typeof address.lng === "number" &&
    Number.isFinite(address.lng);

  if (!hasDestination) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-2xl border border-app-border bg-app-green/5">
        <div className="text-center">
          <MapPinIcon className="mx-auto mb-2 size-8 text-app-green/40" />
          <p className="text-sm font-medium text-app-green/60">
            Delivery address coordinates are unavailable.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-app-border" style={{ height: 280 }}>
      <LiveTrackingMap
        orderId={order._id}
        destination={[address.lng, address.lat]}
        liveLocation={liveLocation}
      />
    </div>
  );
}
