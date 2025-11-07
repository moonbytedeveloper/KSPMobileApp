import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import AppHeader from '../../components/common/AppHeader';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../styles/styles';
import { getLeaves } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import Loader from '../../components/common/Loader';

const LeaveListScreen = ({ navigation }) => {
  const [leaves, setLeaves] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useRef(async () => {});
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [searchValue, setSearchValue] = useState('');
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState(null); // added for expanded card

  useEffect(() => {
    const load = async (isRefresh) => {
      try {
        setIsLoading(true);
        const [cmpUuid, envUuid, userUuid] = await Promise.all([
          getCMPUUID(),
          getENVUUID(),
          getUUID(),
        ]);
        const resp = await getLeaves({ cmpUuid, envUuid, userUuid, start: 0, length: PAGE_SIZE, searchValue });
        const container = resp?.Data ?? resp;
        const list = Array.isArray(container?.data)
          ? container.data
          : Array.isArray(container?.Leaves)
          ? container.Leaves
          : Array.isArray(container)
          ? container
          : [];
        const total = Number(container?.recordsTotal ?? container?.total ?? list.length) || 0;

        setLeaves(
          list.map((l, idx) => ({
            id: l?.UUID || `LEAVE-${idx + 1}`,
            leaveType: l?.LeaveType || 'Leave',
            startDate: l?.Leave_StartDate || '',
            endDate: l?.Leave_EndDate || '',
            status: l?.Status || 'Unknown',
            appliedBy: l?.Applied_By || '',
            isActive: l?.IsActive || false,
            isDisplay: l?.IsDisplay || false,
            isExpanded: false,
          }))
        );
        setHasMore(list.length < total);
        if (isRefresh) setPage(1);
      } catch (e) {
        setLeaves([]);
        setErrorMessage(e?.response?.data?.Message || 'No leaves');
      } finally {
        setIsLoading(false);
      }
    };
    load(false);
    onRefresh.current = async () => {
      setRefreshing(true);
      await load(true);
      setRefreshing(false);
    };
  }, []);

 

const toggleExpanded = (leaveId) => { // add toggle function
  setExpandedId(expandedId === leaveId ? null : leaveId);
};


  const formatDate = (val) => {
    if (!val) return 'N/A';
    try {
      // If already in dd-MMM-yyyy, return as-is
      if (typeof val === 'string') {
        const s = val.trim();
        if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(s)) return s;
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      const dd = String(d.getDate()).padStart(2, '0');
      const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const mon = MONTHS_SHORT[d.getMonth()];
      const yy = d.getFullYear();
      return `${dd}-${mon}-${yy}`;
    } catch (e) {
      return String(val);
    }
  };

  const visibleLeaves = leaves; // server-side appending
  const handleLoadMore = async () => {
    if (!hasMore) return;
    try {
      const [cmpUuid, envUuid, userUuid] = await Promise.all([
        getCMPUUID(),
        getENVUUID(),
        getUUID(),
      ]);
      const resp = await getLeaves({ cmpUuid, envUuid, userUuid, start: page * PAGE_SIZE, length: PAGE_SIZE, searchValue });
      const container = resp?.Data ?? resp;
      const list = Array.isArray(container?.data)
        ? container.data
        : Array.isArray(container?.Leaves)
        ? container.Leaves
        : Array.isArray(container)
        ? container
        : [];
      const total = Number(container?.recordsTotal ?? container?.total ?? 0) || 0;

      setLeaves((prev) => {
        const mapped = list.map((l, idx) => ({
          id: l?.UUID || `LEAVE-${prev.length + idx + 1}`,
          leaveType: l?.LeaveType || 'Leave',
          startDate: l?.Leave_StartDate || '',
          endDate: l?.Leave_EndDate || '',
          status: l?.Status || 'Unknown',
          appliedBy: l?.Applied_By || '',
          isActive: l?.IsActive || false,
          isDisplay: l?.IsDisplay || false,
          isExpanded: false,
        }));
        const next = [...prev, ...mapped];
        if (next.length >= total || list.length === 0) setHasMore(false);
        return next;
      });
      setPage((p) => p + 1);
    } catch (e) {
      setHasMore(false);
    }
  };
if(isLoading) {
  return (
    <View style={styles.container}>
      <AppHeader
        title="Leave"
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />
      <Loader />
    </View>
  );
}
  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Leave"
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
        title="Leave"
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh.current} />
        }
      >
         {visibleLeaves.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{errorMessage || 'No leaves'}</Text>
          </View>
        )}
        {visibleLeaves.map((l) => (
          <View key={l.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardRow}
              onPress={() => toggleExpanded(l.id)}
              activeOpacity={0.7}
            >
              <View style={styles.leftCol}>
                <View
                  style={[
                    styles.badgeIcon,
                    {
                      backgroundColor:
                        l.status === 'Approved'
                          ? '#4CAF50'
                          : l.status === 'Pending'
                          ? '#FF9800'
                          : COLORS.danger,
                    },
                  ]}
               />
                <View>
                  <Text style={styles.label}>Leave Type</Text>
                  <Text style={styles.value}>{l.leaveType}</Text>
                </View>
              </View>

              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                }}>

                <View style={{  alignItems: 'flex-end', marginRight: wp(2) }}>
                  <Text style={styles.label}>Status</Text>
                  <StatusBadge label={l.status} />
                </View>

                <Icon
                  name={l.isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={rf(4)}
                  color={COLORS.textLight}
                />
              </View>
            </TouchableOpacity>

            {expandedId === l.id && (
              <View style={styles.expandedContent}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Start Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(l.startDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>End Date:</Text>
                  <Text style={styles.detailValue}>{formatDate(l.endDate)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Status:</Text>
                  <StatusBadge label={l.status} />
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Applied By:</Text>
                  <Text style={styles.detailValue}>{l.appliedBy}</Text>
                </View>
                {/* <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Active:</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: l.isActive ? '#4CAF50' : COLORS.danger },
                    ]}
                  >
                    {l.isActive ? 'Yes' : 'No'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Display:</Text>
                  <Text
                    style={[
                      styles.detailValue,
                      { color: l.isDisplay ? '#4CAF50' : COLORS.danger },
                    ]}
                  >
                    {l.isDisplay ? 'Yes' : 'No'}
                  </Text>
                </View> */}
              </View>
            )}
          </View>
        ))}

       
        {/* {hasMore && (
          <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Load more</Text>
          </TouchableOpacity>
        )} */}
      </ScrollView>
    </View>
  );
};

// ✅ STATUS BADGE COMPONENT
const StatusBadge = ({ label }) => {
  const palette = {
    Pending: {
      bg: COLORS.warningBg,
      color: COLORS.warning,
      border: COLORS.warning,
    },
    Approved: {
      bg: COLORS.successBg,
      color: COLORS.success,
      border: COLORS.success,
    },
    Rejected: {
      bg: COLORS.dangerBg,
      color: COLORS.danger,
      border: COLORS.danger,
    },
  };
  const theme = palette[label] || palette.Pending;

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: theme.bg,
          borderColor: theme.border,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
    </View>
  );
};

export default LeaveListScreen;

// ✅ STYLES
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(6),
  },
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: wp(3),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(0.2) },
    shadowOpacity: 0.1,
    shadowRadius: hp(0.4),
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: hp(2),
    // backgroundColor: COLORS.bg,
    // borderBottomWidth: 1,
    // borderBottomColor: COLORS.border,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    width: wp(3.6),
    height: wp(3.6),
    borderRadius: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  label: {
    fontSize: rf(3),
    fontWeight: '700',
    color: COLORS.textLight, 
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  value: {
    fontSize: rf(3.5),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  badge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: hp(0.5),
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    padding: 1,
  },
  expandedContent: {
    padding: hp(2),
    // backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(0.8),
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  detailLabel: {
    fontSize: rf(3.2),
    fontWeight: '500',
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    flex: 1,
  },
  detailValue: {
    fontSize: rf(3.4),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    flex: 1,
    textAlign: 'right',
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: hp(4),
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: hp(1),
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    backgroundColor: '#e34f25',
    borderRadius: wp(2),
  },
  loadMoreText: {
    color: '#ffffff',
    fontSize: rf(4),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
});
