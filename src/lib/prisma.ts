import { PrismaMariaDb } from '@prisma/adapter-mariadb';

import { PrismaClient } from '../generated/prisma/client';

try {
  process.loadEnvFile();
} catch {
  // .env opcional; DATABASE_URL puede venir del entorno
}

const adapter = new PrismaMariaDb(process.env.DATABASE_URL ?? '');

export const prisma = new PrismaClient({ adapter });
