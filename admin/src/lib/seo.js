import { formatAdminPageTitle } from "./routing.js";

export function applyAdminSeo(page) {
  if (typeof document === "undefined") return;

  const pageTitle = formatAdminPageTitle(page);
  document.title = `${pageTitle} | Santosh Salon Admin`;

  const description = document.querySelector("meta[name='description']");
  if (description) {
    description.setAttribute(
      "content",
      `Santosh Salon owner dashboard for ${pageTitle.toLowerCase()}, queue management, services, refunds, and customer messages.`
    );
  }
}
