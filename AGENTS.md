<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## App Design Rules

- Build pages with the shared design-system components in `components/ui` before creating one-off markup.
- Use brand/theme tokens from `app/globals.css` such as `primary`, `secondary`, `accent`, `background`, `card`, `border`, `ring`, and `brand-*`; avoid hard-coded brand hex values in page components.
- Put reusable product or layout pieces in focused component folders, such as `components/auth` or `components/brand`.
- Use shared helpers from `lib`, including `cn` from `lib/utils.ts` and request helpers from `lib/http.ts`, instead of duplicating utility logic in pages.
- Keep pages focused on composition and route-level behavior; move repeated UI patterns into components.
- Keep forms and upload controls plain and product-like. Avoid decorative background panels, dashed-card sections, large icon blocks, and "AI-looking" visual wrappers unless they are already established by the surrounding UI. Prefer simple checkbox rows that reveal direct inputs underneath.
- Keep CTA sections plain. Do not add decorative backgrounds, tinted panels, gradients, or visual wrappers around CTA areas unless the surrounding design system already uses that exact treatment.
