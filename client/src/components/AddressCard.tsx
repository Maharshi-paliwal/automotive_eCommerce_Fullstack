
import {
  CheckIcon,
  MapPinIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import type { Address } from "../types";

interface AddressCardProps {
  addr: Address;
  onEditHandler: (addr: Address) => void;
  setAddresses: React.Dispatch<React.SetStateAction<Address[]>>;
}

const AddressCard = ({
  addr,
  setAddresses,
  onEditHandler,
}: AddressCardProps) => {
  const handleDelete = (id: string) => {
    // Temporary local deletion until the backend is connected.
    setAddresses((previous) => previous.filter((item) => item._id !== id));
  };

  return (
    <article
      className="flex w-full max-w-3xl items-start gap-3 rounded-2xl
                 border border-slate-100 bg-white p-4 shadow-sm
                 transition-shadow hover:shadow-md sm:gap-4 sm:p-5"
    >
      {/* Address icon */}
      <div className="flex size-11 shrink-0 items-center justify-center
                      rounded-xl bg-app-blue text-white">
        <MapPinIcon className="size-5" />
      </div>

      {/* Address details */}
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h3 className="break-words text-sm font-semibold text-app-blue">
            {addr.label}
          </h3>

          {addr.isDefault && (
            <span className="inline-flex shrink-0 items-center gap-1
                             rounded-full bg-app-blue px-2.5 py-1
                             text-[10px] font-medium text-white">
              <CheckIcon className="size-3" />
              Default
            </span>
          )}
        </div>

        <p className="break-words text-sm leading-6 text-app-text-light">
          {addr.address}, {addr.city}, {addr.state}, {addr.zip}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Edit ${addr.label} address`}
          onClick={() => onEditHandler(addr)}
          className="flex size-9 items-center justify-center rounded-lg
                     text-app-blue transition-colors hover:bg-app-background"
        >
          <PencilIcon className="size-4" />
        </button>

        <button
          type="button"
          aria-label={`Delete ${addr.label} address`}
          onClick={() => handleDelete(addr._id)}
          className="flex size-9 items-center justify-center rounded-lg
                     text-app-blue transition-colors hover:bg-red-50
                     hover:text-red-600"
        >
          <Trash2Icon className="size-4" />
        </button>
      </div>
    </article>
  );
};

export default AddressCard;
