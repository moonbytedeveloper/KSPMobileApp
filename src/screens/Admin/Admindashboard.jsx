import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, RefreshControl, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import DonutChart from '../../components/common/DonutChart';
import AppHeader from '../../components/common/AppHeader';
import Loader from '../../components/common/Loader';
import { useUser } from '../../contexts/UserContext';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import { getAdminDashboard } from '../../api/authServices';
import { getDisplayName } from '../../api/tokenStorage';

const donutSegments = [
  { value: 112, color: '#60a5fa' }, // Total
  { value: 20, color: '#22c55e' },  // Running
  { value: 10, color: '#fb923c' },  // On Hold
  { value: 70, color: '#6b7280' },  // Completed
];

const StatLegend = ({ color, label, value }) => (
  <View style={styles.legendRow}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <Text style={styles.legendLabel}>{label}</Text>
    <Text style={styles.legendValue}>{value}</Text>
  </View>
);

const DashCard = ({ icon, title, value, startColor, endColor, onPress, isLoading = false }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.cardShadow}>
    <View style={[styles.card, { backgroundColor: COLORS.bg }]}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.iconBadge, { backgroundColor: startColor }]}>
          <Icon name={icon} size={rf(4.2)} color={COLORS.text} />
        </View>
        <Icon name="chevron-right" size={rf(4.6)} color={COLORS.textLight} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
      {isLoading ? (
        <View style={styles.skeletonValue}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      ) : (
        <Text style={styles.cardValue}>{value}</Text>
      )}
    </View>
  </TouchableOpacity>
);

const SkeletonCard = () => (
  <View style={styles.cardShadow}>
    <View style={[styles.card, { backgroundColor: COLORS.bg }]}>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.iconBadge, { backgroundColor: '#f0f0f0' }]}>
          <View style={styles.skeletonIcon} />
        </View>
        <View style={styles.skeletonChevron} />
      </View>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonValue} />
    </View>
  </View>
);

const Admindashboard = ({ navigation }) => {
  const { setUserRole, allowedCompanies, selectedCompanyUUID, updateSelectedCompany, userData } = useUser();
  
  // State for dashboard data
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  
  // Set user role to admin when this component mounts
  React.useEffect(() => {
    setUserRole('admin');
  }, [setUserRole]);

  // Fetch display name
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

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [selectedCompanyUUID]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching dashboard data with params:', {
        selectedCompanyUUID,
      });
      
      const response = await getAdminDashboard({
        cmpUuid: selectedCompanyUUID,
      });
      
      console.log('Dashboard API response:', response);
      setDashboardData(response);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data');
      Alert.alert('Error', 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleMenuPress = () => {
    if (navigation && typeof navigation.openDrawer === 'function') {
      navigation.openDrawer();
    }
  };

  const handleNotificationPress = () => {
    navigation.navigate('Notification');
  };

  const onRefresh = async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    try {
      await fetchDashboardData();
    } catch (error) {
      console.error('Error refreshing dashboard data:', error);
      Alert.alert('Error', 'Failed to refresh dashboard data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  // Helper function to get donut chart segments from API data
  const getDonutSegments = () => {
    if (!dashboardData?.Data) {
      // Fallback to default data
      return (allowedCompanies?.[0] && selectedCompanyUUID === allowedCompanies[0]) ? donutSegments : [
        { value: 80, color: '#60a5fa' },
        { value: 12, color: '#22c55e' },
        { value: 16, color: '#fb923c' },
        { value: 52, color: '#6b7280' },
      ];
    }

    const data = dashboardData.Data;
    return [
      { value: data.TotalProjects || 0, color: '#60a5fa' }, // Total Projects
      { value: data.RunningProjects || 0, color: '#22c55e' }, // Running Projects
      { value: data.OnHoldProjects || 0, color: '#fb923c' }, // On Hold Projects
      { value: data.CompletedProjects || 0, color: '#6b7280' }, // Completed Projects
    ];
  };

  // Helper function to get stat legends from API data
  const getStatLegends = () => {
    if (!dashboardData?.Data) {
      // Fallback to default data
      return (allowedCompanies?.[0] && selectedCompanyUUID === allowedCompanies[0]) ? (
        <>
          <StatLegend color="#60a5fa" label="TOTAL PROJECTS" value={"112"} />
          <StatLegend color="#22c55e" label="RUNNING PROJECT" value={"20"} />
          <StatLegend color="#fb923c" label="ON HOLD PROJECT" value={"10"} />
          <StatLegend color="#6b7280" label="COMPLETED" value={"70"} />
        </>
      ) : (
        <>
          <StatLegend color="#60a5fa" label="TOTAL PROJECTS" value={"80"} />
          <StatLegend color="#22c55e" label="RUNNING PROJECT" value={"12"} />
          <StatLegend color="#fb923c" label="ON HOLD PROJECT" value={"16"} />
          <StatLegend color="#6b7280" label="COMPLETED" value={"52"} />
        </>
      );
    }

    const data = dashboardData.Data;
    return (
      <>
        <StatLegend color="#60a5fa" label="TOTAL PROJECTS" value={(data.TotalProjects || 0).toString()} />
        <StatLegend color="#22c55e" label="RUNNING PROJECT" value={(data.RunningProjects || 0).toString()} />
        <StatLegend color="#fb923c" label="ON HOLD PROJECT" value={(data.OnHoldProjects || 0).toString()} />
        <StatLegend color="#6b7280" label="COMPLETED" value={(data.CompletedProjects || 0).toString()} />
      </>
    );
  };

  // Show full screen loader on initial load
  if (loading && !dashboardData) {
    return (
      <View style={styles.container}>
        <AppHeader
          title={`Hello, ${displayName || 'Admin'}`}
          leftIconName={'menu'}
          onLeftPress={handleMenuPress}
          onRightPress={handleNotificationPress}
          rightIconName={'notifications'}
        />
        <View style={styles.loaderContainer}>
          <Loader />
          <Text style={styles.loaderText}>Loading dashboard data...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title={`Hello, ${displayName || 'Admin'}`}
        leftIconName={'menu'}
        onLeftPress={handleMenuPress}
        onRightPress={handleNotificationPress}
        rightIconName={'notifications'}
      />

      <ScrollView 
        contentContainerStyle={{ paddingBottom: hp(12) }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
      <View style={styles.sectionTitleRow}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>Summary</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {(() => {
              const co0 = allowedCompanies?.[0] || null;
              const co1 = allowedCompanies?.[1] || null;
              const isActive0 = co0 && selectedCompanyUUID === co0;
              const isActive1 = co1 && selectedCompanyUUID === co1;
              
              // Determine which flag to show based on company UUID
              const isUSACompany = (uuid) => uuid === 'B4A0A90C-FF73-4956-B2F5-E44D4D0046E0';
              const isIndiaCompany = (uuid) => uuid === '49537615-532c-4c8c-b451-0f094ccb';
              
              return (
                <>
                  {co0 && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => updateSelectedCompany(co0)}
                      style={[styles.flagBadge, { marginLeft: wp(1.5), borderWidth: isActive0 ? 2 : 0, borderColor: isActive0 ? COLORS.primary : 'transparent' }]}
                    >
                      <Image
                        source={{ 
                          uri: isUSACompany(co0) 
                            ? 'https://img.icons8.com/color/96/usa-circular.png'
                            : isIndiaCompany(co0)
                            ? 'https://img.icons8.com/color/96/india-circular.png'
                            : 'https://img.icons8.com/color/96/globe-circular.png'
                        }}
                        style={styles.flagImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                  {co1 && (
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => updateSelectedCompany(co1)}
                      style={[styles.flagBadge, { marginLeft: wp(1), borderWidth: isActive1 ? 2 : 0, borderColor: isActive1 ? COLORS.primary : 'transparent' }]}
                    >
                      <Image
                        source={{ 
                          uri: isUSACompany(co1) 
                            ? 'https://img.icons8.com/color/96/usa-circular.png'
                            : isIndiaCompany(co1)
                            ? 'https://img.icons8.com/color/96/india-circular.png'
                            : 'https://img.icons8.com/color/96/globe-circular.png'
                        }}
                        style={styles.flagImage}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  )}
                </>
              );
            })()}
          </View>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.chartWrap}>
            {loading ? (
              <View style={[styles.chartWrap, { justifyContent: 'center', alignItems: 'center', height: wp(42) }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading chart...</Text>
              </View>
            ) : (
              <DonutChart 
                segments={getDonutSegments()} 
                size={wp(42)} 
                strokeWidth={hp(2)} 
                gapDegrees={6}
                startAngle={-90}
              />
            )}
          </View>
          <View style={{ flex: 1, paddingLeft: wp(2) }}>
            {loading ? (
              <View style={{ justifyContent: 'center', alignItems: 'center', height: wp(42) }}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading stats...</Text>
              </View>
            ) : (
              getStatLegends()
            )}
          </View>
        </View>

        <View style={styles.grid}>
          {loading ? (
            <>
              <View style={styles.gridCol}>
                <SkeletonCard />
              </View>
              <View style={styles.gridCol}>
                <SkeletonCard />
              </View>
              <View style={styles.gridCol}>
                <SkeletonCard />
              </View>
              <View style={styles.gridCol}>
                <SkeletonCard />
              </View>
            </>
          ) : (
            <>
              <View style={styles.gridCol}>
                <DashCard 
                  icon="schedule" 
                  title="Total Hours Reported" 
                  value={dashboardData?.Data?.TotalHoursReported !== undefined ? `${dashboardData.Data.TotalHoursReported} hrs` : "0 hrs"} 
                  startColor="#fee2e2" 
                  endColor="#fff" 
                  onPress={() => navigation.navigate('TotalHoursReported')} 
                />
              </View>
              <View style={styles.gridCol}>
                <DashCard 
                  icon="people" 
                  title="Total Employees Working" 
                  value={dashboardData?.Data?.CurrentEmployeesWorking ? `${dashboardData.Data.CurrentEmployeesWorking}+` : "0+"} 
                  startColor="#fde68a" 
                  endColor="#fff" 
                  onPress={() => navigation.navigate('TotalEmployeesWorking')} 
                />
              </View>

              {/* <View style={styles.gridCol}>
                <DashCard icon="receipt" title="Total Invoice" value="234+" startColor="#e8f5e9" endColor="#fff" onPress={() => navigation.navigate('TotalInvoices')} />
              </View>
              <View style={styles.gridCol}>
                <DashCard icon="payments" title="Total Payment" value="$23,476+" startColor="#e0f2fe" endColor="#fff" onPress={() => navigation.navigate('PaymentStatus')} />
              </View> */}

              <View style={styles.gridCol}>
                <DashCard 
                  icon="description" 
                  title="Proposals" 
                  value={dashboardData?.Data?.TotalProposals ? `${dashboardData.Data.TotalProposals}+` : "0+"} 
                  startColor="#f3e8ff" 
                  endColor="#fff" 
                  onPress={() => navigation.navigate('AllProposals')} 
                />
              </View>
              <View style={styles.gridCol}>
                <DashCard 
                  icon="group-add" 
                  title="All Leads" 
                  value={dashboardData?.Data?.TotalLeads ? `${dashboardData.Data.TotalLeads}+` : "0+"} 
                  startColor="#e2e8f0" 
                  endColor="#fff" 
                  onPress={() => navigation.navigate('AllLeads')} 
                />
              </View>
            </>
          )}
        </View>
      </ScrollView>

    </View>
  );
};

export default Admindashboard;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    //paddingTop: safeAreaTop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
  },
  menuButton: {
    padding: wp(1.5),
    borderRadius: wp(2),
  },
  greeting: {
    fontSize: rf(3.8),
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    marginLeft: wp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallIconBtn: {
    padding: wp(1.5),
    borderRadius: wp(2),
    marginLeft: wp(1),
  },
  sectionTitle: {
    fontSize: rf(4.4),
    fontWeight: '800',
    color: COLORS.text,
    paddingHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    marginTop: hp(1),
    marginBottom: hp(1),
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
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
  },
  chartWrap: {
    paddingVertical: hp(1),
    paddingRight: wp(2),
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  legendDot: {
    width: wp(3.5),
    height: wp(3.5),
    borderRadius: wp(1.8),
    marginRight: wp(2),
  },
  legendLabel: {
    color: COLORS.textMuted,
    fontWeight: '700',
    fontSize: rf(3.2),
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  legendValue: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: wp(2),
    marginTop: hp(1.5),
  },
  gridCol: {
    width: '50%',
    paddingRight: wp(1.5),
    paddingLeft: wp(1.5),
    marginBottom: hp(1.4),
  },
  cardShadow: {
    borderRadius: wp(3),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  card: {
    borderRadius: wp(3),
    padding: wp(3),
    height: hp(16.3),
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(0.6),
  },
  iconBadge: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  cardTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: rf(3.2),
    width: '100%',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  cardValue: {
    marginTop: hp(1),
    fontSize: rf(5),
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  loadingText: {
    fontSize: rf(3.5),
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    marginTop: hp(1),
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(4),
  },
  loaderText: {
    fontSize: rf(3.8),
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    marginTop: hp(2),
    textAlign: 'center',
  },
  skeletonIcon: {
    width: wp(4),
    height: wp(4),
    backgroundColor: '#e0e0e0',
    borderRadius: wp(2),
  },
  skeletonChevron: {
    width: wp(4),
    height: wp(4),
    backgroundColor: '#e0e0e0',
    borderRadius: wp(2),
  },
  skeletonTitle: {
    width: '80%',
    height: hp(1.5),
    backgroundColor: '#e0e0e0',
    borderRadius: wp(0.5),
    marginBottom: hp(1),
  },
  skeletonValue: {
    width: '60%',
    height: hp(2),
    backgroundColor: '#e0e0e0',
    borderRadius: wp(0.5),
    marginTop: hp(1),
  },
  
});


