/**
 * clean-codehike.js — Script to remove the Code Hike sub-project
 *
 * Removes the `codehike-viewer` directory and deletes any heavy React/Next.js
 * dependencies from the machine.
 */

import { rmSync, existsSync } from 'fs';
import { join } from 'path';

const viewerPath = join(process.cwd(), 'codehike-viewer');

console.log('🧹 Cleaning Code Hike dependencies...');

if (existsSync(viewerPath)) {
  try {
    rmSync(viewerPath, { recursive: true, force: true });
    console.log('✅ Successfully removed "codehike-viewer" directory.');
    console.log('   All heavy React/Next.js dependencies have been cleaned.');
  } catch (err) {
    console.error('❌ Failed to remove directory:', err.message);
  }
} else {
  console.log('ℹ️  "codehike-viewer" directory does not exist or was already cleaned.');
}
