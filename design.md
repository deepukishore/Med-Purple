# Med Purple design system

## Direction

The app is a purple field notebook for medical study: warm paper, deep violet ink, compact study controls, and small moments of reward. Use real learning content and the existing records as the primary material. Keep empty states honest and never add social proof or unsupported metrics.

## Shared system

- Colors, type, spacing, radii, elevation, and motion live in `shared/design-tokens/*.json`; `tokens.css` is the web fallback map. Keep both aligned.
- Light and dark palettes share semantic roles in `shared/design-tokens/colors.json`. The app follows the system preference on first visit, then persists the student's explicit theme choice.
- Display: DM Serif Display for page-level headlines only. Body and controls: Manrope.
- Paper surfaces and violet carry the interface. Use mint for positive study feedback and muted red for errors. Do not use cyan accents, decorative gradients, glass surfaces, emoji icons, or stock feature-card grids.
- Use Phosphor icons at a consistent 16–20px stroke weight. Use 44px minimum touch targets.
- Prefer paper-like borders and short, grounded shadows over floating glass panels. Cards should be used when content needs a boundary, not as a repeated default container.

## Motion and 3D

- Use the shared duration/easing tokens. UI movement stays between 140–420ms; reserve 1200ms for celebrations.
- Enter and feedback motion should be brief and use transform/opacity. Always honor `prefers-reduced-motion` and the existing Calm mode.
- Lazy-load Three.js scenes, cap pixel ratio, avoid mounting scenes on low-end devices, and show the bundled static anatomical reference instead. Keep controls keyboard-operable and labeled.

## Responsive and accessible behavior

- Support 320, 390, 768, and 1440px widths without horizontal overflow or clipped controls.
- Keep focus rings visible, maintain AA text contrast, label icon-only controls, and avoid layout shift while loading.
- Do not change backend behavior, route paths, API contracts, or data models when adjusting presentation.
