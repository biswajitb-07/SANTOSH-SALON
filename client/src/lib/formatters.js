export const formatMoney = (value) => `Rs. ${Number(value || 0).toFixed(2)}`;

export const formatStatus = (status) =>
  String(status || "waiting")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const formatBookingStatus = (status) =>
  ({
    waiting: "Confirmed",
    waitlist: "Waiting",
    in_chair: "In Chair",
    completed: "Completed",
    skipped: "Skipped",
    cancelled: "Cancelled"
  })[String(status || "waiting").toLowerCase()] || formatStatus(status);
