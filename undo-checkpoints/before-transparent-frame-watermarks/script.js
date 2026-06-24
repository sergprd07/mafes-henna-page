const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
const bookingForm = document.querySelector("[data-booking-form]");
const motionPanels = document.querySelectorAll("[data-motion]");
const bloomWatermarks = document.querySelector("[data-bloom-watermarks]");
const bloomVideos = document.querySelectorAll(".bloom-video");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let bloomScrubProgress = 0;
let lastBloomScrollY = window.scrollY;
let lastWheelScrubAt = 0;
let lastTouchY = null;

const wrapProgress = (value) => ((value % 1) + 1) % 1;

const advanceBloomScrub = (delta) => {
  const scrollPixelsPerLoop = 760;
  bloomScrubProgress = wrapProgress(bloomScrubProgress + delta / scrollPixelsPerLoop);
  bloomWatermarks.style.setProperty("--bloom", bloomScrubProgress.toFixed(4));
  bloomWatermarks.style.setProperty("--unbloom", (1 - bloomScrubProgress).toFixed(4));
  scrubBloomVideos();
};

const scrubBloomVideos = () => {
  bloomVideos.forEach((video) => {
    if (!video.duration) {
      return;
    }

    const targetTime = Math.min(video.duration - 0.03, bloomScrubProgress * video.duration);
    if (Math.abs(video.currentTime - targetTime) > 0.015) {
      video.currentTime = targetTime;
    }
  });
};

bloomVideos.forEach((video) => {
  video.pause();
  video.addEventListener(
    "loadedmetadata",
    () => {
      const unlockPlayback = video.play();
      if (unlockPlayback) {
        unlockPlayback
          .then(() => {
            video.pause();
            scrubBloomVideos();
          })
          .catch(() => {
            video.pause();
            scrubBloomVideos();
          });
      } else {
        video.pause();
        scrubBloomVideos();
      }
    },
    { once: true },
  );
});

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

    bloomWatermarks.style.setProperty("--bloom-drift", `${(currentScrollY * 0.08).toFixed(2)}px`);
    if (Math.abs(scrollDelta) > 0 && Date.now() - lastWheelScrubAt > 120) {
      advanceBloomScrub(scrollDelta);
    } else {
      scrubBloomVideos();
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
      advanceBloomScrub(lastTouchY - currentTouchY);
      lastTouchY = currentTouchY;
    },
    { passive: true },
  );
  window.addEventListener("scroll", requestBloomUpdate, { passive: true });
  window.addEventListener("resize", requestBloomUpdate);
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
