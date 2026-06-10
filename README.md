# oswaldo ortiz — personal site

Single-page portfolio. Static, no build step, no framework — deployable to any
free static host (GitHub Pages, Cloudflare Pages, Netlify).

## Stack

- **Three.js** — WebGL hero background (fbm noise shader, pointer-tracked glow),
  with a CSS-gradient fallback when WebGL is unavailable
- **GSAP + ScrollTrigger + SplitText** — hero/contact line reveals, per-line
  paragraph splits, stat counters, scroll-velocity-reactive marquee
- **Lenis** — smooth scrolling
- All libraries loaded from jsDelivr CDN; no `node_modules`

## Structure

```
index.html      content + markup
css/style.css   design system (dark, peach accent, Space Grotesk / Instrument Serif / JetBrains Mono)
js/app.js       scene, animations, accordions, cursor, nav
```

## Run locally

```sh
python3 -m http.server 8741
# http://localhost:8741
```

## Accessibility / resilience

- `prefers-reduced-motion` disables all animation and shows content statically
- WebGL failure degrades to a CSS gradient (boot is try/caught)
- Project accordions are real `<button>`s with `aria-expanded`
- Custom cursor and magnetic hovers only on fine-pointer devices

## Content note

All copy is public-safe: no PHI, no client names, no contract figures.
