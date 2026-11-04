import { timeStamp } from 'console';
import { db } from './db.js';
// @ts-ignore: export-vendors.js has no TypeScript declaration.
import { vendors } from './export-vendors.js';

const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'St. Louis, MO': { lat: 38.6270, lng: -90.1994 },
  'Clayton, MO': { lat: 38.6533, lng: -90.3323 },
  'Richmond Heights, MO': { lat: 38.6320, lng: -90.3292 },
  'University City, MO': { lat: 38.6559, lng: -90.3098 },
  'Maplewood, MO': { lat: 38.6117, lng: -90.3228 },
  'Webster Groves, MO': { lat: 38.5926, lng: -90.3556 },
  'Kirkwood, MO': { lat: 38.5834, lng: -90.4067 },
  'Affton, MO': { lat: 38.5528, lng: -90.3242 },
  'Creve Coeur, MO': { lat: 38.6703, lng: -90.4939 },
  'Ballwin, MO': { lat: 38.5953, lng: -90.5467 },
  'Ellisville, MO': { lat: 38.5937, lng: -90.5898 },
  'Chesterfield, MO': { lat: 38.6631, lng: -90.5772 },
  'Florissant, MO': { lat: 38.7992, lng: -90.3237 },
  'Fenton, MO': { lat: 38.5445, lng: -90.4456 },
  'Arnold, MO': { lat: 38.4328, lng: -90.3776 },
  'St. Charles, MO': { lat: 38.7881, lng: -90.4974 },
  'St. Peters, MO': { lat: 38.7992, lng: -90.6264 },
  "O'Fallon, MO": { lat: 38.7509, lng: -90.6998 },
  'Lake St. Louis, MO': { lat: 38.7962, lng: -90.7853 },
  'Wentzville, MO': { lat: 38.8109, lng: -90.8540 },
  'High Ridge, MO': { lat: 38.4656, lng: -90.5282 },
  'Edwardsville, IL': { lat: 38.8114, lng: -89.9532 },
  'Collinsville, IL': { lat: 38.6703, lng: -89.9845 },
  'Belleville, IL': { lat: 38.5201, lng: -89.9840 },
  'Alton, IL': { lat: 38.8906, lng: -90.1843 },
  'Troy, MO': { lat: 38.9792, lng: -90.9818 },
  'Columbia, MO': { lat: 38.9517, lng: -92.3341 },
  'Farmington, MO': { lat: 37.7801, lng: -90.4218 },
};

async function seed() {
  for (let i = 0; i < vendors.length; i++) {
    const existingUser = await db.orm.public.User
      .where({ email: vendors[i].email })
      .first();

    const user = existingUser ?? await db.orm.public.User.create({
      email: vendors[i].email,
      name: vendors[i].name,
      updatedAt: new Date(),
    });

    const existingVendor = await db.orm.public.Vendor
      .where({ name: vendors[i].name, type: vendors[i].type })
      .first();

    const vendor = existingVendor ?? await db.orm.public.Vendor.create({
      name: vendors[i].name,
      type: vendors[i].type,
      city: vendors[i].city,
      email: vendors[i].email ?? null,
      phone: vendors[i].phone ?? null,
      website: vendors[i].website ?? null
    });

    const existingLoc = await db.orm.public.Location
      .where({ vendorId: vendor.id })
      .first();

    if (!existingLoc) {
      const base = CITY_COORDINATES[vendor.city] || { lat: 38.6270, lng: -90.1994 };
      const latOffset = (((vendor.id * 17) % 40) - 20) * 0.0012;
      const lngOffset = (((vendor.id * 31) % 40) - 20) * 0.0012;
      await db.orm.public.Location.create({
        vendorId: vendor.id,
        latitude: Number((base.lat + latOffset).toFixed(6)),
        longitude: Number((base.lng + lngOffset).toFixed(6)),
      });
    }

    console.log(`Seeded user ${user.email} and vendor ${vendor.name}.`);
  }
}

seed()
  .catch((error: unknown) => {
    console.error('Failed to seed the database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
