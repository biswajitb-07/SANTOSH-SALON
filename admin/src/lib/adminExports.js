const toCsv = (rows) =>
  rows
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
    )
    .join("\n");

const downloadCsv = (filename, rows) => {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const exportQueueCsv = ({ filteredQueue, statusLabel }) => {
  const headers = [
    "Token",
    "Name",
    "Mobile",
    "Service",
    "Booking Day",
    "Status",
    "Amount"
  ];
  const rows = filteredQueue.map((item) => [
    item.token,
    item.name,
    item.phone,
    item.service || "",
    item.bookingLabel || "",
    statusLabel(item.status),
    item.amount || ""
  ]);

  downloadCsv("salon-queue.csv", [headers, ...rows]);
};

export const exportDailySalesCsv = ({ analyticsItems, statusLabel, today }) => {
  const todaysItems = analyticsItems.filter((item) => item.bookingDate === today);
  const headers = [
    "Token",
    "Customer",
    "Mobile",
    "Service",
    "Barber",
    "Payment",
    "Status",
    "Amount",
    "Cashfree Fee"
  ];
  const rows = todaysItems.map((item) => [
    item.token,
    item.name,
    item.phone,
    item.service || "",
    item.barberName || "",
    statusLabel(item.paymentStatus),
    statusLabel(item.status),
    item.amount || 0,
    item.cashfreeFee || 0
  ]);
  const totals = [
    "",
    "TOTAL",
    "",
    "",
    "",
    "",
    "",
    todaysItems.reduce((total, item) => total + Number(item.amount || 0), 0),
    todaysItems.reduce((total, item) => total + Number(item.cashfreeFee || 0), 0)
  ];

  downloadCsv(`daily-sales-${today}.csv`, [headers, ...rows, totals]);
};
