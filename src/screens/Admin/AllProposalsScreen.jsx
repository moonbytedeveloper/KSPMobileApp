import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';
import Loader from '../../components/common/Loader';
import { getDashboardLeadSummary } from '../../api/authServices';

const AllProposalsScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [proposalsData, setProposalsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProposalsData();
  }, []);

  const fetchProposalsData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboardLeadSummary();
      
      if (response.Success && response.Data && response.Data.openProposal) {
        setProposalsData(response.Data.openProposal.data || []);
      } else {
        setError('Failed to fetch proposals data');
      }
    } catch (err) {
      console.error('Error fetching proposals:', err);
      setError('Failed to load proposals. Please try again.');
      Alert.alert('Error', 'Failed to load proposals. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const data = useMemo(() => proposalsData.map((p, idx) => ({
    soleExpenseCode: `PR-${String(idx + 1).padStart(3, '0')}`,
    expenseName: p.CompanyName || 'N/A',
    amount: p.Status,
    _original: p,
  })), [proposalsData]);

  const handleToggle = (code) => setActiveCode((prev) => (prev === code ? null : code));
  
  const handleFileViewer = (proposalData) => { 
    const fileUrl = proposalData.ProposalDocument;
    
    if (!fileUrl) {
      Alert.alert('No document available', 'This proposal does not have a document attached.');
      return;
    }

    // Check file extension
    const extension = fileUrl.split('.').pop().toLowerCase();
    if (extension === 'pdf') {
      navigation.navigate('FileViewerScreen', { 
        pdfUrl: fileUrl,
        companyName: proposalData.CompanyName || 'Proposal'
      });
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      navigation.navigate('ImageViewerScreen', { imageUrl: fileUrl, });
    } else {
      Alert.alert('Unsupported file type');
    }
  };
  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title={'All Proposals'}
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
        title={'All Proposals'}
        onLeftPress={() => navigation.goBack()}
        navigation={navigation}
        rightNavigateTo={'Notification'}
        rightIconName={'notifications'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {data.map((item) => {
          const p = item._original;
          console.log('Proposal Item:', p);
          return (
            <AccordionItem
              key={item.soleExpenseCode}
              item={item}
              isActive={activeCode === item.soleExpenseCode}
              onToggle={() => handleToggle(item.soleExpenseCode)}
              onView={() => handleFileViewer(p)}
              showViewButton={true}
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
              {error ? 'Failed to load proposals' : 'No proposals found'}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default AllProposalsScreen;

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


