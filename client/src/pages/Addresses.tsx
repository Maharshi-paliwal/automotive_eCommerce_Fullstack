
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Address } from "../types";
import { MapPinIcon, PlusIcon } from "lucide-react";
import Loader from "../components/LoaderSecondary";
import AddressCard from "../components/AddressCard";
import AddressForm from "../components/AddressForm";
import { addAddress, listAddresses, updateAddress } from "../api/addressApi";
import { errorMessage } from "../api/http";
import toast from "react-hot-toast";

const emptyForm = {
  label: "",
  address: "",
  city: "",
  state: "",
  zip: "",
  isDefault: false,
  lat: null as number | null,
  lng: null as number | null,
};

const Addresses = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const handleLoaderComplete = useCallback(() => setLoading(true), []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const resetForm = () => {
    setForm({ ...emptyForm });
    setShowForm(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { lat, lng } = form;
    if (lat === null || lng === null) {
        toast.error("Select your delivery location on the map before saving.");
        return;
    }
    try {
      if (editingId) setAddresses(await updateAddress(editingId, { ...form, lat, lng }));
      else {
        const created = await addAddress({ ...form, lat, lng });
        setAddresses((current) => [...current, created]);
      }
      resetForm();
    } catch (error) { toast.error(errorMessage(error, "Could not save address.")); }
  };

  const onEditHandler = (address: Address) => {
    setForm({
      label: address.label,
      address: address.address,
      city: address.city,
      state: address.state,
      zip: address.zip,
      isDefault: address.isDefault,
      lat: address.lat,
      lng: address.lng,
    });

    setEditingId(address._id);
    setShowForm(true);
  };

  useEffect(() => {
    let cancelled = false;
    listAddresses().then((saved) => { if (!cancelled) setAddresses(saved); })
      .catch((error) => { if (!cancelled) toast.error(errorMessage(error, "Could not load addresses.")); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-app-background">
      <div className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        {/* Page header */}
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row
                        sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-app-blue">
              My Addresses
            </h1>
            <p className="mt-1 text-sm text-app-text-light">
              Manage your saved delivery addresses.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="inline-flex w-full items-center justify-center gap-2
                       rounded-xl bg-app-blue px-4 py-3 text-sm font-semibold
                       text-white transition-colors hover:bg-app-blue-light
                       sm:w-auto"
          >
            <PlusIcon className="size-4" />
            Add Address
          </button>
        </div>

        {/* Address form */}
        {showForm && (
          <AddressForm
            resetForm={resetForm}
            handleSubmit={handleSubmit}
            form={form}
            setform={setForm}
            editingId={editingId}
          />
        )}

        {/* Address list */}
        {loading ? (
          <Loader onComplete={handleLoaderComplete} />
        ) : addresses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-app-border
                          bg-white px-5 py-16 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center
                            justify-center rounded-full bg-app-background">
              <MapPinIcon className="size-8 text-app-blue" />
            </div>

            <h2 className="mb-2 text-lg font-semibold text-app-blue">
              No saved addresses yet
            </h2>

            <p className="mb-5 text-sm text-app-text-light">
              Add an address for faster checkout.
            </p>

            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded-xl bg-app-blue px-5 py-2.5 text-sm
                         font-semibold text-white hover:bg-app-blue-light"
            >
              Add your first address
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {addresses.map((address) => (
              <AddressCard
                key={address._id}
                addr={address}
                onEditHandler={onEditHandler}
                setAddresses={setAddresses}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Addresses;
