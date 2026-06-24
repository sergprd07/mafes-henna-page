const header = document.querySelector("[data-header]");
const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".site-nav");
const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
const bookingForm = document.querySelector("[data-booking-form]");
const motionPanels = document.querySelectorAll("[data-motion]");
const bloomWatermarks = document.querySelector("[data-bloom-watermarks]");
const bloomFrames = document.querySelectorAll(".bloom-frame");
const portfolioGallery = document.querySelector("[data-portfolio-gallery]");
const galleryFilters = document.querySelectorAll("[data-gallery-filter]");
const galleryMore = document.querySelector("[data-gallery-more]");
const galleryCount = document.querySelector("[data-gallery-count]");
const galleryLightbox = document.querySelector("[data-gallery-lightbox]");
const lightboxImage = document.querySelector("[data-lightbox-image]");
const lightboxCaption = document.querySelector("[data-lightbox-caption]");
const lightboxClose = document.querySelector("[data-lightbox-close]");
const lightboxPrev = document.querySelector("[data-lightbox-prev]");
const lightboxNext = document.querySelector("[data-lightbox-next]");
const stainMap = document.querySelector("[data-stain-map]");
const stainFilters = document.querySelectorAll("[data-stain-filter]");
const stainStatus = document.querySelector("[data-stain-status]");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let bloomScrubProgress = 0;
let lastBloomScrollY = window.scrollY;
let lastWheelScrubAt = 0;
let lastTouchY = null;

const portfolioCatalog = [
  {
    key: "floral",
    label: "Floral",
    count: 17,
    orientations: "pppppppslpplllllp",
    featured: [1, 3, 8],
  },
  {
    key: "bridal",
    label: "Bridal",
    count: 14,
    orientations: "llplllllppllll",
    featured: [5, 6, 9, 14],
  },
  {
    key: "hands",
    label: "Hands",
    count: 20,
    orientations: "ppplpplplplpppplllll",
    featured: [9, 11, 20],
  },
  {
    key: "party",
    label: "Party",
    count: 4,
    orientations: "llll",
    featured: [1, 3],
  },
];

const orientationNames = {
  p: "portrait",
  l: "landscape",
  s: "square",
};

let activeGalleryFilter = "all";
let galleryExpanded = false;
let lightboxItems = [];
let lightboxIndex = 0;
let lightboxReturnFocus = null;
let selectedStain = "all";

const stainDescriptions = {
  all: "Showing all expected stain levels.",
  coffee: "Showing the thickest skin areas, where henna generally develops its darkest coffee tone.",
  burgundy: "Showing thick skin areas, where henna generally develops a deep burgundy tone.",
  "light-brown": "Showing medium skin areas, where henna generally develops a medium light-brown tone.",
  ochre: "Showing thin skin areas, where henna generally develops a lighter ochre tone.",
  sienna: "Showing the thinnest skin areas, where henna generally develops its lightest orange-sienna tone.",
};

const displayStain = (stain, temporary = false) => {
  if (!stainMap) {
    return;
  }

  stainMap.dataset.activeStain = stain;
  stainStatus.textContent = stainDescriptions[stain];
  stainMap.querySelectorAll("[data-stain-hide]").forEach((layer) => {
    layer.style.opacity = stain === "all" || layer.dataset.stainHide === stain ? "0" : "1";
  });

  stainFilters.forEach((filter) => {
    const matches = filter.dataset.stainFilter === stain;
    filter.classList.toggle("previewing", temporary && matches);
    if (!temporary) {
      const selected = filter.dataset.stainFilter === selectedStain;
      filter.classList.toggle("active", selected);
      filter.setAttribute("aria-pressed", String(selected));
    }
  });
};

if (stainMap) {
  stainFilters.forEach((filter) => {
    const stain = filter.dataset.stainFilter;

    const previewStain = () => displayStain(stain, true);
    const restoreStain = () => displayStain(selectedStain);

    filter.addEventListener("pointerenter", previewStain);
    filter.addEventListener("pointerleave", restoreStain);
    filter.addEventListener("mouseenter", previewStain);
    filter.addEventListener("mouseleave", restoreStain);
    filter.addEventListener("focus", () => displayStain(stain, true));
    filter.addEventListener("blur", () => displayStain(selectedStain));
    filter.addEventListener("click", () => {
      selectedStain = stain;
      displayStain(selectedStain);
    });
  });

  displayStain(selectedStain);
}

const portfolioItems = portfolioCatalog.flatMap((category) =>
  Array.from({ length: category.count }, (_, itemIndex) => {
    const number = itemIndex + 1;
    return {
      category: category.key,
      label: category.label,
      number,
      orientation: orientationNames[category.orientations[itemIndex]] || "portrait",
      featured: category.featured.includes(number),
      src: `assets/portfolio/${category.key}/${category.key}-${String(number).padStart(2, "0")}.webp`,
    };
  }),
);

const getVisibleGalleryItems = () =>
  [...portfolioGallery.querySelectorAll(".gallery-item:not([hidden])")];

const updateLightbox = () => {
  const item = lightboxItems[lightboxIndex];
  if (!item) {
    return;
  }

  const image = item.querySelector("img");
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = `${item.dataset.label} henna · ${lightboxIndex + 1} of ${lightboxItems.length}`;
};

const openLightbox = (item, trigger) => {
  lightboxItems = getVisibleGalleryItems();
  lightboxIndex = Math.max(0, lightboxItems.indexOf(item));
  lightboxReturnFocus = trigger;
  updateLightbox();
  galleryLightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  lightboxClose.focus();
};

const closeLightbox = () => {
  galleryLightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  lightboxImage.src = "";
  lightboxReturnFocus?.focus();
};

const moveLightbox = (direction) => {
  lightboxIndex = (lightboxIndex + direction + lightboxItems.length) % lightboxItems.length;
  updateLightbox();
};

const renderGalleryState = () => {
  const items = [...portfolioGallery.querySelectorAll(".gallery-item")];
  let visibleCount = 0;

  items.forEach((item) => {
    const categoryMatches = activeGalleryFilter === "all" || item.dataset.category === activeGalleryFilter;
    const shouldShow =
      categoryMatches &&
      (activeGalleryFilter !== "all" || galleryExpanded || item.dataset.featured === "true");
    item.hidden = !shouldShow;
    if (shouldShow) {
      visibleCount += 1;
    }
  });

  galleryFilters.forEach((filter) => {
    const active = filter.dataset.galleryFilter === activeGalleryFilter;
    filter.classList.toggle("active", active);
    filter.setAttribute("aria-pressed", String(active));
  });

  const category = portfolioCatalog.find((item) => item.key === activeGalleryFilter);
  if (galleryCount) {
    galleryCount.textContent =
      activeGalleryFilter === "all" && !galleryExpanded
        ? `${visibleCount} featured works`
        : category
          ? `${visibleCount} ${category.label.toLowerCase()} works`
          : `${visibleCount} works`;
  }
  galleryMore.hidden = activeGalleryFilter !== "all" || galleryExpanded;
};

if (portfolioGallery) {
  portfolioItems.forEach((item, index) => {
    const figure = document.createElement("figure");
    figure.className = `gallery-item ${item.orientation}`;
    figure.dataset.category = item.category;
    figure.dataset.label = item.label;
    figure.dataset.featured = String(item.featured);

    const button = document.createElement("button");
    button.className = "gallery-image-button";
    button.type = "button";
    button.setAttribute("aria-label", `View ${item.label.toLowerCase()} henna design ${item.number}`);

    const image = document.createElement("img");
    image.src = item.src;
    image.alt = `${item.label} henna design ${item.number} by Mafe Moreno`;
    image.loading = index < 4 ? "eager" : "lazy";
    image.decoding = "async";

    const caption = document.createElement("figcaption");
    caption.innerHTML = `<span>${item.label}</span><span>View</span>`;

    button.append(image, caption);
    figure.append(button);
    portfolioGallery.append(figure);

    button.addEventListener("click", () => openLightbox(figure, button));
  });

  galleryFilters.forEach((filter) => {
    filter.addEventListener("click", () => {
      activeGalleryFilter = filter.dataset.galleryFilter;
      galleryExpanded = false;
      renderGalleryState();
    });
  });

  galleryMore.addEventListener("click", () => {
    galleryExpanded = true;
    renderGalleryState();
  });

  lightboxClose.addEventListener("click", closeLightbox);
  lightboxPrev.addEventListener("click", () => moveLightbox(-1));
  lightboxNext.addEventListener("click", () => moveLightbox(1));
  galleryLightbox.addEventListener("click", (event) => {
    if (event.target === galleryLightbox) {
      closeLightbox();
    }
  });
  window.addEventListener("keydown", (event) => {
    if (galleryLightbox.hidden) {
      return;
    }

    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    } else if (event.key === "ArrowRight") {
      moveLightbox(1);
    }
  });

  renderGalleryState();
}

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

if (bloomWatermarks) {
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
