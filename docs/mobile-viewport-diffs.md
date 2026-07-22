# Mobile viewport work — recorded diffs

Intentional changes kept after the mobile Chrome UA-chrome / background-jump work:

1. **Scrollport** — Document scroll moved to `.app-scroll` (`html`/`body` `overflow: hidden`) so mobile Chrome is less likely to retract its address bar. Scroll listeners and e2e helpers use `[data-scroll-root]`.
2. **Fixed wallpaper** — Background layer height is `100lvh` (stable) instead of `100dvh`, so `background-size: cover` does not reflow when UA chrome toggles.
3. **Loading splash** — Still waits for `window.load` / `readyState === "complete"` (no early timeout). Vertical text layout was cleaned up separately.
4. **Visual baselines** — Playwright snapshots refreshed for the scrollport layout; screenshots wait for `.loader-bg` to unmount.

Corrections on top of that:

5. **Home banner height** — Was `100svh - 4rem`, shorter than the app scrollport, so posts peeked under the first screen. Now `100cqh - var(--navbar-height)` against `.app-scroll` (`container-type: size`).
6. **Navbar compact on mobile** — Temporarily gated to `min-width: 1024px`; restored for all viewports.
7. **Navbar spacer in flex scrollport** — `.navbar-header` only contains a `position: fixed` bar, so as a flex child it was `flex-shrink`’d to 0 height and the banner started under the overlay. Fixed with `flex-shrink: 0`.
