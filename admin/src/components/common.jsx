import { useEffect, useState } from "react";

const getUserPhotoUrl = (user) =>
  user?.photoURL ||
  user?.providerData?.find((provider) => provider?.photoURL)?.photoURL ||
  "";

export function UserAvatar({ user, size = "h-10 w-10" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const photoUrl = getUserPhotoUrl(user);
  const initial =
    user?.displayName?.trim()?.charAt(0) ||
    user?.email?.trim()?.charAt(0) ||
    "O";

  useEffect(() => {
    setImageFailed(false);
    setImageReady(false);
  }, [photoUrl]);

  if (photoUrl && !imageFailed) {
    return (
      <span className={`${size} relative block overflow-hidden rounded-full`}>
        <span
          className={`absolute inset-0 grid place-items-center rounded-full bg-[#991b1b] text-base font-black uppercase text-white ${
            imageReady ? "opacity-0" : "opacity-100"
          }`}
        >
          {initial}
        </span>
        <img
          alt="Profile"
          className={`${size} rounded-full object-cover transition-opacity ${
            imageReady ? "opacity-100" : "opacity-0"
          }`}
          onError={() => setImageFailed(true)}
          onLoad={() => setImageReady(true)}
          referrerPolicy="no-referrer"
          src={photoUrl}
        />
      </span>
    );
  }

  return (
    <span
      className={`${size} grid place-items-center rounded-full bg-[#991b1b] text-base font-black uppercase text-white`}
    >
      {initial.toUpperCase()}
    </span>
  );
}

export function ButtonSpinner({ dark = false }) {
  return (
    <span
      className={`h-4 w-4 animate-spin rounded-full border-2 ${
        dark
          ? "border-[#f4fbf8]/25 border-t-[#f4fbf8]"
          : "border-white/35 border-t-white"
      }`}
    />
  );
}

export function PaginationControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
      <button
        className="min-h-11 rounded-2xl bg-[#101a18] px-4 font-black text-[#f4fbf8] disabled:opacity-50"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        type="button"
      >
        Prev
      </button>
      {Array.from({ length: totalPages }).map((_, index) => {
        const value = index + 1;
        return (
          <button
            className={`grid h-11 w-11 place-items-center rounded-2xl font-black ${
              page === value
                ? "bg-[#991b1b] text-white"
                : "bg-[#101a18] text-[#f4fbf8]"
            }`}
            key={value}
            onClick={() => onPageChange(value)}
            type="button"
          >
            {value}
          </button>
        );
      })}
      <button
        className="min-h-11 rounded-2xl bg-[#101a18] px-4 font-black text-[#f4fbf8] disabled:opacity-50"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  loading = false,
  tone = "danger",
  onCancel,
  onConfirm
}) {
  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-[#081311]/70 px-3 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <div className="soft-shadow max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-5 sm:max-h-[90vh] sm:max-w-2xl sm:p-6">
        <h2 className="text-2xl font-black text-[#f4fbf8]">{title}</h2>
        <p className="mt-3 leading-7 text-[#9db2ad]">{message}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            className="min-h-12 rounded-2xl bg-[#101a18] px-5 font-black text-[#f4fbf8]"
            disabled={loading}
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
          <button
            className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-5 font-black text-white disabled:opacity-60 ${
              tone === "danger" ? "bg-[#b91c1c]" : "bg-[#991b1b]"
            }`}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? <ButtonSpinner /> : null}
            {loading ? "Please wait..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
