import React, { useState, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../screens/styles/styles';

// Custom Date Picker Component
const CustomDatePicker = ({ selectedDate, onDateSelect, onClose, mondayOnly = false, minDate = null }) => {
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const isSelectedDate = (day) => {
    if (!day) return false;
    const date = new Date(currentYear, currentMonth, day);
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (day) => {
    if (!day) return false;
    const today = new Date();
    const date = new Date(currentYear, currentMonth, day);
    return date.toDateString() === today.toDateString();
  };

  const isMonday = (day) => {
    if (!day) return false;
    const date = new Date(currentYear, currentMonth, day);
    return date.getDay() === 1; // 1 = Monday
  };

  const isDisabled = (day) => {
    if (!day) return true;
    if (mondayOnly) {
      return !isMonday(day);
    }
    // Disable dates before minDate (start of day)
    if (minDate) {
      try {
        const base = new Date(minDate);
        const baseStart = new Date(base.getFullYear(), base.getMonth(), base.getDate());
        const date = new Date(currentYear, currentMonth, day);
        const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        if (dateStart < baseStart) return true;
      } catch (_) {}
    }
    return false;
  };

  const handleDateSelect = (day) => {
    if (day && !isDisabled(day)) {
      const newDate = new Date(currentYear, currentMonth, day);
      onDateSelect(newDate);
    }
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 0) {
        setCurrentMonth(11);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 11) {
        setCurrentMonth(0);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.customDatePicker}>
      {/* Header */}
      <View style={styles.datePickerHeader}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
          <Icon name="chevron-left" size={rf(4)} color={COLORS.primary} />
        </TouchableOpacity>
        
        <View style={styles.monthYearContainer}>
          <Text style={styles.monthYearText}>
            {months[currentMonth]} {currentYear}
          </Text>
        </View>
        
        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
          <Icon name="chevron-right" size={rf(4)} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Week Days Header */}
      <View style={styles.weekDaysContainer}>
        {weekDays.map((day, index) => (
          <Text key={index} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.dayCell,
              day && isSelectedDate(day) && styles.selectedDayCell,
              day && isToday(day) && !isSelectedDate(day) && styles.todayCell,
              day && isDisabled(day) && styles.disabledDayCell,
            ]}
            onPress={() => handleDateSelect(day)}
            disabled={!day || isDisabled(day)}
          >
            {day && (
              <Text style={[
                styles.dayText,
                isSelectedDate(day) && styles.selectedDayText,
                isToday(day) && !isSelectedDate(day) && styles.todayText,
                isDisabled(day) && styles.disabledDayText,
              ]}>
                {day}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

// Main Date Picker Bottom Sheet Component
const DatePickerBottomSheet = ({ 
  isVisible, 
  onClose, 
  selectedDate, 
  onDateSelect, 
  title = "Select Date",
  mondayOnly = false,
  minDate = null
}) => {
  const sheetRef = useRef(null);
  const snapPoints = useMemo(() => [hp(65)], []);

  React.useEffect(() => {
    if (isVisible) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [isVisible]);

  const handleDateSelect = (date) => {
    onDateSelect(date);
    onClose();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableContentPanningGesture={false}
      onDismiss={onClose}
      handleIndicatorStyle={styles.bsHandle}
      handleStyle={{ backgroundColor: 'transparent' }}
      backgroundStyle={styles.bsBackground}
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
      )}
    >
      <BottomSheetView style={styles.bsContent}>
        <View style={styles.bsHeaderRow}>
          <Text style={styles.bsTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.8}>
            <Icon name="close" size={rf(4)} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <CustomDatePicker
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onClose={onClose}
          mondayOnly={mondayOnly}
          minDate={minDate}
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
};

export default DatePickerBottomSheet;

const styles = StyleSheet.create({
  // Bottom Sheet Styles
  bsHandle: {
    alignSelf: 'center',
    width: wp(18),
    height: hp(0.7),
    backgroundColor: '#2e2e2e',
    borderRadius: hp(0.6),
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  bsBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  bsContent: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(6),
    paddingBottom: hp(2.5),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
    flex: 1,
  },
  bsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
    marginTop: hp(0.5),
  },
  bsTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },

  // Custom Date Picker Styles
  customDatePicker: {
    flex: 1,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(2),
    paddingHorizontal: wp(2),
  },
  navButton: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: COLORS.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearContainer: {
    flex: 1,
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: rf(4.5),
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    marginBottom: hp(1),
    paddingHorizontal: wp(1),
  },
  weekDayText: {
    width: '14.2857%',
    textAlign: 'center',
    fontSize: rf(3.2),
    fontWeight: '600',
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    paddingVertical: hp(0.8),
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(1),
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: hp(0.3),
    borderRadius: wp(6.25),
  },
  selectedDayCell: {
    backgroundColor: COLORS.primary,
    borderRadius: wp(6.25),
  },
  todayCell: {
    backgroundColor: COLORS.primary + '20',
    borderRadius: wp(6.25),
  },
  dayText: {
    fontSize: rf(3.6),
    fontWeight: '500',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  selectedDayText: {
    color: '#fff',
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  todayText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  disabledDayCell: {
    backgroundColor: '#f3f4f6',
    opacity: 0.4,
  },
  disabledDayText: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
});
