import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import HeaderBackButton from '../../components/common/HeaderBackButton';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import AccordionItem from '../../components/common/AccordionItem';
import AppHeader from '../../components/common/AppHeader';
import Dropdown from '../../components/common/Dropdown';
import { getPendingTimesheets } from '../../api/authServices';
import Loader from '../../components/common/Loader';
import CommonBottomSheet from '../../components/common/CommonBottomSheet';
import { COLORS, SPACING, RADIUS ,theme, border } from '../styles/styles';

const formatDate = (iso) => {
  try {
    if (!iso) return '';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch (e) {
    return String(iso);
  }
};

const StatusBadge = ({ label = 'Pending' }) => {
  const palette = {
    Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
    'Not Updated': { bg: COLORS.divider, color: 'gray', border: 'gray' },
    Submitted: { bg: COLORS.infoBg, color: COLORS.info, border: COLORS.info },
    Approved: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
    Closed: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.danger },
  };
  
  const theme = palette[label] || palette.Pending;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
      <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
    </View>
  );
};


const PendingTimesheetScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [data, setData] = useState([]);
  const [pagedData, setPagedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetContent, setSheetContent] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const fetchMissing = async (isRefresh) => {
      if (isRefresh) setRefreshing(true); else setLoading(true);
      setErrorText('');
      try {
        const raw = await getPendingTimesheets();
        const list = Array.isArray(raw?.Data) ? raw.Data : [];

        if (!isMounted) return;

        if (!raw?.Success || list.length === 0) {
          setData([]);
          setErrorText(raw?.Message || 'No overdue timesheets.');
          return;
        }

        const mapped = list.map((item, idx) => {
          const uniqueKey = `${item.EmployeeUuid || idx}|${item.WeekStart}|${item.WeekEnd}`;
          return {
            id: item.EmployeeUuid || String(idx),
            soleExpenseCode: item.EmployeeUuid || String(idx),
            documentFromDate: formatDate(item.WeekStart),
            documentToDate: formatDate(item.WeekEnd),
            amount: item.Status || '-',
            status: item.Status || '-',
            EmployeeUuid: item.EmployeeUuid,
            FullName: item.FullName,
            CompanyEmail: item.CompanyEmail ?? '-',
            WeekStart: item.WeekStart,
            WeekEnd: item.WeekEnd,
            Status: item.Status || '-',
            expenseName: `${item.WeekStart} - ${item.WeekEnd}`,
            uniqueKey,
          };
        });

        // Deduplicate in case API returns overlapping rows
        const seen = new Set();
        const deduped = [];
        for (const it of mapped) {
          const k = it.uniqueKey;
          if (seen.has(k)) continue;
          seen.add(k);
          deduped.push(it);
        }

        setData(deduped);
        setTotalRecords(deduped.length);
      } catch (err) {
        if (!isMounted) return;
        const apiMsg = err?.response?.data?.Message || err?.message || 'Failed to load overdue timesheets';
        setErrorText(apiMsg);
        setData([]);
      } finally {
        if (isRefresh) setRefreshing(false); else if (isMounted) setLoading(false);
      }
    };
    fetchMissing(false);
    onRefresh.current = () => fetchMissing(true);
    return () => {
      isMounted = false;
    };
  }, []);

  const onRefresh = React.useRef(() => { });

  // Recompute current page slice whenever inputs change
  useEffect(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPagedData(data.slice(startIndex, endIndex));
  }, [data, currentPage, itemsPerPage]);

  const itemsPerPageOptions = [10, 20, 50, 100];
  const totalPages = Math.max(1, Math.ceil((totalRecords || 0) / (itemsPerPage || 1)));
  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    const items = [];
    const current = currentPage + 1;
    const last = totalPages;
    items.push('prev');
    for (let p = 1; p <= Math.min(2, last); p++) items.push(p);
    if (current > 4 && last > 5) items.push('left-ellipsis');
    const startWin = Math.max(3, current - 1);
    const endWin = Math.min(last - 2, current + 1);
    for (let p = startWin; p <= endWin; p++) items.push(p);
    if (current < last - 3 && last > 5) items.push('right-ellipsis');
    for (let p = Math.max(last - 1, 3); p <= last; p++) items.push(p);
    items.push('next');
    const seen = new Set();
    const dedup = [];
    for (const it of items) { const k = String(it); if (seen.has(k)) continue; seen.add(k); dedup.push(it); }
    return dedup;
  }, [currentPage, totalPages]);

  const handlePageChange = (page) => {
    if (page < 0 || page > totalPages - 1) return;
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(0);
  };

  const handleToggle = (uniqueKey) => {
    setActiveCode(prev => (prev === uniqueKey ? null : uniqueKey));
  };

  const handleView = (item) => {
    navigation.navigate('Main', { screen: 'Timesheet' });
  };

  const handleSubmitTimesheet = (item) => {
    console.log('Submit Timesheet for:', item);
    // Add your submit timesheet logic here
    // You can show a confirmation dialog or call an API
    // For now, just show an alert or navigate to submit screen
    alert(`Submit timesheet for ${item.FullName} - Week: ${item.WeekStart} to ${item.WeekEnd}`);
  };
  if (loading && !refreshing) {
    return (
      <View style={styles.containers}>
        <AppHeader
          title="Total Project"
          onLeftPress={() => navigation.goBack()}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Timesheets Overdue For Submission"
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />

      {/* Pagination controls header */}
     {!(data.length === 0) && <View style={styles.paginationContainer}>
        <View style={styles.itemsPerPageContainer}>
          <Text style={styles.paginationLabel}>Show</Text>
          <Dropdown
            placeholder="10"
            value={itemsPerPage}
            options={itemsPerPageOptions}
            onSelect={handleItemsPerPageChange}
            hideSearch
            maxPanelHeightPercent={15}
            inputBoxStyle={{ paddingHorizontal: wp(3.2) }}
            style={{ width: wp(14), marginBottom: hp(1.1),marginEnd: wp(1.1) }}
          />
          <Text style={styles.paginationLabel}>entries</Text>
        </View>
      </View>}

      <ScrollView contentContainerStyle={[styles.scrollContent, data.length === 0 && { flex: 1 }]} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh.current} />}
      >

        {data.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{errorText || 'No overdue timesheets.'}</Text>
          </View>
        )}
        {pagedData.map((item) => (
          <AccordionItem
            key={item.uniqueKey || item.soleExpenseCode}
            item={item}
            isActive={activeCode === item.uniqueKey}
            onToggle={() => handleToggle(item.uniqueKey)}
            showViewButton={false}
            showSubmitButton={item.Status === 'Pending' || item.Status === 'Draft'}
            onSubmit={handleSubmitTimesheet}
            navigation={navigation}
            headerLeftLabel="WeekRange"
            headerRightLabel="Status"
            customRows={[
              { label: 'FullName', value: item.FullName },
              { label: 'WeekStart', value: item.WeekStart },
              { label: 'WeekEnd', value: item.WeekEnd },
              {
                label: 'Status',
                value: <StatusBadge label={item.Status} />, // 👈 use your component here
              },
            ]}
          />

        ))}


      </ScrollView>

      {/* Pagination controls footer */}
      <View style={styles.paginationContainer}>
        <Text style={styles.pageInfo}>
          Showing {totalRecords === 0 ? 0 : currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalRecords)} of {totalRecords} entries
        </Text>
        <View style={styles.pageNavigation}>
          {pageItems.map((it, idx) => {
            if (it === 'prev') {
              const disabled = currentPage === 0;
              return (
                <TouchableOpacity key={`prev-${idx}`} style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]} disabled={disabled} onPress={() => handlePageChange(currentPage - 1)}>
                  <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Previous</Text>
                </TouchableOpacity>
              );
            }
            if (it === 'next') {
              const disabled = currentPage >= totalPages - 1;
              return (
                <TouchableOpacity key={`next-${idx}`} style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]} disabled={disabled} onPress={() => handlePageChange(currentPage + 1)}>
                  <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Next</Text>
                </TouchableOpacity>
              );
            }
            if (it === 'left-ellipsis' || it === 'right-ellipsis') {
              return (
                <View key={`dots-${idx}`} style={styles.pageDots}><Text style={styles.pageText}>...</Text></View>
              );
            }
            const pageNum = it;
            const active = pageNum === currentPage + 1;
            return (
              <TouchableOpacity key={`p-${pageNum}`} style={[styles.pageNumberBtn, active && styles.pageNumberBtnActive]} onPress={() => handlePageChange(pageNum - 1)}>
                <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{pageNum}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <CommonBottomSheet
        visible={sheetVisible}
        onDismiss={() => setSheetVisible(false)}
        snapPoints={[hp(35)]}
      >
        <View style={{ paddingVertical: hp(1.5) }}>
          <Text style={{ fontSize: rf(4), fontWeight: '700', marginBottom: hp(1) }}>{sheetContent?.title}</Text>
          {sheetContent?.item && (
            <>
              <Text style={{ fontSize: rf(3.4) }}>FullName: {sheetContent.item.FullName}</Text>
              <Text style={{ fontSize: rf(3.4) }}>EmployeeUuid: {sheetContent.item.EmployeeUuid}</Text>
              <Text style={{ fontSize: rf(3.4) }}>Status: {sheetContent.item.Status}</Text>
              <Text style={{ fontSize: rf(3.4) }}>WeekStart: {sheetContent.item.WeekStart}</Text>
              <Text style={{ fontSize: rf(3.4) }}>WeekEnd: {sheetContent.item.WeekEnd}</Text>
            </>
          )}
        </View>
      </CommonBottomSheet>
    </View>
  );
};

export default PendingTimesheetScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  containers: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  paginationContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: '#e5e7eb',
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    position: 'relative',
    zIndex: 1000,
    elevation: 2,
  },
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
    position: 'relative',
    zIndex: 1000,
  },
  paginationLabel: {
    fontSize: rf(3.5),
    color: '#111827',
    marginRight: wp(2),
  },
  paginationDropdown: {
    width: wp(16),
    height: hp(4),
    marginHorizontal: wp(1),
    zIndex: 1000,
    position: 'relative',
  },
  scrollContent: {
    flexGrow: 1,
    paddingVertical: wp(3),
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
    zIndex: 0,
  },
  pageInfo: {
    fontSize: rf(3.5),
    color: '#6b7280',
    marginBottom: hp(1),
    textAlign: 'center',
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButtonTextual: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    marginHorizontal: wp(1),
  }, 
  badge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    padding: 1 
  }, 
  pageText: {
    fontSize: rf(3.5),
    color: '#2563eb',
    fontWeight: '600',
  },
  pageTextDisabled: {
    color: '#9ca3af',
  },
  pageDots: {
    paddingHorizontal: wp(2),
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageNumberBtn: {
    minWidth: wp(8),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2.4),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: wp(0.5),
  },
  pageNumberBtnActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  pageNumberText: {
    fontSize: rf(3.6),
    color: '#2563eb',
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  emptyText: {
    fontSize: rf(4),
    color: '#6b7280',
    textAlign: 'center',
  },
});
