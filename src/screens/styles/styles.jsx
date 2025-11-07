import { StyleSheet, Platform } from 'react-native';
import { wp, hp, rf } from '../../utils/responsive';

// Design tokens
export const COLORS = {
  // Brand
  primary: '#e34f25',
  primaryDark: '#ea7d1f',
  primaryLight: '#ffe7d3',
  ButtonColor: '#E44D23', // Orange
  // Semantic
  success: '#10B981',
  successBg: '#d1fae5',
  warning: '#F59E0B',
  warningBg: '#fef3c7',
  danger: '#EF4444',
  dangerBg: '#fee2e2',
  info: '#3B82F6',
  infoBg: '#dbeafe',
  // Actions
  edit: '#16a34a',
  delete: '#EF4444',
  view: '#22c55e',

  // Neutral
  text: '#111827',
  textMuted: '#6b7280',
  textLight: '#9ca3af',
  bg: '#ffffff',
  bgMuted: '#f8f9fa',
  border: '#d1d5db',
  divider: '#EEE',
  shadow: '#000000',
};

export const SPACING = {
  xxs: wp(0.8),
  xs: wp(1.2),
  sm: wp(2),
  md: wp(3),
  lg: wp(4),
  xl: wp(6),
  xxl: wp(8),
};

export const RADIUS = {
  sm: wp(1),
  md: wp(2),
  lg: wp(3),
  xl: wp(4),
  pill: wp(50),
};

export const SHADOW = {
  elevation2: {
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};

// Typography scale and families
export const TYPOGRAPHY = {
  fontFamilyRegular: Platform.select({ ios: 'Nunito-Regular', android: 'Nunito-Regular' }),
  fontFamilyMedium: Platform.select({ ios: 'Nunito-SemiBold', android: 'Nunito-SemiBold' }),
  fontFamilyBold: Platform.select({ ios: 'Nunito-Bold', android: 'Nunito-Bold' }),

  h1: rf(4.6),
  h2: rf(4.0),
  h3: rf(3.6),
  // label: rf(3.2),
  subtitle: rf(3.2),
  body: rf(3.0),
  small: rf(2.7),
  caption: rf(2.4),
  lineHeightTight: rf(3.4),
  lineHeightNormal: rf(3.8),
  lineHeightRelaxed: rf(4.2),
  input: rf(4.2),
};

// Common text styles
export const text = StyleSheet.create({
  title: {
    fontSize: TYPOGRAPHY.h2,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontWeight: '600',
  },
  body: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    fontWeight: '400',
  },
  muted: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    fontWeight: '400',
  },
  caption: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    fontWeight: '400',
  },
});

// Reusable input styles (label + container + input + helper/error)
export const inputStyles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: hp(1.6),
  },
  label: {
    marginBottom: hp(0.6),
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontWeight: '700',
  },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: hp(0),
    minHeight: hp(6.2),
  },
  boxMultiline: {
    paddingVertical: hp(2.2),
    minHeight: 'auto',
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    marginLeft: SPACING.xs,
    fontSize: TYPOGRAPHY.input,
    color: COLORS.text,
    fontFamily: 'Nunito-Regular',
  },
  inputMultiline: {
    minHeight: hp(10),
    textAlignVertical: 'top',
  },
  rightIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helper: {
    marginTop: hp(0.6),
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  errorText: {
    marginTop: hp(0.6),
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.danger,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontWeight: '500',
  },
  // States
  stateFocused: {
    borderColor: COLORS.primary,
  },
  stateError: {
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  stateDisabled: {
    opacity: 0.6,
  },
});

// Utility containers/cards that are commonly reused
export const layout = StyleSheet.create({
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.divider,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    ...SHADOW.elevation2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },
});

// Form-specific styles
export const formStyles = StyleSheet.create({
  container: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: wp(1),
  }, 
  title: {
    fontSize: TYPOGRAPHY.h1,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1.5),
  },
  sectionHeading: {
    fontSize: rf(4.6),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1),
  },
  inputLabel: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
    fontWeight: '700',
    marginBottom: hp(0.6),
  },
  inputBox: {
    borderWidth: 1.2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: hp(0),
    minHeight: hp(6.2),
    backgroundColor: COLORS.bg,
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.input,
    color: COLORS.text,
    paddingVertical: 0,
  },
  rightIcon: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textLight,
    marginLeft: SPACING.sm,
  },
  actionsRow: {
    ...layout.rowSpaceBetween,
    marginTop: hp(2.5),
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    // paddingVertical: hp(1.8),
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    flex: 1,
    marginRight: wp(3),
    alignItems: 'center',
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: rf(3.4),
    fontWeight: '700',
  },
  cancelBtn: {
    backgroundColor: '#374151',
    paddingVertical: wp(3),
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
    flex: 1,
    marginLeft: wp(0),
    alignItems: 'center',
  },
  cancelBtnText: {
    color: COLORS.bg,
    fontSize: rf(3.4),
    fontWeight: '700',
  },
});

// Optional helpers to compose/override styles
export const createInputStyles = (overrides = {}) =>
  StyleSheet.create({
    ...inputStyles,
    ...overrides,
  });

export default {
  COLORS,
  SPACING,
  RADIUS,
  SHADOW,
  TYPOGRAPHY,
  text,
  inputStyles,
  layout,
  formStyles,
  createInputStyles,
};



// Common button and icon styles to reuse across the app
export const buttonStyles = StyleSheet.create({
  // Base neutral button container (rounded, padded)
  buttonNeutralFill: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  UpdateStatusBtn:{
    color:  '#fb923c',
  },
  UpdateBtns:{
    borderColor: '#fb923c',
  },
  // Variant placements (compose with buttonNeutralFill)
  editBtn: {
    borderColor: COLORS.edit,
  },
  viewBtn: {
    borderColor: COLORS.info,
  },
  scheduleBtn: {
    borderColor: '#6b7280',
  },
  deleteBtn: {
    borderColor: COLORS.delete,
  },

  // Icon color utilities
  iconEdit: {
    color: COLORS.edit,
  },
  iconView: {
    color: COLORS.info,
  },
  iconSchedule: {
    color:   '#6b7280',
  },
  iconDelete: {
    color: COLORS.delete,
  },
});

// Radio button and grouping styles aligned with EditProfileScreen
export const radioStyles = StyleSheet.create({
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(4),
  },
  outer: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  inner: {
    width: wp(2.6),
    height: wp(2.6),
    borderRadius: wp(1.3),
    backgroundColor: COLORS.primary,
  },
  label: {
    fontSize: rf(3.2),
    color: COLORS.text,
  },
});


