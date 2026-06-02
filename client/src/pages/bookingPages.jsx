import { useEffect, useRef, useState } from "react";
import {
  collection,
  limit,
  onSnapshot,
  query
} from "firebase/firestore";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Eye,
  Gem,
  MapPin,
  Scissors,
  ShieldCheck,
  Sparkles,
  Star,
  UserRound,
  WalletCards,
  UsersRound
} from "lucide-react";
import { ButtonSpinner, PaginationControls, useDragScroll } from "../components/common.jsx";
import { db } from "../lib/firebase.js";
import { defaultServices, getServiceImageUrl } from "../lib/services.js";

const STAFF_COUNT = 3;
const SERVICE_PAGE_SIZE = 8;
const BARBER_STATS_LIMIT = 25;
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
    <section className="queue-shadow luxury-glass rounded-2xl p-5 text-white sm:p-6">
      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em] text-[#9db2ad]">
        <span className="h-2 w-2 animate-pulse rounded-full bg-[#ef4444]" />
        Live Queue
      </div>
      <div className="mt-4 rounded-[1.25rem] border border-[#3a2b20] bg-[#090f0d]/80 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#991b1b]">
              {loading ? "Now Serving" : stats.tokenLabel}
            </p>
            <p className="mt-1 font-mono text-6xl font-black tracking-tight text-[#f9c66d]">
              {nextToken}
            </p>
            <p className="mt-1 text-xs font-black text-[#637371]">
              {loading ? "Syncing..." : stats.tokenHint}
            </p>
          </div>
          <span className="grid h-16 w-16 place-items-center rounded-3xl bg-[#991b1b] text-white">
            <BellRing size={28} />
          </span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-[#3a2b20] bg-[#101a18]/80 p-4">
            <p className="flex items-center gap-2 text-sm text-[#637371]">
              <UsersRound size={16} /> Waiting
            </p>
            <p className="mt-2 text-3xl font-black">{waitingCount}</p>
          </div>
          <div className="rounded-2xl border border-[#3a2b20] bg-[#101a18]/80 p-4">
            <p className="flex items-center gap-2 text-sm text-[#637371]">
              <Clock3 size={16} /> Estimate
            </p>
            <p className="mt-2 text-3xl font-black">{estimateMinutes}</p>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[#3a2b20] bg-[#090f0d]/80 p-4">
        <p className="text-sm font-bold text-[#637371]">
          Choose a service first. Details are collected at checkout.
        </p>
        <button
          className="mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#991b1b] bg-transparent px-5 py-4 font-black text-[#fca5a5] shadow-lg shadow-[#991b1b]/20 transition hover:bg-[#991b1b] hover:text-white"
          onClick={() => onNavigate("booking")}
          type="button"
        >
          View Services <ArrowRight size={19} />
        </button>
      </div>
    </section>
  );
}

function BookingClosedNotice({ bookingGate }) {
  if (bookingGate.loading || bookingGate.open) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="queue-shadow luxury-red-glass flex flex-col gap-3 rounded-[2rem] p-5 text-[#f4fbf8] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="section-kicker">
            Booking Closed
          </p>
          <p className="mt-1 text-lg font-black">{bookingGate.message}</p>
        </div>
        <span className="rounded-full border border-[#f9c66d]/20 bg-[#24170d] px-4 py-2 text-sm font-black text-[#f9c66d]">
          Try after sometime
        </span>
      </div>
    </section>
  );
}

export function HomePage({
  user,
  onLogin,
  onNavigate,
  onPhotoPreview,
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
                className="flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[#f9c66d]/20 bg-[rgba(255,255,255,0.08)] px-6 py-4 font-black backdrop-blur transition hover:bg-[#2a0f12]/70"
                onClick={() => onNavigate("about")}
                type="button"
              >
                Explore Salon <ArrowRight size={19} />
              </button>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              {[
                [Gem, "Luxury Finish", "Sharp, polished cuts"],
                [WalletCards, "Online Pay", "Secure Cashfree checkout"],
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

          <div className="mt-5 grid gap-2 md:grid-cols-3">
            {(queueStats.servingChairs || []).map((chair) => (
              <div
                className="grid grid-cols-[46px_1fr] items-center gap-3 rounded-2xl border border-[#3a2b20] bg-[#0b1714]/80 p-3"
                key={chair.barberName}
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#2a1111] font-mono text-lg font-black text-[#f9c66d]">
                  {queueLoading ? "--" : chair.token}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#f4fbf8]">
                    {chair.barberName}
                  </p>
                  <p className="truncate text-xs font-bold text-[#637371]">
                    {queueLoading
                      ? "Syncing..."
                      : chair.token === "-"
                        ? "Chair available"
                        : `${chair.customerName} • running`}
                  </p>
                </div>
              </div>
            ))}
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
                      {item.status} • {item.barberName}
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
            Login, choose service, confirm your slot, and watch your estimated
            turn update live while you travel to the salon.
          </p>
          <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[rgba(255,255,255,0.08)] p-4">
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
        onPhotoPreview={onPhotoPreview}
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
            [BellRing, "02", "Track Turn", "Your estimated turn updates live with people ahead and ETA."],
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
  onPhotoPreview,
  onServiceSelect,
  loginLoading,
  bookingGate,
  mobileSlider = false,
  services,
  pagination = null,
  sectionRef = null
}) {
  const sliderRef = useRef(null);
  const dragScroll = useDragScroll({ enabled: mobileSlider });
  const listClassName = mobileSlider
    ? "services-slider drag-scroll flex snap-x gap-3 overflow-x-auto pb-4 pl-1 pr-[24vw] sm:grid sm:grid-cols-2 sm:overflow-visible sm:p-0 lg:grid-cols-4"
    : "grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4";
  const cardClassName = mobileSlider
    ? "queue-shadow luxury-glass min-w-[68vw] max-w-[68vw] shrink-0 snap-start overflow-hidden rounded-3xl sm:min-w-0 sm:max-w-none sm:shrink"
    : "queue-shadow luxury-glass overflow-hidden rounded-3xl";

  useEffect(() => {
    if (!mobileSlider || !sliderRef.current) return;
    sliderRef.current.scrollLeft = 0;
  }, [mobileSlider, services.length, user?.uid]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8" ref={sectionRef}>
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
      <div
        className={listClassName}
        ref={sliderRef}
        {...(mobileSlider ? dragScroll : {})}
      >
        {services.map((service) => {
          const serviceImageUrl = service.imageUrl || getServiceImageUrl(service.title);
          const previewService = {
            ...service,
            imageUrl: serviceImageUrl
          };
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
                <button
                  aria-label={`View ${service.title} photo`}
                  className="group block h-40 w-full cursor-pointer sm:h-44"
                  onClick={() => onPhotoPreview?.(previewService)}
                  type="button"
                >
                  <img
                    alt={service.title}
                    className="h-full w-full object-cover object-center transition duration-300 group-hover:brightness-75"
                    decoding="async"
                    loading="lazy"
                    src={serviceImageUrl}
                  />
                </button>
                <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border border-[#f9c66d]/20 bg-[#06100e]/78 text-[#f9c66d] shadow-lg backdrop-blur sm:left-4 sm:top-4 sm:h-12 sm:w-12">
                  <Scissors size={18} className="sm:h-[21px] sm:w-[21px]" />
                </span>
                <button
                  aria-label={`Open ${service.title} photo`}
                  className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-2xl border border-[#f9c66d]/30 bg-[#06100e]/78 text-[#f9c66d] shadow-lg backdrop-blur transition hover:scale-105 hover:bg-[#991b1b] hover:text-white sm:h-12 sm:w-12"
                  onClick={() => onPhotoPreview?.(previewService)}
                  type="button"
                >
                  <Eye size={18} className="sm:h-[21px] sm:w-[21px]" />
                </button>
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
          clearly shows estimated turn, people ahead, and live status.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["7 AM", "Opening"],
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
            <div className="rounded-2xl bg-[rgba(255,255,255,0.08)] p-4" key={style}>
              <Scissors className="text-[#f9c66d]" size={22} />
              <p className="mt-3 font-black">{style}</p>
            </div>
          ))}
        </div>
        <button
          className={`mt-6 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 font-black disabled:cursor-not-allowed disabled:opacity-70 sm:w-fit ${
            bookingClosed
              ? "bg-[#fee2e2] text-[#991b1b]"
              : "bg-[#f9c66d] text-[#140707]"
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
            Estimated turns, slots, online payment, guest booking, and refund
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

export function BarbersPage({ bookingGate }) {
  const [barberStats, setBarberStats] = useState({});
  const barbers = bookingGate.barbers?.length ? bookingGate.barbers : [];

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "barberStats"), limit(BARBER_STATS_LIMIT)),
      (snapshot) => {
        const nextStats = snapshot.docs.reduce((accumulator, snapshotDoc) => {
          const data = snapshotDoc.data();
          if (data.name) accumulator[data.name] = data;
          return accumulator;
        }, {});
        setBarberStats(nextStats);
      },
      () => setBarberStats({})
    );
  }, []);

  const getAverageRating = (barberName) => {
    const stats = barberStats[barberName];
    if (!stats?.ratingCount) return 0;
    return Math.round((Number(stats.ratingTotal || 0) / Number(stats.ratingCount || 1)) * 10) / 10;
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="rounded-[2rem] bg-[#1a0f12] p-5 text-white queue-shadow sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#fca5a5]">
          Barbers
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
          Choose your barber with live availability.
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-white/76">
          Photos are managed by admin. Customer ratings appear after completed
          visits, and queue counts update live.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {barbers.map((barber) => {
          const stats = barberStats[barber.name] || {};
          const rating = getAverageRating(barber.name);
          return (
            <article
              className="luxury-glass overflow-hidden rounded-[2rem] queue-shadow"
              key={barber.name}
            >
              {barber.imageUrl ? (
                <img
                  alt={barber.name}
                  className="h-64 w-full object-cover"
                  decoding="async"
                  loading="lazy"
                  src={barber.imageUrl}
                />
              ) : (
                <div className="grid h-64 w-full place-items-center border-b border-[#35201f] bg-[#0b1714] text-sm font-black text-[#9db2ad]">
                  Image coming soon
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black text-[#f4fbf8]">
                      {barber.name}
                    </h2>
                    <p className="mt-1 text-sm font-bold text-[#9db2ad]">
                      {barber.available ? "Available today" : "Unavailable today"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-black ${
                      barber.available
                        ? "bg-[#123125] text-[#bbf7d0]"
                        : "bg-[#2a1111] text-[#fca5a5]"
                    }`}
                  >
                    {barber.available ? "Open" : "Off"}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#637371]">
                      Queue
                    </p>
                    <p className="mt-2 text-3xl font-black text-[#f9c66d]">
                      {stats.activeCount || 0}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-[#35201f] bg-[#0b1714] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-[#637371]">
                      Rating
                    </p>
                    <p className="mt-2 flex items-center gap-1 text-3xl font-black text-[#f9c66d]">
                      <Star size={22} />
                      {rating || "-"}
                    </p>
                    <p className="mt-1 text-xs font-bold text-[#9db2ad]">
                      {stats.ratingCount || 0} reviews
                    </p>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function BookingPage({
  user,
  onLogin,
  onPhotoPreview,
  onServiceSelect,
  loginLoading,
  bookingGate,
  services
}) {
  const [servicePage, setServicePage] = useState(1);
  const servicesSectionRef = useRef(null);
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

  const handleServicePageChange = (nextPage) => {
    setServicePage(nextPage);
    window.requestAnimationFrame(() => {
      servicesSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  };

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
            <div className="rounded-2xl bg-[rgba(255,255,255,0.08)] p-2.5 sm:p-3" key={label}>
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
      onPhotoPreview={onPhotoPreview}
      onServiceSelect={onServiceSelect}
      pagination={{
        page: safeServicePage,
        totalPages: totalServicePages,
        onPageChange: handleServicePageChange
      }}
      sectionRef={servicesSectionRef}
      services={paginatedServices}
      user={user}
    />
    </>
  );
}
