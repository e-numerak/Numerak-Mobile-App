import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useCreateCustomer } from '../../../../../src/hooks/useCustomers';
import type { CustomerType } from '../../../../../src/types/customer.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';
const GREEN = '#16a34a';

const CUSTOMER_TYPES: { label: string; value: CustomerType }[] = [
  { label: 'B2B — Business to Business', value: 'b2b' },
  { label: 'B2G — Business to Government', value: 'b2g' },
  { label: 'B2C — Business to Consumer', value: 'b2c' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type PickedFile = { uri: string; name: string; type: string };

export default function CreateCustomerScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();
  const { mutate: createCustomer, isPending } = useCreateCustomer(companyId);

  // Customer details
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('b2b');

  // Tax information
  const [trn, setTrn] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [trnIssueDate, setTrnIssueDate] = useState('');
  const [trnExpiryDate, setTrnExpiryDate] = useState('');
  const [vatSameAsTrn, setVatSameAsTrn] = useState(false);

  // Documents (both mandatory)
  const [trnDocument, setTrnDocument] = useState<PickedFile | null>(null);
  const [logo, setLogo] = useState<PickedFile | null>(null);

  // Address & contact
  const [country, setCountry] = useState('AE');
  const [city, setCity] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      setName('');
      setLegalName('');
      setCustomerType('b2b');
      setTrn('');
      setVatNumber('');
      setTrnIssueDate('');
      setTrnExpiryDate('');
      setVatSameAsTrn(false);
      setTrnDocument(null);
      setLogo(null);
      setCountry('AE');
      setCity('');
      setStreetAddress('');
      setEmail('');
      setPhone('');
      setNotes('');
      setFieldErrors({});
    }, [])
  );

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const updated = { ...prev };
      delete updated[field];
      return updated;
    });
  };

  const handleTrnChange = (v: string) => {
    setTrn(v);
    clearFieldError('trn');
    if (vatSameAsTrn) setVatNumber(v);
  };

  const toggleVatSame = () => {
    const next = !vatSameAsTrn;
    setVatSameAsTrn(next);
    if (next) {
      setVatNumber(trn);
      clearFieldError('vat_number');
    }
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access to select a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLogo({
        uri: asset.uri,
        name: asset.fileName ?? `logo_${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
      clearFieldError('logo');
    }
  };

  const pickTrnDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/jpeg', 'image/png'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setTrnDocument({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType ?? 'application/pdf',
      });
      clearFieldError('trn_document');
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim()) errors.name = 'Trading name is required.';

    if (!trn.trim()) errors.trn = 'TRN is required.';
    else if (!/^\d{15}$/.test(trn.trim())) errors.trn = 'TRN must be exactly 15 digits.';

    if (!trnDocument) errors.trn_document = 'TRN certificate is required.';
    if (!logo) errors.logo = 'Customer logo is required.';

    if (!country.trim()) errors.country = 'Country is required.';
    if (!city.trim()) errors.city = 'City is required.';
    if (!streetAddress.trim()) errors.street_address = 'Street address is required.';

    if (!email.trim()) errors.email = 'Email is required.';
    else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    if (!logo || !trnDocument) return;

    createCustomer(
      {
        company_id: companyId,
        name: name.trim(),
        legal_name: legalName.trim() || undefined,
        customer_type: customerType,
        trn: trn.trim(),
        vat_number: vatNumber.trim() || undefined,
        trn_issue_date: trnIssueDate.trim() || undefined,
        trn_expiry_date: trnExpiryDate.trim() || undefined,
        country: country.trim().toUpperCase() || 'AE',
        city: city.trim(),
        street_address: streetAddress.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        notes: notes.trim() || undefined,
        logo,
        trn_document: trnDocument,
      },
      {
        onSuccess: () => router.back(),
        onError: (err: any) => {
          const details = err?.response?.data?.error?.details;
          if (details && typeof details === 'object') {
            const flattened: Record<string, string> = {};
            Object.entries(details).forEach(([key, val]) => {
              flattened[key] = Array.isArray(val) ? val[0] : String(val);
            });
            setFieldErrors(flattened);
          } else {
            const message = err?.response?.data?.error?.message ?? 'Could not create customer.';
            Alert.alert('Error', message);
          }
        },
      }
    );
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'New Customer' }} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>New Customer</Text>
        <Text style={styles.pageSubtitle}>Add a customer to issue invoices to</Text>

        {/* ── Customer Details ── */}
        <Section title="Customer Details" icon="user">
          <View style={styles.row2}>
            <View style={styles.col}>
              <Field
                label="Trading Name"
                required
                value={name}
                onChangeText={(v: string) => {
                  setName(v);
                  clearFieldError('name');
                }}
                error={fieldErrors.name}
                placeholder="Acme LLC"
              />
            </View>
            <View style={styles.col}>
              <Field
                label="Legal Name"
                value={legalName}
                onChangeText={setLegalName}
                placeholder="Legal company name"
              />
            </View>
          </View>

          <Text style={styles.fieldLabel}>
            Customer Type <Text style={styles.requiredStar}>*</Text>
          </Text>
          <View style={styles.chipsWrap}>
            {CUSTOMER_TYPES.map((t) => {
              const active = customerType === t.value;
              return (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCustomerType(t.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Section>

        {/* ── Tax Information ── */}
        <Section title="Tax Information" icon="file-text">
          <Field
            label="TRN"
            required
            value={trn}
            onChangeText={handleTrnChange}
            error={fieldErrors.trn}
            placeholder="123456789012345"
            keyboardType="number-pad"
            maxLength={15}
            hint="Required for UAE B2B / B2G — 15 digits"
          />

          <Field
            label="VAT Number (optional)"
            value={vatNumber}
            onChangeText={(v: string) => {
              setVatNumber(v);
              clearFieldError('vat_number');
            }}
            error={fieldErrors.vat_number}
            placeholder="123456789012345"
            keyboardType="number-pad"
            editable={!vatSameAsTrn}
            hint="15-digit international VAT / tax number"
          />

          <View style={styles.row2}>
            <View style={styles.col}>
              <Field
                label="TRN Issue Date"
                value={trnIssueDate}
                onChangeText={setTrnIssueDate}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.col}>
              <Field
                label="TRN Expiry Date"
                value={trnExpiryDate}
                onChangeText={setTrnExpiryDate}
                placeholder="YYYY-MM-DD"
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.checkboxRow} onPress={toggleVatSame} activeOpacity={0.7}>
            <View style={[styles.checkbox, vatSameAsTrn && styles.checkboxChecked]}>
              {vatSameAsTrn && <Feather name="check" size={14} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>VAT Number same as TRN</Text>
          </TouchableOpacity>
        </Section>

        {/* ── Documents ── */}
        <Section title="Documents" icon="paperclip" subtitle="Both documents are required to register a customer.">
          <Text style={styles.fieldLabel}>
            TRN Certificate <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TouchableOpacity style={styles.filePicker} onPress={pickTrnDocument}>
            {trnDocument ? (
              <View style={styles.filePickedRow}>
                <Feather name="file-text" size={18} color={GREEN} />
                <Text style={styles.filePickedText} numberOfLines={1}>{trnDocument.name}</Text>
              </View>
            ) : (
              <View style={styles.filePickedRow}>
                <Feather name="upload" size={16} color={SLATE} />
                <Text style={styles.filePickerText}>Choose file — PDF, JPG or PNG</Text>
              </View>
            )}
          </TouchableOpacity>
          {fieldErrors.trn_document && <Text style={styles.errorText}>{fieldErrors.trn_document}</Text>}

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
            Customer Logo <Text style={styles.requiredStar}>*</Text>
          </Text>
          <TouchableOpacity style={styles.filePicker} onPress={pickLogo}>
            {logo ? (
              <View style={styles.filePickedRow}>
                <Image source={{ uri: logo.uri }} style={styles.logoPreview} />
                <Text style={styles.filePickedText} numberOfLines={1}>{logo.name}</Text>
              </View>
            ) : (
              <View style={styles.filePickedRow}>
                <Feather name="image" size={16} color={SLATE} />
                <Text style={styles.filePickerText}>Choose file — JPG or PNG</Text>
              </View>
            )}
          </TouchableOpacity>
          {fieldErrors.logo && <Text style={styles.errorText}>{fieldErrors.logo}</Text>}
        </Section>

        {/* ── Address & Contact ── */}
        <Section title="Address & Contact" icon="map-pin">
          <View style={styles.row2}>
            <View style={styles.col}>
              <Field
                label="Country"
                required
                value={country}
                onChangeText={(v: string) => {
                  setCountry(v.toUpperCase());
                  clearFieldError('country');
                }}
                error={fieldErrors.country}
                placeholder="AE"
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>
            <View style={styles.col}>
              <Field
                label="City"
                required
                value={city}
                onChangeText={(v: string) => {
                  setCity(v);
                  clearFieldError('city');
                }}
                error={fieldErrors.city}
                placeholder="e.g. Dubai"
              />
            </View>
          </View>

          <Field
            label="Street Address"
            required
            value={streetAddress}
            onChangeText={(v: string) => {
              setStreetAddress(v);
              clearFieldError('street_address');
            }}
            error={fieldErrors.street_address}
            placeholder="Building, street, area"
          />

          <View style={styles.row2}>
            <View style={styles.col}>
              <Field
                label="Email"
                required
                value={email}
                onChangeText={(v: string) => {
                  setEmail(v);
                  clearFieldError('email');
                }}
                error={fieldErrors.email}
                placeholder="name@company.ae"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.col}>
              <Field
                label="Phone"
                value={phone}
                onChangeText={setPhone}
                placeholder="50 123 4567"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <Field
            label="Notes"
            value={notes}
            onChangeText={setNotes}
            placeholder="Payment terms, special requirements…"
            multiline
          />
        </Section>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={isPending}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Create Customer</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

function Section({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={styles.sectionIcon}>
          <Feather name={icon} size={16} color={NAVY} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <View style={{ marginTop: 14 }}>{children}</View>
    </View>
  );
}

function Field({ label, required, error, hint, ...inputProps }: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.requiredStar}>*</Text>}
      </Text>
      <TextInput
        style={[
          styles.input,
          inputProps.multiline && styles.inputMultiline,
          error && styles.inputError,
          inputProps.editable === false && styles.inputDisabled,
        ]}
        placeholderTextColor="#94a3b8"
        {...inputProps}
      />
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hintText}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 40 },

  pageTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 14, color: SLATE, marginTop: 4, marginBottom: 8 },

  section: {
    backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER,
    padding: 18, marginTop: 14,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  sectionIcon: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#eef2f8',
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  sectionSubtitle: { fontSize: 13, color: SLATE, marginTop: 2 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  requiredStar: { color: ERROR },
  input: {
    backgroundColor: '#f9fafc', borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#1e293b',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: ERROR },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4 },
  hintText: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

  row2: { flexDirection: 'row', gap: 12 },
  col: { flex: 1 },

  chipsWrap: { gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 11, borderRadius: 10,
    borderWidth: 1.5, borderColor: BORDER, backgroundColor: '#f9fafc',
  },
  chipActive: { backgroundColor: '#eef2f8', borderColor: NAVY },
  chipText: { fontSize: 14, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: NAVY, fontWeight: '700' },

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: '#cbd5e1',
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: NAVY, borderColor: NAVY },
  checkboxLabel: { fontSize: 14, color: '#334155', fontWeight: '500' },

  filePicker: {
    backgroundColor: '#f9fafc', borderWidth: 1.5, borderColor: BORDER, borderStyle: 'dashed',
    borderRadius: 10, padding: 14, justifyContent: 'center', minHeight: 52,
  },
  filePickerText: { fontSize: 14, color: SLATE, fontWeight: '500' },
  filePickedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filePickedText: { fontSize: 14, color: GREEN, fontWeight: '600', flexShrink: 1 },
  logoPreview: { width: 32, height: 32, borderRadius: 6 },

  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  cancelButton: {
    flex: 1, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
    borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff',
  },
  cancelButtonText: { color: SLATE, fontSize: 15, fontWeight: '700' },
  submitButton: { flex: 2, backgroundColor: NAVY, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
