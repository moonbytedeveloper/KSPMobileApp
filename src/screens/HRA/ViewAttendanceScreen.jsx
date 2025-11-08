import React, { useState, useRef, useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppHeader from '../../components/common/AppHeader';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { buttonStyles, COLORS, TYPOGRAPHY ,SPACING,RADIUS} from '../styles/styles'
import { getHRAApproveLeaves, approveOrRejectLeave } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID, getReportingDesignation } from '../../api/tokenStorage';
const LeaveCard = ({ leave, onActionPress, getStatusColor, getStatusBgColor }) => {
  
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
    <View style={[{ borderWidth: 1,paddingVertical: hp(0.2),paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.md,}, { backgroundColor: theme.bg, borderColor: theme.border }]}> 
      <Text style={[{ fontSize: 9,
      fontWeight: '600',
      padding: 1 }, { color: theme.color }]}>{label}</Text>
    </View>
  );
 
};

  return (
    <View style={styles.leaveCard}>
      <Text style={styles.sectionTitle}>Leave Request #{leave.srNo}</Text>

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Applied Date</Text>
        <Text style={styles.fieldValue}>{leave.appliedDate}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Applied By</Text>
        <Text style={styles.fieldValue}>{leave.appliedBy}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>Status</Text>
        <StatusBadge label={leave.status} />
      </View>

      <View style={styles.divider} />

      <TouchableOpacity onPress={() => onActionPress(leave)} style={[buttonStyles.buttonNeutralFill, buttonStyles.scheduleBtn ]}>
        <Text style={buttonStyles.iconSchedule}>View Details & Action</Text>
      </TouchableOpacity>
    </View>
  );

};

const ViewAttendanceScreen = ({ navigation }) => {
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [remark, setRemark] = useState('');
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => [hp(70)], []);
  const rejectSheetRef = useRef(null);
  const [actionMsg, setActionMsg] = useState('');
  const [rejectMsg, setRejectMsg] = useState('');

  const [attendanceData, setAttendanceData] = useState([]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const [userUuid, cmpUuid, envUuid] = await Promise.all([
          getUUID(),
          getCMPUUID(),
          getENVUUID(),
        ]);
        if (!userUuid || !cmpUuid || !envUuid) return;
        const resp = await getHRAApproveLeaves({approverDesignationUuid: await getReportingDesignation(), cmpUuid, envUuid }); 
        const raw = resp;
        console.log(resp,'raw');
        let list = [];
        if (Array.isArray(raw)) list = raw;
        else if (Array.isArray(raw?.Records)) list = raw.Records;
        else if (raw && typeof raw === 'object') list = [raw];
        const toUiDate = (s) => {
          if (!s) return '-';
          const str = String(s);
          const t = str.indexOf('T');
          if (t > 0) return str.slice(0, t);
          return str;
        };
        const mapped = list.map((it, idx) => ({
          id: it.UUID || String(idx),
          srNo: String(it.SrNo ?? idx + 1),
          appliedDate: toUiDate(it.AppliedDate) || '-',
          appliedBy: it.AppliedBy || it.Applied_by || '-',
          status: it.Status || '-',
          leaveDetails: {
            appliedBy: it.AppliedBy || it.Applied_by || '-',
            leaveStartDate: toUiDate(it.LeaveStartDate) || '-',
            leaveEndDate: toUiDate(it.LeaveEndDate) || '-',
            leaveType: it.LeaveTypeName || it.LeaveType || '-',
            leaveParameter: it.LeaveParameter || '-',
            reason: it.Reason || '-',
            contactNo: (it.ContactNumber || it.ContactNo) ? String(it.ContactNumber || it.ContactNo) : '-',
            status: it.Status || '-',
          },
        }));
        if (isMounted) setAttendanceData(mapped);
      } catch (e) {
        // ignore errors, keep empty list
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#d1fae5';
      case 'pending':
        return '#fef3c7';
      case 'rejected':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const handleActionPress = (leave) => {
    setSelectedLeave(leave);
    setRemark('');
    sheetRef.current?.present();
  };

  const handleApprove = async () => {
    try {
      const resp = await approveOrRejectLeave({ headUuid: selectedLeave?.id, action: 'Approve', remark: '' });
      const msg = (resp?.Message) || (resp?.message) || 'Approved successfully';
      setActionMsg(String(msg));
      // remove immediately then close after a short delay
      setAttendanceData((prev) => prev.filter((x) => x.id !== selectedLeave?.id));
      setTimeout(() => {
        setActionMsg('');
        sheetRef.current?.dismiss();
      }, 1200);
    } catch (e) {
      const msg = (e?.response?.data?.Message) || (e?.message) || 'Failed to approve';
      setActionMsg(String(msg));
    }
  };

  const handleReject = () => {
    // Open separate bottom sheet to capture remark
    rejectSheetRef.current?.present();
  };

  const handleRejectConfirm = async () => {
    try {
      const resp = await approveOrRejectLeave({ headUuid: selectedLeave?.id, action: 'Reject', remark });
      const msg = (resp?.Message) || (resp?.message) || 'Rejected successfully';
      setRejectMsg(String(msg));
      setAttendanceData((prev) => prev.filter((x) => x.id !== selectedLeave?.id));
      setRemark('');
      setTimeout(() => {
        setRejectMsg('');
        rejectSheetRef.current?.dismiss();
        sheetRef.current?.dismiss();
      }, 1200);
    } catch (e) {
      const msg = (e?.response?.data?.Message) || (e?.message) || 'Failed to reject';
      setRejectMsg(String(msg));
    }
  };

  const closeSheet = () => {
    sheetRef.current?.dismiss();
    setSelectedLeave(null);
    setRemark('');
    setActionMsg('');
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader
          title="Approve Leave"
          onLeftPress={() => navigation.goBack()}
          onRightPress={() => navigation.navigate('Notification')}
        />
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {attendanceData.map(leave => (
            <LeaveCard
              key={leave.id}
              leave={leave}
              onActionPress={handleActionPress}
              getStatusColor={getStatusColor}
              getStatusBgColor={getStatusBgColor}
            />
          ))}

          {attendanceData.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No attendance records found.</Text>
            </View>
          )}
        </ScrollView>

        {/* Bottom Sheet Modal */}
        <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        onDismiss={closeSheet}
        handleIndicatorStyle={styles.handle}
        handleStyle={{ backgroundColor: 'transparent' }}
        backgroundStyle={styles.sheetBackground}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
        )}
      >
        <BottomSheetView style={styles.sheetContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Leave Information</Text>
            <TouchableOpacity onPress={closeSheet} style={styles.closeButton}>
              <Icon name="close" size={rf(5)} color="#6b7280" />
            </TouchableOpacity>
          </View>
          {actionMsg ? (
            <Text style={styles.apiMsg}>{actionMsg}</Text>
          ) : null}

          {selectedLeave && (
            <View style={styles.leaveDetails}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Applied By:</Text>
                <Text style={styles.detailValue}>{selectedLeave.leaveDetails.appliedBy}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Leave Start Date:</Text>
                <Text style={styles.detailValue}>{selectedLeave.leaveDetails.leaveStartDate}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Leave End Date:</Text>
                <Text style={styles.detailValue}>{selectedLeave.leaveDetails.leaveEndDate}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Leave Type:</Text>
                <Text style={styles.detailValue}>{selectedLeave.leaveDetails.leaveType}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Leave Parameter:</Text>
                <Text style={styles.detailValue}>{selectedLeave.leaveDetails.leaveParameter}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Reason:</Text>
                <Text style={styles.detailValue}>{selectedLeave.leaveDetails.reason}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Contact No:</Text>
                <Text style={styles.detailValue}>{selectedLeave.leaveDetails.contactNo}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.statusBadge, { 
                  color: getStatusColor(selectedLeave.leaveDetails.status),
                  backgroundColor: getStatusBgColor(selectedLeave.leaveDetails.status)
                }]}>
                  {selectedLeave.leaveDetails.status}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.buttonPositive} onPress={handleApprove} activeOpacity={0.85}>
                  <Text style={styles.buttonPositiveText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buttonNegative} onPress={handleReject} activeOpacity={0.85}>
                  <Text style={styles.buttonNegativeText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </BottomSheetView>
        </BottomSheetModal>

        {/* Reject Remark Bottom Sheet */}
        <BottomSheetModal
          ref={rejectSheetRef}
          snapPoints={[hp(40)]}
          enablePanDownToClose
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Remark</Text>
              <TouchableOpacity onPress={() => { rejectSheetRef.current?.dismiss(); }} style={styles.closeButton}>
                <Icon name="close" size={rf(5)} color="#6b7280" />
              </TouchableOpacity>
            </View>
            {rejectMsg ? (
              <Text style={styles.apiMsg}>{rejectMsg}</Text>
            ) : null}
            <TextInput
              style={styles.remarkInput}
              placeholder="Enter rejection remark..."
              placeholderTextColor="#9ca3af"
              value={remark}
              onChangeText={setRemark}
              multiline
              numberOfLines={4}
            />
            <View style={styles.actionButtonsContainer}>
              <TouchableOpacity style={styles.buttonNegative} onPress={handleRejectConfirm} activeOpacity={0.85}>
                <Text style={styles.buttonNegativeText}>Submit Remark</Text>
              </TouchableOpacity>
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    //paddingTop: safeAreaTop,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  listContent: {
    paddingBottom: hp(4),
  },
  leaveCard: {
    backgroundColor: COLORS.bg,
    borderRadius: wp(3),
    padding: wp(4),
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
    backgroundColor: '#EEE',
  },
  statusBadge: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(5),
    fontSize: rf(3),
    fontWeight: '600',
  },
  actionButton: {
    backgroundColor: '#fb923c',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: wp(2.5),
    alignItems: 'center',
    marginTop: hp(1),
  },
  actionButtonText: {
    color: '#fff',
    fontSize: rf(3.4),
    fontWeight: '600',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  // Bottom Sheet Styles
  handle: {
    alignSelf: 'center',
    width: wp(18),
    height: hp(0.7),
    backgroundColor: '#2e2e2e',
    borderRadius: hp(0.6),
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  sheetContent: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(6),
    paddingBottom: hp(2.5),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  sheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: rf(4.2),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  closeButton: {
    padding: wp(1),
  },
  leaveDetails: {
    marginBottom: hp(2),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  detailLabel: {
    fontSize: rf(3.4),
    fontWeight: '500',
    color: COLORS.textMuted,
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  detailValue: {
    fontSize: rf(3.4),
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  statusBadge: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(5),
    fontSize: rf(3),
    fontWeight: '600',
  },
  remarkSection: {
    marginTop: hp(2),
    marginBottom: hp(2),
  },
  remarkLabel: {
    fontSize: rf(3.4),
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  remarkInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    fontSize: rf(3.2),
    color: COLORS.text,
    backgroundColor: COLORS.bgMuted,
    textAlignVertical: 'top',
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(2),
  },
  // Reimbursement pill-style buttons (matching ExpenseApproval)
  buttonPositive: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    backgroundColor: COLORS.primary,
    marginRight: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPositiveText: {
    color: COLORS.bg,
    fontSize: rf(3),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    textAlign: 'center',
  },
  buttonNegative: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    backgroundColor: COLORS.text,
    marginLeft: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonNegativeText: {
    color: COLORS.bg,
    fontSize: rf(3),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    textAlign: 'center',
  },
  apiMsg: {
    marginBottom: hp(1),
    textAlign: 'center',
    color: COLORS.text,
    fontSize: rf(3.2),
  },
});

export default ViewAttendanceScreen;
