import { useEffect } from "react";

export function useRevealOnScroll(dependency) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const targets = Array.from(
      document.querySelectorAll("main section, main article, [data-reveal]")
    ).filter((element) => !element.closest("[data-no-reveal]"));

    targets.forEach((element) => element.classList.add("reveal-up"));

    if (!("IntersectionObserver" in window)) {
      targets.forEach((element) => element.classList.add("visible"));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 }
    );

    targets.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [dependency]);
}
