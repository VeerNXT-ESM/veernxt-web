/**
 * Centre-crops ("cover") an image file to exactly width x height and returns
 * a WebP Blob, so every uploaded thumbnail has the same shape and a small
 * file size (the upload goes through a JSON API with a request-size limit).
 */
export async function resizeToWebp(file, width, height, quality = 0.85) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.max(width / bitmap.width, height / bitmap.height);
  const w = bitmap.width * scale;
  const h = bitmap.height * scale;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, (width - w) / 2, (height - h) / 2, w, h);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', quality));
  if (!blob) throw new Error('Could not convert the image.');
  return blob;
}
