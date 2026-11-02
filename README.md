# Business Process Automation · Carun Advisory (interactive web deck)

Static, self-contained: `index.html` + `assets/` (fonts, logo, CSS, JS). No build step, no CDN, no tracking, no network calls.
All UI data inside the mock screens is illustrative demo data.

- Open locally: double-click `index.html`, or `python3 -m http.server 8080` here.
- Host: upload the folder contents to any static host (Netlify Drop, Vercel, Cloudflare Pages, GitHub Pages, S3, cPanel). Output directory `.`, no build command.
- Deep links: `#/1` … `#/14`.
- WhatsApp link previews: once hosted, change `og:image` in `index.html` to the absolute URL, e.g. `https://your-domain/path/assets/img/og.jpg`.
- `index.html` carries `noindex,nofollow`; remove it if the deck should be searchable.

Controls: swipe or arrow keys/buttons between slides, `O` or the grid button for the overview, `Esc` to close it. Respects prefers-reduced-motion.
