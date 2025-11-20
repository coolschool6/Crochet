# Granny Gallery (Static Site)

A cozy, mobile‑first crochet gallery with filters, lightbox, and an optional lookbook page.

## Run locally

Because the site loads `data/images.json`, open it over HTTP (not `file://`). Easiest options:

- VS Code extension: Live Server (Right‑click `index.html` → "Open with Live Server").
- Python (if installed):

```powershell
# In the project folder
python -m http.server 5500
# then open http://localhost:5500
```

## Add your images

1. Copy your images into `assets/` (you can create `assets/images/` if you like).
2. Edit `data/images.json` and add/replace items with your filenames.

```json
[
  {
    "src": "assets/images/your-file-1.webp",
    "alt": "Short description for screen readers",
    "title": "Shown under the photo",
    "tags": ["Blankets", "Warm"],
    "featured": true
  }
]
```

- `tags` power the filter chips automatically. Keep to 3–5 categories overall.
- `featured: true` shows it in the Lookbook slideshow (`lookbook.html`).

## Tips for mobile/performance

- Export images as WebP (and AVIF if available), multiple widths (e.g., 640/960/1280).
- Keep most images under ~150KB each when possible.
- The grid lazy‑loads images and supports pinch‑zoom in the lightbox.
- All UI is keyboard‑accessible and respects Reduced Motion.
