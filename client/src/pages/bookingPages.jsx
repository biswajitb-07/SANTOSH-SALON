import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Gem,
  MapPin,
  Scissors,
  ShieldCheck,
  Sparkles,
  UserRound,
  WalletCards,
  UsersRound
} from "lucide-react";
import { ButtonSpinner, PaginationControls } from "../components/common.jsx";
import { defaultServices, getServiceImageUrl } from "../lib/services.js";
import {
  cardVariants,
  containerVariants,
  itemVariants,
  pulseVariants
} from "../lib/animationVariants";

const STAFF_COUNT = 3;
const SERVICE_PAGE_SIZE = 8;
const getQueueEstimateMinutes = (waitingCount) => {
  if (!waitingCount) return 0;
  return Math.ceil(waitingCount / STAFF_COUNT) * 25;
};

function QueueSummaryCard({ loading, onNavigate, stats }) {
  const nextToken = loading ? "--" : stats.displayToken;
  const waitingCount = loading ? "--" : stats.waitingCount;
  const estimateMinutes = loading
    ? "--"
    : `${getQueueEstimateMinutes(stats.waitingCount)}m`;

  return (
    <motion.section
      className="luxury-glass rounded-3xl p-6 text-white shadow-2xl border border-[#35201f]"
      variants={cardVariants}
      initial="initial"
      animate="animate"
      whileHover="whileHover"
    >
      {/* Live Queue Header */}
      <motion.div
        className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-[#9db2ad]"
        variants={itemVariants}
      >
        <motion.span
          className="h-2.5 w-2.5 rounded-full bg-[#ef4444]"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        Live Queue
      </motion.div>

      {/* Main Token Display */}
      <motion.div
        className="mt-6 rounded-3xl border border-[#35201f] bg-gradient-to-br from-[#101a18] to-[#0b1714] p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <motion.p
              className="text-sm font-bold text-[#f9c66d]"
              variants={itemVariants}
            >
              {loading ? "Now Serving" : stats.tokenLabel}
            </motion.p>
            <motion.p
              className="mt-3 font-mono text-7xl font-black tracking-tighter text-[#f9c66d]"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 100,
                damping: 20,
                delay: 0.2
              }}
            >
              {nextToken}
            </motion.p>
            <motion.p
              className="mt-2 text-xs font-black text-[#9db2ad]"
              variants={itemVariants}
            >
              {loading ? "Syncing..." : stats.tokenHint}
            </motion.p>
          </div>

          {/* Bell Icon */}
          <motion.div
            className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#991b1b] to-[#7f1d1d] text-white shadow-lg shadow-[#991b1b]/30"
            animate={{ y: [0, -8, 0] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            whileHover={{
              scale: 1.08,
              boxShadow: "0 20px 48px rgba(153, 27, 27, 0.4)"
            }}
          >
            <BellRing size={32} strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Queue Stats */}
        <motion.div
          className="mt-6 grid grid-cols-2 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Waiting Count */}
          <motion.div
            className="rounded-2xl border border-[#35201f] bg-[#101a18]/50 p-4 backdrop-blur"
            variants={itemVariants}
            whileHover={{ backgroundColor: "rgba(16, 26, 24, 0.8)" }}
          >
            <p className="flex items-center gap-2 text-sm text-[#9db2ad]">
              <UsersRound size={18} /> Waiting
            </p>
            <motion.p
              className="mt-3 text-4xl font-black text-white"
              key={waitingCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {waitingCount}
            </motion.p>
          </motion.div>

          {/* Time Estimate */}
          <motion.div
            className="rounded-2xl border border-[#35201f] bg-[#101a18]/50 p-4 backdrop-blur"
            variants={itemVariants}
            whileHover={{ backgroundColor: "rgba(16, 26, 24, 0.8)" }}
          >
            <p className="flex items-center gap-2 text-sm text-[#9db2ad]">
              <Clock3 size={18} /> Estimate
            </p>
            <motion.p
              className="mt-3 text-4xl font-black text-[#f9c66d]"
              key={estimateMinutes}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {estimateMinutes}
            </motion.p>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        className="mt-6 rounded-2xl border border-[#35201f] bg-[#101a18]/50 p-4 backdrop-blur"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <p className="text-sm font-bold text-[#9db2ad]">
          💡 Choose a service first. Details are collected at checkout.
        </p>
        <motion.button
          className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/40 bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] px-5 py-4 font-black text-white shadow-lg shadow-[#991b1b]/30 transition-all duration-200"
          onClick={() => onNavigate("booking")}
          type="button"
          whileHover={{ y: -2, boxShadow: "0 16px 48px rgba(153, 27, 27, 0.4)" }}
          whileTap={{ scale: 0.98 }}
        >
          View Services <ArrowRight size={20} />
        </motion.button>
      </motion.div>
    </motion.section>
  );
}

function BookingClosedNotice({ bookingGate }) {
  if (bookingGate.loading || bookingGate.open) return null;

  return (
    <motion.section
      className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="luxury-red-glass flex flex-col gap-4 rounded-3xl p-6 text-white shadow-lg border border-[#35201f]"
        whileHover={{ boxShadow: "0 20px 48px rgba(0, 0, 0, 0.4)" }}
      >
        <div>
          <p className="section-kicker text-xs font-black uppercase tracking-widest">
            ⏸️ Booking Closed
          </p>
          <p className="mt-2 text-xl font-black">{bookingGate.message}</p>
        </div>
        <motion.span
          className="w-fit rounded-full border border-[#f9c66d]/30 bg-[#24170d] px-4 py-2 text-sm font-black text-[#f9c66d]"
          whileHover={{ backgroundColor: "#2a1111", borderColor: "rgba(249, 198, 109, 0.5)" }}
        >
          Try after sometime
        </motion.span>
      </motion.div>
    </motion.section>
  );
}

export function HomePage({
  user,
  onLogin,
  onNavigate,
  onServiceSelect,
  loginLoading,
  bookingGate,
  queueItems,
  queueStats,
  queueLoading,
  services
}) {
  return (
    <>
      <section className="luxury-hero hero-image relative min-h-[92vh] overflow-hidden text-white">
        <div className="relative z-[1] mx-auto grid min-h-[92vh] max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_430px] lg:px-8">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#f9c66d]/30 bg-[#2a0f12]/55 px-4 py-2 text-sm font-black text-[#f9c66d] backdrop-blur">
              <Sparkles size={16} />
              Premium Salon Experience
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.94] sm:text-6xl lg:text-7xl">
              Luxury grooming with live queue confidence.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 sm:text-lg">
              Choose your service, pay online or at the salon, and arrive only
              when your turn is near. A dark luxury booking experience built
              for modern local salons.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                className="shine-button luxury-button flex min-h-[52px] items-center justify-center gap-2 rounded-full px-6 py-4 font-black shadow-lg shadow-[#f9c66d]/20"
                onClick={() => onNavigate("booking")}
                type="button"
              >
                Choose Service <CalendarCheck2 size={19} />
              </button>
              <button
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[#f9c66d]/20 bg-white/10 px-6 py-4 font-black backdrop-blur transition hover:bg-[#2a0f12]/70"
                onClick={() => onNavigate("about")}
                type="button"
              >
                Explore Salon <ArrowRight size={19} />
              </button>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                [Gem, "Luxury Finish", "Sharp, polished cuts"],
                [WalletCards, "Flexible Pay", "Cashfree or COD"],
                [MapPin, "Walk In Ready", "Reach near your turn"]
              ].map(([Icon, title, text]) => (
                <div
                  className="luxury-glass rounded-3xl p-4"
                  key={title}
                >
                  <Icon className="text-[#f9c66d]" size={22} />
                  <p className="mt-3 font-black">{title}</p>
                  <p className="mt-1 text-sm font-bold text-white/58">{text}</p>
                </div>
              ))}
            </div>
          </div>
          <QueueSummaryCard
            loading={queueLoading}
            onNavigate={onNavigate}
            stats={queueStats}
          />
        </div>
      </section>

      <BookingClosedNotice bookingGate={bookingGate} />

      <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px] lg:px-8">
        <div className="luxury-glass rounded-3xl p-4 queue-shadow sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                Live status
              </p>
              <h2 className="mt-1 border-l-4 border-[#991b1b] pl-3 text-2xl font-black">
                Queue moving now
              </h2>
            </div>
            <span className="rounded-full bg-[#2a1111] px-4 py-2 text-sm font-bold text-[#fca5a5]">
              Open
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {queueLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div
                  className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-2xl border border-[#35201f] bg-[#0b1714] p-3"
                  key={index}
                >
                  <span className="h-12 w-12 animate-pulse rounded-2xl bg-[#eef4f0]" />
                  <div className="min-w-0 space-y-2">
                    <span className="block h-4 w-32 animate-pulse rounded-full bg-[#eef4f0]" />
                    <span className="block h-3 w-20 animate-pulse rounded-full bg-[#eef4f0]" />
                  </div>
                  <span className="h-4 w-12 animate-pulse rounded-full bg-[#eef4f0]" />
                </div>
              ))
            ) : queueItems.length ? (
              queueItems.map((item) => (
                <div
                  className="grid grid-cols-[54px_1fr_auto] items-center gap-3 rounded-2xl border border-[#3a2b20] bg-[#0b1714]/80 p-3"
                  key={item.id}
                >
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f1f5f2] text-lg font-black">
                    {item.token}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-black">{item.name}</p>
                    <p className="text-sm capitalize text-[#637371]">
                      {item.status}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-[#991b1b]">{item.eta}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-[#35201f] bg-[#0b1714] p-5 text-sm font-bold text-[#9db2ad]">
                The queue is empty right now. New customer bookings will appear
                here live.
              </div>
            )}
          </div>
        </div>

        <aside className="luxury-red-glass rounded-3xl p-5 text-white queue-shadow">
          <ShieldCheck className="text-[#fca5a5]" size={28} />
          <h3 className="mt-4 text-2xl font-black">Simple customer flow</h3>
          <p className="mt-2 leading-7 text-white/72">
            Login, choose service, take token, and watch live queue status while
            you travel to the salon.
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-white/10 p-4">
            <CheckCircle2 className="text-[#f9c66d]" />
            <span className="text-sm font-bold">Mobile responsive ready</span>
          </div>
        </aside>
      </section>

      <HowItWorksSection />

      <ServicesSection
        bookingGate={bookingGate}
        loginLoading={loginLoading}
        mobileSlider
        onLogin={onLogin}
        onServiceSelect={onServiceSelect}
        services={services}
        user={user}
      />
      <HaircutFeature />
      <HaircutStylesSection
        bookingGate={bookingGate}
        loginLoading={loginLoading}
        onLogin={onLogin}
        onServiceSelect={onServiceSelect}
        services={services}
        user={user}
      />
      <LuxuryPromiseSection />
    </>
  );
}

function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="luxury-glass rounded-[2rem] p-5 sm:p-8">
        <p className="section-kicker">How it works</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-black sm:text-4xl">
          Book, track, and walk in with a clear turn.
        </h2>
        <div className="mt-7 grid gap-4 lg:grid-cols-3">
          {[
            [CalendarCheck2, "01", "Book", "Pick a grooming service and choose an available slot."],
            [BellRing, "02", "Get Token", "Your token updates live with people ahead and estimate."],
            [Scissors, "03", "Walk In", "Reach around 40 minutes before your turn for a smoother visit."]
          ].map(([Icon, step, title, text]) => (
            <article
              className="relative rounded-3xl border border-[#3a2b20] bg-[#0b1714]/75 p-5"
              key={title}
            >
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#f9c66d]/25 bg-[#f9c66d]/10 text-[#f9c66d]">
                  <Icon size={22} />
                </span>
                <span className="rounded-full bg-[#2a0f12] px-3 py-1 text-sm font-black text-[#f9c66d]">
                  {step}
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-black">{title}</h3>
              <p className="mt-2 text-sm font-bold leading-7 text-[#9db2ad]">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ServicesSection({
  user,
  onLogin,
  onServiceSelect,
  loginLoading,
  bookingGate,
  mobileSlider = false,
  services,
  pagination = null
}) {
  const listClassName = mobileSlider
    ? "services-slider flex snap-x gap-4 overflow-x-auto pb-4 pl-1 pr-5 sm:grid sm:grid-cols-2 sm:overflow-visible sm:p-0 lg:grid-cols-4"
    : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4";
  const cardClassName = mobileSlider
    ? "queue-shadow luxury-glass min-w-[82vw] snap-start overflow-hidden rounded-3xl transition hover:-translate-y-1 sm:min-w-0"
    : "queue-shadow luxury-glass overflow-hidden rounded-3xl transition hover:-translate-y-1";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
            Services
          </p>
          <h2 className="mt-1 text-3xl font-black sm:text-4xl">
            Popular grooming options
          </h2>
        </div>
        <p className="max-w-lg leading-7 text-[#637371]">
          Choose a service now. Name and mobile number are collected only at
          checkout.
        </p>
      </div>
      <div className={listClassName}>
        {services.map((service) => {
          const bookingClosed = !bookingGate.loading && !bookingGate.open;
          const buttonLabel = bookingGate.loading
            ? "Checking..."
            : bookingClosed
              ? "Booking Closed"
              : user
                ? "Choose & Pay"
                : "Login to Choose";

          return (
            <article
              className={cardClassName}
              key={service.title}
            >
              <div className="relative overflow-hidden">
                <img
                  alt={service.title}
                  className="h-28 w-full object-cover transition duration-500 hover:scale-105 sm:h-44"
                  src={service.imageUrl || getServiceImageUrl(service.title)}
                />
                <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border border-[#f9c66d]/20 bg-[#06100e]/78 text-[#f9c66d] shadow-lg backdrop-blur sm:left-4 sm:top-4 sm:h-12 sm:w-12">
                  <Scissors size={18} className="sm:h-[21px] sm:w-[21px]" />
                </span>
              </div>
              <div className="p-3 sm:p-5">
              <h3 className="mt-2 truncate text-base font-black sm:mt-5 sm:text-xl" title={service.title}>
                {service.title}
              </h3>
              <p className="mt-2 flex items-center gap-1.5 text-xs text-[#637371] sm:gap-2 sm:text-sm">
                <Clock3 size={14} className="sm:h-4 sm:w-4" />
                {service.time}
              </p>
              <p className="mt-3 rounded-2xl border border-[#f9c66d]/20 bg-[#2a0f12] px-3 py-2 text-xs font-black text-[#f9c66d] sm:mt-4 sm:px-4 sm:py-3 sm:text-sm">
                {service.price}
              </p>
              <button
                className={`shine-button mt-3 flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-2xl px-3 py-2 text-xs font-black text-white transition disabled:cursor-not-allowed disabled:opacity-70 sm:mt-4 sm:min-h-[48px] sm:gap-2 sm:px-4 sm:py-3 sm:text-base ${
                  bookingClosed
                    ? "bg-[#7f1d1d] hover:bg-[#991b1b]"
                    : "bg-[#991b1b] hover:bg-[#7f1d1d]"
                }`}
                disabled={bookingGate.loading || (!user && loginLoading)}
                onClick={() => {
                  if (bookingClosed) {
                    onServiceSelect(service);
                    return;
                  }
                  user ? onServiceSelect(service) : onLogin();
                }}
                type="button"
              >
                {!user && loginLoading ? (
                  <>
                    <ButtonSpinner /> Logging in...
                  </>
                ) : bookingGate.loading ? (
                  <>
                    <ButtonSpinner /> {buttonLabel}
                  </>
                ) : (
                  <>
                    {buttonLabel}
                    <ArrowRight size={16} className="sm:h-[18px] sm:w-[18px]" />
                  </>
                )}
              </button>
              </div>
            </article>
          );
        })}
      </div>
      {pagination ? <PaginationControls {...pagination} /> : null}
    </section>
  );
}

function HaircutFeature() {
  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
      <div className="haircut-image min-h-[360px] rounded-[2rem] queue-shadow" />
      <div className="luxury-glass flex flex-col justify-center rounded-[2rem] p-6 queue-shadow sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
          Fresh haircut experience
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
          Stylish service with queue clarity.
        </h2>
        <p className="mt-4 leading-8 text-[#637371]">
          Customers do not need to guess in the waiting room. The queue screen
          clearly shows token number, people ahead, and live status.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["6 AM", "Opening"],
            ["11 PM", "Closing"],
            ["Live", "Queue"]
          ].map(([value, label]) => (
            <div className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4" key={label}>
              <p className="text-2xl font-black text-[#f9c66d]">{value}</p>
              <p className="mt-1 text-sm text-[#9db2ad]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HaircutStylesSection({
  user,
  onLogin,
  onServiceSelect,
  loginLoading,
  bookingGate,
  services
}) {
  const featuredService = services[0] || defaultServices[0];
  const bookingClosed = !bookingGate.loading && !bookingGate.open;
  const buttonLabel = bookingGate.loading
    ? "Checking..."
    : bookingClosed
      ? "Booking Closed"
      : user
        ? "Choose Haircut"
        : "Login to Choose";

  return (
    <section className="mx-auto grid max-w-7xl gap-5 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
      <div className="luxury-red-glass flex flex-col justify-center rounded-[2rem] p-6 text-white queue-shadow sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#fca5a5]">
          Haircut Styles
        </p>
        <h2 className="mt-2 text-3xl font-black leading-tight sm:text-4xl">
          Pick a clean look before you arrive.
        </h2>
        <p className="mt-4 leading-8 text-white/76">
          Select classic cuts, fade-inspired styling, beard shape-up, or
          grooming combo options from the service cards and complete details at
          checkout.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {["Classic", "Fade", "Beard"].map((style) => (
            <div className="rounded-2xl bg-white/10 p-4" key={style}>
              <Scissors className="text-[#f9c66d]" size={22} />
              <p className="mt-3 font-black">{style}</p>
            </div>
          ))}
        </div>
        <button
          className={`mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit ${
            bookingClosed
              ? "bg-[#fee2e2] text-[#991b1b]"
              : "bg-[#f9c66d] text-[#102b28]"
          }`}
          disabled={bookingGate.loading || (!user && loginLoading)}
          onClick={() => {
            if (bookingClosed) {
              onServiceSelect(featuredService);
              return;
            }
            user ? onServiceSelect(featuredService) : onLogin();
          }}
          type="button"
        >
          {!user && loginLoading ? (
            <>
              <ButtonSpinner dark /> Logging in...
            </>
          ) : bookingGate.loading ? (
            <>
              <ButtonSpinner dark /> {buttonLabel}
            </>
          ) : (
            <>
              {buttonLabel}
              <ArrowRight size={19} />
            </>
          )}
        </button>
      </div>
      <div className="haircut-styles-image min-h-[360px] rounded-[2rem] queue-shadow" />
    </section>
  );
}

function LuxuryPromiseSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="luxury-glass rounded-[2rem] p-6 sm:p-8">
          <p className="section-kicker">Owner curated</p>
          <h2 className="mt-2 text-3xl font-black sm:text-4xl">
            A calm premium flow for busy salon days.
          </h2>
          <p className="mt-4 leading-8 text-[#9db2ad]">
            Tokens, slots, online payment, COD, guest booking, and refund
            requests stay organized in one experience so customers know exactly
            what happens next.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            [BadgeCheck, "Verified payment flow", "Cashfree online checkout with visible charges."],
            [ShieldCheck, "Clean queue control", "Live status and estimated wait reduce confusion."],
            [Gem, "Premium service cards", "Each service has image, duration, amount, and CTA."],
            [Clock3, "Slot-aware booking", "Lunch break and closing time are respected."]
          ].map(([Icon, title, text]) => (
            <article className="luxury-glass rounded-3xl p-5" key={title}>
              <Icon className="text-[#f9c66d]" size={24} />
              <h3 className="mt-4 text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm font-bold leading-7 text-[#9db2ad]">
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function BookingPage({
  user,
  onLogin,
  onServiceSelect,
  loginLoading,
  bookingGate,
  services
}) {
  const [servicePage, setServicePage] = useState(1);
  const totalServicePages = Math.max(
    1,
    Math.ceil(services.length / SERVICE_PAGE_SIZE)
  );
  const safeServicePage = Math.min(servicePage, totalServicePages);
  const paginatedServices = services.slice(
    (safeServicePage - 1) * SERVICE_PAGE_SIZE,
    safeServicePage * SERVICE_PAGE_SIZE
  );

  useEffect(() => {
    setServicePage(1);
  }, [services.length]);

  return (
    <>
    <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[#1a0f12] p-5 text-white queue-shadow sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#fca5a5]">
          Booking
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
          Choose a service first, then continue to payment.
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-white/76">
          Your Google name is prefilled. The checkout modal lets you edit both
          name and mobile number.
        </p>
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          {[
            [UserRound, "Login"],
            [CalendarCheck2, "Choose Service"],
            [BellRing, "Payment Details"]
          ].map(([Icon, label]) => (
            <div className="rounded-2xl bg-white/10 p-2.5 sm:p-3" key={label}>
              <Icon className="text-[#f9c66d]" size={19} />
              <p className="mt-2 text-[11px] font-black leading-tight sm:text-base">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
    <BookingClosedNotice bookingGate={bookingGate} />
    <ServicesSection
      bookingGate={bookingGate}
      loginLoading={loginLoading}
      onLogin={onLogin}
      onServiceSelect={onServiceSelect}
      pagination={{
        page: safeServicePage,
        totalPages: totalServicePages,
        onPageChange: setServicePage
      }}
      services={paginatedServices}
      user={user}
    />
    </>
  );
}
