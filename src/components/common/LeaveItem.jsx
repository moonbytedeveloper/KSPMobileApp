import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { rf, wp, hp } from '../../utils/responsive';
import BottomSheetConfirm from './BottomSheetConfirm';
import { COLORS, TYPOGRAPHY ,SPACING, RADIUS} from '../../screens/styles/styles';

// StatusIcon Component using inline SVG
const StatusIcon = ({ status }) => {
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return COLORS.success;
      case 'pending':
        return COLORS.warning;
      case 'rejected':
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const getStatusBgColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return COLORS.successBg;
      case 'pending':
        return COLORS.warningBg;
      case 'rejected':
        return COLORS.dangerBg;
      default:
        return '#f3f4f6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'check-circle';
      case 'pending':
        return 'schedule';
      case 'rejected':
        return 'cancel';
      default:
        return 'help';
    }
  };

  const statusColor = getStatusColor(status);
  const statusBgColor = getStatusBgColor(status);

  return (
    <View style={[styles.statusIcon, { backgroundColor: statusBgColor }]}>
      <Icon name={getStatusIcon(status)} size={rf(4)} color={statusColor} />
    </View>
  );
};
const StatusBadge = ({ label  }) => {
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

// LeaveItem Component
const LeaveItem = ({ item, isActive, onToggle, onView, onEdit, onDelete, showViewButton = true, renderActions }) => {
  const [confirmVisible, setConfirmVisible] = useState(false);

  const requestDelete = () => setConfirmVisible(true);
  const cancelDelete = () => setConfirmVisible(false);
  const confirmDelete = () => {
    setConfirmVisible(false);
    onDelete && onDelete(item.soleExpenseCode);
  };

  return (
    <View style={styles.leaveItem}>
      <TouchableOpacity onPress={onToggle} style={styles.leaveHeader} activeOpacity={0.8}>
        <View style={styles.headerSummaryContainer}>
          <StatusIcon status={item.status} />
          <View>
            <Text style={styles.summaryLabel}>S.No</Text>
            <Text style={styles.summaryValue}>{item.srNo}</Text>
          </View>
        </View>
        <View style={styles.rightSideContainer}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>APPLY DATE</Text>
            <Text style={styles.summaryValue}>{item.applyDate}</Text>
          </View>
          <View style={styles.statusContainer}>
          <StatusBadge  label={item.status} />
          </View>
        </View>
      </TouchableOpacity>

      {isActive && (
        <View style={styles.leaveBody}>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Employee</Text>
            <Text style={styles.cardValue}>{item.employeeName}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Leave Type</Text>
            <Text style={styles.cardValue}>{item.leaveType}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Duration</Text>
            <Text style={styles.cardValue}>{item.fromDate} to {item.toDate}</Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Action Taken Date</Text>
            <Text style={styles.cardValue}>{item.actionTakenDate} </Text>
          </View>
          <View style={styles.cardRow}>
            <Text style={styles.cardLabel}>Reason</Text>
            <Text style={styles.cardValue}>{item.reason}</Text>
          </View>
          <View style={styles.line} />
          {renderActions ? (
            <View style={styles.actionButtonContainer}>
              {renderActions(item)}
            </View>
          ) : (
            <View style={styles.actionButtonContainer}>
              {showViewButton && (
                <TouchableOpacity style={styles.actionButton1} onPress={() => onView && onView(item)}>
                  <Text style={styles.actionButtonText1}>View Details</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.actionButton2} onPress={() => onEdit && onEdit(item)}>
                <Text style={styles.actionButtonText2}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton3} onPress={requestDelete}>
                <Text style={styles.actionButtonText3}>Delete</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <BottomSheetConfirm
        visible={confirmVisible}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </View>
  );
};

export default LeaveItem;

const styles = StyleSheet.create({
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
  leaveItem: {
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
  leaveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: hp(2),
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  statusIcon: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  summaryLabel: {
    fontSize: rf(3),
    fontWeight: '500',
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  summaryValue: {
    fontSize: rf(3.5),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  rightSideContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(5),
    fontSize: rf(3),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  leaveBody: {
    padding: hp(2),
    backgroundColor: COLORS.bg,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  cardLabel: {
    fontSize: rf(3),
    fontWeight: '500',
    color: COLORS.textLight, 
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  cardValue: {
    fontSize: rf(3.5),
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'right',
    maxWidth: '70%'
  },
  line: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: hp(0.3),
    marginVertical: hp(0.7),
  },
  actionButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(1.5),
    marginHorizontal: -wp(1.2),
  },
  actionButton1: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: COLORS.info,
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton2: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: COLORS.success,
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButton3: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: COLORS.danger,
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText1: {
    color: COLORS.info,
    fontSize: rf(3),
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  actionButtonText2: {
    color: COLORS.success,
    fontSize: rf(3),
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  actionButtonText3: {
    color: COLORS.danger,
    fontSize: rf(3),
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
});
