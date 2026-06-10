import * as THREE from "three";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;

gsap.registerPlugin(ScrollTrigger, SplitText);

/* ============================================================
   WebGL background — flowing fbm gradient with a peach glow
   that drifts toward the pointer. Renders only while visible.
   ============================================================ */

function initScene() {
  const canvas = document.getElementById("webgl");
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
  } catch {
    // No WebGL — hide the canvas and let the CSS fallback gradient show.
    canvas.remove();
    document.body.classList.add("no-webgl");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isTouch ? 1.25 : 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const uniforms = {
    uTime: { value: 0 },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uRes: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      void main() { gl_Position = vec4(position, 1.0); }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      uniform float uTime;
      uniform vec2 uMouse;
      uniform vec2 uRes;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y);
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = p * 2.05 + vec2(13.7, 7.3);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 p = uv;
        p.x *= uRes.x / uRes.y;

        float t = uTime * 0.05;
        vec2 q = vec2(fbm(p * 1.4 + t), fbm(p * 1.4 - t * 0.7));
        float f = fbm(p * 1.8 + q * 1.6);

        // base: near-black with a faint cool gradient
        vec3 col = mix(vec3(0.043, 0.043, 0.059), vec3(0.07, 0.075, 0.10), f);

        // peach ember following the pointer
        vec2 m = uMouse;
        m.x *= uRes.x / uRes.y;
        float d = length(p - m);
        float glow = exp(-d * 2.6) * (0.35 + 0.15 * sin(uTime * 0.4));
        col += vec3(1.0, 0.55, 0.35) * glow * (0.35 + f * 0.5);

        // second, slower ember low in the frame
        float d2 = length(p - vec2(uRes.x / uRes.y * 0.78, 0.18 + 0.04 * sin(t * 2.0)));
        col += vec3(1.0, 0.42, 0.25) * exp(-d2 * 3.2) * 0.18;

        // vignette
        float vig = smoothstep(1.25, 0.35, length(uv - 0.5));
        col *= mix(0.75, 1.0, vig);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

  const mouse = { x: 0.5, y: 0.35, tx: 0.5, ty: 0.35 };
  if (!isTouch) {
    window.addEventListener("pointermove", (e) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = 1 - e.clientY / window.innerHeight;
    });
  }

  window.addEventListener("resize", () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
  });

  let visible = true;
  const clock = new THREE.Clock();

  function frame() {
    if (visible) {
      mouse.x += (mouse.tx - mouse.x) * 0.04;
      mouse.y += (mouse.ty - mouse.y) * 0.04;
      uniforms.uMouse.value.set(mouse.x, mouse.y);
      uniforms.uTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    }
    if (!prefersReducedMotion) requestAnimationFrame(frame);
  }
  frame();

  // Pause rendering and fade the canvas once the hero scrolls away.
  ScrollTrigger.create({
    trigger: "#hero",
    start: "bottom 60%",
    onEnter: () => { visible = false; gsap.to(canvas, { opacity: 0, duration: 0.6 }); },
    onLeaveBack: () => { visible = true; gsap.to(canvas, { opacity: 1, duration: 0.6 }); },
  });
}

/* ============================================================
   Smooth scroll
   ============================================================ */

function initLenis() {
  const lenis = new Lenis({ lerp: 0.12 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0 });
    });
  });
}

/* ============================================================
   Hero intro + scroll-driven reveals
   ============================================================ */

function initAnimations() {
  // Hero lines rise out of their overflow-hidden wrappers.
  const heroLines = gsap.utils.toArray(".hero .line-inner");
  gsap.set(heroLines, { yPercent: 110 });
  const intro = gsap.timeline({ defaults: { ease: "power4.out" } });
  intro
    .to(heroLines, { yPercent: 0, duration: 1.3, stagger: 0.12 }, 0.2)
    .to("[data-hero-fade]", { opacity: 1, duration: 1.1, stagger: 0.15 }, 0.9);

  // Generic reveals.
  gsap.utils.toArray("[data-reveal]").forEach((el) => {
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  // About paragraphs reveal line by line.
  document.fonts.ready.then(() => {
    gsap.utils.toArray("[data-split]").forEach((el) => {
      const split = new SplitText(el, { type: "lines", mask: "lines" });
      gsap.from(split.lines, {
        yPercent: 105,
        duration: 0.9,
        stagger: 0.08,
        ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%" },
      });
    });
    ScrollTrigger.refresh();
  });

  // Stat counters.
  gsap.utils.toArray(".stat__num").forEach((el) => {
    const target = +el.dataset.count;
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const obj = { v: 0 };
    gsap.to(obj, {
      v: target,
      duration: 1.6,
      ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => { el.textContent = prefix + Math.round(obj.v) + suffix; },
    });
  });

  // Marquee drifts left forever; scroll velocity nudges its speed.
  const track = document.querySelector(".marquee__track");
  const drift = gsap.to(track, { xPercent: -50, duration: 28, ease: "none", repeat: -1 });
  ScrollTrigger.create({
    onUpdate: (self) => {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 1500, 3);
      gsap.to(drift, { timeScale: boost, duration: 0.4, overwrite: true });
    },
  });

  // Contact headline rises like the hero.
  const contactLines = gsap.utils.toArray(".contact .line-inner");
  gsap.set(contactLines, { yPercent: 110 });
  gsap.to(contactLines, {
    yPercent: 0,
    duration: 1.2,
    stagger: 0.12,
    ease: "power4.out",
    scrollTrigger: { trigger: ".contact", start: "top 70%" },
  });
}

function showEverything() {
  gsap.set("[data-reveal], [data-hero-fade]", { opacity: 1, y: 0, clearProps: "transform" });
}

/* ============================================================
   Project accordions
   ============================================================ */

function initProjects() {
  document.querySelectorAll(".project").forEach((project) => {
    const head = project.querySelector(".project__head");
    const body = project.querySelector(".project__body");

    head.addEventListener("click", () => {
      const open = head.getAttribute("aria-expanded") === "true";

      // close any other open project
      document.querySelectorAll('.project__head[aria-expanded="true"]').forEach((other) => {
        if (other === head) return;
        other.setAttribute("aria-expanded", "false");
        gsap.to(other.parentElement.querySelector(".project__body"), {
          height: 0, duration: 0.5, ease: "power3.inOut",
        });
      });

      head.setAttribute("aria-expanded", String(!open));
      gsap.to(body, {
        height: open ? 0 : "auto",
        duration: 0.6,
        ease: "power3.inOut",
        onComplete: () => ScrollTrigger.refresh(),
      });
    });
  });
}

/* ============================================================
   Chrome: nav hide, NYC clock, cursor, magnetic hovers
   ============================================================ */

function initChrome() {
  const nav = document.querySelector(".nav");
  let lastY = 0;
  window.addEventListener("scroll", () => {
    const y = window.scrollY;
    nav.classList.toggle("is-hidden", y > lastY && y > 160);
    lastY = y;
  }, { passive: true });

  const clockEl = document.getElementById("clock");
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", hour12: false,
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const tick = () => { clockEl.textContent = fmt.format(new Date()); };
  tick();
  setInterval(tick, 1000);

  document.getElementById("year").textContent = new Date().getFullYear();

  if (isTouch || prefersReducedMotion) return;

  const cursor = document.querySelector(".cursor");
  const cx = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power2.out" });
  const cy = gsap.quickTo(cursor, "y", { duration: 0.18, ease: "power2.out" });
  window.addEventListener("pointermove", (e) => {
    cursor.classList.add("is-active");
    cx(e.clientX);
    cy(e.clientY);
  });

  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    const x = gsap.quickTo(el, "x", { duration: 0.3, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.3, ease: "power3.out" });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      x((e.clientX - r.left - r.width / 2) * 0.3);
      y((e.clientY - r.top - r.height / 2) * 0.3);
    });
    el.addEventListener("pointerleave", () => { x(0); y(0); });
    el.addEventListener("pointerenter", () => gsap.to(cursor, { scale: 2.5, duration: 0.3 }));
    el.addEventListener("pointerleave", () => gsap.to(cursor, { scale: 1, duration: 0.3 }));
  });
}

/* ============================================================
   Boot
   ============================================================ */

initScene();
initProjects();
initChrome();

if (prefersReducedMotion) {
  document.body.classList.add("reduced-motion");
  showEverything();
} else {
  initLenis();
  initAnimations();
}
