import { getDB } from '../database/db'
import crypto from 'node:crypto'

export class ClientService {

  static getAll() {
    const db = getDB()
    return db.prepare('SELECT * FROM Clients ORDER BY created_at DESC').all()
  }

  static create(client: any) {
    const db = getDB()

    if (!client.name || !client.name.trim()) {
      throw new Error('Client name is required')
    }

    const id = crypto.randomUUID()
    db.prepare(`
      INSERT INTO Clients (id, name, phone, email, total_purchases, total_paid)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, client.name.trim(), client.phone || '', client.email || '', 0, 0)

    return { success: true, id }
  }

  static update(client: any) {
    const db = getDB()

    if (!client.id) throw new Error('Client ID is required')
    if (!client.name || !client.name.trim()) throw new Error('Client name is required')

    db.prepare('UPDATE Clients SET name = ?, phone = ?, email = ? WHERE id = ?')
      .run(client.name.trim(), client.phone || '', client.email || '', client.id)

    return { success: true }
  }

  /**
   * Delete a client. Blocks if the client has unpaid invoices.
   */
  static delete(id: string) {
    const db = getDB()

    if (id === 'default') {
      throw new Error('Cannot delete the default Walk-in Customer')
    }

    // Check for unpaid sales
    const unpaid = db.prepare(
      "SELECT COUNT(*) as count FROM Sales WHERE client_id = ? AND status != 'paid'"
    ).get(id) as { count: number }

    if (unpaid.count > 0) {
      throw new Error(`Cannot delete client with ${unpaid.count} unpaid invoice(s)`)
    }

    db.prepare('DELETE FROM Clients WHERE id = ?').run(id)
    return { success: true }
  }
}
