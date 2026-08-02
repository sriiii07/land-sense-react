/**
 * landing.js
 * Interactivity for the SAFEGROUND AI landing page: icon rendering,
 * a one-time scroll-reveal fade for each section, and the hero
 * "scroll down" cue. No looping/decorative animation — everything
 * here communicates something (you scrolled, this section arrived).
 */

document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) lucide.createIcons();

  // Scroll-reveal: fade + rise each `.reveal` element in once, the
  // first time it enters the viewport. Respects prefers-reduced-motion
  // via the CSS fallback (see style.css).
  const revealTargets = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealTargets.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    revealTargets.forEach((el) => observer.observe(el));
  } else {
    // No IntersectionObserver support — just show everything.
    revealTargets.forEach((el) => el.classList.add("is-visible"));
  }

  // Hero scroll cue scrolls to the next section.
  const scrollCue = document.getElementById("scrollCue");
  if (scrollCue) {
    scrollCue.addEventListener("click", () => {
      const next = document.querySelector(".stat-strip");
      if (next) next.scrollIntoView({ behavior: "smooth" });
    });
  }
});
