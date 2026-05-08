import { useTranslation } from 'react-i18next';

interface PrintableInvoiceProps {
  sale: any;
  saleDetails: any[];
  payments: any[];
}

/**
 * Production-ready printable invoice component.
 * 
 * Designed for:
 * - Thermal printers (58mm / 80mm) — compact, monospace-friendly
 * - A4 paper — professional spacing via @media print
 * 
 * Design choices:
 * - Pure inline styles for print reliability (no Tailwind in print)
 * - Monospace font for alignment on thermal printers
 * - Dashed separators instead of heavy borders (ink-efficient)
 * - High-contrast black/white for universal printer support
 * - RTL-aware layout via dir attribute
 */
export default function PrintableInvoice({ sale, saleDetails, payments }: PrintableInvoiceProps) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const locale = isRTL ? 'ar-DZ' : 'en-GB';

  if (!sale) return null;

  const totalPaid = payments?.reduce((acc: number, p: any) => acc + p.amount, 0) ?? sale.paid_amount ?? 0;
  const balance = Math.max(0, sale.total_amount - totalPaid);
  const isPaid = balance <= 0.01;
  const isPartial = !isPaid && totalPaid > 0;
  const discount = sale.discount || 0;
  const tax = sale.tax || 0;
  const subtotal = sale.total_amount + discount - tax;
  const itemCount = saleDetails?.reduce((sum: number, item: any) => sum + item.quantity, 0) || 0;

  const createdAt = new Date(sale.created_at);
  const dateStr = createdAt.toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' });
  const timeStr = createdAt.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });

  const getProductName = (item: any) => {
    return isRTL ? (item.name_ar || item.name_en) : item.name_en;
  };

  const fmt = (n: number) => n.toFixed(2);

  // Shared inline styles for print reliability
  const styles = {
    root: {
      fontFamily: "'Courier New', 'Courier', 'Liberation Mono', monospace",
      fontSize: '11px',
      lineHeight: '1.4',
      color: '#000',
      backgroundColor: '#fff',
      width: '100%',
      maxWidth: '80mm',
      margin: '0 auto',
      padding: '6mm 4mm',
      boxSizing: 'border-box' as const,
    },
    separator: {
      borderTop: '1px dashed #000',
      margin: '6px 0',
    },
    doubleSeparator: {
      borderTop: '2px solid #000',
      margin: '6px 0',
    },
    headerTitle: {
      fontSize: '18px',
      fontWeight: 900,
      textAlign: 'center' as const,
      letterSpacing: '1px',
      margin: '0 0 2px 0',
      textTransform: 'uppercase' as const,
    },
    headerSubtext: {
      fontSize: '10px',
      textAlign: 'center' as const,
      margin: '1px 0',
      opacity: 0.8,
    },
    invoiceTitle: {
      fontSize: '14px',
      fontWeight: 900,
      textAlign: 'center' as const,
      letterSpacing: '3px',
      textTransform: 'uppercase' as const,
      margin: '4px 0',
    },
    row: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      margin: '2px 0',
      fontSize: '11px',
    },
    rowLabel: {
      fontWeight: 700,
      flexShrink: 0,
    },
    rowValue: {
      textAlign: 'end' as const,
      wordBreak: 'break-word' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '11px',
    },
    th: {
      fontWeight: 700,
      padding: '4px 2px',
      borderBottom: '1px solid #000',
      fontSize: '10px',
      textTransform: 'uppercase' as const,
    },
    td: {
      padding: '3px 2px',
      verticalAlign: 'top' as const,
    },
    tdRight: {
      padding: '3px 2px',
      textAlign: 'end' as const,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap' as const,
    },
    tdCenter: {
      padding: '3px 2px',
      textAlign: 'center' as const,
      fontWeight: 700,
    },
    totalRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '14px',
      fontWeight: 900,
      margin: '4px 0',
      padding: '4px 0',
    },
    badge: {
      display: 'inline-block',
      border: '2px solid #000',
      padding: '4px 16px',
      fontWeight: 900,
      fontSize: '13px',
      letterSpacing: '2px',
      textTransform: 'uppercase' as const,
    },
    footer: {
      fontSize: '9px',
      textAlign: 'center' as const,
      opacity: 0.7,
      marginTop: '8px',
    },
  };

  return (
    <div id="printable-invoice" style={{ ...styles.root, position: 'absolute', left: '-9999px', top: 0 }} dir={dir}>

      {/* ═══════════════ HEADER ═══════════════ */}
      <div style={{ textAlign: 'center', marginBottom: '4px' }}>
        {/* Store Logo placeholder — replace with <img> when logo is available */}
        <div style={{ fontSize: '28px', marginBottom: '2px' }}>🏪</div>
        <div style={styles.headerTitle}>{t('inv_store_name')}</div>
        <div style={styles.headerSubtext}>{t('inv_store_address')}</div>
        <div style={styles.headerSubtext}>☎ {t('inv_store_phone')}</div>
      </div>

      <div style={styles.doubleSeparator} />

      {/* ═══════════════ INVOICE TITLE + META ═══════════════ */}
      <div style={styles.invoiceTitle}>{t('inv_title')}</div>
      
      <div style={styles.separator} />

      <div style={styles.row}>
        <span style={styles.rowLabel}>{t('inv_no')}:</span>
        <span style={styles.rowValue}>{sale.invoice_number}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.rowLabel}>{t('inv_date')}:</span>
        <span style={styles.rowValue}>{dateStr}</span>
      </div>
      <div style={styles.row}>
        <span style={styles.rowLabel}>{t('inv_time')}:</span>
        <span style={styles.rowValue}>{timeStr}</span>
      </div>

      <div style={styles.separator} />

      {/* ═══════════════ CLIENT ═══════════════ */}
      <div style={styles.row}>
        <span style={styles.rowLabel}>{t('inv_client')}:</span>
        <span style={styles.rowValue}>{sale.client_name || t('inv_client_type_default')}</span>
      </div>
      {sale.client_id && sale.client_id !== 'default' && (
        <div style={{ fontSize: '9px', opacity: 0.6, marginBottom: '2px' }}>
          ({t('inv_client_type_registered')})
        </div>
      )}

      <div style={styles.doubleSeparator} />

      {/* ═══════════════ ITEMS TABLE ═══════════════ */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.th, textAlign: isRTL ? 'right' : 'left', width: '44%' }}>{t('inv_item')}</th>
            <th style={{ ...styles.th, textAlign: 'center', width: '12%' }}>{t('inv_qty')}</th>
            <th style={{ ...styles.th, textAlign: isRTL ? 'left' : 'right', width: '22%' }}>{t('inv_price')}</th>
            <th style={{ ...styles.th, textAlign: isRTL ? 'left' : 'right', width: '22%' }}>{t('inv_amount')}</th>
          </tr>
        </thead>
        <tbody>
          {saleDetails?.map((item: any, index: number) => {
            const unitPrice = item.unit_price ?? item.selling_price ?? (item.subtotal / item.quantity);
            return (
              <tr key={item.id || index} style={{ borderBottom: index < saleDetails.length - 1 ? '1px dotted #ccc' : 'none' }}>
                <td style={{ ...styles.td, wordBreak: 'break-word', maxWidth: '120px' }}>
                  {getProductName(item)}
                </td>
                <td style={styles.tdCenter}>{item.quantity}</td>
                <td style={styles.tdRight}>{fmt(unitPrice)}</td>
                <td style={{ ...styles.tdRight, fontWeight: 700 }}>{fmt(item.subtotal)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Item count */}
      <div style={{ ...styles.separator }} />
      <div style={{ fontSize: '10px', opacity: 0.6, textAlign: isRTL ? 'right' : 'left' }}>
        {itemCount} {t('inv_items_count')} × {saleDetails?.length || 0} {isRTL ? 'صنف' : 'product(s)'}
      </div>

      <div style={styles.doubleSeparator} />

      {/* ═══════════════ PAYMENT SUMMARY ═══════════════ */}
      {/* Subtotal */}
      <div style={styles.row}>
        <span>{t('inv_subtotal')}:</span>
        <span>{fmt(subtotal)} DA</span>
      </div>

      {/* Discount (only show if exists) */}
      {discount > 0 && (
        <div style={styles.row}>
          <span>{t('inv_discount')}:</span>
          <span>-{fmt(discount)} DA</span>
        </div>
      )}

      {/* Tax (only show if exists) */}
      {tax > 0 && (
        <div style={styles.row}>
          <span>{t('inv_tax')}:</span>
          <span>+{fmt(tax)} DA</span>
        </div>
      )}

      <div style={styles.separator} />

      {/* TOTAL — large and bold */}
      <div style={styles.totalRow}>
        <span>{t('inv_total')}:</span>
        <span>{fmt(sale.total_amount)} DA</span>
      </div>

      <div style={styles.separator} />

      {/* Paid */}
      <div style={styles.row}>
        <span>{t('inv_paid')}:</span>
        <span style={{ fontWeight: 700 }}>{fmt(totalPaid)} DA</span>
      </div>

      {/* Balance Due — highlighted if > 0 */}
      <div style={{
        ...styles.row,
        fontSize: balance > 0 ? '13px' : '11px',
        fontWeight: balance > 0 ? 900 : 400,
        padding: balance > 0 ? '4px 0' : '0',
      }}>
        <span>{t('inv_balance')}:</span>
        <span style={{
          fontWeight: 900,
          ...(balance > 0 ? {
            border: '1px solid #000',
            padding: '2px 8px',
          } : {})
        }}>
          {fmt(balance)} DA
        </span>
      </div>

      <div style={styles.doubleSeparator} />

      {/* ═══════════════ PAYMENT STATUS BADGE ═══════════════ */}
      <div style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={styles.badge}>
          {isPaid
            ? `✓ ${t('inv_status_paid')}`
            : isPartial
              ? `◐ ${t('inv_status_partial')}`
              : `✗ ${t('inv_status_unpaid')}`
          }
        </span>
      </div>

      {/* ═══════════════ PAYMENT HISTORY (if partial) ═══════════════ */}
      {payments && payments.length > 1 && (
        <>
          <div style={styles.separator} />
          <div style={{ fontSize: '10px', fontWeight: 700, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {t('inv_payment_history')}:
          </div>
          {payments.map((p: any, i: number) => (
            <div key={p.id || i} style={{ ...styles.row, fontSize: '10px' }}>
              <span>{new Date(p.created_at).toLocaleDateString(locale)}</span>
              <span style={{ fontWeight: 700 }}>+{fmt(p.amount)} DA</span>
            </div>
          ))}
        </>
      )}

      <div style={styles.separator} />

      {/* ═══════════════ FOOTER ═══════════════ */}
      <div style={{ textAlign: 'center', margin: '6px 0' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, marginBottom: '4px' }}>
          {t('inv_thank_you')}
        </div>
        <div style={{ fontSize: '9px', opacity: 0.6, marginBottom: '6px' }}>
          {t('inv_return_policy')}
        </div>

        {/* QR Code placeholder — future enhancement */}
        <div style={{
          width: '80px',
          height: '80px',
          margin: '6px auto',
          border: '2px dashed #ccc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '8px',
          color: '#999',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}>
          QR CODE
        </div>
      </div>

      <div style={styles.separator} />

      {/* System watermark */}
      <div style={styles.footer}>
        {t('inv_generated')}
      </div>
    </div>
  );
}
