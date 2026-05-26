import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const topicsCollection = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/topics' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    pubDate: z.date(),
    updatedDate: z.date().optional(),
    category: z.string(),
    tags: z.array(z.string()).optional().default([]),
    order: z.number().optional(),
    toc: z.boolean().optional().default(true),
    featured: z.boolean().optional().default(false),
    draft: z.boolean().optional().default(false),
  }),
});

const pagesCollection = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().max(200),
    pubDate: z.date().optional(),
    updatedDate: z.date().optional(),
  }),
});

export const collections = {
  topics: topicsCollection,
  pages: pagesCollection,
};
