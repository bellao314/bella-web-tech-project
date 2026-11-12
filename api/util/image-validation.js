/**
 * Validates image file type and file size.
 *
 * @param {object} file - File-like object with type and size properties.
 * @param {number} [maxMb=5] - Maximum allowed size in megabytes.
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file, maxMb = 5) {
  if (!file) {
    return { valid: false, error: "No file selected." };
  }
  if (!file.type || !file.type.startsWith("image/")) {
    return { valid: false, error: "Please select a valid image file (PNG, JPG, SVG, WebP, or GIF)." };
  }
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `Image file is too large (max ${maxMb}MB). Please choose a smaller image.` };
  }
  return { valid: true };
}
