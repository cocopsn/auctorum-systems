import ReactPDF, { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';
import type { Tenant, TenantConfig, Quote } from '@quote-engine/db';

// ============================================================
// React-PDF template for quote generation
// This renders server-side and produces a professional PDF
// with the tenant's branding (logo, colors, terms)
// ============================================================

interface QuoteItemData {
  productName: string;
  productSku?: string | null;
  quantity: string;
  unitPrice: string;
  unitType?: string | null;
  lineTotal: string;
}

interface GenerateQuotePDFParams {
  tenant: Tenant;
  config: TenantConfig;
  quote: Quote;
  items: QuoteItemData[];
  logoBase64?: string | null;
  folio?: string;
}

const formatMXN = (amount: number | string) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(num);
};

const formatDate = (date: Date) =>
  new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#333' },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  logo: { width: 120, height: 50, objectFit: 'contain' },
  companyInfo: { textAlign: 'right', fontSize: 9, color: '#666' },
  companyName: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  divider: { borderBottomWidth: 2, marginVertical: 15 },
  quoteInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  infoBlock: { width: '48%' },
  label: { fontSize: 8, color: '#999', marginBottom: 2, textTransform: 'uppercase' },
  value: { fontSize: 10, marginBottom: 6 },
  table: { marginBottom: 20 },
  tableHeader: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 10 },
  tableHeaderText: { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#fff' },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  tableRowAlt: { backgroundColor: '#f8f9fa' },
  colProduct: { flex: 3 },
  colSku: { flex: 1 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1.5, textAlign: 'right' },
  colTotal: { flex: 1.5, textAlign: 'right' },
  totals: { alignItems: 'flex-end', marginBottom: 30 },
  totalRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 4, width: 250 },
  totalLabel: { flex: 1, textAlign: 'right', paddingRight: 15, fontSize: 10 },
  totalValue: { width: 100, textAlign: 'right', fontSize: 10 },
  totalFinal: { fontFamily: 'Helvetica-Bold', fontSize: 14 },
  terms: { marginTop: 20, padding: 15, backgroundColor: '#f8f9fa', borderRadius: 4, borderLeftWidth: 3 },
  termsTitle: { fontFamily: 'Helvetica-Bold', fontSize: 9, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 0.5 },
  termsText: { fontSize: 8, color: '#666', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999' },
});

function QuoteDocument({ tenant, config, quote, items, logoBase64, folio }: GenerateQuotePDFParams) {
  const primaryColor = config.colors.primary;
  const secondaryColor = config.colors.secondary || primaryColor;
  const showSku = config.quote_settings?.show_sku !== false;
  const displayFolio = folio ?? String(quote.quoteNumber ?? '').padStart(4, '0');
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + (config.quote_settings?.validity_days ?? 15));

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header: logo (if available) + company name/info */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {logoBase64 && (
              <Image src={logoBase64} style={{ width: 80, height: 80, objectFit: 'contain' }} />
            )}
            <Text style={[styles.companyName, { color: primaryColor }]}>{tenant.name}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={[styles.companyName, { color: primaryColor }]}>{tenant.name}</Text>
            <Text>{config.business.razon_social}</Text>
            {config.business.rfc && <Text>RFC: {config.business.rfc}</Text>}
            <Text>{config.contact.address}</Text>
            <Text>Tel: {config.contact.phone}</Text>
            <Text>{config.contact.email}</Text>
          </View>
        </View>

        {/* Colored divider (primary over secondary accent) */}
        <View style={[styles.divider, { borderBottomColor: primaryColor }]} />
        <View style={{ borderBottomWidth: 0.5, borderBottomColor: secondaryColor, marginBottom: 15, marginTop: -14 }} />

        {/* Quote metadata + client info */}
        <View style={styles.quoteInfo}>
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Cotización para:</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold' }]}>{quote.clientName}</Text>
            <Text style={styles.value}>{quote.clientCompany}</Text>
            {quote.clientEmail && <Text style={styles.value}>{quote.clientEmail}</Text>}
            <Text style={styles.value}>Tel: {quote.clientPhone}</Text>
          </View>
          <View style={[styles.infoBlock, { textAlign: 'right' }]}>
            <Text style={styles.label}>Cotización No.</Text>
            <Text style={[styles.value, { fontFamily: 'Helvetica-Bold', fontSize: 16, color: primaryColor }]}>
              {displayFolio}
            </Text>
            <Text style={styles.label}>Fecha de emisión</Text>
            <Text style={styles.value}>{formatDate(now)}</Text>
            <Text style={styles.label}>Válida hasta</Text>
            <Text style={styles.value}>{formatDate(validUntil)}</Text>
          </View>
        </View>

        {/* Products table */}
        <View style={styles.table}>
          <View style={[styles.tableHeader, { backgroundColor: primaryColor }]}>
            <Text style={[styles.tableHeaderText, styles.colProduct]}>Producto</Text>
            {showSku && <Text style={[styles.tableHeaderText, styles.colSku]}>SKU</Text>}
            <Text style={[styles.tableHeaderText, styles.colQty]}>Cant.</Text>
            <Text style={[styles.tableHeaderText, styles.colPrice]}>P. Unitario</Text>
            <Text style={[styles.tableHeaderText, styles.colTotal]}>Total</Text>
          </View>
          {items.map((item, i) => (
            <View key={i} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
              <Text style={styles.colProduct}>{item.productName}</Text>
              {showSku && (
                <Text style={[styles.colSku, { color: '#999', fontSize: 9 }]}>{item.productSku || '-'}</Text>
              )}
              <Text style={styles.colQty}>
                {item.quantity} {item.unitType || ''}
              </Text>
              <Text style={styles.colPrice}>{formatMXN(item.unitPrice)}</Text>
              <Text style={[styles.colTotal, { fontFamily: 'Helvetica-Bold' }]}>
                {formatMXN(item.lineTotal)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatMXN(quote.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>
              IVA ({Math.round(parseFloat(quote.taxRate || String(config.quote_settings?.tax_rate ?? 0.16)) * 100)}%):
            </Text>
            <Text style={styles.totalValue}>{formatMXN(quote.taxAmount)}</Text>
          </View>
          <View style={[styles.divider, { borderBottomColor: primaryColor, width: 250 }]} />
          <View style={styles.totalRow}>
            <Text style={[styles.totalLabel, styles.totalFinal, { color: primaryColor }]}>Total:</Text>
            <Text style={[styles.totalValue, styles.totalFinal, { color: primaryColor }]}>
              {formatMXN(quote.total)}
            </Text>
          </View>
        </View>

        {/* Terms */}
        <View style={[styles.terms, { borderLeftColor: secondaryColor }]}>
          <Text style={[styles.termsTitle, { borderBottomColor: secondaryColor }]}>Condiciones</Text>
          <Text style={styles.termsText}>Forma de pago: {config.quote_settings?.payment_terms ?? 'Por definir'}</Text>
          <Text style={styles.termsText}>Tiempo de entrega: {config.quote_settings?.delivery_terms ?? 'Por definir'}</Text>
          <Text style={styles.termsText}>Vigencia: {config.quote_settings?.validity_days ?? 15} días a partir de la fecha de emisión</Text>
          <Text style={styles.termsText}>Moneda: {config.quote_settings?.currency ?? 'MXN'}</Text>
          {config.quote_settings?.custom_footer && (
            <Text style={[styles.termsText, { marginTop: 6 }]}>{config.quote_settings.custom_footer}</Text>
          )}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Cotización generada automáticamente por {tenant.name} · {config.contact.phone} · {config.contact.email}
        </Text>
      </Page>
    </Document>
  );
}

export async function generateQuotePDF(params: GenerateQuotePDFParams): Promise<Buffer> {
  const stream = await ReactPDF.renderToStream(<QuoteDocument {...params} />);
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
