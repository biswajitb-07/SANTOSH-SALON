import { ImagePlus, Save, XCircle } from "lucide-react";
import { ButtonSpinner, useBodyScrollLock } from "./common.jsx";

const defaultBarberOptions = [
  "Next available barber",
  "Santosh",
  "Haircut specialist",
  "Beard stylist"
];

export function ServiceDialog({
  actionLoading,
  draft,
  editingServiceId,
  onClose,
  onDraftChange,
  onImageChange,
  onSubmit,
  open
}) {
  useBodyScrollLock(open);

  if (!open) return null;

  const updateDraft = (patch) => {
    onDraftChange((value) => ({ ...value, ...patch }));
  };

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-[#081311]/70 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <form
        className="soft-shadow max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-[var(--color-surface)] p-5 sm:max-h-[90vh] sm:max-w-2xl sm:p-6"
        onSubmit={onSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
              Haircut Design
            </p>
            <h2 className="mt-1 text-3xl font-black">
              {editingServiceId ? "Update service" : "Add service"}
            </h2>
            <p className="mt-2 text-sm font-bold text-[#9db2ad]">
              Service images are saved in Cloudinary. When you choose a new
              image while editing, the previous Cloudinary image is deleted.
            </p>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-2xl bg-[#101a18]"
            onClick={onClose}
            type="button"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Service Name
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[#35201f] px-4 outline-none focus:border-[#991b1b]"
              onChange={(event) => updateDraft({ title: event.target.value })}
              placeholder="Classic Haircut"
              value={draft.title}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Time
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[#35201f] px-4 outline-none focus:border-[#991b1b]"
              onChange={(event) => updateDraft({ time: event.target.value })}
              value={draft.time}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Price
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[#35201f] px-4 outline-none focus:border-[#991b1b]"
              min="1"
              onChange={(event) => updateDraft({ amount: event.target.value })}
              type="number"
              value={draft.amount}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Service Image
            </span>
            <input
              accept="image/*"
              className="h-12 w-full rounded-2xl border border-[#35201f] bg-[var(--color-surface)] px-4 py-2 file:mr-4 file:rounded-xl file:border-0 file:bg-[#991b1b] file:px-4 file:py-2 file:font-black file:text-white outline-none focus:border-[#991b1b]"
              onChange={onImageChange}
              type="file"
            />
          </label>
          <div className="sm:col-span-2">
            {draft.imagePreview || draft.imageUrl ? (
              <img
                alt="Service preview"
                className="h-56 w-full rounded-2xl object-cover"
                src={draft.imagePreview || draft.imageUrl}
              />
            ) : (
              <div className="grid h-56 place-items-center rounded-2xl bg-[#101a18] text-[#991b1b]">
                <ImagePlus size={30} />
              </div>
            )}
          </div>
          <label className="flex items-center gap-3 rounded-2xl bg-[#101a18] p-4 font-bold sm:col-span-2">
            <input
              checked={draft.active}
              className="h-5 w-5 accent-[#991b1b]"
              onChange={(event) => updateDraft({ active: event.target.checked })}
              type="checkbox"
            />
            Show on client website
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#15803d] px-5 py-3 font-black text-white shadow-lg shadow-[#15803d]/20 transition hover:bg-[#166534] disabled:opacity-60"
            disabled={actionLoading === "service-save"}
            type="submit"
          >
            {actionLoading === "service-save" ? <ButtonSpinner /> : <Save size={18} />}
            {actionLoading === "service-save"
              ? "Saving..."
              : editingServiceId
                ? "Update Service"
                : "Add Service"}
          </button>
          <button
            className="min-h-12 rounded-2xl bg-[#101a18] px-5 py-3 font-black text-[#f4fbf8]"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export function BookingDialog({
  actionLoading,
  barberOptions = defaultBarberOptions,
  bookingDateValue,
  draft,
  mode,
  onClose,
  onDateChange,
  onDraftChange,
  onSubmit,
  open,
  serviceItems,
  timeSlotValue,
  timeSlots,
  todayDateValue
}) {
  useBodyScrollLock(open);

  if (!open || !draft) return null;

  const updateDraft = (patch) => {
    onDraftChange((value) => ({ ...value, ...patch }));
  };

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-[#081311]/70 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <form
        className="soft-shadow max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-[var(--color-surface)] p-5 sm:max-h-[90vh] sm:max-w-2xl sm:p-6"
        onSubmit={onSubmit}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
              Booking
            </p>
            <h2 className="mt-1 text-3xl font-black">
              {mode === "create" ? "Create booking" : "Update booking"}
            </h2>
          </div>
          <button
            className="grid h-11 w-11 place-items-center rounded-2xl bg-[#101a18]"
            onClick={onClose}
            type="button"
          >
            <XCircle size={20} />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["name", "Customer Name", "text"],
            ["mobile", "Mobile", "text"],
            ["email", "Registered Email", "email"],
            ["amount", "Amount", "number"]
          ].map(([field, label, type]) => (
            <label className="block" key={field}>
              <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
                {label}
              </span>
              <input
                className="h-12 w-full rounded-2xl border border-[#35201f] px-4 outline-none focus:border-[#991b1b]"
                onChange={(event) => updateDraft({ [field]: event.target.value })}
                type={type}
                value={draft[field] || ""}
              />
            </label>
          ))}
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Booking Date
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[#35201f] px-4 outline-none focus:border-[#991b1b]"
              min={todayDateValue}
              onChange={(event) => onDateChange(event.target.value)}
              type="date"
              value={bookingDateValue}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Service
            </span>
            <select
              className="h-12 w-full rounded-2xl border border-[#35201f] bg-[var(--color-surface)] px-4 outline-none focus:border-[#991b1b]"
              onChange={(event) => {
                const selectedService = serviceItems.find(
                  (service) => service.title === event.target.value
                );
                updateDraft({
                  service: event.target.value,
                  amount: selectedService?.amount ?? draft.amount
                });
              }}
              value={draft.service || ""}
            >
              {serviceItems.filter((service) => service.active).map((service) => (
                <option key={service.id || service.title} value={service.title}>
                  {service.title} - Rs. {service.amount}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Time Slot
            </span>
            <select
              className="h-12 w-full rounded-2xl border border-[#35201f] px-4 outline-none focus:border-[#991b1b]"
              disabled={!timeSlots.length}
              onChange={(event) => updateDraft({ timeSlot: event.target.value })}
              value={timeSlotValue}
            >
              {timeSlots.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
            {!timeSlots.length ? (
              <p className="mt-2 text-xs font-bold text-[#b91c1c]">
                No future slots are available for the selected date.
              </p>
            ) : null}
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Barber
            </span>
            <select
              className="h-12 w-full rounded-2xl border border-[#35201f] px-4 outline-none focus:border-[#991b1b]"
              onChange={(event) => updateDraft({ barberName: event.target.value })}
              value={draft.barberName || "Next available barber"}
            >
              {barberOptions.map((barber) => (
                <option key={barber} value={barber}>
                  {barber}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              Status
            </span>
            <select
              className="h-12 w-full rounded-2xl border border-[#35201f] px-4 outline-none focus:border-[#991b1b]"
              onChange={(event) => updateDraft({ status: event.target.value })}
              value={draft.status || "waiting"}
            >
              <option value="waiting">Confirmed</option>
              <option value="waitlist">Waiting</option>
              <option value="in_chair">In Chair</option>
              <option value="skipped">Skipped</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <button
          className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#15803d] px-5 py-3 font-black text-white shadow-lg shadow-[#15803d]/20 transition hover:bg-[#166534] disabled:opacity-60"
          disabled={actionLoading === "booking-save"}
          type="submit"
        >
          {actionLoading === "booking-save" ? <ButtonSpinner /> : <Save size={18} />}
          {actionLoading === "booking-save"
            ? "Saving..."
            : mode === "create"
              ? "Create Booking"
              : "Save Booking"}
        </button>
      </form>
    </div>
  );
}
