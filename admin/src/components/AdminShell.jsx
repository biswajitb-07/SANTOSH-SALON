import React from "react";
import { Toaster } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  BellRing,
  CheckCircle2,
  Copy,
  Download,
  Edit,
  Eye,
  ImagePlus,
  LogOut,
  PhoneCall,
  Scissors,
  Search,
  SkipForward,
  Sparkles,
  Star,
  Trash2,
  UserCheck,
  X,
  XCircle
} from "lucide-react";
import {
  ButtonSpinner,
  ConfirmDialog,
  PaginationControls,
  UserAvatar
} from "./common.jsx";
import { AdminMobileNavigation } from "./AdminMobileNavigation.jsx";
import { StatCard } from "./dashboard.jsx";
import { BookingDialog, ServiceDialog } from "./dialogs.jsx";
import { ContactIssuesPage } from "../pages/ContactIssuesPage.jsx";
import { UsersPage } from "../pages/UsersPage.jsx";
import {
  PlansPage,
  PublicLinkPage,
  SettingsPage
} from "../pages/profilePages.jsx";
import { ChartEmpty } from "../lib/adminFlow.jsx";

export function AdminShell(props) {
  const {
    navItems,
    activePage,
    navigateAdminPage,
    openMessageCount,
    actionLoading,
    handleLogout,
    activeNavItem,
    salonProfile,
    shopManuallyClosed,
    activeQueueItems,
    tomorrowBookingCount,
    setUserSearchTerm,
    userSearchTerm,
    user,
    notice,
    UsersRound,
    waitingCount,
    PhoneCall,
    inChairCount,
    UserCheck,
    completedCount,
    Clock3,
    getDisplayDate,
    tomorrowQueueDate,
    hasWeeklyFlow,
    weeklyFlowData,
    dashboardSummary,
    hasRevenueChart,
    revenueChartData,
    hasServiceSplit,
    serviceSplitData,
    hasHourlyRush,
    hourlyRushData,
    hasQueueStatus,
    queueStatusChartData,
    hasPaymentMethods,
    paymentMethodChartData,
    hasRefundStatuses,
    refundStatusChartData,
    currentCustomer,
    statusTone,
    statusLabel,
    callNextCustomer,
    updateCustomerStatus,
    exportQueue,
    exportDailySalesReport,
    openAdminBookingDialog,
    closeDayAndTransferBookings,
    selectedQueueTab,
    queueTabDragScroll,
    queueStatusTabs,
    todaysQueueItems,
    queueStatusTab,
    setQueueStatusTab,
    filteredQueue,
    bookingPageAllSelected,
    togglePageSelection,
    setSelectedBookingIds,
    paginatedBookingIds,
    selectedBookingIds,
    setConfirmDialog,
    selectedBookings,
    deleteSelectedBookings,
    paginatedQueue,
    activeTransferStatuses,
    setDraggedQueueId,
    reorderQueueBooking,
    draggedQueueId,
    toggleSelection,
    canCallCustomer,
    notifyTurnNear,
    openBookingEditor,
    deleteBooking,
    setQueuePage,
    safeQueuePage,
    queueTotalPages,
    queueLoading,
    todayBarberAvailability,
    profileBarberNames,
    barberEditor,
    startBarberAdd,
    handleBarberImageChange,
    setBarberEditor,
    saveBarberEditor,
    profileBarbers,
    barberRatingSummary,
    DEFAULT_BARBER_PLACEHOLDERS,
    startBarberEdit,
    deleteBarber,
    inChairByBarber,
    setStaffAvailabilityDate,
    staffAvailabilityDate,
    selectedDateBarberAvailability,
    updateStaffAttendance,
    couponEditor,
    startCouponAdd,
    setCouponEditor,
    saveCouponEditor,
    couponDraft,
    startCouponEdit,
    deleteCoupon,
    serviceItems,
    openAddServiceDialog,
    servicePageAllSelected,
    setSelectedServiceIds,
    paginatedServiceIds,
    selectedServiceIds,
    selectedServices,
    deleteSelectedServices,
    paginatedServices,
    setPhotoPreviewService,
    editService,
    deleteService,
    safeServicePage,
    SERVICE_PAGE_SIZE,
    setServicePage,
    serviceTotalPages,
    refundRequests,
    refundPageAllSelected,
    setSelectedRefundIds,
    paginatedRefundIds,
    selectedRefundIds,
    selectedRefunds,
    deleteSelectedRefunds,
    paginatedRefunds,
    isRefundActionLoading,
    handleRefundDropdownAction,
    refundsLoading,
    setRefundPage,
    safeRefundPage,
    refundTotalPages,
    filteredUsers,
    googleUsers,
    deleteUserAndRelatedData,
    updateUserBlockStatus,
    paginatedUsers,
    registeredUsers,
    safeUsersPage,
    setUsersPage,
    usersLoading,
    usersTotalPages,
    usersWithPhone,
    copyPublicLink,
    publicQueueLink,
    formatDateTime,
    handlePremiumSubscribe,
    premiumActive,
    premiumUntilDate,
    subscriptionLoading,
    subscriptionStatus,
    saveSalonSettings,
    setSettingsDraft,
    settingsDraft,
    toggleShopClosed,
    serviceDraft,
    editingServiceId,
    resetServiceForm,
    setServiceDraft,
    handleServiceImageChange,
    saveService,
    serviceDialogOpen,
    adminBookingDateValue,
    bookingDraft,
    adminBookingMode,
    setEditingBookingId,
    setAdminBookingMode,
    setBookingDraft,
    getAdminBookableSlots,
    saveBookingEdit,
    adminBookingTimeSlotValue,
    adminBookingSlots,
    todayDateValue,
    photoPreviewService,
    confirmDialog
  } = props;

  return (<main className="h-screen overflow-hidden bg-[#06100e] text-[#f4fbf8]">
      <Toaster
        position="top-center"
        className="app-toaster"
        offset="92px"
        richColors
        closeButton
        toastOptions={{
          style: {
            borderRadius: "18px",
            border: "1px solid #35201f",
            boxShadow: "0 18px 60px rgba(18, 57, 52, 0.16)",
            zIndex: 2147483647
          }
        }}
      />
      <div className="grid h-screen overflow-hidden lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-screen overflow-hidden border-r border-white/70 bg-[#081311] p-5 text-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f9c66d] text-[#081311]">
              <Scissors size={23} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f9c66d]">
                Owner Panel
              </p>
              <h1 className="text-xl font-black">Santosh Salon</h1>
            </div>
          </div>

          <nav className="mt-8 flex-1 space-y-2">
            {navItems.map(({ icon: Icon, label, key }) => (
              <button
                className={`flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left font-bold transition ${
                  activePage === key
                    ? "bg-[#991b1b] text-white shadow-lg shadow-[#991b1b]/25"
                    : "text-white/72 hover:bg-[rgba(255,255,255,0.08)] hover:text-white"
                }`}
                key={key}
                onClick={() => navigateAdminPage(key)}
                type="button"
              >
                <Icon size={19} />
                <span className="flex-1">{label}</span>
                {key === "messages" && openMessageCount ? (
                  <span className="rounded-full bg-[#f9c66d] px-2 py-0.5 text-xs font-black text-[#081311]">
                    {openMessageCount}
                  </span>
                ) : null}
              </button>
            ))}
          </nav>

          <button
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/25 bg-[#24170d] font-black text-[#f9c66d] transition hover:bg-[#2a1111] disabled:opacity-60"
            disabled={actionLoading === "logout"}
            onClick={handleLogout}
            type="button"
          >
            {actionLoading === "logout" ? <ButtonSpinner dark /> : <LogOut size={18} />}
            {actionLoading === "logout" ? "Logging out..." : "Logout"}
          </button>
        </aside>

        <section className="min-w-0 overflow-y-auto">
          <header className="sticky top-0 z-20 border-b border-white/70 bg-[#06100e]/92 px-3 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#991b1b]">
                    {activeNavItem.label}
                  </p>
                  <h2 className="truncate text-lg font-black text-[#f4fbf8] sm:text-2xl">
                    {salonProfile.name || "Santosh Salon"}
                  </h2>
                </div>
                <span
                  className={`hidden rounded-full px-3 py-1 text-xs font-black sm:inline-flex ${
                    shopManuallyClosed
                      ? "bg-[#fee2e2] text-[#b91c1c]"
                      : "bg-[#2a1111] text-[#fca5a5]"
                  }`}
                >
                  {shopManuallyClosed ? "Closed" : "Open"}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden items-center gap-2 rounded-2xl bg-[var(--color-surface)] px-3 py-2 shadow-sm md:flex">
                  <span className="text-xs font-bold text-[#9db2ad]">Today</span>
                  <span className="font-black text-[#f4fbf8]">
                    {String(activeQueueItems.length).padStart(2, "0")}
                  </span>
                </div>
                <div className="hidden items-center gap-2 rounded-2xl bg-[var(--color-surface)] px-3 py-2 shadow-sm md:flex">
                  <span className="text-xs font-bold text-[#9db2ad]">Tomorrow</span>
                  <span className="font-black text-[#f4fbf8]">
                    {String(tomorrowBookingCount).padStart(2, "0")}
                  </span>
                </div>
                {activePage === "users" ? (
                  <div className="hidden min-w-[260px] items-center gap-3 rounded-2xl bg-[var(--color-surface)] px-4 py-3 text-[#9db2ad] shadow-sm sm:flex">
                    <Search size={18} />
                    <input
                      className="w-full border-0 bg-transparent outline-none"
                      onChange={(event) => setUserSearchTerm(event.target.value)}
                      placeholder="Search users"
                      value={userSearchTerm}
                    />
                  </div>
                ) : null}
                <button
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--color-surface)] shadow-sm"
                  type="button"
                >
                  <BellRing size={19} />
                </button>
                <button
                  aria-label="Owner profile"
                  className="grid h-12 w-12 place-items-center rounded-2xl bg-[var(--color-surface)] p-1 shadow-sm transition hover:bg-[#101a18]"
                  onClick={() => navigateAdminPage("settings")}
                  type="button"
                >
                  <UserAvatar size="h-9 w-9" user={user} />
                </button>
              </div>
            </div>
          </header>

          <div className="px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:pb-5">
            {notice ? (
              <p className="mb-5 rounded-2xl bg-[var(--color-surface)] px-4 py-3 text-sm font-black text-[#f4fbf8] soft-shadow">
                {notice}
              </p>
            ) : null}

            <div className={activePage === "dashboard" ? "block" : "hidden"}>
            <section className="admin-hero soft-shadow overflow-hidden rounded-[2rem] p-5 text-white sm:p-7">
              <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
                <div>
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[rgba(255,255,255,0.08)] px-4 py-2 text-sm font-bold text-[#f9c66d] ring-1 ring-white/20">
                    <Sparkles size={16} />
                    Real-time dashboard
                  </div>
                  <h2 className="max-w-3xl text-4xl font-black leading-tight sm:text-5xl">
                    Manage tokens, staff flow, and salon rush from one screen.
                  </h2>
                  <p className="mt-4 max-w-2xl leading-7 text-white/76">
                    Call next, skip, complete, track waiting count, and share
                    public queue link with customers.
                  </p>
                </div>
                <div className="rounded-3xl bg-[rgba(255,255,255,0.08)] p-4 backdrop-blur">
                  <p className="text-sm font-bold text-white/72">
                    Public queue link
                  </p>
                  <div className="mt-3 flex items-center gap-2 rounded-2xl bg-[var(--color-surface)] px-3 py-3 text-[#f4fbf8]">
                    <p className="min-w-0 flex-1 truncate text-sm font-bold">
                      santosh-salon.web.app/q/santosh
                    </p>
                    <Copy size={18} />
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={UsersRound}
                label="Confirmed Queue"
                value={String(waitingCount).padStart(2, "0")}
                trend="Live"
                tone="bg-[#f9c66d] text-[#991b1b]"
              />
              <StatCard
                icon={PhoneCall}
                label="Haircuts In Chair"
                value={String(inChairCount).padStart(2, "0")}
                trend="Now"
                tone="bg-[#ede9fe] text-[#7c3aed]"
              />
              <StatCard
                icon={UserCheck}
                label="Completed Today"
                value={String(completedCount).padStart(2, "0")}
                trend="Done"
                tone="bg-[#2a1111] text-[#fca5a5]"
              />
              <StatCard
                icon={Clock3}
                label="Tomorrow Bookings"
                value={String(tomorrowBookingCount).padStart(2, "0")}
                trend={getDisplayDate(tomorrowQueueDate)}
                tone="bg-[#ffedd5] text-[#f97316]"
              />
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[1.35fr_0.9fr]">
              <article className="chart-card soft-shadow rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                      Weekly queue flow
                    </p>
                    <h3 className="text-2xl font-black">Bookings vs completed</h3>
                  </div>
                  <span className="rounded-full bg-[#24170d] px-4 py-2 text-sm font-black text-[#991b1b]">
                    Last 7 days
                  </span>
                </div>
                {hasWeeklyFlow ? (
                  <div className="mt-5 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyFlowData}>
                        <defs>
                          <linearGradient id="customers" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#991b1b" stopOpacity={0.32} />
                            <stop offset="95%" stopColor="#991b1b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="completed" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.24} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis dataKey="day" stroke="#70817d" />
                        <YAxis allowDecimals={false} stroke="#70817d" />
                        <Tooltip />
                        <Area
                          dataKey="bookings"
                          fill="url(#customers)"
                          stroke="#991b1b"
                          strokeWidth={3}
                          type="monotone"
                        />
                        <Area
                          dataKey="completed"
                          fill="url(#completed)"
                          stroke="#f97316"
                          strokeWidth={3}
                          type="monotone"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-5 grid h-72 place-items-center rounded-3xl bg-[#101a18] text-center">
                    <div>
                      <p className="text-3xl font-black text-[#f4fbf8]">No weekly data yet</p>
                      <p className="mt-2 text-sm font-bold text-[#9db2ad]">
                        Bookings will appear here after customers join the queue.
                      </p>
                    </div>
                  </div>
                )}
              </article>

              <article className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Today money
                </p>
                <h3 className="mt-1 text-2xl font-black">Revenue, refund, net</h3>
                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                  {dashboardSummary.map((item) => (
                    <div
                      className="flex items-center justify-between rounded-2xl bg-[#101a18] px-4 py-3"
                      key={item.label}
                    >
                      <span className="text-sm font-bold text-[#9db2ad]">
                        {item.label}
                      </span>
                      <span className="font-black text-[#f4fbf8]">{item.value}</span>
                    </div>
                  ))}
                </div>
                {hasRevenueChart ? (
                  <div className="mt-5 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={revenueChartData}>
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis dataKey="day" stroke="#70817d" />
                        <YAxis stroke="#70817d" />
                        <Tooltip />
                        <Bar dataKey="revenue" fill="#991b1b" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="refunds" fill="#dc2626" radius={[10, 10, 0, 0]} />
                        <Bar dataKey="net" fill="#f9c66d" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="mt-5 grid h-48 place-items-center rounded-3xl bg-[#101a18] text-center text-sm font-bold text-[#9db2ad]">
                    Revenue chart will appear after paid or completed bookings.
                  </div>
                )}
              </article>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
              <article className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
                <h3 className="text-2xl font-black">Service split</h3>
                {hasServiceSplit ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            cx="50%"
                            cy="50%"
                            data={serviceSplitData}
                            dataKey="value"
                            innerRadius={48}
                            outerRadius={78}
                            paddingAngle={4}
                          >
                            {serviceSplitData.map((item) => (
                              <Cell fill={item.color} key={item.name} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                      {serviceSplitData.map((item) => (
                        <div
                          className="flex items-center justify-between rounded-2xl bg-[#101a18] px-4 py-3"
                          key={item.name}
                        >
                          <span className="flex items-center gap-2 font-bold">
                            <span
                              className="h-3 w-3 rounded-full"
                              style={{ background: item.color }}
                            />
                            {item.name}
                          </span>
                          <span className="font-black">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-48"
                    text="Service usage will appear after customers book haircuts."
                    title="No service data yet"
                  />
                )}
              </article>

              <article className="chart-card soft-shadow rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
                <h3 className="text-2xl font-black">Hourly bookings today</h3>
                {hasHourlyRush ? (
                  <div className="mt-4 h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyRushData}>
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis dataKey="time" stroke="#70817d" />
                        <YAxis allowDecimals={false} stroke="#70817d" />
                        <Tooltip />
                        <Bar dataKey="bookings" fill="#991b1b" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-48"
                    text="Today slot-wise bookings will show here."
                    title="No hourly rush yet"
                  />
                )}
              </article>
            </section>

            <section className="mt-5 grid gap-5 xl:grid-cols-2">
              <article className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Queue health
                </p>
                <h3 className="mt-1 text-2xl font-black">Status mix today</h3>
                {hasQueueStatus ? (
                  <div className="mt-4 grid gap-4 sm:grid-cols-[170px_1fr] sm:items-center xl:grid-cols-1">
                    <div className="h-44">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            cx="50%"
                            cy="50%"
                            data={queueStatusChartData}
                            dataKey="value"
                            innerRadius={42}
                            outerRadius={72}
                            paddingAngle={4}
                          >
                            {queueStatusChartData.map((item) => (
                              <Cell fill={item.color} key={item.name} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-2">
                      {queueStatusChartData.map((item) => (
                        <div
                          className="flex items-center justify-between rounded-2xl bg-[#101a18] px-3 py-2 text-sm"
                          key={item.name}
                        >
                          <span className="flex items-center gap-2 font-bold">
                            <span
                              className="h-2.5 w-2.5 rounded-full"
                              style={{ background: item.color }}
                            />
                            {item.name}
                          </span>
                          <span className="font-black">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-44"
                    text="Queue status data will show after bookings start."
                    title="No queue status yet"
                  />
                )}
              </article>

              <article className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Payments
                </p>
                <h3 className="mt-1 text-2xl font-black">Payment methods</h3>
                {hasPaymentMethods ? (
                  <div className="mt-4 h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={paymentMethodChartData} layout="vertical">
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis allowDecimals={false} stroke="#70817d" type="number" />
                        <YAxis dataKey="name" stroke="#70817d" type="category" width={110} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#991b1b" radius={[0, 12, 12, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-60"
                    text="Cashfree online payments and admin-created booking mix will show here."
                    title="No payment data yet"
                  />
                )}
              </article>

              <article className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6 xl:col-span-2">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Refunds
                </p>
                <h3 className="mt-1 text-2xl font-black">Refund status</h3>
                {hasRefundStatuses ? (
                  <div className="mt-4 h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={refundStatusChartData}>
                        <CartesianGrid stroke="#e5eee9" strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#70817d" />
                        <YAxis allowDecimals={false} stroke="#70817d" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#dc2626" radius={[12, 12, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <ChartEmpty
                    className="mt-4 h-60"
                    text="Requested, processing, completed, and rejected refunds will show here."
                    title="No refund requests yet"
                  />
                )}
              </article>
            </section>

            <section className="soft-shadow mt-5 grid gap-4 rounded-3xl bg-[var(--color-surface)] p-4 sm:p-6 lg:grid-cols-[1fr_1.2fr] lg:items-center">
              <div className="rounded-3xl bg-[#101a18] p-5">
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Now serving
                </p>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-5xl font-black text-[#f4fbf8]">
                      {currentCustomer?.token || "-"}
                    </p>
                    <p className="mt-2 font-bold text-[#9db2ad]">
                      {currentCustomer?.name || "No active customer"}
                    </p>
                  </div>
                  <span className={`status-action-chip status-action-${statusTone(currentCustomer?.status || "open")}`}>
                    {currentCustomer ? statusLabel(currentCustomer.status) : "Idle"}
                  </span>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <button
                  className="action-chip action-call min-h-14 px-5 disabled:opacity-60"
                  disabled={actionLoading.startsWith("customer-")}
                  onClick={callNextCustomer}
                  type="button"
                >
                  {actionLoading.startsWith("customer-") ? <ButtonSpinner /> : <PhoneCall size={19} />}
                  Call Next
                </button>
                <button
                  className="action-chip action-skip min-h-14 px-5 disabled:opacity-60"
                  disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-skipped`}
                  onClick={() => updateCustomerStatus(currentCustomer, "skipped")}
                  type="button"
                >
                  {actionLoading === `customer-${currentCustomer?.id}-skipped` ? <ButtonSpinner dark /> : <SkipForward size={19} />}
                  Skip
                </button>
                <button
                  className="action-chip action-done min-h-14 px-5 disabled:opacity-60"
                  disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-completed`}
                  onClick={() => updateCustomerStatus(currentCustomer, "completed")}
                  type="button"
                >
                  {actionLoading === `customer-${currentCustomer?.id}-completed` ? <ButtonSpinner dark /> : <CheckCircle2 size={19} />}
                  Complete
                </button>
              </div>
            </section>

            </div>

            {activePage === "queue" ? (
              <section className="soft-shadow overflow-hidden rounded-3xl bg-[var(--color-surface)]">
                <div className="grid gap-4 border-b border-[#35201f] p-4 sm:p-6 xl:grid-cols-[1fr_auto] xl:items-center">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                      Queue
                    </p>
                    <h2 className="text-3xl font-black">Live customers</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <button
                      className="action-chip action-export min-h-12 px-4"
                      onClick={exportQueue}
                      type="button"
                    >
                      <Download size={18} />
                      Export
                    </button>
                    <button
                      className="action-chip action-export min-h-12 px-4"
                      onClick={exportDailySalesReport}
                      type="button"
                    >
                      <Download size={18} />
                      Sales CSV
                    </button>
                    <button
                      className="action-chip action-add min-h-12 px-4"
                      onClick={openAdminBookingDialog}
                      type="button"
                    >
                      <UserCheck size={18} />
                      Walk-in
                    </button>
                    <button
                      className="action-chip action-close min-h-12 px-4 disabled:opacity-60"
                      disabled={actionLoading === "close-day"}
                      onClick={closeDayAndTransferBookings}
                      type="button"
                    >
                      {actionLoading === "close-day" ? <ButtonSpinner dark /> : <XCircle size={18} />}
                      Close Day
                    </button>
                  </div>
                </div>

                <div className="mx-4 mt-5 grid gap-4 rounded-3xl border border-[#35201f] bg-[#101a18] p-4 sm:mx-6 sm:p-5 xl:grid-cols-[1fr_430px] xl:items-stretch">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fca5a5]">
                          Queue status
                        </p>
                        <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                          {selectedQueueTab.label} view
                        </p>
                      </div>
                      <span className="rounded-full bg-[#2a1111] px-3 py-1 text-xs font-black text-[#f9c66d]">
                        Token {currentCustomer?.token || "-"}
                      </span>
                    </div>
                    <div
                      className="queue-control-scroll drag-scroll mt-4 flex gap-2 overflow-x-auto pb-1"
                      {...queueTabDragScroll}
                    >
                      {queueStatusTabs.map((tab) => {
                        const count = todaysQueueItems.filter((item) =>
                          tab.statuses.includes(
                            String(item.status || "").toLowerCase()
                          )
                        ).length;
                        const active = queueStatusTab === tab.key;

                        return (
                          <button
                            className={`flex min-h-12 min-w-[132px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition sm:min-w-[150px] ${
                              active
                                ? "bg-[#991b1b] text-white shadow-lg shadow-[#991b1b]/15"
                                : "bg-[#0b1714] text-[#f4fbf8] hover:bg-[#24170d]"
                            }`}
                            key={tab.key}
                            onClick={() => setQueueStatusTab(tab.key)}
                            type="button"
                          >
                            <span className="truncate">{tab.label}</span>
                            <span
                              className={`grid h-6 min-w-6 place-items-center rounded-full px-2 text-xs ${
                                active
                                  ? "bg-[rgba(255,255,255,0.10)] text-white"
                                  : "bg-[#2a1111] text-[#f9c66d]"
                              }`}
                            >
                              {count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-[#5a2525]/70 bg-[#0b1714] p-3">
                    <div className="mb-3 flex items-center justify-between gap-3 px-1">
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fca5a5]">
                        Current controls
                      </p>
                      <p className="truncate text-xs font-bold text-[#9db2ad]">
                        {currentCustomer?.name || "No active customer"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        className="action-chip action-call min-h-12 px-3 text-sm disabled:opacity-60"
                        disabled={actionLoading.startsWith("customer-")}
                        onClick={callNextCustomer}
                        type="button"
                      >
                        {actionLoading.startsWith("customer-") ? <ButtonSpinner /> : <PhoneCall size={18} />}
                        <span className="hidden sm:inline">Call</span>
                      </button>
                      <button
                        className="action-chip action-skip min-h-12 px-3 text-sm disabled:opacity-60"
                        disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-skipped`}
                        onClick={() => updateCustomerStatus(currentCustomer, "skipped")}
                        type="button"
                      >
                        {actionLoading === `customer-${currentCustomer?.id}-skipped` ? <ButtonSpinner dark /> : <SkipForward size={18} />}
                        <span className="hidden sm:inline">Skip</span>
                      </button>
                      <button
                        className="action-chip action-done min-h-12 px-3 text-sm disabled:opacity-60"
                        disabled={!currentCustomer || actionLoading === `customer-${currentCustomer.id}-completed`}
                        onClick={() => updateCustomerStatus(currentCustomer, "completed")}
                        type="button"
                      >
                        {actionLoading === `customer-${currentCustomer?.id}-completed` ? <ButtonSpinner dark /> : <CheckCircle2 size={18} />}
                        <span className="hidden sm:inline">Done</span>
                      </button>
                    </div>
                  </div>
                </div>

                {filteredQueue.length ? (
                  <div className="mx-4 mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#35201f] bg-[#081311] px-4 py-3 sm:mx-6">
                    <label className="flex items-center gap-3 text-sm font-black text-[#f4fbf8]">
                      <input
                        checked={bookingPageAllSelected}
                        className="h-4 w-4 accent-[#991b1b]"
                        onChange={(event) =>
                          togglePageSelection(
                            setSelectedBookingIds,
                            paginatedBookingIds,
                            event.target.checked
                          )
                        }
                        type="checkbox"
                      />
                      Select page
                    </label>
                    <button
                      className="action-chip action-delete min-h-10 px-4 text-sm disabled:opacity-50"
                      disabled={!selectedBookingIds.length}
                      onClick={() =>
                        setConfirmDialog({
                          title: "Delete selected bookings?",
                          message: `${selectedBookings.length} selected bookings will be permanently deleted.`,
                          confirmLabel: "Delete selected",
                          loadingKey: "booking-bulk-delete",
                          onConfirm: deleteSelectedBookings
                        })
                      }
                      type="button"
                    >
                      <Trash2 size={16} />
                      Delete selected ({selectedBookingIds.length})
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 overflow-x-auto px-4 pb-5 sm:px-6">
                  <table className="w-full min-w-[1040px] table-fixed border-collapse text-left">
                    <colgroup>
                      <col className="w-[54px]" />
                      <col className="w-[76px]" />
                      <col className="w-[150px]" />
                      <col className="w-[125px]" />
                      <col className="w-[150px]" />
                      <col className="w-[125px]" />
                      <col className="w-[150px]" />
                      <col className="w-[110px]" />
                      <col className="w-[120px]" />
                      <col className="w-[120px]" />
                      <col className="w-[340px]" />
                    </colgroup>
                    <thead>
                      <tr className="bg-[#101a18] text-sm text-[#9db2ad]">
                        <th className="px-5 py-4">
                          <span className="sr-only">Select</span>
                        </th>
                        <th className="px-5 py-4">Token</th>
                        <th className="px-5 py-4">Customer</th>
                        <th className="px-5 py-4">Mobile</th>
                        <th className="px-5 py-4">Service</th>
                        <th className="px-5 py-4">Booking</th>
                        <th className="px-5 py-4">Barber</th>
                        <th className="px-5 py-4">Slot</th>
                        <th className="px-5 py-4">Payment</th>
                        <th className="px-5 py-4">Status</th>
                        <th className="px-5 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedQueue.map((customer) => (
                        <tr
                          className="border-t border-[#35201f]"
                          draggable={activePage === "queue" && activeTransferStatuses.has(String(customer.status || "").toLowerCase())}
                          key={customer.id || customer.token}
                          onDragOver={(event) => event.preventDefault()}
                          onDragStart={() => setDraggedQueueId(customer.id)}
                          onDrop={() => reorderQueueBooking(draggedQueueId, customer.id)}
                        >
                          <td className="px-5 py-4">
                            <input
                              checked={selectedBookingIds.includes(customer.id)}
                              className="h-4 w-4 accent-[#991b1b]"
                              onChange={() =>
                                toggleSelection(setSelectedBookingIds, customer.id)
                              }
                              type="checkbox"
                            />
                          </td>
                          <td className="px-5 py-4 text-xl font-black">{customer.token}</td>
                          <td className="px-5 py-4 font-bold">{customer.name}</td>
                          <td className="px-5 py-4 text-[#9db2ad]">{customer.phone}</td>
                          <td className="px-5 py-4 text-[#9db2ad]">{customer.service}</td>
                          <td className="px-5 py-4 text-sm font-bold text-[#991b1b]">
                            {customer.bookingLabel}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-[#f9c66d]">
                            {customer.barberName || "Next available barber"}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-[#f4fbf8]">
                            {customer.timeSlotLabel || customer.timeSlot || "-"}
                          </td>
                          <td className="px-5 py-4 text-sm font-bold text-[#9db2ad]">
                            {statusLabel(customer.paymentStatus)}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`status-action-chip status-action-${statusTone(customer.status)} text-xs`}>
                              {statusLabel(customer.status)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="grid grid-cols-[56px_56px_62px_64px_56px_66px] gap-2">
                              <button
                                className="action-chip action-compact action-call h-11 rounded-xl text-xs disabled:opacity-60"
                                disabled={
                                  !canCallCustomer(customer) ||
                                  actionLoading === `customer-${customer.id}-in_chair`
                                }
                                onClick={() => updateCustomerStatus(customer, "in_chair")}
                                type="button"
                              >
                                {actionLoading === `customer-${customer.id}-in_chair` ? <ButtonSpinner dark /> : "Call"}
                              </button>
                              <button
                                className="action-chip action-compact action-skip h-11 rounded-xl text-xs disabled:opacity-60"
                                disabled={
                                  !["waiting", "in_chair"].includes(
                                    String(customer.status || "").toLowerCase()
                                  ) ||
                                  actionLoading === `customer-${customer.id}-skipped`
                                }
                                onClick={() => updateCustomerStatus(customer, "skipped")}
                                type="button"
                              >
                                {actionLoading === `customer-${customer.id}-skipped` ? <ButtonSpinner dark /> : "Skip"}
                              </button>
                              <button
                                className="action-chip action-compact action-done h-11 rounded-xl text-xs disabled:opacity-60"
                                disabled={
                                  !["waiting", "in_chair"].includes(
                                    String(customer.status || "").toLowerCase()
                                  ) ||
                                  actionLoading === `customer-${customer.id}-completed`
                                }
                                onClick={() => updateCustomerStatus(customer, "completed")}
                                type="button"
                              >
                                {actionLoading === `customer-${customer.id}-completed` ? <ButtonSpinner dark /> : "Done"}
                              </button>
                              <button
                                className="action-chip action-compact action-call h-11 rounded-xl text-xs disabled:opacity-60"
                                disabled={actionLoading === `customer-${customer.id}-notify`}
                                onClick={() => notifyTurnNear(customer)}
                                type="button"
                              >
                                {actionLoading === `customer-${customer.id}-notify` ? <ButtonSpinner dark /> : "Notify"}
                              </button>
                              <button
                                className="action-chip action-compact action-edit h-11 rounded-xl text-xs"
                                onClick={() => openBookingEditor(customer)}
                                type="button"
                              >
                                Edit
                              </button>
                              <button
                                className="action-chip action-compact action-delete h-11 rounded-xl text-xs disabled:opacity-60"
                                disabled={actionLoading === `booking-delete-${customer.id}`}
                                onClick={() =>
                                  setConfirmDialog({
                                    title: "Delete booking?",
                                    message: `Token ${customer.token} for ${customer.name} will be permanently deleted.`,
                                    confirmLabel: "Delete",
                                    loadingKey: `booking-delete-${customer.id}`,
                                    onConfirm: () => deleteBooking(customer)
                                  })
                                }
                                type="button"
                              >
                                {actionLoading === `booking-delete-${customer.id}` ? <ButtonSpinner dark /> : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <PaginationControls
                    onPageChange={setQueuePage}
                    page={safeQueuePage}
                    totalPages={queueTotalPages}
                  />
                  {queueLoading ? (
                    <p className="p-5 text-sm font-bold text-[#9db2ad]">Loading queue...</p>
                  ) : null}
                  {!queueLoading && !filteredQueue.length ? (
                    <p className="p-5 text-sm font-bold text-[#9db2ad]">
                      No {selectedQueueTab.label.toLowerCase()} bookings found for today.
                    </p>
                  ) : null}
                </div>
              </section>
            ) : null}

            {activePage === "barbers" ? (
              <section className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                      Barbers
                    </p>
                    <h2 className="mt-1 text-3xl font-black">
                      Chair status and availability
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm font-bold text-[#9db2ad]">
                      Manage which barber is available on each date. The booking page uses this to show barber choices, and queue calls use it to assign up to 3 simultaneous haircuts.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#24170d] px-4 py-2 text-sm font-black text-[#f9c66d]">
                    {todayBarberAvailability.filter((barber) => barber.available).length}/{profileBarberNames.length} available today
                  </span>
                </div>

                <div className="mt-6 rounded-3xl border border-[#35201f] bg-[#0b1714] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fca5a5]">
                        Barber list
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                        Add, edit, or delete barbers shown in customer booking.
                      </p>
                    </div>
                    <button
                      className="action-chip action-add min-h-11 px-4 disabled:opacity-60"
                      disabled={Boolean(barberEditor)}
                      onClick={startBarberAdd}
                      type="button"
                    >
                      <UserCheck size={18} />
                      Add Barber
                    </button>
                  </div>

                  {barberEditor ? (
                    <div className="mb-4 rounded-2xl border border-[#f9c66d]/25 bg-[#081311] p-4">
                      <p className="text-sm font-black text-[#f9c66d]">
                        {barberEditor.mode === "add" ? "Add Barber" : `Edit ${barberEditor.originalName}`}
                      </p>
                      <div className="mt-4 grid gap-4 lg:grid-cols-[160px_1fr]">
                        <div>
                          {barberEditor.imagePreview || barberEditor.imageUrl ? (
                            <img
                              alt={barberEditor.name || "Barber preview"}
                              className="h-40 w-full rounded-2xl border border-[#35201f] object-cover"
                              decoding="async"
                              loading="lazy"
                              src={barberEditor.imagePreview || barberEditor.imageUrl}
                            />
                          ) : (
                            <div className="grid h-40 w-full place-items-center rounded-2xl border border-dashed border-[#35201f] bg-[#0b1714] text-sm font-black text-[#9db2ad]">
                              Upload Cloudinary image
                            </div>
                          )}
                          <label className="mt-3 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/30 bg-[#24170d] px-4 text-sm font-black text-[#f9c66d]">
                            <ImagePlus size={17} />
                            Upload Image
                            <input
                              accept="image/*"
                              className="hidden"
                              onChange={handleBarberImageChange}
                              type="file"
                            />
                          </label>
                        </div>
                        <div>
                          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                            <input
                              className="h-12 rounded-2xl border border-[#35201f] bg-[#0b1714] px-4 font-bold text-[#f4fbf8] outline-none"
                              onChange={(event) =>
                                setBarberEditor((value) => ({ ...value, name: event.target.value }))
                              }
                              placeholder="Barber name"
                              value={barberEditor.name}
                            />
                            <button
                              className={`min-h-12 rounded-2xl px-4 font-black ${
                                barberEditor.active
                                  ? "bg-[#123125] text-[#bbf7d0]"
                                  : "bg-[#2a1111] text-[#fca5a5]"
                              }`}
                              onClick={() =>
                                setBarberEditor((value) => ({ ...value, active: !value.active }))
                              }
                              type="button"
                            >
                              {barberEditor.active ? "Active" : "Inactive"}
                            </button>
                          </div>
                          <div className="mt-4 flex flex-wrap justify-end gap-2">
                            <button
                              className="action-chip action-close min-h-12 px-4"
                              onClick={() => setBarberEditor(null)}
                              type="button"
                            >
                              Cancel
                            </button>
                            <button
                              className="action-chip action-save min-h-12 px-4 disabled:opacity-60"
                              disabled={actionLoading === "barbers-save"}
                              onClick={saveBarberEditor}
                              type="button"
                            >
                              {actionLoading === "barbers-save" ? <ButtonSpinner /> : <CheckCircle2 size={18} />}
                              {barberEditor.mode === "add" ? "Save Barber" : "Save Changes"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {profileBarbers.map((barber, index) => {
                      const rating = barberRatingSummary[barber.name] || {
                        ratingAverage: 0,
                        ratingCount: 0
                      };
                      const displayImageUrl =
                        barber.imageUrl || DEFAULT_BARBER_PLACEHOLDERS[index % DEFAULT_BARBER_PLACEHOLDERS.length];
                      return (
                      <article
                        className="rounded-2xl border border-[#35201f] bg-[#081311] p-4"
                        key={barber.name}
                      >
                        {displayImageUrl ? (
                          <img
                            alt={barber.name}
                            className="h-40 w-full rounded-2xl object-cover"
                            decoding="async"
                            loading="lazy"
                            src={displayImageUrl}
                          />
                        ) : (
                          <div className="grid h-40 w-full place-items-center rounded-2xl border border-dashed border-[#35201f] bg-[#0b1714] text-sm font-black text-[#9db2ad]">
                            No image uploaded
                          </div>
                        )}
                        <div className="mt-4 flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xl font-black text-[#f4fbf8]">{barber.name}</p>
                            <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                              {todayBarberAvailability.find((item) => item.name === barber.name)?.available
                                ? "Available today"
                                : "Unavailable today"}
                            </p>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#24170d] px-3 py-1 text-sm font-black text-[#f9c66d]">
                            <Star size={15} />
                            {rating.ratingCount ? rating.ratingAverage : "-"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                          {rating.ratingCount} customer rating{rating.ratingCount === 1 ? "" : "s"}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            className="action-chip action-edit min-h-11 px-4"
                            disabled={Boolean(barberEditor)}
                            onClick={() => startBarberEdit(barber)}
                            type="button"
                          >
                            <Edit size={17} />
                            Edit
                          </button>
                          <button
                            className="action-chip action-delete min-h-11 px-4 disabled:opacity-60"
                            disabled={Boolean(barberEditor) || profileBarberNames.length <= 1}
                            onClick={() => deleteBarber(barber.name)}
                            type="button"
                          >
                            <Trash2 size={17} />
                            Delete
                          </button>
                        </div>
                      </article>
                    );
                    })}
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-[#35201f] bg-[#0b1714] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fca5a5]">
                      Chair status
                    </p>
                    <p className="text-xs font-bold text-[#9db2ad]">
                      Up to 3 haircuts can run at the same time.
                    </p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {inChairByBarber.map(({ barberName, booking }) => {
                      const available = todayBarberAvailability.find(
                        (barber) => barber.name === barberName
                      )?.available;
                      return (
                        <div
                          className={`rounded-3xl border px-5 py-4 ${
                            booking
                              ? "border-[#f9c66d]/30 bg-[#24170d] text-[#f9c66d]"
                              : available
                                ? "border-[#14532d]/40 bg-[#123125] text-[#bbf7d0]"
                                : "border-[#5a2525] bg-[#2a1111] text-[#fca5a5]"
                          }`}
                          key={barberName}
                        >
                          <p className="text-xs font-black uppercase tracking-[0.12em]">
                            {barberName}
                          </p>
                          <p className="mt-3 text-3xl font-black">
                            {booking ? `Token ${booking.token}` : available ? "Idle" : "Unavailable"}
                          </p>
                          <p className="mt-2 truncate text-sm font-bold">
                            {booking?.name || (available ? "Ready for next customer" : "Not working today")}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-[#35201f] bg-[#0b1714] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fca5a5]">
                        Staff availability
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                        Select date, then mark each barber available or unavailable.
                      </p>
                    </div>
                    <input
                      className="h-11 rounded-xl border border-[#35201f] bg-[#081311] px-3 text-sm font-bold text-[#f4fbf8]"
                      onChange={(event) => setStaffAvailabilityDate(event.target.value)}
                      type="date"
                      value={staffAvailabilityDate}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {selectedDateBarberAvailability.map(({ name: staffName, available }) => (
                      <button
                        className={`min-h-14 rounded-2xl px-4 text-sm font-black transition disabled:opacity-60 ${
                          available
                            ? "bg-[#123125] text-[#bbf7d0]"
                            : "bg-[#2a1111] text-[#fca5a5]"
                        }`}
                        disabled={actionLoading === `staff-${staffName}`}
                        key={staffName}
                        onClick={() => updateStaffAttendance(staffName, !available)}
                        type="button"
                      >
                        {staffName}: {available ? "Available" : "Unavailable"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-[#35201f] bg-[#0b1714] p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fca5a5]">
                        Coupon handling
                      </p>
                      <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                        Customer checkout only applies coupons saved here.
                      </p>
                    </div>
                    <button
                      className="action-chip action-add min-h-11 px-4 disabled:opacity-60"
                      disabled={Boolean(couponEditor)}
                      onClick={startCouponAdd}
                      type="button"
                    >
                      <CheckCircle2 size={18} />
                      Add Coupon
                    </button>
                  </div>

                  <div className="grid gap-3">
                    {couponEditor ? (
                      <div className="rounded-2xl border border-[#f9c66d]/25 bg-[#081311] p-4">
                        <p className="text-sm font-black text-[#f9c66d]">
                          {couponEditor.mode === "add" ? "Add Coupon" : `Edit ${couponEditor.originalCode}`}
                        </p>
                        <div className="mt-4 grid gap-3 lg:grid-cols-[130px_1fr_130px_130px_150px_130px_120px]">
                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#9db2ad]">
                              Code
                            </span>
                            <input
                              className="h-11 w-full rounded-xl border border-[#35201f] bg-[#0b1714] px-3 font-black uppercase text-[#f4fbf8] outline-none"
                              onChange={(event) =>
                                setCouponEditor((value) => ({
                                  ...value,
                                  code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "")
                                }))
                              }
                              value={couponEditor.code}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#9db2ad]">
                              Label
                            </span>
                            <input
                              className="h-11 w-full rounded-xl border border-[#35201f] bg-[#0b1714] px-3 font-bold text-[#f4fbf8] outline-none"
                              onChange={(event) =>
                                setCouponEditor((value) => ({ ...value, label: event.target.value }))
                              }
                              value={couponEditor.label}
                            />
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#9db2ad]">
                              Type
                            </span>
                            <select
                              className="h-11 w-full rounded-xl border border-[#35201f] bg-[#0b1714] px-3 font-bold text-[#f4fbf8] outline-none"
                              onChange={(event) =>
                                setCouponEditor((value) => ({ ...value, type: event.target.value }))
                              }
                              value={couponEditor.type}
                            >
                              <option value="percent">Percent</option>
                              <option value="amount">Amount</option>
                            </select>
                          </label>
                          {couponEditor.type === "amount" ? (
                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#9db2ad]">
                              Amount
                            </span>
                            <input
                              className="h-11 w-full rounded-xl border border-[#35201f] bg-[#0b1714] px-3 font-bold text-[#f4fbf8] outline-none"
                              min="0"
                              onChange={(event) =>
                                setCouponEditor((value) => ({
                                  ...value,
                                  amount: Number(event.target.value || 0)
                                }))
                              }
                              type="number"
                              value={couponEditor.amount}
                            />
                          </label>
                          ) : (
                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#9db2ad]">
                              Percent
                            </span>
                            <input
                              className="h-11 w-full rounded-xl border border-[#35201f] bg-[#0b1714] px-3 font-bold text-[#f4fbf8] outline-none"
                              min="0"
                              onChange={(event) =>
                                setCouponEditor((value) => ({
                                  ...value,
                                  percent: Number(event.target.value || 0)
                                }))
                              }
                              type="number"
                              value={couponEditor.percent}
                            />
                          </label>
                          )}
                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#9db2ad]">
                              Condition
                            </span>
                            <select
                              className="h-11 w-full rounded-xl border border-[#35201f] bg-[#0b1714] px-3 font-bold text-[#f4fbf8] outline-none"
                              onChange={(event) =>
                                setCouponEditor((value) => ({ ...value, condition: event.target.value }))
                              }
                              value={couponEditor.condition}
                            >
                              <option value="all">All prices</option>
                              <option value="min">Above price</option>
                              <option value="max">Below price</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-1 block text-xs font-black uppercase tracking-[0.12em] text-[#9db2ad]">
                              Price
                            </span>
                            <input
                              className="h-11 w-full rounded-xl border border-[#35201f] bg-[#0b1714] px-3 font-bold text-[#f4fbf8] outline-none disabled:opacity-50"
                              disabled={couponEditor.condition === "all"}
                              min="0"
                              onChange={(event) =>
                                setCouponEditor((value) => ({
                                  ...value,
                                  minAmount:
                                    value.condition === "min"
                                      ? Number(event.target.value || 0)
                                      : value.minAmount,
                                  maxAmount:
                                    value.condition === "max"
                                      ? Number(event.target.value || 0)
                                      : value.maxAmount
                                }))
                              }
                              type="number"
                              value={
                                couponEditor.condition === "min"
                                  ? couponEditor.minAmount
                                  : couponEditor.condition === "max"
                                    ? couponEditor.maxAmount
                                    : 0
                              }
                            />
                          </label>
                          <button
                            className={`mt-5 min-h-11 rounded-xl px-3 text-sm font-black lg:mt-5 ${
                              couponEditor.active
                                ? "bg-[#123125] text-[#bbf7d0]"
                                : "bg-[#2a1111] text-[#fca5a5]"
                            }`}
                            onClick={() =>
                              setCouponEditor((value) => ({ ...value, active: !value.active }))
                            }
                            type="button"
                          >
                            {couponEditor.active ? "Active" : "Inactive"}
                          </button>
                        </div>
                        <div className="mt-4 flex flex-wrap justify-end gap-2">
                          <button
                            className="action-chip action-close min-h-11 px-4"
                            onClick={() => setCouponEditor(null)}
                            type="button"
                          >
                            Cancel
                          </button>
                          <button
                            className="action-chip action-save min-h-11 px-4 disabled:opacity-60"
                            disabled={actionLoading === "coupons-save"}
                            onClick={saveCouponEditor}
                            type="button"
                          >
                            {actionLoading === "coupons-save" ? <ButtonSpinner /> : <CheckCircle2 size={18} />}
                            {couponEditor.mode === "add" ? "Save Coupon" : "Save Changes"}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {Object.entries(couponDraft).map(([code, coupon]) => (
                      <div
                        className="grid gap-3 rounded-2xl border border-[#35201f] bg-[#081311] p-4 lg:grid-cols-[1fr_auto]"
                        key={code}
                      >
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xl font-black text-[#f4fbf8]">{code}</p>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-black ${
                                coupon.active !== false
                                  ? "bg-[#123125] text-[#bbf7d0]"
                                  : "bg-[#2a1111] text-[#fca5a5]"
                              }`}
                            >
                              {coupon.active !== false ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                            {coupon.label || code}
                          </p>
                          <p className="mt-2 text-sm font-black text-[#f9c66d]">
                            {coupon.type === "amount"
                              ? `Rs. ${Number(coupon.amount || 0)} off`
                              : `${Number(coupon.percent || 0)}% off`}
                            {coupon.condition === "min"
                              ? ` above Rs. ${Number(coupon.minAmount || 0)}`
                              : coupon.condition === "max"
                                ? ` below Rs. ${Number(coupon.maxAmount || 0)}`
                                : " for all prices"}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                          <button
                            className="action-chip action-edit min-h-11 px-4"
                            disabled={Boolean(couponEditor)}
                            onClick={() => startCouponEdit(code, coupon)}
                            type="button"
                          >
                            <Edit size={17} />
                            Edit
                          </button>
                          <button
                            className="action-chip action-delete min-h-11 px-4 disabled:opacity-60"
                            disabled={Boolean(couponEditor) || actionLoading === "coupons-save"}
                            onClick={() => deleteCoupon(code)}
                            type="button"
                          >
                            <Trash2 size={17} />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            {activePage === "services" ? (
              <section className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-5 sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                        Services
                      </p>
                      <h2 className="mt-1 text-3xl font-black">
                        Website service cards
                      </h2>
                      <p className="mt-2 max-w-2xl text-sm font-bold text-[#9db2ad]">
                        These cards appear live on the client website. Images
                        are uploaded to Cloudinary from the Add/Edit dialog.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="rounded-full bg-[#24170d] px-4 py-2 text-sm font-black text-[#991b1b]">
                        {serviceItems.length} items
                      </span>
                      <button
                        className="flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#081311] px-5 py-3 font-black text-white"
                        onClick={openAddServiceDialog}
                        type="button"
                      >
                        <ImagePlus size={18} />
                        Add Service
                      </button>
                    </div>
                  </div>
                  {serviceItems.length ? (
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#35201f] bg-[#081311] px-4 py-3">
                      <label className="flex items-center gap-3 text-sm font-black text-[#f4fbf8]">
                        <input
                          checked={servicePageAllSelected}
                          className="h-4 w-4 accent-[#991b1b]"
                          onChange={(event) =>
                            togglePageSelection(
                              setSelectedServiceIds,
                              paginatedServiceIds,
                              event.target.checked
                            )
                          }
                          type="checkbox"
                        />
                        Select page
                      </label>
                      <button
                        className="action-chip action-delete min-h-10 px-4 text-sm disabled:opacity-50"
                        disabled={!selectedServiceIds.length}
                        onClick={() =>
                          setConfirmDialog({
                            title: "Delete selected services?",
                            message: `${selectedServices.length} selected services will be removed from the website. Cloudinary images will also be deleted.`,
                            confirmLabel: "Delete selected",
                            loadingKey: "service-bulk-delete",
                            onConfirm: deleteSelectedServices
                          })
                        }
                        type="button"
                      >
                        <Trash2 size={16} />
                        Delete selected ({selectedServiceIds.length})
                      </button>
                    </div>
                  ) : null}
                  <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    {paginatedServices.map((service) => (
                      <article
                        className="relative overflow-hidden rounded-3xl border border-[#35201f] bg-[var(--color-surface)] shadow-sm"
                        key={service.id}
                      >
                        <label className="absolute left-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-2xl border border-[#5a2525] bg-[#081311]/90 shadow-lg backdrop-blur">
                          <span className="sr-only">Select {service.title}</span>
                          <input
                            checked={selectedServiceIds.includes(service.id)}
                            className="h-4 w-4 accent-[#991b1b]"
                            onChange={() =>
                              toggleSelection(setSelectedServiceIds, service.id)
                            }
                            type="checkbox"
                          />
                        </label>
                        {service.imageUrl ? (
                          <div className="group relative h-44 overflow-hidden">
                            <button
                              aria-label={`View ${service.title} photo`}
                              className="block h-full w-full cursor-pointer"
                              onClick={() => setPhotoPreviewService(service)}
                              type="button"
                            >
                              <img
                                alt={service.title}
                                className="h-full w-full object-cover transition duration-300 group-hover:scale-105 group-hover:brightness-75"
                                decoding="async"
                                loading="lazy"
                                src={service.imageUrl}
                              />
                            </button>
                            <button
                              aria-label={`Open ${service.title} photo`}
                              className="absolute right-3 top-3 z-10 grid h-11 w-11 place-items-center rounded-2xl border border-[#ffcc70]/50 bg-[#06100e]/80 text-[#ffcc70] shadow-xl backdrop-blur transition hover:scale-105 hover:bg-[#991b1b] hover:text-white"
                              onClick={() => setPhotoPreviewService(service)}
                              type="button"
                            >
                              <Eye size={19} />
                            </button>
                          </div>
                        ) : (
                          <div className="grid h-44 place-items-center bg-[#101a18] text-[#991b1b]">
                            <ImagePlus size={30} />
                          </div>
                        )}
                        <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-xl font-black">{service.title}</h3>
                            <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                              {service.time} • {service.price}
                            </p>
                            <p className="mt-2 text-xs font-black uppercase tracking-[0.12em] text-[#991b1b]">
                              {service.active ? "Visible" : "Hidden"}
                            </p>
                          </div>
                        </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button
                              className="action-chip action-edit h-11 text-sm"
                              onClick={() => editService(service)}
                              type="button"
                            >
                              <Edit size={17} />
                              Edit
                            </button>
                            <button
                              className="action-chip action-delete h-11 text-sm disabled:opacity-60"
                              disabled={actionLoading === `service-delete-${service.id}`}
                              onClick={() =>
                                setConfirmDialog({
                                  title: "Delete service?",
                                  message: `${service.title} will be removed from the client website and its Cloudinary image will also be deleted.`,
                                  confirmLabel: "Delete",
                                  loadingKey: `service-delete-${service.id}`,
                                  onConfirm: () => deleteService(service)
                                })
                              }
                              type="button"
                            >
                              {actionLoading === `service-delete-${service.id}` ? (
                                <ButtonSpinner dark />
                              ) : (
                                <Trash2 size={17} />
                              )}
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {!serviceItems.length ? (
                    <p className="mt-5 rounded-2xl bg-[#101a18] p-4 text-sm font-bold text-[#9db2ad]">
                      No custom haircut designs yet.
                    </p>
                  ) : null}
                  {serviceItems.length ? (
                    <div className="mt-6 flex flex-col items-center justify-between gap-3 rounded-3xl border border-[#35201f] bg-[#081311] px-4 py-4 sm:flex-row">
                      <p className="text-sm font-bold text-[#9db2ad]">
                        Showing{" "}
                        <span className="text-white">
                          {(safeServicePage - 1) * SERVICE_PAGE_SIZE + 1}
                        </span>
                        {" - "}
                        <span className="text-white">
                          {Math.min(safeServicePage * SERVICE_PAGE_SIZE, serviceItems.length)}
                        </span>{" "}
                        of <span className="text-white">{serviceItems.length}</span> services
                      </p>
                      <PaginationControls
                        className="mt-0"
                        onPageChange={setServicePage}
                        page={safeServicePage}
                        totalPages={serviceTotalPages}
                      />
                    </div>
                  ) : null}
              </section>
            ) : null}

            {activePage === "refunds" ? (
              <section className="soft-shadow rounded-3xl bg-[var(--color-surface)] p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                      Refunds
                    </p>
                    <h2 className="mt-1 text-3xl font-black">
                      Customer refund requests
                    </h2>
                    <p className="mt-2 text-sm font-bold text-[#9db2ad]">
                      Review payment id/order id, then process the eligible service amount refund to the original payment method. Cashfree charges are non-refundable.
                    </p>
                  </div>
                  <span className="rounded-full bg-[#24170d] px-4 py-2 text-sm font-black text-[#991b1b]">
                    {refundRequests.length} requests
                  </span>
                </div>
                {refundRequests.length ? (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#35201f] bg-[#081311] px-4 py-3">
                    <label className="flex items-center gap-3 text-sm font-black text-[#f4fbf8]">
                      <input
                        checked={refundPageAllSelected}
                        className="h-4 w-4 accent-[#991b1b]"
                        onChange={(event) =>
                          togglePageSelection(
                            setSelectedRefundIds,
                            paginatedRefundIds,
                            event.target.checked
                          )
                        }
                        type="checkbox"
                      />
                      Select page
                    </label>
                    <button
                      className="action-chip action-delete min-h-10 px-4 text-sm disabled:opacity-50"
                      disabled={!selectedRefundIds.length}
                      onClick={() =>
                        setConfirmDialog({
                          title: "Delete selected refund requests?",
                          message: `${selectedRefunds.length} selected refund requests will be permanently deleted from admin records.`,
                          confirmLabel: "Delete selected",
                          loadingKey: "refund-bulk-delete",
                          onConfirm: deleteSelectedRefunds
                        })
                      }
                      type="button"
                    >
                      <Trash2 size={16} />
                      Delete selected ({selectedRefundIds.length})
                    </button>
                  </div>
                ) : null}

                <div className="mt-5 overflow-x-auto rounded-2xl">
                  <table className="min-w-[1360px] w-full text-left">
                    <thead className="bg-[#101a18] text-sm font-black text-[#9db2ad]">
                      <tr>
                        <th className="px-5 py-4">
                          <span className="sr-only">Select</span>
                        </th>
                        {[
                          "Customer",
                          "Mobile",
                          "Amount",
                          "Payment ID",
                          "Order ID",
                          "Status",
                          "Actions"
                        ].map((heading) => (
                          <th className="px-5 py-4" key={heading}>
                            {heading}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRefunds.map((refund) => (
                        <tr className="border-b border-[#35201f]" key={refund.id}>
                          <td className="px-5 py-5">
                            <input
                              checked={selectedRefundIds.includes(refund.id)}
                              className="h-4 w-4 accent-[#991b1b]"
                              onChange={() =>
                                toggleSelection(setSelectedRefundIds, refund.id)
                              }
                              type="checkbox"
                            />
                          </td>
                          <td className="px-5 py-5">
                            <p className="font-black text-[#f4fbf8]">{refund.customerName}</p>
                            <p className="mt-1 text-xs font-bold text-[#9db2ad]">
                              {refund.customerEmail}
                            </p>
                            {Number(refund.bookingGroupSize || 1) > 1 ? (
                              <p className="mt-1 text-xs font-black text-[#f9c66d]">
                                Partial refund: person {refund.bookingGroupIndex}/
                                {refund.bookingGroupSize}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-5 font-bold text-[#52625f]">
                            {refund.customerMobile}
                          </td>
                          <td className="px-5 py-5 font-black text-[#991b1b]">
                            Rs. {Number(refund.amount || 0).toFixed(2)}
                            {Number(refund.cashfreeFee || 0) > 0 ? (
                              <p className="mt-1 text-xs font-bold text-[#f9c66d]">
                                Fee not refunded: Rs.{" "}
                                {Number(refund.cashfreeFee || 0).toFixed(2)}
                              </p>
                            ) : null}
                          </td>
                          <td className="max-w-[180px] break-words px-5 py-5 font-black text-[#f4fbf8]">
                            {refund.paymentId || "-"}
                          </td>
                          <td className="max-w-[220px] break-words px-5 py-5 font-black text-[#f4fbf8]">
                            {refund.orderId || "-"}
                          </td>
                          <td className="px-5 py-5">
                            <span className={`status-action-chip status-action-${statusTone(refund.status)} text-xs`}>
                              {statusLabel(refund.status)}
                            </span>
                          </td>
                          <td className="px-5 py-5">
                            <div className="refund-action-wrap">
                              {isRefundActionLoading(refund) ? (
                                <ButtonSpinner dark />
                              ) : null}
                              <select
                                aria-label={`Refund actions for ${refund.customerName}`}
                                className="refund-action-select"
                                disabled={isRefundActionLoading(refund)}
                                defaultValue=""
                                onChange={(event) => {
                                  handleRefundDropdownAction(refund, event.target.value);
                                  event.target.value = "";
                                }}
                              >
                                <option disabled value="">
                                  {isRefundActionLoading(refund)
                                    ? "Working..."
                                    : "Actions"}
                                </option>
                                <option value="sync">Check status</option>
                                <option value="reviewing">Mark review</option>
                                <option value="processing">Mark processing</option>
                                <option value="completed">Process refund</option>
                                <option value="rejected">Reject request</option>
                                <option value="delete">Delete request</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!refundsLoading && !paginatedRefunds.length ? (
                        <tr>
                          <td
                            className="px-5 py-7 font-bold text-[#9db2ad]"
                            colSpan={8}
                          >
                            No refund requests yet.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                {refundsLoading ? (
                  <p className="mt-5 rounded-2xl bg-[#101a18] p-4 text-sm font-bold text-[#9db2ad]">
                    Loading refund requests...
                  </p>
                ) : null}
                <PaginationControls
                  onPageChange={setRefundPage}
                  page={safeRefundPage}
                  totalPages={refundTotalPages}
                />
              </section>
            ) : null}

            {activePage === "messages" ? <ContactIssuesPage /> : null}

            {activePage === "users" ? (
              <UsersPage
                actionLoading={actionLoading}
                filteredUsers={filteredUsers}
                googleUsers={googleUsers}
                onDeleteUser={(customer) =>
                  setConfirmDialog({
                    title: "Delete user and related data",
                    message: `Delete ${customer.name}, their bookings, refund requests, and contact messages? This cannot be undone.`,
                    confirmLabel: "Delete user",
                    loadingKey: `user-${customer.id}-delete`,
                    onConfirm: () => deleteUserAndRelatedData(customer)
                  })
                }
                onToggleUserBlock={updateUserBlockStatus}
                paginatedUsers={paginatedUsers}
                registeredUsers={registeredUsers}
                safeUsersPage={safeUsersPage}
                setUserSearchTerm={setUserSearchTerm}
                setUsersPage={setUsersPage}
                userSearchTerm={userSearchTerm}
                usersLoading={usersLoading}
                usersTotalPages={usersTotalPages}
                usersWithPhone={usersWithPhone}
              />
            ) : null}
            {activePage === "public-link" ? (
              <PublicLinkPage
                actionLoading={actionLoading}
                copyPublicLink={copyPublicLink}
                publicQueueLink={publicQueueLink}
              />
            ) : null}

            {activePage === "plans" ? (
              <PlansPage
                formatDateTime={formatDateTime}
                handlePremiumSubscribe={handlePremiumSubscribe}
                premiumActive={premiumActive}
                premiumUntilDate={premiumUntilDate}
                salonProfile={salonProfile}
                subscriptionLoading={subscriptionLoading}
                subscriptionStatus={subscriptionStatus}
              />
            ) : null}

            {activePage === "settings" ? (
              <SettingsPage
                actionLoading={actionLoading}
                onSave={saveSalonSettings}
                setSettingsDraft={setSettingsDraft}
                settingsDraft={settingsDraft}
                toggleShopClosed={toggleShopClosed}
              />
            ) : null}
          </div>
        </section>
      </div>

      <AdminMobileNavigation
        actionLoading={actionLoading}
        activePage={activePage}
        handleLogout={handleLogout}
        navigateAdminPage={navigateAdminPage}
        navItems={navItems}
        openMessageCount={openMessageCount}
      />

      <ServiceDialog
        actionLoading={actionLoading}
        draft={serviceDraft}
        editingServiceId={editingServiceId}
        onClose={resetServiceForm}
        onDraftChange={setServiceDraft}
        onImageChange={handleServiceImageChange}
        onSubmit={saveService}
        open={serviceDialogOpen}
      />
      <BookingDialog
        actionLoading={actionLoading}
        barberOptions={["Next available barber", ...profileBarberNames]}
        bookingDateValue={adminBookingDateValue}
        draft={bookingDraft}
        mode={adminBookingMode ? "create" : "edit"}
        onClose={() => {
          setEditingBookingId("");
          setAdminBookingMode(false);
          setBookingDraft(null);
        }}
        onDateChange={(nextDate) => {
          const nextSlots = getAdminBookableSlots(nextDate);
          setBookingDraft((value) => ({
            ...value,
            bookingDate: nextDate,
            timeSlot: nextSlots.some((slot) => slot.value === value.timeSlot)
              ? value.timeSlot
              : nextSlots[0]?.value || ""
          }));
        }}
        onDraftChange={setBookingDraft}
        onSubmit={saveBookingEdit}
        open={Boolean(bookingDraft)}
        serviceItems={serviceItems}
        timeSlotValue={adminBookingTimeSlotValue}
        timeSlots={adminBookingSlots}
        todayDateValue={todayDateValue}
      />
      {photoPreviewService ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[120] grid place-items-center bg-[#020807]/85 p-3 backdrop-blur-xl sm:p-6"
          role="dialog"
        >
          <section className="relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-[#5a2525]/70 bg-[#07110f] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between gap-4 border-b border-[#5a2525]/60 px-4 py-4 sm:px-6">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-[#ff9e9e]">
                  Service photo
                </p>
                <h3 className="mt-1 text-2xl font-black text-white">
                  {photoPreviewService.title}
                </h3>
              </div>
              <button
                aria-label="Close photo preview"
                className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[#5a2525]/70 bg-[#111f1b] text-white transition hover:bg-[#991b1b]"
                onClick={() => setPhotoPreviewService(null)}
                type="button"
              >
                <X size={22} />
              </button>
            </div>
            <div className="grid min-h-0 flex-1 place-items-center bg-[#030907] p-3 sm:p-5">
              <img
                alt={photoPreviewService.title}
                className="max-h-[72vh] w-full rounded-3xl object-contain"
                decoding="async"
                loading="eager"
                src={photoPreviewService.imageUrl}
              />
            </div>
          </section>
        </div>
      ) : null}
      {confirmDialog ? (
        <ConfirmDialog
          confirmLabel={confirmDialog.confirmLabel}
          loading={actionLoading === confirmDialog.loadingKey}
          message={confirmDialog.message}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          tone="danger"
        />
      ) : null}
    </main>);
}
