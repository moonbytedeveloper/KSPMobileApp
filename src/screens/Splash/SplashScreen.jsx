import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { wp, hp, rf, safeAreaTop, SCREEN } from "../../utils/responsive";
import { COLORS } from '../../screens/styles/styles';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import Icon from '../../utils/CustomIcon';

const SplashScreen = ({ onFinish }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const float1 = useRef(new Animated.Value(0)).current;
  const float2 = useRef(new Animated.Value(0)).current;
  const float3 = useRef(new Animated.Value(0)).current;
  const float4 = useRef(new Animated.Value(0)).current;
  const float5 = useRef(new Animated.Value(0)).current;
  const float6 = useRef(new Animated.Value(0)).current;
  const float7 = useRef(new Animated.Value(0)).current;
  const float8 = useRef(new Animated.Value(0)).current;
  const floatCenter = useRef(new Animated.Value(0)).current;
  const floatText = useRef(new Animated.Value(0)).current;
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
    // additional business-related icons to reach 20 unique ones
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

  // Fixed, deterministic placement and styling (no session changes)
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
    // Top band
    { topPct: 10, leftPct: 8, size: 34 },
    { topPct: 10, leftPct: 40, size: 32 },
    { topPct: 10, leftPct: 72, size: 34 },
    { topPct: 16, leftPct: 90, size: 32 },

    // Upper-mid band
    { topPct: 26, leftPct: 14, size: 34 },
    { topPct: 26, leftPct: 50, size: 30 },
    { topPct: 26, leftPct: 86, size: 32 },

    // Lower-mid band
    { topPct: 62, leftPct: 12, size: 34 },
    { topPct: 62, leftPct: 50, size: 32 },
    { topPct: 62, leftPct: 88, size: 34 },

    // Bottom band
    { topPct: 82, leftPct: 20, size: 36 },
    { topPct: 82, leftPct: 80, size: 34 },
    
  ];

  if (randomIconsRef.current.length === 0) {
    const fixedIcons = fixedIconPlacements.map((p, i) => {
      const name = fixedBusinessIcons[i % fixedBusinessIcons.length];
      // Determine shade by vertical position (lighter at top, darker at bottom)
      const verticalT = clamp01(p.topPct / 100);
      const jitter = (hashToUnit(`${name}-${i}`) - 0.5) * 0.2; // ±0.1 variance
      const shadeT = clamp01(verticalT + jitter);
      const color = mixColors(COLORS.primaryLight, COLORS.primaryDark, shadeT);
      const opacity = 0.75 + (hashToUnit(`op-${name}-${i}`) * 0.2); // 0.75 - 0.95
      const amplitude = 5 + (i % 6); // subtle, fixed
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
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    startFloating(float1, 0, 2600);
    startFloating(float2, 200, 3000);
    startFloating(float3, 400, 2800);
    startFloating(float4, 600, 3200);
    startFloating(float5, 800, 3000);
    startFloating(float6, 1000, 2800);
    startFloating(float7, 1200, 2600);
    startFloating(float8, 1400, 3200);
    startFloating(floatCenter, 300, 3400);
    startFloating(floatText, 500, 3600);

    // Start floating for random icons
    randomIconsRef.current.forEach(item => {
      startFloating(item.anim, item.delay, item.duration);
    });

    const timer = setTimeout(() => {
      if (typeof onFinish === 'function') {
        onFinish();
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [fadeAnim, onFinish]);

  return (
    <View style={styles.container}>
      <Svg pointerEvents="none" style={StyleSheet.absoluteFillObject}>
        <Defs>
          <LinearGradient id="splashGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <Stop offset="100%" stopColor={COLORS.primaryLight} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#splashGradient)" />
      </Svg>
      {/* --- Centered Logo with Icons Around --- */}
      <View style={styles.centerStage}>
        {/* Random business icons layer */}
        <View style={styles.randomLayer} pointerEvents="none">
          {randomIconsRef.current.map(item => (
            <Animated.View
              key={item.id}
              style={[
                { position: 'absolute', top: hp(item.topPct), left: wp(item.leftPct), opacity: item.opacity },
                getFloatStyle(item.anim, item.amplitude),
              ]}
            >
              <MCIcon name={item.name} size={item.size} color={item.color} />
            </Animated.View>
          ))}
        </View>
        <View style={styles.ring}>
          {/* Center logo */}
          <Animated.View style={[getFloatStyle(floatCenter, 6), styles.centerLogo]}>
            <Icon name="Ksp-logo" size={hp(35)} color={COLORS.primary} style={styles.iconShadow} />
            <Text style={styles.text}>Compliance with Speed !</Text>
          </Animated.View>

          
        </View>

        {/* Text under logo */}
        <Animated.View style={getFloatStyle(floatText, 7)}>
          
        </Animated.View>
        {/* Around icons */}
        <Animated.View style={[getFloatStyle(float1, 8), styles.iconTop]}>
            <MCIcon name="briefcase-variant" size={42} color={COLORS.primary} />
          </Animated.View>
          <Animated.View style={[getFloatStyle(float2, 10), styles.iconTopRight]}>
            <MCIcon name="account-group" size={40} color={COLORS.primary} />
          </Animated.View>
          <Animated.View style={[getFloatStyle(float3, 7), styles.iconRight]}>
            <MCIcon name="chart-line" size={42} color={COLORS.primary} />
          </Animated.View>
          <Animated.View style={[getFloatStyle(float4, 9), styles.iconBottomRight]}>
            <MCIcon name="file-document-outline" size={40} color={COLORS.primary} />
          </Animated.View>
          <Animated.View style={[getFloatStyle(float5, 8), styles.iconBottom]}>
            <MCIcon name="calendar-check" size={42} color={COLORS.primary} />
          </Animated.View>
          <Animated.View style={[getFloatStyle(float6, 6), styles.iconBottomLeft]}>
            <MCIcon name="clock-time-four-outline" size={38} color={COLORS.primaryLight} />
          </Animated.View>
          <Animated.View style={[getFloatStyle(float7, 10), styles.iconLeft]}>
            <MCIcon name="cash-multiple" size={42} color={COLORS.primary} />
          </Animated.View>
          <Animated.View style={[getFloatStyle(float8, 7), styles.iconTopLeft]}>
            <MCIcon name="shield-check-outline" size={40} color={COLORS.primaryLight} />
          </Animated.View>
      </View>
    </View>
  );
};

export default SplashScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffe8d6',
    paddingTop: safeAreaTop, // ✅ handle notch
  },
  centerStage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: wp(90),
    height: wp(90),
    alignItems: 'center',
    justifyContent: 'center',
  },
  randomLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  centerLogo: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconTop: {
    position: 'absolute',
    top: 0,
  },
  iconTopRight: {
    position: 'absolute',
    top: wp(8),
    right: wp(8),
  },
  iconRight: {
    position: 'absolute',
    right: 0,
  },
  iconBottomRight: {
    position: 'absolute',
    bottom: wp(8),
    right: wp(8),
  },
  iconBottom: {
    position: 'absolute',
    bottom: 0,
  },
  iconBottomLeft: {
    position: 'absolute',
    bottom: wp(8),
    left: wp(8),
  },
  iconLeft: {
    position: 'absolute',
    left: 0,
  },
  iconTopLeft: {
    position: 'absolute',
    top: wp(8),
    left: wp(8),
  },
  text: {
    color: 'black',
    fontSize: rf(5.5), // ✅ responsive font
    fontWeight: 'bold',
    //marginTop: hp(0),
  },
  iconShadow: {
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 3, height: 5 },
    textShadowRadius: 6,
  },
  teamwork22: {
    position: 'absolute',

  },
});