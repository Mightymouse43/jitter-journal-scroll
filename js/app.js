/* ============================================================
   JITTER JOURNAL — Scroll-Driven App
   ============================================================ */

const FRAME_COUNT = 122;
const FRAME_SPEED = 2.0;
const IMAGE_SCALE = 0.88;
const BG_COLOR    = '#f4ede3';

// ── DOM refs ─────────────────────────────────────────────────
const loader        = document.getElementById('loader');
const loaderBar     = document.getElementById('loader-bar');
const loaderPercent = document.getElementById('loader-percent');
const canvasWrap    = document.getElementById('canvas-wrap');
const canvas        = document.getElementById('canvas');
const ctx           = canvas.getContext('2d');
const darkOverlay   = document.getElementById('dark-overlay');
const marqueeWrap   = document.getElementById('marquee');
const scrollCont    = document.getElementById('scroll-container');
const heroOverlay   = document.getElementById('hero-overlay');
const heroWords     = heroOverlay ? heroOverlay.querySelectorAll('.hero-word') : [];

// ── State ─────────────────────────────────────────────────────
const frames    = new Array(FRAME_COUNT).fill(null);
let currentFrame = 0;
let bgColor      = BG_COLOR;

// ── Canvas resize ─────────────────────────────────────────────
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);
  drawFrame(currentFrame);
}
window.addEventListener('resize', resizeCanvas);

// ── Draw a frame (padded-contain mode) ────────────────────────
function drawFrame(index) {
  const img = frames[index];
  const cw = canvas.width  / (window.devicePixelRatio || 1);
  const ch = canvas.height / (window.devicePixelRatio || 1);

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);

  if (!img) return;

  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  const scale = Math.min(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  ctx.drawImage(img, dx, dy, dw, dh);
}

// ── Sample bg color from frame edges (optional enhancement) ───
function sampleBgColor(img) {
  const tmp  = document.createElement('canvas');
  tmp.width  = img.naturalWidth;
  tmp.height = img.naturalHeight;
  const tc   = tmp.getContext('2d');
  tc.drawImage(img, 0, 0);
  const d = tc.getImageData(0, 0, 1, 1).data;
  return `rgb(${d[0]},${d[1]},${d[2]})`;
}

// ── Frame preloader ───────────────────────────────────────────
function loadFrames(onComplete) {
  const FIRST_BATCH = 10;
  let loaded = 0;

  function onLoad(i, img) {
    frames[i] = img;
    loaded++;
    const pct = Math.round((loaded / FRAME_COUNT) * 100);
    loaderBar.style.width = pct + '%';
    loaderPercent.textContent = pct + '%';
    if (i === 0) {
      document.documentElement.style.background = BG_COLOR;
      document.body.style.background = BG_COLOR;
      resizeCanvas();
    }
    if (loaded === FRAME_COUNT) onComplete();
  }

  // First batch for fast first paint
  for (let i = 0; i < FIRST_BATCH; i++) {
    const img = new Image();
    const idx = i;
    img.onload = () => onLoad(idx, img);
    img.src = `frames/frame_${String(idx + 1).padStart(4, '0')}.jpg`;
  }

  // Remaining in background
  setTimeout(() => {
    for (let i = FIRST_BATCH; i < FRAME_COUNT; i++) {
      const img = new Image();
      const idx = i;
      img.onload = () => onLoad(idx, img);
      img.src = `frames/frame_${String(idx + 1).padStart(4, '0')}.jpg`;
    }
  }, 100);
}

// ── Position sections ─────────────────────────────────────────
function positionSections() {
  const ch = scrollCont.offsetHeight;
  document.querySelectorAll('.scroll-section').forEach(section => {
    const enter = parseFloat(section.dataset.enter) / 100;
    const leave = parseFloat(section.dataset.leave) / 100;
    const mid   = (enter + leave) / 2;
    section.style.top = (mid * ch) + 'px';
  });
}
window.addEventListener('resize', positionSections);

// ── Section animation timelines ───────────────────────────────
const sectionTimelines = new Map();

function buildTimelines() {
  document.querySelectorAll('.scroll-section').forEach(section => {
    const type     = section.dataset.animation;
    const children = section.querySelectorAll(
      '.section-label, .section-heading, .section-body, .section-note, .cta-button, .stat'
    );

    const tl = gsap.timeline({ paused: true });

    switch (type) {
      case 'slide-left':
        tl.from(children, { x: -70, opacity: 0, stagger: 0.12, duration: 0.85, ease: 'power3.out' });
        break;
      case 'slide-right':
        tl.from(children, { x: 70, opacity: 0, stagger: 0.12, duration: 0.85, ease: 'power3.out' });
        break;
      case 'scale-up':
        tl.from(children, { scale: 0.84, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
        break;
      case 'stagger-up':
        tl.from(children, { y: 55, opacity: 0, stagger: 0.15, duration: 0.85, ease: 'power3.out' });
        break;
      case 'fade-up':
      default:
        tl.from(children, { y: 45, opacity: 0, stagger: 0.12, duration: 0.85, ease: 'power3.out' });
        break;
    }

    sectionTimelines.set(section, { tl, played: false });
  });
}

// ── Counter animations ────────────────────────────────────────
function initCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target   = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || '0');

    ScrollTrigger.create({
      trigger: el.closest('.scroll-section'),
      start: 'top 70%',
      once: true,
      onEnter: () => {
        gsap.fromTo(el, { textContent: 0 }, {
          textContent: target,
          duration: 2,
          ease: 'power1.out',
          snap: { textContent: decimals === 0 ? 1 : 0.1 },
          onUpdate() {
            const val = parseFloat(gsap.getProperty(el, 'textContent'));
            el.textContent = decimals === 0
              ? Math.round(val)
              : val.toFixed(decimals);
          }
        });
      }
    });
  });
}

// ── Marquee on scroll ─────────────────────────────────────────
function initMarquee() {
  const txt = marqueeWrap.querySelector('.marquee-text');
  const speed = parseFloat(marqueeWrap.dataset.scrollSpeed) || -22;

  gsap.to(txt, {
    xPercent: speed,
    ease: 'none',
    scrollTrigger: {
      trigger: scrollCont,
      start: 'top top',
      end: 'bottom bottom',
      scrub: true
    }
  });
}

// ── Dark overlay ──────────────────────────────────────────────
function initDarkOverlay(enterPct, leavePct) {
  const fade = 0.04;
  const enter = enterPct / 100;
  const leave = leavePct / 100;

  ScrollTrigger.create({
    trigger: scrollCont,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate(self) {
      const p = self.progress;
      let opacity = 0;
      if (p >= enter - fade && p < enter) {
        opacity = (p - (enter - fade)) / fade;
      } else if (p >= enter && p <= leave) {
        opacity = 0.92;
      } else if (p > leave && p <= leave + fade) {
        opacity = 0.92 * (1 - (p - leave) / fade);
      }
      darkOverlay.style.opacity = opacity;
    }
  });
}

// ── Main scroll driver ────────────────────────────────────────
function initScrollDriver() {
  ScrollTrigger.create({
    trigger: scrollCont,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate(self) {
      const p = self.progress;

      // ── Frames ──────────────────────────────────────────────
      const accelerated = Math.min(p * FRAME_SPEED, 1);
      const idx = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
      if (idx !== currentFrame) {
        currentFrame = idx;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }

      // ── Sections ────────────────────────────────────────────
      document.querySelectorAll('.scroll-section').forEach(section => {
        const enter   = parseFloat(section.dataset.enter) / 100;
        const leave   = parseFloat(section.dataset.leave) / 100;
        const persist = section.dataset.persist === 'true';
        const entry   = sectionTimelines.get(section);
        if (!entry) return;

        const { tl, played } = entry;
        const isMobile = window.innerWidth < 768;
        const inRange = p >= enter && (persist || isMobile || p <= leave);

        if (inRange && !played) {
          gsap.set(section, { opacity: 1 });
          section.classList.add('visible');
          tl.play();
          sectionTimelines.set(section, { tl, played: true });
        } else if (!inRange && !persist && !isMobile && played) {
          tl.reverse();
          section.classList.remove('visible');
          gsap.to(section, { opacity: 0, duration: 0.3 });
          sectionTimelines.set(section, { tl, played: false });
        }
      });

      // ── Hero overlay fades and slides out on scroll ──────────
      heroOverlay.style.opacity = Math.max(0, 1 - p * 16);
      if (heroWords[0]) heroWords[0].style.transform = `translateX(${-p * 1800}vw)`;
      if (heroWords[1]) heroWords[1].style.transform = `translateX(${p * 1800}vw)`;

      // ── Marquee visibility ───────────────────────────────────
      const mEnter = 0.44;
      const mLeave = 0.70;
      let mOpacity = 0;
      if (p >= mEnter && p <= mLeave) {
        const mid  = (mEnter + mLeave) / 2;
        const half = (mLeave - mEnter) / 2;
        mOpacity   = 1 - Math.abs(p - mid) / half;
        mOpacity   = Math.max(0, Math.min(1, mOpacity));
      }
      marqueeWrap.style.opacity = mOpacity;
    }
  });
}

// ── Boot sequence ─────────────────────────────────────────────
function boot() {
  gsap.registerPlugin(ScrollTrigger);

  // Lenis smooth scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  resizeCanvas();
  positionSections();
  buildTimelines();

  loadFrames(() => {
    loader.classList.add('hidden');
    drawFrame(0);

    // Hero entrance
    gsap.from('#hero-overlay .section-label', { y: 16, opacity: 0, duration: 0.6, delay: 0.2, ease: 'power3.out' });
    gsap.from('#hero-overlay .hero-word',     { y: 60, opacity: 0, stagger: 0.12, duration: 0.8, delay: 0.35, ease: 'power3.out' });
    gsap.from('#hero-overlay .hero-tagline',  { y: 20, opacity: 0, duration: 0.6, delay: 0.65, ease: 'power3.out' });
    gsap.from('#hero-overlay .hero-scroll-indicator', { opacity: 0, duration: 0.5, delay: 0.9 });

    initScrollDriver();
    initDarkOverlay(57, 76);
    initMarquee();
    initCounters();

    ScrollTrigger.refresh();
  });
}

boot();
