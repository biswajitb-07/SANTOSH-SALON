import { useEffect, useState } from "react";
import {
  Download,
  LogIn,
  Scissors,
  UserRound
} from "lucide-react";
import { ButtonSpinner, UserAvatar } from "./common.jsx";
import { ClientMobileNavigation } from "./ClientMobileNavigation.jsx";
import { primaryPages, titleCase } from "../lib/routing.js";

export function PageSkeleton() {
  return (
    <main className="min-h-screen" style={{ background: "var(--color-base)", color: "var(--color-text)" }}>
      <header style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(3, 8, 6, 0.9)" }}>
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="skeleton h-11 w-11 rounded-2xl" />
            <div>
              <div className="skeleton h-3 w-20 rounded-full" />
              <div className="skeleton mt-2 h-5 w-32 rounded-full" />
            </div>
          </div>
          <div className="skeleton h-11 w-11 rounded-2xl lg:w-28" />
        </div>
      </header>
      <section className="mx-auto grid min-h-[72vh] max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_430px] lg:px-8">
        <div>
          <div className="skeleton h-10 w-52 rounded-full" />
          <div className="skeleton mt-5 h-16 max-w-2xl rounded-3xl" />
          <div className="skeleton mt-4 h-16 max-w-xl rounded-3xl" />
          <div className="mt-7 flex gap-3">
            <div className="skeleton h-[52px] w-40 rounded-2xl" />
            <div className="skeleton h-[52px] w-40 rounded-2xl" />
          </div>
        </div>
        <div className="skeleton h-96 rounded-[2rem]" />
      </section>
    </main>
  );
}

function TopProgress({ routeProgress, routeProgressActive, scrollProgress }) {
  const progress = routeProgressActive ? routeProgress : scrollProgress;
  return (
    <div style={{ height: "2px", width: "100%", background: "rgba(255,255,255,0.05)" }}>
      <div
        style={{
          width: `${progress}%`,
          height: "100%",
          background: "linear-gradient(90deg, #a31621, #f6c76a)",
          borderRadius: "0 999px 999px 0",
          transition: "width 0.3s ease-out"
        }}
      />
    </div>
  );
}

export function ScrollPercentBadge({ visible, value }) {
  return (
    <div
      style={{
        position: "fixed",
        bottom: "6rem",
        right: "1rem",
        zIndex: 40,
        width: "3.25rem",
        height: "3.25rem",
        display: "grid",
        placeItems: "center",
        borderRadius: "999px",
        border: "1px solid rgba(246,199,106,0.28)",
        background: "rgba(12,20,18,0.95)",
        fontSize: "0.75rem",
        fontWeight: 900,
        color: "var(--color-gold)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
        pointerEvents: "none",
        transition: "opacity 0.3s, transform 0.3s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(8px)"
      }}
    >
      {Math.round(value)}%
    </div>
  );
}

function usePwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    if (standalone) setInstalled(true);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choice = await installPrompt.userChoice.catch(() => null);
    if (choice?.outcome !== "dismissed") setInstallPrompt(null);
  };

  return {
    canInstall: Boolean(installPrompt) && !installed,
    install
  };
}

export function Header({
  page,
  user,
  onLogin,
  onNavigate,
  authLoading,
  loginLoading,
  routeProgress,
  routeProgressActive,
  scrollProgress
}) {
  const { canInstall, install } = usePwaInstallPrompt();
  const navPages = primaryPages;

  const go = (nextPage) => {
    onNavigate(nextPage);
  };

  return (
    <>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          borderBottom: "1px solid var(--color-border)",
          background: "rgba(3, 8, 6, 0.88)",
          backdropFilter: "blur(28px) saturate(130%)"
        }}
      >
        <div
          className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
          style={{ height: "64px" }}
        >
          {/* Logo */}
          <button
            className="flex items-center gap-3 text-left"
            onClick={() => go("home")}
            type="button"
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                height: "2.5rem",
                width: "2.5rem",
                borderRadius: "0.875rem",
                background: "linear-gradient(135deg, #a31621, #7f1317)",
                boxShadow: "0 4px 16px rgba(163,22,33,0.35)"
              }}
            >
              <Scissors size={18} color="white" />
            </span>
            <span>
              <span
                style={{
                  display: "block",
                  fontSize: "0.62rem",
                  fontWeight: 800,
                  letterSpacing: "0.24em",
                  textTransform: "uppercase",
                  color: "var(--color-gold)"
                }}
              >
                Santosh
              </span>
              <span
                style={{
                  display: "block",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.05rem",
                  fontWeight: 400,
                  lineHeight: 1,
                  color: "var(--color-text)"
                }}
              >
                Salon Queue
              </span>
            </span>
          </button>

          {/* Desktop Nav */}
          <nav
            className="hidden items-center gap-0.5 lg:flex"
            style={{
              borderRadius: "999px",
              border: "1px solid var(--color-border)",
              background: "rgba(15,26,23,0.7)",
              padding: "0.3rem"
            }}
          >
            {navPages.map((item) => (
              <button
                key={item}
                onClick={() => go(item)}
                type="button"
                style={{
                  height: "2.1rem",
                  borderRadius: "999px",
                  padding: "0 1rem",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  letterSpacing: "0.015em",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 140ms ease",
                  background: page === item
                    ? "linear-gradient(135deg, #a31621, #7f1317)"
                    : "transparent",
                  color: page === item
                    ? "white"
                    : "var(--color-muted)"
                }}
              >
                {titleCase(item)}
              </button>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-2 lg:flex">
            {canInstall ? (
              <button
                onClick={install}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  height: "2.25rem",
                  borderRadius: "999px",
                  padding: "0 1rem",
                  fontSize: "0.8125rem",
                  fontWeight: 800,
                  border: "1px solid rgba(246,199,106,0.3)",
                  background: "rgba(36, 23, 13, 0.8)",
                  color: "var(--color-gold)",
                  cursor: "pointer",
                  transition: "all 140ms ease"
                }}
              >
                <Download size={15} />
                Install App
              </button>
            ) : null}
            {authLoading ? (
              <div className="skeleton h-10 w-10 rounded-full" />
            ) : user ? (
              <button
                aria-label="Open profile"
                onClick={() => go("profile")}
                type="button"
                style={{
                  display: "grid",
                  placeItems: "center",
                  height: "2.5rem",
                  width: "2.5rem",
                  borderRadius: "999px",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-elevated)",
                  padding: "3px",
                  cursor: "pointer",
                  transition: "border-color 140ms ease"
                }}
              >
                <UserAvatar size="h-8 w-8" user={user} />
              </button>
            ) : (
              <button
                onClick={onLogin}
                disabled={loginLoading}
                type="button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  height: "2.25rem",
                  borderRadius: "999px",
                  padding: "0 1.1rem",
                  fontSize: "0.8125rem",
                  fontWeight: 800,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-elevated)",
                  color: "var(--color-text)",
                  cursor: loginLoading ? "not-allowed" : "pointer",
                  opacity: loginLoading ? 0.7 : 1,
                  transition: "all 140ms ease"
                }}
              >
                {loginLoading ? <ButtonSpinner /> : <LogIn size={15} />}
                {loginLoading ? "Logging in..." : "Login"}
              </button>
            )}
          </div>

          {/* Mobile user button */}
          {authLoading ? (
            <span className="skeleton h-10 w-10 rounded-full lg:hidden" />
          ) : user ? (
            <button
              aria-label="Open profile"
              onClick={() => go("profile")}
              type="button"
              className="lg:hidden"
              style={{
                display: "grid",
                placeItems: "center",
                height: "2.25rem",
                width: "2.25rem",
                borderRadius: "999px",
                border: "1px solid var(--color-border)",
                background: "var(--color-elevated)",
                padding: "2px",
                cursor: "pointer"
              }}
            >
              <UserAvatar size="h-7 w-7" user={user} />
            </button>
          ) : (
            <button
              aria-label="Login"
              onClick={onLogin}
              disabled={loginLoading}
              type="button"
              className="lg:hidden"
              style={{
                display: "grid",
                placeItems: "center",
                height: "2.25rem",
                width: "2.25rem",
                borderRadius: "999px",
                border: "1px solid rgba(246,199,106,0.25)",
                background: "rgba(36,23,13,0.6)",
                color: "var(--color-gold)",
                cursor: loginLoading ? "not-allowed" : "pointer"
              }}
            >
              {loginLoading ? <ButtonSpinner /> : <UserRound size={17} />}
            </button>
          )}
        </div>

        <TopProgress
          routeProgress={routeProgress}
          routeProgressActive={routeProgressActive}
          scrollProgress={scrollProgress}
        />
      </header>

      <ClientMobileNavigation
        canInstall={canInstall}
        install={install}
        loginLoading={loginLoading}
        onLogin={onLogin}
        onNavigate={onNavigate}
        page={page}
        user={user}
      />
    </>
  );
}
