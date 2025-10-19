import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import HomeScreen from '../../screens/Home/HomeScreen';
import ExpenseScreen from '../../screens/Expense/ExpenseScreen';
import TimesheetScreen from '../../screens/Timesheet/TimesheetScreen';
import ProfileScreen from '../../screens/Profile/ProfileScreen';
import FloatingBottomNav from '../../components/common/FloatingBottomNav';
import { TabContext } from './TabContext';

const TabScreens = [HomeScreen, ExpenseScreen, TimesheetScreen, ProfileScreen];

const BottomTabs = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const ActiveComponent = useMemo(() => TabScreens[activeIndex] || HomeScreen, [activeIndex]);

  const handleTabPress = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  return (
    <TabContext.Provider value={{ activeIndex, setActiveIndex }}>
      <View style={styles.container}>
        <ActiveComponent navigation={navigation} />
        <FloatingBottomNav activeIndex={activeIndex} onTabPress={handleTabPress} />
      </View>
    </TabContext.Provider>
  );
};

export default BottomTabs;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
}); 