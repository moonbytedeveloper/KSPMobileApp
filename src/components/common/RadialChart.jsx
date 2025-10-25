import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Text } from 'react-native-svg';

const RadialChart = ({ 
  data = [], 
  size = 200, 
  strokeWidth = 8, 
  gap = 2,
  colors = ['#4CAF50', '#FF9800', '#4C9DFF', '#9C27B0', '#FF5722'],
  showLabels = true,
  animationDuration = 1000
}) => {
  const center = size / 2;
  const padding = strokeWidth + gap;
  
  // Calculate percentages if raw values are provided
  const calculatePercentages = (data) => {
    try {
      if (!data || data.length === 0) return [];
      
      // Check if data already has percentages
      const hasPercentages = data.some(item => 
        item && typeof item.percentage === 'number' && item.percentage <= 100
      );
      
      if (hasPercentages) {
        return data.map((item, index) => ({
          ...item,
          radius: center - padding - (strokeWidth + gap) * (data.length - index - 1),
          color: item.color || colors[index % colors.length],
          label: item.label || `Item ${index + 1}`
        }));
      }
      
      // Calculate percentages from raw values
      const total = data.reduce((sum, item) => {
        if (!item) return sum;
        return sum + (item.value || item.percentage || 0);
      }, 0);
      
      if (total === 0) {
        // When total is 0, show all rings with equal small percentages for visibility
        const equalPercentage = Math.max(5, 100 / data.length); // Minimum 5% or equal distribution
        return data.map((item, index) => ({
          ...item,
          percentage: equalPercentage,
          radius: center - padding - (strokeWidth + gap) * (data.length - index - 1),
          color: item.color || colors[index % colors.length],
          label: item.label || `Item ${index + 1}`
        }));
      }
      
      return data.map((item, index) => {
        const value = item.value || item.percentage || 0;
        const calculatedPercentage = Math.round((value / total) * 100);
        // Give minimum 2% visibility to items with 0 values so they still show as thin rings
        const finalPercentage = value === 0 ? 2 : calculatedPercentage;
        
        return {
          ...item,
          percentage: finalPercentage,
          radius: center - padding - (strokeWidth + gap) * (data.length - index - 1),
          color: item.color || colors[index % colors.length],
          label: item.label || `Item ${index + 1}`
        };
      });
    } catch (error) {
      console.error('RadialChart calculatePercentages error:', error);
      return [];
    }
  };
  
  const rings = calculatePercentages(data);

  const circumference = (radius) => 2 * Math.PI * radius;
  const strokeDasharray = (radius, percentage) => {
    const circ = circumference(radius);
    const strokeLength = (circ * percentage) / 100;
    return `${strokeLength} ${circ}`;
  };

  // If no data, show empty chart
  if (!rings || rings.length === 0) {
    return (
      <Svg width={size} height={size} style={styles.radialChart}>
        <Circle
          cx={center}
          cy={center}
          r={center - padding}
          stroke="#E0E0E0"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {showLabels && (
          <Text
            x={center}
            y={center}
            textAnchor="middle"
            fontSize="12"
            fill="#999"
          >
            No Data
          </Text>
        )}
      </Svg>
    );
  }

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
      
      {/* Center text showing total */}
      {showLabels && (
        <>
          <Text
            x={center}
            y={center - 5}
            textAnchor="middle"
            fontSize="12"
            fontWeight="bold"
            fill="#333"
          >
            {rings.reduce((sum, ring) => sum + (ring.value || 0), 0)}
          </Text>
          <Text
            x={center}
            y={center + 10}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            Total
          </Text>
        </>
      )}
    </Svg>
  );
};

const styles = StyleSheet.create({
  radialChart: {
    alignSelf: 'center',
  },
});

export default RadialChart; 