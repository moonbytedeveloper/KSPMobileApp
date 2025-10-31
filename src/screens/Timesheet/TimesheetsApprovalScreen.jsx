import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import AppHeader from '../../components/common/AppHeader';
import Dropdown from '../../components/common/Dropdown';
import { COLORS, TYPOGRAPHY,SPACING,RADIUS } from '../styles/styles';
import Loader from '../../components/common/Loader';
import { getNotApprovedTimesheets } from '../../api/authServices';
const StatusBadge = ({ label  }) => {
  const palette = {
    Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
    Submitted: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
    Rejected: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.danger },
  };
  const theme = palette[label] || palette.Pending;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
      <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
    </View>
  );
};

const SummaryCard = ({ employeeName, totalHoursWorked, fromDate, toDate, status }) => {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.sectionTitle}>Summary</Text>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Employee</Text>
        <Text style={styles.fieldValue}>{employeeName}</Text>
      </View>

      <View style={styles.divider} />

      {!!status && (
        <>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Status</Text>
            <StatusBadge label={status} />
          </View>
          <View style={styles.divider} />
        </>
      )}

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Total Hours Worked</Text>
        <Text style={styles.fieldValue}>{totalHoursWorked}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.dateRow}>
        <View style={styles.dateCol}>
          <Text style={styles.fieldLabel}>From</Text>
          <Text style={styles.fieldValue}>{fromDate}</Text>
        </View>
        <View style={styles.dateCol}>
          <Text style={styles.fieldLabel}>To</Text>
          <Text style={styles.fieldValue}>{toDate}</Text>
        </View>
      </View>
    </View>
  );
};

const TimesheetsApprovalScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [timesheetSummaries, setTimesheetSummaries] = useState([]);
  const [errorText, setErrorText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

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

  const fetchPage = useCallback(async (page = currentPage, pageSize = itemsPerPage, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setErrorText('');
    try {
      const start = page * pageSize;
      const raw = await getNotApprovedTimesheets({ start, length: pageSize });
      const container = raw?.Data || raw || {};
      const list = Array.isArray(container?.Timesheets) ? container.Timesheets
        : Array.isArray(container?.data) ? container.data
        : Array.isArray(container?.rows) ? container.rows
        : Array.isArray(container?.Records) ? container.Records
        : Array.isArray(container?.items) ? container.items
        : [];
      if (!raw?.Success || !Array.isArray(list) || list.length === 0) {
        setTimesheetSummaries([]);
        setErrorText(raw?.Message || 'No records');
        const totalFromResponse =
          (typeof container?.recordsTotal === 'number' && container.recordsTotal) ||
          (typeof container?.TotalCount === 'number' && container.TotalCount) ||
          0;
        setTotalRecords(totalFromResponse);
      } else {
        const mapped = list.map((item, idx) => ({
          id: item.HeaderUuid || String(idx),
          employeeName: item.FullName || '-',
          totalHoursWorked: String(item.Total_Hours ?? '-'),
          Total_Hours: item.Total_Hours,
          fromDate: formatDate(item.WeekStart),
          toDate: formatDate(item.WeekEnd),
          status: item.Status || '-',
        }));
        setTimesheetSummaries(mapped);
        // total count can come from multiple places
        const totalFromResponse =
          (typeof container?.recordsTotal === 'number' && container.recordsTotal) ||
          (typeof container?.recordsFiltered === 'number' && container.recordsFiltered) ||
          (typeof container?.TotalCount === 'number' && container.TotalCount) ||
          (typeof container?.TotalRecords === 'number' && container.TotalRecords) ||
          mapped.length;
        setTotalRecords(totalFromResponse);
        setErrorText('');
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.Message || err?.message || 'Failed to load timesheets';
      setErrorText(apiMsg);
      setTimesheetSummaries([]);
      setTotalRecords(0);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchPage(0, itemsPerPage, false);
    onRefresh.current = () => {
      setCurrentPage(0);
      fetchPage(0, itemsPerPage, true);
    };
  }, []);

  useEffect(() => {
    fetchPage(currentPage, itemsPerPage, false);
  }, [currentPage, itemsPerPage]);

  const onRefresh = React.useRef(() => {});

  const itemsPerPageOptions = [10, 20, 50, 100];
  const totalPages = Math.max(1, Math.ceil(totalRecords / (itemsPerPage || 1)));
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
    // dedupe
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

  const handleBack = () => {
    navigation.goBack();
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notification');
  };
  if (loading && !refreshing) {
    return  (
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
    <View style={styles.safeArea}>
        <AppHeader
          title="Timesheets Approval"
          onLeftPress={handleBack}
          onRightPress={handleNotificationPress}
        />
        {/* Pagination Controls (same UX as BusinessDevelopmentScreen) */}
        <View style={styles.paginationContainer}>
          <View style={styles.itemsPerPageContainer}>
            <Text style={styles.paginationLabel}>Show:</Text>
            <Dropdown
              placeholder="10"
              value={itemsPerPage}
              options={itemsPerPageOptions}
              onSelect={handleItemsPerPageChange}
              hideSearch={true}
              inputBoxStyle={styles.paginationDropdown}
            />
            <Text style={styles.paginationLabel}>entries</Text>
          </View> 
        </View>
      <View style={styles.container}>
          
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.listContent,timesheetSummaries.length === 0 && { flex: 1 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh.current} />}
        >
          {timesheetSummaries.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>{errorText}</Text>
            </View>
          )}
         
          {timesheetSummaries.map(item => (
            <SummaryCard
              key={item.id}
              employeeName={item.employeeName}
              totalHoursWorked={item.Total_Hours}
              fromDate={item.fromDate}
              toDate={item.toDate}
              status={item.status}
            />
          ))}

          
        </ScrollView>
     
      </View>
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
    </View>
  );
};

export default TimesheetsApprovalScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    //paddingTop: safeAreaTop,
  },
  containers: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  listContent: {
    paddingBottom: hp(4),
  },
  paginationContainer: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: COLORS.border,
    borderBottomColor: COLORS.border,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    zIndex: 1000,
  },
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  paginationLabel: {
    fontSize: rf(3.5),
    color: COLORS.text,
    marginRight: wp(2),
  },
  paginationDropdown: {
    width: wp(18),
    height: hp(5),
    marginHorizontal: wp(1),
  },
  pageInfo: {
    fontSize: rf(3.5),
    color: COLORS.textLight,
    marginBottom: hp(1),
    textAlign: 'center',
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  pageButtonTextual: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    backgroundColor: COLORS.bg,
  },
  pageText: {
    fontSize: rf(3.5),
    color: COLORS.primary,
    fontWeight: '600',
  },
  pageTextDisabled: {
    color: COLORS.textMuted,
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
    borderColor: COLORS.border,
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
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
  summaryCard: {
    backgroundColor: COLORS.bg,
    borderRadius: wp(3),
    padding: wp(3.5),
    marginTop: hp(0.5),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(2),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.2),
  },
  fieldLabel: {
    fontSize: rf(3.6),
    color: COLORS.textMuted,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  fieldValue: {
    fontSize: rf(3.8),
    color: COLORS.text,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.2),
  },
  dateCol: {
    paddingVertical: hp(1.2),
  },
  emptyBox: {
    flex:1,
    justifyContent:'center',
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  badge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    padding: 1 
  }, 
});


