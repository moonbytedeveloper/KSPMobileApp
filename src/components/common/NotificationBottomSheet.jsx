import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../../screens/styles/styles';

const NotificationBottomSheet = ({
  visible,
  notification,
  onDismiss,
  onPress,
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
  const snapPoints = useMemo(() => snapPointsProp || [hp(25)], [snapPointsProp]);

  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  const handlePress = () => {
    // Call the onPress callback if provided (navigation is handled there)
    onPress && onPress(notification);
    
    // Dismiss the bottom sheet
    onDismiss && onDismiss();
  };

  if (!notification) return null;

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
      <BottomSheetView style={[styles.content, contentContainerStyle]}>
        <TouchableOpacity 
          style={styles.notificationContainer}
          activeOpacity={0.8}
          onPress={handlePress}
        >
          <View style={styles.notificationHeader}>
            <View style={styles.notificationIcon}>
              <Icon name="notifications" size={rf(4)} color="#fff" />
            </View>
            <View style={styles.notificationContent}>
              <Text style={styles.notificationTitle}>
                {notification.title || 'New Notification'}
              </Text>
              <Text style={styles.notificationBody}>
                {notification.body || 'You have a new notification'}
              </Text>
            </View>
          </View>
          
          <View style={styles.notificationFooter}>
            <Text style={styles.tapToView}>Tap to view</Text>
          </View>
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default NotificationBottomSheet;

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
  notificationContainer: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: hp(2),
  },
  notificationIcon: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(6),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: rf(3.6),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    color: COLORS.text,
    marginBottom: hp(0.8),
  },
  notificationBody: {
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    color: COLORS.textMuted,
    lineHeight: rf(4.2),
  },
  notificationFooter: {
    alignItems: 'center',
    paddingTop: hp(1.5),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: hp(1),
  },
  tapToView: {
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    color: COLORS.primary,
  },
});
