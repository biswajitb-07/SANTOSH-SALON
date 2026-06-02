import React from "react";
import { ChevronsUp, LogOut, Scissors, X } from "lucide-react";
import { ButtonSpinner } from "./common.jsx";

const primaryMobileNavKeys = ["dashboard", "queue", "barbers", "services"];

export function AdminMobileNavigation({
  actionLoading,
  activePage,
  handleLogout,
  navigateAdminPage,
  navItems,
  openMessageCount
}) {
  const [adminMoreOpen, setAdminMoreOpen] = React.useState(false);
  const primaryMobileNavItems = primaryMobileNavKeys
    .map((key) => navItems.find((item) => item.key === key))
    .filter(Boolean);
  const moreMobileNavItems = navItems.filter(
    (item) => !primaryMobileNavKeys.includes(item.key)
  );
  const isMorePageActive = moreMobileNavItems.some((item) => item.key === activePage);

  React.useEffect(() => {
    setAdminMoreOpen(false);
  }, [activePage]);

  const go = (key) => {
    setAdminMoreOpen(false);
    navigateAdminPage(key);
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[calc(env(safe-area-inset-bottom)+0.65rem)] lg:hidden">
        <nav className="admin-mobile-nav">
          {primaryMobileNavItems.slice(0, 2).map(({ icon: Icon, label, key }) => (
            <button
              aria-current={activePage === key ? "page" : undefined}
              className={`admin-mobile-nav-item ${
                activePage === key ? "admin-mobile-nav-item-active" : ""
              }`}
              key={key}
              onClick={() => go(key)}
              type="button"
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}

          <button
            aria-expanded={adminMoreOpen}
            className={`admin-mobile-nav-more ${
              adminMoreOpen || isMorePageActive ? "admin-mobile-nav-more-active" : ""
            }`}
            onClick={() => setAdminMoreOpen((value) => !value)}
            type="button"
          >
            <ChevronsUp size={22} />
            <span>More</span>
          </button>

          {primaryMobileNavItems.slice(2).map(({ icon: Icon, label, key }) => (
            <button
              aria-current={activePage === key ? "page" : undefined}
              className={`admin-mobile-nav-item ${
                activePage === key ? "admin-mobile-nav-item-active" : ""
              }`}
              key={key}
              onClick={() => go(key)}
              type="button"
            >
              <Icon size={20} />
              <span>{label === "Haircut Design" ? "Services" : label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div
        className={`fixed inset-0 z-[95] lg:hidden ${
          adminMoreOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <button
          aria-label="Close admin menu"
          className={`absolute inset-0 bg-[#020807]/50 backdrop-blur-sm transition-opacity duration-200 ${
            adminMoreOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setAdminMoreOpen(false)}
          type="button"
        />
        <section
          className={`admin-mobile-more-sheet ${
            adminMoreOpen ? "admin-mobile-more-sheet-open" : ""
          }`}
        >
          <div className="mx-auto mb-4 h-1.5 w-16 rounded-full bg-[#f9c66d]/45" />
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#991b1b] text-white">
                <Scissors size={22} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f9a8a8]">
                  Owner Panel
                </p>
                <p className="text-lg font-black">Santosh Salon</p>
              </div>
            </div>
            <button
              aria-label="Close menu"
              className="grid h-12 w-12 place-items-center rounded-2xl bg-[#07110f] text-white"
              onClick={() => setAdminMoreOpen(false)}
              type="button"
            >
              <X size={22} />
            </button>
          </div>

          <div className="mt-5 grid gap-2">
            {moreMobileNavItems.map(({ icon: Icon, label, key }) => (
              <button
                className={`admin-mobile-more-item ${
                  activePage === key ? "admin-mobile-more-item-active" : ""
                }`}
                key={key}
                onClick={() => go(key)}
                type="button"
              >
                <span className="admin-mobile-more-icon">
                  <Icon size={19} />
                </span>
                <span className="flex-1">{label}</span>
                {key === "messages" && openMessageCount ? (
                  <span className="rounded-full bg-[#f9c66d] px-2 py-0.5 text-xs font-black text-[#081311]">
                    {openMessageCount}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          <button
            className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#f9c66d]/25 bg-[#24170d] font-black text-[#f9c66d] disabled:opacity-60"
            disabled={actionLoading === "logout"}
            onClick={handleLogout}
            type="button"
          >
            {actionLoading === "logout" ? <ButtonSpinner /> : <LogOut size={18} />}
            {actionLoading === "logout" ? "Logging out..." : "Logout"}
          </button>
        </section>
      </div>
    </>
  );
}
