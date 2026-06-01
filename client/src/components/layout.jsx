import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn, Menu, Scissors, X } from "lucide-react";
import { ButtonSpinner, UserAvatar } from "./common.jsx";
import { drawerVariants, navigationVariants } from "../lib/animationVariants";

const pages = ["home", "booking", "about", "contact"];

const titleCase = (value) =>
  value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

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
    <motion.div
      className="h-1 w-full bg-gradient-to-r from-[#06100e] via-[#101a18] to-[#06100e]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-[#f9c66d] via-[#fca5a5] to-[#f9c66d] rounded-r-full"
        style={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
    </motion.div>
  );
}

export function ScrollPercentBadge({ visible, value }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed bottom-5 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-[#f9c66d]/40 bg-gradient-to-br from-[#101a18] to-[#0b1714] text-sm font-black text-[#f9c66d] shadow-xl shadow-[#f9c66d]/20 ring-1 ring-[#f9c66d]/20 sm:bottom-6 sm:right-6"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {Math.round(value)}%
        </motion.div>
      )}
    </AnimatePresence>
  );
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
  const navPages = user ? [...pages, "profile"] : pages;

  useEffect(() => {
    if (!menuOpen) {
      document.body.classList.remove("drawer-open");
      document.body.style.removeProperty("--scrollbar-width");
      return undefined;
    }

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.setProperty("--scrollbar-width", `${scrollbarWidth}px`);
    document.body.classList.add("drawer-open");

    return () => {
      document.body.classList.remove("drawer-open");
      document.body.style.removeProperty("--scrollbar-width");
    };
  }, [menuOpen]);

  const go = (nextPage) => {
    setMenuOpen(false);
    onNavigate(nextPage);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#35201f] bg-gradient-to-b from-[#06100e]/95 to-[#06100e]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-18 sm:px-6 lg:px-8">
          {/* Logo */}
          <motion.button
            className="flex items-center gap-2 text-left transition-colors duration-300 hover:opacity-80"
            onClick={() => go("home")}
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.span
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#991b1b] to-[#7f1d1d] text-white shadow-lg shadow-[#991b1b]/30"
              whileHover={{ boxShadow: "0 12px 32px rgba(153, 27, 27, 0.4)" }}
            >
              <Scissors size={22} strokeWidth={2.5} />
            </motion.span>
            <span className="hidden sm:block">
              <p className="text-xs font-black uppercase tracking-widest text-[#f9c66d]">
                Santosh
              </p>
              <p className="text-sm font-black leading-tight text-white">
                Salon Queue
              </p>
            </span>
          </motion.button>

          {/* Desktop Navigation */}
          <motion.nav
            className="hidden items-center gap-1 rounded-full border border-[#35201f] bg-[#101a18]/50 p-1.5 backdrop-blur lg:flex"
            initial="hidden"
            animate="visible"
            variants={navigationVariants}
          >
            {navPages.map((item, index) => (
              <motion.button
                className={`min-h-10 rounded-full px-5 text-sm font-bold transition-all duration-200 ${
                  page === item
                    ? "bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] text-white shadow-lg shadow-[#991b1b]/20"
                    : "text-[#9db2ad] hover:text-white hover:bg-[#2a1111]/50"
                }`}
                key={item}
                onClick={() => go(item)}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                {titleCase(item)}
              </motion.button>
            ))}
          </motion.nav>

          {/* Desktop Auth Section */}
          <motion.div
            className="hidden items-center gap-3 lg:flex"
            initial="hidden"
            animate="visible"
            variants={navigationVariants}
          >
            {authLoading ? (
              <div className="skeleton h-11 w-11 rounded-full" />
            ) : user ? (
              <motion.button
                aria-label="Open profile"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-[#35201f] bg-[#101a18]/50 p-1 font-black text-white transition-all duration-200 hover:bg-[#2a1111] hover:border-[#f9c66d]/30"
                onClick={() => go("profile")}
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <UserAvatar size="h-9 w-9" user={user} />
              </motion.button>
            ) : (
              <motion.button
                className="flex h-11 items-center gap-2 rounded-full border border-[#f9c66d]/30 bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] px-5 text-sm font-bold text-white shadow-lg shadow-[#991b1b]/20 transition-all duration-200 hover:border-[#f9c66d]/50 hover:shadow-lg hover:shadow-[#991b1b]/40 disabled:opacity-70"
                disabled={loginLoading}
                onClick={onLogin}
                type="button"
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                {loginLoading ? <ButtonSpinner /> : <LogIn size={18} />}
                {loginLoading ? "Logging in..." : "Login"}
              </motion.button>
            )}
          </motion.div>

          {/* Mobile Menu Button */}
          <motion.button
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#35201f] bg-[#101a18]/50 text-white transition-all duration-200 hover:bg-[#2a1111] lg:hidden"
            onClick={() => setMenuOpen((value) => !value)}
            type="button"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Toggle menu"
          >
            <AnimatePresence mode="wait">
              {menuOpen ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <X size={20} />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Menu size={20} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Progress Bar */}
        <TopProgress
          routeProgress={routeProgress}
          routeProgressActive={routeProgressActive}
          scrollProgress={scrollProgress}
        />
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              className="fixed inset-0 z-40 lg:hidden"
              onClick={() => setMenuOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                backdropFilter: "blur(12px) saturate(105%)",
                WebkitBackdropFilter: "blur(12px) saturate(105%)",
                backgroundColor: "rgba(0, 0, 0, 0.5)"
              }}
            />

            {/* Drawer */}
            <motion.aside
              key="drawer"
              className="fixed left-0 top-0 z-50 flex h-dvh w-[86vw] max-w-[320px] flex-col border-r border-[#35201f] bg-gradient-to-b from-[#101a18] to-[#0b1714] shadow-2xl shadow-black/50 lg:hidden"
              variants={drawerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              {/* Drawer Header */}
              <motion.div
                className="mb-6 flex items-center justify-between border-b border-[#35201f] gap-3 p-4"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#991b1b] to-[#7f1d1d] text-white shadow-lg">
                    <Scissors size={24} strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-[#f9c66d]">
                      Santosh
                    </p>
                    <p className="font-black text-white">Salon Queue</p>
                  </div>
                </div>
              </motion.div>

              {/* Drawer Navigation */}
              <motion.div
                className="flex-1 space-y-2 px-3"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      staggerChildren: 0.06,
                      delayChildren: 0.15
                    }
                  }
                }}
                initial="hidden"
                animate="visible"
              >
                {navPages.map((item) => (
                  <motion.button
                    className={`w-full min-h-12 rounded-2xl px-4 text-left text-base font-bold transition-all duration-200 ${
                      page === item
                        ? "bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] text-white shadow-lg shadow-[#991b1b]/20"
                        : "bg-[#0b1714] text-[#9db2ad] hover:bg-[#1f1113] hover:text-white"
                    }`}
                    key={item}
                    onClick={() => go(item)}
                    type="button"
                    variants={{
                      hidden: { opacity: 0, x: -20 },
                      visible: { opacity: 1, x: 0 }
                    }}
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {titleCase(item)}
                  </motion.button>
                ))}
              </motion.div>

              {/* Drawer Auth Section */}
              <motion.div
                className="border-t border-[#35201f] p-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.3 }}
              >
                {authLoading ? (
                  <div className="skeleton h-12 rounded-full" />
                ) : (
                  <motion.button
                    className="w-full flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#991b1b] to-[#7f1d1d] font-black text-white shadow-lg shadow-[#991b1b]/20 transition-all duration-200 hover:shadow-lg hover:shadow-[#991b1b]/40"
                    disabled={loginLoading}
                    onClick={user ? () => go("profile") : onLogin}
                    type="button"
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {user ? (
                      <>
                        <UserAvatar size="h-8 w-8" user={user} />
                        <span>Profile</span>
                      </>
                    ) : loginLoading ? (
                      <>
                        <ButtonSpinner />
                        <span>Logging in...</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={18} />
                        <span>Login</span>
                      </>
                    )}
                  </motion.button>
                )}
              </motion.div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
