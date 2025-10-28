import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../../screens/styles/styles';

const SuccessBottomSheet = ({
  visible,
  title = 'Success!',
  message = 'Operation completed successfully',
  buttonText = 'OK',
  onDismiss,
  autoCloseDelay = 3000, // Auto close after 3 seconds
}) => {
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => [hp(25)], []);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
      
      // Auto close after delay if specified
      if (autoCloseDelay > 0) {
        const timer = setTimeout(() => {
          onDismiss && onDismiss();
        }, autoCloseDelay);
        
        return () => clearTimeout(timer);
      }
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible, autoCloseDelay, onDismiss]);

  const handleDismiss = () => {
    onDismiss && onDismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      onDismiss={handleDismiss}
      handleIndicatorStyle={styles.handle}
      handleStyle={{ backgroundColor: 'transparent' }}
      backgroundStyle={styles.sheetBackground}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
      )}
    >
      <BottomSheetView style={styles.sheetContent}>
        <View style={styles.iconWrapper}>
          <Icon name="check-circle" size={rf(8)} color="#10B981" />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={handleDismiss}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{buttonText}</Text>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default SuccessBottomSheet;

const styles = StyleSheet.create({
  handle: {
    backgroundColor: COLORS.border,
    width: wp(12),
    height: hp(0.5),
  },
  sheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(5),
    borderTopRightRadius: wp(5),
  },
  sheetContent: {
    flex: 1,
    paddingHorizontal: wp(6),
    paddingVertical: hp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginBottom: hp(1.5),
  },
  title: {
    fontSize: rf(4.5),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    textAlign: 'center',
    marginBottom: hp(1),
  },
  message: {
    fontSize: rf(3.5),
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    textAlign: 'center',
    marginBottom: hp(2.5),
    lineHeight: rf(4.5),
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(8),
    paddingVertical: hp(1.2),
    borderRadius: wp(2.5),
    minWidth: wp(25),
  },
  buttonText: {
    color: '#fff',
    fontSize: rf(3.8),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    textAlign: 'center',
  },
});
