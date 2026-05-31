import {
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  QrCode,
  Save,
  XCircle
} from "lucide-react";
import { ButtonSpinner } from "../components/common.jsx";

export function PublicLinkPage({
  actionLoading,
  copyPublicLink,
  publicQueueLink
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <article className="soft-shadow rounded-3xl bg-white p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
          Public Link
        </p>
        <h2 className="mt-1 text-3xl font-black">Customer queue URL</h2>
        <p className="mt-3 leading-7 text-[#9db2ad]">
          Customers can use this link to open the salon page, choose a
          service, pay, and join the queue.
        </p>
        <div className="mt-5 flex flex-col gap-3 rounded-3xl bg-[#101a18] p-4 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 break-all font-black text-[#f4fbf8]">
            {publicQueueLink}
          </p>
          <button
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#081311] px-4 font-black text-white disabled:opacity-60"
            disabled={actionLoading === "copy-link"}
            onClick={copyPublicLink}
            type="button"
          >
            {actionLoading === "copy-link" ? <ButtonSpinner /> : <Copy size={18} />}
            {actionLoading === "copy-link" ? "Copying..." : "Copy"}
          </button>
        </div>
      </article>
      <article className="soft-shadow rounded-3xl border border-[#f9c66d]/15 bg-[#101a18] p-5 text-[#f4fbf8] sm:p-6">
        <QrCode className="text-[#f9c66d]" size={34} />
        <h3 className="mt-5 text-2xl font-black text-[#f4fbf8]">QR placeholder</h3>
        <p className="mt-2 leading-7 text-[#9db2ad]">
          QR generation library can be added next; the link itself is
          already copy-ready.
        </p>
        <a
          className="mt-5 flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/20 bg-[#24170d] px-4 font-black text-[#f9c66d] transition hover:bg-[#2a1111]"
          href={publicQueueLink}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink size={18} /> Open Link
        </a>
      </article>
    </section>
  );
}

export function PlansPage({
  formatDateTime,
  handlePremiumSubscribe,
  premiumActive,
  premiumUntilDate,
  salonProfile,
  subscriptionLoading,
  subscriptionStatus
}) {
  return (
    <section className="soft-shadow grid gap-5 rounded-3xl bg-white p-5 sm:p-6 lg:grid-cols-[1fr_380px] lg:items-center">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
          Plans
        </p>
        <h2 className="mt-1 text-3xl font-black">
          {premiumActive ? "Premium plan active" : "Premium Rs. 699/month"}
        </h2>
        <p className="mt-3 max-w-2xl leading-7 text-[#9db2ad]">
          {premiumActive
            ? "Payment success details saved. Premium queue controls are active for this salon."
            : "Premium plan unlocks analytics, branded public queue links, payment-ready queue flow, and owner growth insights."}
        </p>
        {premiumActive ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ["Status", "Active"],
              ["Valid Till", formatDateTime(premiumUntilDate)],
              ["Payment ID", salonProfile.razorpay?.paymentId || "-"],
              ["Order ID", salonProfile.razorpay?.orderId || "-"]
            ].map(([label, value]) => (
              <div className="rounded-2xl bg-[#101a18] p-4" key={label}>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[#9db2ad]">
                  {label}
                </p>
                <p className="mt-1 break-words font-black text-[#f4fbf8]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        ) : null}
        {subscriptionStatus ? (
          <p className="mt-4 rounded-2xl bg-[#101a18] px-4 py-3 text-sm font-bold text-[#f4fbf8]">
            {subscriptionStatus}
          </p>
        ) : null}
      </div>
      {premiumActive ? (
        <div className="rounded-3xl bg-[#2a1111] p-5 text-[#fca5a5]">
          <CheckCircle2 size={30} />
          <h3 className="mt-4 text-2xl font-black">Payment success</h3>
          <p className="mt-2 text-sm font-bold leading-6">
            Premium features enabled for 30 days. Client booking gate
            will remain open while this subscription is active.
          </p>
        </div>
      ) : (
        <button
          className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 py-4 font-black text-white disabled:opacity-60"
          disabled={subscriptionLoading}
          onClick={handlePremiumSubscribe}
          type="button"
        >
          {subscriptionLoading ? <ButtonSpinner /> : <CreditCard size={20} />}
          {subscriptionLoading ? "Opening Razorpay..." : "Subscribe Rs. 699"}
        </button>
      )}
    </section>
  );
}

export function SettingsPage({
  actionLoading,
  onSave,
  setSettingsDraft,
  settingsDraft,
  toggleShopClosed
}) {
  return (
    <section className="soft-shadow rounded-3xl bg-white p-5 sm:p-6">
      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
        Settings
      </p>
      <h2 className="mt-1 text-3xl font-black">Salon profile</h2>
      <div className="mt-6 rounded-3xl border border-[#35201f] bg-[#101a18] p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
              Shop Status
            </p>
            <h3 className="mt-1 text-2xl font-black text-[#f4fbf8]">
              {settingsDraft.manualShopClosed
                ? "Closed for booking"
                : "Open for booking"}
            </h3>
            <p className="mt-2 text-sm font-bold text-[#9db2ad]">
              Automatic booking window uses Opening Time and Closing
              Time. Use manual close for early closure or emergencies.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#991b1b] px-5 py-3 font-black text-white disabled:opacity-60"
              disabled={
                actionLoading === "shop-status" ||
                !settingsDraft.manualShopClosed
              }
              onClick={() => toggleShopClosed(false)}
              type="button"
            >
              {actionLoading === "shop-status" ? <ButtonSpinner /> : <CheckCircle2 size={18} />}
              Open Shop
            </button>
            <button
              className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#fee2e2] px-5 py-3 font-black text-[#b91c1c] disabled:opacity-60"
              disabled={
                actionLoading === "shop-status" ||
                settingsDraft.manualShopClosed
              }
              onClick={() => toggleShopClosed(true)}
              type="button"
            >
              {actionLoading === "shop-status" ? <ButtonSpinner dark /> : <XCircle size={18} />}
              Close Shop
            </button>
          </div>
        </div>
        <label className="mt-4 block">
          <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
            Close Message
          </span>
          <input
            className="h-12 w-full rounded-2xl border border-[#35201f] bg-white px-4 outline-none focus:border-[#991b1b]"
            onChange={(event) =>
              setSettingsDraft((value) => ({
                ...value,
                manualCloseReason: event.target.value
              }))
            }
            placeholder="Example: Shop closed early today. Please try tomorrow."
            value={settingsDraft.manualCloseReason || ""}
          />
        </label>
      </div>
      <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSave}>
        {[
          ["name", "Salon Name"],
          ["slug", "Public Slug"],
          ["phone", "Phone"],
          ["address", "Address"],
          ["openingTime", "Opening Time"],
          ["closingTime", "Closing Time"]
        ].map(([field, label]) => (
          <label className="block" key={field}>
            <span className="mb-2 block text-sm font-bold text-[#f4fbf8]">
              {label}
            </span>
            <input
              className="h-12 w-full rounded-2xl border border-[#35201f] bg-white px-4 outline-none focus:border-[#991b1b]"
              onChange={(event) =>
                setSettingsDraft((value) => ({
                  ...value,
                  [field]: event.target.value
                }))
              }
              type={field.includes("Time") ? "time" : "text"}
              value={settingsDraft[field] || ""}
            />
          </label>
        ))}
        <div className="sm:col-span-2">
          <button
            className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#081311] px-5 py-3 font-black text-white disabled:opacity-60"
            disabled={actionLoading === "settings-save"}
            type="submit"
          >
            {actionLoading === "settings-save" ? <ButtonSpinner /> : <Save size={18} />}
            {actionLoading === "settings-save" ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </form>
    </section>
  );
}
