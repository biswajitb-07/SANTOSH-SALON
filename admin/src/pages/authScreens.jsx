import { Toaster } from "sonner";
import { CheckCircle2, LogOut, Scissors, Sparkles, XCircle } from "lucide-react";
import { ButtonSpinner } from "../components/common.jsx";

const toastOptions = {
  style: {
    borderRadius: "18px",
    border: "1px solid #35201f",
    boxShadow: "0 18px 60px rgba(18, 57, 52, 0.16)"
  }
};

export function AdminLoadingScreen() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#06100e] px-4">
      <div className="soft-shadow rounded-3xl bg-white p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#f9c66d] text-[#991b1b]">
          <Scissors size={26} />
        </span>
        <p className="mt-4 font-black">Checking login...</p>
      </div>
    </main>
  );
}

export function AdminLoginScreen({
  actionLoading,
  authError,
  onGoogleLogin
}) {
  return (
    <main className="min-h-screen bg-[#06100e] px-4 py-6 sm:px-6 lg:grid lg:place-items-center lg:px-8">
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={toastOptions}
      />
      <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-[2rem] bg-white soft-shadow lg:min-h-[680px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="admin-hero relative flex min-h-[360px] overflow-hidden p-6 text-white sm:p-8 lg:min-h-full lg:flex-col lg:justify-between">
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#f9c66d] text-[#081311]">
              <Scissors size={23} />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f9c66d]">
                Salon SaaS
              </p>
              <h1 className="text-xl font-black">Santosh Salon Queue</h1>
            </div>
          </div>
          <div className="relative z-10 mt-auto max-w-2xl pt-20 lg:pt-0">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-bold text-[#f9c66d] ring-1 ring-white/20">
              <Sparkles size={16} />
              Google owner login
            </p>
            <h2 className="max-w-xl text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl">
              Run your salon queue from one clean dashboard.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/78 sm:text-lg">
              Secure Google sign-in, live tokens, queue controls, and premium
              analytics in one responsive admin panel.
            </p>
          </div>
        </section>

        <section className="flex items-center justify-center bg-white p-5 sm:p-8 lg:p-10">
          <div className="w-full max-w-md">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#081311] text-white">
                <Scissors size={22} />
              </span>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.16em] text-[#991b1b]">
                  Admin Login
                </p>
                <h1 className="text-2xl font-black">Santosh Salon</h1>
              </div>
            </div>

            <div className="mt-8 rounded-3xl bg-[#101a18] p-5">
              <h2 className="text-3xl font-black leading-tight">
                Continue with Google
              </h2>
              <p className="mt-3 leading-7 text-[#9db2ad]">
                Only Google login is enabled for owner dashboard access.
              </p>
            </div>

            {authError ? (
              <p className="mt-4 rounded-2xl bg-[#fee2e2] px-4 py-3 text-sm font-bold text-[#b91c1c]">
                {authError}
              </p>
            ) : null}

            <button
              className="mt-5 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#35201f] bg-white px-5 font-black text-[#f4fbf8] shadow-sm transition hover:border-[#991b1b] hover:bg-[#101a18] disabled:opacity-60"
              disabled={actionLoading === "login"}
              onClick={onGoogleLogin}
              type="button"
            >
              {actionLoading === "login" ? (
                <ButtonSpinner dark />
              ) : (
                <span className="grid h-7 w-7 place-items-center rounded-full bg-[#101a18] text-lg font-black text-[#991b1b]">
                  G
                </span>
              )}
              {actionLoading === "login" ? "Signing in..." : "Sign in with Google"}
            </button>

            <div className="mt-5 flex items-center gap-3 rounded-2xl bg-[#2a1111] p-4 text-sm font-bold text-[#fca5a5]">
              <CheckCircle2 size={18} />
              No password, mobile OTP, or email login option.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export function AdminAccessBlockedScreen({ actionLoading, onLogout, user }) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#06100e] px-4">
      <Toaster
        position="top-right"
        richColors
        closeButton
        toastOptions={toastOptions}
      />
      <section className="soft-shadow w-full max-w-md rounded-[2rem] bg-white p-6 text-center sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#fee2e2] text-[#b91c1c]">
          <XCircle size={26} />
        </span>
        <h1 className="mt-5 text-3xl font-black">Admin access blocked</h1>
        <p className="mt-3 leading-7 text-[#9db2ad]">
          This Google account is not allowed for the salon owner dashboard.
          Add the owner email in <strong>admin/.env</strong>.
        </p>
        <p className="mt-4 rounded-2xl bg-[#101a18] px-4 py-3 text-sm font-bold text-[#f4fbf8]">
          Signed in as: {user.email}
        </p>
        <button
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#081311] font-black text-white disabled:opacity-60"
          disabled={actionLoading === "logout"}
          onClick={onLogout}
          type="button"
        >
          {actionLoading === "logout" ? <ButtonSpinner /> : <LogOut size={18} />}
          {actionLoading === "logout" ? "Logging out..." : "Logout"}
        </button>
      </section>
    </main>
  );
}
