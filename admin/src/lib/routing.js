export const adminNavItems = [
  "dashboard",
  "queue",
  "services",
  "refunds",
  "messages",
  "users",
  "public-link",
  "plans",
  "settings"
];

export function getAdminRoute() {
  if (typeof window === "undefined") return "dashboard";

  const page = new URLSearchParams(window.location.search).get("page");
  return adminNavItems.includes(page) ? page : "dashboard";
}

export function writeAdminRoute(page, replace = false) {
  if (typeof window === "undefined") return;

  const safePage = adminNavItems.includes(page) ? page : "dashboard";
  const url = new URL(window.location.href);
  url.searchParams.set("page", safePage);
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function formatAdminPageTitle(page) {
  return (
    {
      dashboard: "Dashboard",
      queue: "Queue",
      services: "Haircut Design",
      refunds: "Refunds",
      messages: "Messages",
      users: "Users",
      "public-link": "Public Link",
      plans: "Plans",
      settings: "Settings"
    }[page] || "Dashboard"
  );
}
