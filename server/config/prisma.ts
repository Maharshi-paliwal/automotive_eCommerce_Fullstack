import "dotenv/config";
import { PrismaClient } from "@prisma/client/extension";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DbURL!,
});

export const prisma = new PrismaClient({ adapter });