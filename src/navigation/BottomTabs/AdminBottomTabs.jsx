import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Admindashboard from '../../screens/Admin/Admindashboard';
import ExpenseScreen from '../../screens/Expense/ExpenseScreen';
import TimesheetScreen from '../../screens/Timesheet/TimesheetScreen';
import ProfileScreen from '../../screens/Profile/ProfileScreen';
import FloatingBottomNav from '../../components/common/FloatingBottomNav';
import { TabContext } from './TabContext';

const AdminTabScreens = [Admindashboard, ExpenseScreen, TimesheetScreen, ProfileScreen];

const AdminBottomTabs = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const ActiveComponent = useMemo(() => AdminTabScreens[activeIndex] || Admindashboard, [activeIndex]);

  const handleTabPress = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  return (
    <TabContext.Provider value={{ activeIndex, setActiveIndex }}>
      <View style={styles.container}>
        <ActiveComponent navigation={navigation} />
        <FloatingBottomNav 
          activeIndex={activeIndex} 
          userRole="admin"
          useRouteNavigation={false}
          onTabPress={handleTabPress} 
        />
      </View>
    </TabContext.Provider>
  );
};

export default AdminBottomTabs;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
