import React, { useState, useContext, useCallback, useEffect } from 'react';
import {getDisplayName} from '../../api/tokenStorage';
import {  
  StyleSheet, 
  Text, 
  View, 
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import DashboardCard from '../../components/common/DashboardCard';
import RadialChart from '../../components/common/RadialChart';
import { TabContext } from '../../navigation/BottomTabs/TabContext';
import AppHeader from '../../components/common/AppHeader';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import { getEmployeeDashboard } from '../../api/authServices';
import { getUUID, getENVUUID, getCMPUUID } from '../../api/tokenStorage';
import Loader from '../../components/common/Loader';
import { useUser } from '../../contexts/UserContext';

function HomeScreen({ navigation }) {
  const [displayName, setDisplayName] = useState('');
  const { allowedCompanies, selectedCompanyUUID, updateSelectedCompany } = useUser();
  
  useEffect(() => {
    (async () => {
      try {
        const name = await getDisplayName();
        setDisplayName(name || '');
      } catch (_e) {
        setDisplayName('');
      }
    })();
  }, []);
  const { setActiveIndex } = useContext(TabContext);
  const [dashboardData, setDashboardData] = useState({
    totalProjects: 0,
    pendingTimesheets: 0,
    timesheetApprovals: 0,
    totalHolidays: 0,
    totalLeaves: 0
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  console.log('dashboardData', dashboardData);
  
  // Chart data based on summary statistics - using raw values
  const chartData = [
    { 
      label: 'Completed', 
      value: dashboardData.completedProjects || 0, 
      color: '#4CAF50' // Green
    },
    { 
      label: 'On Hold', 
      value: dashboardData.onHoldProjects || 0, 
      color: '#9E9E9E' // Gray
    },
    { 
      label: 'Running', 
      value: dashboardData.runningProjects || 0, 
      color: '#FFEB3B' // Yellow
    },
    { 
      label: 'Total', 
      value: dashboardData.totalProjects || 0, 
      color: '#2196F3' // Blue
    }
  ]; // Show all items, even with 0 values

  // Debug log
  console.log('Chart data:', chartData);
  console.log('Dashboard data:', dashboardData);

  const handleMenuPress = () => {
    if (navigation && typeof navigation.openDrawer === 'function') {
      navigation.openDrawer();
    }
  };

  const handleNotificationPress = () => {
    // TODO: Implement notification functionality
    navigation.getParent()?.navigate('Notification');  
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [cmpUuid, envUuid, userUuid] = await Promise.all([
        getCMPUUID(),
        getENVUUID(),
        getUUID(),
      ]);
      console.log('Loading dashboard data with:', { cmpUuid, envUuid, userUuid });
      
      // Debug: Check if UUIDs are valid
      if (!cmpUuid) {
        //console.error('❌ cmpUuid is missing or null');
      }
      if (!envUuid) {
        //console.error('❌ envUuid is missing or null');
      }
      if (!userUuid) {
        console.error('❌ userUuid is missing or null');
      }
      
      // Debug: Check UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (cmpUuid && !uuidRegex.test(cmpUuid)) {
        //console.error('❌ cmpUuid format is invalid:', cmpUuid);
      }
      if (envUuid && !uuidRegex.test(envUuid)) {
        //console.error('❌ envUuid format is invalid:', envUuid);
      }
      if (userUuid && !uuidRegex.test(userUuid)) {
        //console.error('❌ userUuid format is invalid:', userUuid);
      }
      
      const resp = await getEmployeeDashboard({ cmpUuid, envUuid, userUuid });
      const data = resp?.Data || {};
      
      setDashboardData({
        totalProjects: data.TotalProjects || 0,
        pendingTimesheets: data.PendingTimesheets || 0,
        timesheetApprovals: data.TimesheetApprovals || 0,
        totalHolidays: data.TotalHolidays || 0,
        totalLeaves: data.TotalLeaves || 0,
        runningProjects: data.RunningProjects || 0,
        onHoldProjects: data.OnHoldProjects || 0,
        completedProjects: data.CompletedProjects || 0

      });
    } catch (e) {
      // console.error('❌ Dashboard API error:', e);
      // console.error('❌ Error response:', e.response?.data);
      // console.error('❌ Error status:', e.response?.status);
      // console.error('❌ Error headers:', e.response?.headers);
      // console.error('❌ Request config:', e.config);
      
      setDashboardData({
        totalProjects: 0,
        pendingTimesheets: 0,
        timesheetApprovals: 0,
        totalHolidays: 0,
        totalLeaves: 0,
        runningProjects: 0,
        onHoldProjects: 0,
        completedProjects: 0

      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [])
  );
  if (loading && !refreshing) {
    return <Loader />;
  }
    return (
    <>
   
    {/* <SafeAreaView style={styles.safeArea}> */}
        <AppHeader
          title={`Hello, ${displayName || 'User'}`}
          leftIconName="menu"
          onLeftPress={handleMenuPress}
          onRightPress={handleNotificationPress}
          //rightBadgeCount={3}
        />
        
        <ScrollView 
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: hp(14) }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >

        {/* Summary Section */}
          <View style={styles.summarySection}>
            <View style={styles.summaryTitleRow}>
              <Text style={styles.summaryTitle}>Summary</Text>
              {/* Company Selection Flags */}
              {allowedCompanies && allowedCompanies.length > 1 && (
                <View style={styles.flagRow}>
                  {allowedCompanies.map((companyUUID, index) => {
                    const isActive = selectedCompanyUUID === companyUUID;
                    const isUSACompany = (uuid) => uuid === 'B4A0A90C-FF73-4956-B2F5-E44D4D0046E0';
                    const isIndiaCompany = (uuid) => uuid === '49537615-532c-4c8c-b451-0f094ccb';
                    
                    return (
                      <TouchableOpacity
                        key={companyUUID}
                        activeOpacity={0.85}
                        onPress={() => updateSelectedCompany(companyUUID)}
                        style={[
                          styles.flagBadge, 
                          { 
                            borderWidth: isActive ? 2 : 0, 
                            borderColor: isActive ? COLORS.primary : 'transparent',
                            marginLeft: index > 0 ? wp(1) : 0
                          }
                        ]}
                      >
                        <Image
                          source={{ 
                            uri: isUSACompany(companyUUID) 
                              ? 'https://img.icons8.com/color/96/usa-circular.png'
                              : isIndiaCompany(companyUUID)
                              ? 'https://img.icons8.com/color/96/india-circular.png'
                              : 'https://img.icons8.com/color/96/globe-circular.png'
                          }}
                          style={styles.flagImage}
                          resizeMode="cover"
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
            
            <View style={styles.summaryContent}>
              <View style={styles.projectStats}>
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Icon name="folder" size={rf(5)} color="#4A90E2" />
                  </View>
                  <Text style={styles.statText}>Total Project: {dashboardData.totalProjects}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Icon name="play-circle-filled" size={rf(5)} color="#4CAF50" />
                  </View>
                  <Text style={styles.statText}>Running: {dashboardData.runningProjects}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Icon name="pause-circle-filled" size={rf(5)} color="#FF9800" />
                  </View>
                  <Text style={styles.statText}>On Hold: {dashboardData.onHoldProjects}</Text>
                </View>
                
                <View style={styles.statItem}>
                  <View style={styles.statIconContainer}>
                    <Icon name="check-circle" size={rf(5)} color="#4CAF50" />
                  </View>
                  <Text style={styles.statText}>Completed: {dashboardData.completedProjects}</Text>
                </View>
              </View>
              
              <View style={styles.chartContainer}>
                <RadialChart 
                  data={chartData}
                  size={wp(50)} 
                  strokeWidth={8}
                  gap={3}
                  showLabels={true}
                />
                {/* Chart Legend */}
                {/* {chartData.length > 0 && (
                  <View style={styles.chartLegend}>
                    {chartData.map((item, index) => (
                      <View key={index} style={styles.legendItem}>
                        <View 
                          style={[
                            styles.legendColor, 
                            { backgroundColor: item.color }
                          ]} 
                        />
                        <Text style={styles.legendText}>
                          {item.label}: {item.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                )} */}
              </View>
            </View>
          </View>
       

        {/* Dashboard Cards */}
        {(!loading || refreshing) && (
          <View style={styles.dashboardCards}>
          <View style={styles.cardRow}>
            <View style={styles.cardCol}>
              <DashboardCard
                iconName="bar-chart"
                iconColor={COLORS.primary}
                title="Total project"
                value={String(dashboardData.totalProjects)}
                backgroundColor="#FFE4E1"
                onPress={() => navigation.getParent()?.navigate('TotalProject')}              />
            </View>
            <View style={styles.cardCol}>
              <DashboardCard
                iconName="schedule"
                iconColor={COLORS.primary}
                title="Pending Timesheet"
                value={String(dashboardData.pendingTimesheets)}
                backgroundColor="#FFF8DC"
                onPress={() => navigation.getParent()?.navigate('PendingTimesheet')}
                />
            </View>
          </View>
          
          <View style={styles.cardRow}>
            <View style={styles.cardCol}>
              <DashboardCard
                iconName="approval"
                iconColor={COLORS.primary}
                title="Timesheets Approval"
                value={String(dashboardData.timesheetApprovals)}
                backgroundColor="#F0FFF0"
                onPress={() => navigation.getParent()?.navigate('TimesheetsApproval')}
                />
            </View>
            <View style={styles.cardCol}>
              <DashboardCard
                iconName="business"
                iconColor={COLORS.primary}
                title="Holiday"
                value={String(dashboardData.totalHolidays)}
                backgroundColor="#E6F3FF"
                onPress={() => navigation.getParent()?.navigate('HolidayView')}
              />
            </View>
          </View>
          
          <View style={styles.cardRow}>
            <View style={styles.cardCol}>
              <DashboardCard
                iconName="exit-to-app"
                iconColor={COLORS.primary}
                title="Leave"
                value={String(dashboardData.totalLeaves)}
                backgroundColor="#E8E8FF"
                onPress={() => navigation.getParent()?.navigate('LeaveList')}
              />
            </View>
            <View style={[styles.cardCol, styles.cardPlaceholder]} />
          </View>
          </View>
        )}
      </ScrollView>
    {/* </SafeAreaView> */}
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // paddingTop: safeAreaTop,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  
  // Summary Section Styles
  summarySection: {
    marginBottom: hp(3),
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(2),
    marginBottom: hp(1),
  },
  summaryTitle: {
    fontSize: rf(7),
    fontWeight: 'bold',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  summaryContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(1),
  },
  projectStats: {
    flex: 1,
    paddingRight: wp(1),
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  statIconContainer: {
    width: wp(6),
    height: wp(6),
    marginRight: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    fontSize: rf(4),
  },
  statText: {
    fontSize: rf(4),
    color: COLORS.text,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chartLegend: {
    marginTop: hp(1),
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(0.5),
  },
  legendColor: {
    width: wp(3),
    height: wp(3),
    borderRadius: wp(1.5),
    marginRight: wp(2),
  },
  legendText: {
    fontSize: rf(3.2),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  
  // Dashboard Cards Styles
  dashboardCards: {
    marginBottom: hp(2.5),
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(2),
  },
  cardCol: {
    width: '48%'
  },
  cardPlaceholder: {
    backgroundColor: 'transparent'
  },
  emptyCard: {
    flex: 1,
    marginHorizontal: wp(1),
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // paddingVertical: hp(10),
    
  },
  
  // Flag styles
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagBadge: {
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: wp(3.25),
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagImage: {
    width: '100%',
    height: '100%',
    borderRadius: wp(3.25),
  },
});

export default HomeScreen;
