/**
 * markdown-to-blocks.ts
 *
 * PARTE 6A — Parser Markdown mínimo por sección (sin AST completo).
 * Convierte texto Markdown en borradores de bloques editoriales v1.
 * Sin dependencias externas; listo para extender en importación de libro completo.
 */

import type { BlockType } from '$lib/core/domain/block';

/** Borrador listo para CreateBlockInput (sin sectionId). */
export interface MarkdownBlockDraft {
  blockType: BlockType;
  contentText: string;
}

export interface MarkdownImportPreview {
  blockCount: number;
  byType: Partial<Record<BlockType, number>>;
  samples: { type: BlockType; excerpt: string }[];
}

const MAX_SAMPLES = 18;

function truncate(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max) + '…';
}

function excerptForDraft(d: MarkdownBlockDraft): string {
  if (d.blockType === 'SEPARATOR') return '— separador —';
  if (d.blockType === 'PAGE_BREAK') return '— salto de página —';
  if (!d.contentText.trim()) return '—';
  return truncate(d.contentText, 72);
}

/**
 * Valida texto antes de parsear (UI / servicio).
 */
export function validateMarkdownForImport(source: string): { ok: true } | { ok: false; message: string } {
  if (source.trim().length === 0) {
    return { ok: false, message: 'El Markdown está vacío. Pega o carga contenido antes de importar.' };
  }
  return { ok: true };
}

/**
 * Construye resumen para la vista previa de importación.
 */
export function buildMarkdownImportPreview(drafts: MarkdownBlockDraft[]): MarkdownImportPreview {
  const byType: Partial<Record<BlockType, number>> = {};
  for (const d of drafts) {
    byType[d.blockType] = (byType[d.blockType] ?? 0) + 1;
  }
  const samples = drafts.slice(0, MAX_SAMPLES).map(d => ({
    type: d.blockType,
    excerpt: excerptForDraft(d),
  }));
  return { blockCount: drafts.length, byType, samples };
}

/**
 * Convierte Markdown (reglas v1) en borradores de bloques.
 * No crea secciones: todo el contenido pertenece a la sección actual.
 */
export function parseMarkdownToBlockDrafts(source: string): MarkdownBlockDraft[] {
  const normalized = source.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const out: MarkdownBlockDraft[] = [];
  let paraBuf: string[] = [];

  function flushPara(): void {
    if (paraBuf.length === 0) return;
    const text = paraBuf.join('\n').trimEnd();
    paraBuf = [];
    if (text.trim().length > 0) {
      out.push({ blockType: 'PARAGRAPH', contentText: text });
    }
  }

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmedLine = raw.trim();

    if (trimmedLine === '') {
      flushPara();
      i++;
      continue;
    }

    if (/^---+\s*$/.test(trimmedLine)) {
      flushPara();
      out.push({ blockType: 'SEPARATOR', contentText: '' });
      i++;
      continue;
    }

    if (trimmedLine === '[[PAGE_BREAK]]') {
      flushPara();
      out.push({ blockType: 'PAGE_BREAK', contentText: '' });
      i++;
      continue;
    }

    const imgMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)]+)\)\s*$/);
    if (imgMatch) {
      flushPara();
      const alt = imgMatch[1].trim();
      const src = imgMatch[2].trim();
      const note = [alt && `Alt: ${alt}`, src && `Origen: ${src}`].filter(Boolean).join(' · ');
      out.push({ blockType: 'IMAGE', contentText: note || src });
      i++;
      continue;
    }

    if (trimmedLine.startsWith('### ')) {
      flushPara();
      out.push({ blockType: 'HEADING_2', contentText: trimmedLine.slice(4).trim() });
      i++;
      continue;
    }

    if (trimmedLine.startsWith('## ')) {
      flushPara();
      out.push({ blockType: 'HEADING_2', contentText: trimmedLine.slice(3).trim() });
      i++;
      continue;
    }

    if (trimmedLine.startsWith('# ')) {
      flushPara();
      out.push({ blockType: 'HEADING_1', contentText: trimmedLine.slice(2).trim() });
      i++;
      continue;
    }

    if (/^#{4,}\s+/.test(trimmedLine)) {
      flushPara();
      const text = trimmedLine.replace(/^#{4,}\s+/, '').trim();
      if (text) out.push({ blockType: 'HEADING_2', contentText: text });
      i++;
      continue;
    }

    if (trimmedLine.startsWith('>')) {
      flushPara();
      const qLines: string[] = [];
      while (i < lines.length) {
        const tl = lines[i].trimEnd();
        const tTrim = tl.trim();
        if (tTrim === '') break;
        if (!tTrim.startsWith('>')) break;
        qLines.push(tTrim.replace(/^>\s?/, ''));
        i++;
      }
      const qText = qLines.join('\n').trim();
      if (qText) out.push({ blockType: 'QUOTE', contentText: qText });
      continue;
    }

    paraBuf.push(raw);
    i++;
  }

  flushPara();
  return out;
}
