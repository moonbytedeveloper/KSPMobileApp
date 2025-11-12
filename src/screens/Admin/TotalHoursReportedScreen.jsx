import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AppHeader from '../../components/common/AppHeader';
import AccordionItem from '../../components/common/AccordionItem';
import Loader from '../../components/common/Loader';
import { getTotalHoursReported } from '../../api/authServices';
import { getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import { hp, rf, wp } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../styles/styles';

// Screen to show Project -> Task -> Employee hours with pagination and list-only loader
const TotalHoursReportedScreen = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false); // initial/full fetch indicator (used to suppress empty state during fetch)
  const [selectedCompanyUUID, setSelectedCompanyUUID] = useState(null);
  const [listLoading, setListLoading] = useState(false); // loader only for pagination page changes
  const [error, setError] = useState(null);

  // Client-side pagination state
  const [pageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0); // 0-based
  const [totalRecords, setTotalRecords] = useState(0);

  // INITIAL LOAD: fetch UUIDs then data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [cmpUUID, envUUID] = await Promise.all([getCMPUUID(), getENVUUID()]);
        setSelectedCompanyUUID(cmpUUID);
        if (cmpUUID && envUUID) {
          await fetchTotalHoursReportedData({ cmpUuid: cmpUUID, envUuid: envUUID });
        }
      } catch (err) {
        setError('Failed to load company information');
      }
    };
    loadData();
  }, []);

  // Fetch and normalize API data into flattened accordion items
  const fetchTotalHoursReportedData = async (ids) => {
    try {
  setLoading(true);
      setError(null);

      const cmpUUID = ids?.cmpUuid || ids?.cmpUUID || selectedCompanyUUID || (await getCMPUUID());
      const envUUID = ids?.envUuid || ids?.envUUID || (await getENVUUID());
      if (!cmpUUID || !envUUID) return;

      const response = await getTotalHoursReported({ cmpUuid: cmpUUID, envUuid: envUUID });

      const toArray = (v) => (Array.isArray(v) ? v : []);
      const looksLikeProject = (obj) =>
        obj && typeof obj === 'object' && ('ProjectName' in obj || 'projectName' in obj || 'Tasks' in obj || 'tasks' in obj);
      const findProjectsArray = (src, depth = 0) => {
        if (!src || depth > 4) return [];
        if (Array.isArray(src)) {
          if (src.some((el) => looksLikeProject(el))) return src;
        }
        if (typeof src === 'object') {
          for (const key of Object.keys(src)) {
            const val = src[key];
            if (Array.isArray(val) && val.some((el) => looksLikeProject(el))) return val;
            if (val && typeof val === 'object') {
              const found = findProjectsArray(val, depth + 1);
              if (found.length) return found;
            }
          }
        }
        return [];
      };

      const root = response?.Data ?? response?.data ?? response ?? [];
      const projects = Array.isArray(root) ? root : findProjectsArray(root);

      const flattened = [];
      projects.forEach((proj, pIdx) => {
        const projectName = String(proj?.ProjectName || proj?.projectName || 'Unknown Project');
        const projectTotal = String(proj?.TotalHours || proj?.totalHours || '0:00');
        let tasks = toArray(proj?.Tasks || proj?.tasks);
        // If tasks missing but task-like fields exist at project level, wrap single task
        if (!tasks.length && (proj?.TaskName || proj?.taskName)) {
          tasks = [
            {
              TaskName: proj?.TaskName || proj?.taskName,
              TotalUsedHours: proj?.TotalUsedHours || proj?.totalUsedHours || projectTotal || '0:00',
              HoursUsed: toArray(proj?.HoursUsed || proj?.hoursUsed),
            },
          ];
        } 
        // Placeholder if still no tasks
        if (!tasks.length) {
          flattened.push({
            id: `${pIdx}-no-task-${projectName}`,
            expenseName: projectName,
            amount: projectTotal || '0:00',
            customRows: [{ label: 'Task Name', value: '—' }],
          });
          return;
        }
        // Each task becomes one accordion item
        tasks.forEach((task, tIdx) => {
          const taskName = String(task?.TaskName || task?.taskName || 'Unknown Task');
          const totalUsed = String(task?.TotalUsedHours || task?.totalUsedHours || '0:00');
          const hoursUsed = toArray(task?.HoursUsed || task?.hoursUsed);
          const rows = [
            { label: 'Task Name', value: taskName },
            ...hoursUsed.map((h, i) => ({
              label: String(h?.EmployeeName || h?.employeeName || `Employee ${i + 1}`),
              value: String(h?.UsedHours || h?.usedHours || '0:00'),
            })),
          ];
          flattened.push({
            id: `${pIdx}-${tIdx}-${projectName}-${taskName}`,
            expenseName: projectName, // header left
            amount: projectTotal, // header right (Project Total Hours)
            customRows: rows,
            extraRowsAfterLine: [{ label: 'Total Used Hours', value: totalUsed }],
          });
        });
      });

      setData(flattened);
      setTotalRecords(flattened.length);
    } catch (err) {
      setError(err?.message || 'Failed to fetch total hours reported data');
      try { Alert.alert('Error', 'Failed to load total hours reported data. Please try again.'); } catch (_) {}
    } finally {
  setLoading(false);
    }
  };

  // Accordion toggle handler
  const handleToggle = (code) => setActiveCode((prev) => (prev === code ? null : code));

  // Derived pagination values
  const totalPages = useMemo(() => Math.ceil((totalRecords || 0) / pageSize) || 0, [totalRecords, pageSize]);
  const pagedData = useMemo(() => {
    const start = currentPage * pageSize;
    const end = start + pageSize;
    return Array.isArray(data) ? data.slice(start, end) : [];
  }, [data, currentPage, pageSize]);

  // Page change shows a small loader in the list area (pagination remains visible)
  const handlePageChange = (page) => {
    setListLoading(true);
    const max = Math.max(0, Math.ceil((totalRecords || 0) / pageSize) - 1);
    const clamped = Math.max(0, Math.min(page, max));
    setCurrentPage(clamped);
    setTimeout(() => setListLoading(false), 200);
  };

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
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchTotalHoursReportedData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : listLoading ? (
          <View style={styles.listLoaderWrapper}>
            <Loader />
          </View>
        ) : (
          <>
            {pagedData.map((item) => (
              <AccordionItem
                key={item.id}
                item={item}
                isActive={activeCode === item.id}
                onToggle={() => handleToggle(item.id)}
                onView={false}
                onEdit={false}
                onDelete={false}
                headerLeftLabel={'Project Name'}
                headerRightLabel={'Total Hours'}
                customRows={item.customRows}
                extraRowsAfterLine={item.extraRowsAfterLine}
                rowLabelStyleMap={{ 'Task Name': { color: COLORS.primary, fontSize: rf(3.6), fontWeight: '700' } }}
                rowValueStyleMap={{ 'Task Name': { color: COLORS.primary, fontSize: rf(3.6), fontWeight: '700' } }}
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

      {totalRecords > 0 && (
        <View style={styles.paginationContainer}>
          <Text style={styles.pageInfo}>
            Showing {totalRecords === 0 ? 0 : currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRecords)} of {totalRecords} entries
          </Text>
          <View style={styles.pageNavigation}>
            <TouchableOpacity
              style={[styles.pageButtonTextual, currentPage === 0 && styles.pageButtonDisabled]}
              disabled={currentPage === 0}
              onPress={() => handlePageChange(currentPage - 1)}
            >
              <Text style={[styles.pageText, currentPage === 0 && styles.pageTextDisabled]}>Previous</Text>
            </TouchableOpacity>

            {totalPages > 0 && (
              <>
                <TouchableOpacity
                  style={[styles.pageNumberBtn, currentPage === 0 && styles.pageNumberBtnActive]}
                  onPress={() => handlePageChange(0)}
                >
                  <Text style={[styles.pageNumberText, currentPage === 0 && styles.pageNumberTextActive]}>1</Text>
                </TouchableOpacity>
                {totalPages > 3 && (
                  <View style={styles.pageDots}>
                    <Text style={styles.pageNumberText}>...</Text>
                  </View>
                )}
                {totalPages > 2 && (
                  <TouchableOpacity
                    style={[styles.pageNumberBtn, currentPage === totalPages - 2 && styles.pageNumberBtnActive]}
                    onPress={() => handlePageChange(Math.max(0, totalPages - 2))}
                  >
                    <Text style={[styles.pageNumberText, currentPage === totalPages - 2 && styles.pageNumberTextActive]}>{Math.max(1, totalPages - 1)}</Text>
                  </TouchableOpacity>
                )}
                {totalPages > 1 && (
                  <TouchableOpacity
                    style={[styles.pageNumberBtn, currentPage === totalPages - 1 && styles.pageNumberBtnActive]}
                    onPress={() => handlePageChange(totalPages - 1)}
                  >
                    <Text style={[styles.pageNumberText, currentPage === totalPages - 1 && styles.pageNumberTextActive]}>{totalPages}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            <TouchableOpacity
              style={[styles.pageButtonTextual, currentPage >= totalPages - 1 && styles.pageButtonDisabled]}
              disabled={currentPage >= totalPages - 1}
              onPress={() => handlePageChange(currentPage + 1)}
            >
              <Text style={[styles.pageText, currentPage >= totalPages - 1 && styles.pageTextDisabled]}>Next</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      {loading && (
        <View style={styles.fullscreenLoader}>
          <Loader />
        </View>
      )}
    </View>
  );
};

export default TotalHoursReportedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
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
  listLoaderWrapper: {
    minHeight: hp(40),
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  fullscreenLoader: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)'
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


