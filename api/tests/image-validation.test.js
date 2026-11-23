import { describe, expect, it } from "vitest";
import { validateImageFile } from "../util/image-validation.js";

describe("validateImageFile", () => {
  it("rejects a missing file and non-image MIME types", () => {
    expect(validateImageFile()).toEqual({ valid: false, error: "No file selected." });
    expect(validateImageFile({ type: "application/pdf", size: 10 })).toMatchObject({
      valid: false,
      error: expect.stringMatching(/valid image/i),
    });
  });

  it("accepts supported image MIME types at or below the size limit", () => {
    expect(validateImageFile({ type: "image/png", size: 5 * 1024 * 1024 })).toEqual({ valid: true });
    expect(validateImageFile({ type: "image/svg+xml", size: 1 })).toEqual({ valid: true });
    expect(validateImageFile({ type: "image/webp", size: 1024 }, 0.001)).toEqual({ valid: true });
  });

  it("rejects an image larger than the configurable size limit", () => {
    expect(validateImageFile({ type: "image/jpeg", size: 1025 }, 0.0009)).toEqual({
      valid: false,
      error: expect.stringMatching(/too large.*0.0009MB/i),
    });
  });
});
