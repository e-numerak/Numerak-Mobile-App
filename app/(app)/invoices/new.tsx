import { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCompanies } from '../../../src/hooks/useCompanies';
import {
  INVOICE_TYPE_GROUPS,
  type InvoiceTypeItem,
  type InvoiceTypeGroup,
} from '../../../src/constants/invoiceTypes';

const INK = '#0a2540';
const NAVY = '#1e3a5f';
const SLATE = '#64748b';
const MUTED = '#94a3b8';
const BORDER = '#e8edf3';
const BG = '#f6f8fb';
const GREEN = '#059669';

const { width: SW } = Dimensions.get('window');
const CARD_W = (SW - 16 * 2 - 12) / 2; // 2-col grid with 12 gap

// VAT tag → colour
function vatStyle(vat: string) {
  const v = vat.toLowerCase();
  if (v.includes('0%')) return { bg: '#eff6ff', fg: '#2563eb' };
  if (v.includes('exempt')) return { bg: '#fef3c7', fg: '#b45309' };
  if (v.includes('oos') || v.includes('scope')) return { bg: '#f1f5f9', fg: '#64748b' };
  return { bg: '#ecfdf5', fg: GREEN }; // default 5%
}

export default function NewInvoiceScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ companyId?: string }>();
  const { data: companies } = useCompanies();
  const [companyId, setCompanyId] = useState(params.companyId ?? '');
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!companyId && companies && companies.length > 0) setCompanyId(companies[0].id);
  }, [companies, companyId]);

  const group: InvoiceTypeGroup = INVOICE_TYPE_GROUPS[tab];

  const pick = (item: InvoiceTypeItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push({
      pathname: '/invoices/create',
      params: {
        companyId,
        typeKey: item.key,
        catTitle: item.title,
        catCode: item.code,
        catVat: item.vat,
        groupKey: group.key,
      },
    } as any);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'New Invoice' }} />

      {/* Intro */}
      <View style={styles.intro}>
        <Text style={styles.introTitle}>What are you creating?</Text>
        <Text style={styles.introSub}>Pick a document or supply category to start.</Text>
      </View>

      {/* Category tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsRow}
      >
        {INVOICE_TYPE_GROUPS.map((g, i) => {
          const active = i === tab;
          return (
            <TouchableOpacity
              key={g.key}
              style={[styles.tab, active && { backgroundColor: g.tint, borderColor: g.tint }]}
              onPress={() => { Haptics.selectionAsync().catch(() => {}); setTab(i); }}
              activeOpacity={0.85}
            >
              <Feather name={g.icon} size={14} color={active ? '#fff' : g.tint} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{g.title}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group header */}
        <View style={styles.groupHead}>
          <View style={[styles.groupIcon, { backgroundColor: group.tint }]}>
            <Feather name={group.icon} size={18} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <Text style={styles.groupSub}>{group.subtitle}</Text>
          </View>
        </View>

        {/* Card grid */}
        <View style={styles.grid}>
          {group.items.map((item) => {
            const vs = vatStyle(item.vat);
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => pick(item)}
              >
                <View style={styles.cardIconBox}>
                  <Feather name={item.icon} size={18} color={group.tint} />
                </View>
                <View style={styles.titleRow}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <View style={styles.codeBadge}>
                  <Text style={styles.codeBadgeText}>{item.code}</Text>
                </View>
                <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
                <Text style={styles.cardDesc} numberOfLines={3}>{item.description}</Text>
                <View style={styles.tagRow}>
                  <View style={[styles.vatTag, { backgroundColor: vs.bg }]}>
                    <Text style={[styles.vatTagText, { color: vs.fg }]}>{item.vat}</Text>
                  </View>
                  <Feather name="arrow-right" size={15} color={MUTED} style={{ marginLeft: 'auto' }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={{ height: 28 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BG },

  intro: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 },
  introTitle: { fontSize: 20, fontWeight: '900', color: INK, letterSpacing: -0.3 },
  introSub: { fontSize: 13, color: SLATE, marginTop: 3 },

  tabsScroll: { flexGrow: 0, height: 56 },
  tabsRow: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999,
    backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER,
  },
  tabText: { fontSize: 13, fontWeight: '700', color: SLATE },
  tabTextActive: { color: '#fff' },

  content: { paddingHorizontal: 16, paddingTop: 6 },

  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, marginTop: 4 },
  groupIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  groupTitle: { fontSize: 16, fontWeight: '800', color: INK },
  groupSub: { fontSize: 12, color: SLATE, marginTop: 2, lineHeight: 16 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    width: CARD_W, backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 1, borderColor: BORDER, padding: 14,
    shadowColor: '#0f172a', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardIconBox: {
    width: 40, height: 40, borderRadius: 11, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: INK, letterSpacing: -0.2 },
  codeBadge: { alignSelf: 'flex-start', backgroundColor: '#f1f5f9', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, marginTop: 6 },
  codeBadgeText: { fontSize: 10.5, fontWeight: '800', color: '#475569', letterSpacing: 0.3 },
  cardSubtitle: { fontSize: 12.5, fontWeight: '700', color: '#334155', marginTop: 9 },
  cardDesc: { fontSize: 11.5, color: MUTED, marginTop: 6, lineHeight: 16 },
  tagRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  vatTag: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  vatTagText: { fontSize: 11, fontWeight: '800' },
});
