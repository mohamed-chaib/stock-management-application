import Database from 'better-sqlite3'
import path from 'node:path'
import { app } from 'electron'

let db: Database.Database | null = null

export function getDB() {
  if (db) return db

  const dbPath = path.join(app.getPath('userData'), 'stock-manager.db')
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = OFF') // OFF during schema setup to allow ALTER TABLE migrations

  // ─── Step 1: Create all tables (fresh install path) ───────────────────────
  // The Sales table NOW includes client_id, paid_amount, and status from the start.
  // This was the root cause of "no such column: client_id" on fresh Windows installs —
  // the old CREATE TABLE was missing those columns and the index referenced them before migration ran.
  db.exec(`
    CREATE TABLE IF NOT EXISTS Users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'cashier',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Products (
        id TEXT PRIMARY KEY,
        barcode TEXT UNIQUE NOT NULL,
        name_en TEXT NOT NULL,
        name_ar TEXT NOT NULL,
        category TEXT,
        purchase_price REAL DEFAULT 0,
        selling_price REAL DEFAULT 0,
        stock_quantity INTEGER DEFAULT 0,
        min_stock_level INTEGER DEFAULT 5,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Clients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        total_purchases REAL DEFAULT 0,
        total_paid REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS Sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE NOT NULL,
        user_id TEXT,
        client_id TEXT DEFAULT 'default',
        total_amount REAL DEFAULT 0,
        paid_amount REAL DEFAULT 0,
        discount REAL DEFAULT 0,
        tax REAL DEFAULT 0,
        payment_method TEXT DEFAULT 'cash',
        status TEXT DEFAULT 'paid',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES Users(id),
        FOREIGN KEY(client_id) REFERENCES Clients(id)
    );

    CREATE TABLE IF NOT EXISTS Sale_Items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price REAL NOT NULL,
        subtotal REAL NOT NULL,
        FOREIGN KEY(sale_id) REFERENCES Sales(id),
        FOREIGN KEY(product_id) REFERENCES Products(id)
    );

    CREATE TABLE IF NOT EXISTS Payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        client_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_method TEXT DEFAULT 'cash',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(sale_id) REFERENCES Sales(id),
        FOREIGN KEY(client_id) REFERENCES Clients(id)
    );

    CREATE TABLE IF NOT EXISTS Settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );

    CREATE TABLE IF NOT EXISTS Stock_Entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        purchase_price REAL DEFAULT 0,
        remaining_quantity INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES Products(id)
    );

    CREATE TABLE IF NOT EXISTS Sale_Item_Batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_item_id INTEGER NOT NULL,
        stock_entry_id INTEGER NOT NULL,
        quantity_used INTEGER NOT NULL,
        profit REAL DEFAULT 0,
        FOREIGN KEY(sale_item_id) REFERENCES Sale_Items(id),
        FOREIGN KEY(stock_entry_id) REFERENCES Stock_Entries(id)
    );

    CREATE TABLE IF NOT EXISTS Stock_History (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('PURCHASE','SALE','ADJUSTMENT','RETURN')),
        quantity INTEGER NOT NULL,
        unit_price REAL DEFAULT 0,
        total_price REAL DEFAULT 0,
        reference_id TEXT,
        reference_type TEXT,
        note TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(product_id) REFERENCES Products(id)
    );
  `)

  // ─── Step 2: Migrations for existing databases ────────────────────────────
  // Each ALTER TABLE only runs if the column is missing.
  // Safe to execute on every startup.
  const salesColumns = (db.pragma('table_info(Sales)') as any[]).map((c: any) => c.name)

  if (!salesColumns.includes('client_id')) {
    db.exec(`ALTER TABLE Sales ADD COLUMN client_id TEXT DEFAULT 'default';`)
  }
  if (!salesColumns.includes('paid_amount')) {
    db.exec(`ALTER TABLE Sales ADD COLUMN paid_amount REAL DEFAULT 0;`)
    db.exec(`UPDATE Sales SET paid_amount = total_amount WHERE paid_amount IS NULL OR paid_amount = 0;`)
  }
  if (!salesColumns.includes('status')) {
    db.exec(`ALTER TABLE Sales ADD COLUMN status TEXT DEFAULT 'paid';`)
    db.exec(`UPDATE Sales SET status = 'paid' WHERE status IS NULL;`)
  }

  // ─── Step 3: Indexes ──────────────────────────────────────────────────────
  // Created AFTER migrations — columns are guaranteed to exist at this point.
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stock_entries_product_id ON Stock_Entries(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_entries_created_at ON Stock_Entries(created_at);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON Sale_Items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_payments_sale_id ON Payments(sale_id);
    CREATE INDEX IF NOT EXISTS idx_sales_client_id ON Sales(client_id);
    CREATE INDEX IF NOT EXISTS idx_sales_created_at ON Sales(created_at);
    CREATE INDEX IF NOT EXISTS idx_stock_history_product_id ON Stock_History(product_id);
    CREATE INDEX IF NOT EXISTS idx_stock_history_type ON Stock_History(type);
    CREATE INDEX IF NOT EXISTS idx_stock_history_created_at ON Stock_History(created_at);
  `)

  // ─── Step 4: Seed default data ────────────────────────────────────────────
  db.exec(`
    INSERT INTO Users (id, username, password_hash, role)
    SELECT '1', 'admin', 'admin', 'admin'
    WHERE NOT EXISTS (SELECT 1 FROM Users WHERE username = 'admin');

    INSERT INTO Clients (id, name, total_purchases, total_paid)
    SELECT 'default', 'Walk-in Customer', 0, 0
    WHERE NOT EXISTS (SELECT 1 FROM Clients WHERE id = 'default');
  `)

  // ─── Step 5: Stock_Entries backfill for legacy databases ─────────────────
  const stockEntriesCount = db.prepare('SELECT COUNT(*) as count FROM Stock_Entries').get() as { count: number }
  if (stockEntriesCount.count === 0) {
    db.exec(`
      INSERT INTO Stock_Entries (product_id, quantity, purchase_price, remaining_quantity, created_at)
      SELECT id, stock_quantity, purchase_price, stock_quantity, created_at
      FROM Products
      WHERE stock_quantity > 0;
    `)
  }

  // Re-enable foreign key enforcement after all migrations complete
  db.pragma('foreign_keys = ON')

  return db
}
