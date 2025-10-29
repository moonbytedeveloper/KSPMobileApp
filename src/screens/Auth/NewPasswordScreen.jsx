import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Animated, Easing, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
//import CustomIcon from '../../utils/CustomIcon';
import { COLORS } from '../styles/styles';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import AppHeader from '../../components/common/AppHeader';
import CommonBottomSheet from '../../components/common/CommonBottomSheet';
import Icon from '../../utils/CustomIcon';
import { resetPassword } from '../../api/authServices';
import Loader from '../../components/common/Loader';

const NewPasswordScreen = ({ navigation, route }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Animation refs for floating icons
  const randomIconsRef = useRef([]);

  // Get email from route params
  const email = route?.params?.email || '';

  // --- Color utilities for deterministic shading ---
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255,
    };
  };
  const rgbToHex = (r, g, b) => {
    const toHex = (n) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };
  const mixColors = (hexA, hexB, t) => {
    const a = hexToRgb(hexA);
    const b = hexToRgb(hexB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bch = Math.round(a.b + (b.b - a.b) * t);
    return rgbToHex(r, g, bch);
  };
  const hashToUnit = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i += 1) {
      h ^= str.charCodeAt(i);
      h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
    }
    return (h >>> 0) / 4294967295;
  };

  const businessIconNames = [
    'briefcase-variant',
    'account-group',
    'chart-line',
    'file-document-outline',
    'calendar-check',
    'clock-time-four-outline',
    'cash-multiple',
    'shield-check-outline',
    'account-tie',
    'handshake',
    'account-cash',
    'chart-pie',
    'office-building-cog',
    'clipboard-check-outline',
    'account-clock',
    'chart-bar',
    'account-multiple-check',
    'briefcase',
    'office-building',
    'domain',
    'factory',
    'account-multiple',
    'account',
    'cash',
    'bank',
    'chart-areaspline',
    'chart-bell-curve',
    'chart-line-variant',
    'file-chart',
    'clipboard-text',
    'clipboard-account',
    'calendar-month',
    'calendar-star',
  ];

  // Fixed, deterministic placement and styling for new password screen
  const fixedBusinessIcons = [
    'briefcase-variant',
    'account-group',
    'chart-line',
    'file-document-outline',
    'calendar-check',
    'clock-time-four-outline',
    'cash-multiple',
    'shield-check-outline',
    'account-tie',
    'handshake',
    'account-cash',
    'chart-pie',
    'office-building-cog',
    'clipboard-check-outline',
    'account-clock',
    'chart-bar',
    'briefcase',
    'office-building',
    'bank',
    'chart-areaspline',
  ];

  const fixedIconPlacements = [
    // Top band - positioned to not interfere with logo
    { topPct: 3, leftPct: 8, size: 28 },
    { topPct: 10, leftPct: 40, size: 26 },
    { topPct: 5, leftPct: 72, size: 28 },
    { topPct: 10, leftPct: 90, size: 26 },
    { topPct: 18, leftPct: 80, size: 23 },
    { topPct: 25, leftPct: 10, size: 23 },
    // Upper-mid band - around password input area
    { topPct: 35, leftPct: 14, size: 28 },
    { topPct: 15, leftPct: 20, size: 24 },
    { topPct: 35, leftPct: 86, size: 26 },

    // Lower-mid band - around submit button area
    { topPct: 50, leftPct: 12, size: 28 },
    { topPct: 60, leftPct: 98, size: 26 },
    { topPct: 50, leftPct: 88, size: 28 },

    // Bottom band - around submit button area
    { topPct: 75, leftPct: 20, size: 30 },
    { topPct: 65, leftPct: 80, size: 28 },
    { topPct: 82, leftPct: 78, size: 36 },
    { topPct: 85, leftPct: 10, size: 34 },
  ];

  if (randomIconsRef.current.length === 0) {
    const fixedIcons = fixedIconPlacements.map((p, i) => {
      const name = fixedBusinessIcons[i % fixedBusinessIcons.length];
      // Determine shade by vertical position (lighter at top, darker at bottom)
      const verticalT = clamp01(p.topPct / 100);
      const jitter = (hashToUnit(`${name}-${i}`) - 0.5) * 0.2; // ±0.1 variance
      const shadeT = clamp01(verticalT + jitter);
      const color = mixColors(COLORS.primaryLight, COLORS.primaryDark, shadeT);
      const opacity = 0.6 + (hashToUnit(`op-${name}-${i}`) * 0.25); // 0.6 - 0.85 (more subtle for new password)
      const amplitude = 3 + (i % 4); // subtle, fixed
      const delay = (i * 130) % 1600; // fixed
      const duration = 2600 + (i % 5) * 220; // fixed
      return {
        id: `${name}-${i}`,
        name,
        size: p.size,
        color,
        opacity,
        topPct: p.topPct,
        leftPct: p.leftPct,
        anim: new Animated.Value(0),
        amplitude,
        delay,
        duration,
      };
    });
    randomIconsRef.current = fixedIcons;
  }

  const startFloating = (anim, delay = 0, duration = 2800) => {
    anim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          delay,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const getFloatStyle = (anim, amplitude = 8) => ({
    transform: [
      {
        translateY: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-amplitude, amplitude],
        }),
      },
    ],
  });

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardOpen(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardOpen(false);
    });

    // Start floating for random icons
    randomIconsRef.current.forEach(item => {
      startFloating(item.anim, item.delay, item.duration);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleSubmit = async () => {
    setIsLoading(true);
    if (!newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    try { 
      const resp = await resetPassword({ email, newPassword, ConfirmPassword: confirmPassword });
      console.log('Reset password API data:', resp);
      setShowSuccessSheet(true);
    } catch (e) { 
      setIsLoading(false);
      let message = 'Unable to reset password.';
      if (e?.response?.data) {
        const data = e.response.data; 
        if (data.Message) {
          message = data.Message;
        }  else { 
          message = JSON.stringify(data);
        }
      } else if (e?.Message) {
        message = e.Message;
      }
      
      Alert.alert('Reset failed', message);
    }finally {
      setIsLoading(false);
    }
  };

  const isFormValid = newPassword.length > 0 && confirmPassword.length > 0 && newPassword === confirmPassword;
  if(isLoading) {
    return <Loader />;
  }
  return (
    <>
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? safeAreaTop : 0}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="newPasswordGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.primaryLight} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#newPasswordGradient)" />
      </Svg>
      
      {/* App Header */}
      <AppHeader
        title="Back"
        leftIconName="chevron-left"
        onLeftPress={() => navigation.goBack()}
        showRight={false}
      />
      
      {/* Floating business icons layer */}
      <View style={styles.floatingIconsLayer} pointerEvents="none">
        {randomIconsRef.current.map(item => (
          <Animated.View
            key={item.id}
            style={[
              { 
                position: 'absolute', 
                top: hp(item.topPct), 
                left: wp(item.leftPct), 
                opacity: item.opacity 
              },
              getFloatStyle(item.anim, item.amplitude),
            ]}
          >
            <MCIcon name={item.name} size={item.size} color={item.color} />
          </Animated.View>
        ))}
      </View>

      {/* Floating Logo */}
      <View style={[
        styles.floatingLogoContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(0) : safeAreaTop + hp(20) }
      ]}>
        <Icon
          name="Ksp-logo" 
          size={isKeyboardOpen ? hp(25) : hp(30)} 
          color={COLORS.primary} 
          style={styles.logo} 
        />
      </View>

      {/* Floating Tagline */}
      <View style={[
        styles.floatingTaglineContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(23) : safeAreaTop + hp(48) }
      ]}>
        <Text style={styles.tagline}>Compliance with Speed !</Text>
      </View>

      {/* New Password Input */}
      <View style={[
        styles.floatingInputContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(30) : safeAreaTop + hp(55) }
      ]}>
        <Ionicons name="lock-closed" size={rf(5)} color="#666" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="New Password"
          placeholderTextColor="#999"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry={!showNewPassword}
          returnKeyType="next"
        />
        <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
          <Ionicons name={showNewPassword ? 'eye-off' : 'eye'} size={rf(5)} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Confirm Password Input */}
      <View style={[
        styles.floatingInputContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(38) : safeAreaTop + hp(63) }
      ]}>
        <Ionicons name="lock-closed" size={rf(5)} color="#666" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Confirm New Password"
          placeholderTextColor="#999"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
          <Ionicons name={showConfirmPassword ? 'eye-off' : 'eye'} size={rf(5)} color="#666" />
        </TouchableOpacity>
      </View>
      
      {/* Floating Submit Button */}
      <View style={[
        styles.floatingButtonContainer,
        { 
          bottom: isKeyboardOpen 
            ? (Platform.OS === 'ios' ? hp(40) : hp(4))
            : hp(4)
        }
      ]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            !isFormValid && styles.submitButtonDisabled
          ]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={!isFormValid}
        >
          <Text style={[
            styles.submitButtonText,
            !isFormValid && styles.submitButtonTextDisabled
          ]}>Submit</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

    {/* Success Bottom Sheet */}
    <CommonBottomSheet
      visible={showSuccessSheet}
      onDismiss={() => setShowSuccessSheet(false)}
      snapPoints={[hp(30)]}
    >
      <View style={styles.sheetContentCenter}>
        {/* <View style={styles.sheetHandleMini} /> */}
        <View style={styles.successIconCircle}>
          <Ionicons name="checkmark" size={rf(6)} color={COLORS.success} />
        </View>
        <Text style={styles.successTitle}>Done</Text>
        <Text style={styles.successMessage}>Reset Password Successful!</Text>
        <TouchableOpacity
          style={styles.sheetPrimaryBtn}
          activeOpacity={0.85}
          onPress={() => {
            setShowSuccessSheet(false);
            setIsLoading(false);
            navigation.navigate('Login');
          }}
        >
          <Text style={styles.sheetPrimaryBtnText}>Ok</Text>
        </TouchableOpacity>
      </View>
    </CommonBottomSheet>
    </>
  );
};

export default NewPasswordScreen;

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#fff5ec',
  },
  floatingIconsLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  floatingLogoContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  floatingTaglineContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: wp(5),
  },
  logo: {
    // Removed text shadow
  },
  tagline: {
    fontSize: rf(5.4),
    fontWeight: '600',
    color: '#333',
  },
  floatingInputContainer: {
    position: 'absolute',
    left: wp(5),
    right: wp(5),
    flexDirection: 'row',
    alignItems: 'center',
    height: hp(6.8),
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: wp(3),
    paddingHorizontal: wp(3),
    backgroundColor: '#fff',
  },
  icon: {
    marginRight: wp(2),
  },
  input: {
    flex: 1,
    fontSize: rf(4.2),
    color: '#333',
  },
  floatingButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: wp(5),
    backgroundColor: 'transparent',
  },
  submitButton: {
    width: '100%',
    height: hp(6.8),
    backgroundColor: COLORS.primary,
    borderRadius: wp(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: rf(5.2),
    fontWeight: '600',
  },
  submitButtonTextDisabled: {
    color: '#999',
  },
  // Sheet content styles (using CommonBottomSheet)
  sheetContentCenter: {
    alignItems: 'center',
    paddingTop: hp(1),
  },
  sheetHandleMini: {
    width: wp(14),
    height: hp(0.6),
    borderRadius: wp(3),
    backgroundColor: '#E5E7EB',
    marginBottom: hp(1.5),
  },
  successIconCircle: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(14) / 2,
    backgroundColor: '#E8FFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1),
  },
  successTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: hp(0.6),
  },
  successMessage: {
    fontSize: rf(3.6),
    color: '#111827',
    marginBottom: hp(2.4),
  },
  sheetPrimaryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(8),
    borderRadius: wp(3),
    minWidth: wp(22),
    alignItems: 'center',
  },
  sheetPrimaryBtnText: {
    color: '#fff',
    fontSize: rf(3.8),
    fontWeight: '700',
  },
});
