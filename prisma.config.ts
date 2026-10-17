import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: "backend/.env" });

const datasourceUrl =
  process.env.DIRECT_URL ?? process.env.SUPABASE_DATABASE_URL;

if (!datasourceUrl) {
  throw new Error(
    "Set DIRECT_URL or SUPABASE_DATABASE_URL in backend/.env."
  );
}

export default defineConfig({
  schema: "backend/prisma/schema.prisma",
  migrations: {
    path: "backend/prisma/migrations"
  },
  datasource: {
    url: datasourceUrl
  }
});
