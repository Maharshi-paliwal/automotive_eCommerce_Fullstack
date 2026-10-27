import { Outlet, useNavigate } from "react-router-dom";
import { LogOutIcon, TruckIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { DeliveryPartner } from "../../types";
import { dummyDeliveryPartnerData } from "../../assets/assets";

export default function DeliveryLayout() {
    const navigate = useNavigate();
    const [partner, setPartner] = useState<DeliveryPartner | null>(null);

    useEffect(() => {
        setPartner(dummyDeliveryPartnerData[0] as DeliveryPartner);
    }, [navigate]);

    const handleLogout = () => {
        navigate("/delivery/login");
    };

    if (!partner) return null;

    return (
        <div className="delivery-shell min-h-screen">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 border-b border-app-border/80 bg-white/90 shadow-sm backdrop-blur-xl">
                <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
                    <div className="flex items-center gap-2">
                        <TruckIcon className="size-6 text-app-green" />
                        <span className="text-base font-semibold tracking-tight text-app-blue">TorqueNest Delivery</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-zinc-600">{partner.name}</span>
                        <button onClick={handleLogout} className="p-2 text-zinc-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                            <LogOutIcon className="size-4" />
                        </button>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-6xl px-3 py-4 sm:px-5 lg:py-5">
                <main className="delivery-workspace min-w-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
