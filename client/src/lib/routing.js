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

const pagePathMap = {
  home: "/",
  booking: "/services",
  barbers: "/barbers",
  about: "/about",
  contact: "/contact",
  pricing: "/pricing",
  gallery: "/gallery",
  staff: "/staff",
  faq: "/faq",
  profile: "/profile",
  "my-bookings": "/my-bookings",
  "privacy-policy": "/privacy-policy",
  "terms-and-conditions": "/terms-and-conditions",
  "cancellation-refund-policy": "/cancellation-refund-policy",
  "payment-policy": "/payment-policy",
  "haircut-service": "/services/haircut",
  "beard-styling-service": "/services/beard-styling",
  "facial-grooming-service": "/services/facial-grooming",
  "hair-wash-service": "/services/hair-wash"
};

const pathPageMap = Object.entries(pagePathMap).reduce(
  (pages, [page, path]) => ({
    ...pages,
    [path]: page
  }),
  {
    "/booking": "booking",
    "/services/classic-haircut": "haircut-service",
    "/services/beard": "beard-styling-service",
    "/services/facial": "facial-grooming-service",
    "/services/hairwash": "hair-wash-service"
  }
);

const normalizePath = (pathname = "/") => {
  const path = pathname.replace(/\/+$/, "") || "/";
  return path.toLowerCase();
};

export const getClientPagePath = (page = "home") =>
  pagePathMap[routedPages.includes(page) ? page : "home"] || "/";

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
  const queryPage = params.get("page");
  if (routedPages.includes(queryPage)) {
    return { page: queryPage };
  }

  const pathname = normalizePath(window.location.pathname);
  if (pathname.startsWith("/q/")) {
    return { page: "booking" };
  }
  if (pathname === "/payment/status") {
    return { page: "my-bookings" };
  }
  const page = pathPageMap[pathname];

  return {
    page: routedPages.includes(page) ? page : "home"
  };
}

export function writeClientRoute({ page }, replace = false) {
  if (typeof window === "undefined") return;

  const safePage = routedPages.includes(page) ? page : "home";
  const url = new URL(window.location.href);
  url.pathname = getClientPagePath(safePage);
  url.searchParams.delete("page");
  url.searchParams.delete("tab");

  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
}
