import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import type { VatRateType } from '../types/invoice.types';

// Column order matches the generated sample template.
const COLS = [
  { key: 'name', header: 'Name *' },
  { key: 'description', header: 'Description' },
  { key: 'unit_price', header: 'Unit Price *' },
  { key: 'unit', header: 'Unit (pcs/hr/kg)' },
  { key: 'vat_rate_type', header: 'VAT Rate (standard/zero/exempt/out_of_scope)' },
] as const;

const SAMPLE_ROWS = [
  ['IT Consulting Services', 'Monthly IT support and consulting', '1000.00', 'hr', 'standard'],
  ['Office Chair', 'Ergonomic high-back office chair', '500.00', 'pcs', 'standard'],
  ['Software License', 'Annual SaaS subscription fee', '2500.00', 'yr', 'standard'],
];

const VALID_VAT: VatRateType[] = ['standard', 'zero', 'exempt', 'out_of_scope'];

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface ParsedProduct {
  name: string;
  description: string;
  unit_price: number;
  unit: string;
  vat_rate_type: VatRateType;
}

/** Build the sample .xlsx template and open the share sheet. */
export async function downloadProductSample(): Promise<void> {
  const ws = XLSX.utils.aoa_to_sheet([COLS.map((c) => c.header), ...SAMPLE_ROWS]);
  ws['!cols'] = [28, 35, 16, 16, 42].map((w) => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');

  const base64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  const uri = `${FileSystem.cacheDirectory ?? ''}product-catalog-template.xlsx`;
  await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: XLSX_MIME, dialogTitle: 'Product template' });
  }
}

/** Pick an .xlsx/.csv file and parse it into product rows. */
export async function pickAndParseProducts(): Promise<{ items: ParsedProduct[]; errors: string[] }> {
  const res = await DocumentPicker.getDocumentAsync({
    type: [XLSX_MIME, 'application/vnd.ms-excel', 'text/csv', 'text/comma-separated-values', '*/*'],
    copyToCacheDirectory: true,
  });
  if (res.canceled || !res.assets?.[0]) return { items: [], errors: [] };

  try {
    const base64 = await FileSystem.readAsStringAsync(res.assets[0].uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const wb = XLSX.read(base64, { type: 'base64' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    if (rows.length < 2) {
      return { items: [], errors: ['The file has no data rows below the header.'] };
    }

    const header = (rows[0] as string[]).map((h) => String(h).trim().toLowerCase());
    const colMap: Record<string, number> = {};
    COLS.forEach(({ key }) => {
      const word = key.replace(/_/g, ' ');
      const idx = header.findIndex((h) => h.startsWith(word) || h.includes(word));
      if (idx !== -1) colMap[key] = idx;
    });

    const items: ParsedProduct[] = [];
    const errors: string[] = [];

    rows.slice(1).forEach((row, i) => {
      const get = (key: string) => String(row[colMap[key]] ?? '').trim();
      const rowNum = i + 2;

      const name = get('name');
      const price = get('unit_price');
      if (!name) return; // skip blank rows

      if (!price || isNaN(parseFloat(price))) {
        errors.push(`Row ${rowNum}: Unit Price is missing or invalid.`);
        return;
      }
      const vat = get('vat_rate_type').toLowerCase() as VatRateType;
      items.push({
        name,
        description: get('description'),
        unit_price: parseFloat(price),
        unit: get('unit'),
        vat_rate_type: VALID_VAT.includes(vat) ? vat : 'standard',
      });
    });

    return { items, errors };
  } catch {
    return { items: [], errors: ['Could not read the file. Make sure it is a valid .xlsx or .csv file.'] };
  }
}
