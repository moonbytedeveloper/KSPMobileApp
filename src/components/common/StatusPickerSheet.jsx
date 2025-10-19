import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { wp, hp, rf } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../../screens/styles/styles';

const StatusPickerSheet = ({
  visible,
  value,
  options = ['Won', 'Pending', 'Lost'],
  onSelect,
  onClose,
  title = 'Update Status',
}) => {
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => [hp(40)], []);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      onDismiss={onClose}
      handleIndicatorStyle={styles.handle}
      handleStyle={{ backgroundColor: 'transparent' }}
      backgroundStyle={styles.sheetBackground}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
      )}
    >
      <BottomSheetView style={styles.sheetContent}>
        <Text style={styles.title}>{title}</Text>
        {options.map((opt) => {
          const isActive = opt === value;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.option, isActive && styles.optionActive]}
              activeOpacity={0.8}
              onPress={() => onSelect && onSelect(opt)}
            >
              <Text style={[styles.optionText, isActive && styles.optionTextActive]}>{opt}</Text>
            </TouchableOpacity>
          );
        })}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default StatusPickerSheet;

const styles = StyleSheet.create({
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
    paddingBottom: hp(3),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  sheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  title: {
    textAlign: 'center',
    fontSize: rf(3.6),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1.8),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  option: {
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: hp(1),
  },
  optionActive: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.success,
  },
  optionText: {
    fontSize: rf(3.2),
    color: COLORS.text,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  optionTextActive: {
    color: COLORS.success,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
});


