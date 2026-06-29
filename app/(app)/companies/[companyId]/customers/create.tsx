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
  { label: 'B2B (Business)', value: 'b2b' },
  { label: 'B2G (Government)', value: 'b2g' },
  { label: 'B2C (Consumer)', value: 'b2c' },
];

type PickedFile = { uri: string; name: string; type: string };

export default function CreateCustomerScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();
  const { mutate: createCustomer, isPending } = useCreateCustomer(companyId);

  // Required
  const [name, setName] = useState('');
  const [customerType, setCustomerType] = useState<CustomerType>('b2b');
  const [trn, setTrn] = useState('');
  const [country, setCountry] = useState('AE');

  // Files — both mandatory per backend
  const [logo, setLogo] = useState<PickedFile | null>(null);
  
  const [trnDocument, setTrnDocument] = useState<PickedFile | null>(null);

  // Optional
  const [showMore, setShowMore] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useFocusEffect(
    useCallback(() => {
      setName('');
      setCustomerType('b2b');
      setTrn('');
      setCountry('AE');
      setLogo(null);
      setTrnDocument(null);
      setShowMore(false);
      setLegalName('');
      setVatNumber('');
      setStreetAddress('');
      setCity('');
      setEmail('');
      setPhone('');
      setFieldErrors({});
    }, [])
  );

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
    if (!name.trim()) errors.name = 'Customer name is required.';
    if (!logo) errors.logo = 'Logo is required.';
    if (!trnDocument) errors.trn_document = 'TRN document is required.';

    const isUae = country.trim().toUpperCase() === 'AE';
    const isB2bOrB2g = customerType === 'b2b' || customerType === 'b2g';
    if (isUae && isB2bOrB2g && !trn.trim()) {
      errors.trn = 'UAE B2B/B2G customers must have a TRN.';
    }
    if (trn.trim() && !/^\d{15}$/.test(trn.trim())) {
      errors.trn = 'TRN must be exactly 15 digits.';
    }

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
    if (!logo || !trnDocument) return; // satisfies TS — already validated above

    createCustomer(
      {
        company_id: companyId,
        name: name.trim(),
        customer_type: customerType,
        trn: trn.trim() || undefined,
        vat_number: vatNumber.trim() || undefined,
        country: country.trim().toUpperCase() || 'AE',
        legal_name: legalName.trim() || undefined,
        street_address: streetAddress.trim() || undefined,
        city: city.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        logo,
        trn_document: trnDocument,
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
            const message = err?.response?.data?.error?.message ?? 'Could not create customer.';
            Alert.alert('Error', message);
          }
        },
      }
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Add Customer' }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Customer details</Text>

        <Field
          label="Customer name"
          required
          value={name}
          onChangeText={(v: string) => {
            setName(v);
            clearFieldError('name');
          }}
          error={fieldErrors.name}
          placeholder="e.g. Gulf Trading LLC"
        />

        <Text style={styles.fieldLabel}>Customer type</Text>
        <View style={styles.chipsWrap}>
          {CUSTOMER_TYPES.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={[styles.chip, customerType === t.value && styles.chipActive]}
              onPress={() => setCustomerType(t.value)}
            >
              <Text style={[styles.chipText, customerType === t.value && styles.chipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Field
          label="TRN (Tax Registration Number)"
          value={trn}
          onChangeText={(v: string) => {
            setTrn(v);
            clearFieldError('trn');
          }}
          error={fieldErrors.trn}
          placeholder="15-digit TRN (UAE customers)"
          keyboardType="number-pad"
          maxLength={15}
        />

        <Field
          label="Country"
          value={country}
          onChangeText={(v: string) => setCountry(v.toUpperCase())}
          placeholder="AE"
          maxLength={2}
          autoCapitalize="characters"
        />

        {/* ── File pickers ── */}
        <Text style={[styles.fieldLabel, { marginTop: 8 }]}>
          Logo <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TouchableOpacity style={styles.filePicker} onPress={pickLogo}>
          {logo ? (
            <View style={styles.filePickedRow}>
              <Image source={{ uri: logo.uri }} style={styles.logoPreview} />
              <Text style={styles.filePickedText}>{logo.name}</Text>
            </View>
          ) : (
            <Text style={styles.filePickerText}>📷 Select logo (JPG/PNG)</Text>
          )}
        </TouchableOpacity>
        {fieldErrors.logo && <Text style={styles.errorText}>{fieldErrors.logo}</Text>}

        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>
          TRN Document <Text style={styles.requiredStar}>*</Text>
        </Text>
        <TouchableOpacity style={styles.filePicker} onPress={pickTrnDocument}>
          {trnDocument ? (
            <View style={styles.filePickedRow}>
              <Text style={styles.fileIcon}>📄</Text>
              <Text style={styles.filePickedText}>{trnDocument.name}</Text>
            </View>
          ) : (
            <Text style={styles.filePickerText}>📎 Select document (PDF/JPG/PNG)</Text>
          )}
        </TouchableOpacity>
        {fieldErrors.trn_document && <Text style={styles.errorText}>{fieldErrors.trn_document}</Text>}

        {/* ── Optional fields ── */}
        <TouchableOpacity style={styles.moreToggle} onPress={() => setShowMore(!showMore)}>
          <Text style={styles.moreToggleText}>
            {showMore ? '− Hide more details' : '+ Add more details (optional)'}
          </Text>
        </TouchableOpacity>

        {showMore && (
          <View>
            <Field label="Legal name" value={legalName} onChangeText={setLegalName} placeholder="Registered legal name" />
            <Field label="VAT number" value={vatNumber} onChangeText={setVatNumber} placeholder="International VAT number" />
            <Field label="Street address" value={streetAddress} onChangeText={setStreetAddress} placeholder="e.g. Sheikh Zayed Road" />
            <Field label="City" value={city} onChangeText={setCity} placeholder="e.g. Dubai" />
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="customer@example.com" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="e.g. +971 4 123 4567" keyboardType="phone-pad" />
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
            <Text style={styles.submitButtonText}>Create Customer</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

function Field({ label, required, error, ...inputProps }: any) {
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
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
  },
  inputError: { borderColor: ERROR },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4, marginBottom: 8 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  filePicker: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed',
    borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center', minHeight: 56,
  },
  filePickerText: { fontSize: 14, color: SLATE, fontWeight: '500' },
  filePickedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filePickedText: { fontSize: 14, color: GREEN, fontWeight: '600', flexShrink: 1 },
  logoPreview: { width: 32, height: 32, borderRadius: 6 },
  fileIcon: { fontSize: 20 },

  moreToggle: { paddingVertical: 12, marginTop: 8, marginBottom: 8 },
  moreToggleText: { fontSize: 14, fontWeight: '600', color: NAVY },

  submitButton: { backgroundColor: NAVY, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 12 },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});