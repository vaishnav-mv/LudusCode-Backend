/**
 * Migration: Move deprecated `solution` field into `solutions[]` array.
 *
 * For each Problem document that has a `solution` but either no `solutions`
 * array or an empty one, this script copies `solution` into `solutions[0]`
 * and then unsets the `solution` field.
 *
 * Usage:  npx ts-node scripts/migrate-solution-to-solutions.ts
 */

import mongoose from 'mongoose';
import { env } from '../src/config/env';

async function migrate() {
    await mongoose.connect(env.MONGODB_URI);
    console.log('[Migration] Connected to MongoDB');

    const db = mongoose.connection.db!;
    const collection = db.collection('problems');

    // Find all problems that still have the old `solution` field
    const cursor = collection.find({ solution: { $exists: true, $ne: null } });

    let migrated = 0;
    let skipped = 0;

    for await (const doc of cursor) {
        const existingSolutions = doc.solutions as { language: string; code: string }[] | undefined;

        // Only migrate if solutions[] is missing or empty
        if (!existingSolutions || existingSolutions.length === 0) {
            const sol = doc.solution as { language: string; code: string };
            if (sol && sol.code) {
                await collection.updateOne(
                    { _id: doc._id },
                    {
                        $set: { solutions: [{ language: sol.language || 'javascript', code: sol.code }] },
                        $unset: { solution: '' }
                    }
                );
                console.log(`  [Migrated] ${doc.title || doc._id}`);
                migrated++;
            } else {
                // solution field exists but has no useful data — just remove it
                await collection.updateOne(
                    { _id: doc._id },
                    { $unset: { solution: '' } }
                );
                console.log(`  [Cleaned]  ${doc.title || doc._id} (empty solution removed)`);
                migrated++;
            }
        } else {
            // solutions[] already populated — just remove the deprecated field
            await collection.updateOne(
                { _id: doc._id },
                { $unset: { solution: '' } }
            );
            console.log(`  [Skipped]  ${doc.title || doc._id} (solutions[] already exists, removed deprecated field)`);
            skipped++;
        }
    }

    console.log(`\n[Migration Complete] Migrated: ${migrated}, Skipped: ${skipped}`);
    await mongoose.disconnect();
}

migrate().catch((err) => {
    console.error('[Migration Error]', err);
    process.exit(1);
});
