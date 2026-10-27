import { useEffect, useState , useCallback} from "react";
import { PackageIcon, NavigationIcon } from "lucide-react";
import OtpModal from "../../components/Delivery/OtpModal";
import CancelModal from "../../components/Delivery/CancelModal";
import DeliveryOrderCard from "../../components/Delivery/DeliveryOrderCard";
// import Loading from "../../components/Loading";
import Loader from "../../components/LoaderSecondary";
import type { Order } from "../../types";
import { dummyDashboardOrdersData } from "../../assets/assets";

export default function DeliveryDashboard() {

    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<"active" | "completed">("active");
    const [tracking, setTracking] = useState(false);
              const handleLoaderComplete = useCallback(() => setLoading(true), [])
    

    // OTP modal
    const [otpModal, setOtpModal] = useState<string | null>(null);
    const [otp, setOtp] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Cancel modal
    const [cancelModal, setCancelModal] = useState<string | null>(null);
    const [cancelReason, setCancelReason] = useState("");

    const fetchOrders = async () => {
        setLoading(true);
        setOrders(dummyDashboardOrdersData as any);
        setLoading(false);
    };

    useEffect(() => {
        fetchOrders();
    }, [tab]);

    const handleUpdateStatus = async (orderId: string, status: string) => {
        console.log(orderId, status);
    };

    const handleComplete = async () => {
        if (!otpModal || !otp) return;
        setSubmitting(true);
        setTimeout(() => {
            setSubmitting(false);
            setOtpModal(null);
            setOtp("");
        }, 1000);
    };

    const handleCancel = async () => {
        if (!cancelModal) return;
        setSubmitting(true);
        setTimeout(() => {
            setSubmitting(false);
            setCancelModal(null);
            setCancelReason("");
        }, 1000);
    }

    return (
        <div className="space-y-4">
            <section className="workspace-surface flex flex-wrap items-center justify-between gap-3 overflow-hidden bg-gradient-to-r from-app-blue-dark to-app-blue p-4 text-white sm:px-5">
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-amber">Delivery workspace</p>
                    <h1 className="mt-1 text-lg font-semibold tracking-tight">Your route, at a glance</h1>
                    <p className="mt-0.5 text-xs text-white/65">Manage assigned orders and keep customers updated.</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">Today's queue</p>
                    <p className="text-lg font-semibold">{orders.length} <span className="text-xs font-normal text-white/70">orders</span></p>
                </div>
            </section>
            {/* Tabs + Tracking toggle */}
            <div className="flex items-center gap-2 flex-wrap">
                {(["active", "completed"] as const).map((t) => (
                    <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${tab === t ? "bg-app-green text-white" : "bg-white text-zinc-600 hover:bg-app-cream border border-app-border"}`}>
                        {t === "active" ? "Active" : "Completed"}
                    </button>
                ))}
                <div className="ml-auto">
                    <button onClick={() => setTracking((prev) => !prev)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors flex items-center gap-1.5 ${tracking ? "bg-green-600 text-white" : "bg-white text-zinc-600 border border-app-border hover:bg-app-cream"}`}>
                        <NavigationIcon className={`w-3.5 h-3.5 ${tracking ? "animate-pulse" : ""}`} />
                        {tracking ? "Sharing Location" : "Share Location"}
                    </button>
                </div>
            </div>

            {/* Orders */}
            {loading ? (
                <Loader onComplete={handleLoaderComplete} />
            ) : orders.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-app-border">
                    <PackageIcon className="size-12 text-app-border mx-auto mb-3" />
                    <p className="text-lg font-semibold text-zinc-900 mb-1">No {tab} deliveries</p>
                    <p className="text-sm text-zinc-500">{tab === "active" ? "You'll see new assignments here" : "Completed deliveries will appear here"}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => <DeliveryOrderCard key={order._id} order={order} tab={tab} handleUpdateStatus={handleUpdateStatus} setOtpModal={setOtpModal} setCancelModal={setCancelModal} />)}
                </div>
            )}

            {/* OTP Modal */}
            {otpModal && <OtpModal setOtpModal={setOtpModal} otp={otp} setOtp={setOtp} handleComplete={handleComplete} submitting={submitting} />}
            {/* Cancel Modal */}
            {cancelModal && <CancelModal setCancelModal={setCancelModal} cancelReason={cancelReason} setCancelReason={setCancelReason} handleCancel={handleCancel} submitting={submitting} />}
        </div>
    );
}
