import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAccessToken, getUUID, getRoles, getDesignation, getAllowedCompanyUUIDs, getSelectedEnvironmentUUID, setSelectedEnvironmentUUID, getSelectedCompanyUUID, setSelectedCompanyUUID, clearTokens, getDisplayName } from '../api/tokenStorage';

const UserContext = createContext({
  userRole: 'employee', // 'admin' or 'employee'
  setUserRole: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
  isLoading: true,
  userData: null,
  setUserData: () => {},
});

export const UserProvider = ({ children }) => {
  const [userRole, setUserRole] = useState('employee');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [allowedCompanies, setAllowedCompanies] = useState([]);
  const [selectedEnvironmentUUID, setSelectedEnvironmentUUIDState] = useState(null);
  const [selectedCompanyUUID, setSelectedCompanyUUIDState] = useState(null);

  // Check authentication status on app start
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await getAccessToken();
      const uuid = await getUUID();
      const roles = await getRoles();
      const designation = await getDesignation();
      const companies = await getAllowedCompanyUUIDs();
      const selectedEnv = await getSelectedEnvironmentUUID();
      const selectedCo = await getSelectedCompanyUUID();
      const displayName = await getDisplayName();
      
      console.log('Auth check - Token:', !!token);
      console.log('Auth check - UUID:', uuid);
      console.log('Auth check - Roles:', roles);
      console.log('Auth check - Designation:', designation);
      console.log('Auth check - Companies:', companies);
      console.log('Auth check - SelectedEnv:', selectedEnv);
      console.log('Auth check - SelectedCompany:', selectedCo);
      
      if (token && uuid) {
        setIsAuthenticated(true);
        setUserData({
          uuid,
          roles,
          designation,
          displayName: displayName || null,
        });
        setAllowedCompanies(Array.isArray(companies) ? companies : []);
        setSelectedEnvironmentUUIDState(selectedEnv);
        
        // Set India company as default if available, otherwise use first company
        const indiaCompanyUUID = '49537615-532c-4c8c-b451-0f094ccb';
        const defaultCompany = selectedCo || 
          (Array.isArray(companies) && companies.includes(indiaCompanyUUID) ? indiaCompanyUUID : 
           (Array.isArray(companies) && companies.length > 0 ? companies[0] : null));
        setSelectedCompanyUUIDState(defaultCompany);
        
        // Set user role based on stored data (mirror LoginScreen logic)
        if (Array.isArray(roles) && roles.length > 0) {
          const primaryRole = roles[0] || {};
          const roleName = (
            primaryRole?.UserRoleName ||
            primaryRole?.RoleName ||
            primaryRole?.roleName ||
            primaryRole?.name ||
            primaryRole?.Name ||
            ''
          ).toString().toLowerCase();

          const isSuperAdmin = (
            roleName === 'super admin' ||
            roleName === 'super_admin' ||
            roleName === 'superadmin'
          );

          setUserRole(isSuperAdmin ? 'admin' : 'employee');
        }
      } else {
        setIsAuthenticated(false);
        setUserData(null);
        setAllowedCompanies([]);
        setSelectedEnvironmentUUIDState(null);
        setSelectedCompanyUUIDState(null);
      }
    } catch (error) {
      console.log('Auth check error:', error);
      setIsAuthenticated(false);
      setUserData(null);
      setAllowedCompanies([]);
      setSelectedEnvironmentUUIDState(null);
      setSelectedCompanyUUIDState(null);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSelectedEnvironment = async (envUUID) => {
    try {
      setSelectedEnvironmentUUIDState(envUUID);
      await setSelectedEnvironmentUUID(envUUID);
    } catch (_e) {}
  };

  const updateSelectedCompany = async (companyUUID) => {
    try {
      setSelectedCompanyUUIDState(companyUUID);
      await setSelectedCompanyUUID(companyUUID);
    } catch (_e) {}
  };

  const logout = async () => {
    try {
      // Remove device token before clearing user data
      try {
        console.log('🔔 [USER_CONTEXT_LOGOUT] Removing device token...');
        const { sendDeviceToken } = require('../api/authServices');
        await sendDeviceToken({
          token: null, // Will be fetched from notificationService
          isLogin: false,
          userUuid: null // Will be fetched from storage
        });
        console.log('✅ [USER_CONTEXT_LOGOUT] Device token removed successfully');
      } catch (error) {
        console.error('❌ [USER_CONTEXT_LOGOUT] Error removing device token:', error);
        // Don't fail logout if device token removal fails
      }
      
      await clearTokens();
    } catch (_e) {}
    setIsAuthenticated(false);
    setUserData(null);
    setUserRole('employee');
    setAllowedCompanies([]);
    setSelectedEnvironmentUUIDState(null);
    setSelectedCompanyUUIDState(null);
  };

  return (
    <UserContext.Provider value={{ 
      userRole, 
      setUserRole, 
      isAuthenticated, 
      setIsAuthenticated, 
      isLoading, 
      userData, 
      setUserData,
      allowedCompanies,
      selectedEnvironmentUUID,
      updateSelectedEnvironment,
      selectedCompanyUUID,
      updateSelectedCompany,
      logout,
      checkAuthStatus
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext; 