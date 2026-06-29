import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCreateCompany } from '../../../src/hooks/useCompanies';
import type { Emirate, LegalRegistrationType } from '../../../src/types/company.types';

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

const LEGAL_REG_TYPES: { label: string; value: LegalRegistrationType }[] = [
  { label: 'Trade License (TL)', value: 'TL' },
  { label: 'Commercial Reg. No. (CRN)', value: 'CRN' },
  { label: 'Emirates ID (EID)', value: 'EID' },
  { label: 'Passport (PAS)', value: 'PAS' },
  { label: 'Commercial Document (CD)', value: 'CD' },
];

export default function CreateCompanyScreen() {
  const router = useRouter();
  const { mutate: createCompany, isPending } = useCreateCompany();

  // Required
  const [name, setName] = useState('');
  const [trn, setTrn] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');

  // Optional — shown under "More details"
  const [showMore, setShowMore] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [emirate, setEmirate] = useState<Emirate>('dubai');
  const [poBox, setPoBox] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [legalRegId, setLegalRegId] = useState('');
  const [legalRegType, setLegalRegType] = useState<LegalRegistrationType>('');
  const [isVatGroup, setIsVatGroup] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Reset form every time this screen comes into focus — prevents stale
  // data from a previous create attempt (or a cached screen instance)
  // from showing up again when navigating back here.
  useFocusEffect(
    useCallback(() => {
      setName('');
      setTrn('');
      setStreetAddress('');
      setCity('');
      setShowMore(false);
      setLegalName('');
      setEmirate('dubai');
      setPoBox('');
      setPhone('');
      setEmail('');
      setWebsite('');
      setLegalRegId('');
      setLegalRegType('');
      setIsVatGroup(false);
      setFieldErrors({});
    }, [])
  );

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = 'Company name is required.';
    if (!trn.trim()) {
      errors.trn = 'TRN is required.';
    } else if (!/^\d{15}$/.test(trn.trim())) {
      errors.trn = 'TRN must be exactly 15 digits.';
    }
    if (!streetAddress.trim()) errors.street_address = 'Street address is required.';
    if (!city.trim()) errors.city = 'City is required.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = () => {
    if (!validate()) return;

    createCompany(
      {
        name: name.trim(),
        trn: trn.trim(),
        street_address: streetAddress.trim(),
        city: city.trim(),
        legal_name: legalName.trim() || undefined,
        emirate,
        po_box: poBox.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        website: website.trim() || undefined,
        legal_registration_id: legalRegId.trim() || undefined,
        legal_registration_type: legalRegType || undefined,
        is_vat_group: isVatGroup,
      },
      {
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
      }
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Company' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Company details</Text>

        <Field
          label="Company name"
          required
          value={name}
          onChangeText={(v: string) => { setName(v); clearFieldError('name'); }}
          error={fieldErrors.name}
          placeholder="e.g. Al Merak Tax Consultant"
        />

        <Field
          label="TRN (Tax Registration Number)"
          required
          value={trn}
          onChangeText={(v: string) => { setTrn(v); clearFieldError('trn'); }}
          error={fieldErrors.trn}
          placeholder="15-digit TRN"
          keyboardType="number-pad"
          maxLength={15}
        />

        <Field
          label="Street address"
          required
          value={streetAddress}
          onChangeText={(v: string) => { setStreetAddress(v); clearFieldError('street_address'); }}
          error={fieldErrors.street_address}
          placeholder="e.g.Office 402 Sheikh Zayed Road"
        />

        <Field
          label="City"
          required
          value={city}
          onChangeText={(v: string) => { setCity(v); clearFieldError('city'); }}
          error={fieldErrors.city}
          placeholder="e.g. Dubai"
        />

        {/* Toggle: show optional fields */}
        <TouchableOpacity style={styles.moreToggle} onPress={() => setShowMore(!showMore)}>
          <Text style={styles.moreToggleText}>
            {showMore ? '− Hide more details' : '+ Add more details (optional)'}
          </Text>
        </TouchableOpacity>

        {showMore && (
          <View>
            <Field label="Legal name" value={legalName} onChangeText={setLegalName} placeholder="Registered legal name" />

            <Text style={styles.fieldLabel}>Emirate</Text>
            <View style={styles.chipsWrap}>
              {EMIRATES.map((e) => (
                <TouchableOpacity
                  key={e.value}
                  style={[styles.chip, emirate === e.value && styles.chipActive]}
                  onPress={() => setEmirate(e.value)}
                >
                  <Text style={[styles.chipText, emirate === e.value && styles.chipTextActive]}>
                    {e.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Field label="P.O. Box" value={poBox} onChangeText={setPoBox} placeholder="e.g. 12345" keyboardType="number-pad" />
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="e.g. +971 4 123 4567" keyboardType="phone-pad" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="contact@company.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Website" value={website} onChangeText={setWebsite} placeholder="https://company.com" autoCapitalize="none" />
            <Field label="Legal registration ID" value={legalRegId} onChangeText={setLegalRegId} placeholder="Trade license / CR number" />

            <Text style={styles.fieldLabel}>Legal registration type</Text>
            <View style={styles.chipsWrap}>
              {LEGAL_REG_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.value}
                  style={[styles.chip, legalRegType === t.value && styles.chipActive]}
                  onPress={() => setLegalRegType(t.value)}
                >
                  <Text style={[styles.chipText, legalRegType === t.value && styles.chipTextActive]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Part of a VAT group?</Text>
              <Switch value={isVatGroup} onValueChange={setIsVatGroup} trackColor={{ true: NAVY }} />
            </View>
          </View>
        )}

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
  ...inputProps
}: {
  label: string;
  required?: boolean;
  error?: string;
  [key: string]: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>
        {label} {required && <Text style={styles.requiredStar}>*</Text>}
      </Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        placeholderTextColor="#94a3b8"
        {...inputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 20, paddingBottom: 48 },

  sectionLabel: { fontSize: 13, fontWeight: '700', color: SLATE, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 16 },

  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  requiredStar: { color: ERROR },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1e293b',
  },
  inputError: { borderColor: ERROR },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4 },

  moreToggle: { paddingVertical: 12, marginBottom: 8 },
  moreToggleText: { fontSize: 14, fontWeight: '600', color: NAVY },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#fff',
  },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },

  submitButton: {
    backgroundColor: NAVY,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});