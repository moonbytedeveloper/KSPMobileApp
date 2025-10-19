import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';
import { getTotalEmployeeWorking } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import Loader from '../../components/common/Loader';
// expenseName -> employee name, amount -> designation
 

const TotalEmployeesWorkingScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [data, setData] = useState([]);
  const [selectedCompanyUUID, setSelectedCompanyUUID] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = (code) => setActiveCode(prev => (prev === code ? null : code));
  const handleView = () => {};
  const handleEdit = () => {};
  const handleDelete = (code) => setData(prev => prev.filter(x => x.soleExpenseCode !== code));

  const onRefresh = React.useRef(async () => {
    await fetchTotalEmployeeWorkingData();
  });

  // Load required UUIDs first, then fetch data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cmpUuid, envUuid, superAdminUuid] = await Promise.all([
          getCMPUUID(),
          getENVUUID(),
          getUUID(),
        ]);
        setSelectedCompanyUUID(cmpUuid);
        if (cmpUuid && envUuid && superAdminUuid) {
          await fetchTotalEmployeeWorkingData({ cmpUuid, envUuid, superAdminUuid });
        } else {
          console.log('Missing one or more UUIDs', { cmpUuid, envUuid, superAdminUuid });
        }
      } catch (err) {
        console.error('Error loading UUIDs for TotalEmployeesWorking:', err);
        setError('Failed to load company information');
      }
    };
    loadData();
  }, []);

  const fetchTotalEmployeeWorkingData = async (ids) => {
    try {
      setLoading(true);
      setError(null);
      
      const cmpUuid = ids?.cmpUuid || ids?.cmpUUID || selectedCompanyUUID || (await getCMPUUID());
      const envUuid = ids?.envUuid || ids?.envUUID || (await getENVUUID());
      const superAdminUuid = ids?.superAdminUuid || (await getUUID());
      if (!cmpUuid || !envUuid || !superAdminUuid) {
        console.log('Missing UUIDs, skipping API call', { cmpUuid, envUuid, superAdminUuid });
        return;
      }
      
      console.log('Fetching total employee working data with params:', { cmpUuid, envUuid });
      
      const response = await getTotalEmployeeWorking({ cmpUuid, envUuid });
      
      console.log('Total employee working API response:', response);
      
      const container = response?.Data ?? response?.data ?? response;
      console.log('container', container);
      const rows = Array.isArray(container?.data) ? container.data
        : Array.isArray(container?.Rows) ? container.Rows
        : Array.isArray(container?.rows) ? container.rows
        : Array.isArray(container?.Items) ? container.Items
        : Array.isArray(container?.items) ? container.items
        : Array.isArray(container) ? container : [];

      const mapped = rows.map((row, idx) => {
        const employee = row.FullName || row.Employee_Name || row.UserName || row.userName || '';
        const designation = row.Designation || row.designation || '';
        const applicationType = row.ApplicationType || row.ApplicationType || '';
        const employeeCode = row.EmployeeCode || row.employeeCode || '';
        const joiningDate = row.JoiningDate || row.joiningDate || '';
        const relivedDate = row.RelivedDate || row.relivedDate || '';
        return {
          soleExpenseCode: row.soleExpenseCode || row.employeeId || idx,
          expenseName: employee,
          amount: designation,
          applicationType: applicationType,
          employeeCode: employeeCode,
          joiningDate: joiningDate,
          relivedDate: relivedDate,
        };
      });

      console.log('Mapped data for AccordionItem:', mapped);
      setData(mapped);
    } catch (err) {
      console.error('Error fetching total employee working data:', err);
      setError(err.message || 'Failed to fetch total employee working data');
      Alert.alert('Error', 'Failed to load total employee working data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
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
        title={'Total Employees Working'}
        onLeftPress={() => navigation.goBack()}
        navigation={navigation}
        rightNavigateTo={'Notification'}
        rightIconName={'notifications'}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <Text style={styles.loadingText}>Loading employees working data...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {data.map((item) => (
              <AccordionItem
                key={item.soleExpenseCode}
                item={item}
                isActive={activeCode === item.soleExpenseCode}
                onToggle={() => handleToggle(item.soleExpenseCode)}
                onView={false}
                onEdit={false}
                onDelete={false}
                headerLeftLabel={'Employee'}
                headerRightLabel={'Designation'}
                customRows={[
                  { label: 'EmployeeCode', value: item.employeeCode },
                  { label: 'Employment Type', value: item.applicationType },
                  { label: 'JoiningDate', value: item.joiningDate },
                  item.relivedDate
                    ? { label: 'RelievedDate', value: item.relivedDate }
                    : null, // null when no relivedDate
                ].filter(Boolean)}
              />
            ))}
            {data.length === 0 && !loading && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{error || 'No records'}</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default TotalEmployeesWorkingScreen;

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
  loadingBox:{
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(8),
  },
  loadingText:{
    fontSize: rf(3.4),
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  errorBox:{
    alignItems: 'center',
    paddingVertical: hp(8),
    paddingHorizontal: wp(4),
  },
  errorText:{
    fontSize: rf(3.4),
    color: COLORS.danger,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    textAlign: 'center',
    marginBottom: hp(2),
  },
  retryButton:{
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(6),
    paddingVertical: hp(1.5),
    borderRadius: wp(2),
  },
  retryButtonText:{
    color: COLORS.bg,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  
});


