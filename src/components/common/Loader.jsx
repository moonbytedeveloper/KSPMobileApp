import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { COLORS } from '../../screens/styles/styles';

const Gear = ({ size = 40, color = COLORS.primary, delay = 0, reverse = false, toothCount = 16 }) => {
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spin = () => {
      spinValue.setValue(0);
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        delay: delay,
      }).start(() => spin());
    };
    spin();
  }, [spinValue, delay]);

  const rotate = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: reverse ? ['0deg', '-360deg'] : ['0deg', '360deg'],
  });

  // Create gear path with traditional mechanical gear teeth
  const createGearPath = (radius, toothCount) => {
    const centerX = size / 2;
    const centerY = size / 2;
    const innerRadius = radius * 0.7;
    const outerRadius = radius * 0.9;
    const toothDepth = radius * 0.1;
    const toothAngle = 360 / toothCount;
    const toothWidth = toothAngle * 0.6; // 60% of tooth spacing for broader teeth
    
    let path = '';
    const points = [];
    
    // Generate all points for the gear
    for (let i = 0; i < toothCount; i++) {
      const baseAngle = (i * toothAngle) * Math.PI / 180;
      const toothStartAngle = baseAngle - (toothWidth * Math.PI / 180) / 2;
      const toothEndAngle = baseAngle + (toothWidth * Math.PI / 180) / 2;
      
      // Inner radius point (start of tooth valley)
      const innerX = centerX + innerRadius * Math.cos(toothStartAngle);
      const innerY = centerY + innerRadius * Math.sin(toothStartAngle);
      
      // Outer radius point (start of tooth) - straight up from inner
      const outerStartX = centerX + outerRadius * Math.cos(toothStartAngle);
      const outerStartY = centerY + outerRadius * Math.sin(toothStartAngle);
      
      // Tooth peak - flat top
      const peakX = centerX + (outerRadius + toothDepth) * Math.cos(baseAngle);
      const peakY = centerY + (outerRadius + toothDepth) * Math.sin(baseAngle);
      
      // Outer radius point (end of tooth) - straight down to inner
      const outerEndX = centerX + outerRadius * Math.cos(toothEndAngle);
      const outerEndY = centerY + outerRadius * Math.sin(toothEndAngle);
      
      // Inner radius point (end of tooth valley)
      const innerEndX = centerX + innerRadius * Math.cos(toothEndAngle);
      const innerEndY = centerY + innerRadius * Math.sin(toothEndAngle);
      
      points.push(
        { x: innerX, y: innerY },
        { x: outerStartX, y: outerStartY },
        { x: peakX, y: peakY },
        { x: outerEndX, y: outerEndY },
        { x: innerEndX, y: innerEndY }
      );
    }
    
    // Build the path
    if (points.length > 0) {
      path = `M ${points[0].x} ${points[0].y}`;
      
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
      
      // Close the path
      path += ' Z';
    }
    
    return path;
  };

  const gearPath = createGearPath(size / 2, toothCount);

  return (
    <Animated.View
      style={[
        styles.gear,
        {
          width: size,
          height: size,
          transform: [{ rotate }],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <G>
          {/* Main gear body */}
          <Path
            d={gearPath}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
          
          {/* Center hole */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.2}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />
        </G>
      </Svg>
    </Animated.View>
  );
};

const Loader = ({ size = 'large', color = COLORS.primary, style }) => {
  const gearSize = size === 'large' ? 80 : size === 'small' ? 50 : 60;
  const smallGearSize = gearSize * 0.7;
  
  return (
    <View style={[styles.container, style]}>
      <View style={styles.gearContainer}>
        <Gear size={gearSize} color={color} delay={0} toothCount={10} />
        <Gear size={smallGearSize} color={color} delay={0} reverse={true} toothCount={8} />
      </View>
    </View>
  );
};

export default Loader;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  gearContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0, // Minimal gap so gears mesh together properly
  },
  gear: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});


