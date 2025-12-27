import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, Keyboard, Animated, Easing } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import Icon from '../../utils/CustomIcon';
import { login } from '../../api/authServices';
import { Alert } from 'react-native';
import { useUser } from '../../contexts/UserContext';
import { kspAuth } from '../../api/authServices';

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { setIsAuthenticated, setUserRole, setUserData, checkAuthStatus } = useUser();
  
  // Bottom sheet ref
  const bottomSheetRef = useRef(null);
  const snapPoints = ['33%', '40%'];
  useEffect(() => {
    kspAuth();
  }, []);

  const showError = (message) => {
    setErrorMessage(message);
    bottomSheetRef.current?.present();
  };
  // Animation refs for floating icons
  const randomIconsRef = useRef([]);

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

  // Fixed, deterministic placement and styling for login screen
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
    // Upper-mid band - around username area
    { topPct: 35, leftPct: 14, size: 28 },
    { topPct: 15, leftPct: 20, size: 24 },
    { topPct: 35, leftPct: 86, size: 26 },

    // Lower-mid band - around password area
    { topPct: 50, leftPct: 12, size: 28 },
   { topPct: 60, leftPct: 98, size: 26 },
    { topPct: 50, leftPct: 88, size: 28 },

    // Bottom band - around login button area
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
      const opacity = 0.6 + (hashToUnit(`op-${name}-${i}`) * 0.25); // 0.6 - 0.85 (more subtle for login)
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

  return (
    <KeyboardAvoidingView
      style={styles.wrapper}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? safeAreaTop : 0}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="loginGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.primaryLight} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#loginGradient)" />
      </Svg>
      
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

      {/* Floating Username Input */}
      <View style={[
        styles.floatingInputContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(30) : safeAreaTop + hp(55) }
      ]}>
        <Ionicons name="person" size={rf(5)} color="#666" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Username"
          placeholderTextColor="#999"
          value={username}
          onChangeText={setUsername}
          returnKeyType="next"
          autoCapitalize="none"
        />
      </View>

      {/* Floating Password Input */}
      <View style={[
        styles.floatingInputContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(38) : safeAreaTop + hp(63) }
      ]}>
        <Ionicons name="lock-closed" size={rf(5)} color="#666" style={styles.icon} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          returnKeyType="done"
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={rf(5)} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Floating Forgot Password */}
      <View style={[
        styles.floatingForgotContainer,
        { top: isKeyboardOpen ? safeAreaTop + hp(46) : safeAreaTop + hp(71) }
      ]}>
        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
      
      {/* Floating Login Button */}
      <View style={[
        styles.floatingButtonContainer,
        { 
          bottom: isKeyboardOpen 
            ? (Platform.OS === 'ios' ? hp(40) : hp(4))
            : hp(4)
        }
      ]}>
        <TouchableOpacity
          style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
          activeOpacity={0.85}
          disabled={isLoading}
          onPress={async () => {
            try {
              if (!username || !password) {
                showError('Please enter username and password');
                return;
              }
              
              setIsLoading(true);
              console.log('[LOGIN] Attempting login for:', username);
              const user = await login({ username, password });
              console.log('[LOGIN] Response received:', JSON.stringify(user, null, 2));
              
              // Update authentication context
              setIsAuthenticated(true);
              
              // Set user data
              if (user?.Data) {
                setUserData({
                  uuid: user.Data.UUID,
                  roles: user.Data.Roles,
                  designation: user.Data.Designation,
                });
              }
              // Reload stored auth/env data so dashboards get allowed/selected environment immediately
              try { await checkAuthStatus(); } catch (_e) {}
              
              // Determine user role and navigate — scan all roles for admin flags
              const roles = user?.Data?.Roles || [];
              const isSuperAdmin = Array.isArray(roles) && roles.some(r => {
                const name = (r?.UserRoleName || r?.RoleName || r?.roleName || r?.name || '').toString().toLowerCase();
                return ['super admin', 'super_admin', 'superadmin'].includes(name);
              });
              console.log('[LOGIN] Roles array:', roles);
              console.log('[LOGIN] isSuperAdmin:', isSuperAdmin);

              if (isSuperAdmin) {
                setUserRole('admin');
                navigation.replace('AdminDashboard');
              } else {
                setUserRole('employee');
                navigation.replace('Main');
              }
            } catch (e) {
              console.log('[LOGIN] Error:', e?.response?.data || e.message);
              let errorMsg = 'Login failed. Please try again.';
              
              if (e?.response?.data?.message) {
                errorMsg = e.response.data.message;
              } else if (e?.response?.data?.Message) {
                errorMsg = e.response.data.Message;
              } else if (e?.message) {
                errorMsg = e.message;
              }
              
              showError(errorMsg);
            } finally {
              setIsLoading(false);
            }
          }}
        >
          <Text style={styles.loginButtonText}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        handleIndicatorStyle={styles.bottomSheetHandle}
        handleStyle={{ backgroundColor: 'transparent' }}
        backgroundStyle={styles.bottomSheetBackground}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
        )}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.errorContainer}>
            <View style={styles.errorIconContainer}>
              <Ionicons name="warning" size={rf(8)} color="#ef4444" />
            </View>
            <Text style={styles.errorTitle}>Login Error</Text>
            <Text style={styles.errorMessage}>{errorMessage}</Text>
            <TouchableOpacity 
              style={styles.errorButton}
              onPress={() => bottomSheetRef.current?.dismiss()}
              activeOpacity={0.8}
            >
              <Text style={styles.errorButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

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
  floatingForgotContainer: {
    position: 'absolute',
    right: wp(5),
    alignItems: 'flex-end',
  },
  forgotText: {
    color: '#000',
    fontSize: rf(3.8),
  },
  floatingButtonContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: wp(5),
    backgroundColor: 'transparent',
  },
  loginButton: {
    width: '100%',
    height: hp(6.8),
    backgroundColor: COLORS.primary,
    borderRadius: wp(3),
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: rf(5.2),
    fontWeight: '600',
  },
  loginButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  // Bottom Sheet Styles
  bottomSheetHandle: {
    alignSelf: 'center',
    width: wp(18),
    height: hp(0.7),
    backgroundColor: '#2e2e2e',
    borderRadius: hp(0.6),
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  bottomSheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  bottomSheetContent: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(6),
    paddingBottom: hp(2.5),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  errorIconContainer: {
    marginBottom: hp(2),
  },
  errorTitle: {
    fontSize: rf(5),
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    marginBottom: hp(1),
  },
  errorMessage: {
    fontSize: rf(4),
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    textAlign: 'center',
    lineHeight: rf(5.5),
    marginBottom: hp(3),
    paddingHorizontal: wp(2),
  },
  errorButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: wp(8),
    paddingVertical: hp(1.5),
    borderRadius: wp(3),
    minWidth: wp(30),
    alignItems: 'center',
  },
  errorButtonText: {
    color: '#fff',
    fontSize: rf(4.2),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
}); 