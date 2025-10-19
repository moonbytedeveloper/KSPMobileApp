import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';
import Loader from '../../components/common/Loader';
import { getDashboardLeadSummary } from '../../api/authServices';

const AllLeadsScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [leadsData, setLeadsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLeadsData();
  }, []);

  const fetchLeadsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboardLeadSummary();
      
      if (response.Success && response.Data && response.Data.leads) {
        setLeadsData(response.Data.leads.data || []);
      } else {
        setError('Failed to fetch leads data');
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads. Please try again.');
      Alert.alert('Error', 'Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const data = useMemo(() => leadsData.map((p, idx) => ({
    soleExpenseCode: `LD-${String(idx + 1).padStart(3, '0')}`,
    expenseName: p.CompanyName,
    amount: p.Status,
    _original: p,
  })), [leadsData]);

  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title={'All Leads'}
          onLeftPress={() => navigation.goBack()}
          navigation={navigation}
          rightNavigateTo={'Notification'}
          rightIconName={'notifications'}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title={'All Leads'}
        onLeftPress={() => navigation.goBack()}
        navigation={navigation}
        rightNavigateTo={'Notification'}
        rightIconName={'notifications'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {data.map((item) => {
          const p = item._original;
          return (
            <AccordionItem
              key={item.soleExpenseCode}
              item={item}
              isActive={activeCode === item.soleExpenseCode}
              onToggle={() => setActiveCode(prev => prev === item.soleExpenseCode ? null : item.soleExpenseCode)}
              showViewButton={false}
              editLabel={'Update'}
              headerLeftLabel={'Company Name'}
              headerRightLabel={'Status'}
              customRows={[
                { label: 'Company Name', value: p.CompanyName || 'N/A' },
                { label: 'Email', value: p.Email || 'N/A' },
                { label: 'Phone', value: p.Phone || 'N/A' },
                { label: 'Client Detail', value: p.ClientName || 'N/A' },
                { label: 'Next Action', value: p.NextAction || 'N/A' },
                { label: 'Action Due Date', value: p.ActionDueDate || 'N/A' },
                { label: 'Opportunity Owner', value: p.OppOwner || 'N/A' },
                { label: 'Status', value: p.Status || 'N/A', isStatus: true },
              ]}
            />
          );
        })}
        {data.length === 0 && !loading && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              {error ? 'Failed to load leads' : 'No leads found'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AllLeadsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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


