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
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useCreateCompany } from '../../../src/hooks/useCompanies';
import { WizardStepper, type WizardStep } from '../../../src/components/WizardStepper';
import type { Emirate } from '../../../src/types/company.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';

const EMIRATES: { label: string; value: Emirate }[] = [
  { label: 'Dubai', value: 'dubai' },
  { label: 'Abu Dhabi', value: 'abu_dhabi' },
  { label: 'Sharjah', value: 'sharjah' },
  { label: 'Ajman', value: 'ajman' },
  { label: 'Umm Al Quwain', value: 'umm_al_quwain' },
  { label: 'Ras Al Khaimah', value: 'ras_al_khaimah' },
  { label: 'Fujairah', value: 'fujairah' },
];

const STEPS: WizardStep[] = [
  { label: 'Basic Info', sub: 'Name & branding', icon: 'briefcase' },
  { label: 'Address & Contact', sub: 'Location & how to reach you', icon: 'map-pin' },
  { label: 'Tax / Invoicing', sub: 'TRN & registration', icon: 'file-text' },
];

type PickedFile = { uri: string; name: string; type: string };

const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CreateCompanyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mutate: createCompany, isPending } = useCreateCompany();

  const [step, setStep] = useState(0);

  // ── Required ──
  const [name, setName] = useState('');
  const [trn, setTrn] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [country, setCountry] = useState('AE');
  const [city, setCity] = useState('');
  const [emirate, setEmirate] = useState<Emirate>('dubai');

  // ── Optional ──
  const [legalName, setLegalName] = useState('');
  const [trnIssueDate, setTrnIssueDate] = useState<Date | null>(null);
  const [trnExpiryDate, setTrnExpiryDate] = useState<Date | null>(null);
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [showExpiryPicker, setShowExpiryPicker] = useState(false);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [logo, setLogo] = useState<PickedFile | null>(null);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      setStep(0);
      setName('');
      setTrn('');
      setStreetAddress('');
      setCountry('AE');
      setCity('');
      setEmirate('dubai');
      setLegalName('');
      setTrnIssueDate(null);
      setTrnExpiryDate(null);
      setPhone('');
      setEmail('');
      setWebsite('');
      setLogo(null);
      setFieldErrors({});
    }, [])
  );

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
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
    }
  };

  // ── Per-step validation ──
  const validateStep = (s: number): boolean => {
    const errors: Record<string, string> = {};
    if (s === 0) {
      if (!name.trim()) errors.name = 'Trading name is required.';
    }
    if (s === 1) {
      if (!streetAddress.trim()) errors.street_address = 'Street address is required.';
      if (!country.trim()) errors.country = 'Country is required.';
      if (!city.trim()) errors.city = 'City is required.';
    }
    if (s === 2) {
      if (!trn.trim()) errors.trn = 'TRN is required.';
      else if (!/^\d{15}$/.test(trn.trim())) errors.trn = 'TRN must be exactly 15 numeric digits.';
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
    // Validate all steps; jump to the first with an error.
    for (let s = 0; s < STEPS.length; s++) {
      if (!validateStep(s)) { setStep(s); return; }
    }

    const payload: any = {
      name: name.trim(),
      trn: trn.trim(),
      street_address: streetAddress.trim(),
      country: country.trim().toUpperCase(),
      city: city.trim(),
      emirate,
      legal_name: legalName.trim() || undefined,
      trn_issue_date: trnIssueDate ? formatDate(trnIssueDate) : undefined,
      trn_expiry_date: trnExpiryDate ? formatDate(trnExpiryDate) : undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      website: website.trim() || undefined,
      logo: logo ?? undefined,
    };

    createCompany(payload, {
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
          // Surface the step that owns the first failing field.
          if (flattened.name) setStep(0);
          else if (flattened.street_address || flattened.country || flattened.city) setStep(1);
          else if (flattened.trn) setStep(2);
        } else {
          const message = err?.response?.data?.error?.message ?? 'Could not create company. Please try again.';
          Alert.alert('Error', message);
        }
      },
    });
  };

  const isLast = step === STEPS.length - 1;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'New Company' }} />
      <WizardStepper steps={STEPS} current={step} />

      <KeyboardAwareScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bottomOffset={40}>
        {/* ══ Step 0 — Basic Info ══ */}
        {step === 0 && (
          <View style={styles.card}>
            <View style={styles.logoRow}>
              <TouchableOpacity style={styles.logoBox} onPress={pickLogo} activeOpacity={0.8}>
                {logo ? <Image source={{ uri: logo.uri }} style={styles.logoImage} /> : <Feather name="image" size={22} color={SLATE} />}
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <TouchableOpacity style={styles.uploadButton} onPress={pickLogo}>
                  <Feather name="upload" size={14} color={NAVY} />
                  <Text style={styles.uploadButtonText}>{logo ? 'Change logo' : 'Upload logo'}</Text>
                </TouchableOpacity>
                <Text style={styles.logoHint}>PNG or JPG · appears on your invoices</Text>
              </View>
            </View>

            <Field label="Trading name" required value={name}
              onChangeText={(v: string) => { setName(v); clearFieldError('name'); }}
              error={fieldErrors.name} placeholder="Acme LLC" maxLength={120} />
            <Field label="Legal name" value={legalName} onChangeText={setLegalName}
              placeholder="Acme Limited Liability Company" maxLength={150} />
          </View>
        )}

        {/* ══ Step 1 — Address & Contact ══ */}
        {step === 1 && (
          <View style={styles.card}>
            <Field label="Street address" required value={streetAddress}
              onChangeText={(v: string) => { setStreetAddress(v); clearFieldError('street_address'); }}
              error={fieldErrors.street_address} placeholder="Office 501, Al Futtaim Tower, Festival City" maxLength={200} />

            <View style={styles.row2}>
              <Field style={styles.flex1} label="Country" required value={country}
                onChangeText={(v: string) => { setCountry(v.toUpperCase()); clearFieldError('country'); }}
                error={fieldErrors.country} placeholder="AE" maxLength={2} autoCapitalize="characters" />
              <Field style={styles.flex1} label="City" required value={city}
                onChangeText={(v: string) => { setCity(v); clearFieldError('city'); }}
                error={fieldErrors.city} placeholder="Dubai" maxLength={80} />
            </View>

            <Text style={styles.fieldLabel}>Emirate</Text>
            <View style={styles.chipsWrap}>
              {EMIRATES.map((e) => (
                <TouchableOpacity key={e.value} style={[styles.chip, emirate === e.value && styles.chipActive]}
                  onPress={() => setEmirate(e.value)}>
                  <Text style={[styles.chipText, emirate === e.value && styles.chipTextActive]}>{e.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row2}>
              <Field style={styles.flex1} label="Phone" value={phone} onChangeText={setPhone}
                placeholder="50 123 4567" keyboardType="phone-pad" maxLength={30} />
              <Field style={styles.flex1} label="Email" value={email} onChangeText={setEmail}
                placeholder="info@company.ae" keyboardType="email-address" autoCapitalize="none" maxLength={100} />
            </View>

            <Field label="Website" value={website} onChangeText={setWebsite}
              placeholder="https://company.ae" autoCapitalize="none" maxLength={150} />
          </View>
        )}

        {/* ══ Step 2 — Tax / Invoicing ══ */}
        {step === 2 && (
          <View style={styles.card}>
            <Field label="TRN" required value={trn}
              onChangeText={(v: string) => { setTrn(v.replace(/[^0-9]/g, '')); clearFieldError('trn'); }}
              error={fieldErrors.trn} placeholder="100123456700003"
              hint="Exactly 15 numeric digits — no letters or symbols" keyboardType="number-pad" maxLength={15} />

            <View style={styles.row2}>
              <DateField style={styles.flex1} label="TRN issue date" date={trnIssueDate} onPress={() => setShowIssuePicker(true)} />
              <DateField style={styles.flex1} label="TRN expiry date" date={trnExpiryDate} onPress={() => setShowExpiryPicker(true)} />
            </View>
            {showIssuePicker && (
              <DateTimePicker value={trnIssueDate ?? new Date()} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => { setShowIssuePicker(false); if (selected) setTrnIssueDate(selected); }} />
            )}
            {showExpiryPicker && (
              <DateTimePicker value={trnExpiryDate ?? new Date()} mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, selected) => { setShowExpiryPicker(false); if (selected) setTrnExpiryDate(selected); }} />
            )}

            <View style={styles.reviewNote}>
              <Feather name="check-circle" size={15} color={NAVY} />
              <Text style={styles.reviewNoteText}>All set — tap “Create Company” to finish.</Text>
            </View>
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
              <Text style={styles.nextBtnText}>Create Company</Text>
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

// ───────────────────────────────────────────
// Reusable field components
// ───────────────────────────────────────────
function Field({ label, required, error, hint, style, ...inputProps }: any) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.requiredStar}>*</Text>}
      </Text>
      <TextInput style={[styles.input, error && styles.inputError]} placeholderTextColor="#94a3b8" {...inputProps} />
      {error ? <Text style={styles.errorText}>{error}</Text> : hint ? <Text style={styles.hintText}>{hint}</Text> : null}
    </View>
  );
}

function DateField({ label, date, onPress, style }: { label: string; date: Date | null; onPress: () => void; style?: any }) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.dateInput} onPress={onPress} activeOpacity={0.7}>
        <Text style={date ? styles.dateValueText : styles.datePlaceholderText}>{date ? formatDate(date) : 'Select date'}</Text>
        <Feather name="calendar" size={16} color={SLATE} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 20 },

  card: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: BORDER, padding: 16 },

  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  logoBox: {
    width: 64, height: 64, borderRadius: 14, backgroundColor: '#eef1f5',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logoImage: { width: 64, height: 64, borderRadius: 14 },
  uploadButton: {
    flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
    borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9, backgroundColor: '#fff',
  },
  uploadButtonText: { fontSize: 14, fontWeight: '600', color: NAVY },
  logoHint: { fontSize: 12, color: SLATE, marginTop: 6 },

  // Layout helpers
  row2: { flexDirection: 'row', gap: 12 },
  flex1: { flex: 1 },

  // Fields
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  requiredStar: { color: ERROR },
  input: {
    backgroundColor: '#f9fafc', borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
  },
  inputError: { borderColor: ERROR, backgroundColor: '#fef2f2' },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4, fontWeight: '600' },
  hintText: { fontSize: 12, color: SLATE, marginTop: 4 },

  // Date field
  dateInput: {
    backgroundColor: '#f9fafc', borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dateValueText: { fontSize: 15, color: '#1e293b' },
  datePlaceholderText: { fontSize: 15, color: '#94a3b8' },

  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  reviewNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#eef2f8', borderRadius: 10, padding: 12, marginTop: 2,
  },
  reviewNoteText: { fontSize: 13, color: NAVY, fontWeight: '600' },

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
