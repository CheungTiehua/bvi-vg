import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import mdx from '@astrojs/mdx';
import robotsTxt from 'astro-robots-txt';

export default defineConfig({
  site: 'https://bvi.vg',
  trailingSlash: 'always',

  vite: {
    plugins: [tailwindcss()],
  },

  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/search/'),
    }),
    robotsTxt({
      sitemap: false,
    }),
  ],

  markdown: {
    shikiConfig: {
      theme: 'github-dark',
    },
  },
});
