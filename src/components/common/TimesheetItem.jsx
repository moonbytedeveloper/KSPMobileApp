import React, { useMemo, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { rf, wp, hp } from '../../utils/responsive';

const statusStyleMap = {
  Pending: { fg: '#92400e', bg: '#fef3c7' },
  Approved: { fg: '#065f46', bg: '#d1fae5' },
  Rejected: { fg: '#991b1b', bg: '#fee2e2' },
  Submitted: { fg: '#1e3a8a', bg: '#dbeafe' },
};

const Chevron = ({ rotated }) => (
  <Svg width={rf(4.5)} height={rf(4.5)} viewBox="0 0 16 16" fill="#64748b" style={{ transform: [{ rotate: rotated ? '180deg' : '0deg' }] }}>
    <Path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z" />
  </Svg>
);

const Dot = ({ color }) => (
  <View style={[styles.dot, { backgroundColor: color }]} />
);

const parseDateSafe = (maybeDate) => {
  try {
    // Expecting 'yyyy-mm-dd'. If not, Date may still parse; otherwise fallback
    const d = new Date(maybeDate);
    if (!isNaN(d.getTime())) return d;
    return null;
  } catch (_) {
    return null;
  }
};

const formatDayLabel = (date) => {
  const d = new Date(date);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const wk = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()];
  return `${wk}\n(${dd}/${mm})`;
};

// Build a user-friendly formatter for HH:MM while typing
const formatDisplayTime = (text) => {
  // Return empty string if input is empty
  if (!text || text.trim() === '') return '';
  
  const digits = String(text).replace(/\D/g, '').slice(0, 4);
  
  // Don't auto-format while typing, let user type freely
  if (digits.length <= 2) {
    return digits;
  }
  
  // Only format when we have 3+ digits, add colon after 2nd digit
  if (digits.length === 3) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  
  // Format as HH:MM when we have 4 digits
  if (digits.length === 4) {
    return `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  
  return text;
};

const parseDisplayToHhMm = (text) => {
  if (!text) return { h: 0, m: 0 };
  const match = String(text).match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (!match) return { h: 0, m: 0 };
  let h = Math.max(0, parseInt(match[1] || '0', 10) || 0);
  let m = Math.max(0, parseInt(match[2] || '0', 10) || 0);
  
  // Limit hours to maximum 23
  if (h > 23) h = 23;
  // Cap minutes at 60
  if (m > 60) m = 59;
  
  return { h, m };
};

const sumHhMm = (records) => {
  const totalMin = Object.values(records).reduce((acc, v) => {
    const { h, m } = parseDisplayToHhMm(v);
    return acc + h * 60 + m;
  }, 0);
  const hh = String(Math.floor(totalMin / 60)).padStart(2, '0');
  const mm = String(totalMin % 60).padStart(2, '0');
  return `${hh}:${mm}`;
};

const TimesheetItem = ({ item, isActive, onToggle, onSave, onDelete, onDayHoursFilled, isSelectionMode, isSelected, onLongPress, onSelect, leaveData = [] }) => {
  const statusStyles = statusStyleMap[item.status] || statusStyleMap.Pending;
  const [isEditing, setIsEditing] = useState(false);
  const from = parseDateSafe(item.fromDate);
  const to = parseDateSafe(item.toDate);

  const daysInRange = useMemo(() => {
    if (!from || !to) return [];
    const list = [];
    const cur = new Date(from);
    while (cur <= to) {
      list.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
      if (list.length > 31) break; // safety guard
    }
    return list;
  }, [from, to]);

  const initialDayMap = useMemo(() => {
    const base = {};
    daysInRange.forEach((d) => {
      const key = d.toISOString().slice(0, 10);
      base[key] = '';
    });
    return base;
  }, [daysInRange]);

  const [perDayHours, setPerDayHours] = useState(initialDayMap);
  const computedTotal = useMemo(() => sumHhMm(perDayHours), [perDayHours]);

  // Function to check if a date is a leave day
  const isLeaveDay = (date) => {
    if (!leaveData || leaveData.length === 0) return false;
    const dateStr = date.toISOString().slice(0, 10);
    const isLeave = leaveData.some(leave => {
      const leaveDate = leave.LeaveDate;
      if (!leaveDate) return false;
      // Handle both date formats: '2025-10-15T00:00:00' and '2025-10-15'
      const leaveDateStr = leaveDate.includes('T') ? leaveDate.split('T')[0] : leaveDate;
      return leaveDateStr === dateStr;
    });
    
    // Debug logging for leave day detection
    if (isLeave) {
      console.log('🏖️ [TimesheetItem] Leave day detected:', {
        date: dateStr,
        leaveData: leaveData.map(l => ({ date: l.LeaveDate, weekday: l.WeekdayName }))
      });
    }
    
    return isLeave;
  };

  // Initialize perDayHours with line data when available (only once)
  useEffect(() => {
    if (item.lines && item.lines.length > 0) {
      const lineDataMap = {};
      item.lines.forEach(line => {
        const lineDate = line.Date_of_Task || line.Date;
        if (lineDate) {
          const dateStr = lineDate.includes('T') ? lineDate.split('T')[0] : lineDate;
          // Only set hours if they exist and are not '00:00'
          if (line.Hours && line.Hours !== '00:00') {
            lineDataMap[dateStr] = line.Hours;
          }
        }
      });
      
      // Only initialize if perDayHours is empty (first time)
      setPerDayHours(prev => {
        const hasAnyData = Object.values(prev).some(val => val && val.trim() !== '');
        if (hasAnyData) {
          // Don't override user input
          return prev;
        }
        return {
          ...prev,
          ...lineDataMap
        };
      });
    }
  }, [item.lines]);

  // Delete is handled by the screen via a bottom sheet

  return (
    <View style={[styles.container, isSelected && styles.selectedContainer]}>
      <TouchableOpacity 
        onPress={isSelectionMode ? onSelect : onToggle} 
        onLongPress={onLongPress}
        style={[styles.header, isSelected && styles.selectedHeader]} 
        activeOpacity={0.85}
      >
        <View style={styles.headerLeft}>
          {isSelectionMode && (
            <View style={[styles.selectionIndicator, isSelected && styles.selectedIndicator]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          )}
          {!isSelectionMode && <Dot color={statusStyles.fg} />}
          <View style={{ maxWidth: wp(52) }}>
            <Text style={styles.headerLabel}>Project Task</Text>
            <Text style={styles.headerValue} numberOfLines={isActive ? undefined : 1}>{item.taskName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.headerLabel}>Total Hours</Text>
            <Text style={styles.headerValue}>{computedTotal || item.totalHours}</Text>
          </View>
          {!isSelectionMode && <Chevron rotated={isActive} />}
        </View>
      </TouchableOpacity>

      {isActive && (
        <View style={styles.body}>
          <View style={styles.row}> 
            <Text style={styles.rowLabel}>From</Text>
            <Text style={styles.rowValue}>{item.fromDate}</Text>
          </View>
          <View style={styles.row}> 
            <Text style={styles.rowLabel}>To</Text>
            <Text style={styles.rowValue}>{item.toDate}</Text>
          </View>
          <View style={styles.row}> 
            <Text style={styles.rowLabel}>Status</Text>
            <Text style={[styles.statusPill, { color: statusStyles.fg, backgroundColor: statusStyles.bg }]}>{item.status}</Text>
          </View>

          <View style={styles.separator} />

          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.buttonPositive}
              onPress={() => {
                if (isEditing) {
                  setIsEditing(false);
                  onSave && onSave(item.id, perDayHours, computedTotal);
                } else {
                  setIsEditing(true);
                }
              }}
            >
              <Text style={styles.buttonPositiveText}>{isEditing ? 'Save' : 'Edit'}</Text>
            </TouchableOpacity>
            {!!onDelete && (
              <TouchableOpacity style={styles.buttonNegative} onPress={() => onDelete && onDelete(item.id)}>
                <Text style={styles.buttonNegativeText}>Delete</Text>
              </TouchableOpacity>
            )}
          </View>

          {daysInRange.length > 0 && (
            <View style={{ marginTop: hp(1) }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {daysInRange.map((d) => {
                  const key = d.toISOString().slice(0, 10);
                  const val = perDayHours[key] ?? '';
                  const isLeave = isLeaveDay(d);
                  
                  // Find line data for this date
                  const lineData = item.lines?.find(line => {
                    // Handle both date formats: '2025-09-29' and '2025-09-29T00:00:00'
                    const lineDate = line.Date_of_Task || line.Date;
                    if (!lineDate) return false;
                    const dateStr = lineDate.includes('T') ? lineDate.split('T')[0] : lineDate;
                    return dateStr === key;
                  });
                  
                  return (
                    <View key={key} style={[styles.dayCell, isLeave && styles.leaveDayCell]}>
                      <Text style={[styles.dayLabel, isLeave && styles.leaveDayLabel]}>{formatDayLabel(d)}</Text>
                      {isLeave ? (
                        <View style={styles.leaveDayContainer}>
                          <Text style={styles.leaveDayText}>Leave</Text>
                        </View>
                      ) : isEditing ? (
                        <TextInput
                          value={val}
                          onChangeText={(t) => {
                            // Allow empty input - don't format if empty
                            const v = t.trim() === '' ? '' : formatDisplayTime(t);
                            setPerDayHours((prev) => {
                              const next = { ...prev, [key]: v };
                              // Trigger as soon as HH:MM is complete to support iOS where onBlur may not fire
                              if (
                                onDayHoursFilled &&
                                v && v.length === 5 && /\d{2}:\d{2}/.test(v) &&
                                (prev[key] || '') !== v
                              ) {
                                onDayHoursFilled(item.id, key, v);
                              }
                              return next;
                            });
                          }}
                          editable={isEditing}
                          keyboardType="number-pad"
                          style={styles.hoursInput}
                          placeholder="HH:MM"
                          placeholderTextColor="#9ca3af"
                          onBlur={() => {
                            const current = perDayHours[key];
                            if (current && current.trim() !== '') {
                              // Validate hours and minutes
                              const match = current.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
                              if (match) {
                                let hours = parseInt(match[1], 10) || 0;
                                let minutes = parseInt(match[2] || '0', 10) || 0;
                                
                                // Cap minutes at 60
                                if (minutes > 60) {
                                  minutes = 60;
                                }
                                
                                // Cap at 23:60 if exceeds
                                let validHours = hours;
                                let validMinutes = minutes;
                                
                                if (hours > 23) {
                                  validHours = 23;
                                  validMinutes = 60;
                                } else if (hours === 23 && minutes > 60) {
                                  validMinutes = 60;
                                }
                                
                                const correctedTime = `${String(validHours).padStart(2, '0')}:${String(validMinutes).padStart(2, '0')}`;
                                
                                // Update with corrected time if needed
                                if (correctedTime !== current) {
                                  setPerDayHours(prev => ({
                                    ...prev,
                                    [key]: correctedTime
                                  }));
                                }
                                
                                if (onDayHoursFilled) {
                                  onDayHoursFilled(item.id, key, correctedTime);
                                }
                              } else if (onDayHoursFilled) {
                                onDayHoursFilled(item.id, key, current);
                              }
                            }
                          }}
                        />
                      ) : (
                        <View style={styles.hoursDisplayContainer}>
                          <Text style={styles.hoursDisplay}>
                            {val || lineData?.Hours || '00:00'}
                          </Text>
                          {lineData?.Remark ? (
                            <Text style={styles.descriptionDisplay} numberOfLines={2}>
                              {lineData.Remark}
                            </Text>
                          ) : null}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
              <View style={{ alignItems: 'flex-end', marginTop: hp(1) }}>
                <Text style={styles.totalText}>
                  Total: {isEditing ? computedTotal : item.totalHours}
                </Text>
              </View>
            </View>
          )}

          {/* Inline confirmation removed; screen shows a single bottom sheet */}
        </View>
      )}
    </View>
  );
};

export default TimesheetItem;

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8fafc',
    borderRadius: wp(3),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(0.2) },
    shadowOpacity: 0.1,
    shadowRadius: hp(0.4),
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor:'#eee',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: hp(2),
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  dot: {
    width: wp(4.5),
    height: wp(4.5),
    borderRadius: wp(2.25),
    marginRight: wp(2),
  },
  headerLabel: {
    fontSize: rf(3),
    fontWeight: '500',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  headerValue: {
    fontSize: rf(3.5),
    fontWeight: '600',
    color: '#334155',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  dayCell: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: wp(2),
    padding: wp(2),
    marginRight: wp(2),
    width: wp(22),
  },
  dayLabel: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: rf(2.6),
    marginBottom: hp(0.6),
  },
  hoursInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: wp(2),
    paddingVertical: hp(0.8),
    textAlign: 'center',
    fontSize: rf(3.2),
    color: '#111827',
  },
  totalText: {
    fontSize: rf(3.2),
    fontWeight: '700',
    color: '#111827',
  },
  body: {
    padding: hp(2),
    backgroundColor: '#f8fafc',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.3),
  },
  rowLabel: {
    fontSize: rf(3),
    fontWeight: '500',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  rowValue: {
    fontSize: rf(3.5),
    fontWeight: '600',
    color: '#334155',
    textAlign: 'right',
    maxWidth: '70%'
  },
  statusPill: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(5),
    fontSize: rf(3),
    fontWeight: '600',
  },
  separator: {
    borderBottomColor: '#e2e8f0',
    borderBottomWidth: hp(0.3),
    marginVertical: hp(0.7),
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(1.5),
    marginHorizontal: -wp(1.2),
  },
  buttonNeutral: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#c8c811ff',
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPositive: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#07b807ff',
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonNegative: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#FF0000',
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonNeutralText: {
    color: '#c8c811ff',
    fontSize: rf(3),
    fontWeight: '800',
    textAlign: 'center'
  },
  buttonPositiveText: {
    color: '#07b807ff',
    fontSize: rf(3),
    fontWeight: '600',
    textAlign: 'center'
  },
  buttonNegativeText: {
    color: '#FF0000',
    fontSize: rf(3),
    fontWeight: '600',
    textAlign: 'center'
  },
  inlineConfirm: {
    marginTop: hp(1.5),
    padding: hp(1.2),
    backgroundColor: '#fff7ed',
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: '#fed7aa',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  confirmText: {
    color: '#7c2d12',
    fontSize: rf(2.8),
    fontWeight: '500',
  },
  smallPill: {
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(5),
    marginLeft: wp(2),
  },
  smallPillText: {
    fontSize: rf(2.6),
    fontWeight: '600',
  },
  hoursDisplayContainer: {
    alignItems: 'center',
  },
  hoursDisplay: {
    fontSize: rf(3.2),
    fontWeight: '700',
    color: '#059669',
    backgroundColor: '#d1fae5',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.3),
    borderRadius: wp(1.5),
    marginBottom: hp(0.5),
  },
  descriptionDisplay: {
    fontSize: rf(2.2),
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: rf(2.6),
  },
  selectedContainer: {
    borderColor: '#3b82f6',
    borderWidth: 2,
    backgroundColor: '#eff6ff',
  },
  selectedHeader: {
    backgroundColor: '#dbeafe',
  },
  selectionIndicator: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  selectedIndicator: {
    borderColor: '#3b82f6',
    backgroundColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: rf(3),
    fontWeight: 'bold',
  },
  leaveDayCell: {
    backgroundColor: '#fef3c7',
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  leaveDayLabel: {
    color: '#92400e',
    fontWeight: '600',
  },
  leaveDayContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.8),
    backgroundColor: '#fbbf24',
    borderRadius: wp(2),
  },
  leaveDayText: {
    fontSize: rf(2.8),
    fontWeight: '700',
    color: '#92400e',
    textAlign: 'center',
  },
}); 