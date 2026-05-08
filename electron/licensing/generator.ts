#!/usr/bin/env node
/**
 * ╔═══════════════════════════════════════════════════════════╗
 * ║          Stock POS — License Generator (Admin Tool)       ║
 * ║                                                           ║
 * ║   This script is for YOUR use only. NEVER ship this       ║
 * ║   with the application. Keep private.pem secure.          ║
 * ╚═══════════════════════════════════════════════════════════╝
 * 
 * Usage:
 *   npx ts-node electron/licensing/generator.ts --machineId <MACHINE_ID> --client "Client Name" --type perpetual
 *   npx ts-node electron/licensing/generator.ts --machineId <MACHINE_ID> --client "Pharmacy" --type yearly
 *   npx ts-node electron/licensing/generator.ts --generate-keypair
 * 
 * The output is a base64 activation string to send to the client.
 */

import { createSign, generateKeyPairSync, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// ─── Types ───────────────────────────────────────────────────
interface LicensePayload {
  key: string
  clientName: string
  machineId: string
  type: 'perpetual' | 'yearly' | 'trial'
  expiresAt?: string
}

// ─── Key Generation ──────────────────────────────────────────
function generateKeypair(): void {
  const keysDir = join(__dirname, 'keys')
  const privatePath = join(keysDir, 'private.pem')
  const publicPath = join(keysDir, 'public.pem')

  if (existsSync(privatePath)) {
    console.error('❌ Keys already exist! Delete them first if you want to regenerate.')
    console.error(`   ${privatePath}`)
    process.exit(1)
  }

  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  })

  writeFileSync(privatePath, privateKey, { mode: 0o600 })
  writeFileSync(publicPath, publicKey)

  console.log('✅ RSA-2048 keypair generated:')
  console.log(`   Private: ${privatePath} (KEEP SECRET!)`)
  console.log(`   Public:  ${publicPath} (ships with app)`)
}

// ─── License Key Format ──────────────────────────────────────
function generateLicenseKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const segment = () => {
    let s = ''
    const bytes = randomBytes(4)
    for (let i = 0; i < 4; i++) {
      s += chars[bytes[i] % chars.length]
    }
    return s
  }
  return `POS-${segment()}-${segment()}-${segment()}`
}

// ─── License Generation ──────────────────────────────────────
function generateLicense(machineId: string, clientName: string, type: 'perpetual' | 'yearly' | 'trial'): string {
  const privatePath = join(__dirname, 'keys', 'private.pem')

  if (!existsSync(privatePath)) {
    console.error('❌ Private key not found. Run with --generate-keypair first.')
    process.exit(1)
  }

  const privateKey = readFileSync(privatePath, 'utf8')

  // Build payload
  const payload: LicensePayload = {
    key: generateLicenseKey(),
    clientName,
    machineId,
    type,
  }

  // Set expiry based on type
  if (type === 'yearly') {
    const expiry = new Date()
    expiry.setFullYear(expiry.getFullYear() + 1)
    payload.expiresAt = expiry.toISOString()
  } else if (type === 'trial') {
    const expiry = new Date()
    expiry.setDate(expiry.getDate() + 30)
    payload.expiresAt = expiry.toISOString()
  }
  // perpetual: no expiresAt

  // Sign the payload
  const signer = createSign('RSA-SHA256')
  signer.update(JSON.stringify(payload))
  signer.end()
  const signature = signer.sign(privateKey, 'base64')

  // Create activation string
  const licenseData = { payload, signature }
  const activationString = Buffer.from(JSON.stringify(licenseData)).toString('base64')

  return activationString
}

// ─── CLI ─────────────────────────────────────────────────────
function main(): void {
  const args = process.argv.slice(2)

  if (args.includes('--generate-keypair')) {
    generateKeypair()
    return
  }

  const machineIdIdx = args.indexOf('--machineId')
  const clientIdx = args.indexOf('--client')
  const typeIdx = args.indexOf('--type')

  if (machineIdIdx === -1 || clientIdx === -1) {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         Stock POS — License Generator                      ║
╚════════════════════════════════════════════════════════════╝

Usage:
  npx ts-node electron/licensing/generator.ts \\
    --machineId <FULL_SHA256_MACHINE_ID> \\
    --client "Client Name" \\
    --type perpetual|yearly|trial

  npx ts-node electron/licensing/generator.ts --generate-keypair

Options:
  --machineId   The client's machine fingerprint (shown in app)
  --client      Client/business name
  --type        License type (default: perpetual)
                  perpetual = no expiry
                  yearly    = expires in 1 year
                  trial     = expires in 30 days
`)
    return
  }

  const machineId = args[machineIdIdx + 1]
  const clientName = args[clientIdx + 1]
  const type = (typeIdx !== -1 ? args[typeIdx + 1] : 'perpetual') as 'perpetual' | 'yearly' | 'trial'

  if (!['perpetual', 'yearly', 'trial'].includes(type)) {
    console.error(`❌ Invalid type: ${type}. Must be perpetual, yearly, or trial.`)
    process.exit(1)
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗')
  console.log('║         Generating License...                              ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  const activationString = generateLicense(machineId, clientName, type)

  console.log(`  Client:     ${clientName}`)
  console.log(`  Machine:    ${machineId.substring(0, 16)}...`)
  console.log(`  Type:       ${type}`)
  console.log(`  Key:        ${JSON.parse(Buffer.from(activationString, 'base64').toString('utf8')).payload.key}`)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ACTIVATION STRING (send this to the client):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('')
  console.log(activationString)
  console.log('')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  ✅ Done! The client pastes this string in the activation dialog.')
  console.log('')
}

main()
