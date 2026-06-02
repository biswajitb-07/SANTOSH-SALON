import React from "react";
import { AdminShell } from "./components/AdminShell.jsx";
import { AdminAccessBlockedScreen, AdminLoadingScreen, AdminLoginScreen } from "./pages/authScreens.jsx";
import { useAdminController } from "./hooks/useAdminController.jsx";

export function App() {
  const {
    actionLoading,
    authError,
    authLoading,
    emailAllowed,
    handleGoogleLogin,
    handleLogout,
    shellProps,
    user
  } = useAdminController();

  if (authLoading) return <AdminLoadingScreen />;

  if (!user) {
    return (
      <AdminLoginScreen
        actionLoading={actionLoading}
        authError={authError}
        onGoogleLogin={handleGoogleLogin}
      />
    );
  }

  if (!emailAllowed) {
    return (
      <AdminAccessBlockedScreen
        actionLoading={actionLoading}
        onLogout={handleLogout}
        user={user}
      />
    );
  }

  return <AdminShell {...shellProps} />;
}
