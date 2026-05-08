import { app } from 'electron'
import { createHash } from 'node:crypto'
import { readFileSync, existsSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const AdmZip = require('adm-zip')

/**
 * Offline Manual Update System
 * 
 * Flow:
 * 1. Vendor creates an update .zip with a manifest.json inside
 * 2. Client imports the .zip via Settings
 * 3. System verifies integrity (SHA256 checksums in manifest)
 * 4. Files are extracted to the app directory
 * 5. App restarts
 * 
 * The manifest.json inside the zip must contain:
 * {
 *   "version": "1.1.0",
 *   "minVersion": "1.0.0",
 *   "files": { "relative/path": "sha256hash", ... },
 *   "migrations": ["migration_001.sql"]
 * }
 */

interface UpdateManifest {
  version: string
  minVersion: string
  files: Record<string, string>
  migrations?: string[]
}

interface UpdateResult {
  success: boolean
  message: string
  newVersion?: string
}

/**
 * Get the current app version from package.json
 */
function getCurrentVersion(): string {
  try {
    const pkgPath = join(app.getAppPath(), 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version || '1.0.0'
  } catch {
    return '1.0.0'
  }
}

/**
 * Compare semver strings: returns -1, 0, or 1
 */
function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

/**
 * Verify SHA256 hash of a buffer
 */
function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/**
 * Apply an offline update from a .zip file.
 * 
 * @param zipPath - Absolute path to the update .zip file
 */
export function applyUpdate(zipPath: string): UpdateResult {
  // 1. Validate input file exists
  if (!existsSync(zipPath)) {
    return { success: false, message: 'Update file not found.' }
  }

  try {
    const zip = new AdmZip(zipPath)
    const entries = zip.getEntries()

    // 2. Find and parse manifest
    const manifestEntry = entries.find((e: any) => e.entryName === 'manifest.json')
    if (!manifestEntry) {
      return { success: false, message: 'Invalid update package: missing manifest.json' }
    }

    const manifest: UpdateManifest = JSON.parse(manifestEntry.getData().toString('utf-8'))

    // 3. Version checks
    const currentVersion = getCurrentVersion()

    if (compareSemver(manifest.version, currentVersion) <= 0) {
      return { success: false, message: `Already on version ${currentVersion}. Update is for ${manifest.version}.` }
    }

    if (manifest.minVersion && compareSemver(currentVersion, manifest.minVersion) < 0) {
      return { success: false, message: `Current version ${currentVersion} is too old. Minimum required: ${manifest.minVersion}` }
    }

    // 4. Verify file integrity (all files in manifest must have matching hashes)
    for (const [filePath, expectedHash] of Object.entries(manifest.files)) {
      const entry = entries.find((e: any) => e.entryName === filePath)
      if (!entry) {
        return { success: false, message: `Missing file in update package: ${filePath}` }
      }
      const actualHash = sha256(entry.getData())
      if (actualHash !== expectedHash) {
        return { success: false, message: `Integrity check failed for: ${filePath}` }
      }
    }

    // 5. Create backup directory
    const appPath = app.getAppPath()
    const backupDir = join(appPath, '..', `backup-v${currentVersion}-${Date.now()}`)
    mkdirSync(backupDir, { recursive: true })

    // 6. Backup existing files that will be overwritten
    for (const filePath of Object.keys(manifest.files)) {
      const fullPath = join(appPath, filePath)
      if (existsSync(fullPath)) {
        const backupPath = join(backupDir, filePath)
        const backupParent = join(backupPath, '..')
        mkdirSync(backupParent, { recursive: true })
        copyFileSync(fullPath, backupPath)
      }
    }

    // 7. Extract files to app directory
    for (const filePath of Object.keys(manifest.files)) {
      const entry = entries.find((e: any) => e.entryName === filePath)
      if (entry) {
        const destPath = join(appPath, filePath)
        const destDir = join(destPath, '..')
        mkdirSync(destDir, { recursive: true })
        writeFileSync(destPath, entry.getData())
      }
    }

    // 8. Run SQL migrations if any
    if (manifest.migrations && manifest.migrations.length > 0) {
      // Migrations are stored as .sql files in the zip
      // They'll be applied on next startup by db.ts
      const migrationsDir = join(appPath, 'pending-migrations')
      mkdirSync(migrationsDir, { recursive: true })

      for (const migrationFile of manifest.migrations) {
        const migEntry = entries.find((e: any) => e.entryName === `migrations/${migrationFile}`)
        if (migEntry) {
          writeFileSync(join(migrationsDir, migrationFile), migEntry.getData())
        }
      }
    }

    // 9. Update version in package.json
    try {
      const pkgPath = join(appPath, 'package.json')
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
      pkg.version = manifest.version
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2))
    } catch {
      // Non-fatal: version display may be stale
    }

    return {
      success: true,
      message: `Update to v${manifest.version} applied successfully! The application will restart.`,
      newVersion: manifest.version,
    }
  } catch (err: any) {
    return {
      success: false,
      message: `Update failed: ${err.message || 'Unknown error'}`,
    }
  }
}

/**
 * Restart the application after an update.
 */
export function restartApp(): void {
  app.relaunch()
  app.exit(0)
}
