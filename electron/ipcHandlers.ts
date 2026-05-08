import { ipcMain, IpcMainInvokeEvent } from 'electron'
import { getDB } from './database/db'
import { getMachineId } from './licensing/machineId'
import { validateLicense, activateLicense, getLicenseInfo } from './licensing/validator'
import { ProductService } from './services/ProductService'
import { InventoryService } from './services/InventoryService'
import { ClientService } from './services/ClientService'
import { SaleService } from './services/SaleService'
import { ReportService } from './services/ReportService'
import { StockHistoryService } from './services/StockHistoryService'
import { FinancialReportService } from './services/FinancialReportService'

/**
 * Thin IPC routing layer. All business logic lives in the Service modules.
 * Each handler catches errors and returns { success: false, error } for write ops.
 */
export function setupIpcHandlers() {
    // --- Licensing ---
    ipcMain.handle('get-machine-id', () => getMachineId());
    ipcMain.handle('validate-license', () => validateLicense());
    ipcMain.handle('activate-license', (_: IpcMainInvokeEvent, key: string) => activateLicense(key));
    ipcMain.handle('license:getInfo', () => getLicenseInfo());

    // --- Authentication ---
    ipcMain.handle('auth:login', (_: IpcMainInvokeEvent, { username, password }: any) => {
        const db = getDB();
        const user = db.prepare('SELECT id, username, role FROM Users WHERE username = ? AND password_hash = ?').get(username, password);
        return user || null;
    });

    // --- Products ---
    ipcMain.handle('products:get', () => {
        return ProductService.getAll();
    });

    ipcMain.handle('products:create', (_: IpcMainInvokeEvent, product: any) => {
        try {
            return ProductService.create(product);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('products:update', (_: IpcMainInvokeEvent, product: any) => {
        try {
            return ProductService.update(product);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('products:delete', (_: IpcMainInvokeEvent, id: string) => {
        try {
            return ProductService.delete(id);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // --- Inventory Batches ---
    ipcMain.handle('inventory:addBatch', (_: IpcMainInvokeEvent, { productId, quantity, purchasePrice }: any) => {
        try {
            InventoryService.addBatch(productId, quantity, purchasePrice);
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('inventory:getBatches', (_: IpcMainInvokeEvent, productId: string) => {
        return InventoryService.getBatches(productId);
    });

    ipcMain.handle('inventory:getStock', (_: IpcMainInvokeEvent, productId: string) => {
        return InventoryService.getAvailableStock(productId);
    });

    // --- Clients ---
    ipcMain.handle('clients:get', () => {
        return ClientService.getAll();
    });

    ipcMain.handle('clients:create', (_: IpcMainInvokeEvent, client: any) => {
        try {
            return ClientService.create(client);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('clients:update', (_: IpcMainInvokeEvent, client: any) => {
        try {
            return ClientService.update(client);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('clients:delete', (_: IpcMainInvokeEvent, id: string) => {
        try {
            return ClientService.delete(id);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // --- Sales ---
    ipcMain.handle('sales:create', (_: IpcMainInvokeEvent, params: any) => {
        try {
            return SaleService.createSale(params);
        } catch (error: any) {
            console.error('Sale failed:', error);
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('sales:get', () => {
        return SaleService.listSales();
    });

    ipcMain.handle('sales:getDetails', (_: IpcMainInvokeEvent, saleId: number) => {
        return SaleService.getSaleDetails(saleId);
    });

    ipcMain.handle('sales:getPayments', (_: IpcMainInvokeEvent, saleId: number) => {
        return SaleService.getSalePayments(saleId);
    });

    ipcMain.handle('sales:addPayment', (_: IpcMainInvokeEvent, { saleId, amount, paymentMethod }: any) => {
        try {
            return SaleService.addPayment(saleId, amount, paymentMethod);
        } catch (error: any) {
            return { success: false, error: error.message };
        }
    });

    // --- Settings ---
    ipcMain.handle('settings:get', (_: IpcMainInvokeEvent, key: string) => {
        const db = getDB();
        const setting = db.prepare('SELECT value FROM Settings WHERE key = ?').get(key) as any;
        return setting ? setting.value : null;
    });

    ipcMain.handle('settings:set', (_: IpcMainInvokeEvent, key: string, value: string) => {
        const db = getDB();
        db.prepare('INSERT OR REPLACE INTO Settings (key, value) VALUES (?, ?)').run(key, value);
        return { success: true };
    });

    // --- Reports ---
    ipcMain.handle('reports:getFinancialSummary', (_: IpcMainInvokeEvent, filters: any = {}) => {
        return ReportService.getFinancialSummary(filters);
    });

    ipcMain.handle('reports:getDetailedFinancial', (_: IpcMainInvokeEvent, filters: any = {}) => {
        return FinancialReportService.getDetailedReport(filters);
    });

    // --- Stock History ---
    ipcMain.handle('stock:getHistory', (_: IpcMainInvokeEvent, productId: string) => {
        return StockHistoryService.getByProduct(productId);
    });

    ipcMain.handle('stock:getAllHistory', (_: IpcMainInvokeEvent, filters: any = {}) => {
        return StockHistoryService.getAll(filters);
    });

    // --- Dashboard ---
    ipcMain.handle('dashboard:metrics', () => {
        return ReportService.getDashboardMetrics();
    });

    // --- Offline Updates (lazy-loaded to avoid adm-zip resolution at startup) ---
    ipcMain.handle('update:apply', async (_: IpcMainInvokeEvent, zipPath: string) => {
        const { applyUpdate } = await import('./updater');
        return applyUpdate(zipPath);
    });

    ipcMain.handle('update:restart', async () => {
        const { restartApp } = await import('./updater');
        restartApp();
    });
}
