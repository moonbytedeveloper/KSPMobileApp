import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { wp, hp } from '../../utils/responsive';
import { COLORS } from '../../screens/styles/styles';

const CommonBottomSheet = ({
  visible,
  onDismiss,
  children,
  snapPoints: snapPointsProp,
  enablePanDownToClose = true,
  enableContentPanningGesture = false,
  backdropOpacity = 0.45,
  backdropPressBehavior = 'close',
  keyboardBehavior = 'extend',
  keyboardBlurBehavior = 'restore',
  handleIndicatorStyle,
  backgroundStyle,
  contentContainerStyle,
}) => {
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => snapPointsProp || [hp(30)], [snapPointsProp]);

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
      enablePanDownToClose={enablePanDownToClose}
      enableContentPanningGesture={enableContentPanningGesture}
      onDismiss={onDismiss}
      keyboardBehavior={keyboardBehavior}
      keyboardBlurBehavior={keyboardBlurBehavior}
      handleIndicatorStyle={[styles.handle, handleIndicatorStyle]}
      handleStyle={{ backgroundColor: 'transparent' }}
      backgroundStyle={[styles.sheetBackground, backgroundStyle]}
      backdropComponent={(props) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={backdropOpacity}
          pressBehavior={backdropPressBehavior}
        />
      )}
    >
      <BottomSheetView style={[styles.content,{ minHeight: snapPointsProp?.[0] || hp(30) },  contentContainerStyle]}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default CommonBottomSheet;

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
  sheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  content: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(6),
    paddingBottom: hp(2.5),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
});


