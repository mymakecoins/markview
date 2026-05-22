import DOMPurify from 'dompurify';
import { marked } from 'marked';

marked.use({
  gfm: true,
  breaks: false,
});

const SANITIZE_CONFIG = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ['target'],
  FORBID_TAGS: ['style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick'],
};

export function sanitize(rawHtml: string): string {
  return DOMPurify.sanitize(rawHtml, SANITIZE_CONFIG) as string;
}

export function render(markdown: string): string {
  return sanitize(marked.parse(markdown) as string);
}
