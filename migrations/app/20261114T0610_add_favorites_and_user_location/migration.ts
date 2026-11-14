#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/21a973c31f25511ae46baf7cb9ff240e5f5670b824be139e091e84ab3b30b712/contract';
import endContract from '../../snapshots/21a973c31f25511ae46baf7cb9ff240e5f5670b824be139e091e84ab3b30b712/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/8b9a1a267ab5d15307fd0716355dee86c06c950f7115a8a2266f939c252e2206/contract';
import startContract from '../../snapshots/8b9a1a267ab5d15307fd0716355dee86c06c950f7115a8a2266f939c252e2206/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Favorite',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('userId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('vendorId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('city', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('latitude', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('longitude', 'numeric', { codecRef: { codecId: 'pg/numeric@1' } }),
      }),
      this.createIndex({
        schema: 'public',
        table: 'Favorite',
        index: 'Favorite_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Favorite',
        index: 'Favorite_vendorId_idx_95bbe6fd',
        columns: ['vendorId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Favorite',
        foreignKey: {
          name: 'Favorite_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Favorite',
        foreignKey: {
          name: 'Favorite_vendorId_fkey',
          columns: ['vendorId'],
          references: { schema: 'public', table: 'Vendor', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Favorite' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Location' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'User' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'Vendor' }),
      this.enableRowLevelSecurity({ schema: 'public', table: 'logs' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
