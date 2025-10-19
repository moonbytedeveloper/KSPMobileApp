import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';

// expenseName -> Project Name, amount -> Date
const rows = [
  { soleExpenseCode: 'PAY-001', expenseName: 'Crypto Project', amount: '24-07-2025', clientName: 'ABC Corp', status: 'Paid' },
  { soleExpenseCode: 'PAY-002', expenseName: 'Digital Marketing', amount: '15-08-2025', clientName: 'XYZ Ltd', status: 'Pending' },
];

const PaymentStatusScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [data] = useState(rows);

  const handleToggle = (code) => setActiveCode(prev => (prev === code ? null : code));

  return (
    <View style={styles.container}>
      <AppHeader
        title={'Payment Status'}
        onLeftPress={() => navigation.goBack()}
        navigation={navigation}
        rightNavigateTo={'Notification'}
        rightIconName={'notifications'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {data.map((item) => (
          <AccordionItem
            key={item.soleExpenseCode}
            item={item}
            isActive={activeCode === item.soleExpenseCode}
            onToggle={() => handleToggle(item.soleExpenseCode)}
            showViewButton={false}
            headerLeftLabel={'Project'}
            headerRightLabel={'Date'}
            customRows={[
              { label: 'Client Name', value: item.clientName },
              { label: 'Status', value: item.status },
            ]}
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

export default PaymentStatusScreen;

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
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(6),
    paddingTop: hp(1.5),
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: hp(8),
  },
  emptyText: {
    fontSize: rf(3.4),
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
});


