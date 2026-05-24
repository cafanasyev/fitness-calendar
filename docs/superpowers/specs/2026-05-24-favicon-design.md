# Favicon Design

**Date:** 2026-05-24

## Decision

FC monogram on a dark `#0f172a` background, rounded corners, bold white system-ui text.

## Deliverable

Single file: `public/favicon.svg`

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="#0f172a"/>
  <text x="16" y="22" text-anchor="middle"
        font-family="system-ui,-apple-system,sans-serif"
        font-weight="800" font-size="16" fill="white">FC</text>
</svg>
```

## index.html changes

Add inside `<head>`:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```

## Why SVG only

SVG favicons are supported by all modern browsers and scale perfectly to every size (16px tab icon, 32px taskbar, 180px iOS home screen add-to-homescreen). No PNG or ICO files needed for this use case.