import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS, SPACING } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';
import Loader from '../../components/common/Loader';
import { getDashboardLeadSummary } from '../../api/authServices';
// Removed duplicate import that re-declared COLORS/TYPOGRAPHY


// Removed Dropdown (page size selector) per request

const AllProposalsScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [proposalsData, setProposalsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Pagination (match ExpenseApproval style/logic)
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [totalRecords, setTotalRecords] = useState(0);

  // Dedupe within a page by UUID (fallbacks if UUID missing)
  const dedupeByUuid = useCallback((arr) => {
    if (!Array.isArray(arr)) return [];
    const seen = new Set();
    const out = [];
    for (const it of arr) {
      const key = it?.Uuid || String(it?.SrNo ?? '') || `${it?.CompanyName ?? ''}|${it?.Email ?? ''}|${it?.Status ?? ''}|${it?.ActionDueDate ?? ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push(it);
      }
    }
    return out;
  }, []);

  useEffect(() => {
    // Fetch on mount and when page changes (server-side pagination)
    fetchProposalsData(currentPage * pageSize, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize]);

  const fetchProposalsData = async (start = 0, length = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDashboardLeadSummary({ start, length });

      if (response.Success && response.Data && response.Data.openProposal) {
        const open = response.Data.openProposal || {};
        const raw = Array.isArray(open.data) ? open.data : [];
        const serverTotal = open.totalCount ?? open.recordsTotal ?? open.totalRecords ?? open.recordsFiltered;

        // Expected rows for this page based on total/start/length
        const expectedLen = Number.isFinite(serverTotal)
          ? Math.max(0, Math.min(length || 0, Math.max(0, serverTotal - (start || 0))))
          : (length || raw.length || 0);

        // Remove duplicates within this page and cap to expected length
        const unique = dedupeByUuid(raw);
        const pageData = unique.length > expectedLen ? unique.slice(0, expectedLen) : unique;

        setProposalsData(pageData);
        setTotalRecords(Number.isFinite(serverTotal) ? serverTotal : unique.length);
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

  const data = useMemo(() => proposalsData.map((p, idx) => {
    const rawStatus = String(p?.Status ?? '').trim();
    const s = rawStatus.toLowerCase();
    const displayStatus = s === 'approved' ? 'Won' : (rawStatus || 'N/A');
    // Normalize for dot color in AccordionItem header (case-insensitive, treat Won as Approved)
    const statusForDot = (s === 'approved' || s === 'won' || s.includes('won'))
      ? 'Approved'
      : s === 'pending'
        ? 'Pending'
        : s === 'not updated'
          ? 'Draft'
          : s === 'submitted'
            ? 'Submitted'
            : s === 'rejected'
              ? 'Rejected'
              : rawStatus || 'Submitted';
    return ({
      // Use API identity to avoid React key reuse across pages (prevents visual duplicates)
      soleExpenseCode: p?.Uuid || String(p?.SrNo ?? '') || `${p?.CompanyName ?? 'N/A'}-${p?.Email ?? ''}-${rawStatus}-${p?.ActionDueDate ?? ''}-${idx}`,
      expenseName: p.CompanyName || 'N/A',
      amount: displayStatus, // header right will be rendered as badge by AccordionItem when headerRightIsStatusBadge
      status: statusForDot,  // drives the colored dot
      _original: p,
    });
  }), [proposalsData]);

  // Pagination helpers (same UX approach as ExpenseApproval)
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
    if (isNearEnd) {
      if (pages[1] > pages[0] + 1) items.push('left-ellipsis');
    }
    items.push(pages[1]);
    items.push(pages[2]);
    if (!isNearEnd) {
      if (pages[3] > pages[2] + 1) items.push('right-ellipsis');
    }
    items.push(pages[3]);
    items.push('next');
    return items;
  }, [currentPage, totalPages]);

  const handlePageChange = useCallback((page) => {
    const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
    setCurrentPage(clamped);
  }, [totalPages]);

  // Removed page size change handler since selector was removed

  // Server returns current page slice; don't slice again client-side
  const dataToRender = useMemo(() => Array.isArray(data) ? data : [], [data]);

  // Clamp currentPage whenever total records or page size changes to avoid empty pages
  useEffect(() => {
    const lastIndex = Math.max(0, Math.ceil((totalRecords || 0) / pageSize) - 1);
    if (currentPage > lastIndex) {
      setCurrentPage(0);
    }
  }, [totalRecords, pageSize]);

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
  if (loading){
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

const StatusBadge = ({ label = 'Pending' }) => {
  const palette = {
    Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
    Won: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
    Rejected: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.danger },
    Submitted: { bg: COLORS.infoBg, color: COLORS.info, border: COLORS.info },
  };

  const theme = palette[label] || palette.Pending;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
    </View>
  );
};


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
        {dataToRender.map((item) => {
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
              headerRightIsStatusBadge={true}
              customRows={[
                { label: 'Company Name', value: p.CompanyName || 'N/A' },
                { label: 'Email', value: p.Email || 'N/A' },
                { label: 'Phone', value: p.Phone || 'N/A' },
                { label: 'Client Detail', value: p.ClientName || 'N/A' },
                { label: 'Next Action', value: p.NextAction || 'N/A' },
                { label: 'Action Due Date', value: p.ActionDueDate || 'N/A' },
                { label: 'Opportunity Owner', value: p.OppOwner || 'N/A' },
                { label: 'Status', value: p.Status ? <StatusBadge label={p.Status} /> : <Text>N/A</Text> }
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
      {/* Pagination placed AFTER ScrollView */}
      {totalRecords > 0 && (
        <View style={styles.paginationContainerTop}>
          <Text style={styles.pageInfo}>
            Showing {totalRecords === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRecords)} of {totalRecords} entries
          </Text>
          <View style={styles.pageNavigation}>
            {pageItems.map((it, idx) => {
              if (it === 'prev') {
                const disabled = currentPage === 0;
                return (
                  <TouchableOpacity
                    key={`prev-bottom-${idx}`}
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
                    key={`next-bottom-${idx}`}
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
                  <View key={`dots-bottom-${idx}`} style={styles.pageDots}><Text style={styles.pageNumberText}>...</Text></View>
                );
              }
              if (typeof it !== 'number') return null;
              const pageNum = it;
              const active = pageNum === currentPage + 1;
              return (
                <TouchableOpacity
                  key={`p-bottom-${pageNum}`}
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

export default AllProposalsScreen;

const styles = StyleSheet.create({
    badge: {
      borderWidth: 1,
      paddingVertical: hp(0.2),
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.md,
    },
    badgeText: {
      fontSize: 9,
      fontWeight:'600',
      padding: 1
    },
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
  // Pagination styling (mirrors ExpenseApproval)
  paginationContainerTop: {
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
  
    // Removed page size selector (showRow/showText)
});


