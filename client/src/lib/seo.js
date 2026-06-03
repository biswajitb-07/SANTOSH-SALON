import { getClientPagePath, titleCase } from "./routing.js";

const pageDescriptions = {
  home: "Santosh Salon Queue helps customers book grooming services, track live queue tokens, and contact the salon team.",
  booking:
    "Choose a salon service, pick an available time slot, pay online with Cashfree, and track your queue token.",
  about:
    "Learn about Santosh Salon, opening hours, queue process, and local grooming service experience.",
  contact:
    "Contact Santosh Salon for booking help, payment support, refund questions, and salon service issues.",
  profile:
    "View your Santosh Salon profile, active queue bookings, invoices, cancellations, and refund status.",
  "my-bookings":
    "Track your Santosh Salon bookings, token status, payment IDs, invoices, and refund updates.",
  "privacy-policy":
    "Read Santosh Salon Queue privacy policy for Google login, booking, payment, and contact data usage.",
  "terms-and-conditions":
    "Read Santosh Salon Queue terms and conditions for booking, payment, queue, and service usage.",
  "cancellation-refund-policy":
    "Read Santosh Salon Queue cancellation and refund policy for online paid bookings.",
  "payment-policy":
    "Read Santosh Salon Queue payment policy for Cashfree online payments and salon booking charges."
};

const setMeta = (selector, attribute, value) => {
  const element = document.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
};

export function applyClientSeo(page) {
  if (typeof document === "undefined") return;

  const pageTitle = titleCase(page);
  const title =
    page === "home"
      ? "Santosh Salon Queue | Book Haircut Tokens Online"
      : `${pageTitle} | Santosh Salon Queue`;
  const description =
    pageDescriptions[page] ||
    "Book salon grooming services, track live queue tokens, and manage haircut booking details with Santosh Salon Queue.";
  const canonical = `https://santosh-salon.web.app${getClientPagePath(page || "home")}`;

  document.title = title;
  setMeta("meta[name='description']", "content", description);
  setMeta("meta[property='og:title']", "content", title);
  setMeta("meta[property='og:description']", "content", description);
  setMeta("meta[property='og:url']", "content", canonical);
  setMeta("meta[name='twitter:title']", "content", title);
  setMeta("meta[name='twitter:description']", "content", description);
  setMeta("link[rel='canonical']", "href", canonical);
}
