import React from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

// Renders a single-radius donut chart with multiple colored arc segments
// segments: [{ value: number, color: string }]
const DonutChart = ({ 
  size = 160, 
  strokeWidth = 16, 
  segments = [], 
  backgroundColor = '#f0f0f0',
  gapDegrees = 4, // small separator gaps between segments
  startAngle = -90, // top start
}) => {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;

  const total = Math.max(segments.reduce((sum, s) => sum + (s.value || 0), 0), 1);

  const gapFraction = (gapDegrees / 360);
  const totalGaps = Math.max(segments.length, 0) * gapFraction; // total fraction reserved for gaps
  // Scale factor so real data fits into remaining circumference (1 - gaps)
  const arcScale = Math.max(1 - totalGaps, 0.0001);

  let cumulativeFraction = 0; // cumulative fraction including gaps

  return (
    <Svg width={size} height={size} style={styles.root}>
      <Circle
        cx={center}
        cy={center}
        r={radius}
        stroke={backgroundColor}
        strokeWidth={strokeWidth}
        fill="transparent"
      />
      {segments.map((seg, idx) => {
        const dataPortion = (seg.value || 0) / total;
        const portion = dataPortion * arcScale; // shrink to leave gaps
        const length = portion * circumference;
        const offset = circumference * (1 - cumulativeFraction) + (startAngle / 360) * circumference;
        // advance cumulative by this arc + one gap
        cumulativeFraction += portion + gapFraction;
        return (
          <Circle
            key={`seg-${idx}`}
            cx={center}
            cy={center}
            r={radius}
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${length} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(0 ${center} ${center})`}
            fill="transparent"
          />
        );
      })}
    </Svg>
  );
};

export default DonutChart;

const styles = StyleSheet.create({
  root: {
    alignSelf: 'center',
  },
});


