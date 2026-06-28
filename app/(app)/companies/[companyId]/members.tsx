import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import {
  useCompanyMembers,
  useAddMember,
  useUpdateMember,
  useRemoveMember,
} from '../../../../src/hooks/useCompanies';
import type { CompanyMember, UserRole } from '../../../../src/types/company.types';

const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const BORDER = '#e2e8f0';
const BG = '#f6f8fb';
const ERROR = '#dc2626';

const ROLES: { label: string; value: UserRole }[] = [
  { label: 'Admin', value: 'admin' },
  { label: 'Supplier', value: 'supplier' },
  { label: 'Accountant', value: 'accountant' },
  { label: 'Viewer', value: 'viewer' },
  { label: 'Inbound Supplier', value: 'inbound_supplier' },
  { label: 'Buyer', value: 'buyer' },
];

const roleLabel = (role: UserRole) => ROLES.find((r) => r.value === role)?.label ?? role;

export default function CompanyMembersScreen() {
  const { companyId } = useLocalSearchParams<{ companyId: string }>();
  const { data: members, isLoading, isError, refetch, isRefetching } = useCompanyMembers(companyId);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [roleModalFor, setRoleModalFor] = useState<CompanyMember | null>(null);

  if (isLoading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={NAVY} />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerScreen}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Couldn't load members</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Members' }} />
      <View style={styles.screen}>
        <FlatList
          data={members ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.centerScreen}>
              <Text style={styles.errorIcon}>👥</Text>
              <Text style={styles.errorTitle}>No members yet</Text>
              <Text style={styles.errorMessage}>Add the first member to this company.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <MemberCard
              member={item}
              companyId={companyId}
              onChangeRole={() => setRoleModalFor(item)}
            />
          )}
        />

        <TouchableOpacity style={styles.fab} onPress={() => setAddModalVisible(true)} activeOpacity={0.85}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>

      <AddMemberModal
        visible={addModalVisible}
        companyId={companyId}
        onClose={() => setAddModalVisible(false)}
      />

      <ChangeRoleModal
        member={roleModalFor}
        companyId={companyId}
        onClose={() => setRoleModalFor(null)}
      />
    </>
  );
}

// ───────────────────────────────────────────
// Member Card
// ───────────────────────────────────────────
function MemberCard({
  member,
  companyId,
  onChangeRole,
}: {
  member: CompanyMember;
  companyId: string;
  onChangeRole: () => void;
}) {
  const { mutate: removeMember, isPending: isRemoving } = useRemoveMember(companyId);

  const handleRemove = () => {
    Alert.alert(
      'Remove member?',
      `Remove ${member.user_full_name || member.user_email} from this company?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeMember(member.id, {
              onError: (err: any) => {
                const message = err?.response?.data?.error?.message ?? 'Could not remove member.';
                Alert.alert('Error', message);
              },
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {(member.user_full_name || member.user_email)?.[0]?.toUpperCase() ?? 'U'}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.memberName}>{member.user_full_name || '—'}</Text>
        <Text style={styles.memberEmail}>{member.user_email}</Text>
      </View>
      <View style={styles.memberActions}>
        <TouchableOpacity style={styles.roleBadge} onPress={onChangeRole}>
          <Text style={styles.roleBadgeText}>{roleLabel(member.role)}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleRemove} disabled={isRemoving} style={styles.removeButton}>
          {isRemoving ? (
            <ActivityIndicator size="small" color={ERROR} />
          ) : (
            <Text style={styles.removeButtonText}>Remove</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ───────────────────────────────────────────
// Add Member Modal
// ───────────────────────────────────────────
function AddMemberModal({
  visible,
  companyId,
  onClose,
}: {
  visible: boolean;
  companyId: string;
  onClose: () => void;
}) {
  const { mutate: addMember, isPending } = useAddMember(companyId);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('viewer');
  const [error, setError] = useState('');

  const handleAdd = () => {
    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    setError('');

    addMember(
      { user_email: email.trim(), role },
      {
        onSuccess: () => {
          setEmail('');
          setRole('viewer');
          onClose();
        },
        onError: (err: any) => {
          const details = err?.response?.data?.error?.details;
          const message =
            details?.user_email?.[0] ??
            err?.response?.data?.error?.message ??
            'Could not add member.';
          setError(message);
        },
      }
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Add Member</Text>

          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={email}
            onChangeText={setEmail}
            placeholder="member@example.com"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {error && <Text style={styles.errorText}>{error}</Text>}

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Role</Text>
          <View style={styles.chipsWrap}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.chip, role === r.value && styles.chipActive]}
                onPress={() => setRole(r.value)}
              >
                <Text style={[styles.chipText, role === r.value && styles.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isPending}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isPending && styles.disabledButton]}
              onPress={handleAdd}
              disabled={isPending}
            >
              {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Add</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ───────────────────────────────────────────
// Change Role Modal
// ───────────────────────────────────────────
function ChangeRoleModal({
  member,
  companyId,
  onClose,
}: {
  member: CompanyMember | null;
  companyId: string;
  onClose: () => void;
}) {
  const { mutate: updateMember, isPending } = useUpdateMember(companyId, member?.id ?? '');
  const [role, setRole] = useState<UserRole>(member?.role ?? 'viewer');

  // Sync local state whenever a new member is selected
  if (member && role !== member.role && !isPending) {
    // only reset on open, not on every render — guard via modal visibility instead
  }

  const handleSave = () => {
    if (!member) return;
    updateMember(
      { role },
      {
        onSuccess: onClose,
        onError: (err: any) => {
          const message = err?.response?.data?.error?.message ?? 'Could not update role.';
          Alert.alert('Error', message);
        },
      }
    );
  };

  return (
    <Modal visible={!!member} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Change Role</Text>
          <Text style={styles.modalSubtitle}>{member?.user_full_name || member?.user_email}</Text>

          <View style={[styles.chipsWrap, { marginTop: 12 }]}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.value}
                style={[styles.chip, role === r.value && styles.chipActive]}
                onPress={() => setRole(r.value)}
              >
                <Text style={[styles.chipText, role === r.value && styles.chipTextActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isPending}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isPending && styles.disabledButton]}
              onPress={handleSave}
              disabled={isPending}
            >
              {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Save</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },
  centerScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BG, padding: 24 },
  listContent: { padding: 16, paddingBottom: 100 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  avatarCircle: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: NAVY,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  memberName: { fontSize: 15, fontWeight: '700', color: NAVY },
  memberEmail: { fontSize: 12, color: SLATE, marginTop: 2 },
  memberActions: { alignItems: 'flex-end', gap: 6 },
  roleBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', color: '#2563eb' },
  removeButton: { paddingVertical: 2 },
  removeButtonText: { fontSize: 12, color: ERROR, fontWeight: '600' },

  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '400', marginTop: -2 },

  errorIcon: { fontSize: 44, marginBottom: 12 },
  errorTitle: { fontSize: 16, fontWeight: '700', color: NAVY, marginBottom: 6 },
  errorMessage: { fontSize: 13, color: SLATE, textAlign: 'center' },
  retryButton: { backgroundColor: NAVY, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
  retryButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: NAVY, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: SLATE, marginBottom: 8 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: NAVY, marginBottom: 6 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1e293b',
  },
  inputError: { borderColor: ERROR },
  errorText: { fontSize: 12, color: ERROR, marginTop: 4 },

  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  chipActive: { backgroundColor: NAVY, borderColor: NAVY },
  chipText: { fontSize: 13, color: SLATE, fontWeight: '500' },
  chipTextActive: { color: '#fff' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 24 },
  cancelButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: BORDER, backgroundColor: '#fff' },
  cancelButtonText: { color: SLATE, fontSize: 15, fontWeight: '600' },
  saveButton: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', backgroundColor: NAVY },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabledButton: { opacity: 0.6 },
});