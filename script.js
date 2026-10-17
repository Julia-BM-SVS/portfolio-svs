/*
 * SKID VISUAL SCIENCE | Organic pixel wave
 * Every pixel is an actual HTML button with a stable, inspectable ID.
 * Project pixels expand into artwork on hover. The lower iris pixels NEVER do.
 *
 * Change particular pixel colors here, using pixel IDs shown on hover.
 * Example: "pixel-14-25": "#FF4040"
 */
const PIXEL_OVERRIDES = {
  // "pixel-14-25": "#FF4040",
};

/* Each square begins in a pixelated iris and finishes in the wave.
 * Its CSS --pixel-color never changes, including during a replay.
 * Source colors come from the original PNG through iris-palette.js. */
function sampleIrisColor(gx, gy, side) {
  const sx = Math.min(IRIS_IMAGE_SIZE - 1, Math.floor((gx + 0.5) / side * IRIS_IMAGE_SIZE));
  const sy = Math.min(IRIS_IMAGE_SIZE - 1, Math.floor((gy + 0.5) / side * IRIS_IMAGE_SIZE));
  const offset = (sy * IRIS_IMAGE_SIZE + sx) * 3;
  return `rgb(${IRIS_IMAGE_RGB[offset]}, ${IRIS_IMAGE_RGB[offset + 1]}, ${IRIS_IMAGE_RGB[offset + 2]})`;
}

const field = document.getElementById("pixel-field");
const hero = document.querySelector(".hero");
const replayEyeButton = document.getElementById("replay-eye");
const inspectorLabel = document.getElementById("inspector-label");
const inspectorSwatch = document.getElementById("inspector-swatch");
const viewer = document.getElementById("visual-viewer");
const viewerTitle = document.getElementById("viewer-title");
const viewerCategory = document.getElementById("viewer-category");
const viewerCount = document.getElementById("viewer-count");
const viewerStage = document.getElementById("viewer-stage");
const viewerDownload = document.getElementById("viewer-original");
const viewerZoomControls = document.getElementById("viewer-zoom-controls");
let viewingIndex = -1;
let viewerTrigger = null;
let viewerScale = 1, panX = 0, panY = 0;
let dragStart = null;
let closeTimer;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let active = null;
let rebuildTimer;
let lastWidth = 0;
let entranceTimer = null;

// Repeatable pseudo randomness: these pixels never reshuffle on reload.
function randomAt(x, y, salt = 0) {
  const v = Math.sin((x + salt * 17.23) * 127.1 + (y - salt * 4.7) * 311.7) * 43758.5453;
  return v - Math.floor(v);
}
function clamp(n, low, high) { return Math.max(low, Math.min(high, n)); }
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
}

/* Shape and project positions stay exactly as in the previous mosaic.
 * Color is assigned later using the source iris pixels, not a second palette. */

function getPixelData(width, height, step) {
  const columns = Math.ceil(width / step);
  const rows = Math.ceil(height / step);
  const cells = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const nx = (col + .5) / columns;
      const ny = (row + .5) / rows;
      const mobile = width < 650;
      const center = mobile
        ? .88 - .19 * nx + .02 * Math.sin(nx * 6.4 + 1.1)
        : .80 - .38 * nx + .048 * Math.sin(nx * 7.8 + 1.1);
      const thickness = mobile
        ? .025 + .245 * smoothstep(.11, .82, nx)
        : .046 + .32 * smoothstep(.11, .82, nx);
      const top = center - thickness + .022 * Math.sin(nx * 17 + 1.2) + .013 * Math.sin(nx * 34);
      const bottom = center + thickness + .027 * Math.sin(nx * 13 - .5) + .017 * Math.cos(nx * 29);
      const t = (ny - top) / Math.max(.01, bottom - top);
      const edge = Math.min(t, 1 - t);
      const scatter = randomAt(col, row, 1);

      // The curved boundary dissolves: sparse particles escape the edges,
      // while small holes break up the interior. No rectangular clipping mask.
      const inside = t >= 0 && t <= 1;
      const escaping = t >= -.13 && t <= 1.13 && scatter > .90 && nx > .08;
      if (!inside && !escaping) continue;
      const probability = inside ? (.93 - (edge < .17 ? .34 * (1 - Math.max(edge, 0) / .17) : 0)) : .52;
      if (randomAt(col, row, 11) > probability) continue;

      const project = null; // Only selected discovery pixels receive projects below.
      const id = `pixel-${String(row).padStart(2, "0")}-${String(col).padStart(2, "0")}`;
      cells.push({
        id, col, row, x: col * step, y: row * step,
        color: "", // populated by mapIrisToWave(), exactly once
        project,
        opacity: 1, // no opacity shift, so iris colors remain visually consistent
        floating: !project && (t > .53 || escaping),
        phase: randomAt(col, row, 4),
        waveT: clamp(t, 0, 1),
        step
      });
    }
  }
  return cells;
}

/* One real work per highlighted pixel, scattered across the original wave.
 * The grid and iris color assignment are unchanged by this selection. */
function assignProjects(cells, width, height) {
  const mobile = width < 650;
  let candidates = cells.filter(p =>
    p.x / width > (mobile ? .33 : .53) &&
    p.waveT < .72 && p.y < height - 86 &&
    (!mobile || p.y > height * .62)
  );
  if (candidates.length < PROJECTS.length) candidates = [...cells].filter(p => p.x / width > .35);
  const chosen = [];
  const xmin = Math.min(...candidates.map(p => p.x));
  const xmax = Math.max(...candidates.map(p => p.x));
  const ymin = Math.min(...candidates.map(p => p.y));
  const ymax = Math.max(...candidates.map(p => p.y));
  for (let i = 0; i < PROJECTS.length; i++) {
    const tx = (i * .618033989 + .18) % 1;
    const ty = (i * .754877666 + .32) % 1;
    let pick = null, best = Infinity;
    for (const p of candidates) {
      if (chosen.includes(p)) continue;
      const u = (p.x - xmin) / Math.max(1, xmax - xmin);
      const v = (p.y - ymin) / Math.max(1, ymax - ymin);
      const nearest = chosen.length ? Math.min(...chosen.map(q =>
        Math.hypot((p.x - q.x) / width, (p.y - q.y) / height))) : 1;
      const crowd = nearest < (mobile ? .12 : .07) ? 10 * Math.pow((mobile ? .12 : .07) - nearest, 2) : 0;
      const score = (u - tx) ** 2 + (v - ty) ** 2 + crowd;
      if (score < best) { best = score; pick = p; }
    }
    if (pick) { pick.project = PROJECTS[i]; chosen.push(pick); }
  }
  // One chart drawn directly inside its tile hints that the squares are interactive.
  const teaser = chosen.find(p => p.project?.id === "biodiversity-trend") || chosen[0];
  if (teaser) teaser.teaser = true;
}

/**
 * Arrange exactly as many starting tiles as there are final tiles.
 * The initial shape is a SOLID circle built from the actual iris palette,
 * not an overlaid PNG. No squares are spawned or destroyed in the motion.
 */
function irisTiles(count, width, height) {
  const side = Math.ceil(Math.sqrt(count * 4 / Math.PI)) + 1;
  const sites = [];
  for (let gy = 0; gy < side; gy++) {
    for (let gx = 0; gx < side; gx++) {
      const dx = gx + .5 - side / 2;
      const dy = gy + .5 - side / 2;
      sites.push({ gx, gy, radius2: dx * dx + dy * dy });
    }
  }
  // Keep the nearest N sites. This forms a filled pixel circle without holes.
  sites.sort((a, b) => a.radius2 - b.radius2 || a.gy - b.gy || a.gx - b.gx);
  const picked = sites.slice(0, count);
  const mobile = width < 650;
  const tablet = width >= 650 && width <= 900;
  const centerX = width * (mobile ? .65 : tablet ? .68 : .74);
  const centerY = height * (mobile ? .67 : tablet ? .59 : .53);
  const diameter = mobile ? 178 : tablet ? 205 : 244;
  const tile = diameter / side;
  return picked.map(site => {
    const x = centerX + (site.gx + .5 - side / 2) * tile - tile / 2;
    const y = centerY + (site.gy + .5 - side / 2) * tile - tile / 2;
    const color = sampleIrisColor(site.gx, site.gy, side);
    // Physical RGB value is sampled only once for each tile.
    const m = color.match(/\d+/g).map(Number);
    const lightness = (m[0] * .2126 + m[1] * .7152 + m[2] * .0722) / 255;
    return { ...site, x, y, color, lightness, tile };
  });
}

/**
 * Distribute all starting iris tiles over the existing organic wave.
 * Color matching is a BIJECTION: one source tile -> one final tile.
 * Slight deterministic mixing prevents dark pupil pixels from creating an
 * artificial square or line in the final wave. All colors remain unchanged.
 */
function mapIrisToWave(pixels, width, height) {
  const tiles = irisTiles(pixels.length, width, height);
  const byBrightness = [...tiles].sort((a, b) =>
    (a.lightness + (randomAt(a.gx, a.gy, 91) - .5) * .22) -
    (b.lightness + (randomAt(b.gx, b.gy, 91) - .5) * .22));
  const destinations = [...pixels].sort((a, b) =>
    (a.waveT * .68 + randomAt(a.col, a.row, 87) * .50) -
    (b.waveT * .68 + randomAt(b.col, b.row, 87) * .50));

  destinations.forEach((pixel, index) => {
    const source = byBrightness[index];
    pixel.color = PIXEL_OVERRIDES[pixel.id] || source.color;
    // No intro color: same --pixel-color is used at both ends.
    pixel.intro = {
      startX: source.x,
      startY: source.y,
      scale: source.tile / pixel.step,
      delay: .09 + randomAt(pixel.col, pixel.row, 27) * .24
    };
  });
}

function setInspector(pixel) {
  inspectorLabel.textContent = pixel
    ? `${pixel.id.toUpperCase()}  /  ${pixel.color.toUpperCase()}${pixel.project ? "  /  HOVER TO REVEAL" : "  /  IRIS"}`
    : "HOVER A SQUARE TO EXPLORE";
  inspectorSwatch.style.background = pixel ? pixel.color : "#356468";
}

function closePixel(button) {
  if (!button) return;
  clearTimeout(closeTimer);
  button.classList.remove("is-open");
  button.dataset.pinned = "false";
  button.setAttribute("aria-expanded", "false");
  button.parentElement?.classList.remove("is-expanded");
  if (active === button) active = null;
  field.classList.toggle("has-active", Boolean(active));
}

function openPixel(button) {
  clearTimeout(closeTimer);
  if (hero.classList.contains("is-intro-playing")) return;
  if (active && active !== button) closePixel(active);
  active = button;
  button.classList.add("is-open");
  button.parentElement?.classList.add("is-expanded");
  button.setAttribute("aria-expanded", "true");
  field.classList.add("has-active");
}

function renderPixel(shell, pixel, sceneWidth, sceneHeight) {
  shell.className = `pixel-shell${pixel.floating ? " is-floating" : ""}`;
  shell.style.left = `${pixel.x}px`;
  shell.style.top = `${pixel.y}px`;
  shell.style.setProperty("--step", `${pixel.step}px`);
  shell.style.setProperty("--float-time", `${4.2 + pixel.phase * 3.2}s`);
  shell.style.setProperty("--float-delay", `${-pixel.phase * 4}s`);
  if (pixel.intro) {
    shell.style.setProperty("--intro-dx", `${pixel.intro.startX - pixel.x}px`);
    shell.style.setProperty("--intro-dy", `${pixel.intro.startY - pixel.y}px`);
    shell.style.setProperty("--intro-scale", pixel.intro.scale.toFixed(5));
    shell.style.setProperty("--intro-delay", `${pixel.intro.delay.toFixed(3)}s`);
  }

  const button = document.createElement("button");
  button.type = "button";
  button.id = pixel.id;
  button.className = `pixel${pixel.project ? " has-project" : ""}${pixel.teaser ? " has-teaser" : ""}`;
  button.dataset.row = pixel.row;
  button.dataset.col = pixel.col;
  button.dataset.color = pixel.color;
  button.dataset.project = pixel.project?.id || "none";
  button.style.setProperty("--step", `${pixel.step}px`);
  button.style.setProperty("--gap", `${pixel.step > 29 ? 3.5 : 3}px`);
  button.style.setProperty("--pixel-color", pixel.color);
  button.style.setProperty("--pixel-opacity", pixel.opacity);
  button.setAttribute("aria-label", pixel.project
    ? `${pixel.id}. Reveal ${pixel.project.title}`
    : `${pixel.id}. Iris color ${pixel.color}`);
  button.setAttribute("aria-expanded", "false");

  if (pixel.project) {
    // Expansion is always clamped into the scene and always contains the source pixel.
    const cardWidth = Math.min(sceneWidth - 28, sceneWidth < 650 ? 252 : 326);
    const cardHeight = Math.min(sceneHeight - 20, sceneWidth < 650 ? 205 : 255);
    const desiredLeft = pixel.x - cardWidth * .12;
    const desiredTop = pixel.y - cardHeight * .23;
    const cardLeft = clamp(desiredLeft, 3, sceneWidth - cardWidth - 3);
    const cardTop = clamp(desiredTop, 12, sceneHeight - cardHeight - 12);
    button.style.setProperty("--card-w", `${cardWidth}px`);
    button.style.setProperty("--card-h", `${cardHeight}px`);
    button.style.setProperty("--expand-x", `${cardLeft - pixel.x - 1}px`);
    button.style.setProperty("--expand-y", `${cardTop - pixel.y - 1}px`);

    const preview = document.createElement("span");
    preview.className = "pixel-preview";
    const img = document.createElement("img");
    img.src = pixel.project.preview;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    preview.appendChild(img);
    if (pixel.project.type === "video") {
      const videoFlag = document.createElement("span");
      videoFlag.className = "preview-video-tag";
      videoFlag.textContent = "▶  VIDEO";
      preview.appendChild(videoFlag);
    }
    if (pixel.teaser) {
      const teaser = document.createElement("span");
      teaser.className = "pixel-teaser";
      teaser.setAttribute("aria-hidden", "true");
      teaser.innerHTML = '<svg viewBox="0 0 28 28"><path d="M3 23V5M3 23H25" fill="none" stroke="white" stroke-width="1.1"/><path d="M5 19L10 15L15 18L20 8L25 6" fill="none" stroke="#FF4040" stroke-width="2.7"/></svg>';
      button.appendChild(teaser);
    }
    const detail = document.createElement("span");
    detail.className = "pixel-detail";
    const text = document.createElement("span");
    const category = document.createElement("small");
    category.textContent = pixel.project.category;
    const title = document.createElement("strong");
    title.textContent = pixel.project.title;
    text.append(category, title);
    const arrow = document.createElement("span");
    arrow.className = "preview-arrow";
    arrow.textContent = "↗";
    detail.append(text, arrow);
    button.append(preview, detail);

    button.addEventListener("pointerenter", (event) => {
      if (event.pointerType !== "touch") openPixel(button);
      setInspector(pixel);
    });
    button.addEventListener("pointerleave", () => {
      if (button.dataset.pinned !== "true") {
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          if (!button.matches(":hover") && !viewer.open) closePixel(button);
        }, 95);
      }
      setInspector(null);
    });
    button.addEventListener("focus", () => { openPixel(button); setInspector(pixel); });
    button.addEventListener("blur", () => {
      if (button.dataset.pinned !== "true") closePixel(button);
      setInspector(null);
    });
    button.addEventListener("click", (event) => {
      // Touch: first tap previews, second tap expands. Pointer hover: click expands.
      if (event.detail !== 0 && window.matchMedia("(hover: none)").matches && button.dataset.pinned !== "true") {
        button.dataset.pinned = "true";
        openPixel(button);
        return;
      }
      openViewer(pixel.project.id, button);
    });
  } else {
    button.addEventListener("pointerenter", () => setInspector(pixel));
    button.addEventListener("pointerleave", () => setInspector(null));
    button.addEventListener("focus", () => setInspector(pixel));
    button.addEventListener("blur", () => setInspector(null));
    // Iris pixels never contain project images and never expand into project cards.
  }
  shell.replaceChildren(button);
}

function buildPixelWave() {
  if (!field) return;
  const bounds = field.getBoundingClientRect();
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);
  if (!width || !height) return;
  lastWidth = width;
  if (active) closePixel(active);
  const step = width < 650 ? 28 : width < 1100 ? 32 : 37;
  const pixels = getPixelData(width, height, step);
  assignProjects(pixels, width, height);

  // Same physical tiles, sampled from the eye, fly into the wave.
  mapIrisToWave(pixels, width, height);

  // Use D3's data join when CDN is available, but DO NOT rely on the CDN to render.
  // The native fallback is why the pixel field still works without an internet connection.
  if (window.d3) {
    window.d3.select(field).selectAll(".pixel-shell")
      .data(pixels, p => p.id)
      .join("div")
      .each(function (pixel) { renderPixel(this, pixel, width, height); });
  } else {
    const fragment = document.createDocumentFragment();
    pixels.forEach(pixel => {
      const shell = document.createElement("div");
      renderPixel(shell, pixel, width, height);
      fragment.appendChild(shell);
    });
    field.replaceChildren(fragment);
  }
  field.dataset.pixelCount = String(pixels.length);
  field.dataset.renderer = window.d3 ? "d3" : "native-fallback";
}

function playEyeEntrance() {
  if (!hero || !field) return;
  clearTimeout(entranceTimer);
  if (reducedMotion.matches) {
    hero.classList.remove("is-intro-playing");
    hero.classList.add("intro-complete");
    return;
  }
  if (active) closePixel(active);
  // Removing and restoring the class forces the same animation to replay on demand.
  hero.classList.remove("is-intro-playing", "intro-complete");
  void hero.offsetWidth;
  hero.classList.add("is-intro-playing");
  entranceTimer = setTimeout(() => {
    hero.classList.remove("is-intro-playing");
    hero.classList.add("intro-complete");
  }, 3150);
}

/* Full viewer: preserves image proportions and supports pan, zoom and videos.
 * One reusable dialog serves every project. The three featured cards stay separate. */
function updateViewerTransform() {
  const art = viewerStage.querySelector(".viewer-art");
  if (!art) return;
  if (viewerScale <= 1) { viewerScale = 1; panX = 0; panY = 0; }
  art.style.transform = `translate(${panX}px, ${panY}px) scale(${viewerScale})`;
  viewerStage.classList.toggle("is-zoomed", viewerScale > 1);
  document.getElementById("viewer-zoom-label").textContent = `${Math.round(viewerScale * 100)}%`;
}
function changeZoom(change) {
  viewerScale = clamp(viewerScale + change, 1, 5);
  updateViewerTransform();
}
function showViewerProject(index) {
  viewingIndex = (index + PROJECTS.length) % PROJECTS.length;
  const work = PROJECTS[viewingIndex];
  viewerTitle.textContent = work.title;
  viewerCategory.textContent = work.category;
  viewerCount.textContent = `${String(viewingIndex + 1).padStart(2, "0")} / ${String(PROJECTS.length).padStart(2, "0")}`;
  viewerDownload.href = work.original;
  viewerDownload.textContent = work.type === "pdf" ? "OPEN ORIGINAL PDF ↗" : work.type === "video" ? "OPEN VIDEO ↗" : "OPEN ORIGINAL ↗";
  viewerStage.replaceChildren();
  if (work.type === "video") {
    const video = document.createElement("video");
    video.className = "viewer-video";
    video.src = work.full;
    video.controls = true;
    video.playsInline = true;
    video.loop = true;
    video.preload = "metadata";
    viewerStage.appendChild(video);
    video.play().catch(() => {});
  } else {
    const art = document.createElement("img");
    art.className = "viewer-art";
    art.src = work.full;
    art.alt = work.title;
    art.draggable = false;
    viewerStage.appendChild(art);
  }
  viewerZoomControls.hidden = work.type === "video";
  viewerScale = 1; panX = 0; panY = 0;
  updateViewerTransform();
  // file:// and sandbox previews can restrict History API; the viewer still works.
  try { history.replaceState(null, "", `#visual/${work.id}`); } catch (_) { /* local preview */ }
}
function openViewer(id, trigger) {
  const index = PROJECTS.findIndex(item => item.id === id);
  if (index < 0) return;
  if (trigger) viewerTrigger = trigger;
  if (!viewer.open) { viewer.showModal(); document.body.classList.add("viewer-open"); }
  showViewerProject(index);
}
function closeViewer() {
  if (viewer.open) viewer.close();
}
viewer?.addEventListener("close", () => {
  viewerStage.querySelector("video")?.pause();
  document.body.classList.remove("viewer-open");
  if (location.hash.startsWith("#visual/")) {
    try { history.replaceState(null, "", location.href.split("#")[0]); } catch (_) { /* local preview */ }
  }
  if (active) closePixel(active);
  viewerTrigger?.focus({preventScroll:true});
  viewerTrigger = null;
});
viewer?.addEventListener("click", e => { if (e.target === viewer) closeViewer(); });
document.getElementById("viewer-close")?.addEventListener("click", closeViewer);
document.getElementById("viewer-next")?.addEventListener("click", () => showViewerProject(viewingIndex+1));
document.getElementById("viewer-prev")?.addEventListener("click", () => showViewerProject(viewingIndex-1));
document.getElementById("viewer-zoom-in")?.addEventListener("click", () => changeZoom(.35));
document.getElementById("viewer-zoom-out")?.addEventListener("click", () => changeZoom(-.35));
document.getElementById("viewer-zoom-reset")?.addEventListener("click", () => { viewerScale=1; updateViewerTransform(); });
viewerStage?.addEventListener("wheel", event => {
  if (!viewer.open || !viewerStage.querySelector(".viewer-art")) return;
  event.preventDefault();
  changeZoom(event.deltaY < 0 ? .2 : -.2);
}, {passive:false});
viewerStage?.addEventListener("pointerdown", event => {
  if (viewerScale <= 1 || !viewerStage.querySelector(".viewer-art")) return;
  dragStart = { x:event.clientX, y:event.clientY, px:panX, py:panY, id:event.pointerId };
  viewerStage.setPointerCapture(event.pointerId);
});
viewerStage?.addEventListener("pointermove", event => {
  if (!dragStart || dragStart.id !== event.pointerId) return;
  panX = dragStart.px + event.clientX - dragStart.x;
  panY = dragStart.py + event.clientY - dragStart.y;
  updateViewerTransform();
});
for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
  viewerStage?.addEventListener(type, () => { dragStart = null; });
}
document.addEventListener("keydown", event => {
  if (!viewer.open || ["INPUT", "TEXTAREA", "VIDEO"].includes(document.activeElement?.tagName)) return;
  if (event.key === "ArrowRight") { event.preventDefault(); showViewerProject(viewingIndex+1); }
  if (event.key === "ArrowLeft") { event.preventDefault(); showViewerProject(viewingIndex-1); }
  if (event.key === "+" || event.key === "=") { event.preventDefault(); changeZoom(.35); }
  if (event.key === "-") { event.preventDefault(); changeZoom(-.35); }
});
window.addEventListener("hashchange", () => {
  if (!location.hash.startsWith("#visual/")) return;
  const id = decodeURIComponent(location.hash.slice("#visual/".length));
  if (PROJECTS.some(item=>item.id===id)) openViewer(id);
});

window.addEventListener("resize", () => {
  clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(() => {
    if (Math.abs(field.getBoundingClientRect().width - lastWidth) > 8) {
      buildPixelWave();
      // Resize into the finished wave. Do not unexpectedly replay the entrance.
      clearTimeout(entranceTimer);
      hero.classList.remove("is-intro-playing");
      hero.classList.add("intro-complete");
    }
  }, 160);
});
document.addEventListener("pointerdown", (event) => {
  if (active && !active.contains(event.target)) closePixel(active);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && active) {
    closePixel(active);
    document.activeElement?.blur?.();
  }
});

buildPixelWave();
playEyeEntrance();
if (location.hash.startsWith("#visual/")) {
  const visualId = decodeURIComponent(location.hash.slice(8));
  if (PROJECTS.some(item => item.id === visualId)) openViewer(visualId);
}
replayEyeButton?.addEventListener("click", () => playEyeEntrance());
