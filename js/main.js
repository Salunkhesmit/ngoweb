const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointer = window.matchMedia("(pointer: fine)");

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const pad = (value) => String(value).padStart(2, "0");

const scrollTasks = new Set();
let scrollFrame = 0;

function runScrollTasks() {
  scrollFrame = 0;
  for (const task of scrollTasks) task();
}

function scheduleScrollTasks() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(runScrollTasks);
}

let bodyPaddingApplied = false;

function syncBodyLock() {
  const shouldLock =
    document.body.classList.contains("nav-open") || Boolean(document.querySelector("dialog[open]"));
  const isLocked = document.body.classList.contains("is-locked");

  if (shouldLock && !isLocked) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      bodyPaddingApplied = true;
    }
    document.body.classList.add("is-locked");
  } else if (!shouldLock && isLocked) {
    document.body.classList.remove("is-locked");
    if (bodyPaddingApplied) {
      document.body.style.paddingRight = "";
      bodyPaddingApplied = false;
    }
  }
}

/* --------------------------------------------------------------------------
   Navigation
   -------------------------------------------------------------------------- */

function initNavigation() {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");

  if (header) {
    const updateHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
    };
    scrollTasks.add(updateHeader);
    updateHeader();
  }

  if (!toggle || !nav) return;

  let open = false;

  const focusable = () =>
    [toggle, ...nav.querySelectorAll("a, button")].filter(
      (element) => !element.hasAttribute("disabled") && element.getClientRects().length > 0
    );

  function setOpen(nextOpen, restoreFocus = true) {
    if (open === nextOpen) return;
    open = nextOpen;
    toggle.setAttribute("aria-expanded", String(open));
    const label = toggle.querySelector(".nav-toggle__label");
    if (label) label.textContent = open ? "Close" : "Menu";
    nav.classList.toggle("is-open", open);
    document.body.classList.toggle("nav-open", open);
    syncBodyLock();

    if (open) {
      requestAnimationFrame(() => nav.querySelector("a")?.focus());
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  toggle.addEventListener("click", () => setOpen(!open));

  nav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setOpen(false, false);
  });

  document.addEventListener("keydown", (event) => {
    if (!open) return;

    if (event.key === "Escape") {
      setOpen(false);
      return;
    }

    if (event.key !== "Tab") return;
    const items = focusable();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener(
    "resize",
    () => {
      if (window.innerWidth > 900 && open) setOpen(false, false);
    },
    { passive: true }
  );
}

/* --------------------------------------------------------------------------
   Scroll progress and the forest scene
   -------------------------------------------------------------------------- */

function initScrollProgress() {
  const bar = document.querySelector(".scroll-progress span");
  if (!bar) return;

  const update = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max, 0, 1) : 0})`;
  };

  scrollTasks.add(update);
  update();
}

function initForest() {
  const stage = document.querySelector("[data-stage]");
  const canvas = document.getElementById("forest-canvas");
  if (!stage || !canvas) return;

  // Load the WebGL scene separately so every other interaction still works if
  // the renderer or the vendor module cannot load.
  import("./forest-scene.js")
    .then(({ createForestScene }) => {
      const forest = createForestScene(canvas, stage);
      if (!forest) {
        stage.classList.add("no-webgl");
        return;
      }

      const update = () => {
        const distance = stage.offsetHeight - window.innerHeight;
        if (distance <= 0) return;
        const progress = clamp(-stage.getBoundingClientRect().top / distance, 0, 1);
        stage.classList.toggle("is-past-hero", progress > 0.34);
        forest.setProgress(progress);
      };

      scrollTasks.add(update);
      update();

      if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            forest.setActive(entries[0].isIntersecting);
          },
          { threshold: 0 }
        );
        observer.observe(stage);
      } else {
        forest.setActive(true);
      }
    })
    .catch(() => {
      stage.classList.add("no-webgl");
    });
}

/* --------------------------------------------------------------------------
   Scroll reveals
   -------------------------------------------------------------------------- */

function initReveals() {
  const items = [...document.querySelectorAll(".reveal")];
  if (!items.length) return;

  if (prefersReducedMotion.matches || !("IntersectionObserver" in window)) {
    items.forEach((item) => {
      item.classList.add("is-in");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const item = entry.target;
        item.classList.add("is-in");
        observer.unobserve(item);
        window.setTimeout(() => item.classList.remove("reveal--armed"), 1000);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.06 }
  );

  for (const item of items) {
    const rect = item.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92 && rect.bottom > 0) {
      item.classList.add("is-in");
    } else {
      item.classList.add("reveal--armed");
      observer.observe(item);
    }
  }
}

/* --------------------------------------------------------------------------
   Counters
   -------------------------------------------------------------------------- */

function initCounters() {
  const counters = [...document.querySelectorAll(".counter")];
  if (!counters.length) return;

  const animate = (element) => {
    const target = Number(element.dataset.count) || 0;

    if (prefersReducedMotion.matches) {
      element.textContent = pad(target);
      return;
    }

    const duration = 1500;
    const start = performance.now();

    const step = (now) => {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - elapsed) ** 3;
      element.textContent = pad(Math.round(target * eased));
      if (elapsed < 1) requestAnimationFrame(step);
    };

    element.textContent = "00";
    requestAnimationFrame(step);
  };

  if (!("IntersectionObserver" in window)) {
    counters.forEach(animate);
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.55 }
  );

  counters.forEach((counter) => {
    observer.observe(counter);
  });
}

/* --------------------------------------------------------------------------
   Horizontal projects
   -------------------------------------------------------------------------- */

function initProjects() {
  const section = document.querySelector("[data-projects]");
  const track = document.querySelector("[data-projects-track]");
  const viewport = document.querySelector("[data-projects-viewport]");
  const counter = document.querySelector("[data-projects-current]");
  if (!section || !track || !viewport) return;

  const panels = [...track.querySelectorAll(".project")];
  if (!panels.length) return;

  let pinned = false;
  let distance = 0;
  let progress = 0;
  let layoutFrame = 0;

  const currentIndex = () => Math.round(progress * (panels.length - 1)) + 1;

  function update() {
    if (pinned) {
      const scrollable = Math.max(0, section.offsetHeight - window.innerHeight);
      const top = section.getBoundingClientRect().top;
      progress = scrollable > 0 ? clamp(-top / scrollable, 0, 1) : 0;
      track.style.transform = `translate3d(${-progress * distance}px, 0, 0)`;
    } else {
      const max = viewport.scrollWidth - viewport.clientWidth;
      progress = max > 0 ? clamp(viewport.scrollLeft / max, 0, 1) : 0;
    }

    section.style.setProperty("--project-progress", progress.toFixed(4));
    if (counter) counter.textContent = pad(currentIndex());
  }

  function layout() {
    pinned = window.innerWidth > 900 && !prefersReducedMotion.matches;

    if (!pinned) {
      section.style.height = "";
      track.style.transform = "";
      distance = 0;
      update();
      return;
    }

    viewport.scrollLeft = 0;
    const viewportWidth = document.documentElement.clientWidth;
    distance = Math.max(0, track.scrollWidth - viewportWidth);
    section.style.height = `${window.innerHeight + distance}px`;
    update();
  }

  function scheduleLayout() {
    if (layoutFrame) return;
    layoutFrame = requestAnimationFrame(() => {
      layoutFrame = 0;
      layout();
    });
  }

  scrollTasks.add(update);
  viewport.addEventListener(
    "scroll",
    () => {
      if (!pinned) update();
    },
    { passive: true }
  );

  window.addEventListener("resize", scheduleLayout, { passive: true });
  prefersReducedMotion.addEventListener?.("change", scheduleLayout);

  if ("ResizeObserver" in window) {
    const observer = new ResizeObserver(scheduleLayout);
    observer.observe(track);
  }

  track.addEventListener("focusin", (event) => {
    if (!pinned) return;
    const panel = event.target.closest(".project");
    if (!panel) return;

    viewport.scrollLeft = 0;
    const rect = panel.getBoundingClientRect();
    if (rect.left >= 0 && rect.right <= document.documentElement.clientWidth) return;

    const panelOffset = rect.left - track.getBoundingClientRect().left;
    const panelProgress = distance > 0 ? clamp(panelOffset / distance, 0, 1) : 0;
    const top = section.offsetTop + panelProgress * Math.max(0, section.offsetHeight - window.innerHeight);

    window.scrollTo({
      top,
      behavior: prefersReducedMotion.matches ? "auto" : "smooth"
    });
  });

  layout();
}

/* --------------------------------------------------------------------------
   Pointer depth
   -------------------------------------------------------------------------- */

function initTilt() {
  if (!finePointer.matches || prefersReducedMotion.matches) return;

  let activeElement = null;
  let tiltFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  const reset = (element) => {
    element.style.removeProperty("--rx");
    element.style.removeProperty("--ry");
  };

  const apply = () => {
    tiltFrame = 0;
    if (!activeElement) return;

    const rect = activeElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const strength = Number(activeElement.dataset.tiltStrength) || 5;
    const x = (pointerX - rect.left) / rect.width - 0.5;
    const y = (pointerY - rect.top) / rect.height - 0.5;

    activeElement.style.setProperty("--rx", `${(-y * strength).toFixed(2)}deg`);
    activeElement.style.setProperty("--ry", `${(x * strength).toFixed(2)}deg`);
  };

  document.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      if (prefersReducedMotion.matches) {
        if (activeElement) reset(activeElement);
        activeElement = null;
        return;
      }
      const element = event.target.closest?.("[data-tilt]") || null;

      if (element !== activeElement) {
        if (activeElement) reset(activeElement);
        activeElement = element;
      }

      if (!activeElement) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!tiltFrame) tiltFrame = requestAnimationFrame(apply);
    },
    { passive: true }
  );

  document.addEventListener("pointerout", (event) => {
    const element = event.target.closest?.("[data-tilt]");
    if (!element) return;
    if (element.contains(event.relatedTarget)) return;
    reset(element);
    if (activeElement === element) activeElement = null;
  });
}

function initParallax() {
  const items = [...document.querySelectorAll("[data-parallax]")];
  if (!items.length || prefersReducedMotion.matches) return;

  const update = () => {
    if (prefersReducedMotion.matches) {
      for (const item of items) item.style.removeProperty("--parallax-y");
      return;
    }

    const viewportHeight = window.innerHeight;
    for (const item of items) {
      const rect = item.getBoundingClientRect();
      if (rect.bottom < -120 || rect.top > viewportHeight + 120) continue;

      const speed = Number(item.dataset.parallax) || 0.08;
      const offset = clamp(((rect.top + rect.height / 2 - viewportHeight / 2) * -speed), -70, 70);
      item.style.setProperty("--parallax-y", `${offset.toFixed(1)}px`);
    }
  };

  scrollTasks.add(update);
  update();
}

/* --------------------------------------------------------------------------
   Project stories
   -------------------------------------------------------------------------- */

function initStories() {
  const dialogs = [...document.querySelectorAll("[data-story]")];
  if (!dialogs.length) return;

  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-open-story]");
    if (opener) {
      const dialog = document.getElementById(opener.dataset.openStory);
      if (dialog && typeof dialog.showModal === "function") {
        dialog.showModal();
        syncBodyLock();
      }
      return;
    }

    const closer = event.target.closest("[data-close-story]");
    if (closer) {
      const dialog = closer.closest("dialog");
      if (dialog) dialog.close();
      syncBodyLock();
    }
  });

  for (const dialog of dialogs) {
    dialog.addEventListener("close", syncBodyLock);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  }
}

/* --------------------------------------------------------------------------
   Small finishing touches
   -------------------------------------------------------------------------- */

function initYear() {
  const year = new Date().getFullYear();
  document.querySelectorAll("[data-year]").forEach((element) => {
    element.textContent = String(year);
  });
}

function init() {
  initYear();
  initNavigation();
  initProjects();
  initForest();
  initScrollProgress();
  initReveals();
  initCounters();
  initTilt();
  initParallax();
  initStories();

  window.addEventListener("scroll", scheduleScrollTasks, { passive: true });
  window.addEventListener("resize", scheduleScrollTasks, { passive: true });
  scheduleScrollTasks();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}
