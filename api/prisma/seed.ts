import { db } from './db.js';

async function seed() {
  const existingUser = await db.orm.public.User
    .where({ email: 'seed.user@example.com' })
    .first();

  const user = existingUser ?? await db.orm.public.User.create({
    email: 'seed.user@example.com',
    name: 'Seed User',
  });

  const existingVendor = await db.orm.public.Vendor
    .where({ name: 'Seed Vendor', type: 'Food Truck' })
    .first();

  const vendor = existingVendor ?? await db.orm.public.Vendor.create({
    name: 'Seed Vendor',
    type: 'Food Truck',
  });

  console.log(`Seeded user ${user.email} and vendor ${vendor.name}.`);
}

seed()
  .catch((error: unknown) => {
    console.error('Failed to seed the database:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.close();
  });
