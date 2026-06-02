import { useEffect, useId, useRef, useState } from "react";

export const getUserPhotoUrl = (user) =>
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
    "U";

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
          decoding="async"
          loading="lazy"
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
      aria-hidden="true"
      className={`h-4 w-4 animate-spin rounded-full border-2 ${
        dark
          ? "border-[#f9c66d]/25 border-t-[#f9c66d]"
          : "border-white/35 border-t-white"
      }`}
    />
  );
}

const buttonVariants = {
  primary: "button-primary",
  secondary: "button-secondary",
  gold: "button-gold",
  danger: "button-danger",
  ghost: "button-ghost",
  icon: "button-icon"
};

export function Button({
  as: Component = "button",
  children,
  className = "",
  disabled = false,
  fullWidth = false,
  icon,
  loading = false,
  loadingLabel = "Please wait...",
  type = "button",
  variant = "primary",
  ...props
}) {
  return (
    <Component
      className={`ui-button ${buttonVariants[variant] || buttonVariants.primary} ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      disabled={disabled || loading}
      type={Component === "button" ? type : undefined}
      {...props}
    >
      {loading ? <ButtonSpinner dark={variant === "gold"} /> : icon}
      <span>{loading ? loadingLabel : children}</span>
    </Component>
  );
}

export function Field({ children, className = "" }) {
  return <label className={`ui-field ${className}`}>{children}</label>;
}

export function FieldLabel({ children, required = false }) {
  return (
    <span className="ui-field-label">
      {children}
      {required ? <span aria-hidden="true"> *</span> : null}
    </span>
  );
}

export function FieldInput({ as: Component = "input", error, className = "", ...props }) {
  return (
    <Component
      aria-invalid={error ? "true" : undefined}
      className={`ui-input ${error ? "ui-input-error" : ""} ${className}`}
      {...props}
    />
  );
}

export function FieldHelper({ children, id }) {
  if (!children) return null;
  return (
    <span className="ui-field-helper" id={id}>
      {children}
    </span>
  );
}

export function FieldError({ children, id }) {
  if (!children) return null;
  return (
    <span className="ui-field-error" id={id} role="alert">
      {children}
    </span>
  );
}

const modalSizes = {
  sm: "max-w-[480px]",
  md: "max-w-[640px]",
  lg: "max-w-[860px]",
  xl: "max-w-[1100px]"
};

export function ModalShell({
  children,
  footer,
  isOpen,
  onClose,
  size = "md",
  title,
  closeLabel = "Close dialog",
  closeOnBackdrop = true
}) {
  const titleId = useId();
  const dialogRef = useRef(null);
  const lastFocusRef = useRef(null);

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return undefined;
    lastFocusRef.current = document.activeElement;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusable?.focus?.();

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
        return;
      }
      if (event.key !== "Tab" || !dialog) return;
      const items = Array.from(
        dialog.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        )
      );
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      lastFocusRef.current?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose?.();
      }}
    >
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className={`modal-card ${modalSizes[size] || modalSizes.md}`}
        ref={dialogRef}
        role="dialog"
      >
        <header className="modal-header">
          <h2 className="modal-title" id={titleId}>
            {title}
          </h2>
          <button aria-label={closeLabel} className="modal-close" onClick={onClose} type="button">
            X
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-footer">{footer}</footer> : null}
      </section>
    </div>
  );
}

const statusLabels = {
  pending: "Pending",
  confirmed: "Confirmed",
  waiting: "Confirmed",
  waitlist: "Waiting",
  serving: "Serving",
  in_chair: "In Chair",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
  processing: "Processing",
  reviewing: "Review",
  rejected: "Rejected",
  open: "Open",
  working: "Working",
  in_progress: "Working",
  resolved: "Resolved"
};

export function StatusPill({ status, children, className = "" }) {
  const normalized = String(status || "pending").toLowerCase();
  return (
    <span className={`status-pill status-${normalized} ${className}`}>
      {normalized === "serving" || normalized === "in_chair" ? (
        <span className="status-dot" aria-hidden="true" />
      ) : null}
      {children || statusLabels[normalized] || status}
    </span>
  );
}

export function Skeleton({ className = "" }) {
  return <span aria-hidden="true" className={`skeleton ${className}`} />;
}

export function useDragScroll({ enabled = true } = {}) {
  const dragRef = useRef({
    active: false,
    dragged: false,
    lastX: 0,
    pointerId: null,
    startX: 0,
    type: ""
  });

  const endDrag = (event) => {
    const state = dragRef.current;
    if (!state.active) return;

    state.active = false;
    event.currentTarget.classList.remove("is-dragging", "is-mouse-dragging");
    if (state.pointerId !== null) {
      event.currentTarget.releasePointerCapture?.(state.pointerId);
    }
    window.getSelection?.()?.removeAllRanges?.();
  };

  return {
    onClickCapture: (event) => {
      const state = dragRef.current;
      if (!state.dragged) return;
      event.preventDefault();
      event.stopPropagation();
      state.dragged = false;
    },
    onPointerCancel: endDrag,
    onPointerDown: (event) => {
      if (!enabled || (event.button !== undefined && event.button !== 0)) return;
      if (event.pointerType && event.pointerType !== "mouse") return;

      const element = event.currentTarget;
      if (element.scrollWidth <= element.clientWidth) return;

      dragRef.current = {
        active: true,
        dragged: false,
        lastX: event.clientX,
        pointerId: event.pointerId,
        startX: event.clientX,
        type: event.pointerType || "mouse"
      };
      element.classList.add("is-dragging", "is-mouse-dragging");
      element.setPointerCapture?.(event.pointerId);
    },
    onPointerLeave: (event) => {
      if (dragRef.current.active) endDrag(event);
    },
    onPointerMove: (event) => {
      const state = dragRef.current;
      if (!enabled || !state.active) return;

      const distance = event.clientX - state.startX;
      const frameDistance = event.clientX - state.lastX;
      if (Math.abs(distance) > 5) state.dragged = true;
      event.currentTarget.scrollLeft -= frameDistance;
      state.lastX = event.clientX;
      if (state.dragged && state.type === "mouse") event.preventDefault();
    },
    onPointerUp: endDrag
  };
}

export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = "hidden";
    document.body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [locked]);
}

export function PaginationControls({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
      <button
        className="min-h-11 rounded-2xl border border-[#35201f] bg-[#101a18] px-4 font-black text-[#f4fbf8] disabled:opacity-50"
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
                : "border border-[#35201f] bg-[#101a18] text-[#f4fbf8]"
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
        className="min-h-11 rounded-2xl border border-[#35201f] bg-[#101a18] px-4 font-black text-[#f4fbf8] disabled:opacity-50"
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
    <ModalShell isOpen onClose={onCancel} size="sm" title={title}>
      <p className="leading-7 text-[var(--color-muted)]">{message}</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button disabled={loading} onClick={onCancel} variant="secondary">
          Cancel
        </Button>
        <Button
          loading={loading}
          loadingLabel="Please wait..."
          onClick={onConfirm}
          variant={tone === "danger" ? "danger" : "primary"}
        >
          {confirmLabel}
        </Button>
      </div>
    </ModalShell>
  );
}
