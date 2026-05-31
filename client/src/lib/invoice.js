import {
  formatBookingStatus,
  formatMoney,
  formatStatus
} from "./formatters.js";

const escapeInvoiceValue = (value) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export const downloadBookingInvoice = (booking, user, refund = null) => {
  const isRefundInvoice = Boolean(refund);
  const invoiceNo = `${isRefundInvoice ? "SSQ-REF" : "SSQ"}-${String(
    refund?.id || booking.id || Date.now()
  )
    .slice(0, 10)
    .toUpperCase()}`;
  const generatedAt = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const rows = [
    ["Invoice No", invoiceNo],
    ["Generated At", generatedAt],
    ["Customer", user?.displayName || "Customer"],
    ["Email", user?.email || "-"],
    ["Mobile", booking.mobile || "-"],
    ["Token", booking.token],
    ["Service", booking.service],
    ["Booking", booking.bookingLabel],
    ["Time Slot", booking.timeSlotLabel || booking.timeSlot || "-"],
    ["Booking Status", formatBookingStatus(booking.status)],
    ["Payment Method", formatStatus(booking.paymentProvider)],
    ["Payment Status", formatStatus(booking.paymentStatus)],
    ["Payment ID", booking.paymentId || "-"],
    ["Transaction ID", booking.transactionId || "-"],
    ["Order ID", booking.orderId || "-"],
    ...(isRefundInvoice
      ? [
          ["Refund Status", formatStatus(refund.status)],
          ["Refund Request ID", refund.id || "-"],
          ["Refund Method", "Original payment method"],
          ["Service Amount", formatMoney(booking.serviceAmount || booking.amount)],
          [
            "Cashfree Charge",
            `${formatMoney(booking.cashfreeFee || refund.cashfreeFee || 0)} (non-refundable)`
          ],
          [
            "Refund Amount",
            formatMoney(
              refund.amount || booking.refundableAmount || booking.serviceAmount || 0
            )
          ]
        ]
      : [
          ["Service Amount", formatMoney(booking.serviceAmount || booking.amount)],
          ["Cashfree Charge", formatMoney(booking.cashfreeFee || 0)],
          ["Amount Paid", formatMoney(booking.amount)]
        ])
  ];
  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><th>${escapeInvoiceValue(label)}</th><td>${escapeInvoiceValue(value)}</td></tr>`
    )
    .join("");
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeInvoiceValue(invoiceNo)}</title>
  <style>
    body { margin: 0; background: #f6faf8; color: #1a0f12; font-family: Arial, sans-serif; }
    .invoice { max-width: 780px; margin: 32px auto; background: #fff; border-radius: 24px; padding: 32px; box-shadow: 0 24px 80px rgba(23,55,52,.12); }
    .top { display: flex; justify-content: space-between; gap: 16px; border-bottom: 1px solid #d9e5df; padding-bottom: 20px; }
    .brand { color: #991b1b; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; font-size: 13px; }
    h1 { margin: 8px 0 0; font-size: 34px; }
    .badge { display: inline-block; border-radius: 999px; background: #2a1111; color: #991b1b; font-weight: 900; padding: 10px 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border-bottom: 1px solid #edf3ef; padding: 13px 8px; text-align: left; vertical-align: top; }
    th { width: 210px; color: #637371; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
    td { font-weight: 800; word-break: break-word; }
    .total { margin-top: 24px; border-radius: 18px; background: #1a0f12; color: #fff; padding: 18px; font-size: 22px; font-weight: 900; text-align: right; }
    .note { margin-top: 20px; color: #637371; font-size: 13px; line-height: 1.7; }
    @media print { body { background: #fff; } .invoice { margin: 0; box-shadow: none; border-radius: 0; } }
  </style>
</head>
<body>
  <main class="invoice">
    <section class="top">
      <div>
        <div class="brand">Santosh Salon Queue</div>
        <h1>${isRefundInvoice ? "Refund Invoice" : "Booking Invoice"}</h1>
      </div>
      <span class="badge">${escapeInvoiceValue(
        isRefundInvoice
          ? formatStatus(refund.status)
          : formatStatus(booking.paymentStatus)
      )}</span>
    </section>
    <table>${tableRows}</table>
    <div class="total">${isRefundInvoice ? "Refund" : "Total"}: ${escapeInvoiceValue(
      formatMoney(
        isRefundInvoice
          ? refund.amount || booking.refundableAmount || booking.serviceAmount || 0
          : booking.amount
      )
    )}</div>
    <p class="note">${
      isRefundInvoice
        ? "This refund invoice is generated from Santosh Salon Queue refund records. Refunds are processed to the original Cashfree payment method within 5-7 business days. Cashfree charges are non-refundable."
        : "This invoice is generated from Santosh Salon Queue booking records. Please keep the payment/order references for support or refund requests."
    }</p>
  </main>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${invoiceNo}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
