import { AlertTriangle, Check, Star, Trash2 } from "lucide-react";
import { ButtonSpinner } from "./common.jsx";

export function BookingConfirmedCard({ booking, onDone, onViewBooking }) {
  if (!booking) return null;

  return (
    <div className="mobile-flow-overlay">
      <section className="mobile-flow-card mobile-flow-confirmed">
        <span className="mobile-flow-icon">
          <Check size={26} />
        </span>
        <h2>Booking Confirmed!</h2>
        <p>
          Your token {booking.turnText || "is ready"} has been generated for{" "}
          {booking.serviceTitle || "your service"} at {booking.slotText || "selected slot"}.
        </p>
        <div className="mobile-flow-token-row">
          <span>Your Token</span>
          <strong>{booking.turnText || "-"}</strong>
        </div>
        <div className="mobile-flow-actions two">
          <button className="mobile-flow-secondary" onClick={onViewBooking} type="button">
            View Booking Details
          </button>
          <button className="mobile-flow-primary" onClick={onDone} type="button">
            Done
          </button>
        </div>
      </section>
    </div>
  );
}

export function CancelBookingConfirmCard({
  loading,
  onClose,
  onConfirm,
  willAutoRefund
}) {
  return (
    <section className="mobile-flow-card mobile-flow-cancel">
      <span className="mobile-flow-icon danger">
        <AlertTriangle size={24} />
      </span>
      <h2>Cancel Booking?</h2>
      <p>
        Are you sure you want to cancel your booking?{" "}
        {willAutoRefund
          ? "This action will create a refund request automatically."
          : "This action cannot be undone."}
      </p>
      <div className="mobile-flow-actions">
        <button className="mobile-flow-dark" disabled={loading} onClick={onClose} type="button">
          Keep Booking
        </button>
        <button className="mobile-flow-primary" disabled={loading} onClick={onConfirm} type="button">
          {loading ? <ButtonSpinner /> : <Trash2 size={15} />}
          {loading ? "Cancelling..." : "Yes, Cancel"}
        </button>
      </div>
    </section>
  );
}

export function ReviewExperienceCard({
  barberName,
  currentRating = 0,
  disabled = false,
  onRate
}) {
  return (
    <section className="mobile-flow-card mobile-flow-review">
      <span className="mobile-flow-avatar">S</span>
      <h2>How was your experience?</h2>
      <p>with {barberName}</p>
      <div className="mobile-flow-stars">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            aria-label={`Rate ${rating} star`}
            disabled={disabled}
            key={rating}
            onClick={() => onRate(rating)}
            type="button"
          >
            <Star
              fill={Number(currentRating || 0) >= rating ? "currentColor" : "none"}
              size={28}
            />
          </button>
        ))}
      </div>
      <textarea placeholder="Write your review..." readOnly />
      <button
        className="mobile-flow-gold"
        disabled={disabled || !currentRating}
        onClick={() => currentRating && onRate(currentRating)}
        type="button"
      >
        Submit Review
      </button>
    </section>
  );
}
