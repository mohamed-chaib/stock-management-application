import { createVerify } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { getMachineId } from './machineId'
import { PUBLIC_KEY } from './publicKey'
import { getDB } from '../database/db'

// ─── Types ───────────────────────────────────────────────────
export interface LicensePayload {
  key: string
  clientName: string
  machineId: string
  type: 'perpetual' | 'yearly' | 'trial'
  expiresAt?: string
}

interface LicenseData {
  payload: LicensePayload
  signature: string
}

export interface LicenseInfo {
  valid: boolean
  reason?: string
  key?: string
  clientName?: string
  type?: 'perpetual' | 'yearly' | 'trial'
  machineId?: string
  expiresAt?: string
  daysRemaining?: number
  activatedAt?: string
}

// ─── Signature Verification ──────────────────────────────────
function verifySignature(payload: LicensePayload, signature: string): boolean {
  try {
    const verifier = createVerify('RSA-SHA256')
    verifier.update(JSON.stringify(payload))
    verifier.end()
    return verifier.verify(PUBLIC_KEY, signature, 'base64')
  } catch {
    return false
  }
}

// ─── Decode Activation String ────────────────────────────────
function decodeLicense(activationString: string): LicenseData | null {
  try {
    const decoded = Buffer.from(activationString, 'base64').toString('utf-8')
    const data = JSON.parse(decoded)

    // Validate structure
    if (!data.payload || !data.signature) return null
    if (!data.payload.key || !data.payload.machineId || !data.payload.type) return null

    return data as LicenseData
  } catch {
    return null
  }
}

// ─── Main Validation ─────────────────────────────────────────
/**
 * Validate the stored license.
 * 
 * Checks (in order):
 * 1. License exists in Settings table
 * 2. Decodes from base64 → { payload, signature }
 * 3. RSA-SHA256 signature is valid (using embedded public key)
 * 4. Machine ID matches current hardware
 * 5. License has not expired (perpetual = no expiry)
 */
export function validateLicense(): LicenseInfo {
  const db = getDB()
  const result = db.prepare('SELECT value FROM Settings WHERE key = ?').get('license') as { value: string } | undefined

  if (!result || !result.value) {
    return { valid: false, reason: 'No license found' }
  }

  const licenseData = decodeLicense(result.value)
  if (!licenseData) {
    return { valid: false, reason: 'Invalid license format' }
  }

  const { payload, signature } = licenseData

  // ── Step 1: Verify cryptographic signature ──
  if (!verifySignature(payload, signature)) {
    return { valid: false, reason: 'License signature is invalid (tampered or forged)' }
  }

  // ── Step 2: Verify machine binding ──
  const currentMachineId = getMachineId()
  if (payload.machineId !== currentMachineId) {
    return { valid: false, reason: 'License is bound to a different machine' }
  }

  // ── Step 3: Check expiry ──
  let daysRemaining: number | undefined
  if (payload.expiresAt) {
    const expiryDate = new Date(payload.expiresAt)
    const now = new Date()
    const msRemaining = expiryDate.getTime() - now.getTime()
    daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24))

    if (daysRemaining <= 0) {
      return {
        valid: false,
        reason: `License expired on ${expiryDate.toLocaleDateString()}`,
        key: payload.key,
        clientName: payload.clientName,
        type: payload.type,
        expiresAt: payload.expiresAt,
        daysRemaining: 0,
      }
    }
  }

  // ── Step 4: Get activation date ──
  const activationRecord = db.prepare('SELECT value FROM Settings WHERE key = ?').get('license_activated_at') as { value: string } | undefined

  // ✅ License is valid
  return {
    valid: true,
    key: payload.key,
    clientName: payload.clientName,
    type: payload.type,
    machineId: payload.machineId,
    expiresAt: payload.expiresAt,
    daysRemaining,
    activatedAt: activationRecord?.value,
  }
}

// ─── Activation ──────────────────────────────────────────────
/**
 * Activate a license from an activation string.
 * 
 * Validates signature + machine binding BEFORE storing.
 * Stores both the license and the activation timestamp.
 */
export function activateLicense(activationString: string): { success: boolean; message: string } {
  // Decode
  const licenseData = decodeLicense(activationString.trim())
  if (!licenseData) {
    return { success: false, message: 'Invalid license format. Please check the activation string.' }
  }

  const { payload, signature } = licenseData

  // Verify signature FIRST (prevents storing forged licenses)
  if (!verifySignature(payload, signature)) {
    return { success: false, message: 'License signature verification failed. This key may be forged.' }
  }

  // Verify machine binding
  const currentMachineId = getMachineId()
  if (payload.machineId !== currentMachineId) {
    return {
      success: false,
      message: `License is bound to a different machine.\n\nThis machine: ${currentMachineId.substring(0, 12)}...\nLicense for:  ${payload.machineId.substring(0, 12)}...`
    }
  }

  // Check expiry before activation
  if (payload.expiresAt) {
    const expiryDate = new Date(payload.expiresAt)
    if (expiryDate.getTime() < Date.now()) {
      return { success: false, message: `This license has already expired on ${expiryDate.toLocaleDateString()}.` }
    }
  }

  // Store the license
  const db = getDB()
  const transaction = db.transaction(() => {
    db.prepare('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)').run('license', activationString.trim())
    db.prepare('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)').run('license_activated_at', new Date().toISOString())
  })
  transaction()

  return {
    success: true,
    message: `License activated successfully!\n\nClient: ${payload.clientName}\nType: ${payload.type}\nKey: ${payload.key}`
  }
}

// ─── Get License Info (for Settings page) ────────────────────
/**
 * Returns full license details for display purposes.
 * Always returns data, even if invalid (with reason).
 */
export function getLicenseInfo(): LicenseInfo {
  return validateLicense()
}
