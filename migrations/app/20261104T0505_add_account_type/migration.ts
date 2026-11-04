#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/7e50b827972f4ddaf5ba6c0bdc5fe9b9a5be574bfd4c74d38a0f665829326ee5/contract';
import startContract from '../../snapshots/7e50b827972f4ddaf5ba6c0bdc5fe9b9a5be574bfd4c74d38a0f665829326ee5/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8b9a1a267ab5d15307fd0716355dee86c06c950f7115a8a2266f939c252e2206/contract';
import endContract from '../../snapshots/8b9a1a267ab5d15307fd0716355dee86c06c950f7115a8a2266f939c252e2206/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Vendor',
        column: col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Vendor',
        column: col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Vendor',
        column: col('website', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('type', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-User-type', {
        check: () => db.public.User.select('id').where((f, fns) => fns.eq(f.type, null)).limit(1),
        run: () => db.public.User.update({ type: 'customer' }).where((f, fns) => fns.eq(f.type, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'User', column: 'type' }),
      this.addColumn({
        schema: 'public',
        table: 'Vendor',
        column: col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.dataTransform(contract, 'backfill-Vendor-city', {
        check: () => db.public.Vendor.select('id').where((f, fns) => fns.eq(f.city, null)).limit(1),
        run: () => db.public.Vendor.update({ city: 'Unknown' }).where((f, fns) => fns.eq(f.city, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'Vendor', column: 'city' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
