import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useUser } from '../../contexts/UserContext';

// Import screens
import HomeScreen from '../../screens/Home/HomeScreen';
import AccountsScreen from '../../screens/Accounts/AccountsScreen.jsx';
import ManageInquiry from '../../screens/Accounts/ManageInquiry.jsx';
import BusinessDevelopmentScreen from '../../screens/BusinessDevelopment/BusinessDevelopmentScreen';
import ExpenseScreen from '../../screens/Expense/ExpenseScreen';
import HRAAttendance from '../../screens/HRA/HRAAttendance.jsx';
import ManageLeaves from '../../screens/HRA/ManageLeaves.jsx';
import ViewAttendanceScreen from '../../screens/HRA/ViewAttendanceScreen.jsx';
import ProfileScreen from '../../screens/Profile/ProfileScreen';
import TimesheetScreen from '../../screens/Timesheet/TimesheetScreen';
import BottomTabs from '../BottomTabs/BottomTabs';
import LoginScreen from '../../screens/Auth/LoginScreen';
import ForgotPasswordScreen from '../../screens/Auth/ForgotPasswordScreen';
import OTPVerificationScreen from '../../screens/Auth/OTPVerificationScreen';
import NewPasswordScreen from '../../screens/Auth/NewPasswordScreen';
import ManageLeadScreen from '../../screens/BusinessDevelopment/ManageLeadScreen';
import AddExpenseScreen from '../../screens/Expense/AddExpenseScreen.jsx';
import ApplyLeaveScreen from '../../screens/Leave/ApplyLeaveScreen.jsx';
import EditProfileScreen from '../../screens/Profile/EditProfileScreen.jsx';
import NotificationScreen from '../../screens/Notification/Notify.jsx';
import TotalProjectScreen from '../../screens/TotalProject/TotalProjectScreen.jsx';
import TimesheetsApprovalScreen from '../../screens/Timesheet/TimesheetsApprovalScreen.jsx';
import HolidayScreen from '../../screens/Holiday/HolidayScreen.jsx';
import LeaveListScreen from '../../screens/Leave/LeaveListScreen.jsx';
import PendingTimesheetScreen from '../../screens/Timesheet/PendingTimesheetScreen.jsx';
import ManageTimeSheetApproval from '../../screens/Timesheet/ManageTimeSheetApproval.jsx';
import ManageMyWorklist from '../../screens/Timesheet/ManageMyWorklist.jsx';
import ExpenseApproval from '../../screens/Expense/ExpenseApproval.jsx';
import ManageLeadProposal from '../../screens/BusinessDevelopment/ManageLeadProposal.jsx';
import ManageLeadFollowUp from '../../screens/BusinessDevelopment/ManageLeadFollowUp.jsx';
import Admindashboard from '../../screens/Admin/Admindashboard.jsx';
import AdminBottomTabs from '../BottomTabs/AdminBottomTabs';
import FileViewerScreen from '../../components/common/FileViewerScreen.jsx';
import ImageViewerScreen from '../../components/common/ImageViewerScreen.jsx';
// Import Admin screens
import PaymentStatusScreen from '../../screens/Admin/PaymentStatusScreen.jsx';
import TotalEmployeesWorkingScreen from '../../screens/Admin/TotalEmployeesWorkingScreen.jsx';
import AllProposalsScreen from '../../screens/Admin/AllProposalsScreen.jsx';
import AllLeadsScreen from '../../screens/Admin/AllLeadsScreen.jsx';
import TotalHoursReportedScreen from '../../screens/Admin/TotalHoursReportedScreen.jsx';
import TotalInvoicesScreen from '../../screens/Admin/TotalInvoicesScreen.jsx';
import { createDrawerNavigator, DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import StyleGuideDemo from '../../screens/styles/StyleGuideDemo';
import LogoutConfirmSheet from '../../components/common/LogoutConfirmSheet.jsx';
import { formStyles, COLORS, TYPOGRAPHY } from '../../screens/styles/styles.jsx';
import { getProfile as getStoredProfile } from '../../api/tokenStorage';
const Stack = createNativeStackNavigator();
const Drawer = createDrawerNavigator();

const AppStack = () => {
  const { isAuthenticated, isLoading, userRole } = useUser();

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ff6236" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={isAuthenticated ? (userRole === 'admin' ? 'AdminDashboard' : 'Main') : 'Login'}
    >
        <Stack.Screen
        name="Main"
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="OTPVerification"
        component={OTPVerificationScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="NewPassword"
        component={NewPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AdminDashboard"
        component={AdminDrawerNavigator}
        options={{ headerShown: false }}
      />
       <Stack.Screen
        name="AllProposals"
        component={AllProposalsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AllLeads"
        component={AllLeadsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{ headerShown: false}}
      />
      <Stack.Screen
        name="ManageInquiry"
        component={ManageInquiry}
        options={{ headerShown: false}}
      />
       <Stack.Screen
        name="BusinessDevelopment"
        component={BusinessDevelopmentScreen}
        options={{ headerShown: false}}
      />
      <Stack.Screen
        name="HRA"
        component={HRAAttendance}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ManageLeaves"
        component={ManageLeaves}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ViewAttendance"
        component={ViewAttendanceScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Notification"
        component={NotificationScreen}
        options={{ 
          headerShown: false,
          headerTitleAlign: 'left',
        }}
      />
      <Stack.Screen
        name="ApplyLeave"
        component={ApplyLeaveScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TotalProject"
        component={TotalProjectScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TimesheetsApproval"
        component={TimesheetsApprovalScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="HolidayView"
        component={HolidayScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="LeaveList"
        component={LeaveListScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="PendingTimesheet"
        component={PendingTimesheetScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManageTimeSheetApproval"
        component={ManageTimeSheetApproval}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManageMyWorklist"
        component={ManageMyWorklist}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ExpenseApproval"
        component={ExpenseApproval}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManageLeadProposal"
        component={ManageLeadProposal}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ManageLeadFollowUp"
        component={ManageLeadFollowUp}
        options={{
          headerShown: false,
        }}
      />
        <Stack.Screen
        name="ManageLead"
        component={ManageLeadScreen}
        options={{
          headerShown: false,
        }}
      />
      {/* file Viewer */}
      <Stack.Screen
        name="FileViewerScreen"
        component={FileViewerScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ImageViewerScreen"
        component={ImageViewerScreen}
        options={{
          headerShown: false,
        }}
      />
      {/* Admin Screens */}
      <Stack.Screen
        name="PaymentStatus"
        component={PaymentStatusScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TotalEmployeesWorking"
        component={TotalEmployeesWorkingScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TotalHoursReported"
        component={TotalHoursReportedScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="TotalInvoices"
        component={TotalInvoicesScreen}
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="StyleGuideDemo"
        component={StyleGuideDemo}
        options={{
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
};

export default AppStack;

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="Tabs"
      screenOptions={{
        headerTitleAlign: 'center',
        drawerType: 'front',
        drawerStyle: { width: 320 },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {/* Tabs (Home page with bottom tabs) */}
      <Drawer.Screen 
        name="Tabs" 
        component={BottomTabs} 
        options={{ headerShown: false, title: "Home" }} 
      />
      <Drawer.Screen 
        name="Accounts  " 
        component={AccountsScreen} 
        options={{ headerShown: false}} 
      />
      <Drawer.Screen 
        name="ManageInquiry" 
        component={ManageInquiry} 
        options={{ headerShown: false}} 
      />
      {/* Other screens inside Drawer */}
      <Drawer.Screen 
        name="BusinessDevelopment" 
        component={BusinessDevelopmentScreen} 
        options={{ headerShown: false}} 
      />

      <Drawer.Screen 
        name="Expense" 
        component={ExpenseScreen} 
        options={{ headerShown: false }}
        
      />

      <Drawer.Screen 
        name="Timesheet" 
        component={TimesheetScreen} 
        options={{ headerShown: false}} 
      />

      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{headerShown: false}} 
      />
    </Drawer.Navigator>
  );
};

const AdminDrawerNavigator = () => {
  return (
    <Drawer.Navigator
      initialRouteName="AdminTabs"
      screenOptions={{
        headerTitleAlign: 'center',
        drawerType: 'front',
        drawerStyle: { width: 320 },
      }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {/* Admin Tabs */}
      <Drawer.Screen 
        name="AdminTabs" 
        component={AdminBottomTabs} 
        options={{ headerShown: false, title: "Admin Dashboard" }} 
      />

      {/* Other screens inside Admin Drawer */}
       <Drawer.Screen 
        name="Accounts" 
        component={AccountsScreen} 
        options={{ headerShown: false}} 
      />
        <Drawer.Screen 
        name="ManageInquiry" 
        component={ManageInquiry} 
        options={{ headerShown: false}} 
      />
      <Drawer.Screen 
        name="BusinessDevelopment" 
        component={BusinessDevelopmentScreen} 
        options={{ headerShown: false}} 
      />

      <Drawer.Screen 
        name="Expense" 
        component={ExpenseScreen} 
        options={{ headerShown: false }}
        
      />

      <Drawer.Screen 
        name="Timesheet" 
        component={TimesheetScreen} 
        options={{ headerShown: false}} 
      />

      <Drawer.Screen 
        name="Profile" 
        component={ProfileScreen} 
        options={{headerShown: false}} 
      />
    </Drawer.Navigator>
  );
};

 const CustomDrawerContent = ({ navigation }) => {
  const [showLogout, setShowLogout] = useState(false);
    const [salesOpen, setSalesOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { logout, userData, allowedCompanies, selectedCompanyUUID, updateSelectedCompany  } = useUser();
  const [displayName, setDisplayName] = useState('');

  // Build a fast lookup for menu rights from the first role (primary role)
  const rightsSet = useMemo(() => {
    const rights = Array.isArray(userData?.roles?.[0]?.MenuRights)
      ? userData.roles[0].MenuRights
      : [];
    return new Set(rights);
  }, [userData]);

  const can = (rightName) => rightsSet.has(rightName);

  // Adjust these to tune extra padding in addition to device safe-area
  const extraTopPadding = 0; // e.g., hp(0.5)
  const extraBottomPadding = 0; // e.g., hp(0.5)

  // Prefer name from context (login), fallback to stored profile
  useEffect(() => {
    if (userData?.displayName) {
      setDisplayName(userData.displayName);
      return;
    }
    let isMounted = true;
    (async () => {
      try {
        const profile = await getStoredProfile();
        const name = profile?.BasicInformation?.FullName?.trim();
        if (isMounted && name) {
          setDisplayName(name);
        }
      } catch (_e) {}
    })();
    return () => { isMounted = false; };
  }, [userData]);

  const initials = useMemo(() => {
    const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] || 'U';
    const second = parts[1]?.[0] || '';
    return `${first}${second}`.toUpperCase();
  }, [displayName]);

  // Navigate to a route and immediately close the drawer.
  // Also pass a flag so screens can know navigation originated from the drawer if needed.
  const navigateFromDrawer = (routeName, params = {}) => {
    navigation.navigate(routeName, { fromDrawer: true, ...params });
    // Close drawer on the next frame for smoother UX
    requestAnimationFrame(() => {
      if (typeof navigation.closeDrawer === 'function') {
        navigation.closeDrawer();
      } else {
        navigation.getParent?.()?.closeDrawer?.();
      }
    });
  };

    // Animated value to slide the Sales submenu open/closed
    const salesAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.timing(salesAnim, {
        toValue: salesOpen ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }).start();
    }, [salesOpen, salesAnim]);

  return (
    <>
    <DrawerContentScrollView
      contentContainerStyle={[
        styles.drawerContainer,
        styles.drawerContentGrow,
        { paddingTop: insets.top + extraTopPadding, paddingBottom: insets.bottom + extraBottomPadding },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.headerUser}
            activeOpacity={0.7}
            onPress={() => navigateFromDrawer('Profile')}
          >
            <View style={styles.avatarCircle}>
              <Image
                source={{ uri: `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=ffffff&color=ff6236` }}
                style={styles.avatarImage}
              />
            </View>
            <Text style={styles.headerName}>{displayName || 'Profile'}</Text>
          </TouchableOpacity>
          <View style={styles.headerRow}>
          {allowedCompanies && allowedCompanies.length > 0 && (
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
                            borderWidth: isActive ? 1.5 : 3, 
                            borderColor: isActive ? COLORS.bg :COLORS.primary,
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
          <TouchableOpacity onPress={() => navigation.closeDrawer()} style={styles.headerCloseBtn}>
            <Icon name="close" size={rf(5)} color="#fff" />
          </TouchableOpacity>
          </View>
        </View>
      </View>

       {/* {can('Accounts') && ( */}
         <>
          <Text style={styles.sectionTitle}>Accounts</Text>
          {/* Sales item now expands a small submenu instead of navigating directly */}
          <View style={[styles.salesSection, salesOpen && styles.salesSectionOpen]}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setSalesOpen((s) => !s)}
            style={styles.cardItem}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#fff5f2' }]}>
                <Icon name="leaderboard" size={rf(4)} color={COLORS.primary} />
              </View>
              <Text style={styles.itemLabel}>Sales</Text>
            </View>
            <Icon name={salesOpen ? 'expand-less' : 'chevron-right'} size={rf(5)} color="#999" />
          </TouchableOpacity>

          <Animated.View
            style={[
              styles.subMenuWrap,
              {
                height: salesAnim.interpolate({ inputRange: [0, 1], outputRange: [0, hp(10)] }),
                opacity: salesAnim,
              },
            ]}
            pointerEvents={salesOpen ? 'auto' : 'none'}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigateFromDrawer('Accounts')}
              style={[styles.cardItem, styles.subItem]}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconBadge, { backgroundColor: '#fff5f2', width: wp(6), height: wp(6) }]}>
                  <Icon name="receipt-long" size={rf(3.2)} color={COLORS.primary} />
                </View>
                <Text style={styles.itemLabel}>Manage Sales Order</Text>
              </View>
              <Icon name="chevron-right" size={rf(5)} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => navigateFromDrawer('ManageInquiry')}
              style={[styles.cardItem, styles.subItem]}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconBadge, { backgroundColor: '#fff5f2', width: wp(6), height: wp(6) }]}>
                  <Icon name="description" size={rf(3.2)} color={COLORS.primary} />
                </View>
                <Text style={styles.itemLabel}>Manage Inquiry</Text>
              </View>
              <Icon name="chevron-right" size={rf(5)} color="#999" />
            </TouchableOpacity>
          </Animated.View>
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigateFromDrawer('Accounts')}
            style={styles.cardItem}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#fff5f2' }]}>
                <Icon name="leaderboard" size={rf(4)} color={COLORS.primary} />
              </View>
              <Text style={styles.itemLabel}>Purchase</Text>
            </View>
            <Icon name="chevron-right" size={rf(5)} color="#999" />
          </TouchableOpacity>
        </>
       {/* )} */}
      {can('Business Development') && (
        <>
          <Text style={styles.sectionTitle}>Business Development</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigateFromDrawer('BusinessDevelopment')}
            style={styles.cardItem}
          >
            <View style={styles.itemLeft}>
              <View style={[styles.iconBadge, { backgroundColor: '#fff5f2' }]}>
                <Icon name="leaderboard" size={rf(4)} color={COLORS.primary} />
              </View>
              <Text style={styles.itemLabel}>Sales Opportunity</Text>
            </View>
            <Icon name="chevron-right" size={rf(5)} color="#999" />
          </TouchableOpacity>
        </>
      )}

      {can('TimeSheet') && (
        <>
          <Text style={styles.sectionTitle}>Timesheet</Text>
          {[
            { label: 'Manage Timesheet', route: 'Timesheet', icon: 'assignment' },
            { label: 'Manage Timesheet Approval', route: 'ManageTimeSheetApproval', icon: 'fact-check' },
            { label: 'Manage My Worklist', route: 'ManageMyWorklist', icon: 'list-alt' },
            { label: 'Manage Leaves', route: 'ManageLeaves', icon: 'event-available' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.7}
              onPress={() => navigateFromDrawer(item.route)}
              style={styles.cardItem}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconBadge, { backgroundColor: '#fff5f2' }]}>
                  <Icon name={item.icon} size={rf(4)} color={COLORS.primary} />
                </View>
                <Text style={styles.itemLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-right" size={rf(5)} color="#999" />
            </TouchableOpacity>
          ))}
        </>
      )}

      {can('HRA') && (
        <>
          <Text style={styles.sectionTitle}>HRA</Text>
          {[
            { label: 'Attendance', route: 'HRA', icon: 'badge' },
            { label: 'Approve Leave', route: 'ViewAttendance', icon: 'visibility' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.7}
              onPress={() => navigateFromDrawer(item.route)}
              style={styles.cardItem}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconBadge, { backgroundColor: '#fff5f2' }]}>
                  <Icon name={item.icon} size={rf(4)} color={COLORS.primary} />
                </View>
                <Text style={styles.itemLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-right" size={rf(5)} color="#999" />
            </TouchableOpacity>
          ))}
        </>
      )}

      {can('Expense') && (
        <>
          <Text style={styles.sectionTitle}>Expense</Text>
          {[
            { label: 'Expense Reimbursement', route: 'Expense', icon: 'receipt-long' },
            { label: 'Expense Approval', route: 'ExpenseApproval', icon: 'fact-check' },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              activeOpacity={0.7}
              onPress={() => navigateFromDrawer(item.route)}
              style={styles.cardItem}
            >
              <View style={styles.itemLeft}>
                <View style={[styles.iconBadge, { backgroundColor: '#fff5f2' }]}>
                  <Icon name={item.icon} size={rf(4)} color={COLORS.primary} />
                </View>
                <Text style={styles.itemLabel}>{item.label}</Text>
              </View>
              <Icon name="chevron-right" size={rf(5)} color="#999" />
            </TouchableOpacity>
          ))}
        </>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setShowLogout(true)}
        style={[styles.cardItem, { marginTop: hp(1.2) }]}
      >
        <View style={styles.itemLeft}>
          <View style={[styles.iconBadge, { backgroundColor: '#fff5f2' }]}>
            <Icon name="logout" size={rf(4)} color={COLORS.primary} />
          </View>
          <Text style={styles.itemLabel}>Logout</Text>
        </View>
        <Icon name="chevron-right" size={rf(5)} color="#999" />
      </TouchableOpacity>
      <View style={styles.footerSpacer} />
    </DrawerContentScrollView>
    <LogoutConfirmSheet
      visible={showLogout}
      onCancel={() => setShowLogout(false)}
      onConfirm={async () => {
        setShowLogout(false);
        navigation.closeDrawer();
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      }}
    />
    </>
  );
};

const styles = StyleSheet.create({
    
  // Flag styles
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flagBadge: {
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: wp(3.25),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagImage: {
    width: '100%',
    height: '100%',
    borderRadius: wp(3.25),
  },
  drawerContainer: {
    paddingTop: 0,
    paddingHorizontal: wp(2),
    paddingBottom: hp(1),
  },
  drawerContentGrow: {
    minHeight: '100%',
  },
  headerCard: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 0,
    borderTopRightRadius: wp(4),
    borderBottomLeftRadius: wp(2),
    borderBottomRightRadius: wp(4),
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(3.6),
    paddingTop: 20,
    marginBottom: hp(1),
    // Full-bleed to drawer edges
    marginLeft: -wp(4),
    marginRight: -wp(4),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerUser: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarCircle: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(9) / 2,
    overflow: 'hidden',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerName: {
    color: '#fff',
    fontWeight: '700',
    fontSize: rf(4),
    marginLeft: wp(3),
    flex: 1,
  },
  headerCloseBtn: {
    padding: wp(1),
  },
  sectionTitle: {
    fontSize: rf(3.8),
    fontWeight: '700',
    color: '#111',
    marginTop: hp(1),
    marginBottom: hp(0.6),
    paddingHorizontal: wp(1),
  },
  cardItem: {
    backgroundColor: '#fff',
    borderRadius: wp(2),
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
    marginBottom: hp(0.8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  itemLabel: {
    fontSize: rf(3.4),
    color: '#333',
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  footerSpacer: {
    height: hp(1.2),
  },
  subMenuWrap: {
    paddingHorizontal: wp(2),
    marginBottom: hp(0.6),
    overflow: 'hidden',
  },
  subItem: {
    paddingVertical: hp(0.8),
    marginBottom: hp(0.4),
    marginLeft: wp(1),
    // Remove shadows/borders when rendered as submenu to avoid visual artifacts
    backgroundColor: 'transparent',
    borderWidth: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  salesSection: {
    marginBottom: hp(0.6),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e6e6e6',
    borderRadius: wp(2),
    overflow: 'hidden',
  },
  salesSectionOpen: {
    backgroundColor: '#f3f4f6',
    paddingVertical: hp(0.6),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: hp(2),
    fontSize: rf(4),
    color: '#333',
    fontWeight: '600',
  },
});
