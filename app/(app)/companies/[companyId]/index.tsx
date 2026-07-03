import { useState, useEffect, useRef, type ReactNode } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import {
  useCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '../../../../src/hooks/useCompanies';
import { Shimmer } from '../../../../src/components/Loading';
import type { Emirate, LegalRegistrationType, UpdateCompanyPayload } from '../../../../src/types/company.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const MUTED = '#94a3b8';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';
const ERROR = '#dc2626';
const GREEN = '#16a34a';

// Fade-in + slide-up wrapper with a staggerable delay (premium load-in).
function FadeSlideCard({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: any }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 420, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>{children}</Animated.View>;
}

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

export default function CompanyDetailScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const router = useRouter();

  const { data: company, isLoading, isError, refetch } = useCompany(companyId);
  const { mutate: updateCompany, isPending: isSaving } = useUpdateCompany(companyId);
  const { mutate: deleteCompany, isPending: isDeleting } = useDeleteCompany();

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<UpdateCompanyPayload>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const hydrate = () => {
    if (!company) return;
    setForm({
      name: company.name,
      legal_name: company.legal_name,
      street_address: company.street_address,
      city: company.city,
      emirate: company.emirate,
      po_box: company.po_box,
      country: company.country,
      phone: company.phone,
      email: company.email,
      website: company.website,
      legal_registration_id: company.legal_registration_id,
      legal_registration_type: company.legal_registration_type,
      is_vat_group: company.is_vat_group,
    });
  };

  useEffect(() => {
    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company]);

  const clearFieldError = (field: string) => {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const update = (key: keyof UpdateCompanyPayload, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const handleSave = () => {
    const errors: Record<string, string> = {};
    if (!form.name?.trim()) errors.name = 'Company name is required.';
    if (!form.street_address?.trim()) errors.street_address = 'Street address is required.';
    if (!form.city?.trim()) errors.city = 'City is required.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const cleanedForm: UpdateCompanyPayload = {};
    Object.entries(form).forEach(([key, value]) => {
      if (value === '' || value === undefined) return;
      (cleanedForm as any)[key] = value;
    });

    updateCompany(cleanedForm, {
      onSuccess: () => setIsEditing(false),
      onError: (err: any) => {
        const details = err?.response?.data?.error?.details;
        if (details && typeof details === 'object') {
          const flattened: Record<string, string> = {};
          Object.entries(details).forEach(([key, val]) => {
            flattened[key] = Array.isArray(val) ? val[0] : String(val);
          });
          setFieldErrors(flattened);
        } else {
          Alert.alert('Error', err?.response?.data?.error?.message ?? 'Could not update company.');
        }
      },
    });
  };

  const handleCancel = () => {
    hydrate();
    setFieldErrors({});
    setIsEditing(false);
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate company?',
      `"${company?.name}" will be deactivated and hidden from your companies list. This can be reversed by an admin later.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            deleteCompany(companyId, {
              onSuccess: () => router.replace('/companies'),
              onError: () => Alert.alert('Error', 'Could not deactivate company.'),
            });
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Company', headerBackTitle: 'Back' }} />
        <DetailSkeleton />
      </>
    );
  }

  if (isError || !company) {
    return (
      <>
        <Stack.Screen options={{ title: 'Company' }} />
        <View style={styles.centerScreen}>
          <Feather name="alert-triangle" size={44} color={ERROR} style={{ marginBottom: 14 }} />
          <Text style={styles.errorTitle}>Couldn't load this company</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: company.name }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {/* ── Gradient hero header ── */}
        {!isEditing && (
          <FadeSlideCard delay={0}>
            <LinearGradient
              colors={['#22456e', '#16314f', '#0a1728']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              {/* Decorative depth circles */}
              <View style={styles.heroGlow} />
              <View style={styles.heroGlow2} />
              <View style={styles.heroGoldLine} />

              <View style={styles.heroTop}>
                {company.logo_url ? (
                  <Image source={{ uri: company.logo_url }} style={styles.heroLogo} />
                ) : (
                  <LinearGradient
                    colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0.06)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroAvatar}
                  >
                    <Text style={styles.heroAvatarText}>
                      {(company.name || '?').slice(0, 2).toUpperCase()}
                    </Text>
                  </LinearGradient>
                )}
                {company.is_active ? (
                  <View style={styles.activeBadge}>
                    <View style={styles.activeDot} />
                    <Text style={styles.activeBadgeText}>Active</Text>
                  </View>
                ) : (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>INACTIVE</Text>
                  </View>
                )}
              </View>

              <Text style={styles.heroName}>{company.name}</Text>
              {company.legal_name && company.legal_name !== company.name ? (
                <Text style={styles.heroLegal}>{company.legal_name}</Text>
              ) : null}

              <View style={styles.heroTrnRow}>
                <View style={styles.heroTrnIcon}>
                  <Feather name="hash" size={12} color="#93c5fd" />
                </View>
                <Text style={styles.heroTrnLabel}>TRN</Text>
                <Text style={styles.heroTrnValue}>{company.trn}</Text>
              </View>
            </LinearGradient>
          </FadeSlideCard>
        )}

        {/* ── Fields ── */}
        {isEditing ? (
          <EditFields form={form} update={update} fieldErrors={fieldErrors} />
        ) : (
          <ViewFields company={company} />
        )}

        {/* ── Related sections ── */}
        {!isEditing && (
          <FadeSlideCard delay={340}>
            <View style={styles.linksGroup}>
              <LinkRow
                icon="users"
                tint="#2563eb"
                bg="#eff6ff"
                label="Members"
                count={company.member_count}
                onPress={() => router.push(`/companies/${companyId}/members` as any)}
              />
              <View style={styles.linkDivider} />
              <LinkRow
                icon="user-check"
                tint={GREEN}
                bg="#f0fdf4"
                label="Customers"
                onPress={() => router.push(`/companies/${companyId}/customers` as any)}
              />
            </View>
          </FadeSlideCard>
        )}

        {/* Company edit & deactivation are admin-only — managed outside the app. */}
        {!isEditing && (
          <FadeSlideCard delay={420}>
            <View style={styles.adminNote}>
              <Feather name="lock" size={14} color={SLATE} />
              <Text style={styles.adminNoteText}>
                Company details can only be changed by an administrator.
              </Text>
            </View>
          </FadeSlideCard>
        )}
      </ScrollView>
    </>
  );
}

// ───────────────────────────────────────────
// Loading skeleton — mirrors the detail layout
// ───────────────────────────────────────────
function DetailSkeleton() {
  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        {/* Hero placeholder */}
        <View style={styles.heroSkeleton}>
          <View style={styles.heroSkeletonTop}>
            <Shimmer width={54} height={54} radius={14} base="#e6eaf0" highlight="#f3f6fa" />
            <Shimmer width={70} height={26} radius={999} base="#e6eaf0" highlight="#f3f6fa" />
          </View>
          <Shimmer width="62%" height={22} radius={7} base="#e6eaf0" highlight="#f3f6fa" style={{ marginTop: 16 }} />
          <Shimmer width="40%" height={13} radius={6} base="#e6eaf0" highlight="#f3f6fa" style={{ marginTop: 10 }} />
        </View>

        {/* Two field-group placeholders */}
        {[0, 1].map((g) => (
          <View key={g} style={styles.card}>
            <View style={styles.groupHead}>
              <Shimmer width={28} height={28} radius={8} />
              <Shimmer width="35%" height={13} />
            </View>
            {[0, 1, 2].map((r) => (
              <View key={r} style={[styles.viewRow, r === 2 && styles.viewRowLast]}>
                <Shimmer width="30%" height={13} />
                <Shimmer width="42%" height={13} />
              </View>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

// ───────────────────────────────────────────
// Related link row
// ───────────────────────────────────────────
function LinkRow({
  icon,
  tint,
  bg,
  label,
  count,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  tint: string;
  bg: string;
  label: string;
  count?: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.linkRow} onPress={onPress} activeOpacity={0.6}>
      <View style={styles.linkLeft}>
        <View style={[styles.linkIconBox, { backgroundColor: bg }]}>
          <Feather name={icon} size={17} color={tint} />
        </View>
        <Text style={styles.linkText}>{label}</Text>
      </View>
      <View style={styles.linkRight}>
        {count != null && <Text style={styles.linkCount}>{count}</Text>}
        <Feather name="chevron-right" size={18} color={MUTED} />
      </View>
    </TouchableOpacity>
  );
}

// ───────────────────────────────────────────
// View mode — icon-labeled groups, clean rows
// ───────────────────────────────────────────
function ViewFields({ company }: { company: any }) {
  const groups: {
    title: string;
    icon: keyof typeof Feather.glyphMap;
    rows: { label: string; value: any }[];
  }[] = [
    {
      title: 'Legal Information',
      icon: 'file-text',
      rows: [
        { label: 'Legal name', value: company.legal_name },
        { label: 'Registration ID', value: company.legal_registration_id },
        { label: 'Registration type', value: company.legal_registration_type },
        { label: 'VAT group', value: company.is_vat_group ? 'Yes' : 'No' },
      ],
    },
    {
      title: 'Address',
      icon: 'map-pin',
      rows: [
        { label: 'Street address', value: company.street_address },
        { label: 'City', value: company.city },
        { label: 'Full address', value: company.formatted_address },
      ],
    },
    {
      title: 'Contact',
      icon: 'phone',
      rows: [
        { label: 'Phone', value: company.phone },
        { label: 'Email', value: company.email },
        { label: 'Website', value: company.website },
      ],
    },
  ];

  return (
    <>
      {groups.map((group, gi) => (
        <FadeSlideCard key={group.title} delay={100 + gi * 90}>
          <View style={styles.card}>
            <View style={styles.groupHead}>
              <View style={styles.groupIcon}>
                <Feather name={group.icon} size={14} color={NAVY} />
              </View>
              <Text style={styles.groupTitle}>{group.title}</Text>
            </View>
            {group.rows.map((row, i) => {
              const hasValue = row.value != null && String(row.value).trim() !== '';
              return (
                <View
                  key={row.label}
                  style={[styles.viewRow, i === group.rows.length - 1 && styles.viewRowLast]}
                >
                  <Text style={styles.viewLabel}>{row.label}</Text>
                  {hasValue ? (
                    <Text style={styles.viewValue} numberOfLines={2}>{row.value}</Text>
                  ) : (
                    <Text style={styles.viewValueEmpty}>—</Text>
                  )}
                </View>
              );
            })}
          </View>
        </FadeSlideCard>
      ))}
    </>
  );
}

// ───────────────────────────────────────────
// Edit mode
// ───────────────────────────────────────────
function EditFields({
  form,
  update,
  fieldErrors,
}: {
  form: UpdateCompanyPayload;
  update: (key: keyof UpdateCompanyPayload, value: any) => void;
  fieldErrors: Record<string, string>;
}) {
  return (
    <View style={styles.card}>
      <Field label="Company name" required value={form.name} onChangeText={(v: string) => update('name', v)} error={fieldErrors.name} />
      <Field label="Legal name" value={form.legal_name} onChangeText={(v: string) => update('legal_name', v)} />
      <Field label="Street address" required value={form.street_address} onChangeText={(v: string) => update('street_address', v)} error={fieldErrors.street_address} />
      <Field label="City" required value={form.city} onChangeText={(v: string) => update('city', v)} error={fieldErrors.city} />

      <Text style={styles.fieldLabel}>Emirate</Text>
      <View style={styles.chipsWrap}>
        {EMIRATES.map((e) => (
          <TouchableOpacity
            key={e.value}
            style={[styles.chip, form.emirate === e.value && styles.chipActive]}
            onPress={() => update('emirate', e.value)}
          >
            <Text style={[styles.chipText, form.emirate === e.value && styles.chipTextActive]}>{e.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Field label="P.O. Box" value={form.po_box} onChangeText={(v: string) => update('po_box', v)} keyboardType="number-pad" />
      <Field label="Phone" value={form.phone} onChangeText={(v: string) => update('phone', v)} keyboardType="phone-pad" />
      <Field label="Email" value={form.email} onChangeText={(v: string) => update('email', v)} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Website" value={form.website} onChangeText={(v: string) => update('website', v)} autoCapitalize="none" />
      <Field label="Legal registration ID" value={form.legal_registration_id} onChangeText={(v: string) => update('legal_registration_id', v)} />

      <Text style={styles.fieldLabel}>Legal registration type</Text>
      <View style={styles.chipsWrap}>
        {LEGAL_REG_TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.chip, form.legal_registration_type === t.value && styles.chipActive]}
            onPress={() => update('legal_registration_type', t.value)}
          >
            <Text style={[styles.chipText, form.legal_registration_type === t.value && styles.chipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.fieldLabel}>Part of a VAT group?</Text>
        <Switch value={!!form.is_vat_group} onValueChange={(v) => update('is_vat_group', v)} trackColor={{ true: NAVY }} />
      </View>
    </View>
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
        value={inputProps.value ?? ''}
        {...inputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  content: { padding: 16, paddingBottom: 48 },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },

  headerActionText: { color: '#fff', fontSize: 16, fontWeight: '600', marginRight: 12 },

  // Hero
  hero: {
    borderRadius: 22, padding: 20, marginBottom: 14, overflow: 'hidden',
    shadowColor: '#0a1728', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 18, elevation: 8,
  },
  heroGlow: {
    position: 'absolute', top: -50, right: -30, width: 150, height: 150,
    borderRadius: 75, backgroundColor: 'rgba(91,141,239,0.18)',
  },
  heroGlow2: {
    position: 'absolute', bottom: -60, left: -20, width: 140, height: 140,
    borderRadius: 70, backgroundColor: 'rgba(37,99,235,0.12)',
  },
  heroGoldLine: {
    position: 'absolute', top: 0, left: 26, right: 26, height: 2,
    backgroundColor: 'rgba(147,197,253,0.5)', borderRadius: 1,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLogo: { width: 58, height: 58, borderRadius: 16, backgroundColor: '#fff' },
  heroAvatar: {
    width: 58, height: 58, borderRadius: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center',
  },
  heroAvatarText: { color: '#fff', fontSize: 21, fontWeight: '900', letterSpacing: 0.5 },
  heroName: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 16, letterSpacing: -0.4 },
  heroLegal: { color: '#cbd5e1', fontSize: 13, marginTop: 3 },
  heroTrnRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 14 },
  heroTrnIcon: { width: 22, height: 22, borderRadius: 7, backgroundColor: 'rgba(147,197,253,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTrnLabel: { color: '#93c5fd', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  heroTrnValue: { color: '#e2e8f0', fontSize: 13.5, fontWeight: '700', letterSpacing: 0.5 },

  activeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(34,197,94,0.18)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, gap: 5 },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  activeBadgeText: { fontSize: 11, fontWeight: '700', color: '#bbf7d0' },
  inactiveBadge: { backgroundColor: 'rgba(248,113,113,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  inactiveBadgeText: { fontSize: 10, fontWeight: '800', color: '#fca5a5', letterSpacing: 0.5 },

  // Loading skeleton
  heroSkeleton: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  heroSkeletonTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  // Grouped view card
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
  groupIcon: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#eef2f8', alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 13, fontWeight: '800', color: NAVY, letterSpacing: 0.2 },

  viewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', gap: 16,
  },
  viewRowLast: { borderBottomWidth: 0, paddingBottom: 2 },
  viewLabel: { fontSize: 13.5, color: SLATE },
  viewValue: { fontSize: 14, color: '#0f172a', fontWeight: '600', flex: 1, textAlign: 'right' },
  viewValueEmpty: { fontSize: 16, color: '#cbd5e1', fontWeight: '700', flex: 1, textAlign: 'right' },

  // Edit mode fields
  fieldWrap: { marginBottom: 16 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  requiredStar: { color: ERROR },
  input: {
    backgroundColor: '#f9fafc', borderWidth: 1.5, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
  },
  inputError: { borderColor: ERROR },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Related links group
  linksGroup: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: BORDER, overflow: 'hidden' },
  linkRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 15 },
  linkDivider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 16 },
  linkLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  linkRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  linkCount: { fontSize: 14, color: SLATE, fontWeight: '700' },

  // Action buttons
  editActions: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  cancelButtonText: { color: SLATE, fontSize: 15, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: NAVY },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },

  deactivateButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    paddingVertical: 15, paddingHorizontal: 16, borderRadius: 14,
    backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#fecdd3',
  },
  deactivateButtonTitle: { color: ERROR, fontSize: 15, fontWeight: '700' },
  deactivateButtonSubtitle: { color: '#f87171', fontSize: 12, fontWeight: '500', marginTop: 2 },

  adminNote: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: '#f8fafc', borderWidth: 1, borderColor: BORDER,
  },
  adminNoteText: { color: SLATE, fontSize: 13, fontWeight: '500' },

  errorTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 16 },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
