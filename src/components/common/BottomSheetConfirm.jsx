import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Svg, { Circle, Path } from 'react-native-svg';
import { wp, hp, rf } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../../screens/styles/styles';

const BottomSheetConfirm = ({
  visible,
  title = 'Are you Sure?',
  message = "You won’t be able to revert this!",
  confirmText = 'Yes, delete it!',
  cancelText = 'No, Cancel!',
  onConfirm,
  onCancel,
  autoCloseOnConfirm = true,
}) => {
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => [hp(30)], []);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const closeSheet = () => {
    onCancel && onCancel();
  };

  const hasCancel = !!cancelText;

  return (
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
        <View style={styles.iconWrapper}>
          <Svg width={rf(10)} height={rf(10)} viewBox="0 0 48 48">
            <Circle cx="24" cy="24" r="22" stroke="#d4a016" strokeWidth="2.5" fill="none" />
            <Path d="M24 12v16" stroke="#d4a016" strokeWidth="3" strokeLinecap="round" />
            <Circle cx="24" cy="34" r="2" fill="#d4a016" />
          </Svg>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <View style={[styles.actionsRow, !hasCancel && styles.actionsRowCenter]}>
          <TouchableOpacity
            style={[styles.confirmBtn, !hasCancel && styles.confirmBtnSingle]}
            onPress={async () => {
              try {
                const maybePromise = onConfirm && onConfirm();
                if (maybePromise && typeof maybePromise.then === 'function') {
                  await maybePromise;
                }
              } finally {
                if (autoCloseOnConfirm) {
                  closeSheet();
                }
              }
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmText}>{confirmText}</Text>
          </TouchableOpacity>
          {hasCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={closeSheet} activeOpacity={0.8}>
              <Text style={styles.cancelText}>{cancelText}</Text>
            </TouchableOpacity>
          )}
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default BottomSheetConfirm;

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
    paddingBottom: hp(2.5),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  sheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  title: {
    textAlign: 'center',
    fontSize: rf(3.8),
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: hp(0.8),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  message: {
    textAlign: 'center',
    fontSize: rf(3.2),
    color: COLORS.text,
    marginBottom: hp(2.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionsRowCenter: {
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: wp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: wp(3),
    minWidth: wp(35),
    alignItems: 'center',
  },
  confirmBtnSingle: {
    minWidth: wp(25),
  },
  confirmText: {
    color: '#fff',
    fontSize: rf(4),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  cancelBtn: {
    backgroundColor: '#374151',
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(4),
    borderRadius: wp(3),
    minWidth: wp(35),
    alignItems: 'center',
  },
  cancelText: {
    color: '#fff',
    fontSize: rf(4),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
}); 