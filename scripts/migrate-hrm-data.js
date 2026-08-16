/**
 * One-time migration: legacy HRM database  ->  merged a2it-database.
 *
 *   source: HRM_LEGACY_MONGO_URI   (cluster0.as9oeaa... / A2it-HRM)
 *   target: MONGODB_URI            (cluster0.g3sv2kc... / a2it-database)
 *
 * The HRM `users` collection is written to `hrm_users` so it never mixes with
 * the website/CMS accounts that already live in `users`.
 *
 * The script is idempotent: documents are upserted by _id, so running it again
 * refreshes the copy instead of creating duplicates. The source database is
 * only ever read.
 *
 * Usage:  npm run migrate:hrm            (copy everything)
 *         node scripts/migrate-hrm-data.js --dry-run
 */

require("dotenv").config();
const { MongoClient } = require("mongodb");
const { ensureSrvResolution } = require("../config/dns");

const SOURCE_URI = process.env.HRM_LEGACY_MONGO_URI;
const TARGET_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
const DRY_RUN = process.argv.includes("--dry-run");
const BATCH = 500;

// HRM collection -> collection name inside the merged database
const RENAME = { users: "hrm_users" };

// Collections owned by the website/CMS — the migration must never write here.
const PROTECTED = new Set([
  "users",
  "blogposts",
  "blogcategories",
  "clientlogos",
  "employees",
  "portfolios",
  "portfoliocategories",
  "promotionalpackages",
  "promotionalprojects",
  "promotionalprojectcategories",
  "roles",
  "services",
  "servicecategories",
]);

async function main() {
  if (!SOURCE_URI) throw new Error("HRM_LEGACY_MONGO_URI is not set in .env");
  if (!TARGET_URI) throw new Error("MONGODB_URI is not set in .env");

  await ensureSrvResolution(SOURCE_URI);
  await ensureSrvResolution(TARGET_URI);

  const source = new MongoClient(SOURCE_URI);
  const target = new MongoClient(TARGET_URI);

  await source.connect();
  await target.connect();

  const srcDb = source.db();
  const dstDb = target.db();

  console.log(`\n📤 source : ${srcDb.databaseName}`);
  console.log(`📥 target : ${dstDb.databaseName}`);
  if (DRY_RUN) console.log("🧪 DRY RUN — nothing will be written\n");
  else console.log("");

  const collections = (await srcDb.listCollections().toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."))
    .sort();

  const summary = [];

  for (const name of collections) {
    const targetName = RENAME[name] || name;

    if (PROTECTED.has(targetName)) {
      summary.push([name, targetName, "SKIPPED (website collection)"]);
      continue;
    }

    const srcCol = srcDb.collection(name);
    const dstCol = dstDb.collection(targetName);

    const total = await srcCol.countDocuments();
    const before = await dstCol.countDocuments().catch(() => 0);

    if (total === 0) {
      summary.push([name, targetName, `empty (target has ${before})`]);
      continue;
    }

    if (DRY_RUN) {
      summary.push([name, targetName, `${total} docs would be copied`]);
      continue;
    }

    let done = 0;
    let ops = [];
    const cursor = srcCol.find({});

    const flush = async () => {
      if (!ops.length) return;
      await dstCol.bulkWrite(ops, { ordered: false });
      done += ops.length;
      ops = [];
      process.stdout.write(`\r   ${targetName}: ${done}/${total}`);
    };

    for await (const doc of cursor) {
      ops.push({
        replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true },
      });
      if (ops.length >= BATCH) await flush();
    }
    await flush();
    process.stdout.write("\r");

    const after = await dstCol.countDocuments();
    summary.push([
      name,
      targetName,
      `${done} copied (target: ${before} → ${after})`,
    ]);
  }

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("source collection        →  target collection      result");
  console.log("────────────────────────────────────────────────────────────");
  for (const [from, to, result] of summary) {
    console.log(`${from.padEnd(24)} →  ${to.padEnd(22)} ${result}`);
  }
  console.log("────────────────────────────────────────────────────────────");
  console.log(
    DRY_RUN
      ? "\n🧪 Dry run finished — no data written.\n"
      : "\n✅ HRM data migration finished.\n",
  );

  await source.close();
  await target.close();
}

main().catch((err) => {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
});
