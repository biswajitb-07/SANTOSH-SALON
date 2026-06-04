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

/* ─────────────────────────────────────────
   QUEUE SUMMARY CARD
───────────────────────────────────────── */
function QueueSummaryCard({ loading, onNavigate, stats }) {
  const nextToken = loading ? "--" : stats.displayToken;
  const waitingCount = loading ? "--" : stats.waitingCount;
  const estimateMinutes = loading ? "--" : `${getQueueEstimateMinutes(stats.waitingCount)}m`;

  return (
    <section
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%), rgba(12,20,18,0.85)",
        border: "1px solid rgba(246,199,106,0.16)",
        borderRadius: "1.75rem",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07), 0 24px 64px rgba(0,0,0,0.45)",
        backdropFilter: "blur(28px)",
        padding: "1.5rem",
        color: "var(--color-text)"
      }}
    >
      {/* Live badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "var(--color-muted)",
          border: "1px solid rgba(246,199,106,0.18)",
          borderRadius: "999px",
          padding: "0.35rem 0.85rem"
        }}
      >
        <span className="live-dot" />
        Live Queue Status
      </div>

      {/* Token display */}
      <div
        style={{
          marginTop: "1rem",
          borderRadius: "1.25rem",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(4,9,8,0.75)",
          padding: "1.25rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem" }}>
          <div>
            <p style={{ fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "#fca5a5" }}>
              {loading ? "Now Serving" : stats.tokenLabel}
            </p>
            <p
              style={{
                marginTop: "0.25rem",
                fontFamily: "var(--font-mono, monospace)",
                fontSize: "3.75rem",
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1,
                color: "var(--color-gold)"
              }}
            >
              {nextToken}
            </p>
            <p style={{ marginTop: "0.35rem", fontSize: "0.72rem", fontWeight: 700, color: "var(--color-muted)" }}>
              {loading ? "Syncing..." : stats.tokenHint}
            </p>
            <p style={{ marginTop: "0.6rem", maxWidth: "200px", fontSize: "0.68rem", fontWeight: 600, lineHeight: 1.5, color: "rgba(180,180,170,0.7)" }}>
              Turns update live when earlier slots or cancellations happen.
            </p>
          </div>
          <span
            style={{
              display: "grid",
              placeItems: "center",
              height: "4rem",
              width: "4rem",
              borderRadius: "1.25rem",
              background: "linear-gradient(135deg, #a31621, #7f1317)",
              boxShadow: "0 8px 24px rgba(163,22,33,0.35)",
              flexShrink: 0
            }}
          >
            <BellRing size={26} color="white" />
          </span>
        </div>

        {/* Stats */}
        <div style={{ marginTop: "1.1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
          {[
            [UsersRound, "Waiting", waitingCount],
            [Clock3, "Est. Wait", estimateMinutes]
          ].map(([Icon, label, value]) => (
            <div
              key={label}
              style={{
                borderRadius: "1rem",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(12,20,18,0.7)",
                padding: "0.875rem"
              }}
            >
              <p style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "var(--color-muted)" }}>
                <Icon size={14} />
                {label}
              </p>
              <p style={{ marginTop: "0.5rem", fontSize: "1.85rem", fontWeight: 900, color: "var(--color-text)", lineHeight: 1 }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div
        style={{
          marginTop: "1rem",
          borderRadius: "1.25rem",
          border: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(4,9,8,0.75)",
          padding: "1rem"
        }}
      >
        <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--color-muted)", lineHeight: 1.5 }}>
          Choose a service first. Details are collected at checkout.
        </p>
        <button
          onClick={() => onNavigate("booking")}
          type="button"
          style={{
            marginTop: "0.875rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            width: "100%",
            minHeight: "50px",
            borderRadius: "1rem",
            border: "1px solid rgba(163,22,33,0.5)",
            background: "transparent",
            color: "#fca5a5",
            fontWeight: 800,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 200ms ease"
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = "var(--color-red)";
            e.currentTarget.style.color = "white";
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "#fca5a5";
          }}
        >
          View All Services <ArrowRight size={18} />
        </button>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   BOOKING CLOSED NOTICE
───────────────────────────────────────── */
function BookingClosedNotice({ bookingGate }) {
  if (bookingGate.loading || bookingGate.open) return null;
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          borderRadius: "1.75rem",
          background: "linear-gradient(145deg, rgba(120,20,28,0.28), rgba(12,20,18,0.8))",
          border: "1px solid rgba(246,199,106,0.16)",
          padding: "1.25rem 1.5rem",
          color: "var(--color-text)"
        }}
        className="sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="section-kicker">Booking Closed</p>
          <p style={{ marginTop: "0.25rem", fontSize: "1.05rem", fontWeight: 800 }}>
            {bookingGate.message}
          </p>
        </div>
        <span
          style={{
            borderRadius: "999px",
            border: "1px solid rgba(246,199,106,0.2)",
            background: "rgba(36,23,13,0.8)",
            padding: "0.4rem 1rem",
            fontSize: "0.78rem",
            fontWeight: 800,
            color: "var(--color-gold)",
            whiteSpace: "nowrap"
          }}
        >
          Try after sometime
        </span>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   DUMMY STATS (shown while loading)
───────────────────────────────────────── */
const dummyReviews = [
  { name: "Amit Kumar", text: "Best salon experience! Token system saved me 45 mins of waiting.", rating: 5 },
  { name: "Rahul Singh", text: "Clean cuts, easy online payment, and the live queue is brilliant.", rating: 5 },
  { name: "Priya Sharma", text: "Premium feel, affordable price. My go-to place every month.", rating: 5 },
  { name: "Vikas Gupta", text: "Booked for my brother too. Guest booking feature is super handy.", rating: 4 }
];

const dummyStats = [
  ["2,400+", "Happy Customers"],
  ["4.9", "Average Rating"],
  ["7 AM", "Opens Daily"],
  ["11 PM", "Closes Daily"]
];

/* ─────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────── */
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
      {/* HERO */}
      <section className="luxury-hero hero-image" style={{ minHeight: "95vh", overflow: "hidden", color: "white", position: "relative" }}>
        <div
          className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
          style={{ zIndex: 1, display: "grid", minHeight: "95vh", alignItems: "center", gap: "2.5rem", paddingTop: "3rem", paddingBottom: "3rem" }}
        >
          <div style={{ display: "grid", alignItems: "center", gap: "2.5rem" }} className="lg:grid-cols-[1fr_430px]">
            <div style={{ maxWidth: "760px" }}>
              {/* Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  marginBottom: "1.5rem",
                  borderRadius: "999px",
                  border: "1px solid rgba(246,199,106,0.28)",
                  background: "rgba(40,15,20,0.55)",
                  padding: "0.45rem 1.1rem",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "var(--color-gold)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  backdropFilter: "blur(8px)"
                }}
              >
                <Sparkles size={14} />
                Premium Salon Experience
              </div>

              {/* Heading */}
              <h1
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                  fontWeight: 400,
                  lineHeight: 1.05,
                  letterSpacing: "-0.01em",
                  color: "white"
                }}
              >
                Luxury grooming with<br />
                <em style={{ fontStyle: "italic", color: "var(--color-gold)" }}>live queue</em> confidence.
              </h1>

              <p
                style={{
                  marginTop: "1.25rem",
                  maxWidth: "560px",
                  fontSize: "1.05rem",
                  lineHeight: 1.75,
                  color: "rgba(255,255,255,0.72)"
                }}
              >
                Choose your service, pay online, and arrive only when your turn is near. A dark luxury booking experience built for modern local salons.
              </p>

              {/* CTAs */}
              <div style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
                <button
                  onClick={() => onNavigate("booking")}
                  type="button"
                  className="luxury-button shine-button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    minHeight: "52px",
                    borderRadius: "999px",
                    padding: "0 1.75rem",
                    fontWeight: 800,
                    fontSize: "0.9375rem",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  <CalendarCheck2 size={18} />
                  Book a Service
                </button>
                <button
                  onClick={() => onNavigate("about")}
                  type="button"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    minHeight: "52px",
                    borderRadius: "999px",
                    padding: "0 1.75rem",
                    fontWeight: 800,
                    fontSize: "0.9375rem",
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.07)",
                    color: "white",
                    cursor: "pointer",
                    backdropFilter: "blur(8px)"
                  }}
                >
                  Explore Salon <ArrowRight size={18} />
                </button>
              </div>

              {/* Mini stats */}
              <div style={{ marginTop: "2rem", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.625rem" }} className="sm:grid-cols-4">
                {dummyStats.map(([value, label]) => (
                  <div
                    key={label}
                    style={{
                      borderRadius: "1rem",
                      border: "1px solid rgba(246,199,106,0.14)",
                      background: "rgba(255,255,255,0.06)",
                      padding: "0.75rem",
                      backdropFilter: "blur(12px)"
                    }}
                  >
                    <p style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--color-gold)", lineHeight: 1 }}>{value}</p>
                    <p style={{ marginTop: "0.25rem", fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.04em" }}>{label}</p>
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
        </div>
      </section>

      <BookingClosedNotice bookingGate={bookingGate} />

      {/* LIVE QUEUE + FLOW */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div style={{ display: "grid", gap: "1.25rem" }} className="lg:grid-cols-[1fr_340px]">
          {/* Live queue list */}
          <div
            style={{
              borderRadius: "1.75rem",
              border: "1px solid var(--color-border)",
              background: "rgba(12,20,18,0.7)",
              backdropFilter: "blur(16px)",
              padding: "1.5rem",
              boxShadow: "0 20px 60px rgba(0,0,0,0.38)"
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
              <div>
                <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#fca5a5" }}>
                  Live Status
                </p>
                <h2
                  style={{
                    marginTop: "0.25rem",
                    fontFamily: "var(--font-display)",
                    fontSize: "1.6rem",
                    fontWeight: 400,
                    borderLeft: "3px solid var(--color-red)",
                    paddingLeft: "0.75rem"
                  }}
                >
                  Queue moving now
                </h2>
              </div>
              <span
                style={{
                  borderRadius: "999px",
                  background: "rgba(163,22,33,0.15)",
                  border: "1px solid rgba(163,22,33,0.3)",
                  padding: "0.35rem 1rem",
                  fontSize: "0.72rem",
                  fontWeight: 800,
                  color: "#fca5a5",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase"
                }}
              >
                Open
              </span>
            </div>

            {/* Chair status */}
            <div style={{ marginTop: "1.25rem", display: "grid", gap: "0.625rem" }} className="md:grid-cols-3">
              {(queueStats.servingChairs || []).map((chair) => (
                <div
                  key={chair.barberName}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px 1fr",
                    alignItems: "center",
                    gap: "0.75rem",
                    borderRadius: "1rem",
                    border: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(5,10,9,0.7)",
                    padding: "0.75rem"
                  }}
                >
                  <span
                    style={{
                      display: "grid",
                      placeItems: "center",
                      height: "2.75rem",
                      width: "2.75rem",
                      borderRadius: "0.75rem",
                      background: "rgba(163,22,33,0.18)",
                      fontFamily: "monospace",
                      fontSize: "1.2rem",
                      fontWeight: 900,
                      color: "var(--color-gold)"
                    }}
                  >
                    {queueLoading ? "--" : chair.token}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: "0.85rem", fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)" }}>
                      {chair.barberName}
                    </p>
                    <p style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--color-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {queueLoading ? "Syncing..." : chair.token === "-" ? "Chair available" : `${chair.customerName} · running`}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Queue items */}
            <div style={{ marginTop: "1.25rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {queueLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1fr auto",
                      alignItems: "center",
                      gap: "0.75rem",
                      borderRadius: "1rem",
                      border: "1px solid var(--color-border)",
                      background: "var(--color-elevated)",
                      padding: "0.75rem"
                    }}
                  >
                    <span className="skeleton h-10 w-10 rounded-xl" />
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                      <span className="skeleton h-3.5 w-28 rounded-full" />
                      <span className="skeleton h-3 w-20 rounded-full" />
                    </div>
                    <span className="skeleton h-3.5 w-10 rounded-full" />
                  </div>
                ))
              ) : queueItems.length ? (
                queueItems.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "48px 1fr auto",
                      alignItems: "center",
                      gap: "0.75rem",
                      borderRadius: "1rem",
                      border: "1px solid rgba(255,255,255,0.05)",
                      background: "rgba(9,16,14,0.8)",
                      padding: "0.75rem"
                    }}
                  >
                    <span
                      style={{
                        display: "grid",
                        placeItems: "center",
                        height: "2.75rem",
                        width: "2.75rem",
                        borderRadius: "0.75rem",
                        background: "rgba(246,199,106,0.1)",
                        border: "1px solid rgba(246,199,106,0.2)",
                        fontSize: "1rem",
                        fontWeight: 900,
                        color: "var(--color-gold)"
                      }}
                    >
                      {item.token}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text)" }}>
                        {item.name}
                      </p>
                      <p style={{ fontSize: "0.78rem", textTransform: "capitalize", color: "var(--color-muted)" }}>
                        {item.status} &bull; {item.barberName}
                      </p>
                    </div>
                    <p style={{ fontSize: "0.8rem", fontWeight: 800, color: "#fca5a5" }}>{item.eta}</p>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    borderRadius: "1rem",
                    border: "1px dashed var(--color-border)",
                    background: "var(--color-elevated)",
                    padding: "1.25rem",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "var(--color-muted)",
                    lineHeight: 1.6
                  }}
                >
                  The queue is empty right now. New customer bookings will appear here live.
                </div>
              )}
            </div>
          </div>

          {/* Right side card */}
          <div
            style={{
              borderRadius: "1.75rem",
              background: "linear-gradient(145deg, rgba(120,20,28,0.28), rgba(12,20,18,0.8))",
              border: "1px solid rgba(246,199,106,0.16)",
              backdropFilter: "blur(24px)",
              padding: "1.5rem",
              color: "white",
              boxShadow: "0 20px 60px rgba(0,0,0,0.42)"
            }}
          >
            <ShieldCheck size={28} color="#fca5a5" />
            <h3
              style={{
                marginTop: "1rem",
                fontFamily: "var(--font-display)",
                fontSize: "1.5rem",
                fontWeight: 400,
                lineHeight: 1.2
              }}
            >
              Simple customer flow
            </h3>
            <p style={{ marginTop: "0.75rem", lineHeight: 1.75, color: "rgba(255,255,255,0.7)", fontSize: "0.9rem" }}>
              Login, choose service, confirm your slot, and watch your estimated turn update live while you travel to the salon.
            </p>
            {[
              [CheckCircle2, "Mobile responsive"],
              [WalletCards, "Secure online payment"],
              [MapPin, "Walk in near your turn"]
            ].map(([Icon, text]) => (
              <div
                key={text}
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  borderRadius: "0.875rem",
                  background: "rgba(255,255,255,0.07)",
                  padding: "0.875rem 1rem"
                }}
              >
                <Icon size={18} color="var(--color-gold)" />
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
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

      <ReviewsSection />

      <LuxuryPromiseSection />
    </>
  );
}

/* ─────────────────────────────────────────
   HOW IT WORKS
───────────────────────────────────────── */
function HowItWorksSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div
        style={{
          borderRadius: "1.75rem",
          border: "1px solid rgba(246,199,106,0.14)",
          background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%), rgba(12,20,18,0.82)",
          backdropFilter: "blur(28px)",
          padding: "2rem 1.5rem",
          boxShadow: "0 24px 80px rgba(0,0,0,0.4)"
        }}
        className="sm:p-10"
      >
        <p className="section-kicker">How it works</p>
        <h2
          style={{
            marginTop: "0.5rem",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem,4vw,2.75rem)",
            fontWeight: 400,
            maxWidth: "500px"
          }}
        >
          Book, track, and walk in with a clear turn.
        </h2>
        <div style={{ marginTop: "2rem", display: "grid", gap: "1rem" }} className="lg:grid-cols-3">
          {[
            [CalendarCheck2, "01", "Book", "Pick a grooming service and choose an available slot. Your name is pre-filled from Google login."],
            [BellRing, "02", "Track Turn", "Your estimated turn updates live with people ahead and ETA. No guessing, no waiting blindly."],
            [Scissors, "03", "Walk In", "Reach the salon around 40 minutes before your turn for a smoother, stress-free visit."]
          ].map(([Icon, step, title, text]) => (
            <article
              key={title}
              style={{
                position: "relative",
                borderRadius: "1.25rem",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(5,10,9,0.75)",
                padding: "1.5rem",
                transition: "border-color 0.2s, box-shadow 0.2s"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: "3rem",
                    width: "3rem",
                    borderRadius: "0.875rem",
                    border: "1px solid rgba(246,199,106,0.22)",
                    background: "rgba(246,199,106,0.08)"
                  }}
                >
                  <Icon size={20} color="var(--color-gold)" />
                </span>
                <span
                  style={{
                    borderRadius: "999px",
                    background: "rgba(40,15,20,0.8)",
                    border: "1px solid rgba(163,22,33,0.3)",
                    padding: "0.25rem 0.75rem",
                    fontSize: "0.7rem",
                    fontWeight: 900,
                    color: "var(--color-gold)",
                    letterSpacing: "0.08em"
                  }}
                >
                  Step {step}
                </span>
              </div>
              <h3
                style={{
                  marginTop: "1.25rem",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.4rem",
                  fontWeight: 400,
                  color: "var(--color-text)"
                }}
              >
                {title}
              </h3>
              <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", fontWeight: 500, lineHeight: 1.7, color: "var(--color-muted)" }}>
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   SERVICES SECTION
───────────────────────────────────────── */
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
    ? "services-slider drag-scroll flex snap-x gap-4 overflow-x-auto pb-4 pl-1 pr-[24vw] sm:grid sm:grid-cols-2 sm:overflow-visible sm:p-0 lg:grid-cols-4"
    : "grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4";
  const cardClassName = mobileSlider
    ? "service-card min-w-[72vw] max-w-[72vw] shrink-0 snap-start overflow-hidden rounded-2xl sm:min-w-0 sm:max-w-none sm:shrink"
    : "service-card overflow-hidden rounded-2xl";

  useEffect(() => {
    if (!mobileSlider || !sliderRef.current) return;
    sliderRef.current.scrollLeft = 0;
  }, [mobileSlider, services.length, user?.uid]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" ref={sectionRef}>
      <div style={{ marginBottom: "1.5rem", display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: "0.75rem" }}>
        <div>
          <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "#fca5a5" }}>
            Services
          </p>
          <h2
            style={{
              marginTop: "0.25rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem,4vw,2.75rem)",
              fontWeight: 400
            }}
          >
            Popular grooming options
          </h2>
        </div>
        <p style={{ maxWidth: "380px", lineHeight: 1.7, color: "var(--color-muted)", fontSize: "0.875rem" }}>
          Choose a service now. Name and mobile are collected only at checkout.
        </p>
      </div>

      <div className={listClassName} ref={sliderRef} {...(mobileSlider ? dragScroll : {})}>
        {services.map((service) => {
          const serviceImageUrl = service.imageUrl || getServiceImageUrl(service.title);
          const previewService = { ...service, imageUrl: serviceImageUrl };
          const bookingClosed = !bookingGate.loading && !bookingGate.open;
          const buttonLabel = bookingGate.loading
            ? "Checking..."
            : bookingClosed
              ? "Booking Closed"
              : user
                ? "Choose & Pay"
                : "Login to Choose";

          return (
            <article className={cardClassName} key={service.title}>
              <div style={{ position: "relative", overflow: "hidden" }}>
                <button
                  aria-label={`View ${service.title} photo`}
                  onClick={() => onPhotoPreview?.(previewService)}
                  type="button"
                  style={{ display: "block", width: "100%", height: "168px", cursor: "pointer" }}
                  className="group sm:h-48"
                >
                  <img
                    alt={service.title}
                    src={serviceImageUrl}
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", transition: "transform 0.3s ease" }}
                    className="group-hover:scale-105"
                  />
                </button>
                {/* Scissors badge */}
                <span
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    left: "0.75rem",
                    display: "grid",
                    placeItems: "center",
                    height: "2.5rem",
                    width: "2.5rem",
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(246,199,106,0.18)",
                    background: "rgba(3,8,6,0.92)"
                  }}
                >
                  <Scissors size={16} color="var(--color-gold)" />
                </span>
                {/* Eye button */}
                <button
                  aria-label={`Open ${service.title} photo`}
                  onClick={() => onPhotoPreview?.(previewService)}
                  type="button"
                  style={{
                    position: "absolute",
                    top: "0.75rem",
                    right: "0.75rem",
                    display: "grid",
                    placeItems: "center",
                    height: "2.5rem",
                    width: "2.5rem",
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(246,199,106,0.28)",
                    background: "rgba(3,8,6,0.92)",
                    cursor: "pointer",
                    transition: "background 0.15s"
                  }}
                >
                  <Eye size={16} color="var(--color-gold)" />
                </button>
              </div>
              <div style={{ padding: "1rem" }} className="sm:p-5">
                <h3
                  style={{
                    marginTop: "0.25rem",
                    fontFamily: "var(--font-display)",
                    fontSize: "1.15rem",
                    fontWeight: 400,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: "var(--color-text)"
                  }}
                  title={service.title}
                >
                  {service.title}
                </h3>
                <p
                  style={{
                    marginTop: "0.4rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    fontSize: "0.78rem",
                    color: "var(--color-muted)"
                  }}
                >
                  <Clock3 size={13} />
                  {service.time}
                </p>
                <p
                  style={{
                    marginTop: "0.75rem",
                    borderRadius: "0.75rem",
                    border: "1px solid rgba(246,199,106,0.18)",
                    background: "rgba(40,15,20,0.7)",
                    padding: "0.5rem 0.875rem",
                    fontSize: "0.875rem",
                    fontWeight: 900,
                    color: "var(--color-gold)"
                  }}
                >
                  {service.price}
                </p>
                <button
                  onClick={() => {
                    if (bookingClosed) { onServiceSelect(service); return; }
                    user ? onServiceSelect(service) : onLogin();
                  }}
                  disabled={bookingGate.loading || (!user && loginLoading)}
                  type="button"
                  style={{
                    marginTop: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    width: "100%",
                    minHeight: "42px",
                    borderRadius: "0.75rem",
                    border: "none",
                    background: bookingClosed ? "#7f1d1d" : "var(--color-red)",
                    color: "white",
                    fontWeight: 800,
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    transition: "background 0.15s",
                    opacity: (bookingGate.loading || (!user && loginLoading)) ? 0.6 : 1
                  }}
                >
                  {!user && loginLoading ? (
                    <><ButtonSpinner /> Logging in...</>
                  ) : bookingGate.loading ? (
                    <><ButtonSpinner /> {buttonLabel}</>
                  ) : (
                    <>{buttonLabel} <ArrowRight size={15} /></>
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

/* ─────────────────────────────────────────
   HAIRCUT FEATURE
───────────────────────────────────────── */
function HaircutFeature() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div style={{ display: "grid", gap: "1.25rem" }} className="lg:grid-cols-[0.95fr_1.05fr]">
        <div className="haircut-image" style={{ minHeight: "360px", borderRadius: "1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.42)" }} />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderRadius: "1.75rem",
            border: "1px solid rgba(246,199,106,0.14)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(12,20,18,0.82)",
            backdropFilter: "blur(24px)",
            padding: "2rem 1.75rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.38)"
          }}
        >
          <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "#fca5a5" }}>
            Fresh haircut experience
          </p>
          <h2
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem,3.5vw,2.5rem)",
              fontWeight: 400,
              lineHeight: 1.15
            }}
          >
            Stylish service with queue clarity.
          </h2>
          <p style={{ marginTop: "1rem", lineHeight: 1.75, color: "var(--color-muted)", fontSize: "0.9rem" }}>
            Customers do not need to guess in the waiting room. The queue screen clearly shows estimated turn, people ahead, and live status.
          </p>
          <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem" }}>
            {[["7 AM", "Opening"], ["11 PM", "Closing"], ["Live", "Queue"]].map(([value, label]) => (
              <div
                key={label}
                style={{
                  borderRadius: "1rem",
                  border: "1px solid var(--color-border)",
                  background: "rgba(5,10,9,0.75)",
                  padding: "1rem"
                }}
              >
                <p style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--color-gold)" }}>{value}</p>
                <p style={{ marginTop: "0.25rem", fontSize: "0.75rem", color: "var(--color-muted)", fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   HAIRCUT STYLES SECTION
───────────────────────────────────────── */
function HaircutStylesSection({ user, onLogin, onServiceSelect, loginLoading, bookingGate, services }) {
  const featuredService = services[0] || defaultServices[0];
  const bookingClosed = !bookingGate.loading && !bookingGate.open;
  const buttonLabel = bookingGate.loading ? "Checking..." : bookingClosed ? "Booking Closed" : user ? "Choose Haircut" : "Login to Choose";

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div style={{ display: "grid", gap: "1.25rem" }} className="lg:grid-cols-[1.1fr_0.9fr]">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            borderRadius: "1.75rem",
            background: "linear-gradient(145deg, rgba(120,20,28,0.28), rgba(12,20,18,0.8))",
            border: "1px solid rgba(246,199,106,0.16)",
            backdropFilter: "blur(24px)",
            padding: "2rem 1.75rem",
            color: "white",
            boxShadow: "0 20px 60px rgba(0,0,0,0.42)"
          }}
        >
          <p style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.22em", textTransform: "uppercase", color: "#fca5a5" }}>
            Haircut Styles
          </p>
          <h2
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem,3.5vw,2.5rem)",
              fontWeight: 400,
              lineHeight: 1.15
            }}
          >
            Pick a clean look before you arrive.
          </h2>
          <p style={{ marginTop: "1rem", lineHeight: 1.75, color: "rgba(255,255,255,0.72)", fontSize: "0.9rem" }}>
            Select classic cuts, fade-inspired styling, beard shape-up, or grooming combo options from the service cards.
          </p>
          <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem" }}>
            {["Classic", "Fade", "Beard"].map((style) => (
              <div
                key={style}
                style={{
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.08)",
                  padding: "1rem"
                }}
              >
                <Scissors size={20} color="var(--color-gold)" />
                <p style={{ marginTop: "0.6rem", fontWeight: 800, fontSize: "0.9rem" }}>{style}</p>
              </div>
            ))}
          </div>
          <button
            disabled={bookingGate.loading || (!user && loginLoading)}
            onClick={() => {
              if (bookingClosed) { onServiceSelect(featuredService); return; }
              user ? onServiceSelect(featuredService) : onLogin();
            }}
            type="button"
            className="luxury-button shine-button"
            style={{
              marginTop: "1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              minHeight: "52px",
              borderRadius: "999px",
              padding: "0 2rem",
              fontWeight: 800,
              fontSize: "0.9375rem",
              border: "none",
              cursor: "pointer",
              width: "fit-content",
              opacity: (bookingGate.loading || (!user && loginLoading)) ? 0.6 : 1
            }}
          >
            {!user && loginLoading ? (
              <><ButtonSpinner dark /> Logging in...</>
            ) : bookingGate.loading ? (
              <><ButtonSpinner dark /> {buttonLabel}</>
            ) : (
              <>{buttonLabel} <ArrowRight size={18} /></>
            )}
          </button>
        </div>
        <div className="haircut-styles-image" style={{ minHeight: "360px", borderRadius: "1.75rem", boxShadow: "0 20px 60px rgba(0,0,0,0.42)" }} />
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   REVIEWS SECTION (dummy data)
───────────────────────────────────────── */
function ReviewsSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div style={{ marginBottom: "1.5rem", textAlign: "center" }}>
        <p className="section-kicker">Customer Reviews</p>
        <h2
          style={{
            marginTop: "0.5rem",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.75rem,4vw,2.75rem)",
            fontWeight: 400
          }}
        >
          What our customers say
        </h2>
      </div>
      <div style={{ display: "grid", gap: "1rem" }} className="sm:grid-cols-2 lg:grid-cols-4">
        {dummyReviews.map((review) => (
          <article
            key={review.name}
            style={{
              borderRadius: "1.25rem",
              border: "1px solid var(--color-border)",
              background: "rgba(12,20,18,0.75)",
              backdropFilter: "blur(16px)",
              padding: "1.25rem",
              transition: "border-color 0.2s, transform 0.2s"
            }}
          >
            <div style={{ display: "flex", gap: "0.25rem", marginBottom: "0.875rem" }}>
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} size={14} color="var(--color-gold)" fill="var(--color-gold)" />
              ))}
            </div>
            <p style={{ fontSize: "0.875rem", lineHeight: 1.65, color: "var(--color-text-secondary, #b5b0a7)", fontStyle: "italic" }}>
              &ldquo;{review.text}&rdquo;
            </p>
            <p style={{ marginTop: "0.875rem", fontWeight: 800, fontSize: "0.875rem", color: "var(--color-text)" }}>{review.name}</p>
            <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginTop: "0.2rem" }}>
              Verified customer
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   LUXURY PROMISE
───────────────────────────────────────── */
function LuxuryPromiseSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div style={{ display: "grid", gap: "1.25rem" }} className="lg:grid-cols-[0.95fr_1.05fr]">
        <div
          style={{
            borderRadius: "1.75rem",
            border: "1px solid rgba(246,199,106,0.14)",
            background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(12,20,18,0.82)",
            backdropFilter: "blur(24px)",
            padding: "2rem 1.75rem",
            boxShadow: "0 20px 60px rgba(0,0,0,0.38)"
          }}
        >
          <p className="section-kicker">Owner curated</p>
          <h2
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(1.75rem,3.5vw,2.5rem)",
              fontWeight: 400,
              lineHeight: 1.15
            }}
          >
            A calm premium flow for busy salon days.
          </h2>
          <p style={{ marginTop: "1rem", lineHeight: 1.75, color: "var(--color-muted)", fontSize: "0.9rem" }}>
            Estimated turns, slots, online payment, guest booking, and refund requests stay organized in one experience so customers know exactly what happens next.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
          {[
            [BadgeCheck, "Verified payment flow", "Cashfree online checkout with visible charges."],
            [ShieldCheck, "Clean queue control", "Live status and estimated wait reduce confusion."],
            [Gem, "Premium service cards", "Each service has image, duration, amount, and CTA."],
            [Clock3, "Slot-aware booking", "Lunch break and closing time are respected."]
          ].map(([Icon, title, text]) => (
            <article
              key={title}
              style={{
                borderRadius: "1.25rem",
                border: "1px solid rgba(246,199,106,0.14)",
                background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02)), rgba(12,20,18,0.82)",
                backdropFilter: "blur(16px)",
                padding: "1.25rem"
              }}
            >
              <Icon size={22} color="var(--color-gold)" />
              <h3
                style={{
                  marginTop: "0.875rem",
                  fontFamily: "var(--font-display)",
                  fontSize: "1rem",
                  fontWeight: 400,
                  lineHeight: 1.3,
                  color: "var(--color-text)"
                }}
              >
                {title}
              </h3>
              <p style={{ marginTop: "0.4rem", fontSize: "0.78rem", lineHeight: 1.65, color: "var(--color-muted)" }}>
                {text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   BARBERS PAGE
───────────────────────────────────────── */
export function BarbersPage({ bookingGate }) {
  const [barberStats, setBarberStats] = useState({});
  const barbers = bookingGate.barbers?.length ? bookingGate.barbers : [];

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "barberStats"), limit(BARBER_STATS_LIMIT)),
      (snapshot) => {
        const nextStats = snapshot.docs.reduce((acc, d) => {
          const data = d.data();
          if (data.name) acc[data.name] = data;
          return acc;
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
      {/* Header */}
      <div
        style={{
          borderRadius: "1.75rem",
          background: "linear-gradient(145deg, rgba(120,20,28,0.28), rgba(12,20,18,0.8))",
          border: "1px solid rgba(246,199,106,0.16)",
          backdropFilter: "blur(24px)",
          padding: "1.5rem 1.75rem",
          color: "white",
          boxShadow: "0 20px 60px rgba(0,0,0,0.42)"
        }}
        className="sm:p-8"
      >
        <p className="section-label-red">Barbers</p>
        <h1
          style={{
            marginTop: "0.5rem",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(2rem,5vw,3.25rem)",
            fontWeight: 400,
            maxWidth: "560px",
            lineHeight: 1.1
          }}
        >
          Choose your barber with live availability.
        </h1>
        <p style={{ marginTop: "0.75rem", maxWidth: "520px", lineHeight: 1.75, color: "rgba(255,255,255,0.72)", fontSize: "0.9rem" }}>
          Photos are managed by admin. Customer ratings appear after completed visits, and queue counts update live.
        </p>
      </div>

      <div style={{ marginTop: "1.5rem", display: "grid", gap: "1rem" }} className="md:grid-cols-2 xl:grid-cols-3">
        {barbers.map((barber) => {
          const stats = barberStats[barber.name] || {};
          const rating = getAverageRating(barber.name);
          return (
            <article
              key={barber.name}
              style={{
                borderRadius: "1.75rem",
                border: "1px solid rgba(246,199,106,0.14)",
                background: "linear-gradient(135deg, rgba(255,255,255,0.065), rgba(255,255,255,0.02)), rgba(12,20,18,0.82)",
                backdropFilter: "blur(24px)",
                overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.42)"
              }}
            >
              {barber.imageUrl ? (
                <img
                  alt={barber.name}
                  src={barber.imageUrl}
                  loading="lazy"
                  decoding="async"
                  style={{ height: "16rem", width: "100%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    height: "16rem",
                    width: "100%",
                    display: "grid",
                    placeItems: "center",
                    borderBottom: "1px solid var(--color-border)",
                    background: "var(--color-elevated)",
                    fontSize: "0.875rem",
                    fontWeight: 800,
                    color: "var(--color-muted)"
                  }}
                >
                  Image coming soon
                </div>
              )}
              <div style={{ padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
                  <div>
                    <h2
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: "1.4rem",
                        fontWeight: 400,
                        color: "var(--color-text)"
                      }}
                    >
                      {barber.name}
                    </h2>
                    <p style={{ marginTop: "0.2rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-muted)" }}>
                      {barber.available ? "Available today" : "Unavailable today"}
                    </p>
                  </div>
                  <span
                    style={{
                      borderRadius: "999px",
                      padding: "0.35rem 0.875rem",
                      fontSize: "0.72rem",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      background: barber.available ? "rgba(45,106,79,0.2)" : "rgba(163,22,33,0.15)",
                      color: barber.available ? "#86efac" : "#fca5a5",
                      border: `1px solid ${barber.available ? "rgba(45,106,79,0.3)" : "rgba(163,22,33,0.3)"}`
                    }}
                  >
                    {barber.available ? "Open" : "Off"}
                  </span>
                </div>
                <div style={{ marginTop: "1.1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                  {[
                    ["Queue", stats.activeCount || 0],
                    [`${rating || "-"} ★`, `${stats.ratingCount || 0} reviews`]
                  ].map(([top, bottom]) => (
                    <div
                      key={top}
                      style={{
                        borderRadius: "1rem",
                        border: "1px solid var(--color-border)",
                        background: "rgba(5,10,9,0.75)",
                        padding: "1rem"
                      }}
                    >
                      <p style={{ fontSize: "0.65rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--color-muted)" }}>
                        {typeof bottom === "string" && bottom.includes("reviews") ? "Rating" : top}
                      </p>
                      <p style={{ marginTop: "0.5rem", fontSize: "1.85rem", fontWeight: 900, color: "var(--color-gold)", lineHeight: 1 }}>
                        {typeof bottom === "string" && bottom.includes("reviews") ? top : bottom}
                      </p>
                      {typeof bottom === "string" && bottom.includes("reviews") ? (
                        <p style={{ marginTop: "0.25rem", fontSize: "0.68rem", fontWeight: 600, color: "var(--color-muted)" }}>{bottom}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   BOOKING PAGE
───────────────────────────────────────── */
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
  const totalServicePages = Math.max(1, Math.ceil(services.length / SERVICE_PAGE_SIZE));
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
      servicesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          style={{
            borderRadius: "1.75rem",
            background: "linear-gradient(145deg, rgba(120,20,28,0.28), rgba(12,20,18,0.8))",
            border: "1px solid rgba(246,199,106,0.16)",
            backdropFilter: "blur(24px)",
            padding: "1.5rem 1.75rem",
            color: "white",
            boxShadow: "0 20px 60px rgba(0,0,0,0.42)"
          }}
          className="sm:p-8"
        >
          <p className="section-label-red">Booking</p>
          <h1
            style={{
              marginTop: "0.5rem",
              fontFamily: "var(--font-display)",
              fontSize: "clamp(2rem,5vw,3.25rem)",
              fontWeight: 400,
              maxWidth: "600px",
              lineHeight: 1.1
            }}
          >
            Choose a service first, then continue to payment.
          </h1>
          <p style={{ marginTop: "0.75rem", maxWidth: "500px", lineHeight: 1.75, color: "rgba(255,255,255,0.72)", fontSize: "0.9rem" }}>
            Your Google name is prefilled. The checkout modal lets you edit both name and mobile number.
          </p>
          <div style={{ marginTop: "1.5rem", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.625rem" }}>
            {[
              [UserRound, "Login"],
              [CalendarCheck2, "Choose Service"],
              [BellRing, "Payment Details"]
            ].map(([Icon, label]) => (
              <div
                key={label}
                style={{
                  borderRadius: "1rem",
                  background: "rgba(255,255,255,0.08)",
                  padding: "0.875rem 0.75rem"
                }}
              >
                <Icon size={18} color="var(--color-gold)" />
                <p style={{ marginTop: "0.5rem", fontSize: "0.78rem", fontWeight: 800, lineHeight: 1.3 }}>{label}</p>
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
        pagination={{ page: safeServicePage, totalPages: totalServicePages, onPageChange: handleServicePageChange }}
        sectionRef={servicesSectionRef}
        services={paginatedServices}
        user={user}
      />
    </>
  );
}
