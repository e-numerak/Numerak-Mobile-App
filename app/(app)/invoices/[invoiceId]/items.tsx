import { useState } from 'react';
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
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useInvoice,
  useInvoiceItems,
  useAddInvoiceItem,
  useUpdateInvoiceItem,
  useDeleteInvoiceItem,
} from '../../../../src/hooks/useInvoices';
import type {
  InvoiceItem,
  VatRateType,
  CreateInvoiceItemPayload,
} from '../../../../src/types/invoice.types';

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

function money(value: string | number | null | undefined): string {
  return Number(value ?? 0).toLocaleString('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

interface ItemForm {
  item_name: string;
  description: string;
  quantity: string;
  unit: string;
  unit_price: string;
  vat_rate_type: VatRateType;
}

const emptyForm = (): ItemForm => ({
  item_name: '',
  description: '',
  quantity: '1',
  unit: '',
  unit_price: '',
  vat_rate_type: 'standard',
});

export default function InvoiceItemsScreen() {
  const { invoiceId } = useLocalSearchParams<{ invoiceId: string }>();
  const router = useRouter();

  const { data: invoice } = useInvoice(invoiceId);
  const { data: items, isLoading, isError, refetch } = useInvoiceItems(invoiceId);
  const addItem = useAddInvoiceItem(invoiceId);
  const updateItem = useUpdateInvoiceItem(invoiceId);
  const deleteItem = useDeleteInvoiceItem(invoiceId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm());

  const editable = invoice?.is_editable ?? false;
  const saving = addItem.isPending || updateItem.isPending;

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm());
    setEditorOpen(true);
  }

  function openEdit(item: InvoiceItem) {
    setEditingId(item.id);
    setForm({
      item_name: item.item_name ?? '',
      description: item.description ?? '',
      quantity: String(item.quantity ?? '1'),
      unit: item.unit ?? '',
      unit_price: String(item.unit_price ?? ''),
      vat_rate_type: item.vat_rate_type,
    });
    setEditorOpen(true);
  }

  async function handleSave() {
    if (!form.description.trim()) {
      Alert.alert('Description required', 'Please enter a description for this item.');
      return;
    }
    const qty = parseFloat(form.quantity);
    if (!(qty > 0)) {
      Alert.alert('Invalid quantity', 'Quantity must be greater than 0.');
      return;
    }
    const price = parseFloat(form.unit_price);
    if (!(price >= 0)) {
      Alert.alert('Invalid price', 'Unit price cannot be negative.');
      return;
    }

    const payload: CreateInvoiceItemPayload = {
      item_name: form.item_name.trim() || undefined,
      description: form.description.trim(),
      quantity: qty,
      unit: form.unit.trim() || undefined,
      unit_price: price,
      vat_rate_type: form.vat_rate_type,
    };

    try {
      if (editingId) {
        await updateItem.mutateAsync({ itemId: editingId, payload });
      } else {
        await addItem.mutateAsync(payload);
      }
      setEditorOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ??
        err?.response?.data?.detail ??
        'Could not save the item.';
      Alert.alert('Save failed', String(msg));
    }
  }

  function handleDelete(item: InvoiceItem) {
    Alert.alert('Remove item', `Remove "${item.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem.mutateAsync(item.id);
          } catch (err: any) {
            const msg =
              err?.response?.data?.error?.message ?? 'Could not remove the item.';
            Alert.alert('Remove failed', String(msg));
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Line Items' }} />

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backRow} onPress={() => router.back()}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>

        {invoice ? (
          <Text style={styles.subtitle}>
            {invoice.invoice_number} · {invoice.status_display}
          </Text>
        ) : null}

        {!editable && invoice ? (
          <View style={styles.lockBanner}>
            <Text style={styles.lockText}>
              🔒 This invoice is {invoice.status_display}. Items can only be changed while it is a Draft.
            </Text>
          </View>
        ) : null}

        {isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        ) : isError ? (
          <View style={styles.center}>
            <Text style={styles.emoji}>⚠️</Text>
            <Text style={styles.errorTitle}>Couldn't load items</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => refetch()}>
              <Text style={styles.primaryBtnText}>Try again</Text>
            </TouchableOpacity>
          </View>
        ) : !items || items.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emoji}>📋</Text>
            <Text style={styles.errorTitle}>No items yet</Text>
            {editable ? (
              <Text style={styles.muted}>Add a line item to get started.</Text>
            ) : null}
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemTop}>
                <Text style={styles.itemDesc}>{item.description}</Text>
                <Text style={styles.itemTotal}>{money(item.total_amount)}</Text>
              </View>
              {item.item_name ? <Text style={styles.itemName}>{item.item_name}</Text> : null}
              <Text style={styles.itemMeta}>
                {item.quantity}
                {item.unit ? ` ${item.unit}` : ''} × {money(item.unit_price)} · VAT{' '}
                {item.vat_rate_type_display} ({Number(item.vat_rate)}%) = {money(item.vat_amount)}
              </Text>

              {editable ? (
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.delBtn} onPress={() => handleDelete(item)}>
                    <Text style={styles.delBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          ))
        )}

        {/* Totals */}
        {invoice && items && items.length > 0 ? (
          <View style={styles.totalsCard}>
            <TotalRow label="Subtotal" value={money(invoice.subtotal)} />
            {Number(invoice.discount_amount) > 0 && (
              <TotalRow label="Discount" value={`−${money(invoice.discount_amount)}`} />
            )}
            <TotalRow label="VAT" value={money(invoice.total_vat)} />
            <TotalRow label={`Total (${invoice.currency})`} value={money(invoice.total_amount)} grand />
          </View>
        ) : null}

        {editable ? (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 24 }} />
      </ScrollView>

      <ItemEditorModal
        visible={editorOpen}
        editing={!!editingId}
        form={form}
        setForm={setForm}
        saving={saving}
        onClose={() => setEditorOpen(false)}
        onSave={handleSave}
      />
    </View>
  );
}

function ItemEditorModal({
  visible,
  editing,
  form,
  setForm,
  saving,
  onClose,
  onSave,
}: {
  visible: boolean;
  editing: boolean;
  form: ItemForm;
  setForm: (f: ItemForm) => void;
  saving: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const insets = useSafeAreaInsets();
  const set = (patch: Partial<ItemForm>) => setForm({ ...form, ...patch });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.sheetTitle}>{editing ? 'Edit Item' : 'Add Item'}</Text>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Label text="Item Name" />
            <TextInput
              style={styles.input}
              value={form.item_name}
              onChangeText={(v) => set({ item_name: v })}
              placeholder="e.g. IT Consulting"
              placeholderTextColor="#94a3b8"
            />

            <Label text="Description" required />
            <TextInput
              style={styles.input}
              value={form.description}
              onChangeText={(v) => set({ description: v })}
              placeholder="Description of goods / services"
              placeholderTextColor="#94a3b8"
            />

            <View style={styles.row2}>
              <View style={styles.col}>
                <Label text="Quantity" required />
                <TextInput
                  style={styles.input}
                  value={form.quantity}
                  onChangeText={(v) => set({ quantity: v })}
                  keyboardType="decimal-pad"
                  placeholder="1"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={styles.col}>
                <Label text="Unit" />
                <TextInput
                  style={styles.input}
                  value={form.unit}
                  onChangeText={(v) => set({ unit: v })}
                  placeholder="pcs / hr / kg"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <Label text="Unit Price (excl. VAT)" required />
            <TextInput
              style={styles.input}
              value={form.unit_price}
              onChangeText={(v) => set({ unit_price: v })}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor="#94a3b8"
            />

            <Label text="VAT Rate" />
            <View style={styles.vatRow}>
              {VAT_RATES.map((r) => {
                const active = r.value === form.vat_rate_type;
                return (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.vatChip, active && styles.vatChipActive]}
                    onPress={() => set({ vat_rate_type: r.value })}
                  >
                    <Text style={[styles.vatChipText, active && styles.vatChipTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Add Item'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <Text style={styles.label}>
      {text}
      {required && <Text style={styles.req}> *</Text>}
    </Text>
  );
}

function TotalRow({ label, value, grand }: { label: string; value: string; grand?: boolean }) {
  return (
    <View style={[styles.totalRow, grand && styles.grandRow]}>
      <Text style={[styles.totalLabel, grand && styles.grandLabel]}>{label}</Text>
      <Text style={[styles.totalValue, grand && styles.grandValue]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16 },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },

  backRow: { marginBottom: 6 },
  backText: { fontSize: 15, color: SLATE, fontWeight: '600' },
  subtitle: { fontSize: 13, color: SLATE, fontWeight: '600', marginBottom: 12 },

  lockBanner: {
    backgroundColor: '#fffbeb', borderColor: '#fde68a', borderWidth: 1,
    borderRadius: 12, padding: 12, marginBottom: 14,
  },
  lockText: { color: '#92400e', fontSize: 13 },

  itemCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 14, marginBottom: 10,
  },
  itemTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemDesc: { fontSize: 14, fontWeight: '700', color: '#0f172a', flex: 1, paddingRight: 10 },
  itemTotal: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  itemName: { fontSize: 12, color: SLATE, marginTop: 2 },
  itemMeta: { fontSize: 12, color: SLATE, marginTop: 6 },
  itemActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: NAVY,
  },
  editBtnText: { color: NAVY, fontWeight: '700', fontSize: 13 },
  delBtn: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 8,
    borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fef2f2',
  },
  delBtnText: { color: ERROR, fontWeight: '700', fontSize: 13 },

  totalsCard: {
    backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: BORDER,
    padding: 16, marginTop: 6, marginBottom: 14,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  totalLabel: { fontSize: 13, color: SLATE },
  totalValue: { fontSize: 13, fontWeight: '600', color: '#334155' },
  grandRow: { borderTopWidth: 1, borderTopColor: BORDER, marginTop: 6, paddingTop: 10 },
  grandLabel: { fontSize: 16, fontWeight: '800', color: NAVY },
  grandValue: { fontSize: 16, fontWeight: '800', color: NAVY },

  addBtn: {
    borderWidth: 1.5, borderColor: NAVY, borderStyle: 'dashed', borderRadius: 10,
    paddingVertical: 13, alignItems: 'center',
  },
  addBtnText: { color: NAVY, fontWeight: '700', fontSize: 14 },

  emoji: { fontSize: 44, marginBottom: 12 },
  errorTitle: { fontSize: 17, fontWeight: '700', color: NAVY, marginBottom: 8 },
  muted: { fontSize: 13, color: SLATE },
  primaryBtn: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Editor modal
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.65)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingHorizontal: 20, paddingTop: 12, maxHeight: '88%',
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#cbd5e1', marginBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '800', color: NAVY, marginBottom: 12 },

  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 12 },
  req: { color: ERROR, fontWeight: '700' },
  input: {
    borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    backgroundColor: '#f9fafc', color: '#0f172a',
  },
  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  vatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vatChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff',
  },
  vatChipActive: { backgroundColor: NAVY, borderColor: NAVY },
  vatChipText: { fontSize: 13, color: SLATE, fontWeight: '600' },
  vatChipTextActive: { color: '#fff' },

  saveBtn: {
    backgroundColor: NAVY, borderRadius: 12, paddingVertical: 15,
    alignItems: 'center', marginTop: 20,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
