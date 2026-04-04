/**
 * Image compression utility for MAVL watch photos.
 *
 * Keeps photos under the backend's 2.8 MB base64 ceiling by:
 *   - Resizing so the longest side ≤ MAX_DIMENSION
 *   - Compressing to JPEG at QUALITY
 *
 * Returns both the local URI (for display) and the raw base64 string
 * (ready to send to /analyze-watch — no data-URI prefix).
 */

import * as ImageManipulator from 'expo-image-manipulator';

/** Longest side in pixels — keeps decoded size well under 2 MB. */
const MAX_DIMENSION = 1200;

/** JPEG quality 0–1. 0.75 gives good visual quality at ~300–600 KB. */
const QUALITY = 0.75;

export interface CompressedImage {
  /** Local file URI for display in the app */
  uri: string;
  /** Raw base64 string (no data-URI prefix) — for the /analyze-watch API */
  base64: string;
}

/**
 * Compress a photo URI from the image picker for watch photo submission.
 * Throws if compression fails.
 */
export async function compressForWatch(uri: string): Promise<CompressedImage> {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    {
      compress: QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    },
  );

  if (!result.base64) {
    throw new Error('Image compression failed: no base64 output');
  }

  return {
    uri: result.uri,
    base64: result.base64,
  };
}
