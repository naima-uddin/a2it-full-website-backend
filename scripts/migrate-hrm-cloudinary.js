/**
 * One-time migration: HRM profile pictures from the legacy Cloudinary account
 * (HRM_LEGACY_CLOUDINARY_*) into the single account the merged app uses
 * (CLOUDINARY_*).
 *
 * Every `hrm_users` document whose `picture` still points at the legacy cloud
 * is re-uploaded (Cloudinary fetches the old URL directly) and the document is
 * updated with the new secure URL + public_id.
 *
 * Run AFTER scripts/migrate-hrm-data.js.
 *
 * Usage:  npm run migrate:hrm-images
 *         node scripts/migrate-hrm-cloudinary.js --dry-run
 */

require("dotenv").config();
const { MongoClient } = require("mongodb");
const cloudinary = require("cloudinary").v2;
const { ensureSrvResolution } = require("../config/dns");

const TARGET_URI = process.env.MONGO_URI || process.env.MONGO_URI;
const LEGACY_CLOUD = process.env.HRM_LEGACY_CLOUDINARY_CLOUD_NAME;
const DRY_RUN = process.argv.includes("--dry-run");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

async function main() {
  if (!TARGET_URI) throw new Error("MONGO_URI is not set in .env");
  if (!LEGACY_CLOUD)
    throw new Error("HRM_LEGACY_CLOUDINARY_CLOUD_NAME is not set in .env");
  if (!process.env.CLOUDINARY_CLOUD_NAME)
    throw new Error("CLOUDINARY_CLOUD_NAME is not set in .env");

  await ensureSrvResolution(TARGET_URI);

  const client = new MongoClient(TARGET_URI);
  await client.connect();
  const users = client.db().collection("hrm_users");

  const docs = await users
    .find({ picture: { $regex: `res\\.cloudinary\\.com/${LEGACY_CLOUD}/` } })
    .project({ _id: 1, picture: 1, firstName: 1, lastName: 1, email: 1 })
    .toArray();

  console.log(
    `\n🖼️  ${docs.length} HRM profile picture(s) still on the legacy cloud "${LEGACY_CLOUD}"`,
  );
  console.log(`   → moving to "${process.env.CLOUDINARY_CLOUD_NAME}"`);
  if (DRY_RUN) console.log("🧪 DRY RUN — nothing will be uploaded/written\n");
  else console.log("");

  let moved = 0;
  let failed = 0;

  for (const doc of docs) {
    const label = doc.email || `${doc.firstName || ""} ${doc.lastName || ""}`.trim();

    if (DRY_RUN) {
      console.log(`   would move: ${label}`);
      continue;
    }

    try {
      // Cloudinary downloads the legacy URL server-side and stores a copy.
      const result = await cloudinary.uploader.upload(doc.picture, {
        folder: "hrm_profiles",
        public_id: `hrm_profile_${doc._id}_${Date.now()}`,
        overwrite: true,
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
        ],
      });

      await users.updateOne(
        { _id: doc._id },
        {
          $set: {
            picture: result.secure_url,
            picture_public_id: result.public_id,
          },
        },
      );

      moved++;
      console.log(`   ✅ ${label}`);
    } catch (error) {
      failed++;
      console.log(`   ❌ ${label} — ${error.message}`);
    }
  }

  console.log(
    DRY_RUN
      ? "\n🧪 Dry run finished.\n"
      : `\n✅ Done — ${moved} moved, ${failed} failed.\n`,
  );

  await client.close();
}

main().catch((err) => {
  console.error("\n❌ Image migration failed:", err.message);
  process.exit(1);
});
