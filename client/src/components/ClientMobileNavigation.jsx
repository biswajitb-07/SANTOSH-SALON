import { useEffect, useState } from "react";
import {
  ChevronsUp,
  CircleHelp,
  ClipboardList,
  Download,
  GalleryHorizontalEnd,
  Home,
  LogIn,
  Mail,
  ReceiptText,
  Scissors,
  ShoppingBag,
  Sparkles,
  UserRound,
  X
} from "lucide-react";
import { ButtonSpinner, UserAvatar } from "./common.jsx";

export function ClientMobileNavigation({
  canInstall,
  install,
  loginLoading,
  onLogin,
  onNavigate,
  page,
  user
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const bottomItems = [
    { key: "home", label: "Home", icon: Home },
    { key: "booking", label: "Services", icon: ShoppingBag },
    { key: "barbers", label: "Barbers", icon: Scissors },
    {
      key: user ? "my-bookings" : "profile",
      label: user ? "Bookings" : "Login",
      icon: user ? ClipboardList : LogIn,
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
  const moreActive = menuOpen || morePages.some((item) => item.key === page);

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
      <nav className="fixed inset-x-0 bottom-0 z-[70] px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] pt-3 lg:hidden">
        <div className="client-mobile-nav">
          {bottomItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active =
              page === item.key || (item.key === "my-bookings" && page === "my-bookings");
            return (
              <button
                className={`client-mobile-nav-item ${
                  active ? "client-mobile-nav-item-active" : ""
                }`}
                disabled={item.loginAction && loginLoading}
                key={item.key}
                onClick={() => handleBottomAction(item)}
                type="button"
              >
                {item.loginAction && loginLoading ? <ButtonSpinner /> : <Icon size={20} />}
                <span>{item.loginAction && loginLoading ? "Wait" : item.label}</span>
              </button>
            );
          })}

          <button
            aria-label="Open more menu"
            aria-expanded={menuOpen}
            className={`client-mobile-nav-more ${
              moreActive ? "client-mobile-nav-more-active" : ""
            }`}
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
          >
            <ChevronsUp
              className={`transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
              size={22}
            />
            <span>More</span>
          </button>

          {bottomItems.slice(2).map((item) => {
            const Icon = item.icon;
            const active =
              page === item.key || (item.key === "my-bookings" && page === "my-bookings");
            return (
              <button
                className={`client-mobile-nav-item ${
                  active ? "client-mobile-nav-item-active" : ""
                }`}
                disabled={item.loginAction && loginLoading}
                key={item.key}
                onClick={() => handleBottomAction(item)}
                type="button"
              >
                {item.loginAction && loginLoading ? <ButtonSpinner /> : <Icon size={20} />}
                <span>{item.loginAction && loginLoading ? "Wait" : item.label}</span>
              </button>
            );
          })}
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
            menuOpen
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-full scale-95 opacity-0"
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
