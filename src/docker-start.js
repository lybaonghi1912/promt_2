import { spawnSync } from "node:child_process";

// The host uses localhost:5433; containers reach PostgreSQL at db:5432.
const databaseUrl = new URL("postgresql://db:5432/");
for (const key of ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"]) {
  if (!process.env[key]) throw new Error(key + " is required");
}
databaseUrl.username = process.env.POSTGRES_USER;
databaseUrl.password = process.env.POSTGRES_PASSWORD;
databaseUrl.pathname = "/" + encodeURIComponent(process.env.POSTGRES_DB);
process.env.DATABASE_URL = databaseUrl.toString();

for (const args of [
  ["node_modules/prisma/build/index.js", "migrate", "deploy", "--config", "prisma7.config.ts"],
  ["prisma/seed.js"],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.error || result.status !== 0) {
    console.error("Database initialization failed");
    process.exit(result.status || 1);
  }
}
await import("./server.js");
