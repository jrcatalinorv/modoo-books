/**
 * processMarkdown.js
 * Utilidad servidor para parsear archivos .md con Frontmatter.
 * Extrae: título, layout, variante, imagen de fondo, y genera HTML + TOC.
 */

import matter from 'gray-matter';
import { marked } from 'marked';

/**
 * Genera un ID de ancla a partir de texto plano.
 * @param {string} text
 * @returns {string}
 */
export function slugifyHeading(text) {
  const slug = text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')         // strip HTML tags
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s-]/g, '')   // solo alfanumérico, espacios y guiones
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');            // colapsar guiones múltiples

  // Los selectores CSS (#id) no pueden empezar con un dígito.
  // Paged.js usa querySelector() para resolver target-counter() en el TOC.
  return /^\d/.test(slug) ? `h-${slug}` : slug || 'heading';
}

/**
 * Procesa un archivo Markdown raw y devuelve:
 *  - meta: datos del frontmatter (con defaults seguros)
 *  - content: HTML del cuerpo
 *  - headings: array de { level, text, id } para el TOC
 *
 * @param {string} rawMarkdown  Contenido crudo del archivo .md
 * @returns {{ meta: Object, content: string, headings: Array }}
 */
export function processMarkdown(rawMarkdown) {
  // 1. Extraer frontmatter
  const { data: fm, content: body } = matter(rawMarkdown);

  const meta = {
    title:           fm.title           || 'Sin título',
    subtitle:        fm.subtitle        || '',
    author:          fm.author          || '',
    layout:          fm.layout          || 'Standard',   // 'Standard' | 'FullImage'
    variant:         fm.variant         || 'light',      // 'light' | 'dark'
    backgroundImage: fm.backgroundImage || null,         // ruta /images/...
    pageSize:        fm.pageSize        || 'A5',         // 'A5' | 'Letter'
    language:        fm.language        || 'es',
    description:     fm.description    || '',
    coverImage:      fm.coverImage      || null,
  };

  // 2. Extraer encabezados ANTES de convertir a HTML (regex sobre MD puro)
  const headings = [];
  const headingRegex = /^(#{1,2})\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(body)) !== null) {
    const text  = match[2].trim();
    const id    = slugifyHeading(text);
    headings.push({ level: match[1].length, text, id });
  }

  // 3. Convertir a HTML con marked (sin renderer personalizado — más estable)
  const rawHtml = marked.parse(body);

  // 4. Post-procesar: añadir id="" a los h1/h2 para que el TOC pueda enlazar.
  //    Usamos regex en lugar del renderer API de marked para evitar
  //    incompatibilidades entre versiones (el API cambió en v5, v9, v13).
  const content = rawHtml.replace(
    /<h([12])([^>]*)>([\s\S]*?)<\/h[12]>/g,
    (_match, level, attrs, inner) => {
      // Si ya tiene id, no lo pisamos
      if (/\bid=/.test(attrs)) return _match;
      const plainText = inner.replace(/<[^>]+>/g, '').trim();
      const id = slugifyHeading(plainText);
      return `<h${level} id="${id}"${attrs}>${inner}</h${level}>`;
    }
  );

  return { meta, content, headings };
}
