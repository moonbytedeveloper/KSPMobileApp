import React, { useState, useEffect, useMemo } from 'react';
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
  // Pagination state
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [totalRecords, setTotalRecords] = useState(0);

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
  setTotalRecords(mapped.length);
    } catch (err) {
      console.error('Error fetching total employee working data:', err);
      setError(err.message || 'Failed to fetch total employee working data');
      Alert.alert('Error', 'Failed to load total employee working data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Derived pagination values
  const totalPages = useMemo(() => Math.ceil((totalRecords || 0) / pageSize) || 0, [totalRecords, pageSize]);
  const pagedData = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return Array.isArray(data) ? data.slice(start, end) : [];
  }, [data, currentPage, pageSize]);

  // Adaptive page items (Prev, dynamic pages with ellipses, Next) similar to AllLeads
  const pageItems = useMemo(() => {
    if (!totalPages) return [];
    if (totalPages === 1) return [1];
    const items = [];
    const current = currentPage + 1; // 1-based
    const last = totalPages;
    items.push('prev');
    let pages = [];
    if (last <= 4) {
      for (let p = 1; p <= last; p++) pages.push(p);
    } else if (current <= 2) {
      pages = [1, 2, 3, last];
    } else if (current >= last - 1) {
      pages = [1, last - 2, last - 1, last];
    } else {
      pages = [1, current - 1, current, last];
    }
    pages = Array.from(new Set(pages)).sort((a, b) => a - b);
    if (last > 4) {
      while (pages.length < 4) {
        const first = pages[0];
        const lastNum = pages[pages.length - 1];
        if (first > 1) pages.unshift(first - 1);
        else if (lastNum < last) pages.push(lastNum + 1);
        else break;
      }
    }
    const isNearEnd = pages[1] === last - 2 && pages[2] === last - 1;
    items.push(pages[0]);
    if (isNearEnd && pages[1] > pages[0] + 1) items.push('left-ellipsis');
    items.push(pages[1]);
    items.push(pages[2]);
    if (!isNearEnd && pages[3] > pages[2] + 1) items.push('right-ellipsis');
    items.push(pages[3]);
    items.push('next');
    return items;
  }, [currentPage, totalPages]);

  const handlePageChange = (page) => {
    const max = Math.max(0, Math.ceil((totalRecords || 0) / pageSize) - 1);
    const clamped = Math.max(0, Math.min(page, max));
    setCurrentPage(clamped);
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
            {pagedData.map((item) => (
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

      {totalRecords > 0 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.pageInfo}>
            Showing {totalRecords === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRecords)} of {totalRecords} entries
          </Text>
          <View style={styles.pageNavigation}>
            {pageItems.map((it, idx) => {
              if (it === 'prev') {
                const disabled = currentPage === 0;
                return (
                  <TouchableOpacity
                    key={`prev-${idx}`}
                    style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]}
                    disabled={disabled}
                    onPress={() => handlePageChange(currentPage - 1)}
                  >
                    <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Previous</Text>
                  </TouchableOpacity>
                );
              }
              if (it === 'next') {
                const disabled = currentPage >= totalPages - 1;
                return (
                  <TouchableOpacity
                    key={`next-${idx}`}
                    style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]}
                    disabled={disabled}
                    onPress={() => handlePageChange(currentPage + 1)}
                  >
                    <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Next</Text>
                  </TouchableOpacity>
                );
              }
              if (it === 'left-ellipsis' || it === 'right-ellipsis') {
                return (
                  <View key={`dots-${idx}`} style={styles.pageDots}><Text style={styles.pageNumberText}>...</Text></View>
                );
              }
              if (typeof it !== 'number') return null;
              const pageNum = it;
              const active = pageNum === currentPage + 1;
              return (
                <TouchableOpacity
                  key={`p-${pageNum}`}
                  style={[styles.pageNumberBtn, active && styles.pageNumberBtnActive]}
                  onPress={() => handlePageChange(pageNum - 1)}
                >
                  <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{pageNum}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
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
  // Pagination styles (aligned with other screens)
  paginationContainer: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
    marginBottom: hp(1),
  },
  pageButtonTextual: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    backgroundColor: '#fff',
  },
  pageButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  pageText: {
    fontSize: rf(3.5),
    color: COLORS.primary,
    fontWeight: '600',
  },
  pageTextDisabled: {
    color: '#9ca3af',
  },
  pageDots: {
    paddingHorizontal: wp(1.5),
    minWidth: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.8),
  },
  pageNumberBtn: {
    minWidth: wp(8),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2.4),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pageNumberBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pageNumberText: {
    fontSize: rf(3.6),
    color: COLORS.primary,
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
  pageInfo: {
    fontSize: rf(3.5),
    color: '#6b7280',
    marginBottom: hp(0.5),
    textAlign: 'center',
  },
  
});


