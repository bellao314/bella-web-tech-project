import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { autocompletePlaces, calculateDistanceInMiles, formatDistance, geocodeAddress, reverseGeocode, searchPlaces } from "../services/google-maps.service.js";

const originalFetch = globalThis.fetch;
beforeEach(() => { process.env.GOOGLE_MAPS_API_KEY = "test-maps-key"; });
afterEach(() => { globalThis.fetch = originalFetch; });

describe("Google Maps service", () => {
  it("calculates and formats distances, including invalid coordinates", () => {
    expect(calculateDistanceInMiles(38.627, -90.199, 38.627, -90.199)).toBe(0);
    expect(calculateDistanceInMiles("bad", 0, 0, 0)).toBeNull();
    expect(formatDistance(null)).toBeNull();
    expect(formatDistance(0)).toBe("0.1 mi");
    expect(formatDistance(1.24)).toBe("1.2 mi");
  });

  it("makes geocoding and place requests and transforms autocomplete predictions", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, json: vi.fn()
      .mockResolvedValueOnce({ status: "OK", results: [{ geometry: { location: { lat: 1, lng: 2 } } }] })
      .mockResolvedValueOnce({ status: "OK", results: [] })
      .mockResolvedValueOnce({ status: "OK", predictions: [{ place_id: "p1", description: "Coffee, St Louis", structured_formatting: { main_text: "Coffee", secondary_text: "St Louis" }, types: ["cafe"] }] })
      .mockResolvedValueOnce({ status: "OK", results: [{ name: "Coffee" }] }), });
    await expect(geocodeAddress("  St Louis ")).resolves.toMatchObject({ status: "OK" });
    await expect(reverseGeocode(38, -90)).resolves.toMatchObject({ results: [] });
    await expect(autocompletePlaces("coffee", { types: "establishment" })).resolves.toMatchObject({ suggestions: [expect.objectContaining({ id: "p1", mainText: "Coffee" })] });
    await expect(searchPlaces("coffee")).resolves.toMatchObject({ results: [{ name: "Coffee" }] });
    expect(globalThis.fetch).toHaveBeenCalledTimes(4);
  });

  it("propagates a useful error for rejected Maps responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 403, json: vi.fn().mockResolvedValue({ error_message: "Denied" }) });
    await expect(geocodeAddress("St Louis")).rejects.toMatchObject({ message: "Denied", statusCode: 403 });
  });
});
