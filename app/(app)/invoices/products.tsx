import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useCompanies } from '../../../src/hooks/useCompanies';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../../src/hooks/useInvoices';
import type { Product, VatRateType } from '../../../src/types/invoice.types';
import { downloadProductSample, pickAndParseProducts } from '../../../src/utils/productExcel';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';

const VAT_RATES: { value: VatRateType; label: string }[] = [
  { value: 'standard', label: 'Standard 5%' },
  { value: 'zero', label: 'Zero 0%' },
  { value: 'exempt', label: 'Exempt' },
  { value: 'out_of_scope', label: 'Out of Scope' },
];

const vatLabel = (v: string) => VAT_RATES.find((x) => x.value === v)?.label ?? v;

function money(value: string | number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface ProductForm {
  name: string;
  description: string;
  unit_price: string;
  unit: string;
  vat_rate_type: VatRateType;
}

const emptyForm = (): ProductForm => ({
  name: '',
  description: '',
  unit_price: '',
  unit: '',
  vat_rate_type: 'standard',
});

export default function ProductsScreen() {
  const params = useLocalSearchParams<{ companyId?: string }>();
  const insets = useSafeAreaInsets();
  const { data: companies } = useCompanies();

  const [companyId, setCompanyId] = useState(params.companyId ?? '');
  useEffect(() => {
    if (!companyId && companies && companies.length > 0) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  const { data: products, isLoading, isError, refetch } = useProducts(companyId);
  const list = Array.isArray(products) ? products : [];
  const createProduct = useCreateProduct(companyId);
  const updateProduct = useUpdateProduct(companyId);
  const deleteProduct = useDeleteProduct(companyId);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm());
  const [uploading, setUploading] = useState(false);

  const saving = createProduct.isPending || updateProduct.isPending;

  async function handleSample() {
    try {
      await downloadProductSample();
    } catch {
      Alert.alert('Failed', 'Could not generate the sample template.');
    }
  }

  async function handleUpload() {
    if (!companyId) return;
    setUploading(true);
    try {
      const { items, errors } = await pickAndParseProducts();
      if (items.length === 0) {
        if (errors.length) Alert.alert('Nothing imported', errors.join('\n'));
        return;
      }
      let created = 0;
      const failed: string[] = [];
      for (const it of items) {
        try {
          await createProduct.mutateAsync({
            company_id: companyId,
            name: it.name,
            description: it.description || undefined,
            unit_price: it.unit_price,
            unit: it.unit || undefined,
            vat_rate_type: it.vat_rate_type,
          });
          created++;
        } catch {
          failed.push(it.name);
        }
      }
      const parts = [`${created} product(s) imported.`];
      if (errors.length) parts.push(`${errors.length} row(s) skipped.`);
      if (failed.length) parts.push(`${failed.length} failed.`);
      Alert.alert('Import complete', parts.join('\n'));
    } catch {
      Alert.alert('Upload failed', 'Could not process the file.');
    } finally {
      setUploading(false);
    }
  }

  const companyProducts = list.filter((p) => p.scope !== 'global');
  const globalProducts = list.filter((p) => p.scope === 'global');

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setOpen(true);
  }
  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name ?? '',
      description: p.description ?? '',
      unit_price: String(p.unit_price ?? ''),
      unit: p.unit ?? '',
      vat_rate_type: p.vat_rate_type,
    });
    setOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim() || form.name.trim().length < 2) {
      Alert.alert('Name required', 'Product name must be at least 2 characters.');
      return;
    }
    const price = parseFloat(form.unit_price);
    if (!(price >= 0)) {
      Alert.alert('Invalid price', 'Enter a valid unit price.');
      return;
    }
    try {
      if (editingId) {
        await updateProduct.mutateAsync({
          productId: editingId,
          payload: {
            name: form.name.trim(),
            description: form.description.trim() || undefined,
            unit_price: price,
            unit: form.unit.trim() || undefined,
            vat_rate_type: form.vat_rate_type,
          },
        });
      } else {
        await createProduct.mutateAsync({
          company_id: companyId,
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          unit_price: price,
          unit: form.unit.trim() || undefined,
          vat_rate_type: form.vat_rate_type,
        });
      }
      setOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.detail ??
        'Could not save the product.';
      Alert.alert('Failed', String(msg));
    }
  }

  function handleDelete(p: Product) {
    Alert.alert('Delete product', `Remove "${p.name}" from the catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteProduct.mutateAsync(p.id);
          } catch (err: any) {
            Alert.alert('Failed', err?.response?.data?.error?.message ?? 'Could not delete product.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Product Catalog' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Saved items you can pick when creating invoices. Global items are shown to all companies.
        </Text>

        {companies && companies.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll} contentContainerStyle={styles.chipsRow}>
            {companies.map((c) => {
              const active = c.id === companyId;
              return (
                <TouchableOpacity key={c.id} style={[styles.chip, active && styles.chipActive]} onPress={() => setCompanyId(c.id)}>
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolBtn} onPress={handleSample}>
            <Feather name="download" size={15} color={NAVY} />
            <Text style={styles.toolBtnText}>Download Sample</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolBtn} onPress={handleUpload} disabled={uploading}>
            {uploading ? (
              <ActivityIndicator size="small" color={NAVY} />
            ) : (
              <>
                <Feather name="upload" size={15} color={NAVY} />
                <Text style={styles.toolBtnText}>Upload Excel</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Feather name="plus" size={16} color="#fff" />
          <Text style={styles.addBtnText}>Add Product</Text>
        </TouchableOpacity>

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Feather name="alert-triangle" size={40} color={ERROR} style={{ marginBottom: 12 }} />
            <Text style={styles.muted}>Couldn't load products.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Company products */}
            <Text style={styles.sectionLabel}>YOUR PRODUCTS</Text>
            {companyProducts.length === 0 ? (
              <Text style={styles.empty}>No products yet. Add one to reuse on invoices.</Text>
            ) : (
              companyProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  editable
                  onEdit={() => openEdit(p)}
                  onDelete={() => handleDelete(p)}
                />
              ))
            )}

            {/* Global products (read-only) */}
            {globalProducts.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>GLOBAL CATALOG (read-only)</Text>
                {globalProducts.map((p) => (
                  <ProductCard key={p.id} product={p} editable={false} />
                ))}
              </>
            )}
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Add / edit modal */}
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editingId ? 'Edit Product' : 'Add Product'}</Text>

            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Name</Text>
              <TextInput style={styles.input} value={form.name} onChangeText={(v) => setForm({ ...form, name: v })} placeholder="e.g. IT Consulting" placeholderTextColor="#94a3b8" />

              <Text style={styles.label}>Description</Text>
              <TextInput style={styles.input} value={form.description} onChangeText={(v) => setForm({ ...form, description: v })} placeholder="Optional" placeholderTextColor="#94a3b8" />

              <View style={styles.row2}>
                <View style={styles.col}>
                  <Text style={styles.label}>Unit Price</Text>
                  <TextInput style={styles.input} value={form.unit_price} onChangeText={(v) => setForm({ ...form, unit_price: v })} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor="#94a3b8" />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Unit</Text>
                  <TextInput style={styles.input} value={form.unit} onChangeText={(v) => setForm({ ...form, unit: v })} placeholder="pcs / hr" placeholderTextColor="#94a3b8" />
                </View>
              </View>

              <Text style={styles.label}>VAT Rate</Text>
              <View style={styles.vatWrap}>
                {VAT_RATES.map((r) => {
                  const active = r.value === form.vat_rate_type;
                  return (
                    <TouchableOpacity key={r.value} style={[styles.vatChip, active && styles.vatChipActive]} onPress={() => setForm({ ...form, vat_rate_type: r.value })}>
                      <Text style={[styles.vatChipText, active && styles.vatChipTextActive]}>{r.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{editingId ? 'Save Changes' : 'Add Product'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ProductCard({
  product,
  editable,
  onEdit,
  onDelete,
}: {
  product: Product;
  editable: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.productCard}>
      <View style={styles.productTop}>
        <Text style={styles.productName}>{product.name}</Text>
        <Text style={styles.productPrice}>{money(product.unit_price)}</Text>
      </View>
      {product.description ? <Text style={styles.productDesc}>{product.description}</Text> : null}
      <View style={styles.productMetaRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{vatLabel(product.vat_rate_type)}</Text>
        </View>
        {product.unit ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{product.unit}</Text>
          </View>
        ) : null}
        {!editable && (
          <View style={[styles.tag, styles.globalTag]}>
            <Text style={styles.globalTagText}>Global</Text>
          </View>
        )}
      </View>

      {editable && (
        <View style={styles.productActions}>
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Feather name="edit-2" size={13} color={NAVY} />
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.delBtn} onPress={onDelete}>
            <Feather name="trash-2" size={13} color={ERROR} />
            <Text style={styles.delBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },

  subtitle: { fontSize: 13, color: SLATE, marginBottom: 12 },

  chipsScroll: { flexGrow: 0, marginBottom: 12 },
  chipsRow: { gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  chipTextActive: { color: '#fff' },

  toolbar: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  toolBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    paddingVertical: 11, borderRadius: 10, backgroundColor: '#fff',
    borderWidth: 1, borderColor: BORDER, minHeight: 42,
  },
  toolBtnText: { color: NAVY, fontWeight: '700', fontSize: 12 },

  addBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: NAVY, borderRadius: 12, paddingVertical: 13, marginBottom: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  empty: { fontSize: 13, color: SLATE, paddingVertical: 8 },

  productCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER, padding: 14, marginBottom: 10 },
  productTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  productName: { fontSize: 15, fontWeight: '700', color: '#0f172a', flex: 1, paddingRight: 10 },
  productPrice: { fontSize: 15, fontWeight: '800', color: NAVY },
  productDesc: { fontSize: 13, color: SLATE, marginTop: 4 },
  productMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  tag: { backgroundColor: '#eef2f8', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 11, color: NAVY, fontWeight: '700' },
  globalTag: { backgroundColor: '#fef9c3' },
  globalTagText: { fontSize: 11, color: '#854d0e', fontWeight: '700' },

  productActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: NAVY },
  editBtnText: { color: NAVY, fontWeight: '700', fontSize: 13 },
  delBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2' },
  delBtnText: { color: ERROR, fontWeight: '700', fontSize: 13 },

  muted: { fontSize: 14, color: SLATE },
  retryBtn: { backgroundColor: NAVY, paddingHorizontal: 22, paddingVertical: 10, borderRadius: 10, marginTop: 10 },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  // Modal
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 12, maxHeight: '88%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: '#cbd5e1', marginBottom: 12 },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: NAVY, marginBottom: 4 },

  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1.5, borderColor: BORDER, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#f9fafc', color: '#0f172a' },
  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  vatWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vatChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  vatChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  vatChipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  vatChipTextActive: { color: '#fff' },

  saveBtn: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
