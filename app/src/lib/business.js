export const PRESET_LOCATIONS = [
  {
    name: "Central West End",
    city: "St. Louis, MO",
    address: "Euclid & McPherson Ave, St. Louis, MO",
    latitude: 38.6465,
    longitude: -90.2624,
  },
  {
    name: "Downtown / Gateway Arch",
    city: "St. Louis, MO",
    address: "Market St & 4th St, St. Louis, MO",
    latitude: 38.6270,
    longitude: -90.1994,
  },
  {
    name: "Tower Grove Park",
    city: "St. Louis, MO",
    address: "4257 Northeast Dr, St. Louis, MO",
    latitude: 38.6056,
    longitude: -90.2570,
  },
  {
    name: "The Delmar Loop",
    city: "University City, MO",
    address: "6100 Delmar Blvd, University City, MO",
    latitude: 38.6559,
    longitude: -90.3098,
  },
  {
    name: "Clayton Downtown",
    city: "Clayton, MO",
    address: "Central Ave & Forsyth, Clayton, MO",
    latitude: 38.6533,
    longitude: -90.3323,
  },
  {
    name: "River Market Plaza",
    city: "Portland, OR",
    address: "1122 NW River Street, Portland, OR 97209",
    latitude: 45.5231,
    longitude: -122.6765,
  },
  {
    name: "Kirkwood Farmers Market",
    city: "Kirkwood, MO",
    address: "150 E Argonne Dr, Kirkwood, MO",
    latitude: 38.5834,
    longitude: -90.4067,
  },
  {
    name: "Maplewood Historic Strip",
    city: "Maplewood, MO",
    address: "Manchester Rd & Sutton, Maplewood, MO",
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

export function getBusinessData(fallbackName = "My Business") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...parsed,
          name: parsed.name || fallbackName,
        };
      }
    }
  } catch {
    // fallback
  }

  const defLoc = PRESET_LOCATIONS[0];
  return {
    id: "my-business",
    name: fallbackName,
    category: "Mobile Food & Beverage",
    locationName: defLoc.name,
    address: defLoc.address,
    city: defLoc.city,
    latitude: defLoc.latitude,
    longitude: defLoc.longitude,
    hours: PRESET_HOURS[0],
    isLive: true,
  };
}

export function saveBusinessData(updates) {
  const current = getBusinessData(updates?.name);
  const next = {
    ...current,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("businessDataUpdated", { detail: next }));
  } catch {
    // ignore
  }

  return next;
}

