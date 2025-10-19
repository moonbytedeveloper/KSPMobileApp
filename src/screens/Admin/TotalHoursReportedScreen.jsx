import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';
import { getTotalHoursReported } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import Loader from '../../components/common/Loader';
// Sample data shaped for AccordionItem
// expenseName -> employee name, amount -> project name
 
const TotalHoursReportedScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyUUID, setSelectedCompanyUUID] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const onRefresh = React.useRef(async () => {
    await fetchTotalHoursReportedData();
  });

  // Load required UUIDs first, then fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cmpUUID, envUUID] = await Promise.all([
          getCMPUUID(),
          getENVUUID(),
        ]);
        setSelectedCompanyUUID(cmpUUID);
        if (cmpUUID && envUUID ) {
          await fetchTotalHoursReportedData({ cmpUuid: cmpUUID, envUuid: envUUID });
        } else {
          console.log('Missing one or more UUIDs', { cmpUUID, envUUID });
        }
      } catch (err) {
        console.error('Error loading company UUID:', err);
        setError('Failed to load company information');
      }
    };
    
    loadData();
  }, []);
  
  const fetchTotalHoursReportedData = async (ids) => {
    try {
      setLoading(true);
      setError(null);
      
      // Ensure we have the required UUIDs
      const cmpUUID = ids?.cmpUuid || ids?.cmpUUID || selectedCompanyUUID || (await getCMPUUID());
      const envUUID = ids?.envUuid || ids?.envUUID || (await getENVUUID());
      if (!cmpUUID || !envUUID ) {
        console.log('Missing UUIDs, skipping API call', { cmpUUID, envUUID });
        return;
      }
      
      console.log('Fetching total hours reported data with params:', {
        cmpUUID,
        envUUID,
      });
      
      const response = await getTotalHoursReported({ cmpUuid: cmpUUID, envUuid: envUUID });
      
      console.log('Total hours reported API response:', response.Data);
      
      // Handle different response structures
      let responseData = [];
      if (response && response.Data) {
        responseData = Array.isArray(response.Data) ? response.Data : [];
      } else if (Array.isArray(response.Data)) {
        responseData = response;
      }
      
      // Map the API response to AccordionItem expected structure
      const mappedData = responseData.map((item, index) => ({
        id: item.id || item.projectId || item.employeeId || index,
        expenseName: item.EmployeeName || item.employee || item.name || 'Unknown Employee',
        amount: item.ProjectName || item.project || item.title || 'Unknown Project',
        WorkingHours: item.ReportedHrs || item.hoursWorked || item.totalHours || '0',
        TotalHours: item.TotalHrs || item.totalWorkingHours || item.hours || '0',
        // Additional fields that might be useful
        projectId: item.projectId,
        employeeId: item.employeeId,
        fromDate: item.fromDate,
        toDate: item.toDate,
      }));
      
      console.log('Mapped data for AccordionItem:', mappedData);
      setData(mappedData);
    } catch (err) {
      console.error('Error fetching total hours reported data:', err);
      setError(err.message || 'Failed to fetch total hours reported data');
      Alert.alert('Error', 'Failed to load total hours reported data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (code) => setActiveCode(prev => (prev === code ? null : code));
  if(loading) {
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
        title={'Total Hours Reported'}
        onLeftPress={() => navigation.goBack()}
        navigation={navigation}
        rightNavigateTo={'Notification'}
        rightIconName={'notifications'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading total hours reported data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTotalHoursReportedData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {data.map((item) => (
              <AccordionItem
                key={item.id}
                item={item}
                isActive={activeCode === item.id}
                onToggle={() => handleToggle(item.id)}
                onView={false}
                onEdit={false}
                onDelete={false}
                headerLeftLabel={'Employee Name'}
                headerRightLabel={'Project Name'}
                customRows={[
                  { label: 'Working Hours', value: item.WorkingHours },
                  { label: 'Total Hours', value: item.TotalHours },
                ]}
              />
            ))}
            {data.length === 0 && !loading && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No records found</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default TotalHoursReportedScreen;

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
  loadingBox: {
    alignItems: 'center',
    paddingVertical: hp(8),
  },
  loadingText: {
    fontSize: rf(3.4),
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  errorBox: {
    alignItems: 'center',
    paddingVertical: hp(8),
    paddingHorizontal: wp(4),
  },
  errorText: {
    fontSize: rf(3.4),
    color: COLORS.danger,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    textAlign: 'center',
    marginBottom: hp(2),
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: wp(2),
  },
  retryButtonText: {
    color: COLORS.bg,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
});


