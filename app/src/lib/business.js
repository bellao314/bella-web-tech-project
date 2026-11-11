import { getApi, postApi } from "./api.js";

export const PRESET_LOCATIONS = [
  {
    name: "River Market Plaza",
    city: "Portland, OR",
    address: "1122 NW River Street, Portland, OR 97209",
    latitude: 45.5231,
    longitude: -122.6765,
  },
  {
    name: "Central West End",
    city: "St. Louis, MO",
    address: "4900 Euclid Ave, St. Louis, MO 63108",
    latitude: 38.6465,
    longitude: -90.2624,
  },
  {
    name: "Downtown / Gateway Arch",
    city: "St. Louis, MO",
    address: "100 Washington Ave, St. Louis, MO 63102",
    latitude: 38.6270,
    longitude: -90.1994,
  },
  {
    name: "Tower Grove Park",
    city: "St. Louis, MO",
    address: "4257 Northeast Dr, St. Louis, MO 63110",
    latitude: 38.6056,
    longitude: -90.2570,
  },
  {
    name: "The Delmar Loop",
    city: "University City, MO",
    address: "6100 Delmar Blvd, University City, MO 63112",
    latitude: 38.6559,
    longitude: -90.3098,
  },
  {
    name: "Clayton Downtown",
    city: "Clayton, MO",
    address: "10 N Central Ave, Clayton, MO 63105",
    latitude: 38.6533,
    longitude: -90.3323,
  },
  {
    name: "Kirkwood Farmers Market",
    city: "Kirkwood, MO",
    address: "150 E Argonne Dr, Kirkwood, MO 63122",
    latitude: 38.5834,
    longitude: -90.4067,
  },
  {
    name: "Maplewood Historic Strip",
    city: "Maplewood, MO",
    address: "7300 Manchester Rd, Maplewood, MO 63143",
    latitude: 38.6117,
    longitude: -90.3228,
  },
];

export const PRESET_HOURS = [
  "7:00 AM – 2:00 PM",
  "8:00 AM – 3:00 PM",
  "9:00 AM – 4:00 PM",
  "10:00 AM – 6:00 PM",
  "11:00 AM – 8:00 PM",
  "4:00 PM – 10:00 PM",
];

const FALLBACK_LOCATIONS = [
  { match: "portland", lat: 45.5231, lng: -122.6765, address: "1122 NW River Street, Portland, OR 97209", city: "Portland, OR" },
  { match: "river market", lat: 45.5231, lng: -122.6765, address: "1122 NW River Street, Portland, OR 97209", city: "Portland, OR" },
  { match: "1122 nw river", lat: 45.5231, lng: -122.6765, address: "1122 NW River Street, Portland, OR 97209", city: "Portland, OR" },
  { match: "central west end", lat: 38.6465, lng: -90.2624, address: "4900 Euclid Ave, St. Louis, MO 63108", city: "St. Louis, MO" },
  { match: "euclid & mcpherson", lat: 38.6465, lng: -90.2624, address: "4900 Euclid Ave, St. Louis, MO 63108", city: "St. Louis, MO" },
  { match: "gateway arch", lat: 38.6270, lng: -90.1994, address: "100 Washington Ave, St. Louis, MO 63102", city: "St. Louis, MO" },
  { match: "tower grove", lat: 38.6056, lng: -90.2570, address: "4257 Northeast Dr, St. Louis, MO 63110", city: "St. Louis, MO" },
  { match: "delmar loop", lat: 38.6559, lng: -90.3098, address: "6100 Delmar Blvd, University City, MO 63112", city: "University City, MO" },
  { match: "clayton", lat: 38.6533, lng: -90.3323, address: "10 N Central Ave, Clayton, MO 63105", city: "Clayton, MO" },
  { match: "kirkwood", lat: 38.5834, lng: -90.4067, address: "150 E Argonne Dr, Kirkwood, MO 63122", city: "Kirkwood, MO" },
  { match: "maplewood", lat: 38.6117, lng: -90.3228, address: "7300 Manchester Rd, Maplewood, MO 63143", city: "Maplewood, MO" },
  { match: "richmond heights", lat: 38.6320, lng: -90.3292, address: "1155 Saint Louis Galleria St, Richmond Heights, MO 63117", city: "Richmond Heights, MO" },
  { match: "university city", lat: 38.6559, lng: -90.3098, address: "6801 Delmar Blvd, University City, MO 63130", city: "University City, MO" },
  { match: "webster groves", lat: 38.5926, lng: -90.3556, address: "101 W Lockwood Ave, Webster Groves, MO 63119", city: "Webster Groves, MO" },
  { match: "creve coeur", lat: 38.6703, lng: -90.4939, address: "11660 Olive Blvd, Creve Coeur, MO 63141", city: "Creve Coeur, MO" },
  { match: "chesterfield", lat: 38.6631, lng: -90.5772, address: "1 Chesterfield Mall, Chesterfield, MO 63017", city: "Chesterfield, MO" },
  { match: "st. charles", lat: 38.7881, lng: -90.4974, address: "200 N Main St, St. Charles, MO 63301", city: "St. Charles, MO" },
  { match: "edwardsville", lat: 38.8114, lng: -89.9532, address: "101 S Main St, Edwardsville, IL 62025", city: "Edwardsville, IL" },
  { match: "st. louis", lat: 38.6270, lng: -90.1994, address: "100 S 4th St, St. Louis, MO 63102", city: "St. Louis, MO" },
  { match: "saint louis", lat: 38.6270, lng: -90.1994, address: "100 S 4th St, St. Louis, MO 63102", city: "St. Louis, MO" },
];

const STORAGE_KEY = "businessLocationHours";
const ROLE_KEY = "userAccountType";

export function getStoredAccountType(fallback = "customer") {
  try {
    return localStorage.getItem(ROLE_KEY) || fallback;
  } catch {
    return fallback;
  }
}

export function setStoredAccountType(role) {
  try {
    localStorage.setItem(ROLE_KEY, role);
    window.dispatchEvent(new CustomEvent("accountTypeUpdated", { detail: role }));
  } catch {
    // ignore
  }
}

/**
 * Geocode an address string using backend maps API, browser google.maps, or fallback coordinates.
 */
export async function geocodeLocation(addressQuery) {
  if (!addressQuery || typeof addressQuery !== "string") {
    throw new Error("Address is required.");
  }

  const clean = addressQuery.trim();

  // 1. Check direct coordinates (e.g. "38.6270, -90.1994")
  const directMatch = clean.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (directMatch) {
    const lat = parseFloat(directMatch[1]);
    const lng = parseFloat(directMatch[2]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return {
        lat,
        lng,
        address: clean,
        city: "Coordinates",
        formattedAddress: clean,
      };
    }
  }

  // 2. Call backend Google Geocoding API
  try {
    const geoRes = await getApi(`/maps/geocode?address=${encodeURIComponent(clean)}`);
    const result = geoRes?.results?.[0];
    const loc = result?.geometry?.location;
    if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) {
      let city = "";
      if (Array.isArray(result?.address_components)) {
        const locality = result.address_components.find((c) =>
          c.types?.includes("locality")
        )?.long_name;
        const adminArea = result.address_components.find((c) =>
          c.types?.includes("administrative_area_level_1")
        )?.short_name;
        if (locality && adminArea) {
          city = `${locality}, ${adminArea}`;
        } else if (locality) {
          city = locality;
        }
      }
      if (!city) {
        city = clean.split(",").slice(1).join(",").trim() || clean;
      }
      return {
        lat: Number(loc.lat),
        lng: Number(loc.lng),
        city,
        formattedAddress: result?.formatted_address || clean,
      };
    }
  } catch {
    // Fall back to browser or local dictionary
  }

  // 3. In-browser Google Maps Geocoder if loaded
  if (typeof window !== "undefined" && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const clientRes = await new Promise((resolve, reject) => {
        geocoder.geocode({ address: clean }, (results, status) => {
          if (status === "OK" && results?.[0]?.geometry?.location) {
            resolve(results[0]);
          } else {
            reject(new Error(status));
          }
        });
      });
      const loc = clientRes.geometry.location;
      const lat = typeof loc.lat === "function" ? loc.lat() : Number(loc.lat);
      const lng = typeof loc.lng === "function" ? loc.lng() : Number(loc.lng);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return {
          lat,
          lng,
          city: clean.split(",").slice(1).join(",").trim() || clean,
          formattedAddress: clientRes.formatted_address || clean,
        };
      }
    } catch {
      // Continue to local dictionary
    }
  }

  // 4. Match local fallback dictionary
  const qLower = clean.toLowerCase();
  for (const preset of PRESET_LOCATIONS) {
    if (
      qLower.includes(preset.name.toLowerCase()) ||
      qLower.includes(preset.address.toLowerCase()) ||
      preset.address.toLowerCase().includes(qLower)
    ) {
      return {
        lat: preset.latitude,
        lng: preset.longitude,
        city: preset.city,
        formattedAddress: preset.address,
      };
    }
  }

  for (const fb of FALLBACK_LOCATIONS) {
    if (qLower.includes(fb.match) || fb.match.includes(qLower)) {
      return {
        lat: fb.lat,
        lng: fb.lng,
        city: fb.city,
        formattedAddress: fb.address,
      };
    }
  }

  throw new Error(`Could not find coordinates for "${clean}". Please enter a valid address.`);
}

/**
 * Autocomplete an address query using Google Places API via backend, in-browser AutocompleteService, or fallback dictionary.
 */
export async function fetchAddressSuggestions(inputQuery) {
  if (!inputQuery || typeof inputQuery !== "string") return [];
  const clean = inputQuery.trim();
  if (clean.length < 2) return [];

  // 1. Google Places Autocomplete API via backend
  try {
    const res = await postApi("/maps/places/autocomplete", { input: clean });
    if (res && Array.isArray(res.suggestions) && res.suggestions.length > 0) {
      return res.suggestions.map((item, idx) => {
        const pred = item.placePrediction || {};
        const mainText =
          pred.structuredFormat?.mainText?.text ||
          pred.text?.text ||
          item.description ||
          clean;
        const secondaryText =
          pred.structuredFormat?.secondaryText?.text || "";
        const description =
          pred.text?.text || item.description || [mainText, secondaryText].filter(Boolean).join(", ");
        return {
          id: pred.placeId || pred.place || `api_${idx}`,
          description,
          mainText,
          secondaryText,
        };
      });
    }
  } catch {
    // Continue to browser AutocompleteService or local list
  }

  // 2. Client-side Google Maps AutocompleteService if available
  if (typeof window !== "undefined" && window.google?.maps?.places?.AutocompleteService) {
    try {
      const service = new window.google.maps.places.AutocompleteService();
      const predictions = await new Promise((resolve) => {
        service.getPlacePredictions({ input: clean }, (results, status) => {
          if (status === "OK" && Array.isArray(results)) {
            resolve(results);
          } else {
            resolve([]);
          }
        });
      });
      if (predictions.length > 0) {
        return predictions.map((p) => ({
          id: p.place_id,
          description: p.description,
          mainText: p.structured_formatting?.main_text || p.description,
          secondaryText: p.structured_formatting?.secondary_text || "",
        }));
      }
    } catch {
      // Continue to local match
    }
  }

  // 3. Fallback matching from local presets and coordinates
  const q = clean.toLowerCase();
  const results = [];
  const seen = new Set();
  for (const item of [...PRESET_LOCATIONS, ...FALLBACK_LOCATIONS]) {
    const addr = item.address;
    if (!addr) continue;
    const name = item.name || "";
    const city = item.city || "";
    const matchKey = item.match || "";
    const text = `${matchKey} ${name} ${addr} ${city}`.toLowerCase();
    if (text.includes(q) || (matchKey && q.includes(matchKey))) {
      if (!seen.has(addr)) {
        seen.add(addr);
        results.push({
          id: `local_${results.length}`,
          description: addr,
          mainText: addr.split(",")[0] || addr,
          secondaryText: addr.split(",").slice(1).join(", ").trim() || city,
        });
      }
    }
  }

  return results;
}

/**
 * Format a single datetime for clear display on the profile page and vendor card.
 * Example output: "Tue, Nov 10, 8:00 AM"
 */
export function formatDateTimeSingle(isoOrDate) {
  if (!isoOrDate) return "Not set";
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return "Not set";

  const datePart = d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return `${datePart}, ${timePart}`;
}

/**
 * Format scheduled start and finish datetime as an operating hours range.
 * Example output:
 * Same day: "Tue, Nov 10, 8:00 AM – 2:30 PM"
 * Multi-day: "Nov 10, 8:00 PM – Nov 11, 2:00 AM"
 */
export function formatScheduledHours(startIsoOrDate, finishIsoOrDate) {
  if (!startIsoOrDate && !finishIsoOrDate) return "Not set";
  const start = startIsoOrDate ? new Date(startIsoOrDate) : null;
  const finish = finishIsoOrDate ? new Date(finishIsoOrDate) : null;

  if (start && isNaN(start.getTime())) return "Not set";
  if (finish && isNaN(finish.getTime())) return "Not set";

  if (start && finish) {
    const isSameDay =
      start.getFullYear() === finish.getFullYear() &&
      start.getMonth() === finish.getMonth() &&
      start.getDate() === finish.getDate();

    const startTimeStr = start.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const finishTimeStr = finish.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    if (isSameDay) {
      const datePart = start.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return `${datePart}, ${startTimeStr} – ${finishTimeStr}`;
    }

    const startDatePart = start.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    const finishDatePart = finish.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
    return `${startDatePart}, ${startTimeStr} – ${finishDatePart}, ${finishTimeStr}`;
  }

  if (finish) {
    return formatDateTimeSingle(finish);
  }

  if (start) {
    return `Starting ${formatDateTimeSingle(start)}`;
  }

  return "Not set";
}

/**
 * Format date/time to local YYYY-MM-DDTHH:mm string for datetime-local input.
 */
export function toLocalDatetimeString(isoOrDate) {
  if (!isoOrDate) return "";
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Format datetime for user-friendly display in profile page and vendor card.
 */
export function formatDatetimeDisplay(isoOrDate) {
  if (!isoOrDate) return "Not set";
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return String(isoOrDate);

  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  if (isToday) {
    return `Today until ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${dateStr} until ${timeStr}`;
}

/**
 * Returns a default datetime-local string (e.g. today at current time or next hour).
 */
export function getCurrentLocalDatetimeString(offsetHours = 4) {
  const d = new Date(Date.now() + offsetHours * 3600 * 1000);
  return toLocalDatetimeString(d);
}

/**
 * Parse an isolated time string like "7:30 AM", "2:30pm", "14:30", "5"
 */
function parseTimePart(timeStr, referenceDate = new Date()) {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();

  // 12-hour: 7, 7:30, 7:30am, 7:30 pm, 7pm
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const meridian = match12[3].toLowerCase();
    if (meridian === "pm" && hours < 12) hours += 12;
    if (meridian === "am" && hours === 12) hours = 0;
    const d = new Date(referenceDate);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  // 24-hour: 07:30, 14:30, 17:00
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
      const d = new Date(referenceDate);
      d.setHours(hours, minutes, 0, 0);
      return d;
    }
  }

  // Bare number: "5" or "17"
  const matchBare = clean.match(/^(\d{1,2})$/);
  if (matchBare) {
    const hours = parseInt(matchBare[1], 10);
    if (hours >= 0 && hours <= 24) {
      const d = new Date(referenceDate);
      d.setHours(hours, 0, 0, 0);
      return d;
    }
  }

  return null;
}

/**
 * Parse operating hours input and determine expiration and active window.
 */
export function parseOperatingHours(hoursStr, referenceDate = new Date()) {
  if (!hoursStr || typeof hoursStr !== "string") return null;
  const str = hoursStr.trim();
  if (!str) return null;

  // 1. Check relative duration format: "2 hours", "45 mins", "1.5h"
  const durMatch = str.match(/^(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?|h|m)$/i);
  if (durMatch) {
    const val = parseFloat(durMatch[1]);
    const unit = durMatch[2].toLowerCase();
    const ms = unit.startsWith("m") ? val * 60 * 1000 : val * 3600 * 1000;
    const startDate = new Date(referenceDate);
    const endDate = new Date(referenceDate.getTime() + ms);
    const nowMs = referenceDate.getTime();
    return {
      startDate,
      endDate,
      isExpired: nowMs >= endDate.getTime(),
      isLive: nowMs < endDate.getTime(),
    };
  }

  // 2. Range format: "7:30 AM – 2:30 PM", "9:00 AM - 5:00 PM", "10:00 - 18:00"
  const rangeMatch = str.match(
    /(?:(?:today|open|hours)?\s*:?\s*)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:–|—|-|\bto\b|\bthrough\b)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i
  );

  if (rangeMatch) {
    let startRaw = rangeMatch[1].trim();
    let endRaw = rangeMatch[2].trim();

    const endMeridian = endRaw.match(/([ap]m)/i)?.[1]?.toLowerCase();
    const startMeridian = startRaw.match(/([ap]m)/i)?.[1]?.toLowerCase();

    // If start has no AM/PM but end does (e.g. "9 - 5 PM" or "7:30 - 2:30 PM")
    if (!startMeridian && endMeridian) {
      const startNum = parseInt(startRaw.match(/\d{1,2}/)?.[0] || "0", 10);
      const endNum = parseInt(endRaw.match(/\d{1,2}/)?.[0] || "0", 10);
      if (endMeridian === "pm") {
        startRaw += startNum < endNum || startNum === 12 ? " PM" : " AM";
      } else {
        startRaw += " AM";
      }
    }

    const startDate = parseTimePart(startRaw, referenceDate);
    let endDate = parseTimePart(endRaw, referenceDate);

    if (startDate && endDate) {
      if (endDate.getTime() <= startDate.getTime()) {
        // Overnight, e.g. 8:00 PM - 2:00 AM
        endDate.setDate(endDate.getDate() + 1);
      }
      const nowMs = referenceDate.getTime();
      return {
        startDate,
        endDate,
        isExpired: nowMs >= endDate.getTime(),
        isLive: nowMs < endDate.getTime() && nowMs >= startDate.getTime(),
      };
    }
  }

  // 3. Single end time: "until 5:00 PM", "closes at 5:00 PM", "5:00 PM"
  const singleRaw = str.replace(/^(?:until|closes? at|open until|to)\s*/i, "").trim();
  const singleDate = parseTimePart(singleRaw, referenceDate);
  if (singleDate) {
    const startDate = new Date(referenceDate);
    let endDate = singleDate;
    const nowMs = referenceDate.getTime();
    return {
      startDate,
      endDate,
      isExpired: nowMs >= endDate.getTime(),
      isLive: nowMs < endDate.getTime(),
    };
  }

  // 4. ISO Date/Time format
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const nowMs = referenceDate.getTime();
    return {
      startDate: new Date(referenceDate),
      endDate: parsedDate,
      isExpired: nowMs >= parsedDate.getTime(),
      isLive: nowMs < parsedDate.getTime(),
    };
  }

  return null;
}

/**
 * Check whether the business location's operating hours have ended.
 */
export function isBusinessExpired(businessData, referenceDate = new Date()) {
  if (!businessData) return true;
  if (!businessData.hours && !businessData.expiresAt) return false;

  const nowMs = referenceDate.getTime();

  if (businessData.expiresAt) {
    const exp = new Date(businessData.expiresAt);
    if (!isNaN(exp.getTime())) {
      return nowMs >= exp.getTime();
    }
  }

  if (businessData.hours) {
    const parsed = parseOperatingHours(businessData.hours, referenceDate);
    if (parsed?.endDate) {
      return nowMs >= parsed.endDate.getTime();
    }
  }

  return false;
}

/**
 * Check whether the business has an active scheduled location and hours that haven't expired yet.
 */
export function isBusinessScheduled(businessData, referenceDate = new Date()) {
  if (!businessData) return false;
  if (!businessData.address) return false;
  const lat = Number(businessData.latitude);
  const lng = Number(businessData.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;

  if (isBusinessExpired(businessData, referenceDate)) return false;

  return Boolean(businessData.isLive || businessData.expiresAt || businessData.hours);
}

/**
 * Check whether the business should currently be displayed on the map.
 */
export function isBusinessLive(businessData, referenceDate = new Date()) {
  if (!isBusinessScheduled(businessData, referenceDate)) return false;

  if (businessData.startTime) {
    const start = new Date(businessData.startTime);
    if (!isNaN(start.getTime()) && referenceDate.getTime() < start.getTime()) {
      return false;
    }
  }

  return true;
}

export function getInitialBusinessData(name = "My Business") {
  return {
    id: "my-business",
    name: name || "My Business",
    category: "Mobile Food & Beverage",
    locationName: "",
    address: "",
    city: "",
    latitude: null,
    longitude: null,
    hours: "",
    expiresAt: null,
    startTime: null,
    isLive: false,
  };
}

function getStoredRawData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function getBusinessData(fallbackName = "My Business") {
  const parsed = getStoredRawData();
  if (parsed) {
    // If expired, reset stored data and return fresh initial state
    if (isBusinessExpired(parsed)) {
      return resetBusinessLocationHours(parsed.name || fallbackName);
    }
    return {
      ...getInitialBusinessData(parsed.name || fallbackName),
      ...parsed,
      name: parsed.name || fallbackName,
    };
  }

  return getInitialBusinessData(fallbackName);
}

export function saveBusinessData(updates) {
  const current = getStoredRawData() || getInitialBusinessData(updates?.name);

  let expiresAt = updates?.expiresAt !== undefined ? updates.expiresAt : (current.expiresAt ?? null);
  let startTime = updates?.startTime !== undefined ? updates.startTime : (current.startTime ?? null);

  if (updates?.hours && updates.hours !== current.hours) {
    const parsed = parseOperatingHours(updates.hours);
    if (parsed?.endDate && !updates.expiresAt) {
      expiresAt = parsed.endDate.toISOString();
    }
    if (parsed?.startDate && !updates.startTime) {
      startTime = parsed.startDate.toISOString();
    }
  }

  const lat = updates?.latitude != null ? Number(updates.latitude) : current.latitude;
  const lng = updates?.longitude != null ? Number(updates.longitude) : current.longitude;
  const hasValidCoords = Number.isFinite(lat) && Number.isFinite(lng);

  const next = {
    ...current,
    ...updates,
    latitude: hasValidCoords ? lat : null,
    longitude: hasValidCoords ? lng : null,
    expiresAt,
    startTime,
    isLive: updates?.isLive ?? hasValidCoords,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));

    if (hasValidCoords) {
      const coords = { lat, lng };
      localStorage.setItem("businessCoords", JSON.stringify(coords));
      localStorage.setItem("userCityCoords", JSON.stringify(coords));
      if (next.city || next.address) {
        localStorage.setItem("userCity", next.city || next.address);
      }
      window.dispatchEvent(
        new CustomEvent("userLocationUpdated", {
          detail: { city: next.city || next.address || null, latitude: lat, longitude: lng },
        })
      );
    }

    window.dispatchEvent(new CustomEvent("businessDataUpdated", { detail: next }));
  } catch {
    // ignore
  }

  return next;
}

/**
 * Reset business location and hours when time is up or when manually cleared.
 */
export function resetBusinessLocationHours(fallbackName = "My Business") {
  const current = getStoredRawData() || {};
  const reset = {
    ...current,
    id: current.id || "my-business",
    name: current.name || fallbackName,
    category: current.category || "Mobile Food & Beverage",
    locationName: "",
    address: "",
    city: "",
    latitude: null,
    longitude: null,
    hours: "",
    expiresAt: null,
    startTime: null,
    isLive: false,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
    localStorage.removeItem("businessCoords");

    // Clear userCityCoords if it matched business location
    const storedCity = localStorage.getItem("userCity");
    if (!storedCity || storedCity === current.city || storedCity === current.address) {
      localStorage.removeItem("userCityCoords");
      localStorage.removeItem("userCity");
      window.dispatchEvent(
        new CustomEvent("userLocationUpdated", {
          detail: { city: null, latitude: null, longitude: null },
        })
      );
    }

    window.dispatchEvent(new CustomEvent("businessDataUpdated", { detail: reset }));
  } catch {
    // ignore
  }

  return reset;
}
