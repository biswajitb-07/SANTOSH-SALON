export const primaryPages = ["home", "booking", "barbers", "about", "contact"];

export const businessPages = ["pricing", "gallery", "staff", "faq"];

export const serviceSeoPages = [
  "haircut-service",
  "beard-styling-service",
  "facial-grooming-service",
  "hair-wash-service"
];

export const legalPages = [
  "privacy-policy",
  "terms-and-conditions",
  "cancellation-refund-policy",
  "payment-policy"
];

export const routedPages = [
  ...primaryPages,
  ...businessPages,
  ...serviceSeoPages,
  "profile",
  "my-bookings",
  ...legalPages
];

export function titleCase(value = "") {
  const labels = {
    about: "About Us",
    booking: "Services",
    contact: "Contact Us",
    barbers: "Barbers",
    refund: "Refund",
    profile: "Profile",
    "my-bookings": "My Bookings",
    "privacy-policy": "Privacy Policy",
    "terms-and-conditions": "Terms",
    "cancellation-refund-policy": "Refund Policy",
    "payment-policy": "Payment Policy",
    "haircut-service": "Haircut Service",
    "beard-styling-service": "Beard Styling",
    "facial-grooming-service": "Facial Grooming",
    "hair-wash-service": "Hair Wash"
  };

  return (
    labels[value] ||
    value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ")
  );
}

export function getClientRoute() {
  if (typeof window === "undefined") {
    return { page: "home" };
  }

  const params = new URLSearchParams(window.location.search);
  const page = params.get("page");

  return {
    page: routedPages.includes(page) ? page : "home"
  };
}

export function writeClientRoute({ page }, replace = false) {
  if (typeof window === "undefined") return;

  const safePage = routedPages.includes(page) ? page : "home";
  const url = new URL(window.location.href);
  url.searchParams.set("page", safePage);
  url.searchParams.delete("tab");

  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
}
