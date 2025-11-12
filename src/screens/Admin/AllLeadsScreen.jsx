import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import Loader from '../../components/common/Loader';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';
// Removed blocking Loader; keep content visible during fetch
import { getDashboardLeadSummary } from '../../api/authServices';

const AllLeadsScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [leadsData, setLeadsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Pagination state (server-side)
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [totalRecords, setTotalRecords] = useState(0);

  // Fetch when page or pageSize changes
  useEffect(() => {
    fetchLeadsData(currentPage * pageSize, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  const dedupeWithinPage = useCallback((arr) => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    for (const it of arr) {
      const key = it?.Uuid || it?.UUID || String(it?.SrNo ?? '') || `${it?.CompanyName ?? ''}|${it?.Email ?? ''}|${it?.Status ?? ''}|${it?.ActionDueDate ?? ''}`;
      if (!seen.has(key)) { seen.add(key); out.push(it); }
    }
    return out;
  }, []);

  const fetchLeadsData = async (start = 0, length = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboardLeadSummary({ start, length });

      if (response.Success && response.Data && response.Data.leads) {
        const leadsObj = response.Data.leads || {};
        const raw = Array.isArray(leadsObj.data) ? leadsObj.data : [];
        const serverTotal = leadsObj.totalCount ?? leadsObj.recordsTotal ?? leadsObj.totalRecords ?? leadsObj.recordsFiltered ?? raw.length;
        // Expected length for this page
        const expectedLen = Number.isFinite(serverTotal)
          ? Math.max(0, Math.min(length || 0, Math.max(0, serverTotal - (start || 0))))
          : (length || raw.length || 0);
        const unique = dedupeWithinPage(raw);
        const pageSlice = unique.length > expectedLen ? unique.slice(0, expectedLen) : unique;
        setLeadsData(pageSlice);
        setTotalRecords(Number.isFinite(serverTotal) ? serverTotal : pageSlice.length);
      } else {
        setError('Failed to fetch leads data');
        setLeadsData([]);
        setTotalRecords(0);
      }
    } catch (err) {
      console.error('Error fetching leads:', err);
      setError('Failed to load leads. Please try again.');
      Alert.alert('Error', 'Failed to load leads. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Local StatusBadge for this screen to show 'Not Updated' as grey without changing shared components
  const StatusBadge = ({ label = 'Pending' }) => {
    const palette = {
      Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
      'Not Updated': { bg: COLORS.divider, color: 'gray', border: 'gray' },
      Won: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },

      
      Submitted: { bg: COLORS.infoBg, color: COLORS.info, border: COLORS.info },
      Rejected: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.danger },
    };
    const theme = palette[label] || palette.Pending;
    return (
      <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
      </View>
    );
  };

  const data = useMemo(() => leadsData.map((p, idx) => {
    const rawStatus = String(p?.Status ?? '').trim();
    const s = rawStatus.toLowerCase();
    const normalized = s.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
    const isNotUpdated = normalized === 'not updated' || normalized === 'notupdate' || normalized === 'not update';
    const displayStatus = s === 'approved' ? 'Won' : (isNotUpdated ? 'Not Updated' : (rawStatus || 'N/A'));
    const statusForDot = (s === 'approved' || s === 'won' || s.includes('won') || s === 'closed')
      ? 'Approved'
      : s === 'pending'
        ? 'Pending'
        : s === 'on hold'
          ? 'Pending'
        : isNotUpdated
          ? 'Draft'
          : s === 'submitted'
            ? 'Submitted'
            : s === 'rejected'
              ? 'Rejected'
              : rawStatus || 'Submitted';
    return ({
      soleExpenseCode: p?.Uuid || p?.UUID || String(p?.SrNo ?? '') || `${p?.CompanyName ?? 'N/A'}-${p?.Email ?? ''}-${rawStatus}-${p?.ActionDueDate ?? ''}-${currentPage}-${idx}`,
      expenseName: p.CompanyName || 'N/A',
      amount: displayStatus,
      status: statusForDot,
      _original: p,
    });
  }), [leadsData, currentPage]);

  // Pagination calculations
  const totalPages = useMemo(() => Math.ceil(totalRecords / pageSize) || 0, [totalRecords, pageSize]);
  const pageItems = useMemo(() => {
    if (totalPages === 0) return [];
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
    const isNearEnd = (pages[1] === last - 2 && pages[2] === last - 1);
    items.push(pages[0]);
    if (isNearEnd && pages[1] > pages[0] + 1) items.push('left-ellipsis');
    items.push(pages[1]);
    items.push(pages[2]);
    if (!isNearEnd && pages[3] > pages[2] + 1) items.push('right-ellipsis');
    items.push(pages[3]);
    items.push('next');
    return items;
  }, [currentPage, totalPages]);

  const handlePageChange = useCallback((page) => {
    const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
    setCurrentPage(clamped);
  }, [totalPages]);

  // Clamp currentPage when totalRecords changes
  useEffect(() => {
    const lastIndex = Math.max(0, Math.ceil((totalRecords || 0) / pageSize) - 1);
    if (currentPage > lastIndex) setCurrentPage(0);
  }, [totalRecords, pageSize]);

  // Show a blocking loader (full-screen) while initial or page fetch is in progress
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
              headerRightIsStatusBadge={true}
              customRows={[
                { label: 'Company Name', value: p.CompanyName || 'N/A' },
                { label: 'Email', value: p.Email || 'N/A' },
                { label: 'Phone', value: p.Phone || 'N/A' },
                { label: 'Client Detail', value: p.ClientName || 'N/A' },
                { label: 'Next Action', value: p.NextAction || 'N/A' },
                { label: 'Action Due Date', value: p.ActionDueDate || 'N/A' },
                { label: 'Opportunity Owner', value: p.OppOwner || 'N/A' },
                { 
                  label: 'Status', 
                  value: ((() => { 
                    const raw = String(p.Status || '').trim(); 
                    const s = raw.toLowerCase(); 
                    const normalized = s.replace(/[_-]/g,' ').replace(/\s+/g,' ').trim();
                    const isNotUpdated = normalized === 'not updated' || normalized === 'notupdate' || normalized === 'not update';
                    const label = s === 'approved' ? 'Won' : (isNotUpdated ? 'Not Updated' : (raw || 'N/A'));
                    return <StatusBadge label={label} />; 
                  })()), 
                },
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
      {/* Pagination after list */}
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
  // Pagination styles (aligned with proposals screen)
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
  // local badge styles
  badge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    padding: 1,
  },
});


