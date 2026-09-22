import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// If you deploy to https://filippodeluca.com (custom domain via CNAME),
// keep base: '/'. If you instead deploy to https://<user>.github.io/<repo>/
// without a custom domain, set base: '/<repo-name>/'.
export default defineConfig({
  site: 'https://filippodeluca.com',
  base: '/',
  trailingSlash: 'always',
  integrations: [sitemap()],
});
