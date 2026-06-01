const firebaseAuthMessages = {
  "auth/user-disabled":
    "This account is blocked by the salon. Please contact the salon team.",
  "auth/popup-closed-by-user": "Login was cancelled.",
  "auth/cancelled-popup-request": "Login was cancelled.",
  "auth/network-request-failed": "Network issue. Please try again.",
  "auth/too-many-requests": "Too many attempts. Please try again later."
};

export const getSafeErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again."
) => {
  const code = error?.code || "";
  if (firebaseAuthMessages[code]) return firebaseAuthMessages[code];

  const message = String(error?.message || error || "");
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("firebase") || lowerMessage.includes("auth/")) {
    return fallback;
  }

  if (
    lowerMessage.includes("api key") ||
    lowerMessage.includes("token") ||
    lowerMessage.includes("permission") ||
    lowerMessage.includes("credential") ||
    lowerMessage.includes("stack")
  ) {
    return fallback;
  }

  return message || fallback;
};
