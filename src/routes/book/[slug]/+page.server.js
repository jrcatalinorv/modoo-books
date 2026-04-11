/**
 * +page.server.js
 * Carga el archivo Markdown desde /content/[slug].md,
 * extrae frontmatter y genera HTML para pasarlo al cliente.
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { error } from '@sveltejs/kit';
import { processMarkdown } from '$lib/utils/processMarkdown.js';

/** Habilitar pre-render para adapter-static */
export const prerender = true;

/**
 * Genera las entradas de rutas estáticas leyendo /content/*.md
 */
export async function entries() {
  const contentDir = join(process.cwd(), 'content');
  try {
    const files = readdirSync(contentDir).filter((f) => f.endsWith('.md'));
    return files.map((f) => ({ slug: f.replace(/\.md$/, '') }));
  } catch {
    return [];
  }
}

export async function load({ params }) {
  const { slug } = params;

  // Sanitizar slug: solo alfanumérico, guiones y guiones bajos
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    throw error(400, 'Slug inválido');
  }

  let rawMarkdown;
  try {
    const filePath = join(process.cwd(), 'content', `${slug}.md`);
    rawMarkdown = readFileSync(filePath, 'utf-8');
  } catch {
    throw error(404, `Libro "${slug}" no encontrado en /content`);
  }

  const { meta, content, headings } = processMarkdown(rawMarkdown);

  return { meta, content, headings, slug };
}
