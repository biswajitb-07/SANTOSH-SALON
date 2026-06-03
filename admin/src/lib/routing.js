export const adminNavItems = [
  "dashboard",
  "queue",
  "barbers",
  "services",
  "refunds",
  "messages",
  "users",
  "public-link",
  "plans",
  "settings"
];

const adminPagePathMap = {
  dashboard: "/",
  queue: "/queue",
  barbers: "/barbers",
  services: "/services",
  refunds: "/refunds",
  messages: "/messages",
  users: "/users",
  "public-link": "/public-link",
  plans: "/plans",
  settings: "/settings"
};

const adminPathPageMap = Object.entries(adminPagePathMap).reduce(
  (pages, [page, path]) => ({
    ...pages,
    [path]: page
  }),
  {}
);

const normalizePath = (pathname = "/") =>
  (pathname.replace(/\/+$/, "") || "/").toLowerCase();

export const getAdminPagePath = (page = "dashboard") =>
  adminPagePathMap[adminNavItems.includes(page) ? page : "dashboard"] || "/";

export function getAdminRoute() {
  if (typeof window === "undefined") return "dashboard";

  const params = new URLSearchParams(window.location.search);
  const queryPage = params.get("page");
  if (adminNavItems.includes(queryPage)) return queryPage;

  const page = adminPathPageMap[normalizePath(window.location.pathname)];
  return adminNavItems.includes(page) ? page : "dashboard";
}

export function writeAdminRoute(page, replace = false) {
  if (typeof window === "undefined") return;

  const safePage = adminNavItems.includes(page) ? page : "dashboard";
  const url = new URL(window.location.href);
  url.pathname = getAdminPagePath(safePage);
  url.searchParams.delete("page");
  const method = replace ? "replaceState" : "pushState";
  window.history[method]({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export function formatAdminPageTitle(page) {
  return (
    {
      dashboard: "Dashboard",
      queue: "Queue",
      barbers: "Barbers",
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
