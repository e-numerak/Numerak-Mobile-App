import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useCreateCustomer } from '../../../../../src/hooks/useCustomers';
import { WizardStepper, type WizardStep } from '../../../../../src/components/WizardStepper';
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

const STEPS: WizardStep[] = [
  { label: 'Basic Info', sub: 'Name & type', icon: 'user' },
  { label: 'Address & Contact', sub: 'Location & how to reach them', icon: 'map-pin' },
  { label: 'Tax & Documents', sub: 'TRN, VAT & required files', icon: 'file-text' },
];

type PickedFile = { uri: string; name: string; type: string };

export default function CreateCustomerScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate: createCustomer, isPending } = useCreateCustomer(companyId);

  const [step, setStep] = useState(0);

  // Customer details
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('b2b');

  // Tax information
  const [trn, setTrn] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [trnIssueDate, setTrnIssueDate] = useState('');
  const [trnExpiryDate, setTrnExpiryDate] = useState('');
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
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
      setStep(0);
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
    const digits = v.replace(/[^0-9]/g, '');
    setTrn(digits);
    clearFieldError('trn');
    if (vatSameAsTrn) setVatNumber(digits);
  };

  const toggleVatSame = () => {
    const next = !vatSameAsTrn;
    setVatSameAsTrn(next);
    if (next) { setVatNumber(trn); clearFieldError('vat_number'); }
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
      setLogo({ uri: asset.uri, name: asset.fileName ?? `logo_${Date.now()}.jpg`, type: asset.mimeType ?? 'image/jpeg' });
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
      setTrnDocument({ uri: asset.uri, name: asset.name, type: asset.mimeType ?? 'application/pdf' });
      clearFieldError('trn_document');
    }
  };

  // ── Per-step validation ──
  const validateStep = (s: number): boolean => {
    const errors: Record<string, string> = {};
    if (s === 0) {
      if (!name.trim()) errors.name = 'Trading name is required.';
    }
    if (s === 1) {
      if (!country.trim()) errors.country = 'Country is required.';
      if (!city.trim()) errors.city = 'City is required.';
      if (!streetAddress.trim()) errors.street_address = 'Street address is required.';
      if (!email.trim()) errors.email = 'Email is required.';
      else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';
    }
    if (s === 2) {
      if (!trn.trim()) errors.trn = 'TRN is required.';
      else if (!/^\d{15}$/.test(trn.trim())) errors.trn = 'TRN must be exactly 15 digits.';
      if (!trnDocument) errors.trn_document = 'TRN certificate is required.';
      if (!logo) errors.logo = 'Customer logo is required.';
    }
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    Haptics.selectionAsync().catch(() => {});
    if (!validateStep(step)) return;
    if (step < STEPS.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };
  const goBack = () => {
    Haptics.selectionAsync().catch(() => {});
    if (step === 0) router.back();
    else setStep((s) => s - 1);
  };

  const handleSubmit = () => {
    for (let s = 0; s < STEPS.length; s++) {
      if (!validateStep(s)) { setStep(s); return; }
    }
    if (!logo || !trnDocument) { setStep(2); return; }

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
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          router.back();
        },
        onError: (err: any) => {
          const details = err?.response?.data?.error?.details;
          if (details && typeof details === 'object') {
            const flattened: Record<string, string> = {};
            Object.entries(details).forEach(([key, val]) => {
              flattened[key] = Array.isArray(val) ? val[0] : String(val);
            });
            setFieldErrors(flattened);
            if (flattened.name || flattened.legal_name) setStep(0);
            else if (flattened.country || flattened.city || flattened.street_address || flattened.email) setStep(1);
            else if (flattened.trn || flattened.trn_document || flattened.logo || flattened.vat_number) setStep(2);
          } else {
            const message = err?.response?.data?.error?.message ?? 'Could not create customer.';
            Alert.alert('Error', message);
          }
        },
      }
    );
  };

  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'New Customer' }} />
      <WizardStepper steps={STEPS} current={step} />

      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bottomOffset={40}>
        {/* ══ Step 0 — Basic Info ══ */}
        {step === 0 && (
          <View style={styles.card}>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Field label="Trading Name" required value={name}
                  onChangeText={(v: string) => { setName(v); clearFieldError('name'); }}
                  error={fieldErrors.name} placeholder="Acme LLC" maxLength={120} />
              </View>
              <View style={styles.col}>
                <Field label="Legal Name" value={legalName} onChangeText={setLegalName}
                  placeholder="Legal company name" maxLength={150} />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Customer Type <Text style={styles.requiredStar}>*</Text></Text>
            <View style={styles.chipsWrap}>
              {CUSTOMER_TYPES.map((t) => {
                const active = customerType === t.value;
                return (
                  <TouchableOpacity key={t.value} style={[styles.chip, active && styles.chipActive]} onPress={() => setCustomerType(t.value)}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{t.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ══ Step 1 — Address & Contact ══ */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.row2}>
              <View style={styles.col}>
                <Field label="Country" required value={country}
                  onChangeText={(v: string) => { setCountry(v.toUpperCase()); clearFieldError('country'); }}
                  error={fieldErrors.country} placeholder="AE" maxLength={2} autoCapitalize="characters" />
              </View>
              <View style={styles.col}>
                <Field label="City" required value={city}
                  onChangeText={(v: string) => { setCity(v); clearFieldError('city'); }}
                  error={fieldErrors.city} placeholder="e.g. Dubai" maxLength={80} />
              </View>
            </View>

            <Field label="Street Address" required value={streetAddress}
              onChangeText={(v: string) => { setStreetAddress(v); clearFieldError('street_address'); }}
              error={fieldErrors.street_address} placeholder="Building, street, area" maxLength={200} />

            <View style={styles.row2}>
              <View style={styles.col}>
                <Field label="Email" required value={email}
                  onChangeText={(v: string) => { setEmail(v); clearFieldError('email'); }}
                  error={fieldErrors.email} placeholder="name@company.ae" keyboardType="email-address" autoCapitalize="none" maxLength={100} />
              </View>
              <View style={styles.col}>
                <Field label="Phone" value={phone} onChangeText={setPhone}
                  placeholder="50 123 4567" keyboardType="phone-pad" maxLength={30} />
              </View>
            </View>

            <Field label="Notes" value={notes} onChangeText={setNotes}
              placeholder="Payment terms, special requirements…" multiline maxLength={500} />
          </View>
        )}

        {/* ══ Step 2 — Tax & Documents ══ */}
        {step === 2 && (
          <View style={styles.card}>
            <Field label="TRN" required value={trn} onChangeText={handleTrnChange}
              error={fieldErrors.trn} placeholder="123456789012345" keyboardType="number-pad"
              maxLength={15} hint="Required for UAE B2B / B2G — 15 digits" />

            <Field label="VAT Number (optional)" value={vatNumber}
              onChangeText={(v: string) => { setVatNumber(v.replace(/[^0-9]/g, '')); clearFieldError('vat_number'); }}
              error={fieldErrors.vat_number} placeholder="123456789012345" keyboardType="number-pad"
              editable={!vatSameAsTrn} maxLength={15} hint="15-digit international VAT / tax number" />

            <TouchableOpacity style={styles.checkboxRow} onPress={toggleVatSame} activeOpacity={0.7}>
              <View style={[styles.checkbox, vatSameAsTrn && styles.checkboxChecked]}>
                {vatSameAsTrn && <Feather name="check" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>VAT Number same as TRN</Text>
            </TouchableOpacity>

            <View style={styles.row2}>
              <DateField style={styles.col} label="TRN Issue Date" value={trnIssueDate} onPress={() => setShowIssuePicker(true)} />
              <DateField style={styles.col} label="TRN Expiry Date" value={trnExpiryDate} onPress={() => setShowExpiryPicker(true)} />
            </View>
            {showIssuePicker && (
              <DateTimePicker
                value={trnIssueDate ? new Date(trnIssueDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, selected) => {
                  setShowIssuePicker(false);
                  if (e.type === 'set' && selected) setTrnIssueDate(selected.toISOString().slice(0, 10));
                }}
              />
            )}
            {showExpiryPicker && (
              <DateTimePicker
                value={trnExpiryDate ? new Date(trnExpiryDate) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(e, selected) => {
                  setShowExpiryPicker(false);
                  if (e.type === 'set' && selected) setTrnExpiryDate(selected.toISOString().slice(0, 10));
                }}
              />
            )}

            {/* Documents */}
            <Text style={[styles.fieldLabel, { marginTop: 4 }]}>TRN Certificate <Text style={styles.requiredStar}>*</Text></Text>
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

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Customer Logo <Text style={styles.requiredStar}>*</Text></Text>
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
          </View>
        )}

        <View style={{ height: 20 }} />
      </KeyboardAwareScrollView>

      {/* Footer nav */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} disabled={isPending}>
          <Text style={styles.backBtnText}>{step === 0 ? 'Cancel' : '‹ Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.nextBtn, isPending && { opacity: 0.6 }]} onPress={goNext} disabled={isPending}>
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : isLast ? (
            <>
              <Feather name="check" size={16} color="#fff" />
              <Text style={styles.nextBtnText}>Create Customer</Text>
            </>
          ) : (
            <>
              <Text style={styles.nextBtnText}>Next</Text>
              <Feather name="arrow-right" size={16} color="#fff" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DateField({ label, value, onPress, style }: { label: string; value: string; onPress: () => void; style?: any }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.dateInput} onPress={onPress} activeOpacity={0.7}>
        <Text style={value ? styles.dateValueText : styles.datePlaceholderText}>{value || 'Select date'}</Text>
        <Feather name="calendar" size={16} color={SLATE} />
      </TouchableOpacity>
    </View>
  );
}

function Field({ label, required, error, hint, style, ...inputProps }: any) {
  return (
    <View style={[styles.fieldWrap, style]}>
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
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 20 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16 },

  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  requiredStar: { color: ERROR },
  input: {
    backgroundColor: '#f9fafc', borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: '#1e293b',
  },
  inputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  inputError: { borderColor: ERROR, backgroundColor: '#fef2f2' },
  inputDisabled: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4, fontWeight: '600' },
  hintText: { fontSize: 12, color: '#94a3b8', marginTop: 4 },

  dateInput: {
    backgroundColor: '#f9fafc', borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dateValueText: { fontSize: 15, color: '#1e293b' },
  datePlaceholderText: { fontSize: 15, color: '#94a3b8' },

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

  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4, marginBottom: 16 },
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

  // Footer
  footer: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingTop: 12,
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: BORDER,
  },
  backBtn: {
    paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12,
    borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff', justifyContent: 'center',
  },
  backBtnText: { color: SLATE, fontWeight: '700', fontSize: 14 },
  nextBtn: {
    flex: 1, flexDirection: 'row', gap: 8, backgroundColor: NAVY, borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', justifyContent: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
