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
    <main className="min-h-screen bg-[#06100e] text-[#f4fbf8]">
      <header className="border-b border-[#35201f] bg-[#06100e]/88">
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
    <div className="h-1.5 w-full bg-[#101a18]">
      <div
        className="h-full rounded-r-full bg-[#f9c66d] transition-[width] duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function ScrollPercentBadge({ visible, value }) {
  return (
    <div
      className={`pointer-events-none fixed bottom-24 right-4 z-40 grid h-14 w-14 place-items-center rounded-full border border-[#f9c66d]/30 bg-[#101a18] text-sm font-black text-[#f9c66d] shadow-2xl shadow-black/40 ring-4 ring-black/30 transition-all duration-300 sm:bottom-6 sm:right-6 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
      }`}
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
  const navPages = user ? [...primaryPages, "profile"] : primaryPages;

  const go = (nextPage) => {
    onNavigate(nextPage);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#35201f] bg-[#06100e]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6 lg:px-8">
        <button
          className="flex items-center gap-3 text-left"
          onClick={() => go("home")}
          type="button"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#991b1b] text-white shadow-lg shadow-[#991b1b]/20">
            <Scissors size={20} />
          </span>
          <span>
            <span className="block text-xs font-black uppercase tracking-[0.18em] text-[#991b1b]">
              Santosh
            </span>
            <span className="block text-base font-black leading-none sm:text-lg">
              Salon Queue
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-1 rounded-full border border-[#35201f] bg-[#101a18]/88 p-1 shadow-sm lg:flex">
          {navPages.map((item) => (
            <button
              className={`h-9 rounded-full px-4 text-sm font-bold transition ${
                page === item
                  ? "bg-[#991b1b] text-white"
                  : "text-[#9db2ad] hover:bg-[#2a1111] hover:text-white"
              }`}
              key={item}
              onClick={() => go(item)}
              type="button"
            >
              {titleCase(item)}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {canInstall ? (
            <button
              className="flex h-10 items-center gap-2 rounded-full border border-[#f9c66d]/35 bg-[#24170d] px-4 text-sm font-black text-[#f9c66d] transition hover:bg-[#33200f]"
              onClick={install}
              type="button"
            >
              <Download size={18} />
              Install App
            </button>
          ) : null}
          {authLoading ? (
            <div className="skeleton h-12 w-12 rounded-2xl" />
          ) : user ? (
            <button
              aria-label="Open profile"
              className="grid h-10 w-10 place-items-center rounded-full border border-[#35201f] bg-[#101a18] p-1 font-black text-white shadow-sm transition hover:bg-[#2a1111]"
              onClick={() => go("profile")}
              type="button"
            >
              <UserAvatar size="h-8 w-8" user={user} />
            </button>
          ) : (
            <button
              className="flex h-10 items-center gap-2 rounded-full border border-[#35201f] bg-[#101a18] px-4 text-sm font-black text-white transition hover:bg-[#2a1111] disabled:opacity-70"
              disabled={loginLoading}
              onClick={onLogin}
              type="button"
            >
              {loginLoading ? <ButtonSpinner /> : <LogIn size={18} />}
              {loginLoading ? "Logging in..." : "Login"}
            </button>
          )}
        </div>

        {authLoading ? (
          <span className="skeleton h-10 w-10 rounded-full lg:hidden" />
        ) : user ? (
          <button
            aria-label="Open profile"
            className="grid h-10 w-10 place-items-center rounded-full border border-[#35201f] bg-[#101a18] p-1 shadow-sm lg:hidden"
            onClick={() => go("profile")}
            type="button"
          >
            <UserAvatar size="h-8 w-8" user={user} />
          </button>
        ) : (
          <button
            aria-label="Login"
            className="grid h-10 w-10 place-items-center rounded-full border border-[#35201f] bg-[#101a18] text-[#f9c66d] shadow-sm lg:hidden"
            disabled={loginLoading}
            onClick={onLogin}
            type="button"
          >
            {loginLoading ? <ButtonSpinner /> : <UserRound size={20} />}
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
