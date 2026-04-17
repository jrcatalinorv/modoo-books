/**
 * Rutas estables para medios de un libro bajo userData (desktop-first).
 *
 * Estructura: {userData}/books/{bookId}/media/{storedFilename}
 * metadata en BD: storage_path = "media/{storedFilename}"
 */

import { join } from 'path';
import { mkdirSync } from 'fs';
import { app } from 'electron';

export function getBooksRootDir(): string {
  return join(app.getPath('userData'), 'books');
}

export function getBookDir(bookId: string): string {
  return join(getBooksRootDir(), bookId);
}

export function getBookMediaDir(bookId: string): string {
  const dir = join(getBookDir(bookId), 'media');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Ruta absoluta al archivo; storagePath es relativo al directorio del libro (p. ej. media/foo.jpg). */
export function resolveBookStoragePath(bookId: string, storagePath: string): string {
  const normalized = storagePath.replace(/^[/\\]+/, '').replace(/\.\./g, '');
  return join(getBookDir(bookId), normalized);
}
