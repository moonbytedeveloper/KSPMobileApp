import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Dropdown from '../../components/common/Dropdown';
import { updateLeadStatus } from '../../api/authServices';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, text, layout, SHADOW, buttonStyles } from '../styles/styles';

// Robust date formatter to dd-mm-yyyy supporting ISO and common string formats
const formatDMY = (dateInput) => {
  if (!dateInput) return '';
  // If already dd-mm-yyyy, return
  if (typeof dateInput === 'string' && /^(\d{2})-(\d{2})-(\d{4})$/.test(dateInput)) return dateInput;

  const tryBuild = (y, m, d) => {
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (isNaN(date)) return null;
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  if (typeof dateInput === 'string') {
    const s = dateInput.trim();
    // ISO yyyy-mm-dd or yyyy/mm/dd
    let m = s.match(/^(\d{4})[-/](\d{2})[-/](\d{2})/);
    if (m) {
      return tryBuild(m[1], m[2], m[3]) || s;
    }
    // dd-mm-yyyy or dd/mm/yy(yy)
    m = s.match(/^(\d{2})[-/](\d{2})[-/](\d{2,4})$/);
    if (m) {
      const year = m[3].length === 2 ? `20${m[3]}` : m[3];
      return tryBuild(year, m[2], m[1]) || s;
    }
  }

  const d = new Date(dateInput);
  if (!isNaN(d)) {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  }
  return String(dateInput);
};

const StatusBadge = ({ label = 'Pending' }) => {
  const palette = {
    Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
    Open: { bg: COLORS.infoBg, color: COLORS.info, border: COLORS.info },
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

const OpportunityCard = ({
  color = '#A855F7',
  // Card-style props (optional)
  title,
  totalHours,
  fromLabel,
  toLabel,
  // Table data props (preferred for your use case)
  srNo,
  uuid,
  companyDetail,
  nextAction,
  actionDueDate,
  OppOwner,
  OpportunityTitle,
  status = 'Pending',
  onView,
  onEdit,
  onDelete,
  onEditLead,
  // Controlled accordion props (optional)
  expanded: expandedProp,
  onToggle,
}) => {
  const [expandedUncontrolled, setExpandedUncontrolled] = useState(false);
  const isControlled = typeof expandedProp === 'boolean';
  const expanded = isControlled ? expandedProp : expandedUncontrolled;
  const [pickerVisible, setPickerVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const toggle = useCallback(() => {
    if (isControlled) {
      onToggle && onToggle();
    } else {
      setExpandedUncontrolled((s) => !s);
    }
  }, [isControlled, onToggle]);
  const sheetRef = useRef(null);
  const deleteSheetRef = useRef(null);
  const snapPoints = useMemo(() => [hp(60), hp(75)], []);
  const deleteSnapPoints = useMemo(() => [hp(40)], []);
  const [selected, setSelected] = useState(status || null);
  const [mode, setMode] = useState('pick'); // 'pick' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);

  // Check if status is 'Won' to disable certain actions
  const isWonStatus = status === 'Won';

  useEffect(() => {
    if (pickerVisible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [pickerVisible]);

  useEffect(() => {
    if (deleteConfirmVisible) {
      deleteSheetRef.current?.present();
    } else {
      deleteSheetRef.current?.dismiss();
    }
  }, [deleteConfirmVisible]);

  const handleDeletePress = useCallback(() => {
    setDeleteConfirmVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    setDeleteConfirmVisible(false);
    onDelete && onDelete();
  }, [onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteConfirmVisible(false);
  }, []);

  const handlePickerOpen = useCallback(() => {
    setMode('pick');
    setErrorMessage('');
    setPickerVisible(true);
  }, []);

  const computedTitle = title || (companyDetail && companyDetail.name) || uuid || (srNo !== undefined ? `Item #${srNo}` : '');

  return (
    <>
    <View style={styles.card}>
      <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
        <View style={styles.rowHeader}>
          <View style={styles.headerLeft}>
            <View style={[styles.dot, { backgroundColor: (status === 'Won' ? COLORS.success : 
              status === 'Pending' ? COLORS.warning :status === 'Not Updated' ?   'grey' : COLORS.info) }]} />
            <View style={styles.headerLeftContent}>
              <Text style={[text.caption, styles.caption]}>Opportunity Title</Text>
              <Text style={[text.title, styles.title]} numberOfLines={1}>{OpportunityTitle}</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <View>
              <Text style={[text.caption, styles.caption, { textAlign: 'right' }]}> Action Due Date </Text>
              <Text style={[text.title, styles.hours]}>{formatDMY(actionDueDate)}</Text>
            </View>
            <Icon name={expanded ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.textMuted} />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.detailArea}>
          {/* When table-like props are provided, show that format */}
          {srNo !== undefined && (
            <> 
              {/* {uuid ? (
                <View style={styles.detailRow}> 
                  <Text style={styles.detailLabel}>UUID</Text>
                  <Text style={styles.linkText}>{uuid}</Text>
                </View>
              ) : null} */}
              {companyDetail ? (
                <View style={{ marginBottom: hp(1) }}>
                  <Text style={[text.caption, styles.detailLabel]}>Company Detail</Text>
                  <View style={styles.companyGroup}>
                    {companyDetail.name ? (
                      <View style={styles.detailRow}>
                        <Text style={[text.caption, styles.detailLabel]}>Company</Text>
                        <Text style={[text.body, styles.companyValue]}>{companyDetail.name}</Text>
                      </View>
                    ) : null}
                    {companyDetail.email ? (
                      <View style={styles.detailRow}>
                        <Text style={[text.caption, styles.detailLabel]}>Email</Text>
                        <Text style={[text.body, styles.companyValue]}>{companyDetail.email}</Text>
                      </View>
                    ) : null}
                    {companyDetail.phone ? (
                      <View style={styles.detailRow}>
                        <Text style={[text.caption, styles.detailLabel]}>Phone</Text>
                        <Text style={[text.body, styles.companyValue]}>{companyDetail.phone}</Text>
                      </View>
                    ) : null}
                    {companyDetail.client ? (
                      <View style={styles.detailRow}>
                        <Text style={[text.caption, styles.detailLabel]}>Client</Text>
                        <Text style={[text.body, styles.companyValue]}>{companyDetail.client}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {nextAction ? (
                <View style={styles.detailRow}> 
                  <Text style={[text.caption, styles.detailLabel]}>Next Action</Text>
                  <Text style={[text.body, styles.detailValue,{maxWidth: wp(60)}]}>{nextAction}</Text>
                </View>
              ) : null}
              {actionDueDate ? (
                <View style={styles.detailRow}> 
                  <Text style={[text.caption, styles.detailLabel]}>Action Due Date</Text>
                  <Text style={[text.body, styles.detailValue]}>{formatDMY(actionDueDate)}</Text>
                </View>
              ) : null}
              {OppOwner ? (
                <View style={styles.detailRow}> 
                  <Text style={[text.caption, styles.detailLabel]}>Opportunity Owner</Text>
                  <Text style={[text.body, styles.detailValue]}>{OppOwner}</Text>
                </View>
              ) : null}
            </>
          )}

          {/* Fallback to original fields if table-like props not given */}
          {srNo === undefined && (
            <>
              {fromLabel ? (
                <View style={styles.detailRow}> 
                  <Text style={[text.caption, styles.detailLabel]}>From</Text>
                  <Text style={[text.body, styles.detailValue]}>{fromLabel}</Text>
                </View>
              ) : null}
              {toLabel ? (
                <View style={styles.detailRow}> 
                  <Text style={[text.caption, styles.detailLabel]}>To</Text>
                  <Text style={[text.body, styles.detailValue]}>{toLabel}</Text>
                </View>
              ) : null}
            </>
          )}

          <TouchableOpacity 
            activeOpacity={isWonStatus ? 1 : 0.8} 
            onPress={() => !isWonStatus && setPickerVisible(true)}
            disabled={isWonStatus}
          >
            <View style={styles.detailRow}> 
              <Text style={[text.caption, styles.detailLabel]}>Status</Text>
              <StatusBadge  label={status} />
            </View>
          </TouchableOpacity>

          {/* Primary filled actions */}
          <View style={styles.actionsRowPrimary}>
            <TouchableOpacity 
              onPress={() => { setSelected(status); handlePickerOpen(); }} 
              activeOpacity={isWonStatus ? 1 : 0.85} 
              style={[
                buttonStyles.buttonNeutralFill, 
                buttonStyles.UpdateBtns,
                isWonStatus && styles.disabledButton
              ]}
              disabled={isWonStatus}
            >
              <Icon 
                name="fact-check" 
                size={rf(5)} 
                style={[
                  buttonStyles.UpdateStatusBtn,
                  isWonStatus && styles.disabledIcon
                ]} 
              />
              {/* <Text style={styles.buttonFillText}>Update Status</Text> */}
            </TouchableOpacity>
         
            <TouchableOpacity onPress={onView} activeOpacity={0.8} style={[buttonStyles.buttonNeutralFill, buttonStyles.viewBtn]}> 
              <Icon name="description" size={rf(5)} style={buttonStyles.iconView}  />
            </TouchableOpacity>
            <TouchableOpacity onPress={onEdit} activeOpacity={0.8} style={[buttonStyles.buttonNeutralFill, buttonStyles.scheduleBtn]}> 
              <Icon name="schedule" size={rf(5)} style={buttonStyles.iconSchedule} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={onEditLead} 
              activeOpacity={isWonStatus ? 1 : 0.8} 
              style={[
                buttonStyles.buttonNeutralFill, 
                buttonStyles.editBtn,
                isWonStatus && styles.disabledButton
              ]}
              disabled={isWonStatus}
            > 
              <Icon 
                name="edit" 
                size={rf(5)} 
                style={[
                  buttonStyles.iconEdit,
                  isWonStatus && styles.disabledIcon
                ]} 
              />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={handleDeletePress} 
              activeOpacity={isWonStatus ? 1 : 0.85} 
              style={[
                buttonStyles.buttonNeutralFill, 
                buttonStyles.deleteBtn,
                isWonStatus && styles.disabledButton
              ]}
              disabled={isWonStatus}
            >
              <Icon 
                name="delete" 
                size={rf(5)} 
                style={[
                  buttonStyles.iconDelete,
                  isWonStatus && styles.disabledIcon
                ]} 
              />
              {/* <Text style={styles.buttonFillText}>Delete</Text> */}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
    {/* Inline Bottom Sheet for Update Status */}
    <BottomSheetModal
  ref={sheetRef}
  snapPoints={snapPoints}
  enablePanDownToClose
  enableContentPanningGesture={false}
  onDismiss={() => setPickerVisible(false)}
  onChange={(index) => setCurrentSnapIndex(index)}
  handleIndicatorStyle={styles.bsHandle}
  handleStyle={{ backgroundColor: 'transparent' }}
  backgroundStyle={styles.bsBackground}
  backdropComponent={(props) => (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.45}
      pressBehavior="close"
    />
  )}
>
  <BottomSheetView style={styles.bsContent}>
    {/* Header */}
    <View style={styles.bsHeaderRow}>
      <Text style={[text.title, styles.bsTitle]}>Update Lead Status</Text>
      <TouchableOpacity onPress={() => setPickerVisible(false)} activeOpacity={0.8}>
        <Icon name="close" size={rf(4)} color={COLORS.text} />
      </TouchableOpacity>
    </View>

    {mode === 'pick' ? (
      <>
        {/* Icon + Helper */}
        <View style={styles.iconCircle}> 
          <Text style={styles.iconCircleMark}>?</Text>
        </View>
        <Text style={[text.title, styles.modalTitlebottom]}>Update Lead Status</Text>

        <Text style={[text.body, styles.helperText]}>Please select a new status for this lead:</Text>

        {/* Dropdown with same snap logic as Project/Task */}
        <Dropdown
          placeholder="Select Status"
          value={selected}
          options={['Won', 'Pending', 'Lost']}
          getLabel={(s) => s}
          getKey={(s) => s}
          hint="Select Status"
          onSelect={(s) => {
            setSelected(s);
            sheetRef.current?.snapToIndex(0);
          }}
          onOpenChange={(open) => {
            if (open) {
              setCurrentSnapIndex(1);
              sheetRef.current?.snapToIndex(1);
            } else {
              setCurrentSnapIndex(0);
              sheetRef.current?.snapToIndex(0);
            }
          }}
          inputBoxStyle={{
            marginTop: 0,
            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: RADIUS.lg,
            paddingHorizontal: SPACING.lg,
            paddingVertical: hp(0.8),
            minHeight: hp(6.5),
          }}
        />

        {/* CTA buttons */}
        <View style={styles.ctaRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.primaryBtn, styles.Primarybtn, (!selected || updating) && { opacity: 0.6 }]}
            disabled={!selected || updating}
            onPress={async () => {
              if (!selected || updating) return;
              try {
                setUpdating(true);
                setErrorMessage(''); // Clear any previous error
                const response = await updateLeadStatus({
                  leadUuid: uuid,
                  status: selected,
                  nextAction: nextAction || '',
                  actionDueDate: actionDueDate || undefined,
                });
                
                // Check if the response indicates success
                if (response?.Success === false) {
                  setErrorMessage(response?.Message || 'Update failed');
                  setMode('error');
                } else {
                  setMode('success');
                }
              } catch (e) {
                const errorMsg = e?.response?.data?.Message || e?.response?.data?.message || e?.message || 'Update failed';
                setErrorMessage(errorMsg);
                setMode('error');
              } finally {
                setUpdating(false);
              }
            }}
          >
            <Text style={[text.subtitle, styles.primaryBtnText]}>{updating ? 'Updating...' : 'Update'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.secondaryBtn, styles.Primarybtn]}
            onPress={() => setPickerVisible(false)}
          >
            <Text style={[text.subtitle, styles.secondaryBtnText]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </>
    ) : mode === 'success' ? (
      <>
        {/* Success State */}
        <View style={[styles.iconCircle, { borderColor: COLORS.success }]}> 
          <Text style={[styles.iconCircleMark, { color: COLORS.success }]}>✓</Text>
        </View>
        <Text style={[text.title, styles.modalTitle, { color: COLORS.success }]}>Done</Text>
        <Text style={[text.body, styles.successText]}>Lead status has been updated successfully!</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryBtn}
          onPress={() => setPickerVisible(false)}
        >
          <Text style={[text.subtitle, styles.primaryBtnText]}>Ok</Text>
        </TouchableOpacity>
      </>
    ) : (
      <>
        {/* Error State */}
        <View style={[styles.iconCircle, { borderColor: COLORS.warning }]}> 
          <Text style={[styles.iconCircleMark, { color: COLORS.warning }]}>!</Text>
        </View>
        <Text style={[text.title, styles.modalTitle, { color: COLORS.warning }]}>Error</Text>
        <Text style={[text.body, styles.errorText]}>{errorMessage}</Text>

        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.primaryBtn}
          onPress={() => {
            setMode('pick');
            setErrorMessage('');
          }}
        >
          <Text style={[text.subtitle, styles.primaryBtnText]}>Try Again</Text>
        </TouchableOpacity>
      </>
    )}
  </BottomSheetView>
</BottomSheetModal>

    {/* Delete Confirmation Bottom Sheet */}
    <BottomSheetModal
      ref={deleteSheetRef}
      snapPoints={deleteSnapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      onDismiss={handleDeleteCancel}
      handleIndicatorStyle={styles.bsHandle}
      handleStyle={{ backgroundColor: 'transparent' }}
      backgroundStyle={styles.bsBackground}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.45}
          pressBehavior="close"
        />
      )}
    >
      <BottomSheetView style={styles.bsContent}>
        {/* Warning Icon */}
        <View style={styles.deleteIconCircle}>
          <Icon name="warning" size={rf(8)} color={COLORS.warning} />
        </View>

        {/* Title */}
        <Text style={[text.title, styles.deleteTitle]}>Are you Sure?</Text>

        {/* Warning Message */}
        <Text style={[text.body, styles.deleteMessage]}>You won't be able to revert this!</Text>

        {/* Action Buttons */}
        <View style={styles.deleteActionRow}>
          <TouchableOpacity 
            style={styles.deleteConfirmBtn} 
            activeOpacity={0.8}
            onPress={handleDeleteConfirm}
          >
            <Text style={[text.subtitle, styles.deleteConfirmBtnText]}>Yes, delete it!</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.deleteCancelBtn} 
            activeOpacity={0.8}
            onPress={handleDeleteCancel}
          >
            <Text style={[text.subtitle, styles.deleteCancelBtnText]}>No, Cancel!</Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>

    </>
  );
};

export default OpportunityCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: hp(1.6),
    ...SHADOW.elevation2,
  },
  rowHeader: {
    ...layout.rowSpaceBetween,
  },
  headerLeft: {
    ...layout.rowCenter,
    gap: SPACING.sm,
    flex: 1,
  },
  headerLeftContent: {
    maxWidth: wp(60),
  },
  dot: {
    width: wp(3.5),
    height: wp(3.5),
    borderRadius: RADIUS.md,
  },

  caption: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textLight,
    fontWeight: '700',
    marginBottom: hp(0.3),
  },
  title: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
    maxWidth: wp(50),
  },
  headerRight: {
    ...layout.rowCenter,
    gap: SPACING.sm,
  },
  hours: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
  },
  detailArea: {
    marginTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: hp(1.2),
  },
  detailRow: {
    ...layout.rowSpaceBetween,
    marginBottom: hp(1),
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
    fontWeight: '500',
  },
  companyLabel: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  companyValue: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
    fontWeight: '500',
  },
  companyGroup: {
    marginTop: hp(0.8),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: hp(0.8),
    backgroundColor: COLORS.bg,
  },
  linkText: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.info,
    fontWeight: '500',
  },
  actionsRow: {
    ...layout.rowSpaceBetween,
    marginTop: hp(0.5),
  },
  actionsRowPrimary: {
    ...layout.rowCenter,
    justifyContent: 'space-between',
    gap: wp(6),
    marginTop: hp(0.8),
  },
  actionsRowSecondary: {
    ...layout.rowCenter,
    justifyContent: 'flex-start',
    gap: SPACING.sm,
    marginTop: hp(1.2),
  },
  actionBtn: {
    flex: 1,
    paddingVertical: hp(1.1),
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: SPACING.xs,
  },
  actionText: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '700',
  },
  // Match Expense screen accent (#fb923c) for primary, keep consistent outlines
  viewBtn: { borderColor: COLORS.primary },
  editBtn: { borderColor: COLORS.success },
  deleteBtn: { borderColor: COLORS.ButtonColor },
  buttonNeutralFill: {  
    paddingVertical: hp(2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  buttonNegativeFill: {
    backgroundColor: COLORS.text,
    paddingVertical: hp(1.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  buttonFillText: {
    color: COLORS.bg,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '700',
  },
  iconOutlineBtn: {
    width: wp(11.5),
    height: wp(11.5),
    borderRadius: wp(2.5),
    borderWidth: 1.2,
    borderColor: COLORS.text,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
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
  bsHandle: {
    alignSelf: 'center',
    width: wp(18),
    height: hp(0.7),
    backgroundColor: COLORS.text,
    borderRadius: hp(0.6),
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  bsContent: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.xl,
    paddingBottom: hp(3),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  bsBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  bsHeaderRow: {
    ...layout.rowSpaceBetween,
    marginBottom: hp(1.2),
  },
  bsTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  iconCircle: {
    alignSelf: 'center',
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    borderWidth: 2,
    borderColor: COLORS.success + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.5),
  },
  iconCircleMark: {
    fontSize: TYPOGRAPHY.h1,
    color: COLORS.success,
    fontWeight: '800',
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.h3,
    fontWeight: '700',
    color: COLORS.textLight,
    marginTop: hp(0.8),
  },
  helperText: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    marginTop: hp(1),
    marginBottom: hp(1.2),
    fontWeight: '400',
  },
  selectBox: {
    ...layout.rowSpaceBetween,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: hp(1.6),
    backgroundColor: COLORS.bg,
  },
  selectText: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
  },
  chevron: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.textMuted,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    marginTop: hp(0.8),
    overflow: 'hidden',
  },
  optionRow: {
    paddingVertical: hp(1.2),
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bg,
  },
  optionRowActive: {
    backgroundColor: COLORS.successBg,
  },
  optionRowText: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
  },
  optionRowTextActive: {
    color: COLORS.success,
    fontWeight: '700',
  },
  ctaRow: {
    ...layout.rowSpaceBetween,
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: hp(2),
  },
  primaryBtn: {
    backgroundColor: COLORS.ButtonColor,
    paddingVertical: hp(1.2),
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
  },
  Primarybtn:{
  paddingHorizontal: wp(15),
  paddingVertical: hp(1.4),

  },
  primaryBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.subtitle,
    textAlign: 'center',
  },
  secondaryBtn: {
    backgroundColor: COLORS.text,
    paddingVertical: hp(1.2),
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
  },
  secondaryBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.subtitle,
  },

  successText: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    marginTop: hp(1),
    marginBottom: hp(1.6),
  },
  errorText: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    marginTop: hp(1),
    marginBottom: hp(1.6),
    paddingHorizontal: SPACING.lg,
  },
  modalTitlebottom:{
    textAlign: 'center',
    fontSize: TYPOGRAPHY.h2,
    fontWeight: '200',
    // color: COLORS.text,
    marginTop: hp(0.8),
  },

  // Delete Confirmation Styles
  deleteIconCircle: {
    alignSelf: 'center',
    width: wp(20),
    height: wp(20),
    borderRadius: wp(10),
    borderWidth: 2,
    borderColor: COLORS.warning + '33',
    backgroundColor: COLORS.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  deleteTitle: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.h2,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: hp(1),
  },
  deleteMessage: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: hp(2.5),
    paddingHorizontal: SPACING.lg,
  },
  deleteActionRow: {
    ...layout.rowCenter,
    justifyContent: 'space-between',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  deleteConfirmBtn: {
    backgroundColor: COLORS.ButtonColor,
    paddingVertical: hp(1.4),
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    flex: 1,
    alignItems: 'center',
  },
  deleteConfirmBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
  },
  deleteCancelBtn: {
    backgroundColor: COLORS.textMuted,
    paddingVertical: hp(1.4),
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    flex: 1,
    alignItems: 'center',
  },
  deleteCancelBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
  },
  btnsDelete: {
    color: COLORS.delete,
  },
  btnsfactCheck: {
    color: COLORS.info,
  },
  btnsdescription: {
    color: COLORS.primary,
  },
  btnsschedule: {
    color: COLORS.success,
  },
  viewBtn : {
    borderWidth:1,
    borderColor: COLORS.primary,
  },
  editBtn: {
    borderWidth:1,
    borderColor: COLORS.info,
  },
  deleteBtn: {
    borderWidth:1,
    borderColor: COLORS.delete,
  },
  scheduleBtn: {
    borderWidth:1,
    borderColor: COLORS.success,
  },
  // Disabled button styles
  disabledButton: {
    opacity: 0.4,
    backgroundColor: COLORS.textMuted + '20',
  },
  disabledIcon: {
    opacity: 0.5,
  },
});


