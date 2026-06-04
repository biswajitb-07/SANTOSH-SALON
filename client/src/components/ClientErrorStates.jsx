import {
  AlertTriangle,
  CalendarX,
  Eye,
  LockKeyhole,
  RotateCw,
  UserRound,
  WifiOff,
  XCircle
} from "lucide-react";

const iconMap = {
  empty: CalendarX,
  failed: XCircle,
  slot: AlertTriangle,
  session: LockKeyhole
};

export function MobileErrorCard({
  actions = null,
  children = null,
  details = [],
  icon = "empty",
  tone = "gold",
  title
}) {
  const Icon = iconMap[icon] || AlertTriangle;

  return (
    <section className={`mobile-error-card mobile-error-${tone}`}>
      <span className="mobile-error-icon">
        <Icon size={24} />
      </span>
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
      {details.length ? (
        <div className="mobile-error-details">
          {details.map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {actions ? <div className="mobile-error-actions">{actions}</div> : null}
    </section>
  );
}

export function SessionExpiredCard({ onLogin }) {
  return (
    <div className="mobile-session-card">
      <span>
        <LockKeyhole size={16} />
      </span>
      <div>
        <strong>Session Expired</strong>
        <p>Please log in again to continue.</p>
      </div>
      <button onClick={onLogin} type="button">
        Log In
      </button>
    </div>
  );
}

export function ConnectionLostScreen({ onOfflineMode, onRetry }) {
  return (
    <main className="connection-lost-screen">
      <button
        aria-label="Go back"
        className="connection-back-button"
        onClick={onOfflineMode}
        type="button"
      >
        <span aria-hidden="true">‹</span>
      </button>
      <h1>Connection Lost</h1>
      <div className="connection-icon">
        <WifiOff size={78} />
      </div>
      <h2>No Internet Connection</h2>
      <p>
        Oops! It seems you&apos;re offline. Please check your Wi-Fi or mobile
        data and try again.
      </p>
      <div className="connection-actions">
        <button className="connection-primary" onClick={onRetry} type="button">
          <RotateCw size={17} />
          Try Again
        </button>
        <button className="connection-secondary" onClick={onOfflineMode} type="button">
          <WifiOff size={17} />
          Go to Offline Mode
        </button>
      </div>
      <section className="offline-help-card">
        <h3>What you can do offline:</h3>
        {[
          [Eye, "View saved bookings"],
          [UserRound, "Access your profile"],
          [AlertTriangle, "See past notifications"]
        ].map(([Icon, label]) => (
          <div className="offline-help-row" key={label}>
            <span>
              <Icon size={16} />
            </span>
            <strong>{label}</strong>
          </div>
        ))}
      </section>
      <div className="offline-bottom-bar">
        <WifiOff size={15} />
        You are currently offline
      </div>
    </main>
  );
}
