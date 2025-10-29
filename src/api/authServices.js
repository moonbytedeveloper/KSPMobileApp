import axios from 'axios';
import { Alert } from 'react-native';
import { getRefreshToken, setTokens, clearTokens, getUUID, getCMPUUID, getENVUUID, setMenuRights, setUUID, setENVUUID, setCMPUUID, setProfile, setDesignation, setRoles, setDisplayName, setSelectedEnvironmentUUID, setSelectedCompanyUUID, getSelectedCompanyUUID, getSelectedEnvironmentUUID, setReportingDesignation, getReportingDesignation, setRoleUUID, getRoleUUID, setAllowedCompanyUUIDs } from './tokenStorage';
import api from './axios';
import Config from 'react-native-config';
import uuid from 'react-native-uuid';
import base64 from 'react-native-base64';
import DeviceInfo from 'react-native-device-info';
// NOTE: Keep this in sync with BASE_URL in axios.js
const BASE_URL = Config.API_URL;
const PATHS = {
    login: Config.API_LOGIN_PATH || '/api/CompanySetup/login',
    refresh: Config.API_REFRESH_PATH || '/api/CompanySetup/auth/refresh',
    kspAuth: Config.API_KSP_PATH || '/api/CompanySetup/KSP',
    forgotPassword: Config.API_FORGOT_PASSWORD_PATH || '/api/CompanySetup/forgot-password',
    verifyCode: Config.API_VERIFY_CODE_PATH || '/api/CompanySetup/verify-code',
    resetPassword: Config.API_RESET_PASSWORD_PATH || '/api/CompanySetup/reset-password',
    profile: Config.API_PROFILE_PATH || '/api/CompanySetup/profile',
    employeeProjectsProgress: Config.API_EMPLOYEE_PROJECTS_PROGRESS_PATH || '/api/DashBoard/GetEmployeeProjectsWithProgress',
    holidays: Config.API_HOLIDAYS_PATH || '/api/DashBoard/holidays',
    leaves: Config.API_LEAVES_PATH || '/api/DashBoard/leaves',
    pendingTimesheets: Config.API_PENDING_TIMESHEETS_PATH || '/api/DashBoard/PendingTimesheets',
    wonLeads: Config.API_GET_Manage_LEADS_PATH,
    updateLeadStatus: Config.API_BUSINESS_UPDATE_LEAD_STATUS_PATH || '/api/BusinessDevelopment/UpdateLeadStatus',
    applyLeave: Config.API_APPLY_LEAVE_PATH,
    hraleaves: Config.API_HRA_LEAVES_PATH,
    getManageLeave: Config.API_HRA_GET_MANAGE_LEAVE_PATH || '/api/HRA/GetManageLeave',
    approvedByMeExpenses: '/api/Expense/approval-by-me-expenses',
    soleApprovalData: '/api/Expense/sole-approval-data',
    approvedDetails: '/api/Expense/Approved-Reject-history',
    processApprovalOrRejection: '/api/Expense/process-approval-Or-rejection',
    myApprovedExpenses: '/api/Expense/my-approved-expenses',
    myRejectedExpenses: '/api/Expense/my-rejected-expenses',
    pendingApprovals: '/api/Expense/pending-approvals',

    saveLeadOpportunity: Config.API_SAVE_MANAGE_LEAD_OPPORTUNITY_PATH || '/api/BusinessDevelopment/AddManageLeadOpportunity',
    // Company Setup APIs
    getCountries: Config.API_GET_COUNTRIES_PATH || '/api/CompanySetup/GetCountries',
    getStates: Config.API_GET_STATES_PATH || '/api/CompanySetup/GetStates',
    getCities: Config.API_GET_CITIES_PATH || '/api/CompanySetup/GetCities',
    getEmployees: Config.API_GET_EMPLOYEES_PATH || '/api/CompanySetup/employees',
    updateProfileImage: Config.API_UPDATE_PROFILE_IMAGE_PATH || '/api/CompanySetup/update-profile-image',
    getProfileImage: Config.API_GET_PROFILE_IMAGE_PATH || '/api/CompanySetup/get-profile-image',
    deleteProfileImage: Config.API_DELETE_PROFILE_IMAGE_PATH || '/api/CompanySetup/delete-profile-image',
    // HRA APIs
    getAttendance: Config.API_GET_ATTENDANCE_PATH || '/api/HRA/GetAttendance',
    // Expenses/Projects APIs
    expenses: Config.API_EXPENSES_PATH || '/api/Expenses/GetExpenses',
    projects: Config.API_PROJECTS_PATH || '/api/Projects/GetProjects',
    projectTasks: Config.API_PROJECT_TASKS_PATH || '/api/Projects/GetProjectTasks',
    userProjects: Config.API_USER_PROJECTS_PATH || '/api/Expense/user-projects',
    userProjectTasks: Config.API_USER_PROJECT_TASKS_PATH || '/api/Expense/user-project-tasks',
    expenseTypes: Config.API_EXPENSE_TYPES_PATH || '/api/Expense/GetExpenseTypes',
    currencies: Config.API_CURRENCIES_PATH || '/api/Expense/GetCurrency',
    expenseUnits: Config.API_EXPENSE_UNITS_PATH || '/api/Expense/GetExpenseUnits',
    expenseLines: Config.API_EXPENSE_LINES_PATH || '/api/Expense/lines',
    expenseUpdateLines: Config.API_EXPENSE_UPDATE_LINES_PATH || '/api/Expense/Update-lines',
    expenseHeaderLinesBase: Config.API_EXPENSE_HEADER_LINES_BASE || '/api/Expense/headers',
    expenseGetLinesByHeader: Config.API_EXPENSE_GET_LINES_BY_HEADER || '/api/Expense/GetLinesByHeader',
    // Eligibility gate before navigating to Add Expense form
    addExpenseEligibility: Config.API_EXPENSE_ADD_ELIGIBILITY_PATH || '/api/Expense/AddExpense',
    addExpenseHeader: Config.API_ADD_EXPENSE_HEADER_PATH || '/api/Expense/add-header',
    updateExpenseHeader: Config.API_UPDATE_EXPENSE_HEADER_PATH || '/api/Expense/update-header',
    dashboardMyWorklistProjects: Config.API_DASHBOARD_MYWORKLIST_PROJECTS_PATH || '/api/DashBoard/myworklist/projects',
    // Business Development - Proposals
    addLeadProposal: Config.API_ADD_LEAD_PROPOSAL_PATH || '/api/BusinessDevelopment/AddLeadproposal',
    updateLeadProposal: Config.API_UPDATE_LEAD_PROPOSAL_PATH || '/api/BusinessDevelopment/UpdateLeadproposal',
    addLeadFollowUp: Config.API_ADD_LEAD_FOLLOWUPS_PATH || '/api/BusinessDevelopment/followups',
    addLeadUpdateFollowUp: Config.API_ADD_LEAD_UpdateFOLLOWUPS_PATH || '/api/BusinessDevelopment/Updatefollowups',
    getLeadFollowUps: Config.API_GET_LEAD_FOLLOWUPS_PATH || '/api/BusinessDevelopment/GetFollowUpsByLead',
    deleteLeadFollowUp: Config.API_DELETE_LEAD_FOLLOWUP_PATH || '/api/BusinessDevelopment/DeleteFollowUp',
    getLeadProposalsList: Config.API_GET_LEAD_PROPOSALS_LIST_PATH || '/api/BusinessDevelopment/GetLeadProposalsList',
    deleteLeadProposal: Config.API_DELETE_LEAD_PROPOSAL_PATH || '/api/BusinessDevelopment/DeleteLeadProposal',
    deleteLead: Config.API_DELETE_LEAD_PATH || '/api/BusinessDevelopment/DeleteLead',
    approveOrRejectLeave: Config.API_HRA_APPROVE_OR_REJECT_LEAVE_PATH || '/api/HRA/ApproveOrRejectLeave',
    ApproveLeaves: Config.API_APPROVE_LEAVES_PATH || '/api/HRA/GetLeavesForApproval',
    updateManageLeadOpportunity: Config.API_Update_LEADS_OPP_PATH || '/api/BusinessDevelopment/UpdateManageLeadOpportunity',
    // Timesheet APIs
    notApprovedTimesheets: Config.API_NOT_APPROVED_TIMESHEETS_PATH || '/api/DashBoard/NotApprovedTimesheets',
    manageTimesheet: Config.API_MANAGE_TIMESHEET_PATH || '/api/TimeSheet/ManageTimesheet',
    addTimesheetLine: Config.API_ADD_TIMESHEET_LINE_PATH || '/api/TimeSheet/AddTimesheetLine',
    deleteTimesheetLine: Config.API_DELETE_TIMESHEET_LINE_PATH || '/api/TimeSheet/DeleteTimesheetLine',
    submitTimesheetLine: Config.API_SUBMIT_TIMESHEET_LINE_PATH || '/api/TimeSheet/SubmitTimesheet',
    transferTimesheetTasks: Config.API_TRANSFER_TIMESHEET_TASKS_PATH || '/api/TimeSheet/transfer-tasks',
    // Timesheet eligibility check
    addTimesheetEligibility: Config.API_ADD_TIMESHEET_ELIGIBILITY_PATH || '/api/TimeSheet/AddTimesheet',
    employeeDashboard: Config.API_EMPLOYEE_DASHBOARD_PATH || '/api/DashBoard/employee/dashboard',
    // Timesheet - Approved list
    approvedTimesheets: Config.API_APPROVED_TIMESHEETS_PATH || '/api/TimeSheet/ApprovedTimesheets',
    // Timesheet - Submitted & Pending list
    submittedAndPendingTimesheets: Config.API_SUBMITTED_PENDING_TIMESHEETS_PATH || '/api/TimeSheet/SubmittedAndPendingTimesheets',
    // Timesheet - For Approval
    timesheetsForApproval: Config.API_TIMESHEETS_FOR_APPROVAL_PATH || '/api/TimeSheet/TimesheetsForApproval',
    approveTimesheet: Config.API_APPROVE_TIMESHEET_PATH || '/api/TimeSheet/ApproveTimesheet',
    // Dashboard Lead Summary
    getDashboardLeadSummary: Config.API_GET_DASHBOARD_LEAD_SUMMARY_PATH || '/api/DashBoard/GetDashboardLeadSummary',
    adminDashboard: '/api/DashBoard/superadmin/dashboard',
    // admin dashboard APIs
    totalHoursReported: '/api/DashBoard/myworklist/projects',
    totalEmployeeWorking: '/api/DashBoard/hr-dashboard/employees-status',

};
console.log(PATHS, 'PATHS');

async function getLocalIp() {
    try {
        const ip = await DeviceInfo.getIpAddress();
        console.log(ip, 'ip address');
        // returns string like '192.168.x.x'
        return ip;
    } catch (e) {
        console.warn('getIpAddress error', e);
        return null;
    }
}


const refreshClient = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

export async function refresh() {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token');

    console.log('Attempting token refresh...');
    const resp = await refreshClient.post(PATHS.refresh, { refreshToken });
    console.log('Refresh response:', resp.data);

    // Handle different possible response formats
    const responseData = resp.data?.Data || resp.data;
    const { AccessToken, RefreshToken } = responseData?.Token || responseData || {};

    if (!AccessToken || !RefreshToken) {
        console.log('Invalid refresh response - missing tokens');
        throw new Error('Invalid refresh response');
    }

    await setTokens({ accessToken: AccessToken, refreshToken: RefreshToken });
    console.log('Tokens refreshed successfully');
    return { accessToken: AccessToken, refreshToken: RefreshToken };
}

export async function logout({ onAfterClear } = {}) {
    try {
        // Remove device token before clearing user data
        try {
            console.log('🔔 [LOGOUT] Removing device token...');
            await sendDeviceToken({
                token: null, // Will be fetched from notificationService
                isLogin: false,
                userUuid: null // Will be fetched from storage
            });
            console.log('✅ [LOGOUT] Device token removed successfully');
        } catch (error) {
            console.error('❌ [LOGOUT] Error removing device token:', error);
            // Don't fail logout if device token removal fails
        }

        await clearTokens();
    } finally {
        try { Alert.alert('Signed out', 'You have been signed out.'); } catch (e) { }
        if (typeof onAfterClear === 'function') onAfterClear();
    }
}

export async function kspAuth() {
    // Try without any parameters first
    const newUUID = uuid.v4();
    const modifiedUUID = `${newUUID}+++000`;
    const encodedUUID = base64.encode(modifiedUUID);
    console.log(modifiedUUID, 'devicekey')
    console.log('Generated UUID for KSP Authentication:', encodedUUID);
    const resp = await api.post(PATHS.kspAuth, { 'DeviceKey': encodedUUID });
    console.log('KSP Authentication response:', JSON.stringify(resp.data, null, 2));

    const { Token } = resp.data || {};
    const { AccessToken, RefreshToken } = Token || {};

    if (AccessToken && RefreshToken) {
        await setTokens({ accessToken: AccessToken, refreshToken: RefreshToken });
        console.log('KSP Tokens stored successfully');
    } else {
        console.log('No tokens found in KSP response');
    }

    return resp.data;
}
export async function login({ username, password }) {
    const resp = await api.post(PATHS.login, { username, password });
    console.log('Login response:', resp);

    // Store user data in AsyncStorage
    if (resp.data?.Data) {
        const userData = resp.data.Data;
        console.log('User data:', userData);
        console.log('🔍 [LOGIN] Full response structure:', JSON.stringify(resp.data, null, 2));

        // UUID (unique user identifier)
        if (userData.UUID) {
            console.log('🔍 [LOGIN] Storing UUID:', userData.UUID);
            await setUUID(userData.UUID);
        } else {
            console.log('🔍 [LOGIN] No UUID found in userData');
        }

        // Check if there are other UUID fields that might be stored
        console.log('🔍 [LOGIN] All UUID fields in userData:');
        Object.keys(userData).forEach(key => {
            if (key.toLowerCase().includes('uuid') || key.toLowerCase().includes('id')) {
                console.log(`  - ${key}:`, userData[key]);
            }
        });
        if (userData.DisplayName) {
            await setDisplayName(userData.DisplayName);
        }
        // Determine active company/env UUIDs
        const role = Array.isArray(userData?.Roles) ? userData.Roles[0] : null;
        const roleCompany = role?.CompanyUUID || null;
        const roleEnv = role?.EnvironmentUUID || null;
        const roleUUID = role?.UUID || null;

        if (roleEnv) await setENVUUID(roleEnv);
        if (roleCompany) await setCMPUUID(roleCompany);
        if (roleUUID) await setRoleUUID(roleUUID);
        const allowedEnv = userData?.Allowed_Environment_UUID || null;
        const allowedCmpRaw = userData?.Allowed_Company_UUID || null;
        const allowedCmpFirst = allowedCmpRaw ? String(allowedCmpRaw).split(',')[0] : null;

        const envToPersist = roleEnv || allowedEnv || null;
        const cmpToPersist = roleCompany || allowedCmpFirst || null;

        if (userData.Allowed_Company_UUID) {
            // If multiple UUIDs are returned (comma separated), split into array
            const companies = userData.Allowed_Company_UUID.split(',').map(uuid => uuid.trim());
            await setAllowedCompanyUUIDs(companies);
        }


        // Role name and menu rights
        if (role?.UserRoleName) {
            await setRoles(role.UserRoleName);
        }
        if (Array.isArray(role?.MenuRights)) {
            await setMenuRights(role.MenuRights);
        }

        // Designation
        if (userData.Designation) {
            await setDesignation(userData.Designation);
        }

        // ReportingDesignation (store UUID for later APIs)
        if (userData.ReportingDesignation) {
            await setReportingDesignation(String(userData.ReportingDesignation));
        }

        // Store roles if available
        if (userData.Roles) {
            await setRoles(userData.Roles);
        }

        // Store display name from login payload (multiple fallbacks)
        const nameFromLogin =
            userData.FullName ||
            userData.Name ||
            (userData.FirstName || userData.Firstname || userData.firstName ? `${userData.FirstName || userData.Firstname || userData.firstName} ${userData.LastName || userData.Lastname || userData.lastName || ''}`.trim() : null) ||
            (userData.BasicInformation?.FullName) ||
            null;
        if (nameFromLogin) {
            await setDisplayName(String(nameFromLogin));
        }
        if (userData.Token) {
            const { AccessToken, RefreshToken } = userData.Token;
            if (AccessToken && RefreshToken) {
                await setTokens({ accessToken: AccessToken, refreshToken: RefreshToken });
            }
        }

        // Register device token after successful login
        try {
            console.log('🔔 [LOGIN] Registering device token after successful login...');
            await sendDeviceToken({
                token: null, // Will be fetched from notificationService
                isLogin: true,
                userUuid: userData.UUID
            });
            console.log('✅ [LOGIN] Device token registered successfully');
        } catch (error) {
            console.error('❌ [LOGIN] Error registering device token:', error);
            // Don't fail login if device token registration fails
        }
    }

    return resp.data;
}

export async function forgotPassword({ email }) {
    const resp = await api.post(PATHS.forgotPassword, { email });
    console.log('Forgot Password response:', resp);
    return resp.data;
}

export async function verifyCode({ email, OtpCode }) {
    const resp = await api.post(PATHS.verifyCode, { Email: email, OtpCode: OtpCode });
    console.log('Verify Code response:', resp);
    return resp.data;
}

export async function resetPassword({ email, newPassword, ConfirmPassword }) {
    console.log('Reset Password request:', { Email: email, NewPassword: newPassword, ConfirmPassword: ConfirmPassword });
    const resp = await api.post(PATHS.resetPassword, { Email: email, NewPassword: newPassword, ConfirmPassword: ConfirmPassword });
    console.log('Reset Password response:', resp);
    return resp.data;
}

export async function getProfile() {
    const userUUID = await getUUID();
    console.log('User UUID:', userUUID);

    try {
        // For GET requests, use params object
        const resp = await api.get(PATHS.profile, {
            params: { userUUID: userUUID || '' }
        });
        console.log('Profile response:', resp);

        // Store profile data in AsyncStorage
        if (resp.data?.Data) {
            await setProfile(resp.data.Data);
        }

        return resp.data;
    } catch (error) {
        console.log('Profile API error:', error);
        console.log('Trying without UUID parameter...');

        // If UUID fails, try without UUID parameter
        if (userUUID) {
            const resp = await api.get(PATHS.profile);
            console.log('Profile response (no UUID):', resp);

            // Store profile data in AsyncStorage
            if (resp.data?.Data) {
                await setProfile(resp.data.Data);
            }

            return resp.data;
        }

        throw error; // Re-throw if no UUID and still fails
    }
}


// Dashboard: Get employee projects with progress (server-side pagination)
export async function getEmployeeProjectsWithProgress({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!userUuid) throw new Error('userUuid is required');
    const params = { cmpUuid, envUuid, userUuid, start, length, searchValue };
    const resp = await api.get(PATHS.employeeProjectsProgress, { params });
    console.log('Employee projects with progress response:', resp);
    return resp.data;
}

// Dashboard: Get holidays (supports server-side pagination)
export async function getHolidays({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!userUuid) throw new Error('userUuid is required');
    // Send multiple casings for compatibility
    const params = {
        cmpUuid, envUuid, userUuid,
        start, Start: start,
        length, Length: length,
        searchValue, SearchValue: searchValue,
    };
    console.log(PATHS.holidays, { params });

    const resp = await api.get(PATHS.holidays, { params });
    console.log('holidays response', resp);
    return resp.data;
}

// Dashboard: Get leaves (supports server-side pagination)
export async function getLeaves({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!userUuid) throw new Error('userUuid is required');
    // Send multiple casings for compatibility
    const params = {
        cmpUuid, envUuid, userUuid,
        start, Start: start,
        length, Length: length,
        searchValue, SearchValue: searchValue,
    };
    const resp = await api.get(PATHS.leaves, { params });
    return resp.data;
}
export async function getHRALeaves({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!userUuid) throw new Error('userUuid is required');
    const params = {
        userUuid, cmpUuid, envUuid,
        start, Start: start,
        length, Length: length,
        searchValue, SearchValue: searchValue,
    };
    const resp = await api.get(PATHS.hraleaves, { params });
    console.log(resp, 'resp');
    return resp.data;
}
export async function getHRAApproveLeaves({ approverDesignationUuid, cmpUuid, envUuid } = {}) {
    if (!cmpUuid || !envUuid || !approverDesignationUuid) {
        const [c, e, r] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            approverDesignationUuid || getReportingDesignation(),
        ]);
        cmpUuid = c; envUuid = e; approverDesignationUuid = u;
    }
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!approverDesignationUuid) throw new Error('approverDesignationUuid is required');
    const params = { approverDesignationUuid, cmpUuid, envUuid };
    const resp = await api.get(PATHS.ApproveLeaves, { params });
    console.log(resp, 'resp');

    return resp.data;
}

// HRA: Approve or Reject Leave
export async function approveOrRejectLeave({ headUuid, remark = '', action }, overrides = {}) {
    if (!headUuid) throw new Error('headUuid is required');
    if (!action) throw new Error('action is required');
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const payload = {
        HeadUuid: headUuid,
        CmpUuid: cmpUuid,
        EnvUuid: envUuid,
        UserUuid: userUuid,
        Remark: String(remark || ''),
        Action: String(action), // 'Approve' | 'Reject'
    };
    console.log(payload, 'payload');
    const resp = await api.post(PATHS.approveOrRejectLeave, payload);
    console.log(resp, 'approveOrRejectLeave');
    return resp.data;
}

// HRA: Get Manage Leave list (admin/approver view)
export async function getManageLeave({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!userUuid) throw new Error('userUuid is required');
    // Support multiple casings per backend conventions
    const params = {
        cmpUuid, envUuid, userUuid,
        start, Start: start,
        length, Length: length,
        searchValue, SearchValue: searchValue,
    };
    console.log('GetManageLeave params ->', params);
    const resp = await api.get(PATHS.getManageLeave, { params })
    console.log('GetManageLeave response ->', resp);
    return resp.data;
}
// Dashboard: Get Pending Timesheets
export async function getPendingTimesheets() {
    const [userUuid, cmpUuid, envUuid] = await Promise.all([
        getUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);

    if (!userUuid) throw new Error('userUuid is required');
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');

    const params = { userUuid, cmpUuid, envUuid };
    const resp = await api.get(PATHS.pendingTimesheets, { params });
    return resp.data;
}


// Business Development: Get won leads with pagination
export async function getWonLeads({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        throw new Error('cmpUuid, envUuid and userUuid are required');
    }
    const params = {
        cmpUuid,
        envUuid,
        userUuid,
        start,
        length,
        searchValue
    };
    const resp = await api.get(PATHS.wonLeads, { params });
    console.log('Get won leads response:', resp);
    return resp.data
}

// Business Development: Update Lead Status
export async function updateLeadStatus({ leadUuid, status, nextAction, actionDueDate }, overrides = {}) {
    if (!leadUuid) throw new Error('Missing leadUuid');
    if (!status) throw new Error('Missing status');

    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),

        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }

    // Params must be passed as: { leadUuid, envuuid, cmpuuid, useruuid }
    const params = { uuid: leadUuid, envuuid: envUuid, cmpuuid: cmpUuid, useruuid: userUuid };
    console.log('Update Lead Status params:', params);
    const payload = {
        Status: status, // 'won' | 'lost'
        NextAction: nextAction || '',
        ActionDueDate: "2025-09-30",
    };
    console.log('Update Lead Status payload:', payload);


    const resp = await api.post(PATHS.updateLeadStatus, payload, { params });
    return resp.data;
}

// Business Development: Save Manage Lead Opportunity
export async function saveManageLeadOpportunity(payload, overrides = {}) {
    console.log('Save Manage Lead Opportunity payload:', payload);
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    if (!userUuid) throw new Error('Missing user UUID');
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    const params = { userUuid, cmpUuid, envUuid };
    const resp = await api.post(
        PATHS.saveLeadOpportunity || '/api/BusinessDevelopment/AddManageLeadOpportunity',
        payload,
        { params }
    );
    console.log('Save Manage Lead Opportunity response:', resp);
    return resp.data;
}

// Business Development: Update Manage Lead Opportunity
export async function updateManageLeadOpportunity(payload, overrides = {}) {
    const userIp = await getLocalIp();
    console.log('Update Manage Lead Opportunity payload:', payload);
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    if (!userUuid) throw new Error('Missing user UUID');
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    const params = { uuid: payload.uuid, cmpUuid, envUuid, userUuid, userIp: userIp };
    const resp = await api.post(PATHS.updateManageLeadOpportunity,
        payload,
        { params }
    );
    console.log('Update Manage Lead Opportunity response:', resp);
    return resp.data;
}

// Business Development: Add Lead Proposal
export async function addLeadProposal({ leadOppUuid, payload, overrides = {} }) {
    const userIp = await getLocalIp();
    if (!leadOppUuid) throw new Error('Missing leadOppUuid');
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { leadOppUuid, cmpUuid, envUuid, userUuid, userIp: userIp };
    console.log('Add Lead Proposal params:', params);
    console.log('Add Lead Proposal payload:', payload);

    // Build multipart form body
    const form = new FormData();
    const appendIfDefined = (key, value) => {
        if (value === undefined || value === null) return;
        form.append(key, String(value));
    };
    appendIfDefined('Proposal_Number', payload?.Proposal_Number);
    appendIfDefined('Title', payload?.Title);
    appendIfDefined('Customer_Name', payload?.Customer_Name);
    appendIfDefined('Followup_Taker_Name', payload?.Followup_Taker_Name);
    appendIfDefined('Followup_Date', payload?.Followup_Date);
    appendIfDefined('Submitted_Date', payload?.Submitted_Date);
    appendIfDefined('Amount', payload?.Amount);
    appendIfDefined('FinalProposal', payload?.FinalProposal);

    // File support: prefer { uri, name, type } else fallback to string
    const fileObj = payload?.ProposalDocumentFile;
    if (fileObj?.uri && fileObj?.name) {
        form.append('ProposalDocument', {
            uri: fileObj.uri,
            name: fileObj.name,
            type: fileObj.type || 'application/octet-stream',
        });
    } else if (payload?.ProposalDocument) {
        appendIfDefined('ProposalDocument', payload?.ProposalDocument);
    }
    console.log(payload, '222');
    const resp = await api.post(PATHS.addLeadProposal, form, { params, headers: { 'Content-Type': 'multipart/form-data' } });
    console.log('Add Lead Proposal response:', resp);
    return resp.data;
}

// Business Development: Update Lead Proposal
export async function updateLeadProposal({ proposalUuid, leadUuid, payload, overrides = {} }) {
    const userIp = await getLocalIp();
    if (!proposalUuid) throw new Error('Missing proposalUuid');
    if (!leadUuid) throw new Error('Missing leadUuid');
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { uuid: proposalUuid, leadOppUuid: leadUuid, cmpUuid, envUuid, userUuid, userIp: userIp };
    console.log('Update Lead Proposal params:', params);
    console.log('Update Lead Proposal payload:', payload);

    // Build multipart form body for update
    const form = new FormData();
    const appendIfDefined = (key, value) => {
        if (value === undefined || value === null) return;
        form.append(key, String(value));
    };
    appendIfDefined('Proposal_Number', payload?.Proposal_Number);
    appendIfDefined('Title', payload?.Title);
    appendIfDefined('Customer_Name', payload?.Customer_Name);
    appendIfDefined('Followup_Taker_Name', payload?.Followup_Taker_Name);
    appendIfDefined('Followup_Date', payload?.Followup_Date);
    appendIfDefined('Submitted_Date', payload?.Submitted_Date);
    appendIfDefined('Amount', payload?.Amount);
    appendIfDefined('FinalProposal', payload?.FinalProposal);

    // File support: prefer { uri, name, type } else fallback to string
    const fileObj = payload?.ProposalDocumentFile;
    if (fileObj?.uri && fileObj?.name) {
        form.append('ProposalDocument', {
            uri: fileObj.uri,
            name: fileObj.name,
            type: fileObj.type || 'application/octet-stream',
        });
    } else if (payload?.ProposalDocument) {
        appendIfDefined('ProposalDocument', payload?.ProposalDocument);
    }

    const resp = await api.post(PATHS.updateLeadProposal, form, { params, headers: { 'Content-Type': 'multipart/form-data' } });
    console.log('Update Lead Proposal response:', resp);
    return resp.data;
}

// Business Development: Add Lead Follow-Up
export async function addLeadFollowUp({ leadOppUuid, payload, overrides = {} }) {
    const userIp = await getLocalIp();
    if (!leadOppUuid) throw new Error('Missing leadOppUuid');
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { leadOppUuid, cmpUuid, envUuid, userUuid, userIp: userIp };
    console.log('Add Lead Follow-Up params:', params);
    console.log('Add Lead Follow-Up payload:', payload);
    const resp = await api.post(PATHS.addLeadFollowUp, payload, { params });
    console.log('Add Lead Follow-Up response:', resp);
    return resp.data;
}

// Business Development: Update Lead Follow-Up (PUT)
export async function updateLeadFollowUp({ followupUuid, payload, overrides = {} }) {
    const userIp = await getLocalIp();
    if (!followupUuid) throw new Error('Missing followupUuid');
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { followupUuid, cmpUuid, envUuid, userUuid, userIp: userIp };
    console.log('Update Lead Follow-Up params:', params);
    console.log('Update Lead Follow-Up payload:', payload);
    const resp = await api.post(PATHS.addLeadUpdateFollowUp, payload, { params });
    console.log('Update Lead Follow-Up response:', resp);
    return resp.data;
}

// Business Development: Delete Follow-Up (DELETE)
export async function deleteLeadFollowUp({ followupUuid, overrides = {} }) {
    const userIp = await getLocalIp();
    if (!followupUuid) throw new Error('Missing followupUuid');
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { followupUuid, cmpUuid, envUuid, userUuid, userIp: userIp };
    console.log('Delete Follow-Up params:', params);
    const resp = await api.delete(PATHS.deleteLeadFollowUp, { params });
    console.log('Delete Follow-Up response:', resp);
    return resp.data;
}

// Business Development: Delete Lead Proposal (DELETE)
export async function deleteLeadProposal({ leadOppUuid, overrides = {} }) {
    const userIp = await getLocalIp();
    if (!leadOppUuid) throw new Error('Missing leadOppUuid');
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { leadOppUuid, cmpUuid, envUuid, userUuid, userIp: userIp };
    console.log('Delete Lead Proposal params:', params);
    const resp = await api.delete(PATHS.deleteLeadProposal, { params });
    console.log('Delete Lead Proposal response:', resp);
    return resp.data;
}

// Business Development: Delete Lead (DELETE)
export async function deleteLead({ uuid, overrides = {} }) {
    const userIp = await getLocalIp();
    if (!uuid) throw new Error('Missing uuid');
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { uuid, cmpUuid, envUuid, userUuid, userIp: userIp };
    console.log('Delete Lead params:', params);
    const resp = await api.delete(PATHS.deleteLead, { params });
    console.log('Delete Lead response:', resp);
    return resp.data;
}

// Business Development: Get Follow-Ups by Lead
export async function getFollowUpsByLead({ leadUuid, overrides = {} }) {
    if (!leadUuid) throw new Error('Missing leadUuid');
    let { cmpUuid, envUuid } = overrides || {};
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    const params = { envUuid: envUuid, cmpUuid: cmpUuid, leadUuid: leadUuid };
    console.log('Get Follow-Ups by Lead params:', params);
    const url = `${PATHS.getLeadFollowUps}`;
    const resp = await api.get(url, { params });
    console.log('Get Follow-Ups by Lead response:', resp);
    return resp.data;
}

// Business Development: Get Lead Proposals List (supports pagination)
export async function getLeadProposalsList({ leadUuid, start = 0, length = 10, searchValue = '', overrides = {} }) {
    if (!leadUuid) throw new Error('Missing leadUuid');
    let { cmpUuid, envUuid } = overrides || {};
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    // Send multiple casings for compatibility
    const params = {
        envUuid: envUuid,
        cmpUuid: cmpUuid,
        leadOppUuid: leadUuid,
        start, Start: start,
        length, Length: length,
        searchValue, SearchValue: searchValue,
    };
    console.log('Get Lead Proposals List params:', params);
    const resp = await api.get(PATHS.getLeadProposalsList, { params });
    console.log('Get Lead Proposals List response:', resp);
    return resp.data;
}

// HRA: Apply Leave
export async function applyLeave({
    leaveType,
    parameter,
    fromDate,
    toDate,
    reason,
    contactNo,
}) {
    // Collect required user context
    const [userUuid, cmpUuid, envUuid] = await Promise.all([
        getUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);
    if (!userUuid) throw new Error('Missing user UUID');
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    // Map to backend-required payload shape
    const payload = {
        UUID: "",
        LeaveStartDate: new Date(fromDate).toISOString(),
        LeaveEndDate: new Date(toDate).toISOString(),
        LeaveTypeUUID: leaveType, // assuming value is a UUID; adjust if using name/id mapping
        LeaveParameter: parameter,
        Reason: reason,
        ContactNumber: contactNo ? Number(String(contactNo).replace(/\D/g, '')) : 0,
    };
    console.log('Apply Leave payload:', payload);
    const resp = await api.post(
        PATHS.applyLeave,
        payload,
        { params: { userUuid, cmpUuid, envUuid } }
    );
    return resp.data;
}

// Expenses/Projects APIs (moved here per request)
export async function fetchExpenses({ start = 0, length = 10, searchValue = '' } = {}) {
    const [empUuid, selectedCmpUuid, selectedEnvUuid, userCmpUuid, userEnvUuid] = await Promise.all([
        getUUID(),
        getSelectedCompanyUUID(),
        getSelectedEnvironmentUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);

    // Use selected UUIDs if available (admin), otherwise fallback to user's assigned UUIDs
    const cmpUuid = selectedCmpUuid || userCmpUuid;
    const envUuid = selectedEnvUuid || userEnvUuid;

    const resp = await api.get(PATHS.expenses, {
        params: {
            empUuid: empUuid || '',
            cmpUuid: cmpUuid || '',
            envUuid: envUuid || '',
            // Pagination & search (support multiple casings as some endpoints vary)
            start,
            Start: start,
            length,
            Length: length,
            searchValue,
            SearchValue: searchValue,
        },
    });
    return resp.data;
}
export async function fetchProjects() {
    const [selectedCmpUuid, selectedEnvUuid, userCmpUuid, userEnvUuid] = await Promise.all([
        getSelectedCompanyUUID(),
        getSelectedEnvironmentUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);

    // Use selected UUIDs if available (admin), otherwise fallback to user's assigned UUIDs
    const cmpUuid = selectedCmpUuid || userCmpUuid;
    const envUuid = selectedEnvUuid || userEnvUuid;

    const resp = await api.get(PATHS.projects, {
        params: {
            cmpUuid: cmpUuid || '',
            envUuid: envUuid || '',
        },
    });
    return resp.data;
}

export async function fetchProjectTasks({ projectUuid }) {
    const [selectedCmpUuid, selectedEnvUuid, userCmpUuid, userEnvUuid] = await Promise.all([
        getSelectedCompanyUUID(),
        getSelectedEnvironmentUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);

    // Use selected UUIDs if available (admin), otherwise fallback to user's assigned UUIDs
    const cmpUuid = selectedCmpUuid || userCmpUuid;
    const envUuid = selectedEnvUuid || userEnvUuid;

    const resp = await api.get(PATHS.projectTasks, {
        params: {
            cmpUuid: cmpUuid || '',
            envUuid: envUuid || '',
            projectUuid: projectUuid || '',
        },
    });
    return resp.data;
}

// New API: Get user projects
export async function fetchUserProjects({ cmpUuid, envUuid, userUuid } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');
    if (!userUuid) throw new Error('Missing user UUID');

    const params = { cmpUuid, envUuid, userUuid };
    const fullUrl = `${api.defaults.baseURL}${PATHS.userProjects}`;

    console.log('🌐 [fetchUserProjects] Request URL:', fullUrl);
    console.log('📋 [fetchUserProjects] Request Parameters:', params);
    console.log('🔗 [fetchUserProjects] Full Request URL:', `${fullUrl}?${new URLSearchParams(params).toString()}`);

    const resp = await api.get(PATHS.userProjects, { params });

    console.log('✅ [fetchUserProjects] Response Status:', resp.status);
    console.log('📥 [fetchUserProjects] Response Headers:', resp.headers);
    console.log('📊 [fetchUserProjects] Response Data:', JSON.stringify(resp.data, null, 2));
    console.log('📈 [fetchUserProjects] Response Data Type:', typeof resp.data);

    return resp.data;
}

// New API: Get user project tasks
export async function fetchUserProjectTasks({ cmpUuid, envUuid, userUuid, projectUuid } = {}) {
    if (!cmpUuid || !envUuid || !userUuid || !projectUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');
    if (!userUuid) throw new Error('Missing user UUID');
    if (!projectUuid) throw new Error('Missing project UUID');

    const params = { cmpUuid, envUuid, userUuid, projectUuid };
    const fullUrl = `${api.defaults.baseURL}${PATHS.userProjectTasks}`;

    console.log('🌐 [fetchUserProjectTasks] Request URL:', fullUrl);
    console.log('📋 [fetchUserProjectTasks] Request Parameters:', params);
    console.log('🔗 [fetchUserProjectTasks] Full Request URL:', `${fullUrl}?${new URLSearchParams(params).toString()}`);

    const resp = await api.get(PATHS.userProjectTasks, { params });

    console.log('✅ [fetchUserProjectTasks] Response Status:', resp.status);
    console.log('📥 [fetchUserProjectTasks] Response Headers:', resp.headers);
    console.log('📊 [fetchUserProjectTasks] Response Data:', JSON.stringify(resp.data, null, 2));
    console.log('📈 [fetchUserProjectTasks] Response Data Type:', typeof resp.data);

    return resp.data;
}

export async function fetchExpenseTypes() {
    const [selectedCmpUuid, selectedEnvUuid, userCmpUuid, userEnvUuid] = await Promise.all([
        getSelectedCompanyUUID(),
        getSelectedEnvironmentUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);

    // Use selected UUIDs if available (admin), otherwise fallback to user's assigned UUIDs
    const cmpUuid = selectedCmpUuid || userCmpUuid;
    const envUuid = selectedEnvUuid || userEnvUuid;

    const resp = await api.get(PATHS.expenseTypes, {
        params: {
            cmpUuid: cmpUuid || '',
            envUuid: envUuid || '',
        },
    });
    return resp.data;
}

export async function fetchExpenseUnits() {
    const [selectedCmpUuid, selectedEnvUuid, userCmpUuid, userEnvUuid] = await Promise.all([
        getSelectedCompanyUUID(),
        getSelectedEnvironmentUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);
    const cmpUuid = selectedCmpUuid || userCmpUuid;
    const envUuid = selectedEnvUuid || userEnvUuid;

    const resp = await api.get(PATHS.expenseUnits, {
        params: {
            cmpUuid: cmpUuid || '',
            envUuid: envUuid || '',
        },
    });
    return resp.data;
}

// Expenses: Add Expense Line
export async function addExpenseLine(payload, overrides = {}) {
    let { cmpUuid, envUuid, userUuid } = overrides || {};
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }

    // Many backends expect multipart/form-data for line items
    const form = new FormData();
    const append = (k, v) => {
        if (v === undefined || v === null) return;
        form.append(k, String(v));
    };
    const toYmd = (val) => {
        if (!val) return '';
        try {
            const d = val instanceof Date ? val : new Date(val);
            if (isNaN(d.getTime())) return '';
            const yy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yy}-${mm}-${dd}`;
        } catch (_e) { return ''; }
    };
    const toIntegerString = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const num = parseInt(String(val).replace(/[,\s]/g, ''), 10);
        return Number.isFinite(num) ? String(num) : '';
    };
    const toNumberString = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const num = parseFloat(String(val).replace(/,/g, '.'));
        return Number.isFinite(num) ? String(num) : '';
    };
    // Required header/context and user fields
    append('UUID', payload?.UUID ?? '');
    append('Master_Company_UUID', payload?.Master_Company_UUID || cmpUuid || '');
    append('Master_Environment_UUID', payload?.Master_Environment_UUID || envUuid || '');
    append('ERExpenseHeader_UUID', payload?.ERExpenseHeader_UUID ?? '');
    append('UserUUID', payload?.UserUUID || userUuid || '');

    // Line fields with exact backend keys (ensure backend-compatible types)
    append('UnitType_UUID', payload?.UnitType_UUID ?? '');
    append('UnitCost', toNumberString(payload?.UnitCost));
    append('Quantity', toIntegerString(payload?.Quantity));
    append('TaxAmount', toNumberString(payload?.TaxAmount));
    append('Document_Date', toYmd(payload?.Document_Date));
    append('BillUrl', payload?.BillUrl ?? '');
    append('Expense_Remarks', payload?.Expense_Remarks ?? '');

    // Optional file attachment
    const fileObj = payload?.documentFile;
    if (fileObj?.uri && fileObj?.name) {
        form.append('documentFile', {
            uri: fileObj.uri,
            name: fileObj.name,
            type: fileObj.type || 'application/octet-stream',
        });
    }

    const params = { userUuid: userUuid || '', cmpUuid: cmpUuid || '', envUuid: envUuid || '' };
    try { console.log('[Expense] POST', PATHS.expenseLines, 'params:', params); } catch (_e) { }
    const resp = await api.post(PATHS.expenseLines, form, { params, headers: { 'Content-Type': 'multipart/form-data' } });
    try { console.log('[Expense] POST resp for', PATHS.expenseLines, '->', resp?.data); } catch (_e) { }
    return resp.data;
}

// Expenses: Update Expense Line (multipart/form-data)
export async function updateExpenseLine(payload, overrides = {}) {
    let { cmpUuid, envUuid, userUuid } = overrides || {};
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }

    const form = new FormData();
    const append = (k, v) => {
        if (v === undefined || v === null) return;
        form.append(k, String(v));
    };
    const toYmd = (val) => {
        if (!val) return '';
        try {
            const d = val instanceof Date ? val : new Date(val);
            if (isNaN(d.getTime())) return '';
            const yy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yy}-${mm}-${dd}`;
        } catch (_e) { return ''; }
    };
    const toIntegerString = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const num = parseInt(String(val).replace(/[\,\s]/g, ''), 10);
        return Number.isFinite(num) ? String(num) : '';
    };
    const toNumberString = (val) => {
        if (val === undefined || val === null || val === '') return '';
        const num = parseFloat(String(val).replace(/,/g, '.'));
        return Number.isFinite(num) ? String(num) : '';
    };

    append('UUID', payload?.UUID ?? '');
    append('Master_Company_UUID', payload?.Master_Company_UUID || cmpUuid || '');
    append('Master_Environment_UUID', payload?.Master_Environment_UUID || envUuid || '');
    append('ERExpenseHeader_UUID', payload?.ERExpenseHeader_UUID ?? '');
    append('UserUUID', payload?.UserUUID || userUuid || '');
    append('UnitType_UUID', payload?.UnitType_UUID ?? '');
    append('UnitCost', toNumberString(payload?.UnitCost));
    append('Quantity', toIntegerString(payload?.Quantity));
    append('TaxAmount', toNumberString(payload?.TaxAmount));
    append('Document_Date', toYmd(payload?.Document_Date));
    append('BillUrl', payload?.BillUrl ?? '');
    append('Expense_Remarks', payload?.Expense_Remarks ?? '');

    const fileObj = payload?.documentFile;
    if (fileObj?.uri && fileObj?.name) {
        form.append('documentFile', {
            uri: fileObj.uri,
            name: fileObj.name,
            type: fileObj.type || 'application/octet-stream',
        });
    }

    const params = { userUuid: userUuid || '', cmpUuid: cmpUuid || '', envUuid: envUuid || '' };
    try {
        const debugPayload = {
            UUID: payload?.UUID ?? '',
            Master_Company_UUID: payload?.Master_Company_UUID || cmpUuid || '',
            Master_Environment_UUID: payload?.Master_Environment_UUID || envUuid || '',
            ERExpenseHeader_UUID: payload?.ERExpenseHeader_UUID ?? '',
            UserUUID: payload?.UserUUID || userUuid || '',
            UnitType_UUID: payload?.UnitType_UUID ?? '',
            UnitCost: payload?.UnitCost,
            Quantity: payload?.Quantity,
            TaxAmount: payload?.TaxAmount,
            Document_Date: payload?.Document_Date,
            BillUrl: payload?.BillUrl ?? '',
            Expense_Remarks: payload?.Expense_Remarks ?? '',
            documentFile: fileObj?.uri ? { name: fileObj?.name, type: fileObj?.type, uri: fileObj?.uri } : undefined,
            // params
        };
        // Log a safe, readable snapshot of the PUT payload
        console.log('[Expense] PUT payload (update line):', JSON.stringify(debugPayload, null, 2));
    } catch (_) { }
    console.log(form, '0091')
    const resp = await api.post(
        PATHS.expenseUpdateLines,
        form,
        { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    try { console.log('[Expense] Update-lines resp:', resp?.status, resp?.data); } catch (_) { }
    return resp.data;
}

// Expenses: Get lines for a header
export async function fetchExpenseLinesByHeader({ headerUuid }, overrides = {}) {
    if (!headerUuid) throw new Error('Missing headerUuid');
    let { cmpUuid, envUuid } = overrides || {};
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    const params = { headerUuid, cmpUuid: cmpUuid || '', envUuid: envUuid || '' };
    const url = PATHS.expenseGetLinesByHeader;
    try { console.log('[Expense] GET', url, 'params:', params); } catch (_e) { }
    const resp = await api.get(url, { params });
    try { console.log('[Expense] GET resp for', url, '->', resp?.data); } catch (_e) { }
    return resp.data;
}

// Expenses: Delete line by UUID (path), with cmp/env/user as query params
export async function deleteExpenseLine({ lineUuid }, overrides = {}) {
    if (!lineUuid) throw new Error('Missing lineUuid');
    let { cmpUuid, envUuid, userUuid } = overrides || {};
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    const params = { cmpUuid: cmpUuid || '', envUuid: envUuid || '', userUuid: userUuid || '' };
    const url = `${PATHS.expenseLines}/${encodeURIComponent(lineUuid)}`;
    try { console.log('[Expense] DELETE line', url, 'params:', params); } catch (_e) { }
    const resp = await api.delete(url, { params });
    return resp.data;
}

export async function fetchCurrencies({ countryUuid } = {}) {
    const [selectedCmpUuid, selectedEnvUuid, userCmpUuid, userEnvUuid] = await Promise.all([
        getSelectedCompanyUUID(),
        getSelectedEnvironmentUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);

    // Use selected UUIDs if available (admin), otherwise fallback to user's assigned UUIDs
    const cmpUuid = selectedCmpUuid || userCmpUuid;
    const envUuid = selectedEnvUuid || userEnvUuid;

    if (!countryUuid) {
        throw new Error('countryUuid is required for fetching currencies');
    }

    const resp = await api.get(PATHS.currencies, {
        params: {
            cmpUuid: cmpUuid || '',
            envUuid: envUuid || '',
            countryUuid: countryUuid,
        },
    });
    return resp.data;
}

// Expenses: Check if user can add expense (guard before navigation)
export async function checkAddExpenseEligibility(overrides = {}) {
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { userUuid: userUuid || '', cmpUuid: cmpUuid || '', envUuid: envUuid || '' };
    const resp = await api.get(PATHS.addExpenseEligibility, { params });
    return resp.data;
}

// Timesheet: Check if user can add timesheet (guard before navigation)
export async function checkAddTimesheetEligibility(overrides = {}) {
    let { userUuid, cmpUuid, envUuid } = overrides || {};
    if (!userUuid || !cmpUuid || !envUuid) {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
    }
    const params = { userUuid: userUuid || '', cmpUuid: cmpUuid || '', envUuid: envUuid || '' };
    const resp = await api.get(PATHS.addTimesheetEligibility, { params });
    return resp.data;
}

// Expenses: Add Expense Header
export async function addExpenseHeader(payload, overrides = {}) {
    // Ensure required UUIDs are present; fill from storage if missing
    let { cmpUuid, envUuid, userUuid } = overrides || {};
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }

    const body = {
        UUID: payload?.UUID ?? '',
        Master_Company_UUID: payload?.Master_Company_UUID || cmpUuid || '',
        Master_Environment_UUID: payload?.Master_Environment_UUID || envUuid || '',
        Project_UUID: payload?.Project_UUID || '',
        ProjectTask_UUID: payload?.ProjectTask_UUID || '',
        Doc_Date_From: payload?.Doc_Date_From || '',
        Doc_Date_To: payload?.Doc_Date_To || '',
        ExpenseType_UUID: payload?.ExpenseType_UUID || '',
        Country_UUID: payload?.Country_UUID || '',
        State_UUID: payload?.State_UUID || '',
        City_UUID: payload?.City_UUID || '',
        Currency_UUID: payload?.Currency_UUID || '',
        IsDisplay: payload?.IsDisplay ?? true,
    };

    if (payload?.OtherFields !== undefined) {
        body.OtherFields = payload.OtherFields;
    }

    const params = { userUuid: userUuid || '', cmpUuid: cmpUuid || '', envUuid: envUuid || '' };
    const resp = await api.post(PATHS.addExpenseHeader, body, { params });
    return resp.data;
}

// Expenses: Update Expense Header
export async function updateExpenseHeader(payload, overrides = {}) {
    // Ensure required UUIDs are present; fill from storage if missing
    let { cmpUuid, envUuid, userUuid } = overrides || {};
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }

    const body = {
        UUID: payload?.UUID || payload?.Header_UUID || payload?.headerUuid || '',
        Master_Company_UUID: payload?.Master_Company_UUID || cmpUuid || '',
        Master_Environment_UUID: payload?.Master_Environment_UUID || envUuid || '',
        Project_UUID: payload?.Project_UUID || '',
        ProjectTask_UUID: payload?.ProjectTask_UUID || '',
        Doc_Date_From: payload?.Doc_Date_From || '',
        Doc_Date_To: payload?.Doc_Date_To || '',
        ExpenseType_UUID: payload?.ExpenseType_UUID || '',
        Country_UUID: payload?.Country_UUID || '',
        State_UUID: payload?.State_UUID || '',
        City_UUID: payload?.City_UUID || '',
        Currency_UUID: payload?.Currency_UUID || '',
        IsApprovalApply: payload?.IsApprovalApply ?? false,
        IsDisplay: payload?.IsDisplay ?? true,
        OtherFields: payload?.OtherFields ?? '',
        UserUUID: payload?.UserUUID || userUuid || '',
    };

    const resp = await api.post(PATHS.updateExpenseHeader, body);
    return resp.data;
}
export async function fetchDashboardMyWorklistProjects() {
    const [superAdminUuid, selectedCmpUuid, selectedEnvUuid, userCmpUuid, userEnvUuid] = await Promise.all([
        getUUID(),
        getSelectedCompanyUUID(),
        getSelectedEnvironmentUUID(),
        getCMPUUID(),
        getENVUUID(),
    ]);

    // Use selected UUIDs if available (admin), otherwise fallback to user's assigned UUIDs
    const cmpUuid = selectedCmpUuid || userCmpUuid;
    const envUuid = selectedEnvUuid || userEnvUuid;

    try { console.log('[Dashboard] fetch helper params -> cmpUuid:', cmpUuid, 'envUuid:', envUuid, 'superAdminUuid:', superAdminUuid); } catch (_e) { }
    const resp = await api.get(PATHS.dashboardMyWorklistProjects, {
        params: {
            cmpUuid: cmpUuid || '',
            envUuid: envUuid || '',
            superAdminUuid: superAdminUuid || '',
        },
    });
    return resp.data;
}


// Company Setup: Get Countries
export async function getCountries({ cmpUuid, envUuid } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    const params = { cmpUuid, envUuid };
    const resp = await api.get(PATHS.getCountries, { params });
    return resp.data;
}

// Company Setup: Get States
export async function getStates({ cmpUuid, countryUuid, envUuid } = {}) {
    if (!cmpUuid || !countryUuid || !envUuid) {
        const [c, e] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!countryUuid) throw new Error('Missing country UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    // Backend expects key 'CountryUuid'
    const params = { cmpUuid, CountryUuid: countryUuid, envUuid };
    const resp = await api.get(PATHS.getStates, { params });
    return resp.data;
}

// Company Setup: Get Cities
export async function getCities({ stateUuid, cmpUuid, envUuid } = {}) {
    if (!stateUuid || !cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    if (!stateUuid) throw new Error('Missing state UUID');
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    // Backend expects keys 'stateuuid' and 'cmpuuid'
    const params = { stateuuid: stateUuid, cmpuuid: cmpUuid, envUuid };
    console.log('Cities API params:', params);
    const resp = await api.get(PATHS.getCities, { params });
    console.log('Cities API response:', resp.data);
    return resp.data;
}

// Company Setup: Get Employees (for Opportunity Owner From KSP)
export async function getEmployees({ companyUuid, envUuid } = {}) {
    if (!companyUuid || !envUuid) {
        const [c, e] = await Promise.all([
            companyUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        companyUuid = c; envUuid = e;
    }
    if (!companyUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    const params = { companyUuid, envUuid };
    console.log(PATHS.getEmployees, { params }, params);

    const resp = await api.get(PATHS.getEmployees, { params });
    console.log('Get Employees response:', resp);

    return resp.data;
}

// HRA: Get Attendance Data for Bulk Attendance
export async function getAttendance({ cmpUuid, envUuid, userUuid, date } = {}) {
    if (!cmpUuid || !envUuid || !userUuid || !date) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');
    if (!userUuid) throw new Error('Missing user UUID');
    if (!date) throw new Error('Missing date');

    const params = { cmpUuid, envUuid, date };
    console.log(PATHS.getAttendance, { params }, params);

    const resp = await api.get(PATHS.getAttendance, { params });
    console.log('Get Attendance response:', resp);

    return resp.data;
}

// Timesheet: Get Not Approved Timesheets
export async function getNotApprovedTimesheets({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');
    if (!userUuid) throw new Error('Missing user UUID');

    // Send multiple casings in case backend expects specific keys
    const params = {
        cmpUuid,
        envUuid,
        userUuid,
        start, Start: start,
        length, Length: length,
        searchValue, SearchValue: searchValue,
    };
    try { console.log('Getting not approved timesheets with params:', params); } catch (_) { }

    const resp = await api.get(PATHS.notApprovedTimesheets, { params });
    try { console.log('Not approved timesheets response:', JSON.stringify(resp?.data, null, 2)); } catch (_) { }

    return resp.data;
}


// Dashboard: Get Employee Dashboard Data
export async function getEmployeeDashboard({ cmpUuid, envUuid, userUuid } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');
    if (!userUuid) throw new Error('Missing user UUID');

    const params = { cmpUuid, envUuid, userUuid };
    console.log('🔍 [getEmployeeDashboard] Request params:', params);
    console.log('🔍 [getEmployeeDashboard] API endpoint:', PATHS.employeeDashboard);

    // Debug: Check if we have access token
    try {
        const token = await getAccessToken();
        console.log('🔍 [getEmployeeDashboard] Access token present:', !!token);
        if (token) {
            console.log('🔍 [getEmployeeDashboard] Token preview:', token.substring(0, 20) + '...');
        }
    } catch (e) {
        //console.error('❌ [getEmployeeDashboard] Error getting access token:', e);
    }

    // Debug: Check what company UUID will be added by interceptor
    try {
        const selectedCompanyUUID = await getSelectedCompanyUUID();
        console.log('🔍 [getEmployeeDashboard] Selected company UUID:', selectedCompanyUUID);
        if (selectedCompanyUUID) {
            //console.log('🔍 [getEmployeeDashboard] Company UUID will be added to request');
        } else {
            //console.log('⚠️ [getEmployeeDashboard] No company UUID selected - this might cause issues');
        }
    } catch (e) {
        //console.error('❌ [getEmployeeDashboard] Error getting company UUID:', e);
    }

    const resp = await api.get(PATHS.employeeDashboard, { params });
    console.log('✅ [getEmployeeDashboard] Response status:', resp.status);
    console.log('📥 [getEmployeeDashboard] Response data:', resp.data);

    return resp.data;
}

// Timesheet: Get Approved Timesheets with pagination/search/sort
export async function getApprovedTimesheets({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '', sortColumn = 'FromDate' } = {}) {
    // Resolve missing IDs from storage
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!userUuid) throw new Error('userUuid is required');

    const params = { cmpUuid, envUuid, userUuid, start, length, searchValue, sortColumn };
    try {
        const fullUrl = `${api.defaults.baseURL}${PATHS.approvedTimesheets}`;
        console.log('🌐 [getApprovedTimesheets] Request URL:', fullUrl);
        console.log('📋 [getApprovedTimesheets] Request Parameters:', params);
        console.log('🔗 [getApprovedTimesheets] Full Request URL:', `${fullUrl}?${new URLSearchParams(params).toString()}`);
    } catch (_) { }

    const resp = await api.get(PATHS.approvedTimesheets, { params });
    console.log('✅ [getApprovedTimesheets] Response Status:', resp.status);
    // Some endpoints wrap in Data; return raw and let caller map
    return resp.data;
}

// Timesheet: Get Submitted & Pending Timesheets with pagination
export async function getSubmittedAndPendingTimesheets({ cmpUuid, envUuid, userUuid, start = 0, length = 10 } = {}) {
    // Resolve missing IDs from storage
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c; envUuid = e; userUuid = u;
    }
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!userUuid) throw new Error('userUuid is required');

    const params = { cmpUuid, envUuid, userUuid, start, length };
    try {
        const fullUrl = `${api.defaults.baseURL}${PATHS.submittedAndPendingTimesheets}`;
        console.log('🌐 [getSubmittedAndPendingTimesheets] Request URL:', fullUrl);
        console.log('📋 [getSubmittedAndPendingTimesheets] Request Parameters:', params);
        console.log('🔗 [getSubmittedAndPendingTimesheets] Full Request URL:', `${fullUrl}?${new URLSearchParams(params).toString()}`);
    } catch (_) { }

    const resp = await api.get(PATHS.submittedAndPendingTimesheets, { params });
    console.log('✅ [getSubmittedAndPendingTimesheets] Response Status:', resp.status);
    console.log('📥 [getSubmittedAndPendingTimesheets] Raw Response Data:', JSON.stringify(resp.data, null, 2));
    return resp.data;
}

// HRA: Submit Attendance
export async function submitAttendance(payload, overrides = {}) {
    console.log('Submitting attendance with payload:', JSON.stringify(payload, null, 2));

    try {
        let { userUuid, cmpUuid, envUuid } = overrides || {};
        if (!userUuid || !cmpUuid || !envUuid) {
            const [u, c, e] = await Promise.all([
                userUuid || getUUID(),
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
            ]);
            userUuid = u; cmpUuid = c; envUuid = e;
        }
        if (!userUuid) throw new Error('Missing user UUID');
        if (!cmpUuid) throw new Error('Missing company UUID');
        if (!envUuid) throw new Error('Missing environment UUID');

        const params = { userUuid, cmpUuid, envUuid };
        console.log('API params:', params);

        const resp = await api.post('/api/HRA/ManageAttendance', payload, { params });
        console.log('Submit attendance response:', resp);
        return resp.data;
    } catch (error) {
        console.log('Submit attendance error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Timesheet: Get Manage Timesheet Data
export async function getManageTimesheet({ cmpUuid, envUuid, userUuid, frmD, toD } = {}) {
    try {
        const uuid = userUuid || await getUUID();
        const cmpUuidFinal = cmpUuid || await getCMPUUID();
        const envUuidFinal = envUuid || await getENVUUID();

        if (!uuid) throw new Error('Missing user UUID');
        if (!cmpUuidFinal) throw new Error('Missing company UUID');
        if (!envUuidFinal) throw new Error('Missing environment UUID');

        const params = {
            userUuid: uuid,
            cmpUuid: cmpUuidFinal,
            envUuid: envUuidFinal,
            ...(frmD && { frmD }),
            ...(toD && { toD })
        };

        // Log complete request URL and parameters
        const fullUrl = `${api.defaults.baseURL}${PATHS.manageTimesheet}`;
        console.log('🌐 [getManageTimesheet] Request URL:', fullUrl);
        console.log('📋 [getManageTimesheet] Request Parameters:', params);

        const resp = await api.get(PATHS.manageTimesheet, { params });
        console.log('✅ [getManageTimesheet] Response Status:', resp.status);
        console.log('📥 [getManageTimesheet] Response Data:', resp.data);
        return resp.data;
    } catch (error) {
        console.log('Get manage timesheet error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Timesheet: Add Timesheet Line (query params)
export async function addTimesheetLine({ cmpUuid, envUuid, projectuuid, taskuuid, headeruuid, userUuid, timeSlots, description, specificDate } = {}) {
    try {
        // Resolve identities from storage if missing
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;

        if (!cmpUuid) throw new Error('Missing company UUID');
        if (!envUuid) throw new Error('Missing environment UUID');
        if (!userUuid) throw new Error('Missing user UUID');
        if (!projectuuid) throw new Error('Missing projectuuid');
        if (!taskuuid) throw new Error('Missing taskuuid');
        if (!headeruuid) throw new Error('Missing headeruuid');
        if (!specificDate) throw new Error('Missing specificDate');
        if (!timeSlots) throw new Error('Missing timeSlots');

        const params = {
            cmpUuid,
            envUuid,
            projectuuid,
            taskuuid,
            headeruuid,
            userUuid,
            timeSlots,
            description: description ?? '',
            specificDate,
        };

        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.addTimesheetLine}`;
            console.log('🌐 [addTimesheetLine] Request URL:', fullUrl);
            console.log('📋 [addTimesheetLine] Request Parameters:', params);
            console.log('🔗 [addTimesheetLine] Full Request URL:', `${fullUrl}?${new URLSearchParams(params).toString()}`);
        } catch (_) { }

        // Backend expects query-only; send no body
        const resp = await api.post(PATHS.addTimesheetLine, null, { params });
        console.log('✅ [addTimesheetLine] Response Status:', resp.status);
        console.log('📥 [addTimesheetLine] Response Data:', resp.data);
        return resp.data;
    } catch (error) {
        console.log('Add timesheet line error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Timesheet: Delete Timesheet Line (query params)
export async function deleteTimesheetLine({ headerUuid, projectUuid, taskUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        // Resolve identities from storage if missing
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;

        if (!cmpUuid) throw new Error('Missing company UUID');
        if (!envUuid) throw new Error('Missing environment UUID');
        if (!userUuid) throw new Error('Missing user UUID');
        if (!headerUuid) throw new Error('Missing headerUuid');
        if (!projectUuid) throw new Error('Missing projectUuid');
        if (!taskUuid) throw new Error('Missing taskUuid');

        const params = { cmpUuid, envUuid, userUuid, headerUuid, projectUuid, taskUuid };

        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.deleteTimesheetLine}`;
            console.log('🗑️ [deleteTimesheetLine] Request URL:', fullUrl);
            console.log('📋 [deleteTimesheetLine] Request Parameters:', params);
            console.log('🔗 [deleteTimesheetLine] Full Request URL:', `${fullUrl}?${new URLSearchParams(params).toString()}`);
        } catch (_) { }

        const resp = await api.delete(PATHS.deleteTimesheetLine, { params });
        console.log('✅ [deleteTimesheetLine] Response Status:', resp.status);
        console.log('📥 [deleteTimesheetLine] Response Data:', resp.data);
        return resp.data;
    } catch (error) {
        console.log('Delete timesheet line error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Timesheet: Submit Timesheet (JSON body)
export async function submitTimesheetLine({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [u, c, e] = await Promise.all([
            userUuid || getUUID(),
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        userUuid = u; cmpUuid = c; envUuid = e;
        if (!headerUuid) throw new Error('Missing headerUuid');
        if (!cmpUuid) throw new Error('Missing company UUID');
        if (!envUuid) throw new Error('Missing environment UUID');
        if (!userUuid) throw new Error('Missing user UUID');

        const body = {
            HeaderUUID: headerUuid,
            CmpUUID: cmpUuid,
            EnvUUID: envUuid,
            UserUUID: userUuid,
        };
        try {
            console.log('📝 [submitTimesheetLine] Body:', body);
        } catch (_) { }
        const resp = await api.post(PATHS.submitTimesheetLine, body);
        console.log('✅ [submitTimesheetLine] Response Status:', resp.status);
        console.log('📥 [submitTimesheetLine] Response Data:', resp.data);
        return resp.data;
    } catch (error) {
        console.log('Submit timesheet error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Timesheet: Transfer Timesheet Tasks to Next Week
export async function transferTimesheetTasks({ lineUuid, fromDate, toDate, headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        const params = {
            LineUUID: lineUuid,
            FromDate: fromDate,
            ToDate: toDate,
            HeaderUUID: headerUuid,
            CmpUUID: cmpUuid || await getCMPUUID(),
            EnvUUID: envUuid || await getENVUUID(),
            UserUUID: userUuid || await getUUID(),
        };

        // Remove undefined values
        Object.keys(params).forEach(key => {
            if (params[key] === undefined || params[key] === null) {
                delete params[key];
            }
        });

        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.transferTimesheetTasks}`;
            console.log('🔄 [transferTimesheetTasks] Request URL:', fullUrl);
            console.log('📋 [transferTimesheetTasks] Request Parameters:', params);
            console.log('🔗 [transferTimesheetTasks] Full Request URL:', `${fullUrl}?${new URLSearchParams(params).toString()}`);
        } catch (_) { }

        const resp = await api.post(PATHS.transferTimesheetTasks, null, { params });
        console.log('✅ [transferTimesheetTasks] Response Status:', resp.status);
        console.log('📥 [transferTimesheetTasks] Response Data:', resp.data);
        return resp.data;
    } catch (error) {
        console.log('Transfer timesheet tasks error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Company Setup: Update Profile Image
export async function updateProfileImage(payload, overrides = {}) {
    console.log('Updating profile image with payload:', JSON.stringify(payload, null, 2));

    try {
        let { userUuid, cmpUuid, envUuid } = overrides || {};
        if (!userUuid || !cmpUuid || !envUuid) {
            const [u, c, e] = await Promise.all([
                userUuid || getUUID(),
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
            ]);
            userUuid = u; cmpUuid = c; envUuid = e;
        }
        if (!userUuid) throw new Error('Missing user UUID');
        if (!cmpUuid) throw new Error('Missing company UUID');
        if (!envUuid) throw new Error('Missing environment UUID');

        const params = { userUuid, cmpUuid, envUuid };
        console.log('API params:', params);

        // Build multipart form body
        const form = new FormData();
        const appendIfDefined = (key, value) => {
            if (value === undefined || value === null) return;
            form.append(key, String(value));
        };
        appendIfDefined('userUuid', userUuid);
        appendIfDefined('cmpUuid', cmpUuid);
        appendIfDefined('envUuid', envUuid);

        // File support: prefer { uri, name, type } else fallback to string
        const fileObj = payload?.profileImageFile;
        if (fileObj?.uri && fileObj?.name) {
            form.append('profileImage', {
                uri: fileObj.uri,
                name: fileObj.name,
                type: fileObj.type || 'image/jpeg',
            });
        } else if (payload?.profileImage) {
            appendIfDefined('profileImage', payload?.profileImage);
        }

        const resp = await api.post(PATHS.updateProfileImage, form, {
            params,
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('Update profile image response:', resp);
        return resp.data;
    } catch (error) {
        console.log('Update profile image error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Company Setup: Get Profile Image
export async function getProfileImage(overrides = {}) {
    console.log('Getting profile image...');

    try {
        let { userUuid, cmpUuid, envUuid } = overrides || {};
        if (!userUuid || !cmpUuid || !envUuid) {
            const [u, c, e] = await Promise.all([
                userUuid || getUUID(),
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
            ]);
            userUuid = u; cmpUuid = c; envUuid = e;
        }
        if (!userUuid) throw new Error('Missing user UUID');
        if (!cmpUuid) throw new Error('Missing company UUID');
        if (!envUuid) throw new Error('Missing environment UUID');

        const params = { userUuid, cmpUuid, envUuid };
        console.log('API params:', params);

        const resp = await api.get(PATHS.getProfileImage, { params });
        console.log('Get profile image response:', resp);
        return resp.data;
    } catch (error) {
        console.log('Get profile image error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Company Setup: Delete Profile Image
export async function deleteProfileImage(overrides = {}) {
    console.log('Deleting profile image...');

    try {
        let { userUuid, cmpUuid, envUuid } = overrides || {};
        if (!userUuid || !cmpUuid || !envUuid) {
            const [u, c, e] = await Promise.all([
                userUuid || getUUID(),
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
            ]);
            userUuid = u; cmpUuid = c; envUuid = e;
        }
        if (!userUuid) throw new Error('Missing user UUID');
        if (!cmpUuid) throw new Error('Missing company UUID');
        if (!envUuid) throw new Error('Missing environment UUID');

        const params = { userUuid, cmpUuid, envUuid };
        console.log('API params:', params);

        const resp = await api.delete(PATHS.deleteProfileImage, { params });
        console.log('Delete profile image response:', resp);
        return resp.data;
    } catch (error) {
        console.log('Delete profile image error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Timesheet: Get Timesheets for Approval
export async function getTimesheetsForApproval({ cmpUuid, envUuid, userUuid, start = 0, length = 10 } = {}) {
    try {
        // Resolve missing IDs from storage
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        if (!cmpUuid) throw new Error('cmpUuid is required');
        if (!envUuid) throw new Error('envUuid is required');
        if (!userUuid) throw new Error('userUuid is required');

        const params = { cmpUuid, envUuid, userUuid, start, length };
        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.timesheetsForApproval}`;
            console.log('🌐 [getTimesheetsForApproval] Request URL:', fullUrl);
            console.log('📋 [getTimesheetsForApproval] Request Parameters:', params);
            console.log('🔗 [getTimesheetsForApproval] Full Request URL:', `${fullUrl}?${new URLSearchParams(params).toString()}`);
        } catch (_) { }

        const resp = await api.get(PATHS.timesheetsForApproval, { params });
        console.log('✅ [getTimesheetsForApproval] Response Status:', resp.status);
        console.log('📥 [getTimesheetsForApproval] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get timesheets for approval error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Timesheet: Approve Timesheet
export async function approveTimesheet({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        // Resolve missing IDs from storage
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        if (!cmpUuid) throw new Error('cmpUuid is required');
        if (!envUuid) throw new Error('envUuid is required');
        if (!userUuid) throw new Error('userUuid is required');
        if (!headerUuid) throw new Error('headerUuid is required');

        const payload = {
            CmpUuid: cmpUuid,
            EnvUuid: envUuid,
            UserUuid: userUuid,
            HeaderUuid: headerUuid
        };

        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.approveTimesheet}`;
            console.log('🌐 [approveTimesheet] Request URL:', fullUrl);
            console.log('📦 [approveTimesheet] Request Payload:', payload);
        } catch (_) { }

        const resp = await api.post(PATHS.approveTimesheet, payload);
        console.log('✅ [approveTimesheet] Response Status:', resp.status);
        console.log('📥 [approveTimesheet] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Approve timesheet error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Timesheet: Reject Timesheet
export async function rejectTimesheet({ headerUuid, cmpUuid, envUuid, userUuid, remark } = {}) {
    try {
        // Resolve missing IDs from storage
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        if (!cmpUuid) throw new Error('cmpUuid is required');
        if (!envUuid) throw new Error('envUuid is required');
        if (!userUuid) throw new Error('userUuid is required');
        if (!headerUuid) throw new Error('headerUuid is required');

        const payload = {
            CmpUuid: cmpUuid,
            EnvUuid: envUuid,
            UserUuid: userUuid,
            HeaderUuid: headerUuid,
            Remark: remark || ''
        };

        try {
            const fullUrl = `${api.defaults.baseURL}/api/TimeSheet/RejectTimesheet`;
            console.log('🌐 [rejectTimesheet] Request URL:', fullUrl);
            console.log('📦 [rejectTimesheet] Request Payload:', payload);
        } catch (_) { }

        const resp = await api.post('/api/TimeSheet/RejectTimesheet', payload);
        console.log('✅ [rejectTimesheet] Response Status:', resp.status);
        console.log('📥 [rejectTimesheet] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Reject timesheet error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Dashboard: Get Lead Summary
export async function getDashboardLeadSummary({ cmpUuid, envUuid, superAdminUuid } = {}) {
    try {
        // Resolve missing IDs from storage
        if (!cmpUuid || !envUuid || !superAdminUuid) {
            const [c, e, u, r] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                superAdminUuid || getUUID(),
                getRoleUUID(),
            ]);
            cmpUuid = c; envUuid = e; superAdminUuid = u;

            // Use role UUID if available, otherwise use user UUID
            if (r) {
                superAdminUuid = r;
            }
        }

        // TEMPORARY FIX: Force the correct superAdminUuid based on your login data
        // TODO: Fix the login process to store the correct UUID
        if (superAdminUuid === '97dcc757-b714-4b25-ac04-9bc7a988') {
            console.log('🔧 [TEMP FIX] Overriding incorrect UUID with correct one');
            superAdminUuid = '1afa6042-0bd6-4734-8e15-1dbe6b61';
        }

        // Debug logging to check what UUIDs are being used
        console.log('🔍 [getDashboardLeadSummary] Retrieved UUIDs:');
        console.log('  - cmpUuid:', cmpUuid);
        console.log('  - envUuid:', envUuid);
        console.log('  - superAdminUuid:', superAdminUuid);

        // Check what's actually stored in storage
        const [storedUUID, storedCMP, storedENV] = await Promise.all([
            getUUID(),
            getCMPUUID(),
            getENVUUID()
        ]);
        console.log('🔍 [getDashboardLeadSummary] What\'s actually stored:');
        console.log('  - storedUUID:', storedUUID);
        console.log('  - storedCMP:', storedCMP);
        console.log('  - storedENV:', storedENV);
        if (!cmpUuid) throw new Error('cmpUuid is required');
        if (!envUuid) throw new Error('envUuid is required');
        if (!superAdminUuid) throw new Error('superAdminUuid is required');

        const params = {
            cmpUuid: cmpUuid,
            envUuid: envUuid,
            superAdminUuid: superAdminUuid
        };

        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.getDashboardLeadSummary}`;
            console.log('🌐 [getDashboardLeadSummary] Request URL:', fullUrl);
            console.log('📦 [getDashboardLeadSummary] Request Params:', params);
        } catch (_) { }

        const resp = await api.get(PATHS.getDashboardLeadSummary, { params });
        console.log('✅ [getDashboardLeadSummary] Response Status:', resp.status);
        console.log('📥 [getDashboardLeadSummary] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get dashboard lead summary error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Get approved by me expenses
export async function getApprovedByMeExpenses(start = 0, length = 10) {
    try {
        const [userUUID, selectedCmpUUID, selectedEnvUUID, userCmpUUID, userEnvUUID] = await Promise.all([
            getUUID(),
            getSelectedCompanyUUID(),
            getSelectedEnvironmentUUID(),
            getCMPUUID(),
            getENVUUID(),
        ]);

        // Use selected UUIDs if available (admin), otherwise fallback to user's assigned UUIDs
        const cmpUUID = selectedCmpUUID || userCmpUUID;
        const envUUID = selectedEnvUUID || userEnvUUID;

        const params = {
            userUUID: userUUID || '',
            cmpUUID: cmpUUID || '',
            envUUID: envUUID || '',
            Start: start,
            Length: length
        };

        console.log('🚀 [getApprovedByMeExpenses] Request params:', params);
        const resp = await api.get(PATHS.approvedByMeExpenses, { params });
        console.log('✅ [getApprovedByMeExpenses] Response Status:', resp.status);
        console.log('📥 [getApprovedByMeExpenses] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get approved by me expenses error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Get sole approval data for expense to approve tab
export async function getSoleApprovalData({ cmpUUID, envUUID, userUUID, start = 0, length = 10 } = {}) {
    try {
        // Resolve missing IDs from storage if not provided
        if (!cmpUUID || !envUUID || !userUUID) {
            const [c, e, u] = await Promise.all([
                cmpUUID || getCMPUUID(),
                envUUID || getENVUUID(),
                userUUID || getUUID(),
            ]);
            cmpUUID = c; envUUID = e; userUUID = u;
        }

        if (!cmpUUID) throw new Error('cmpUUID is required');
        if (!envUUID) throw new Error('envUUID is required');
        if (!userUUID) throw new Error('userUUID is required');

        const params = {
            cmpUUID,
            envUUID,
            userUUID,
            start,
            length
        };

        console.log('🚀 [getSoleApprovalData] Request params:', params);
        const resp = await api.get(PATHS.soleApprovalData, { params });
        console.log('✅ [getSoleApprovalData] Response Status:', resp.status);
        console.log('📥 [getSoleApprovalData] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get sole approval data error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Get approval details for expense
export async function getApprovalDetails({ headeruuid, cmpUUID, envUUID } = {}) {
    try {
        // Resolve missing IDs from storage if not provided
        if (!cmpUUID || !envUUID) {
            const [c, e] = await Promise.all([
                cmpUUID || getCMPUUID(),
                envUUID || getENVUUID(),
            ]);
            cmpUUID = c; envUUID = e;
        }

        if (!headeruuid) throw new Error('headeruuid is required');
        if (!cmpUUID) throw new Error('cmpUUID is required');
        if (!envUUID) throw new Error('envUUID is required');

        const params = {
            headeruuid,
            cmpUUID,
            envUUID
        };

        console.log('🚀 [getApprovalDetails] Request params:', params);
        const resp = await api.get(PATHS.approvedDetails, { params });
        console.log('✅ [getApprovalDetails] Response Status:', resp.status);
        console.log('📥 [getApprovalDetails] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get approval details error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Get pending approvals
export async function getPendingApprovals({ start = 0, length = 10 } = {}) {
    try {
        // Resolve missing IDs from storage
        const [userUUID, cmpUUID, envUUID] = await Promise.all([
            getUUID(),
            getCMPUUID(),
            getENVUUID(),
        ]);

        if (!userUUID) throw new Error('userUUID is required');
        if (!cmpUUID) throw new Error('cmpUUID is required');
        if (!envUUID) throw new Error('envUUID is required');

        const params = {
            CmpUUID: cmpUUID,
            EnvUUID: envUUID,
            UserUUID: userUUID,
            Start: start,
            Length: length
        };

        console.log('🚀 [getPendingApprovals] Request params:', params);
        const resp = await api.get(PATHS.pendingApprovals, { params });
        console.log('✅ [getPendingApprovals] Response Status:', resp.status);
        console.log('📥 [getPendingApprovals] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get pending approvals error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Get my approved expenses
export async function getMyApprovedExpenses({ start = 0, length = 10 } = {}) {
    try {
        // Resolve missing IDs from storage
        const [userUUID, cmpUUID, envUUID] = await Promise.all([
            getUUID(),
            getCMPUUID(),
            getENVUUID(),
        ]);

        if (!userUUID) throw new Error('userUUID is required');
        if (!cmpUUID) throw new Error('cmpUUID is required');
        if (!envUUID) throw new Error('envUUID is required');

        const params = {
            cmpUUID,
            envUUID,
            userUUID,
            Start: start,
            Length: length
        };

        console.log('🚀 [getMyApprovedExpenses] Request params:', params);
        const resp = await api.get(PATHS.myApprovedExpenses, { params });
        console.log('✅ [getMyApprovedExpenses] Response Status:', resp.status);
        console.log('📥 [getMyApprovedExpenses] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get my approved expenses error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Get my rejected expenses
export async function getMyRejectedExpenses({ start = 0, length = 10 } = {}) {
    try {
        // Resolve missing IDs from storage
        const [userUUID, cmpUUID, envUUID] = await Promise.all([
            getUUID(),
            getCMPUUID(),
            getENVUUID(),
        ]);

        if (!userUUID) throw new Error('userUUID is required');
        if (!cmpUUID) throw new Error('cmpUUID is required');
        if (!envUUID) throw new Error('envUUID is required');

        const params = {
            cmpUUID,
            envUUID,
            userUUID,
            Start: start,
            Length: length
        };

        console.log('🚀 [getMyRejectedExpenses] Request params:', params);
        const resp = await api.get(PATHS.myRejectedExpenses, { params });
        console.log('✅ [getMyRejectedExpenses] Response Status:', resp.status);
        console.log('📥 [getMyRejectedExpenses] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get my rejected expenses error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Process expense approval or rejection
export async function processApprovalOrRejection({ headerUuid, isApproved, remark = '' } = {}) {
    try {
        // Resolve missing IDs from storage
        const [userUUID, cmpUUID, envUUID] = await Promise.all([
            getUUID(),
            getCMPUUID(),
            getENVUUID(),
        ]);

        if (!headerUuid) throw new Error('headerUuid is required');
        if (!userUUID) throw new Error('userUUID is required');
        if (!cmpUUID) throw new Error('cmpUUID is required');
        if (!envUUID) throw new Error('envUUID is required');
        if (typeof isApproved !== 'boolean') throw new Error('isApproved must be a boolean');

        // Validate remark for rejection
        if (!isApproved && (!remark || remark.trim() === '')) {
            throw new Error('Remark is required when rejecting an expense');
        }

        // Use query parameters for the request - try exact field names from API docs
        const params = {
            headerUuid,
            cmpUuid: cmpUUID,
            envUuid: envUUID,
            userUuid: userUUID,
            isApproved: isApproved.toString(), // Convert boolean to string
            remark: remark.trim()
        };

        // Also try alternative field names that might be expected
        const altParams = {
            headeruuid: headerUuid,
            cmpUUID: cmpUUID,
            envUUID: envUUID,
            userUUID: userUUID,
            isApproved: isApproved.toString(),
            remark: remark.trim()
        };

        console.log('🚀 [processApprovalOrRejection] Primary params:', params);
        console.log('🚀 [processApprovalOrRejection] Alternative params:', altParams);

        // Try with alternative parameter names first
        const resp = await api.post(PATHS.processApprovalOrRejection, null, { params: altParams });
        console.log('✅ [processApprovalOrRejection] Response Status:', resp.status);
        console.log('📥 [processApprovalOrRejection] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Process approval or rejection error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}


// Company Setup: Send Device Token (FCM Token)
export async function sendDeviceToken({ token, isLogin = true, userUuid } = {}) {
    try {
        // Get user UUID if not provided
        if (!userUuid) {
            userUuid = await getUUID();
        }

        if (!userUuid) {
            throw new Error('User UUID is required');
        }

        // If token is not provided, try to get it from notification service
        if (!token) {
            try {
                // Import notificationService dynamically to avoid circular dependencies
                const notificationService = require('../services/notificationService').default;
                token = await notificationService.getToken();

                if (!token) {
                    console.log('⚠️ [sendDeviceToken] No FCM token available, skipping device token registration');
                    return { success: false, message: 'No FCM token available' };
                }
            } catch (error) {
                console.log('⚠️ [sendDeviceToken] Could not get FCM token:', error.message);
                return { success: false, message: 'Could not get FCM token' };
            }
        }

        const payload = {
            IsLogin: isLogin,
            UserId: userUuid,
            Token: token
        };

        console.log('📱 [sendDeviceToken] Sending device token:', {
            IsLogin: isLogin,
            UserId: userUuid,
            Token: token ? `${token.substring(0, 20)}...` : 'null' // Log partial token for debugging
        });

        const resp = await api.post('/api/CompanySetup/DeviceToken', payload);
        console.log('✅ [sendDeviceToken] Response Status:', resp.status);
        console.log('📥 [sendDeviceToken] Response Data:', resp.data);
        return resp.data;
    } catch (error) {
        console.log('Send device token error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

// Dashboard: Get Admin Dashboard Data
export async function getAdminDashboard({ cmpUuid, envUuid, superAdminUuid } = {}) {
    try {
        // Resolve missing IDs from storage if not provided
        if (!cmpUuid || !envUuid || !superAdminUuid) {
            const [c, e, u, r] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                superAdminUuid || getUUID(),
                getRoleUUID(),
            ]);
            cmpUuid = c; envUuid = e;

            // Use role UUID if available (Super Admin UUID), otherwise use user UUID
            if (r) {
                superAdminUuid = r;
            } else {
                superAdminUuid = u;
            }
        }

        if (!cmpUuid) throw new Error('cmpUuid is required');
        if (!envUuid) throw new Error('envUuid is required');
        if (!superAdminUuid) throw new Error('superAdminUuid is required');

        const params = {
            cmpUuid,
            envUuid,
            superAdminUuid
        };

        console.log('🚀 [getAdminDashboard] Request params:', params);
        console.log('🔍 [getAdminDashboard] Using Super Admin UUID:', superAdminUuid);
        const resp = await api.get(PATHS.adminDashboard, { params });
        console.log('✅ [getAdminDashboard] Response Status:', resp.status);
        console.log('📥 [getAdminDashboard] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get admin dashboard error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

export async function getTotalHoursReported({ cmpUuid, envUuid, superAdminUuid } = {}) {
    try {
        // Resolve missing IDs from storage if not provided
        if (!cmpUuid || !envUuid || !superAdminUuid) {
            const [c, e, u, r] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                superAdminUuid || getUUID(),
                getRoleUUID(),
            ]);
            cmpUuid = c; envUuid = e;

            // Use role UUID if available (Super Admin UUID), otherwise use user UUID
            if (r) {
                superAdminUuid = r;
            } else {
                superAdminUuid = u;
            }
        }

        if (!cmpUuid) throw new Error('cmpUuid is required');
        if (!envUuid) throw new Error('envUuid is required');
        if (!superAdminUuid) throw new Error('superAdminUuid is required');

        const params = {
            cmpUuid,
            envUuid,
            superAdminUuid
        };

        console.log('🚀 [getTotalHoursReported] Request params:', params);
        console.log('🔍 [getTotalHoursReported] Using Super Admin UUID:', superAdminUuid);
        const resp = await api.get(PATHS.totalHoursReported, { params });
        console.log('✅ [getTotalHoursReported] Response Status:', resp.status);
        console.log('📥 [getTotalHoursReported] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get admin dashboard error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}

export async function getTotalEmployeeWorking({ cmpUuid, envUuid, superAdminUuid } = {}) {
    try {
        // Resolve missing IDs from storage if not provided
        if (!cmpUuid || !envUuid || !superAdminUuid) {
            const [c, e, u, r] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                superAdminUuid || getUUID(),
                getRoleUUID(),
            ]);
            cmpUuid = c; envUuid = e;

            // Use role UUID if available (Super Admin UUID), otherwise use user UUID
            if (r) {
                superAdminUuid = r;
            } else {
                superAdminUuid = u;
            }
        }

        if (!cmpUuid) throw new Error('cmpUuid is required');
        if (!envUuid) throw new Error('envUuid is required');
        if (!superAdminUuid) throw new Error('superAdminUuid is required');

        const params = {
            cmpUuid,
            envUuid,
            superAdminUuid
        };

        console.log('🚀 [getTotalEmployeeWorking] Request params:', params);
        console.log('🔍 [getTotalEmployeeWorking] Using Super Admin UUID:', superAdminUuid);
        const resp = await api.get(PATHS.totalEmployeeWorking, { params });
        console.log('✅ [getTotalEmployeeWorking] Response Status:', resp.status);
        console.log('📥 [getTotalEmployeeWorking] Response Data:', JSON.stringify(resp.data, null, 2));
        return resp.data;
    } catch (error) {
        console.log('Get admin dashboard error:', error);
        console.log('Error response:', error.response?.data);
        console.log('Error status:', error.response?.status);
        throw error;
    }
}
