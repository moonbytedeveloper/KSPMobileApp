import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';

const salesData = [
  {
    soleExpenseCode: 'INV-S-001',
    expenseName: 'Crypto Project',
    documentFromDate: '2025-07-01',
    documentToDate: '2025-07-24',
    amount: '₹ 45,000',
    status: 'Paid',
  },
  {
    soleExpenseCode: 'INV-S-002',
    expenseName: 'Digital Marketing',
    documentFromDate: '2025-08-01',
    documentToDate: '2025-08-15',
    amount: '₹ 28,900',
    status: 'Unpaid',
  },
];

const purchaseData = [
  {
    soleExpenseCode: 'INV-P-003',
    expenseName: 'Cloud Services',
    documentFromDate: '2025-07-05',
    documentToDate: '2025-07-25',
    amount: '₹ 12,400',
    status: 'Unpaid',
  },
  {
    soleExpenseCode: 'INV-P-004',
    expenseName: 'Software Licenses',
    documentFromDate: '2025-08-01',
    documentToDate: '2025-08-14',
    amount: '₹ 63,120',
    status: 'Paid',
  },
];

const TabButton = ({ label, active, onPress }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.tabBtn}>
    <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    <View style={[styles.tabIndicator, !active && styles.tabIndicatorInactive]} />
  </TouchableOpacity>
);

const TotalInvoicesScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Sales');
  const [activeCode, setActiveCode] = useState(null);

  const data = activeTab === 'Sales' ? salesData : purchaseData;

  const handleToggle = (code) => {
    setActiveCode(prev => (prev === code ? null : code));
  };

  const handleView = () => {};
  const handleEdit = () => {};
  const handleDelete = (code) => {};

  return (
    <View style={styles.container}>
      <AppHeader
        title={'Total  Invoices'}
        onLeftPress={() => navigation.goBack()}
        navigation={navigation}
        rightNavigateTo={'Notification'}
        rightIconName={'notifications'}
      />

      <View style={styles.tabsRow}>
        <TabButton label="Sales" active={activeTab === 'Sales'} onPress={() => setActiveTab('Sales')} />
        <View style={{ width: wp(6) }} />
        <TabButton label="Purchase" active={activeTab === 'Purchase'} onPress={() => setActiveTab('Purchase')} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {data.map((item) => (
          <AccordionItem
            key={item.soleExpenseCode}
            item={item}
            isActive={activeCode === item.soleExpenseCode}
            onToggle={() => handleToggle(item.soleExpenseCode)}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {data.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No records</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default TotalInvoicesScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
   // paddingTop: safeAreaTop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  title: {
    fontSize: rf(4.6),
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    marginLeft: wp(1),
  },
  bellButton: {
    padding: wp(1.5),
    borderRadius: wp(2),
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap:wp(8),
    justifyContent:'center',
  },
  tabBtn: {
    alignItems: 'center',
  },
  tabText: {
    fontSize: rf(4),
    color: COLORS.textLight,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  tabTextActive: {
    color: COLORS.danger,
  },
  tabIndicator: {
    height: hp(0.5),
    width: wp(16),
    borderRadius: wp(2),
    backgroundColor: COLORS.danger,
    marginTop: hp(0.6),
  },
  tabIndicatorInactive: {
    backgroundColor: COLORS.border,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(6),
    paddingTop: hp(1.5),
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
});


