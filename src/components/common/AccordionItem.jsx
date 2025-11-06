import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { rf, wp, hp } from '../../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { buttonStyles, COLORS, TYPOGRAPHY, RADIUS,SPACING } from '../../screens/styles/styles';

// AccordionItem Component
const AccordionItem = ({
  item,
  isActive,
  onToggle,
  onView,
  onEdit,
  onDelete,
  showViewButton = true,
  showSubmitButton = false,
  onSubmit,
  navigation,
  headerLeftLabel = 'Employee',
  headerRightLabel = 'Amount',
  customRows,
  editLabel = 'Edit',
  status,
}) => {
  // Defer delete confirmation to the screen-level bottom sheet
  const StatusBadge = ({ label }) => {
    const palette = {
      Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
      Approved: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
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
    <View style={styles.accordionItem}>
      <TouchableOpacity onPress={onToggle} style={styles.accordionHeader} activeOpacity={0.8}>
        <View style={styles.headerSummaryContainer}>
          {!!item?.status && (

            <View
              style={[
                styles.dot,
                {
                  backgroundColor:
                    String(item.status).trim() === 'Approved'
                      ? COLORS.success
                      : String(item.status).trim() === 'Pending'
                        ? COLORS.warning
                        : String(item.status).trim() === 'Draft'
                          ? 'grey'
                          : String(item.status).trim() === 'Submitted'
                            ? COLORS.info
                            : COLORS.danger,
                },
              ]}
            />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryLabel}>{headerLeftLabel}</Text>
            <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">{item.expenseName}</Text>
          </View>
        </View>
        <View style={styles.rightSideContainer}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.summaryLabel}>{headerRightLabel}</Text>
            <Text style={styles.summaryValue}>{item.amount}</Text>
          </View>
          <Svg
            width={rf(4.5)}
            height={rf(4.5)}
            viewBox="0 0 16 16"
            fill="#64748b"
            style={[styles.toggleIcon, { transform: [{ rotate: isActive ? '180deg' : '0deg' }] }]}
          >
            <Path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
          </Svg>
        </View>
      </TouchableOpacity>

      {isActive && (
        <View style={styles.accordionBody}>
          {Array.isArray(customRows) && customRows.length > 0 ? (
            <>
              {customRows.map((row, idx) => (
                <View key={idx} style={styles.cardRow}>
                  <Text style={styles.cardLabel}>{String(row.label)}</Text>
                  <Text style={styles.cardValue}>{row.value}</Text>
                </View>
              ))}
            </>
          ) : (
            <>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Sole Expense Code</Text>
                <Text style={styles.cardValue}>{item.soleExpenseCode}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Document From Date</Text>
                <Text style={styles.cardValue}>{item.documentFromDate}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Document To Date</Text>
                <Text style={styles.cardValue}>{item.documentToDate}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={styles.cardLabel}>Status</Text>
                <StatusBadge label={item.status} />
              </View>
            </>
          )}
          <View style={styles.line} />
          <View style={styles.actionButtonContainer}>
            {onView && (
              <TouchableOpacity style={styles.actionButton1} onPress={() => onView(item)}>
                <Text style={styles.actionButtonText1}>View</Text>
              </TouchableOpacity>
            )}
            {onEdit && (
              <TouchableOpacity style={styles.actionButton2} onPress={() => onEdit(item)}>
                <Text style={styles.actionButtonText2}>Edit</Text>
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity style={styles.actionButton3} onPress={() => onDelete(item.soleExpenseCode)}>
                <Text style={styles.actionButtonText3}>Delete</Text>
              </TouchableOpacity>
            )}
            {showSubmitButton && (
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.submitButtonContainer}
                onPress={() => navigation?.navigate('Main', { screen: 'Timesheet' })}
              >
                <View style={styles.submitButton}>
                  <Text style={styles.submitButtonText}>Submit Timesheet</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

    </View>
  );
};

export default AccordionItem;

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    padding: 1
  },
  accordionItem: {
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
    zIndex: -1
  },
  accordionHeader: {
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
    marginLeft: wp(-1),

  },
  summaryLabel: {
    fontSize: rf(3),
    fontWeight: '700',
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
    marginLeft: wp(2),
    maxWidth: '40%',
  },
  toggleIcon: {},
  accordionBody: {
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
    borderColor: COLORS.warning,
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
    color: COLORS.warning,
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
  dot: {
    width: wp(3.5),
    height: wp(3.5),
    borderRadius: RADIUS.md,
    marginRight: wp(2),
  },

  submitButtonContainer: {
    marginTop: hp(1.5),
    marginHorizontal: -wp(1.2),
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    backgroundColor: COLORS.primary + '33',
    borderColor: COLORS.primary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButton: {
    marginHorizontal: wp(1),
  },
  submitButtonText: {
    color: COLORS.primary,
    fontSize: rf(3),
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
}); 