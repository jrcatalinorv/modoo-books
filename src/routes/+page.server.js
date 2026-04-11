/**
 * Página de inicio: lista todos los libros en /content/*.md
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';

export const prerender = true;

export async function load() {
  const contentDir = join(process.cwd(), 'content');

  let books = [];
  try {
    const files = readdirSync(contentDir).filter((f) => f.endsWith('.md'));

    books = files.map((filename) => {
      const slug = filename.replace(/\.md$/, '');
      const raw  = readFileSync(join(contentDir, filename), 'utf-8');
      const { data: fm } = matter(raw);
      return {
        slug,
        title       : fm.title        || slug,
        subtitle    : fm.subtitle     || '',
        author      : fm.author       || '',
        layout      : fm.layout       || 'Standard',
        variant     : fm.variant      || 'light',
        coverImage  : fm.coverImage   || null,
        description : fm.description  || '',
      };
    });
  } catch {
    // Si /content no existe aún, devolvemos lista vacía
  }

  return { books };
}
