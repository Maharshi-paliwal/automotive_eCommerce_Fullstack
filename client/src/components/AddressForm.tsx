
import { XIcon } from "lucide-react";
import type { FormEvent } from "react";

interface AddressFormProps {
  resetForm: () => void;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  form: {
    label: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    isDefault: boolean;
  };
  setform: (form: AddressFormProps["form"]) => void;
  editingId: string | null;
}

const AddressForm = ({
  resetForm,
  handleSubmit,
  form,
  setform,
  editingId,
}: AddressFormProps) => {
  const updateField = (
    field: keyof AddressFormProps["form"],
    value: string | boolean
  ) => {
    setform({ ...form, [field]: value });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/50 p-4 backdrop-blur-[2px]"
      onClick={resetForm}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto
                   rounded-2xl bg-white p-5 shadow-2xl sm:p-7
                   animate-fade-in"
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-app-blue">
              {editingId ? "Edit Address" : "Add New Address"}
            </h2>
            <p className="mt-1 text-sm text-app-text-light">
              Enter your delivery details below.
            </p>
          </div>

          <button
            type="button"
            onClick={resetForm}
            aria-label="Close address form"
            className="flex size-9 shrink-0 items-center justify-center
                       rounded-full text-app-blue transition-colors
                       hover:bg-app-background"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* Fields */}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-app-blue">
              Label
            </label>
            <input
              type="text"
              placeholder="Home, Work, etc."
              required
              autoComplete="off"
              className="w-full rounded-xl border border-app-border px-4 py-3
                         text-sm outline-none transition-colors
                         focus:border-app-blue focus:ring-2
                         focus:ring-app-blue/10"
              value={form.label}
              onChange={(e) => updateField("label", e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-app-blue">
              Street Address
            </label>
            <input
              type="text"
              placeholder="House number, street, area"
              required
              autoComplete="street-address"
              className="w-full rounded-xl border border-app-border px-4 py-3
                         text-sm outline-none transition-colors
                         focus:border-app-blue focus:ring-2
                         focus:ring-app-blue/10"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-app-blue">
                City
              </label>
              <input
                type="text"
                placeholder="Your city"
                required
                autoComplete="address-level2"
                className="w-full rounded-xl border border-app-border px-4 py-3
                           text-sm outline-none focus:border-app-blue
                           focus:ring-2 focus:ring-app-blue/10"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-app-blue">
                State
              </label>
              <input
                type="text"
                placeholder="Your state"
                required
                autoComplete="address-level1"
                className="w-full rounded-xl border border-app-border px-4 py-3
                           text-sm outline-none focus:border-app-blue
                           focus:ring-2 focus:ring-app-blue/10"
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-app-blue">
              ZIP / Postal Code
            </label>
            <input
              type="text"
              placeholder="Postal code"
              required
              autoComplete="postal-code"
              className="w-full rounded-xl border border-app-border px-4 py-3
                         text-sm outline-none focus:border-app-blue
                         focus:ring-2 focus:ring-app-blue/10"
              value={form.zip}
              onChange={(e) => updateField("zip", e.target.value)}
            />
          </div>

          {/* Default address */}
          <label className="flex cursor-pointer items-center gap-3 rounded-xl
                            border border-app-border p-3.5 transition-colors
                            hover:bg-app-background">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(e) => updateField("isDefault", e.target.checked)}
              className="size-4 shrink-0 accent-[#24445F]"
            />
            <span>
              <span className="block text-sm font-medium text-app-blue">
                Set as default address
              </span>
              <span className="mt-0.5 block text-xs text-app-text-light">
                Use this address for future deliveries.
              </span>
            </span>
          </label>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={resetForm}
            className="w-full rounded-xl border border-app-border px-4 py-3
                       text-sm font-semibold text-app-blue
                       transition-colors hover:bg-app-background sm:w-auto"
          >
            Cancel
          </button>

          <button
            type="submit"
            className="w-full flex-1 rounded-xl bg-app-blue px-4 py-3
                       text-sm font-semibold text-white transition-colors
                       hover:bg-app-blue-light"
          >
            {editingId ? "Update Address" : "Save Address"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddressForm;
