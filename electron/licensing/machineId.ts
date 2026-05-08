import { machineIdSync } from 'node-machine-id'
import { createHash } from 'node:crypto'
import * as os from 'node:os'

let cachedId: string | null = null

/**
 * Generate a stable hardware fingerprint.
 * 
 * Strategy:
 * 1. Primary: node-machine-id (OS-level machine GUID — most stable)
 * 2. Fallback components: hostname + CPU model + total memory
 * 3. Combined via SHA-256 hash → deterministic, unique string
 * 
 * The result is cached for the lifetime of the process (computed once).
 */
export function getMachineId(): string {
  if (cachedId) return cachedId

  try {
    // Primary: OS-level machine ID (most reliable)
    const osId = machineIdSync()
    
    // Secondary: hardware characteristics (adds uniqueness if OS ID is shared in VM environments)
    const cpuModel = os.cpus()[0]?.model || 'unknown-cpu'
    const totalMem = os.totalmem().toString()
    const hostname = os.hostname()
    const platform = os.platform()
    const arch = os.arch()

    // Combine all signals into a single hash
    const raw = [osId, cpuModel, totalMem, hostname, platform, arch].join('|')
    cachedId = createHash('sha256').update(raw).digest('hex')

    return cachedId
  } catch (err) {
    console.error('Failed to generate machine fingerprint:', err)

    // Absolute fallback: hash whatever system info we can get
    try {
      const fallback = [
        os.hostname(),
        os.platform(),
        os.arch(),
        os.cpus()[0]?.model || '',
        os.totalmem().toString(),
      ].join('|')
      cachedId = createHash('sha256').update(fallback).digest('hex')
      return cachedId
    } catch {
      cachedId = 'UNKNOWN_MACHINE'
      return cachedId
    }
  }
}
