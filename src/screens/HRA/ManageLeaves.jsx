import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import LeaveItem from '../../components/common/LeaveItem';
import AppHeader from '../../components/common/AppHeader';
import CommonBottomSheet from '../../components/common/CommonBottomSheet';
import { COLORS, SPACING, RADIUS } from '../styles/styles';
import { getManageLeave } from '../../api/authServices';
import Dropdown from '../../components/common/Dropdown';
import { getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import Loader from '../../components/common/Loader';



const StatusBadge = ({ label = 'Pending' }) => {
  const palette = {
    Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
    Approved: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
    Rejected: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.danger },
    Won: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
    Closed: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
  };
  const theme = palette[label] || palette.Pending;

  return (
    <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
      <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
    </View>
  );
};

const ManageLeaves = ({ navigation }) => {
  const [activeCode, setActiveCode] = useState(null);
  const [data, setData] = useState([]);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [remark, setRemark] = useState('');
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchValue, setSearchValue] = useState('');

  useEffect(() => {
    const load = async (page = currentPage, pageSize = itemsPerPage, isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true); else setLoading(true);
        const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
        const start = page * pageSize;
        const resp = await getManageLeave({ cmpUuid, envUuid, start, length: pageSize, searchValue });
        const container = resp?.Data ?? resp;
        const rows = Array.isArray(container?.data) ? container.data : Array.isArray(container?.Rows) ? container.Rows : Array.isArray(container) ? container : [];
        const mapped = rows.map((r, idx) => ({
          soleExpenseCode: r?.UUID || r?.SoleExpenseCode || String(idx + 1),
          srNo: String(idx + 1),
          applyDate: r?.StartDate || r?.AppliedDate || '',
          status: r?.Status || '',
          employeeName: r?.AppliedBy || r?.EmployeeName || r?.EmpName || '',
          leaveType: r?.LeaveType || '',
          reason: r?.Reason || '',
          fromDate: r?.StartDate || r?.FromDate || '',
          actionTakenDate: r?.ActionTakenDate || 'null',
          toDate: r?.EndDate || r?.ToDate || '',
          days: r?.Days || r?.TotalDays || 0,
          remark: r?.Remark || r?.Remarks || '',
          contactNo: r?.ContactNumber || r?.ContactNo || '',
          parameter: r?.Parameter || '',
          approvedBy: r?.ApprovedBy || '',
        }));
        setData(mapped);
        const total = Number(container?.recordsTotal ?? container?.TotalCount ?? rows.length) || rows.length;
        setTotalRecords(total);
        setApiError(rows.length === 0 ? (resp?.Message || 'No leaves found') : '');
      } catch (e) {
        setApiError((e?.response?.data?.Message) || e?.message || 'Failed to load leaves');
        setData([]);
        setTotalRecords(0);
      } finally {
        if (isRefresh) setRefreshing(false); else setLoading(false);
      }
    };
    load(0, itemsPerPage, false);
    onRefresh.current = () => load(0, itemsPerPage, true);
  }, []);

  useEffect(() => {
    const run = async () => {
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const start = currentPage * itemsPerPage;
      setLoading(true);
      try {
        const resp = await getManageLeave({ cmpUuid, envUuid, start, length: itemsPerPage, searchValue });
        const container = resp?.Data ?? resp;
        const rows = Array.isArray(container?.data) ? container.data : Array.isArray(container?.Rows) ? container.Rows : Array.isArray(container) ? container : [];
        const mapped = rows.map((r, idx) => ({
          soleExpenseCode: r?.UUID || r?.SoleExpenseCode || String(idx + 1),
          srNo: String(idx + 1),
          applyDate: r?.StartDate || r?.AppliedDate || '',
          status: r?.Status || '',
          employeeName: r?.AppliedBy || r?.EmployeeName || r?.EmpName || '',
          leaveType: r?.LeaveType || '',
          reason: r?.Reason || '',
          fromDate: r?.StartDate || r?.FromDate || '',
          actionTakenDate: r?.ActionTakenDate || 'null',
          toDate: r?.EndDate || r?.ToDate || '',
          days: r?.Days || r?.TotalDays || 0,
          remark: r?.Remark || r?.Remarks || '',
          contactNo: r?.ContactNumber || r?.ContactNo || '',
          parameter: r?.Parameter || '',
          approvedBy: r?.ApprovedBy || '',
        }));
        setData(mapped);
        const total = Number(container?.recordsTotal ?? container?.TotalCount ?? rows.length) || rows.length;
        setTotalRecords(total);
        setApiError(rows.length === 0 ? (resp?.Message || 'No leaves found') : '');
      } catch (e) {
        setApiError((e?.response?.data?.Message) || e?.message || 'Failed to load leaves');
        setData([]);
        setTotalRecords(0);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [currentPage, itemsPerPage, searchValue]);

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

  const handleToggle = (code) => {
    setActiveCode(prev => (prev === code ? null : code));
  };

  const openActionSheet = (item) => {
    setSelectedItem(item);
    setRemark(item?.remark || '');
    setSheetVisible(true);
  };

  const handleDelete = (code) => {
    setData(prev => prev.filter(e => e.soleExpenseCode !== code));
    if (activeCode === code) setActiveCode(null);
  };
  
  if (loading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Manage Leaves"
          onLeftPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            let parent = navigation;
            for (let i = 0; i < 3; i++) {
              parent = parent?.getParent?.();
              if (!parent) break;
              if (typeof parent.openDrawer === 'function') {
                parent.openDrawer();
                return;
              }
            }
            navigation.dispatch?.({ type: 'OPEN_DRAWER' });
          }}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <AppHeader
        title="Manage Leaves"
        onLeftPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          let parent = navigation;
          for (let i = 0; i < 3; i++) {
            parent = parent?.getParent?.();
            if (!parent) break;
            if (typeof parent.openDrawer === 'function') {
              parent.openDrawer();
              return;
            }
          }
          navigation.dispatch?.({ type: 'OPEN_DRAWER' });
        }}
        onRightPress={() => navigation.navigate('Notification')}
      />
 
        <View style={styles.paginationContainer}>
          <View style={styles.itemsPerPageContainer}>
            <Text style={styles.paginationLabel}>Show:</Text>
            <Dropdown
              placeholder={String(itemsPerPage)}
              value={itemsPerPage}
              options={itemsPerPageOptions}
              onSelect={handleItemsPerPageChange}
              hideSearch={true}
              inputBoxStyle={styles.paginationDropdown}
            />
            <Text style={styles.paginationLabel}>entries</Text>
          </View>
        </View>
   

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh.current} />}>
        {data.map((item) => (
          <LeaveItem
            key={item.soleExpenseCode}
            item={item}
            isActive={activeCode === item.soleExpenseCode}
            onToggle={() => handleToggle(item.soleExpenseCode)}
            onDelete={handleDelete}
            renderActions={(row) => (
              <>

                <TouchableOpacity style={styles.actionBtn}
                  activeOpacity={0.85}
                  onPress={() => openActionSheet(row)}>
                  <Text style={styles.actionBtnText}>View more</Text>
                </TouchableOpacity>
              </>
            )}
          />
        ))}

        {data.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>{apiError || 'No leaves found.'}</Text>
          </View>
        )}
      </ScrollView>

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
        snapPoints={[hp(70)]}
      >
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>Leave Information</Text>
          <TouchableOpacity onPress={() => setSheetVisible(false)}>
            <Icon name="close" size={rf(5)} color={COLORS.text} />
          </TouchableOpacity>
        </View>
        {selectedItem && (
          <View style={styles.sheetBody}>
            <View style={styles.row}><Text style={styles.rowKey}>Applied By</Text><Text style={styles.rowVal}>{selectedItem.employeeName}</Text></View>
            {selectedItem.approvedBy ? (
              <View style={styles.row}><Text style={styles.rowKey}>Approved By</Text><Text style={styles.rowVal}>{selectedItem.approvedBy}</Text></View>
            ) : null}
            <View style={styles.row}><Text style={styles.rowKey}>Leave Start Date</Text><Text style={styles.rowVal}>{selectedItem.fromDate}</Text></View>
            <View style={styles.row}><Text style={styles.rowKey}>Leave End Date</Text><Text style={styles.rowVal}>{selectedItem.toDate}</Text></View>
            <View style={styles.row}><Text style={styles.rowKey}>Leave Type</Text><Text style={styles.rowVal}>{selectedItem.leaveType}</Text></View>
            <View style={styles.row}><Text style={styles.rowKey}>Leave Parameter</Text><Text style={styles.rowVal}>{selectedItem.parameter || '—'}</Text></View>
            <View style={styles.row}><Text style={styles.rowKey}>Reason</Text><Text style={styles.rowVal}>{selectedItem.reason}</Text></View>
            <View style={styles.row}><Text style={styles.rowKey}>Contact No</Text><Text style={styles.rowVal}>{selectedItem.contactNo || '—'}</Text></View>
            <View style={styles.row}>
              <Text style={styles.rowKey}>Status</Text>
              <StatusBadge label={selectedItem.status} />
            </View>
            {
             ( selectedItem?.remark && !( selectedItem?.status == 'Pending' || selectedItem?.status == 'Approved')) && (
                <View style={styles.row}><Text style={styles.rowKey}>Remark</Text><Text style={[styles.rowVal]}>{selectedItem?.remark || '—'}</Text></View>
              )  
            } 

          </View>
        )}
      </CommonBottomSheet>
    </View>
  );
};

export default ManageLeaves;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    //paddingTop: safeAreaTop,
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
  scrollContent: {
    //paddingVertical: wp(3),
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
  },
  emptyContainer: {
    paddingVertical: hp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: rf(4),
    color: '#6b7280',
  },
  paginationContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1), 
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: hp(1),
    marginBottom: hp(1),
    zIndex: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  paginationLabel: {
    fontSize: rf(3.5),
    color: '#374151',
    marginRight: wp(2),
  },
  paginationDropdown: {
    width: wp(18),
    height: hp(5.4),
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
    color: COLORS.primary,
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
  statusBtn: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBtnText: {
    fontSize: rf(3),
    fontWeight: '700',
  },
  actionBtn: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#111827',
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#111827',
    fontSize: rf(3),
    fontWeight: '800',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: hp(1.2),
    paddingBottom: hp(1.2),
  },
  sheetTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: '#111827',
  },
  sheetBody: {
    paddingBottom: hp(2),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  rowKey: {
    fontSize: rf(3.4),
    color: '#111827',
    fontWeight: '700',
  },
  rowVal: {
    fontSize: rf(3.2),
    color: '#6b7280',
    maxWidth: '60%'
  },
  imageBlock: {
    marginTop: hp(1.5),
    marginBottom: hp(1.5),
  },
  previewImage: {
    width: '100%',
    height: hp(20),
    borderRadius: wp(2.5),
    marginTop: hp(1),
    backgroundColor: '#e5e7eb',
  },
  previewPlaceholder: {
    height: hp(18),
    borderRadius: wp(2.5),
    marginTop: hp(1),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  placeholderText: {
    color: '#9ca3af',
    marginTop: hp(0.5),
    fontSize: rf(3),
  },
  remarkInput: {
    minHeight: hp(10),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    color: '#111827',
    backgroundColor: '#fff',
    textAlignVertical: 'top',
  },
  remarkValue: {
    minHeight: hp(6),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    color: '#111827',
    backgroundColor: '#fff',
  },
  sheetActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(2),
  },
  approveBtn: {
    backgroundColor: '#10b981',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(3),
  },
  rejectBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(3),
  },
  sheetBtnText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
  },
});

const getStatusStyles = (status) => {
  const lower = String(status || '').toLowerCase();
  if (lower === 'approved') {
    return { button: { borderColor: '#059669', backgroundColor: '#ecfdf5' }, text: { color: '#065f46' } };
  }
  if (lower === 'pending') {
    return { button: { borderColor: '#d97706', backgroundColor: '#fffbeb' }, text: { color: '#92400e' } };
  }
  if (lower === 'rejected') {
    return { button: { borderColor: '#dc2626', backgroundColor: '#fef2f2' }, text: { color: '#991b1b' } };
  }
  return { button: { borderColor: '#6b7280', backgroundColor: '#f3f4f6' }, text: { color: '#374151' } };
};
