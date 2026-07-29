# filippodeluca.com

Personal site, rebuilt with [Astro](https://astro.build). Portfolio +
technical blog. Design system is a "blueprint" aesthetic — technical
drawing / exploded-diagram styling — documented at the top of
`src/styles/global.css`.

## Develop locally

```bash
npm install
npm run dev
```

Open http://localhost:4321

## Structure

- `src/pages/index.astro` — home (intro + spec-sheet + latest posts)
- `src/pages/about.astro` — full background / CV
- `src/pages/blog/` — blog index + `[...slug].astro` post template
- `src/content/blog/*.md` — blog posts (Markdown, frontmatter: title, date, excerpt, tags, draft)
- `src/layouts/BaseLayout.astro` — shared shell (nav, footer)
- `src/styles/global.css` — design tokens + all styling

## Writing a new post

Add a Markdown file to `src/content/blog/`, e.g. `2026-08-01-my-post.md`:

```md
---
title: "My Post"
date: 2026-08-01
tags: ["scala"]
excerpt: "One sentence summary shown in the list."
---

Post body in Markdown.
```

## Migrated posts

The four posts from the old Hugo site were migrated as stubs (title,
date, tags, link to the original) in `src/content/blog/`. Their body
content wasn't fetched automatically — paste it in from the old
repo or the Wayback Machine, then delete the `TODO` comment.

## Deploy to GitHub Pages

This repo includes `.github/workflows/deploy.yml`, which builds and
deploys automatically on every push to `main` using
[`withastro/action`](https://github.com/withastro/action).

One-time setup on GitHub:

1. Push this repo to GitHub.
2. Repo Settings → Pages → Build and deployment → Source: **GitHub Actions**.
3. If you use the custom domain `filippodeluca.com` (there's a `public/CNAME`
   file already set up for this): Settings → Pages → Custom domain →
   enter `filippodeluca.com`, and make sure your DNS points to GitHub Pages
   (A records to GitHub's IPs, or a CNAME record if using a `www` subdomain).
4. If you deploy WITHOUT a custom domain (i.e. to
   `https://<username>.github.io/<repo>/`), remove `public/CNAME` and
   update `base` in `astro.config.mjs` to `/<repo-name>/`.

After that, every `git push` to `main` rebuilds and redeploys the site.
