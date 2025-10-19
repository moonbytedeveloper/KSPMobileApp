import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// import HeaderBackButton from '../../components/common/HeaderBackButton';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import AppHeader from '../../components/common/AppHeader';
import Dropdown from '../../components/common/Dropdown';
import { TYPOGRAPHY, COLORS, SPACING, RADIUS } from '../styles/styles';
import { getEmployeeProjectsWithProgress } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import Loader from '../../components/common/Loader';
const StatusBadge = ({ label }) => {
  const palette = {
    Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
    Approved: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
    Rejected: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.danger },
  };
  const theme = palette[label] || palette.Pending;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
    </View>
  );
};
const TotalProjectScreen = ({ navigation }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorText, setErrorText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const fetchPage = useCallback(async (page = currentPage, pageSize = itemsPerPage, isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setErrorText('');
    try {
      const start = page * pageSize;
      const [cmpUuid, envUuid, userUuid] = await Promise.all([
        getCMPUUID(),
        getENVUUID(),
        getUUID(),
      ]);
      const resp = await getEmployeeProjectsWithProgress({
        cmpUuid, envUuid, userUuid,
        start,
        length: pageSize,
        searchValue,
      });
      const container = resp?.Data ?? resp;
      console.log('datass', container);
      const list = Array.isArray(container?.data)
        ? container.data
        : Array.isArray(container)
          ? container
          : [];
      const total = Number(container?.recordsTotal ?? container?.total ?? list.length) || 0;
      console.log('ss', list);

      if (!resp?.Success || !Array.isArray(list) || list.length === 0) {
        setProjects([]);
        setErrorText(resp?.Message || 'No records');
        setTotalRecords(total);
      } else {
        setProjects(list);
        setTotalRecords(total);
        setErrorText('');
      }
    } catch (err) {
      const apiMsg = err?.response?.data?.Message || err?.message || 'Failed to load projects';
      setErrorText(apiMsg);
      setProjects([]);
      setTotalRecords(0);
    } finally {
      if (isRefresh) setRefreshing(false); else setLoading(false);
    }
  }, [currentPage, itemsPerPage, searchValue]);

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

  const onRefresh = React.useRef(() => { });

  const handleBackPress = () => {
    navigation.goBack();
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notification');
  };

  const itemsPerPageOptions = [5, 10, 20, 50];
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

  const renderStatusTag = (status, statusColor) => (
    <View style={[styles.statusTag, { backgroundColor: statusColor }]}>
      <Text style={styles.statusText}>{status}</Text>
    </View>
  );
  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1 }}>
        <AppHeader title="Total Project" onLeftPress={handleBackPress} onRightPress={handleNotificationPress} />
         <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Loader />
         </View>
      </View>
      
    );
  }
  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Total Project"
        onLeftPress={handleBackPress}
        onRightPress={handleNotificationPress}
      />

      {/* Pagination Controls */}
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
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh.current} />}
          contentContainerStyle={styles.listContent}
        >
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>My Project</Text>

            {projects.length === 0 && (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>{errorText || 'No projects found.'}</Text>
              </View>
            )}
            {projects.map((project, index) => {
              const name = project.ProjectName ?? project.projectName ?? project.Name ?? project.name ?? '—';
              const dueDate = project.DueDate ?? project.dueDate ?? project.Due ?? project.due ?? '—';
              const status = project.Status ?? project.status ?? 'Pending';
              const progressValue = Number(
                project.Progress ?? project.progress ?? 0
              ) || 0;
              const statusColor = status === 'Completed' ? '#10b981' : status === 'On Hold' ? '#f59e0b' : '#3b82f6';
              return (
                <View key={`${name}-${dueDate}-${index}`}>
                  <View style={styles.projectItem}>
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectName}>Project Name: {name}</Text>
                      <Text style={styles.projectDate}>Due Date: {dueDate}</Text>
                      <View style={styles.statusContainer}>
                        <Text style={styles.statusLabel}>Status: </Text>
                        <StatusBadge label={status} />
                      </View>
                      <View style={styles.progressRow}>
                        <Text style={styles.statusLabel}>Progress: </Text>
                        <View style={styles.progressContainer}>
                          <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, progressValue))}%` }]} />
                        </View>
                        <Text style={styles.progressPercent}>{String(progressValue)}%</Text>
                      </View>
                    </View>
                  </View>
                  {index < projects.length - 1 && <View style={styles.separator} />}
                </View>
              );
            })}
          </View>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    // paddingTop: safeAreaTop,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: hp(4),
  },
  paginationContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: '#e5e7eb',
    borderBottomColor: '#e5e7eb',
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
    color: '#374151',
    marginRight: wp(2),
  },
  paginationDropdown: {
    width: wp(18),
    height: hp(5),
    marginHorizontal: wp(1),
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
    gap: wp(2),
  },
  pageButtonTextual: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    backgroundColor: '#ffffff',
  },
  pageText: {
    fontSize: rf(3.5),
    color: '#e34f25',
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
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  pageNumberBtnActive: {
    backgroundColor: '#e34f25',
    borderColor: '#e34f25',
  },
  pageNumberText: {
    fontSize: rf(3.6),
    color: '#e34f25',
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyText: {
    color: '#6b7280',
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },

  // Card Styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: wp(4),
    padding: wp(6),
    marginTop: hp(2),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: wp(0.1),
    borderColor: '#eee',
  },
  sectionTitle: {
    fontSize: rf(6),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: hp(2),
    borderBottomWidth: 1,
    borderBottomColor: '#e34f25',
    paddingBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },

  // Project Item Styles
  projectItem: {
    paddingVertical: hp(1.5),
  },
  projectInfo: {
    gap: hp(1),
  },
  projectName: {
    fontSize: rf(4.2),
    fontWeight: '500',
    color: '#333',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  projectDate: {
    fontSize: rf(4.2),
    fontWeight: '500',
    color: '#333',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  statusLabel: {
    fontSize: rf(4.2),
    fontWeight: '500',
    color: '#333',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  progressContainer: {
    flex: 1,
    height: hp(1.2),
    backgroundColor: '#e5e7eb',
    borderRadius: wp(2),
    overflow: 'hidden',
    marginHorizontal: wp(2),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.5),
  },
  progressPercent: {
    fontSize: rf(3.8),
    fontWeight: '700',
    color: '#111827',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  statusTag: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    borderRadius: wp(2),
  },
  statusText: {
    fontSize: rf(3.5),
    fontWeight: '600',
    color: '#ffffff',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: '#e34f25',
    marginVertical: hp(1.5),
  },

});

export default TotalProjectScreen;
