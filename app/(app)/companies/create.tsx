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
  Platform,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useCreateCompany } from '../../../src/hooks/useCompanies';
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

type PickedFile = { uri: string; name: string; type: string };

const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CreateCompanyScreen() {
  const router = useRouter();
  const { mutate: createCompany, isPending } = useCreateCompany();

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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setLogo({
        uri: asset.uri,
        name: asset.fileName ?? `logo_${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Trading name is required.';
    if (!trn.trim()) {
      errors.trn = 'TRN is required.';
    } else if (!/^\d{15}$/.test(trn.trim())) {
      errors.trn = 'TRN must be exactly 15 numeric digits.';
    }
    if (!streetAddress.trim()) errors.street_address = 'Street address is required.';
    if (!country.trim()) errors.country = 'Country is required.';
    if (!city.trim()) errors.city = 'City is required.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

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
        } else {
          const message = err?.response?.data?.error?.message ?? 'Could not create company. Please try again.';
          Alert.alert('Error', message);
        }
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'New Company' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* ── Logo ── */}
        <View style={styles.logoRow}>
          <TouchableOpacity style={styles.logoBox} onPress={pickLogo} activeOpacity={0.8}>
            {logo ? (
              <Image source={{ uri: logo.uri }} style={styles.logoImage} />
            ) : (
              <Text style={styles.logoBoxText}>No logo</Text>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickLogo}>
              <Text style={styles.uploadButtonText}>
                {logo ? 'Change logo' : 'Upload logo'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.logoHint}>PNG or JPG · appears on your invoices</Text>
          </View>
        </View>

        {/* ── Trading / Legal name ── */}
        <View style={styles.row2}>
          <Field
            style={styles.flex1}
            label="Trading name"
            required
            value={name}
            onChangeText={(v: string) => { setName(v); clearFieldError('name'); }}
            error={fieldErrors.name}
            placeholder="Acme LLC"
          />
          <Field
            style={styles.flex1}
            label="Legal name"
            value={legalName}
            onChangeText={setLegalName}
            placeholder="Acme Limited Liability Company"
          />
        </View>

        {/* ── TRN ── */}
        <Field
          label="TRN"
          required
          value={trn}
          onChangeText={(v: string) => { setTrn(v); clearFieldError('trn'); }}
          error={fieldErrors.trn}
          placeholder="100123456700003"
          hint="Exactly 15 numeric digits — no letters or symbols"
          keyboardType="number-pad"
          maxLength={15}
        />

        {/* ── TRN dates ── */}
        <View style={styles.row2}>
          <DateField
            style={styles.flex1}
            label="TRN issue date"
            date={trnIssueDate}
            onPress={() => setShowIssuePicker(true)}
          />
          <DateField
            style={styles.flex1}
            label="TRN expiry date"
            date={trnExpiryDate}
            onPress={() => setShowExpiryPicker(true)}
          />
        </View>
        {showIssuePicker && (
          <DateTimePicker
            value={trnIssueDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              setShowIssuePicker(false);
              if (selected) setTrnIssueDate(selected);
            }}
          />
        )}
        {showExpiryPicker && (
          <DateTimePicker
            value={trnExpiryDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, selected) => {
              setShowExpiryPicker(false);
              if (selected) setTrnExpiryDate(selected);
            }}
          />
        )}

        {/* ── Street address ── */}
        <Field
          label="Street address"
          required
          value={streetAddress}
          onChangeText={(v: string) => { setStreetAddress(v); clearFieldError('street_address'); }}
          error={fieldErrors.street_address}
          placeholder="Office 501, Al Futtaim Tower, Festival City"
        />

        {/* ── Country / City ── */}
        <View style={styles.row2}>
          <Field
            style={styles.flex1}
            label="Country"
            required
            value={country}
            onChangeText={(v: string) => { setCountry(v.toUpperCase()); clearFieldError('country'); }}
            error={fieldErrors.country}
            placeholder="AE"
            maxLength={2}
            autoCapitalize="characters"
          />
          <Field
            style={styles.flex1}
            label="City"
            required
            value={city}
            onChangeText={(v: string) => { setCity(v); clearFieldError('city'); }}
            error={fieldErrors.city}
            placeholder="Dubai"
          />
        </View>

        {/* ── Emirate ── */}
        <Text style={styles.fieldLabel}>Emirate</Text>
        <View style={styles.chipsWrap}>
          {EMIRATES.map((e) => (
            <TouchableOpacity
              key={e.value}
              style={[styles.chip, emirate === e.value && styles.chipActive]}
              onPress={() => setEmirate(e.value)}
            >
              <Text style={[styles.chipText, emirate === e.value && styles.chipTextActive]}>{e.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Phone / Email ── */}
        <View style={styles.row2}>
          <Field
            style={styles.flex1}
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            placeholder="50 123 4567"
            keyboardType="phone-pad"
          />
          <Field
            style={styles.flex1}
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="info@company.ae"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* ── Website ── */}
        <Field
          label="Website"
          value={website}
          onChangeText={setWebsite}
          placeholder="https://company.ae"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isPending}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>Create Company</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

// ───────────────────────────────────────────
// Reusable field component
// ───────────────────────────────────────────
function Field({
  label,
  required,
  error,
  hint,
  style,
  ...inputProps
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  style?: any;
  [key: string]: any;
}) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.requiredStar}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
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

function DateField({
  label,
  date,
  onPress,
  style,
}: {
  label: string;
  date: Date | null;
  onPress: () => void;
  style?: any;
}) {
  return (
    <View style={[styles.fieldWrap, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity style={styles.dateInput} onPress={onPress} activeOpacity={0.7}>
        <Text style={date ? styles.dateValueText : styles.datePlaceholderText}>
          {date ? formatDate(date) : 'mm/dd/yyyy'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48 },

  // Logo
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 24 },
  logoBox: {
    width: 64, height: 64, borderRadius: 12, backgroundColor: '#eef1f5',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  logoImage: { width: 64, height: 64, borderRadius: 12 },
  logoBoxText: { fontSize: 11, color: SLATE, textAlign: 'center' },
  uploadButton: {
    alignSelf: 'flex-start', borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 9, backgroundColor: '#fff',
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
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
  },
  inputError: { borderColor: ERROR },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4 },
  hintText: { fontSize: 12, color: SLATE, marginTop: 4 },

  // Date field
  dateInput: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  dateValueText: { fontSize: 15, color: '#1e293b' },
  datePlaceholderText: { fontSize: 15, color: '#94a3b8' },

  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  // Submit
  submitButton: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});