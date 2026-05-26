import type { TopicSlug } from './constants';

export type { TopicSlug };

export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

export interface TocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}
