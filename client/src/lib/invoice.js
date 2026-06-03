import {
  formatBookingStatus,
  formatMoney,
  formatStatus
} from "./formatters.js";

const slugPart = (value, fallback = "invoice") => {
  const slug = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || fallback;
};

const getDateStamp = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getCompactDateStamp = (date = new Date()) =>
  getDateStamp(date).replace(/-/g, "");

const getShortCode = (value) => {
  const cleaned = String(value || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase();
  return cleaned ? cleaned.slice(-4).padStart(4, "0") : "0001";
};

const buildInvoiceFileName = ({ booking, dateStamp, isRefundInvoice }) => {
  const invoiceType = isRefundInvoice ? "Refund-Invoice" : "Booking-Invoice";
  return [
    "Santosh-Salon",
    invoiceType,
    slugPart(booking.service, "service"),
    dateStamp
  ].join("-");
};

const colors = {
  bg: [14, 17, 20],
  panel: [24, 27, 30],
  panelSoft: [30, 29, 26],
  gold: [249, 198, 109],
  goldDark: [82, 55, 22],
  red: [153, 27, 27],
  redDark: [93, 18, 22],
  white: [244, 251, 248],
  muted: [185, 190, 187],
  line: [78, 61, 40]
};

const setColor = (pdf, key, mode = "text") => {
  const color = colors[key] || key;
  if (mode === "draw") pdf.setDrawColor(...color);
  else if (mode === "fill") pdf.setFillColor(...color);
  else pdf.setTextColor(...color);
};

const moneyText = (value) => formatMoney(value).replace("₹", "Rs.");

const safeText = (value) => String(value ?? "-");

const drawRoundedRect = (pdf, x, y, width, height, radius, fill, stroke) => {
  if (fill) setColor(pdf, fill, "fill");
  if (stroke) setColor(pdf, stroke, "draw");
  pdf.roundedRect(x, y, width, height, radius, radius, fill && stroke ? "FD" : fill ? "F" : "S");
};

const drawScissorsLogo = (pdf, x, y) => {
  setColor(pdf, "red", "fill");
  pdf.circle(x, y, 22, "F");
  setColor(pdf, "white", "draw");
  pdf.setLineWidth(2);
  pdf.circle(x - 7, y - 6, 4, "S");
  pdf.circle(x - 7, y + 8, 4, "S");
  pdf.line(x - 2, y - 3, x + 12, y + 11);
  pdf.line(x - 2, y + 5, x + 12, y - 11);
};

const drawCheckIcon = (pdf, x, y, size = 10) => {
  setColor(pdf, "gold", "draw");
  pdf.setLineWidth(2);
  pdf.line(x - size * 0.45, y, x - size * 0.1, y + size * 0.35);
  pdf.line(x - size * 0.1, y + size * 0.35, x + size * 0.55, y - size * 0.45);
};

const drawRupeeIcon = (pdf, x, y) => {
  setColor(pdf, "gold", "draw");
  pdf.setLineWidth(1.5);
  pdf.circle(x, y, 22, "S");
  setColor(pdf, "gold");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(25);
  pdf.text("Rs.", x, y + 7, { align: "center" });
};

const drawSeal = (pdf, x, y) => {
  setColor(pdf, "gold", "fill");
  pdf.circle(x, y, 27, "F");
  setColor(pdf, "goldDark", "fill");
  pdf.circle(x, y, 21, "F");
  setColor(pdf, "bg", "fill");
  pdf.circle(x, y, 15, "F");
  drawCheckIcon(pdf, x, y - 1, 14);
};

const drawTinyIcon = (pdf, x, y, label) => {
  setColor(pdf, "gold", "draw");
  pdf.setLineWidth(1.2);
  const lower = label.toLowerCase();
  if (lower.includes("email")) {
    pdf.rect(x - 6, y - 4, 12, 8, "S");
    pdf.line(x - 6, y - 4, x, y + 1);
    pdf.line(x + 6, y - 4, x, y + 1);
    return;
  }
  if (lower.includes("phone") || lower.includes("mobile")) {
    pdf.roundedRect(x - 4, y - 8, 8, 16, 2, 2, "S");
    pdf.circle(x, y + 5, 0.8, "F");
    return;
  }
  if (lower.includes("amount") || lower.includes("charge") || lower.includes("paid")) {
    pdf.circle(x, y, 6, "S");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.text("Rs", x, y + 2.5, { align: "center" });
    return;
  }
  if (lower.includes("status")) {
    pdf.circle(x, y, 6, "S");
    drawCheckIcon(pdf, x, y, 4);
    return;
  }
  if (lower.includes("service")) {
    pdf.circle(x - 3, y - 4, 2.5, "S");
    pdf.circle(x - 3, y + 4, 2.5, "S");
    pdf.line(x, y - 2, x + 6, y + 4);
    pdf.line(x, y + 2, x + 6, y - 4);
    return;
  }
  if (lower.includes("time") || lower.includes("booking")) {
    pdf.circle(x, y, 6, "S");
    pdf.line(x, y, x, y - 4);
    pdf.line(x, y, x + 3, y + 2);
    return;
  }
  pdf.rect(x - 5, y - 6, 10, 12, "S");
  pdf.line(x - 2, y - 2, x + 3, y - 2);
  pdf.line(x - 2, y + 2, x + 3, y + 2);
};

const addWrappedText = (pdf, text, x, y, maxWidth, lineHeight) => {
  const lines = pdf.splitTextToSize(safeText(text), maxWidth);
  pdf.text(lines, x, y);
  return y + lines.length * lineHeight;
};

const getFittedText = (pdf, value, maxWidth) => {
  const text = safeText(value);
  if (pdf.getTextWidth(text) <= maxWidth) return text;
  const suffix = "...";
  let fitted = text;
  while (fitted.length > 1 && pdf.getTextWidth(`${fitted}${suffix}`) > maxWidth) {
    fitted = fitted.slice(0, -1);
  }
  return `${fitted}${suffix}`;
};

const buildInvoiceData = (booking, user, refund, referenceDate) => {
  const isRefundInvoice = Boolean(refund);
  const invoicePrefix = isRefundInvoice ? "SSQ-REF" : "SSQ-INV";
  const invoiceNo = `${invoicePrefix}-${getCompactDateStamp(referenceDate)}-${getShortCode(
    refund?.id || booking.id
  )}`;
  const generatedAt = referenceDate.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
  const totalAmount = isRefundInvoice
    ? refund.amount || booking.refundableAmount || booking.serviceAmount || 0
    : booking.amount;
  const totalLabel = isRefundInvoice ? "Refund Amount" : "Total Paid";
  const statusText = isRefundInvoice
    ? formatStatus(refund.status)
    : formatStatus(booking.paymentStatus);
  const rows = [
    ["Email", user?.email || "-"],
    ["Mobile", booking.mobile || "-"],
    ["Estimated Token", booking.token],
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
          ["Service Amount", moneyText(booking.serviceAmount || booking.amount)],
          [
            "Cashfree Charge",
            `${moneyText(booking.cashfreeFee || refund.cashfreeFee || 0)} (non-refundable)`
          ],
          ["Refund Amount", moneyText(totalAmount)]
        ]
      : [
          ["Service Amount", moneyText(booking.serviceAmount || booking.amount)],
          ["Platform Fee", `${moneyText(booking.platformFee || 0)} (non-refundable)`],
          ["Cashfree Charge", moneyText(booking.cashfreeFee || 0)],
          ["Amount Paid", moneyText(totalAmount)]
        ])
  ];

  return {
    generatedAt,
    invoiceNo,
    isRefundInvoice,
    rows,
    statusText,
    totalAmount,
    totalLabel
  };
};

const createBookingInvoicePdf = async (booking, user, refund = null) => {
  const { jsPDF } = await import("jspdf");
  const referenceDate = new Date();
  const dateStamp = getDateStamp(referenceDate);
  const invoice = buildInvoiceData(booking, user, refund, referenceDate);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
    putOnlyUsedFonts: true
  });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 24;
  const contentWidth = pageWidth - margin * 2;

  setColor(pdf, "bg", "fill");
  pdf.rect(0, 0, pageWidth, pageHeight, "F");
  drawRoundedRect(pdf, margin, 22, contentWidth, pageHeight - 44, 15, "panel", "goldDark");

  drawScissorsLogo(pdf, margin + 42, 72);
  setColor(pdf, "gold");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text("S A N T O S H   S A L O N   Q U E U E", margin + 82, 63);
  setColor(pdf, "white");
  pdf.setFontSize(24);
  pdf.text(invoice.isRefundInvoice ? "Refund Invoice" : "Booking Invoice", margin + 82, 91);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const statusPillW = Math.max(126, pdf.getTextWidth(invoice.statusText) + 58);
  const statusPillX = pageWidth - margin - statusPillW - 8;
  drawRoundedRect(pdf, statusPillX, 54, statusPillW, 34, 17, "panelSoft", "goldDark");
  drawCheckIcon(pdf, statusPillX + 24, 71, 9);
  setColor(pdf, "gold");
  pdf.text(invoice.statusText, statusPillX + 46, 75);

  const cardY = 118;
  const cardW = contentWidth / 3;
  drawRoundedRect(pdf, margin + 16, cardY, contentWidth - 32, 50, 8, "panelSoft", "line");
  const summaryCards = [
    ["Invoice No", invoice.invoiceNo],
    ["Generated At", invoice.generatedAt],
    ["Customer", user?.displayName || booking.name || "Customer"]
  ];
  summaryCards.forEach(([label, value], index) => {
    const x = margin + 26 + index * cardW;
    if (index > 0) {
      setColor(pdf, "line", "draw");
      pdf.line(x - 8, cardY + 9, x - 8, cardY + 41);
    }
    drawTinyIcon(pdf, x + 9, cardY + 25, label);
    setColor(pdf, "muted");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(label.toUpperCase(), x + 29, cardY + 19);
    setColor(pdf, "white");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(getFittedText(pdf, value, cardW - 54), x + 29, cardY + 36);
  });

  const tableX = margin + 16;
  const tableW = contentWidth - 32;
  const rowH = invoice.rows.length > 17 ? 22 : 24;
  let y = 188;
  const tableHeight = invoice.rows.length * rowH + 10;
  drawRoundedRect(pdf, tableX, y - 8, tableW, tableHeight, 6, null, "line");

  invoice.rows.forEach(([label, value]) => {
    setColor(pdf, "line", "draw");
    pdf.line(tableX, y + rowH - 6, tableX + tableW, y + rowH - 6);
    drawTinyIcon(pdf, tableX + 22, y + 9, label);
    setColor(pdf, "muted");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8.4);
    pdf.text(label.toUpperCase(), tableX + 46, y + 12);
    setColor(pdf, "white");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    pdf.text(getFittedText(pdf, value, tableW - 214), tableX + 176, y + 12);
    y += rowH;
  });

  const amountY = Math.min(y + 14, pageHeight - 134);
  drawRoundedRect(pdf, tableX, amountY, tableW, 58, 8, "panelSoft", "gold");
  drawRupeeIcon(pdf, tableX + 40, amountY + 29);
  setColor(pdf, "white");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(14);
  pdf.text(invoice.totalLabel, tableX + 82, amountY + 24);
  setColor(pdf, "gold");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text(moneyText(invoice.totalAmount), tableX + 82, amountY + 48);
  drawSeal(pdf, tableX + tableW - 52, amountY + 29);

  setColor(pdf, "gold", "draw");
  pdf.circle(tableX + 8, amountY + 82, 5, "S");
  setColor(pdf, "gold");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.text("i", tableX + 8, amountY + 85, { align: "center" });
  setColor(pdf, "muted");
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8.8);
  const note = invoice.isRefundInvoice
    ? "Generated from Santosh Salon Queue refund records. Refunds are processed to the original Cashfree method within 5-7 business days. Cashfree charges are non-refundable."
    : "Generated from Santosh Salon Queue booking records. Estimated token can update when earlier slots are booked. Keep payment/order references for support.";
  addWrappedText(pdf, note, tableX + 22, amountY + 81, tableW - 32, 10);

  const fileName = buildInvoiceFileName({
    booking,
    dateStamp,
    isRefundInvoice: invoice.isRefundInvoice
  });

  return {
    fileName: `${fileName}.pdf`,
    invoice,
    pdf
  };
};

export const downloadBookingInvoice = async (booking, user, refund = null) => {
  const { fileName, pdf } = await createBookingInvoicePdf(booking, user, refund);
  pdf.save(fileName);
};

export const shareBookingInvoice = async (booking, user, refund = null) => {
  const { fileName, invoice, pdf } = await createBookingInvoicePdf(
    booking,
    user,
    refund
  );
  const blob = pdf.output("blob");
  const file = new File([blob], fileName, { type: "application/pdf" });
  const shareData = {
    title: invoice.isRefundInvoice
      ? "Santosh Salon refund invoice"
      : "Santosh Salon booking invoice",
    text: invoice.isRefundInvoice
      ? "Refund invoice from Santosh Salon Queue."
      : "Booking invoice from Santosh Salon Queue.",
    files: [file]
  };

  if (navigator.share && navigator.canShare?.(shareData)) {
    await navigator.share(shareData);
    return { shared: true, downloaded: false };
  }

  pdf.save(fileName);
  return { shared: false, downloaded: true };
};
