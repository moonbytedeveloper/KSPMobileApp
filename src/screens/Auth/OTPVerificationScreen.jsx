import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Keyboard, Animated, Easing, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
//import CustomIcon from '../../utils/CustomIcon';
import { COLORS } from '../styles/styles';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import AppHeader from '../../components/common/AppHeader';
import { verifyCode } from '../../api/authServices';
import Icon from '../../utils/CustomIcon';


const OTPVerificationScreen = ({ navigation, route }) => {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const inputRefs = useRef([]);
  
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

  // Fixed, deterministic placement and styling for OTP screen
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
    // Upper-mid band - around OTP input area
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
      const opacity = 0.6 + (hashToUnit(`op-${name}-${i}`) * 0.25); // 0.6 - 0.85 (more subtle for OTP)
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

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (key, index) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 4) return;
    try {
      const resp = await verifyCode({ email, OtpCode: otpCode });
      console.log('Verify code API data:', resp);
      navigation.navigate('NewPassword', { email });
    } catch (e) {
      const serverData = e?.response?.data;
      const message = typeof serverData === 'string'
        ? serverData
        : (serverData?.message || e?.message || 'Invalid code. Please try again.');
      Alert.alert('Verification failed', message);
    }
  };

  const isOtpComplete = otp.every(digit => digit !== '');

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? safeAreaTop : 0}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="otpGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.primaryLight} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#otpGradient)" />
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

      {/* Code Verification Title */}
      <View style={[
        styles.floatingTitleContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(30) : safeAreaTop + hp(55) }
      ]}>
        <Text style={styles.codeVerificationTitle}>Code Verification</Text>
      </View>

      {/* OTP Input Fields */}
      <View style={[
        styles.otpContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(38) : safeAreaTop + hp(63) }
      ]}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={ref => inputRefs.current[index] = ref}
            style={[
              styles.otpInput,
              digit && styles.otpInputFilled
            ]}
            value={digit}
            onChangeText={(value) => handleOtpChange(value, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            selectTextOnFocus
          />
        ))}
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
            !isOtpComplete && styles.submitButtonDisabled
          ]}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={!isOtpComplete}
        >
          <Text style={[
            styles.submitButtonText,
            !isOtpComplete && styles.submitButtonTextDisabled
          ]}>Submit</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default OTPVerificationScreen;

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
  floatingTitleContainer: {
    position: 'absolute',
    left: wp(5),
    right: wp(5),
    alignItems: 'flex-start',
  },
  logo: {
    // Removed text shadow
  },
  tagline: {
    fontSize: rf(5.4),
    fontWeight: '600',
    color: '#333',
  },
  codeVerificationTitle: {
    fontSize: rf(6),
    fontWeight: '700',
    color: '#333',
    marginBottom: hp(2),
  },
  otpContainer: {
    position: 'absolute',
    left: wp(5),
    right: wp(5),
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: wp(2),
    alignItems: 'center',
    gap: wp(4),
  },
  otpInput: {
    width: wp(12),
    height: wp(12),
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: wp(4),
    backgroundColor: '#fff',
    fontSize: rf(5),
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff5f2',
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
});
