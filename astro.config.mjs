import { defineConfig } from 'astro/config';

// If you deploy to https://filippodeluca.com (custom domain via CNAME),
// keep base: '/'. If you instead deploy to https://<user>.github.io/<repo>/
// without a custom domain, set base: '/<repo-name>/'.
export default defineConfig({
  site: 'https://filippodeluca.com',
  base: '/',
  trailingSlash: 'always',
});
