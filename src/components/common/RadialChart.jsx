import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

const RadialChart = ({ 
  data = [], 
  size = 200, 
  strokeWidth = 8, 
  gap = 2,
  colors = ['#FFA500', '#FFB6C1', '#90EE90', '#D3D3D3', '#87CEEB'],
  percentages = [45, 65, 75, 90, 95]
}) => {
  const center = size / 2;
  const padding = strokeWidth + gap; // Add padding to prevent cutting
  
  // Calculate radius for each ring - ensure all rings fit within bounds
  const rings = data.length > 0 ? data.map((item, index) => ({
    radius: center - padding - (strokeWidth + gap) * (data.length - index - 1),
    color: item.color || colors[index % colors.length],
    percentage: item.percentage || percentages[index % percentages.length],
    label: item.label || `Ring ${index + 1}`
  })) : colors.map((color, index) => ({
    radius: center - padding - (strokeWidth + gap) * (colors.length - index - 1),
    color: color,
    percentage: percentages[index],
    label: `Ring ${index + 1}`
  }));

  const circumference = (radius) => 2 * Math.PI * radius;
  const strokeDasharray = (radius, percentage) => {
    const circ = circumference(radius);
    const strokeLength = (circ * percentage) / 100;
    return `${strokeLength} ${circ}`;
  };

  return (
    <Svg width={size} height={size} style={styles.radialChart}>
      {/* Base rings (gray background) */}
      {rings.map((ring, index) => (
        <Circle
          key={`base-${index}`}
          cx={center}
          cy={center}
          r={ring.radius}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
      ))}
      
      {/* Colored progress rings */}
      {rings.map((ring, index) => (
        <Circle
          key={`progress-${index}`}
          cx={center}
          cy={center}
          r={ring.radius}
          stroke={ring.color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray(ring.radius, ring.percentage)}
          strokeDashoffset={circumference(ring.radius) * 0.25}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
      ))}
    </Svg>
  );
};

const styles = StyleSheet.create({
  radialChart: {
    alignSelf: 'center',
  },
});

export default RadialChart; 