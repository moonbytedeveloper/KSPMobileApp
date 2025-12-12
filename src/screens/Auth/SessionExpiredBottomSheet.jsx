import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import CommonBottomSheet from '../../components/common/CommonBottomSheet';
import { wp, hp, rf } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../styles/styles';
import { CommonActions } from '@react-navigation/native';

const SessionExpiredBottomSheet = ({ navigation }) => {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    // reset navigation to Login
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  useEffect(() => {
    // if the sheet is dismissed by the user via swipe, also reset
    if (!visible) {
      // already handled in handleClose
    }
  }, [visible]);

  return (
    <CommonBottomSheet visible={visible} onDismiss={handleClose} snapPoints={[hp(30)]}>
      <View style={styles.container}>
        <Text style={styles.title}>Session Expired</Text>
        <Text style={styles.message}>Your session has expired. Please login again to continue.</Text>
        <TouchableOpacity style={styles.button} onPress={handleClose} activeOpacity={0.85}>
          <Text style={styles.buttonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </CommonBottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: hp(2),
    alignItems: 'center',
  },
  title: {
    fontSize: rf(4.2),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    marginBottom: hp(1),
  },
  message: {
    fontSize: rf(3.2),
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: hp(2),
    paddingHorizontal: wp(4),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(12),
    borderRadius: RADIUS.md,
  },
  buttonText: {
    color: '#fff',
    fontSize: rf(3.4),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
});

export default SessionExpiredBottomSheet;
