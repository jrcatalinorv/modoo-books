/**
 * Importación de archivos al almacenamiento del libro (filesystem + metadatos BD).
 * Invocado desde IPC; no desde Svelte.
 */

import { copyFileSync, readFileSync, existsSync } from 'fs';
import { basename, extname } from 'path';
import { createHash } from 'crypto';
import * as AssetRepo from '../database/repositories/AssetRepository';
import { getBookMediaDir } from '../lib/book-media-paths';
import { readImageDimensions } from '../lib/image-dimensions';
import type { Asset, AssetType } from '../../src/lib/core/domain/asset';

export interface ImportAssetFileOptions {
  bookId:    string;
  sourcePath: string;
  assetType?: AssetType;
  altText?:  string;
}

/**
 * Copia el archivo al directorio media del libro e inserta fila en assets.
 */
export function importAssetFromPath(options: ImportAssetFileOptions): Asset {
  const { bookId, sourcePath } = options;
  if (!existsSync(sourcePath)) {
    throw new Error(`El archivo no existe: ${sourcePath}`);
  }

  const buf  = readFileSync(sourcePath);
  const hash = createHash('sha256').update(buf).digest('hex');
  const orig = basename(sourcePath);
  const ext  = extname(orig) || '.bin';
  const id   = crypto.randomUUID();
  const filename = `img-${id}${ext}`;
  const mediaDir = getBookMediaDir(bookId);
  const destAbs  = `${mediaDir}/${filename}`;
  copyFileSync(sourcePath, destAbs);

  const storagePath = `media/${filename}`;
  const dims        = readImageDimensions(buf);

  const mimeGuess =
    ext.toLowerCase() === '.png'  ? 'image/png'
    : ext.toLowerCase() === '.jpg' || ext.toLowerCase() === '.jpeg' ? 'image/jpeg'
    : ext.toLowerCase() === '.gif' ? 'image/gif'
    : ext.toLowerCase() === '.webp' ? 'image/webp'
    : ext.toLowerCase() === '.svg' ? 'image/svg+xml'
    : 'application/octet-stream';

  return AssetRepo.createAsset({
    id,
    bookId,
    assetType:     options.assetType ?? 'image',
    filename,
    originalName:  orig,
    mimeType:      mimeGuess,
    fileExt:       ext,
    fileSizeBytes: buf.length,
    widthPx:       dims?.width  ?? null,
    heightPx:      dims?.height ?? null,
    storagePath,
    checksum:      hash,
    altText:       options.altText ?? '',
    caption:       '',
  });
}
