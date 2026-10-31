import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCardIcon,
  MapPinIcon,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { dummyAddressData } from "../assets/assets";
import type { Address } from "../types";
import { useCartStore } from "../zustand/UseCartStore";
import toast from "react-hot-toast";

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; }
}

import CheckoutAddress from "../components/Checkout/CheckoutAddress";
import CheckoutPayment from "../components/Checkout/CheckoutPayment";
import CheckoutReview from "../components/Checkout/CheckoutReview";

const Checkout = () => {
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);

  const [step, setStep] = useState("address");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [loading, setLoading] = useState(false);

  const [address, setAddress] = useState<Address>({
    _id: "",
    label: "Home",
    address: "",
    city: "",
    state: "",
    zip: "",
    isDefault: false,
    lat: 0,
    lng: 0,
  });

  const user = { addresses: dummyAddressData };
  const currency = import.meta.env.VITE_CURRENCY_SYMBOL || "₹";

  // Calculate totals directly from cart items.
  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.product.price) * item.quantity,
    0
  );

  const deliveryFee = subtotal > 2000 ? 0 : 49;
  const tax = subtotal * 0.08;
  const total = subtotal + deliveryFee + tax;

  const itemCount = items.reduce(
    (count, item) => count + item.quantity,
    0
  );

  const formatPrice = (price: number) =>
    `${currency}${price.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const steps = [
    {
      key: "address",
      label: "Address",
      description: "Delivery details",
      icon: MapPinIcon,
    },
    {
      key: "payment",
      label: "Payment",
      description: "Payment method",
      icon: CreditCardIcon,
    },
    {
      key: "review",
      label: "Review",
      description: "Confirm order",
      icon: ShoppingBag,
    },
  ];

  // Set the default saved address.
  useEffect(() => {
    const defaultAddress =
      dummyAddressData.find((item) => item.isDefault) ??
      dummyAddressData[0];

    if (defaultAddress) {
      setAddress(defaultAddress);
    }
  }, []);

  const goToStep = (nextStep: string) => {
    setStep(nextStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePlaceOrder = async () => {
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Please sign in before placing an order.");
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
      const response = await fetch(`${apiUrl}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ items: items.map(({ product, quantity }) => ({ product: product._id, quantity })), shippingAddress: address, paymentMethod }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Could not create your order.");

      if (paymentMethod === "cash") {
        useCartStore.getState().clearCart();
        navigate("/orders");
        return;
      }

      if (!result.payment?.keyId) throw new Error("Payment gateway is not configured.");
      if (!window.Razorpay) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Could not load Razorpay checkout."));
          document.body.appendChild(script);
        });
      }

      const gateway = new window.Razorpay!({
        key: result.payment.keyId,
        amount: result.payment.amount,
        currency: result.payment.currency,
        name: "TorqueNest",
        description: "Order payment",
        order_id: result.payment.id,
        handler: async (payment: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            const verified = await fetch(`${apiUrl}/api/orders/payment/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify(payment),
            });
            const verification = await verified.json();
            if (!verified.ok) throw new Error(verification.message || "Payment verification failed.");
            useCartStore.getState().clearCart();
            navigate("/orders");
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Payment verification failed.");
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
        theme: { color: "#1B3022" },
      });
      gateway.open();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not place your order.");
      setLoading(false);
    } finally {
      if (paymentMethod === "cash") setLoading(false);
    }
  };

  // Empty cart screen.
  if (items.length === 0) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-app-background px-4">
        <div className="text-center">
          <ShoppingBag className="mx-auto mb-4 size-12 text-app-blue" />

          <h2 className="text-2xl font-bold text-app-blue">
            Your cart is empty
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Find the parts your vehicle needs.
          </p>

          <button
            onClick={() => navigate("/products")}
            className="mt-5 rounded-xl bg-app-amber px-5 py-3 font-semibold text-white transition hover:bg-app-blue"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-background">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        {/* Header */}
        <button
          onClick={() => navigate(-1)}
          className="mb-4 flex items-center gap-2 text-sm text-slate-500 transition hover:text-app-blue"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>

        <div className="mb-5">
          <h1 className="text-2xl font-bold text-app-blue sm:text-3xl">
            Checkout
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Complete your delivery and payment details.
          </p>
        </div>

        {/* Compact, clickable checkout tabs */}
        <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-4">
          {steps.map((item, index) => {
            const Icon = item.icon;
            const isActive = step === item.key;

            const currentIndex = steps.findIndex(
              (s) => s.key === step
            );

            const isCompleted = index < currentIndex;

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => goToStep(item.key)}
                aria-current={isActive ? "step" : undefined}
                className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 text-left transition-all sm:gap-3 sm:p-4 ${
                  isActive
                    ? "border-app-blue bg-white shadow-sm"
                    : "border-slate-200 bg-white hover:border-app-amber hover:shadow-sm"
                }`}
              >
                <span
                  className={`flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-11 ${
                    isActive
                      ? "bg-app-blue text-white"
                      : isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="size-5" />
                  ) : (
                    <Icon className="size-5" />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-xs font-semibold sm:text-sm ${
                      isActive
                        ? "text-app-blue"
                        : "text-slate-700"
                    }`}
                  >
                    {item.label}
                  </span>

                  <span className="mt-1 hidden truncate text-xs text-slate-400 sm:block">
                    {item.description}
                  </span>
                </span>

                {index < steps.length - 1 && (
                  <ChevronRight className="hidden size-4 shrink-0 text-slate-300 lg:block" />
                )}
              </button>
            );
          })}
        </div>

        {/* Muted step guidance */}
        <p className="mb-5 text-xs text-slate-400">
          {step === "address" &&
            "Select your delivery address to continue."}
          {step === "payment" &&
            "Choose a payment method before reviewing your order."}
          {step === "review" &&
            "Verify your order details before placing your order."}
        </p>

        {/* Main content and order summary */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px] lg:gap-7">
          <main className="min-w-0">
            {step === "address" && (
              <CheckoutAddress
                user={user}
                address={address}
                setAddress={setAddress}
                setStep={setStep}
              />
            )}

            {step === "payment" && (
              <CheckoutPayment
                setStep={setStep}
                paymentMethod={paymentMethod}
                setPaymentMethod={setPaymentMethod}
              />
            )}

            {step === "review" && (
              <CheckoutReview
                address={address}
                items={items}
                handlePlaceOrder={handlePlaceOrder}
                loading={loading}
                total={total}
              />
            )}
          </main>

          {/* Order summary */}
          <aside className="min-w-0 lg:sticky lg:top-5">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="bg-app-blue p-4 text-white sm:p-5">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="size-5 text-app-amber" />

                  <h2 className="text-lg font-bold">
                    Order summary
                  </h2>
                </div>

                <p className="mt-1 text-sm text-white/70">
                  {itemCount} {itemCount === 1 ? "item" : "items"} in your cart
                </p>
              </div>

              <div className="p-4 sm:p-5">
                {/* Products */}
                <div className="mb-4 space-y-4">
                  {items.map((item) => (
                    <div
                      key={item.product._id}
                      className="flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">
                          {item.product.name}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Qty: {item.quantity}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-semibold text-app-blue">
                        {formatPrice(
                          Number(item.product.price) * item.quantity
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 border-t border-slate-100 pt-4 text-sm">
                  <div className="flex items-center justify-between gap-3 text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-700">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-3 text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Truck className="size-4" />
                      Delivery
                    </span>

                    {deliveryFee === 0 ? (
                      <span className="font-semibold text-emerald-600">
                        FREE
                      </span>
                    ) : (
                      <span className="font-medium text-slate-700">
                        {formatPrice(deliveryFee)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 text-slate-500">
                    <span>Estimated tax (8%)</span>
                    <span className="font-medium text-slate-700">
                      {formatPrice(tax)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="mt-4 border-t border-dashed border-slate-200 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-app-blue">
                        Total payable
                      </p>

                      
                    </div>

                    <p className="text-xl font-bold text-app-blue">
                      {formatPrice(total)}
                    </p>
                  </div>
                </div>

                {/* Free delivery hint */}
                {deliveryFee > 0 && subtotal < 2000 && (
                  <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                    Add {formatPrice(2000 - subtotal)} more to unlock free delivery.
                  </p>
                )}

               
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
