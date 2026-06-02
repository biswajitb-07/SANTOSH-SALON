import { useEffect, useState } from "react";
import {
  CalendarCheck2,
  CircleHelp,
  ChevronsUp,
  Download,
  GalleryHorizontalEnd,
  Home,
  LogIn,
  Mail,
  ReceiptText,
  Scissors,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { ButtonSpinner, UserAvatar } from "./common.jsx";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { canInstall, install } = usePwaInstallPrompt();
  const navPages = user ? [...primaryPages, "profile"] : primaryPages;
  const bottomItems = [
    { key: "home", label: "Home", icon: Home },
    { key: "booking", label: "Booking", icon: CalendarCheck2 },
    { key: "barbers", label: "Barbers", icon: Scissors },
    {
      key: user ? "my-bookings" : "profile",
      label: user ? "Bookings" : "Login",
      icon: user ? UserRound : LogIn,
      loginAction: !user
    }
  ];
  const morePages = [
    { key: "about", label: "About Us", icon: Sparkles },
    { key: "contact", label: "Contact Us", icon: Mail },
    ...(user ? [{ key: "profile", label: "Profile", icon: UserRound }] : []),
    { key: "gallery", label: "Gallery", icon: GalleryHorizontalEnd },
    { key: "pricing", label: "Pricing", icon: ReceiptText },
    { key: "faq", label: "FAQ", icon: CircleHelp }
  ];

  useEffect(() => {
    if (!menuOpen) return undefined;

    const preventPageScroll = (event) => {
      event.preventDefault();
    };

    window.addEventListener("wheel", preventPageScroll, { passive: false });
    window.addEventListener("touchmove", preventPageScroll, { passive: false });

    return () => {
      window.removeEventListener("wheel", preventPageScroll);
      window.removeEventListener("touchmove", preventPageScroll);
    };
  }, [menuOpen]);

  const go = (nextPage) => {
    setMenuOpen(false);
    onNavigate(nextPage);
  };

  const handleBottomAction = (item) => {
    if (item.loginAction) {
      onLogin();
      return;
    }
    go(item.key);
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

      <nav className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 lg:hidden">
        <div className="relative mx-auto grid h-[76px] max-w-md grid-cols-5 items-center gap-1 rounded-[1.75rem] border border-[#35201f] bg-[#070f0d]/95 px-2 shadow-[0_-12px_40px_rgba(0,0,0,0.45),0_18px_60px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {bottomItems.map((item, index) => {
            const Icon = item.icon;
            const active = page === item.key || (item.key === "my-bookings" && page === "my-bookings");
            const columnClass = index >= 2 ? `col-start-${index + 2}` : "";
            return (
              <button
                className={`relative flex h-[60px] flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-black transition duration-200 ${columnClass} ${
                  active
                    ? "border border-[#f9c66d]/45 bg-[#151b15] text-[#f9c66d] shadow-[0_0_20px_rgba(249,198,109,0.22),inset_0_0_18px_rgba(249,198,109,0.08)]"
                    : "text-[#9db2ad] hover:bg-[#101a18] hover:text-white"
                }`}
                disabled={item.loginAction && loginLoading}
                key={item.key}
                onClick={() => handleBottomAction(item)}
                type="button"
              >
                {item.loginAction && loginLoading ? (
                  <ButtonSpinner />
                ) : (
                  <Icon size={20} />
                )}
                <span>{item.loginAction && loginLoading ? "Wait" : item.label}</span>
              </button>
            );
          })}
          <button
            aria-label="Open more menu"
            className={`absolute left-1/2 top-0 grid h-[66px] w-[66px] -translate-x-1/2 -translate-y-7 place-items-center rounded-full border transition duration-200 ${
              menuOpen
                ? "border-[#f9c66d]/55 bg-[#151b15] text-[#f9c66d] shadow-[0_0_26px_rgba(249,198,109,0.34),0_16px_34px_rgba(0,0,0,0.45),inset_0_0_18px_rgba(249,198,109,0.1)]"
                : "border-[#35201f] bg-[#101a18] text-[#f9c66d] shadow-[0_14px_30px_rgba(0,0,0,0.42)]"
            }`}
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            <span className="relative grid h-full w-full place-items-center">
              <ChevronsUp
                className={`transition-transform duration-200 ${
                  menuOpen ? "rotate-180" : ""
                }`}
                size={28}
              />
            </span>
          </button>
          <span
            className={`pointer-events-none absolute left-1/2 top-[42px] -translate-x-1/2 text-[10px] font-black ${
              menuOpen ? "text-[#f9c66d]" : "text-[#9db2ad]"
            }`}
          >
            More
          </span>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-[80] lg:hidden ${
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          aria-label="Close menu"
          className={`absolute inset-0 z-0 bg-black/55 transition-opacity duration-300 ease-out ${
            menuOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMenuOpen(false)}
          style={{
            backdropFilter: "blur(18px) saturate(105%)",
            WebkitBackdropFilter: "blur(18px) saturate(105%)"
          }}
          type="button"
        />
        <aside
          className={`absolute inset-x-0 bottom-0 z-10 mx-auto flex max-h-[82dvh] w-full max-w-md origin-bottom flex-col overflow-y-auto rounded-t-[2rem] border border-b-0 border-[#35201f] bg-[#101a18]/98 p-4 pb-[calc(max(env(safe-area-inset-bottom),0.5rem)+0.75rem)] shadow-[0_-24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            menuOpen ? "translate-y-0 scale-100 opacity-100" : "translate-y-full scale-95 opacity-0"
          }`}
        >
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[#f9c66d]/35" />
          <div className="mb-5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#991b1b] text-white">
                <Scissors size={22} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#991b1b]">
                  Santosh
                </p>
                <p className="font-black text-white">Salon Queue</p>
              </div>
            </div>
            <button
              className="grid h-10 w-10 place-items-center rounded-full bg-[#0b1714]"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <X size={20} />
            </button>
          </div>
          <div className="grid gap-2">
            {canInstall ? (
              <button
                className="mb-2 flex min-h-12 items-center justify-center gap-3 rounded-2xl border border-[#f9c66d]/35 bg-[#24170d] px-4 font-black text-[#f9c66d] transition hover:bg-[#33200f]"
                onClick={() => {
                  setMenuOpen(false);
                  install();
                }}
                type="button"
              >
                <Download size={18} />
                Install App
              </button>
            ) : null}
            {morePages.map((item, index) => {
              const Icon = item.icon;
              return (
              <button
                className={`flex min-h-12 items-center gap-3 rounded-2xl border px-4 text-left text-base font-bold transition-all duration-300 ${
                  page === item.key
                    ? "border-[#f9c66d]/35 bg-[#24170d] text-[#f9c66d]"
                    : "border-[#22332f] bg-[#0b1714] text-[#9db2ad] hover:border-[#f9c66d]/25 hover:bg-[#13211d] hover:text-white"
                } ${menuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}
                key={item.key}
                onClick={() => go(item.key)}
                style={{ transitionDelay: menuOpen ? `${index * 32}ms` : "0ms" }}
                type="button"
              >
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    page === item.key
                      ? "bg-[#f9c66d] text-[#140707]"
                      : "bg-[#101f1b] text-[#f9c66d]"
                  }`}
                >
                  <Icon size={18} />
                </span>
                {item.label}
              </button>
            );
            })}
            <button
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full border border-[#f9c66d]/20 bg-[#991b1b] font-black text-white shadow-lg shadow-[#991b1b]/20 transition hover:bg-[#7f1d1d]"
              disabled={loginLoading}
              onClick={user ? () => go("profile") : onLogin}
              type="button"
            >
              {user ? (
                <UserAvatar size="h-8 w-8" user={user} />
              ) : loginLoading ? (
                <ButtonSpinner />
              ) : (
                <LogIn size={18} />
              )}
              {user ? "Profile" : loginLoading ? "Logging in..." : "Login"}
            </button>
          </div>
        </aside>
      </div>
    </>
  );
}
