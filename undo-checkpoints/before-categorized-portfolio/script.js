const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
const bookingForm = document.querySelector("[data-booking-form]");
const motionPanels = document.querySelectorAll("[data-motion]");
const bloomWatermarks = document.querySelector("[data-bloom-watermarks]");
const bloomFrames = document.querySelectorAll(".bloom-frame");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let bloomScrubProgress = 0;
let lastBloomScrollY = window.scrollY;
let lastWheelScrubAt = 0;
let lastTouchY = null;

const wrapProgress = (value) => ((value % 2) + 2) % 2;
const getBloomVisualProgress = () => (bloomScrubProgress <= 1 ? bloomScrubProgress : 2 - bloomScrubProgress);

const advanceBloomScrub = (delta) => {
  const scrollPixelsPerLoop = 1800;
  bloomScrubProgress = wrapProgress(bloomScrubProgress + delta / scrollPixelsPerLoop);
  const visualProgress = getBloomVisualProgress();
  bloomWatermarks.style.setProperty("--bloom", visualProgress.toFixed(4));
  bloomWatermarks.style.setProperty("--unbloom", (1 - visualProgress).toFixed(4));
  scrubBloomFrames();
};

const parseRgb = (color) => {
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([.\d]+))?\)/);
  if (!match) {
    return null;
  }

  return {
    r: Number(match[1]),
    g: Number(match[2]),
    b: Number(match[3]),
    a: match[4] === undefined ? 1 : Number(match[4]),
  };
};

const surfaceIsLight = (element) => {
  let current = element;

  while (current && current !== document.documentElement) {
    if (current.classList?.contains("section-dark")) {
      return false;
    }

    const color = parseRgb(getComputedStyle(current).backgroundColor);
    if (color && color.a > 0.2) {
      const luminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
      return luminance > 0.68;
    }

    current = current.parentElement;
  }

  return false;
};

const updateBloomSurfaceTone = () => {
  if (!bloomWatermarks) {
    return;
  }

  const sampleX = Math.round(window.innerWidth * 0.78);
  const sampleY = Math.round(window.innerHeight * 0.78);
  const target = document.elementFromPoint(sampleX, sampleY);
  bloomWatermarks.classList.toggle("on-light-surface", surfaceIsLight(target));
};

const frameSrc = (path, index) => `${path}${String(index).padStart(3, "0")}.webp`;

const scrubBloomFrames = () => {
  const visualProgress = getBloomVisualProgress();

  bloomFrames.forEach((frame) => {
    const count = Number(frame.dataset.frameCount || 1);
    const path = frame.dataset.framePath;
    if (!path || count < 2) {
      return;
    }

    const index = Math.min(count, Math.max(1, Math.round(visualProgress * (count - 1)) + 1));
    if (frame.dataset.currentFrame !== String(index)) {
      frame.src = frameSrc(path, index);
      frame.dataset.currentFrame = String(index);
    }
  });
};

scrubBloomFrames();

const setHeaderState = () => {
  header.classList.toggle("scrolled", window.scrollY > 24);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

if (motionPanels.length && !reduceMotion) {
  let ticking = false;

  const updateMotionPanels = () => {
    const viewportHeight = window.innerHeight || 1;

    motionPanels.forEach((panel) => {
      const rect = panel.getBoundingClientRect();
      const rawProgress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
      const progress = Math.min(Math.max(rawProgress, 0), 1);
      const centerDistance = Math.abs(rect.top + rect.height / 2 - viewportHeight / 2);
      const visible = 1 - Math.min(centerDistance / (viewportHeight * 0.78), 1);

      panel.style.setProperty("--motion-progress", progress.toFixed(4));
      panel.style.setProperty("--motion-visible", Math.max(visible, 0).toFixed(4));
      panel.classList.toggle("in-view", rect.bottom > 0 && rect.top < viewportHeight);
    });

    ticking = false;
  };

  const requestMotionUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateMotionPanels);
      ticking = true;
    }
  };

  updateMotionPanels();
  window.addEventListener("scroll", requestMotionUpdate, { passive: true });
  window.addEventListener("resize", requestMotionUpdate);
}

if (bloomWatermarks && !reduceMotion) {
  let ticking = false;

  const applyBloom = () => {
    const currentScrollY = window.scrollY;
    const scrollDelta = currentScrollY - lastBloomScrollY;
    lastBloomScrollY = currentScrollY;

    updateBloomSurfaceTone();
    bloomWatermarks.style.setProperty("--bloom-drift", `${(currentScrollY * 0.08).toFixed(2)}px`);
    if (Math.abs(scrollDelta) > 0 && Date.now() - lastWheelScrubAt > 120) {
      advanceBloomScrub(scrollDelta);
    } else {
      scrubBloomFrames();
    }
    ticking = false;
  };

  const requestBloomUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(applyBloom);
      ticking = true;
    }
  };

  applyBloom();
  window.addEventListener(
    "wheel",
    (event) => {
      lastWheelScrubAt = Date.now();
      lastBloomScrollY = window.scrollY;
      updateBloomSurfaceTone();
      advanceBloomScrub(event.deltaY);
      bloomWatermarks.style.setProperty("--bloom-drift", `${(window.scrollY * 0.08).toFixed(2)}px`);
    },
    { passive: true },
  );
  window.addEventListener(
    "touchstart",
    (event) => {
      lastTouchY = event.touches[0]?.clientY ?? null;
    },
    { passive: true },
  );
  window.addEventListener(
    "touchmove",
    (event) => {
      const currentTouchY = event.touches[0]?.clientY;
      if (currentTouchY === undefined || lastTouchY === null) {
        return;
      }

      lastWheelScrubAt = Date.now();
      lastBloomScrollY = window.scrollY;
      updateBloomSurfaceTone();
      advanceBloomScrub(lastTouchY - currentTouchY);
      lastTouchY = currentTouchY;
    },
    { passive: true },
  );
  window.addEventListener("scroll", requestBloomUpdate, { passive: true });
  window.addEventListener("resize", () => {
    updateBloomSurfaceTone();
    requestBloomUpdate();
  });
}

menuToggle.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("open");
  document.body.classList.toggle("nav-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

nav.addEventListener("click", (event) => {
  if (event.target.matches("a")) {
    nav.classList.remove("open");
    document.body.classList.remove("nav-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }
});

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const target = tab.dataset.tab;

    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle("active", active);
      item.setAttribute("aria-selected", String(active));
    });

    panels.forEach((panel) => {
      const active = panel.dataset.panel === target;
      panel.classList.toggle("active", active);
      panel.hidden = !active;
    });
  });
});

bookingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(bookingForm);
  const name = formData.get("name");
  const date = formData.get("date");
  const service = formData.get("service");
  const details = formData.get("details");
  const message = [
    `Hi Mafe, my name is ${name}.`,
    `I would like to book: ${service}.`,
    `Preferred date: ${date}.`,
    `Details: ${details}`,
  ].join("\n");

  window.open(`https://wa.me/18482569222?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
});
