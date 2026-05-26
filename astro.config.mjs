import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import robotsTxt from 'astro-robots-txt';

export default defineConfig({
  site: 'https://bvi.vg',
  trailingSlash: 'always',

  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/search/'),
    }),
    robotsTxt({
      sitemap: true,
    }),
  ],

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
