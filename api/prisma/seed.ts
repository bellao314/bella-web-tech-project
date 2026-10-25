import { timeStamp } from 'console';
import { db } from './db.js';
// @ts-ignore: export-vendors.js has no TypeScript declaration.
import { vendors } from './export-vendors.js';

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
