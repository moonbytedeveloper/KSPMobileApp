import axios from 'axios';
import { Alert } from 'react-native';
import { getRefreshToken, setTokens, clearTokens, getUUID, getCMPUUID, getENVUUID, setMenuRights, setUUID, setENVUUID, setCMPUUID, setProfile, setDesignation, setRoles, setDisplayName, setSelectedEnvironmentUUID, setSelectedCompanyUUID, getSelectedCompanyUUID, getSelectedEnvironmentUUID, setReportingDesignation, getReportingDesignation, setRoleUUID, getRoleUUID, setAllowedCompanyUUIDs, getAccessToken } from './tokenStorage';
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
    wonLeads: Config.API_GET_Manage_LEADS_PATH || '/api/BusinessDevelopment/GetManageLeadList',
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
    attendanceSubmit: Config.API_ATTENDANCE_SUBMIT || '/api/HRA/ManageAttendance',
    timesheetSlip: Config.API_TIMESHEET_SLIP || '/api/TimeSheet/api/timesheet/slip',
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
    timesheetSlip: '/api/TimeSheet/api/timesheet/slip',
    expenseSlip: '/api/Expense/expense-slip',
    salesOrderSlip: '/api/Account/salesorderpdf',
    salesPerformaInvoiceSlip: '/api/Account/salesperformainvoicepdf',
    salesInvoiceSlip: '/api/Account/salesinvoicepdf',
    purchaseOrderSlip: '/api/Account/purchaseorderpdf',
    purchasePerformaInvoiceSlip: '/api/Account/purchaseperformainvoicepdf',
    purchaseInvoiceSlip: '/api/Account/purchaseinvoicepdf',
    convertSalesOrderToInvoice: '/api/Account/ConvertSalesOrderToInvoice',
    convertSalesPerformaToInvoice: '/api/Account/ConvertsalesPerformaToInvoice',
    convertPurchaseOrderToInvoice: '/api/Account/ConvertPurchaseOrderToInvoice',
    convertPurchasePerformaToInvoice: '/api/Account/ConvertpurchasePerformaToInvoice',
    convertPurchaseQuotationToOrder: '/api/Account/ConvertPurchaseQuotationToOrder',
    convertInquiryToPurchaseOrder: '/api/Account/ConvertInquiryToPurchaseOrder',
    convertInquiryToSalesOrder: '/api/Account/ConvertInquiryToSalesOrder',
    // Dashboard Lead Summary
    getDashboardLeadSummary: Config.API_GET_DASHBOARD_LEAD_SUMMARY_PATH || '/api/DashBoard/GetDashboardLeadSummary',
    adminDashboard: '/api/DashBoard/superadmin/dashboard',
    // admin dashboard APIs
    totalHoursReported: '/api/DashBoard/myworklist/projects',
    totalEmployeeWorking: '/api/DashBoard/hr-dashboard/employees-status',
    // Account Sales 
    deleteSalesHeader: '/api/Account/DeleteSalesHeader',
    getSalesPerfomaInvoiceLines: Config.API_GET_SALES_PERFOMA_INVOICE_LINES || '/api/Account/GetSalesPerformaInvoiceLines',
    deleteSalesOrderHeader: '/api/Account/DeleteSalesOrderHeader',
    getSalesHeaderInquiries: Config.API_GET_SALES_HEADER_INQUIRIES_PATH || '/api/Account/GetSalesHeaderInquiries',
    getPurchaseHeaderInquiries: Config.API_GET_PURCHASE_HEADER_INQUIRIES_PATH || '/api/Account/GetPurchaseHeaderInquiries',
    addSalesInquiry: Config.ADD_SALES_INQUIRY || '/api/Account/AddSalesHeader',
    getCustomers: Config.API_GET_CUSTOMERS_PATH || '/api/Account/GetCustomers',
    getVendors: Config.API_GET_VENDORS_PATH || '/api/Account/PurchasequotationVendors',
    getItemTypes: Config.API_GET_ITEM_TYPES_PATH || '/api/Account/ItemTypes',
    // getItemMasters: Config.API_GET_ITEM_MASTERS_PATH || '/api/Account/ItemMasters',
    getUnits: Config.API_GET_UNITS_PATH || '/api/Account/Units',
    addSalesHeader: Config.API_ADD_SALES_HEADER_PATH || '/api/Account/AddSalesHeader',
    addSalesLine: Config.API_ADD_SALES_LINE_PATH || '/api/Account/AddSalesLine',
    updateSalesLine: Config.API_UPDATE_SALES_LINE_PATH || '/api/Account/UpdateSalesLine',
    deleteSalesLine: Config.API_DELETE_SALES_LINE_PATH || '/api/Account/DeleteSalesLine',
    deleteSalesOrderLine: Config.API_DELETE_SALES_ORDER_LINE_PATH || '/api/Account/DeleteSalesOrderLine',
    updateSalesHeader: Config.API_UPDATE_SALES_HEADER_PATH || '/api/Account/UpdateSalesHeader',
    getSalesHeader: Config.API_GET_SALES_HEADER_PATH || '/api/Account/GetSalesHeader',
    getSalesLines: Config.API_GET_SALES_LINES_PATH || '/api/Account/GetSalesLines',
    // Note: backend exposes purchase order lines list at '/api/Account/purchaseorderlines' (plural)
    getPurchaseOrderLines: Config.API_GET_PURCHASE_ORDER_LINES_PATH || '/api/Account/purchaseorderlines',
    getPurchaseQuotationLines: Config.API_GET_PURCHASE_QUOTATION_LINES_PATH || '/api/Account/GetPurchaseQuotationLines',
    deletePurchaseOrderLine: Config.API_GET_PURCHASE_ORDER_LINES_PATH || '/api/Account/purchaseorderline',
    getSalesOrderHeaders: Config.API_GET_SALES_ORDER_HEADERS_PATH || '/api/Account/GetSalesOrderHeaders',
    getSalesOrderHeaderById: Config.API_GET_SALES_ORDER_HEADER_BY_ID_PATH || '/api/Account/GetSalesOrderHeaderById',
    getPurchaseOrderHeaderById: Config.API_GET_PURCHASE_ORDER_HEADER_BY_ID_PATH || '/api/Account/GetPurchaseOrderHeaderById',
    getItems: Config.API_GET_ITEMS_PATH || '/api/Account/GetItems',
    getPurchaseOrderHeaders: Config.API_GET_PURCHASE_ORDER_HEADERS_PATH || '/api/Account/purchaseorderheaders',
    termsOfPayment: Config.API_TERMS_OF_PAYMENT_PATH || '/api/Account/termsofpayment',
    modeOfPayment: Config.API_MODE_OF_PAYMENT_PATH || '/api/Account/modeofpayment',
    getpurchaseInquiryHeader: Config.API_GET_PURCHASE_INQUIRY_HEADER_PATH || 'api/Account/GetPurchaseInquiryHeader',
    getPurchaseInquiryLines: Config.API_GET_PURCHASE_INQUIRY_LINES_PATH || '/api/Account/GetPurchaseInquiryLines',
    // Account Purchase
    deletePurchaseQuotationLine: Config.API_DELETE_PURCHASE_QUOTATION_LINE_PATH || '/api/Account/DeletePurchaseQuotationLine',
    UpdatePurchaseQuotationLine: Config.API_UPDATE_PURCHASE_QUOTATION_LINE_PATH || '/api/Account/UpdatePurchaseQuotationLine',
    AddPurchaseQuotationLine: Config.API_ADD_PURCHASE_QUOTATION_LINE_PATH || '/api/Account/AddPurchaseQuotationLine',
    UpdatePurchaseQuotationHeader: Config.API_POST_UPDATE_PURCHASE_QUOTATION_HEADER_PATH || '/api/Account/UpdatePurchaseQuotationHeader',
    postpurchaseQuotationHeader: Config.API_POST_PURCHASE_QUOTATION_HEADER_PATH || '/api/Account/AddPurchaseQuotationHeader',
    getpurchaseQuotationHeaders: Config.API_GET_PURCHASE_QUOTATION_HEADERS_PATH || '/api/Account/GetPurchaseQuotationHeaders',
    getPurchaseQuotationHeaderById: Config.API_GET_PURCHASE_QUOTATION_HEADER_BY_ID_PATH || '/api/Account/GetPurchaseQuotationHeaderById',
    deletePurchaseQuotationHeader: Config.API_DELETE_PURCHASE_QUOTATION_HEADER_PATH || '/api/Account/DeletePurchaseQuotationHeader',

    deletePurchaseInquiryLine: Config.API_DELETE_PURCHASE_INQUIRY_LINE_PATH || '/api/Account/DeletePurchaseInquiryLine',
    postUpdatePurchaseInquiryLine: Config.API_POST_UPDATE_PURCHASE_INQUIRY_LINE_PATH || '/api/Account/UpdatePurchaseInquiryLine',
    postAddPurchaseInquiryLine: Config.API_POST_ADD_PURCHASE_INQUIRY_LINE_PATH || '/api/Account/AddPurchaseInquiryLine',
    deletePurchaseInquiryHeader: Config.API_DELETE_PURCHASE_INQUIRY_HEADER_PATH || '/api/Account/DeletePurchaseInquiryHeader',
    // Delete purchase inquiry line
    deletePurchaseInquiryLine: Config.API_DELETE_PURCHASE_INQUIRY_LINE_PATH || '/api/Account/DeletePurchaseInquiryLine',
    postUpdatePurchaseQuotationHeader: Config.API_POST_UPDATE_PURCHASE_QUOTATION_HEADER_PATH || '/api/Account/UpdatePurchaseInquiryHeader',
    postPurchaseInquiryHeader: Config.API_POST_PURCHASE_INQUIRY_HEADER_PATH || '/api/Account/AddPurchaseInquiryHeader',
    getprojects: Config.API_GET_PROJECTS_PATH || '/api/Project/GetProjects',
    getPurchaseHeaderInquiries: Config.API_GET_PURCHASE_HEADER_INQUIRIES_PATH || '/api/Account/GetPurchaseHeaderInquiries',
    postAddPurchaseQuotationHeader: Config.API_POST_ADD_PURCHASE_QUOTATION_HEADER_PATH || '/api/Account/AddPurchaseQuotationHeader',
    getpurchaseQuotationHeaders: Config.API_GET_PURCHASE_QUOTATION_HEADERS_PATH || '/api/Account/GetPurchaseQuotationHeaders',
    getpurchaseQuotationNumber: Config.API_GET_PURCHASE_QUOTATION_NUMBER_PATH || '/api/Account/PurchasequotationNumbers',
    getPurchasequotationVendor: Config.API_GET_PURCHASE_QUOTATION_VENDOR_PATH || '/api/Account/PurchasequotationVendors',
    getCurrencies: Config.API_GET_CURRENCIES_PATH || '/api/Account/GetCurrencies',
    getPurchaseItemTypes: Config.API_GET_PURCHASEITEMTYPE || '/api/Account/GetPurchaseItemTypes',
    // getProjects: Config.API_PROJECTS_PATH || '/api/Projects/GetProjects',
    addSalesOrder: Config.API_ADD_SALES_ORDER_PATH || '/api/Account/AddSalesOrderHeader',
    addPurchaseOrder: Config.API_ADD_PURCHASE_ORDER_PATH || '/api/Account/purchaseorderheader',
    // delete purchase order header (uses same path but DELETE method)
    deletePurchaseOrderHeader: Config.API_DELETE_PURCHASE_ORDER_HEADER_PATH || '/api/Account/purchaseorderheader',
    updateSalesOrder: Config.API_UPDATE_SALES_ORDER_PATH || '/api/Account/UpdateSalesOrderHeader',
    getAllSalesInquiryNumbers: Config.API_GET_ALL_INQUIRY_NUMBERS_PATH || '/api/Account/GetSalesInquiryNumbers',
    getAllPurchaseInquiryNumbers: Config.API_GET_ALL_INQUIRY_NUMBERS_PATH || '/api/Account/GetPurchaseInquiryNumbers',
    getSalesOrderNumbers: Config.API_GET_SALES_ORDER_NUMBERS_PATH || '/api/Account/GetSalesOrderNumbers',
    getPurchaseOrderNumbers: Config.API_GET_PURCHASE_ORDER_NUMBERS_PATH || '/api/Account/PurchaseorderNumbers',
    addSalesOrderLine: Config.API_ADD_SALES_ORDER_LINE_PATH || '/api/Account/AddSalesOrderLine',
    updateSalesOrderLine: Config.API_UPDATE_SALES_ORDER_LINE_PATH || '/api/Account/UpdateSalesOrderLine',
    // Purchase order line (create)
    addPurchaseOrderLine: Config.API_ADD_PURCHASE_ORDER_LINE_PATH || '/api/Account/purchaseorderline',
    getSalesOrderLines: Config.API_GET_SALES_ORDER_LINES_PATH || '/api/Account/GetSalesOrderLines',
    addSalesPerformaInvoiceHeader: Config.API_ADD_SALES_PERFORMA_INVOICE_HEADER_PATH || '/api/Account/AddSalesPerformaInvoiceHeader',
    addPurchasePerformaInvoiceHeader: Config.API_ADD_PURCHASE_PERFORMA_INVOICE_HEADER_PATH || '/api/Account/AddPurchasePerformaInvoiceHeader',
    addSalesInvoiceHeader: Config.API_ADD_SALES__INVOICE_HEADER_PATH || '/api/Account/AddSalesInvoiceHeader',
    addPurchaseInvoiceHeader: Config.API_ADD_PURCHASE__INVOICE_HEADER_PATH || '/api/Account/AddPurchaseInvoiceHeader',
    addSalesPerformaInvoiceLine: Config.API_ADD_SALES_PERFORMA_INVOICE_LINE_PATH || '/api/Account/AddSalesPerformaInvoiceLine',
    addPurchasePerformaInvoiceLine: Config.API_ADD_PURCHASE_PERFORMA_INVOICE_LINE_PATH || '/api/Account/AddPurchasePerformaInvoiceLine',
    addPurchaseInvoiceLine: Config.API_ADD_PURCHASE_INVOICE_LINE_PATH || '/api/Account/AddPurchaseInvoiceLine',
    addSalesInvoiceLine: Config.API_ADD_SALES__INVOICE_LINE_PATH || '/api/Account/AddSalesInvoiceLine',
    updateSalesPerformaInvoiceHeader: Config.API_UPDATE_SALES_PERFORMA_INVOICE_HEADER_PATH || '/api/Account/UpdateSalesPerformaInvoiceHeader',
    updatePurchasePerformaInvoiceHeader: Config.API_UPDATE_PURCHASE_PERFORMA_INVOICE_HEADER_PATH || '/api/Account/UpdatePurchasePerformaInvoiceHeader',
    getSalesPerformaInvoiceHeaders: Config.API_GET_SALES_PERFORMA_INVOICE_HEADERS_PATH || '/api/Account/GetSalesPerformaInvoiceHeaders',
    // Purchase Performa Invoice headers 
    getPurchasePerformaInvoiceHeaders: Config.API_GET_PURCHASE_PERFORMA_INVOICE_HEADERS_PATH || '/api/Account/GetPurchasePerformaInvoiceHeaders',
    // Delete Purchase Performa Invoice Header
    deletePurchasePerformaInvoiceHeader: Config.API_DELETE_PURCHASE_PERFORMA_INVOICE_HEADER_PATH || '/api/Account/DeletePurchasePerformaInvoiceHeader',
    getSalesPerformaInvoiceLines: Config.API_GET_SALES_PERFORMA_INVOICE_LINES_PATH || '/api/Account/GetSalesPerformaInvoiceLines',
    getPurchasePerformaInvoiceLines: Config.API_GET_PURCHASE_PERFORMA_INVOICE_LINES_PATH || '/api/Account/GetPurchasePerformaInvoiceLines',
    updatePurchaseInvoiceHeader: Config.API_UPDATE_PURCHASE_INVOICE_HEADER_PATH || '/api/Account/UpdatePurchaseInvoiceHeader',
    updateSalesPerformaInvoiceLine: Config.API_UPDATE_SALES_PERFORMA_INVOICE_LINE_PATH || '/api/Account/UpdateSalesPerformaInvoiceLine',
    updatePurchasePerformaInvoiceLine: Config.API_UPDATE_PURCHASE_PERFORMA_INVOICE_LINE_PATH || '/api/Account/UpdatePurchasePerformaInvoiceLine',
    updateSalesInvoiceLine: Config.API_UPDATE_SALES__INVOICE_LINE_PATH || '/api/Account/UpdateSalesInvoiceLine',
    updatePurchaseInvoiceLine: Config.API_UPDATE_PURCHASE_INVOICE_LINE_PATH || '/api/Account/UpdatePurchaseInvoiceLine',
    deleteSalesPerformaInvoiceLine: Config.API_DELETE_SALES_PERFORMA_INVOICE_LINE_PATH || '/api/Account/DeleteSalesPerformaInvoiceLine',
    deletePurchasePerformaInvoiceLine: Config.API_DELETE_PURCHASE_PERFORMA_INVOICE_LINE_PATH || '/api/Account/DeletePurchasePerformaInvoiceLine',
    deleteSalesInvoiceLine: Config.API_DELETE_SALES_INVOICE_LINE_PATH || '/api/Account/DeleteSalesInvoiceLine',
    deletePurchaseInvoiceLine: Config.API_DELETE_PURCHASE_INVOICE_LINE_PATH || '/api/Account/DeletePurchaseInvoiceLine',
    getSalesPerformaInvoiceHeaderById: Config.API_GET_SALES_PERFORMA_INVOICE_HEADER_BY_ID_PATH || '/api/Account/GetSalesPerformaInvoiceHeaderById',
    getPurchasePerformaInvoiceHeaderById: Config.API_GET_PURCHASE_PERFORMA_INVOICE_HEADER_BY_ID_PATH || '/api/Account/GetPurchasePerformaInvoiceHeaderById',
    getSalesInvoiceHeaders: Config.API_GET_SALES_INVOICE_HEADERS_PATH || '/api/Account/GetSalesInvoiceHeaders',
    // Purchase Invoice headers (list)  
    getPurchaseInvoiceHeaders: Config.API_GET_PURCHASE_INVOICE_HEADERS_PATH || '/api/Account/GetPurchaseInvoiceHeaders',
    getSalesInvoiceHeaderById: Config.API_GET_SALES_INVOICE_HEADER_BY_ID_PATH || '/api/Account/GetSalesInvoiceHeaderById',
    getPurchaseInvoiceHeaderById: Config.API_GET_PURCHASE_INVOICE_HEADER_BY_ID_PATH || '/api/Account/GetPurchaseInvoiceHeaderById',
    getSalesInvoiceLines: Config.API_GET_SALES_INVOICE_LINES_PATH || '/api/Account/GetSalesInvoiceLines',
    getPurchaseInvoiceLines: Config.API_GET_PURCHASE_INVOICE_LINES_PATH || '/api/Account/GetPurchaseInvoiceLines',
    updateSalesInvoiceHeader: Config.API_UPDATE_SALES_INVOICE_HEADER_PATH || '/api/Account/UpdateSalesInvoiceHeader',
    deleteSalesPerformaInvoiceHeader: Config.API_DELETE_SALES_PERFORMA_INVOICE_HEADER_PATH || '/api/Account/DeleteSalesPerformaInvoiceHeader',
    updatePurchaseOrderHeader: Config.API_UPDATE_PURCHASE_ORDER_PATH || '/api/Account/Updatepurchaseorderheader',
    updatePurchaseOrderline: Config.API_UPDATE_PURCHASE_ORDER_PATH || '/api/Account/Updatepurchaseorderline',

};
console.log(PATHS, 'PATHS');

// Helper function to extract user-friendly error messages from API responses
function extractErrorMessage(error) {
    // Try to extract a user-friendly message from various possible locations
    const responseData = error?.response?.data;
    
    // Check for Message field (capital M) - common in API responses
    if (responseData?.Message) {
        return responseData.Message;
    }
    
    // Check for message field (lowercase m)
    if (responseData?.message) {
        return responseData.message;
    }
    
    // Check for error description
    if (responseData?.error) {
        return responseData.error;
    }
    
    // Check for validation errors array
    if (responseData?.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
        return responseData.errors[0];
    }
    
    // Check for status text
    if (error?.response?.statusText && error.response.statusText !== 'OK') {
        return error.response.statusText;
    }
    
    // Check for network errors
    if (error?.message?.includes('Network Error')) {
        return 'Network connection error. Please check your internet connection.';
    }
    
    // Check for timeout errors
    if (error?.message?.includes('timeout')) {
        return 'Request timed out. Please try again.';
    }
    
    // Fallback to generic message
    return error?.message || 'An unexpected error occurred. Please try again.';
}

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
    console.log('🔄 [REFRESH FUNCTION] ==========================================');
    console.log('🔄 [REFRESH FUNCTION] Manual refresh function called');
    console.log('🔄 [REFRESH FUNCTION] Time:', new Date().toISOString());

    const refreshToken = await getRefreshToken();
    if (!refreshToken) {
        console.log('❌ [REFRESH FUNCTION] No refresh token found!');
        throw new Error('No refresh token');
    }

    console.log('🔄 [REFRESH FUNCTION] Refresh token found');
    console.log('🔄 [REFRESH FUNCTION] Refresh token (first 20 chars):', refreshToken.substring(0, 20) + '...');
    console.log('🔄 [REFRESH FUNCTION] Calling refresh API...');
    console.log('🔄 [REFRESH FUNCTION] URL:', `${BASE_URL}${PATHS.refresh}`);
    console.log('🔄 [REFRESH FUNCTION] Payload:', { refreshToken: refreshToken.substring(0, 20) + '...' });

    const resp = await refreshClient.post(PATHS.refresh, { refreshToken });

    console.log('✅ [REFRESH FUNCTION] Refresh API Response Received!');
    console.log('✅ [REFRESH FUNCTION] Status:', resp.status);
    console.log('✅ [REFRESH FUNCTION] Full Response:', JSON.stringify(resp.data, null, 2));

    // Handle different possible response formats
    const responseData = resp.data?.Data || resp.data;
    const { AccessToken, RefreshToken } = responseData?.Token || responseData || {};

    console.log('🔄 [REFRESH FUNCTION] Parsing response...');
    console.log('🔄 [REFRESH FUNCTION] ResponseData:', JSON.stringify(responseData, null, 2));
    console.log('🔄 [REFRESH FUNCTION] AccessToken found:', !!AccessToken);
    console.log('🔄 [REFRESH FUNCTION] RefreshToken found:', !!RefreshToken);

    if (!AccessToken || !RefreshToken) {
        console.log('❌ [REFRESH FUNCTION] Invalid refresh response - missing tokens');
        console.log('❌ [REFRESH FUNCTION] AccessToken:', AccessToken ? 'Present' : 'Missing');
        console.log('❌ [REFRESH FUNCTION] RefreshToken:', RefreshToken ? 'Present' : 'Missing');
        throw new Error('Invalid refresh response');
    }

    console.log('✅ [REFRESH FUNCTION] Tokens extracted successfully!');
    console.log('✅ [REFRESH FUNCTION] New AccessToken (first 20 chars):', AccessToken.substring(0, 20) + '...');
    console.log('✅ [REFRESH FUNCTION] New RefreshToken (first 20 chars):', RefreshToken.substring(0, 20) + '...');

    await setTokens({ accessToken: AccessToken, refreshToken: RefreshToken });
    console.log('✅ [REFRESH FUNCTION] Tokens saved to storage successfully!');
    console.log('✅ [REFRESH FUNCTION] Refresh completed successfully!');
    console.log('✅ [REFRESH FUNCTION] ==========================================');
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

export async function forgotPassword({ email, username }) {
    const payload = { email };
    if (username) payload.username = username;
    const resp = await api.post(PATHS.forgotPassword, payload);
    console.log('Forgot Password response:', resp);
    return resp.data;
}

export async function verifyCode({ email, OtpCode }) {
    const payload = { email, OtpCode };
    // if (username) payload.username = username;
    console.log('Verify Code payload:', payload);
    const resp = await api.post(PATHS.verifyCode, payload);
    console.log('Verify Code response:', resp);
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

// Get customers list for account operations
export async function getCustomers({ cmpUuid, envUuid, userUuid } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    const params = { cmpUuid, envUuid };
    // Allow callers to pass uuids or let interceptors / axios instance add defaults
    const resp = await api.get(PATHS.getCustomers, {
        params
    });
    return resp.data;
}

export async function getVendors({ cmpUuid, envUuid, userUuid } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    const params = { cmpUuid, envUuid };
    // Allow callers to pass uuids or let interceptors / axios instance add defaults
    const resp = await api.get(PATHS.getVendors, {
        params
    });
    return resp.data;
}

// Get item types for account operations
export async function getItemTypes({ cmpUuid, envUuid, userUuid } = {}) {
    if (!cmpUuid || !envUuid || !userUuid) {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c; envUuid = e;
    }
    const params = { cmpUuid, envUuid };
    const resp = await api.get(PATHS.getItemTypes, {
        params
    });
    return resp.data;
}

// Get purchase item types for purchase flows
export async function getPurchaseItemTypes({ cmpUuid, envUuid, userUuid } = {}) {
    const [c, e, u] = await Promise.all([
        cmpUuid || getCMPUUID(),
        envUuid || getENVUUID(),
        userUuid || getUUID(),
    ]);
    const params = { cmpUuid: c || '', envUuid: e || '', userUuid: u || '' };
    try { console.log('[authServices] getPurchaseItemTypes params ->', params); } catch (_) { }
    const resp = await api.get(PATHS.getPurchaseItemTypes, { params });
    try { console.log('[authServices] getPurchaseItemTypes resp ->', resp && resp.data); } catch (_) { }
    return resp.data;
}

// Get vendors for purchase quotations
export async function getPurchasequotationVendor({ cmpUuid, envUuid, userUuid } = {}) {
    const [c, e, u] = await Promise.all([
        cmpUuid || getCMPUUID(),
        envUuid || getENVUUID(),
        userUuid || getUUID(),
    ]);
    const params = { cmpUuid: c || '', envUuid: e || '', userUuid: u || '' };
    try { console.log('[authServices] getPurchasequotationVendor params ->', params); } catch (_) { }
    try {
        const resp = await api.get(PATHS.getPurchasequotationVendor, { params });
        try { console.log('[authServices] getPurchasequotationVendor resp ->', resp && resp.data); } catch (_) { }
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchasequotationVendor error ->', err && (err.message || err));
        throw err;
    }
}

// Get purchase quotation numbers (for dropdowns)
export async function getpurchaseQuotationNumber({ cmpUuid, envUuid, userUuid } = {}) {
    const [c, e, u] = await Promise.all([
        cmpUuid || getCMPUUID(),
        envUuid || getENVUUID(),
        userUuid || getUUID(),
    ]);
    const params = { cmpUuid: c || '', envUuid: e || '', userUuid: u || '' };
    try { console.log('[authServices] getpurchaseQuotationNumber params ->', params); } catch (_) { }
    try {
        const resp = await api.get(PATHS.getpurchaseQuotationNumber, { params });
        try { console.log('[authServices] getpurchaseQuotationNumber resp ->', resp && resp.data); } catch (_) { }
        return resp.data;
    } catch (err) {
        console.error('[authServices] getpurchaseQuotationNumber error ->', err && (err.message || err));
        throw err;
    }
}

// Get purchase quotation headers (list) - used in ViewPurchaseQuotation screen
export async function getpurchaseQuotationHeaders({ cmpUuid, envUuid, userUuid, start = 0, length = 100, searchValue = '' } = {}) {
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { cmpUuid: c || '', envUuid: e || '', userUuid: u || '', start, length, searchValue };
    try { console.log('[authServices] getpurchaseQuotationHeaders params ->', params); } catch (_) { }
    try {
        const resp = await api.get(PATHS.getpurchaseQuotationHeaders, { params });
        try { console.log('[authServices] getpurchaseQuotationHeaders resp ->', resp && resp.data); } catch (_) { }
        return resp.data;
    } catch (err) {
        console.error('[authServices] getpurchaseQuotationHeaders error ->', err && (err.message || err));
        throw err;
    }
}

// Get a single Purchase Quotation header by UUID
export async function getPurchaseQuotationHeaderById({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        let { userUuid: u, cmpUuid: c, envUuid: e } = { userUuid, cmpUuid, envUuid } || {};
        if (!u || !c || !e) {
            const [uu, cc, ee] = await Promise.all([
                userUuid || getUUID(),
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
            ]);
            u = uu; c = cc; e = ee;
        }
        const params = { Uuid: headerUuid, cmpUuid: c, envUuid: e };
        console.log('[authServices] getPurchaseQuotationHeaderById params ->', params);
        const resp = await api.get(PATHS.getPurchaseQuotationHeaderById, { params });
        console.log('[authServices] getPurchaseQuotationHeaderById response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchaseQuotationHeaderById error ->', err && (err.message || err));
        throw err;
    }
}

// Get item masters (item names) optionally filtered by ItemType UUID
// export async function getItemMasters({ itemTypeUuid, cmpUuid, envUuid, userUuid } = {}) {
//     const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
//     const params = { cmpUuid: c, envUuid: e };
//     if (itemTypeUuid) params.ItemType_UUID = itemTypeUuid;
//     const resp = await api.get(PATHS.getItemMasters, { params });
//     return resp.data;
// }

// Get items list (supports optional search / pagination)
export async function getItems({ search, page, pageSize, cmpUuid, envUuid, userUuid, mode } = {}) {
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { cmpUuid: c, envUuid: e, userUuid: u };
    if (search) params.search = search;
    if (page) params.page = page;
    if (pageSize) params.pageSize = pageSize;
    // allow callers to request items for a specific mode (e.g., 'Sales' or 'Purchase')
    if (mode) params.mode = mode;
    try {
        console.log('[authServices] getItems params ->', params);
        const resp = await api.get(PATHS.getItems, { params });
        console.log('[authServices] getItems response status ->', resp?.status);
        // Log small sample of response data for debugging
        try {
            const d = resp && resp.data;
            if (Array.isArray(d)) {
                console.log('[authServices] getItems data sample ->', JSON.stringify(d.slice(0, 5), null, 2));
            } else {
                console.log('[authServices] getItems data ->', JSON.stringify(d, null, 2));
            }
        } catch (e) { console.warn('[authServices] getItems logging error ->', e); }
        return resp.data;
    } catch (err) {
        console.error('[authServices] getItems error ->', err && (err.message || err), err);
        throw err;
    }
}

// Get units list for dropdowns
export async function getUnits({ cmpUuid, envUuid, userUuid } = {}) {
    const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
    const params = { cmpUuid: c, envUuid: e };
    const resp = await api.get(PATHS.getUnits, { params });
    return resp.data;
}

// Add sales header
export async function addSalesHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addSalesHeader params ->', params);

        // axios.post(url, data, config) - ensure payload is sent as body and params as query
        const resp = await api.post(PATHS.addSalesHeader, payload, { params });
        console.log('[authServices] addSalesHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addSalesHeader error ->', err && (err.message || err));
        throw err;
    }
}

// Add Purchase Inquiry Header (wrapper for postPurchaseInquiryHeader)
export async function addPurchaseInquiryHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addPurchaseInquiryHeader params ->', params);
        console.log('[authServices] addPurchaseInquiryHeader payload ->', payload);
        const resp = await api.post(PATHS.postPurchaseInquiryHeader, payload, { params });
        console.log('[authServices] addPurchaseInquiryHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        try {
            console.error('[authServices] addPurchaseInquiryHeader error ->', err && (err.message || err));
            if (err?.response) {
                console.error('[authServices] addPurchaseInquiryHeader response status ->', err.response.status);
                console.error('[authServices] addPurchaseInquiryHeader response data ->', JSON.stringify(err.response.data, null, 2));
            }
        } catch (logErr) {
            console.error('[authServices] addPurchaseInquiryHeader logging failure ->', logErr);
        }
        throw err;
    }
}

// Get a single purchase inquiry header by header UUID
export async function getPurchaseInquiryHeader({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, UUID: headerUuid, HeaderUUID: headerUuid, cmpUuid: c, envUuid: e, userUuid: u };
    console.log('[authServices] getPurchaseInquiryHeader params ->', params);
    const resp = await api.get(PATHS.getpurchaseInquiryHeader, { params });
    console.log('[authServices] getPurchaseInquiryHeader resp ->', resp && resp.status);
    return resp.data;
}

// Update an existing purchase inquiry header. Backend may expose a dedicated update endpoint
// but historically Add endpoints accept UUID for updates; we post to the same PATH and include UUID.
export async function updatePurchaseInquiryHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updatePurchaseInquiryHeader params ->', params);
        console.log('[authServices] updatePurchaseInquiryHeader payload ->', payload);
        const resp = await api.post(PATHS.postUpdatePurchaseQuotationHeader, payload, { params });
        console.log('[authServices] updatePurchaseInquiryHeader resp ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchaseInquiryHeader error ->', err && (err.message || err));
        if (err?.response) {
            try { console.error('[authServices] updatePurchaseInquiryHeader response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
        }
        throw err;
    }
}

// Add Sales Performa Invoice Header
export async function addSalesPerformaInvoiceHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addSalesPerformaInvoiceHeader params ->', params);

        const resp = await api.post(PATHS.addSalesPerformaInvoiceHeader, payload, { params });
        console.log('[authServices] addSalesPerformaInvoiceHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addSalesPerformaInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}
// Add Purchase Performa Invoice Header
export async function addPurchasePerformaInvoiceHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addPurchasePerformaInvoiceHeader params ->', params);

        const resp = await api.post(PATHS.addPurchasePerformaInvoiceHeader, payload, { params });
        console.log('[authServices] addPurchasePerformaInvoiceHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addPurchasePerformaInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}
// Add Sales Invoice Header
export async function addSalesInvoiceHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addSalesInvoiceHeader params ->', params);

        const resp = await api.post(PATHS.addSalesInvoiceHeader, payload, { params });
        console.log('[authServices] addSalesInvoiceHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addSalesInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}
// Add Purchase Invoice Header
export async function addPurchaseInvoiceHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addPurchaseInvoiceHeader params ->', params);

        const resp = await api.post(PATHS.addPurchaseInvoiceHeader, payload, { params });
        console.log('[authServices] addPurchaseInvoiceHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addPurchaseInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}

// Add Sales Performa Invoice Line (line item)
export async function addSalesPerformaInvoiceLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addSalesPerformaInvoiceLine params ->', params);

        const resp = await api.post(PATHS.addSalesPerformaInvoiceLine, payload, { params });
        console.log('[authServices] addSalesPerformaInvoiceLine response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addSalesPerformaInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}
// Add Sales Performa Invoice Line (line item)
export async function addPurchasePerformaInvoiceLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addPurchasePerformaInvoiceLine params ->', params);

        const resp = await api.post(PATHS.addPurchasePerformaInvoiceLine, payload, { params });
        console.log('[authServices] addPurchasePerformaInvoiceLine response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addPurchasePerformaInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}

// Add Sales  Invoice Line (line item)
export async function addSalesInvoiceLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addSalesInvoiceLine params ->', params);

        const resp = await api.post(PATHS.addSalesInvoiceLine, payload, { params });
        console.log('[authServices] addSalesInvoiceLine response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addSalesInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}

// Add Purchase  Invoice Line (line item)
export async function addPurchaseInvoiceLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addPurchaseInvoiceLine params ->', params);

        const resp = await api.post(PATHS.addPurchaseInvoiceLine, payload, { params });
        console.log('[authServices] addPurchaseInvoiceLine response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addPurchaseInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}

// Update Sales Performa Invoice Line (line item)
export async function updateSalesPerformaInvoiceLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updateSalesPerformaInvoiceLine params ->', params);
        console.log('[authServices] updateSalesPerformaInvoiceLine payload ->', payload);
        const resp = await api.post(PATHS.updateSalesPerformaInvoiceLine, payload, { params });
        console.log('[authServices] updateSalesPerformaInvoiceLine response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updateSalesPerformaInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}
// Update Sales Performa Invoice Line (line item)
export async function updatePurchasePerformaInvoiceLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updatePurchasePerformaInvoiceLine params ->', params);
        console.log('[authServices] updatePurchasePerformaInvoiceLine payload ->', payload);
        const resp = await api.post(PATHS.updatePurchasePerformaInvoiceLine, payload, { params });
        console.log('[authServices] updatePurchasePerformaInvoiceLine response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchasePerformaInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}


// Update Sales  Invoice Line (line item)
export async function updateSalesInvoiceLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updateSalesInvoiceLine params ->', params);
        console.log('[authServices] updateSalesInvoiceLine payload ->', payload);
        const resp = await api.post(PATHS.updateSalesInvoiceLine, payload, { params });
        console.log('[authServices] updateSalesInvoiceLine response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updateSalesInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}

// Update Purchase  Invoice Line (line item)
export async function updatePurchaseInvoiceLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updatePurchaseInvoiceLine params ->', params);
        console.log('[authServices] updatePurchaseInvoiceLine payload ->', payload);
        const resp = await api.post(PATHS.updatePurchaseInvoiceLine, payload, { params });
        console.log('[authServices] updatePurchaseInvoiceLine response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchaseInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}
// Delete Sales Performa Invoice Line
export async function deleteSalesPerformaInvoiceLine({ lineUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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
        // Send multiple possible param names for compatibility with backend
        const params = {
            uuid: lineUuid,
            UUID: lineUuid,
            LineUUID: lineUuid,
            lineUuid: lineUuid,
            userUuid,
            cmpUuid,
            envUuid
        };
        console.log('[authServices] deleteSalesPerformaInvoiceLine params ->', params);
        const resp = await api.delete(PATHS.deleteSalesPerformaInvoiceLine, { params });
        console.log('[authServices] deleteSalesPerformaInvoiceLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deleteSalesPerformaInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}
export async function deletePurchasePerformaInvoiceLine({ lineUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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
        // Send multiple possible param names for compatibility with backend
        const params = {
            uuid: lineUuid,
            UUID: lineUuid,
            LineUUID: lineUuid,
            lineUuid: lineUuid,
            userUuid,
            cmpUuid,
            envUuid
        };
        console.log('[authServices] deletePurchasePerformaInvoiceLine params ->', params);
        const resp = await api.delete(PATHS.deletePurchasePerformaInvoiceLine, { params });
        console.log('[authServices] deletePurchasePerformaInvoiceLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deletePurchasePerformaInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}
export async function deleteSalesInvoiceLine({ lineUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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
        // Send multiple possible param names for compatibility with backend
        const params = {
            uuid: lineUuid,
            UUID: lineUuid,
            LineUUID: lineUuid,
            lineUuid: lineUuid,
            userUuid,
            cmpUuid,
            envUuid
        };
        console.log('[authServices] deleteSalesInvoiceLine params ->', params);
        const resp = await api.delete(PATHS.deleteSalesInvoiceLine, { params });
        console.log('[authServices] deleteSalesInvoiceLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deleteSalesInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}
export async function deletePurchaseInvoiceLine({ lineUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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
        // Send multiple possible param names for compatibility with backend
        const params = {
            uuid: lineUuid,
            UUID: lineUuid,
            LineUUID: lineUuid,
            lineUuid: lineUuid,
            userUuid,
            cmpUuid,
            envUuid
        };
        console.log('[authServices] deletePurchaseInvoiceLine params ->', params);
        const resp = await api.delete(PATHS.deletePurchaseInvoiceLine, { params });
        console.log('[authServices] deletePurchaseInvoiceLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deleteSalesInvoiceLine error ->', err && (err.message || err));
        throw err;
    }
}

// Update Sales Performa Invoice Header
export async function updateSalesPerformaInvoiceHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updateSalesPerformaInvoiceHeader params ->', params);

        const resp = await api.post(PATHS.updateSalesPerformaInvoiceHeader, payload, { params });
        console.log('[authServices] updateSalesPerformaInvoiceHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updateSalesPerformaInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}

// Update Sales Performa Invoice Header
export async function updatePurchasePerformaInvoiceHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updatePurchasePerformaInvoiceHeader params ->', params);

        const resp = await api.post(PATHS.updatePurchasePerformaInvoiceHeader, payload, { params });
        console.log('[authServices] updatePurchasePerformaInvoiceHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchasePerformaInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}



// Update existing sales header
export async function updateSalesHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updateSalesHeader params ->', params);
        console.log('[authServices] updateSalesHeader payload ->', payload);
        const resp = await api.post(PATHS.updateSalesHeader, payload, { params });
        console.log('[authServices] updateSalesHeader response ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updateSalesHeader error ->', err && (err.message || err));
        throw err;
    }
}

// Get a single sales header by header UUID
export async function getSalesHeader({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    // send multiple possible param keys to be robust against backend expectations
    const params = { headerUuid, UUID: headerUuid, HeaderUUID: headerUuid, cmpUuid: c, envUuid: e, userUuid: u };
    console.log('[authServices] getSalesHeader params ->', params);
    const resp = await api.get(PATHS.getSalesHeader, { params });
    console.log('[authServices] getSalesHeader resp ->', resp?.status);
    return resp.data;
}

// Get sales lines for a header
export async function getSalesLines({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    // include multiple key names for header uuid to handle backend naming differences
    const params = { headerUuid, UUID: headerUuid, HeaderUUID: headerUuid, cmpUuid: c, envUuid: e, userUuid: u };
    console.log('[authServices] getSalesLines params ->', params);
    const resp = await api.get(PATHS.getSalesLines, { params });
    console.log('[authServices] getSalesLines resp ->', resp);
    return resp.data;
}

// Get sales lines for a header
export async function getPurchaseOrderLines({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    // include multiple key names for header uuid to handle backend naming differences
    const params = { headerUuid, UUID: headerUuid, HeaderUUID: headerUuid, cmpUuid: c, envUuid: e, userUuid: u };
    console.log('[authServices] getPurchaseOrderLines params ->', params);
    const resp = await api.get(PATHS.getPurchaseOrderLines, { params });
    console.log('[authServices] getPurchaseOrderLines resp ->', resp?.status);
    return resp.data;
}

export async function getPurchaseQuotationLines({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    // include multiple key names for header uuid to handle backend naming differences
    const params = { headerUuid, UUID: headerUuid, HeaderUUID: headerUuid, cmpUuid: c, envUuid: e, userUuid: u };
    console.log('[authServices] getPurchaseQuotationLines params ->', params);
    const resp = await api.get(PATHS.getPurchaseQuotationLines, { params });
    console.log('[authServices] getPurchaseQuotationLines resp ->', resp?.status);
    return resp.data;
}

export async function getPurchaseInquiryLines({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, UUID: headerUuid, HeaderUUID: headerUuid, cmpUuid: c, envUuid: e, userUuid: u };
    console.log('[authServices] getPurchaseInquiryLines params ->', params);
    const resp = await api.get(PATHS.getPurchaseInquiryLines, { params });
    console.log('[authServices] getPurchaseInquiryLines resp ->', resp?.status);
    return resp.data;
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

// Get projects list for dropdowns
export async function getProjects({ cmpUuid, envUuid, userUuid } = {}) {
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { cmpUuid: c || '', envUuid: e || '', userUuid: u || '' };
    try { console.log('[authServices] getProjects params ->', params); } catch (_) { }
    const resp = await api.get(PATHS.getprojects, { params });
    try { console.log('[authServices] getProjects resp ->', resp && resp.data); } catch (_) { }
    return resp.data;
}

// Account Sales
export async function getSalesHeaderInquiries({ cmpUuid, envUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c;
        envUuid = e;
    }

    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');

    const params = {
        cmpUuid,
        envUuid,
        start,
        length,
        searchValue,
    };

    const resp = await api.get(PATHS.getSalesHeaderInquiries, { params });
    console.log(resp, 'Sales inquiry get')
    return resp.data;
}


export async function getSalesOrderHeaders({ cmpUuid, envUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
        ]);
        cmpUuid = c;
        envUuid = e;
    }

    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');

    const params = {
        cmpUuid,
        envUuid,
        start,
        length,
        searchValue,
    };

    const resp = await api.get(PATHS.getSalesOrderHeaders, { params });
    console.log('[authServices] getSalesOrderHeaders response ->', resp && resp.status);
    return resp.data;
}

// Get sales performa/invoice lines (list) - supports pagination and search
export async function getSalesPerformaInvoiceHeaders({ cmpUuid, envUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    const params = { cmpUuid, envUuid, start, length, searchValue };
    try {
        const resp = await api.get(PATHS.getSalesPerformaInvoiceHeaders, { params });
        console.log('[authServices] getSalesPerformaInvoiceHeaders resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getSalesPerformaInvoiceHeaders error ->', err && (err.message || err));
        throw err;
    }
}

// Get purchase performa invoice headers (list) - supports pagination and search
export async function getPurchasePerformaInvoiceHeaders({ cmpUuid, envUuid, start = 0, length = 10, searchValue = '' } = {}) {
    try {
        if (!cmpUuid || !envUuid) {
            const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
            cmpUuid = c; envUuid = e;
        }
        const params = { cmpUuid, envUuid, start, length, searchValue };
        console.log('[authServices] getPurchasePerformaInvoiceHeaders params ->', params);
        const resp = await api.get(PATHS.getPurchasePerformaInvoiceHeaders, { params });
        console.log('[authServices] getPurchasePerformaInvoiceHeaders resp ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchasePerformaInvoiceHeaders error ->', err && (err.message || err));
        throw err;
    }
}

// Get lines for a sales invoice header
export async function getSalesInvoiceLines({ headerUuid, cmpUuid, envUuid, userUuid, start = 0, length = 100 } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, cmpUuid: c, envUuid: e, start, length };
    console.log('[authServices] getSalesInvoiceLines params ->', params);
    const resp = await api.get(PATHS.getSalesInvoiceLines, { params });
    console.log('[authServices] getSalesInvoiceLines response ->', resp && resp.status);
    return resp.data;
}

// Get payment history for a sales invoice
export async function getSalesInvoicePaymentHistory({ invoiceUUID, cmpUuid, envUuid, userUuid } = {}) {
    if (!invoiceUUID) throw new Error('invoiceUUID is required');
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { invoiceUUID, cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] getSalesInvoicePaymentHistory params ->', params);
        const resp = await api.get('/api/Account/GetSalesInvoicePaymentHistory', { params });
        console.log('[authServices] getSalesInvoicePaymentHistory resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getSalesInvoicePaymentHistory error ->', err && (err.message || err));
        throw err;
    }
}

// Get related documents for a sales proforma
export async function getSalesProformaRelatedDocuments({ salesProformaUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!salesProformaUuid) throw new Error('salesProformaUuid is required');
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { salesProformaUuid, cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] getSalesProformaRelatedDocuments params ->', params);
        const resp = await api.get('/api/Account/GetSalesProformaRelatedDocuments', { params });
        console.log('[authServices] getSalesProformaRelatedDocuments resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getSalesProformaRelatedDocuments error ->', err && (err.message || err));
        throw err;
    }
}

// Get related documents for a sales invoice
export async function getSalesInvoiceRelatedDocuments({ salesInvoiceUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!salesInvoiceUuid) throw new Error('salesInvoiceUuid is required');
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { salesInvoiceUuid, cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] getSalesInvoiceRelatedDocuments params ->', params);
        const resp = await api.get('/api/Account/GetSalesInvoiceRelatedDocuments', { params });
        console.log('[authServices] getSalesInvoiceRelatedDocuments resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getSalesInvoiceRelatedDocuments error ->', err && (err.message || err));
        throw err;
    }
}

// Get related documents for a sales order
export async function getSalesOrderRelatedDocuments({ salesOrderUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!salesOrderUuid) throw new Error('salesOrderUuid is required');
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { salesOrderUuid, cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] getSalesOrderRelatedDocuments params ->', params);
        const resp = await api.get('/api/Account/GetSalesOrderRelatedDocuments', { params });
        console.log('[authServices] getSalesOrderRelatedDocuments resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getSalesOrderRelatedDocuments error ->', err && (err.message || err));
        throw err;
    }
}

// Get related documents for a purchase order
export async function getPurchaseOrderRelatedDocuments({ purchaseOrderUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!purchaseOrderUuid) throw new Error('purchaseOrderUuid is required');
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { purchaseOrderUuid, cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] getPurchaseOrderRelatedDocuments params ->', params);
        const resp = await api.get('/api/Account/GetPurchaseOrderRelatedDocuments', { params });
        console.log('[authServices] getPurchaseOrderRelatedDocuments resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchaseOrderRelatedDocuments error ->', err && (err.message || err));
        throw err;
    }
}

// Get lines for a sales invoice header
export async function getPurchaseInvoiceLines({ headerUuid, cmpUuid, envUuid, userUuid, start = 0, length = 100 } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, cmpUuid: c, envUuid: e, start, length };
    console.log('[authServices] getPurchaseInvoiceLines params ->', params);
    const resp = await api.get(PATHS.getPurchaseInvoiceLines, { params });
    console.log('[authServices] getPurchaseInvoiceLines response ->', resp && resp.status);
    return resp.data;
}

// Get sales invoice headers (list) - supports pagination and search
export async function getSalesInvoiceHeaders({ cmpUuid, envUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    const params = { cmpUuid, envUuid, start, length, searchValue };
    try {
        const resp = await api.get(PATHS.getSalesInvoiceHeaders, { params });
        console.log('[authServices] getSalesInvoiceHeaders resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getSalesInvoiceHeaders error ->', err && (err.message || err));
        throw err;
    }
}

// Get purchase invoice headers (list) - supports pagination and search
export async function getPurchaseInvoiceHeaders({ cmpUuid, envUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    const params = { cmpUuid, envUuid, start, length, searchValue };
    try {
        console.log('[authServices] getPurchaseInvoiceHeaders params ->', params);
        const resp = await api.get(PATHS.getPurchaseInvoiceHeaders, { params });
        console.log('[authServices] getPurchaseInvoiceHeaders resp ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchaseInvoiceHeaders error ->', err && (err.message || err));
        throw err;
    }
}

// Get purchase order headers (list) - supports pagination and search
export async function getPurchaseOrderHeaders({ cmpUuid, envUuid, start = 0, length = 10, searchValue = '' } = {}) {
    try {
        if (!cmpUuid || !envUuid) {
            const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
            cmpUuid = c; envUuid = e;
        }
        const params = { cmpUuid, envUuid, start, length, searchValue };
        console.log('[authServices] getPurchaseOrderHeaders params ->', params);
        const resp = await api.get(PATHS.getPurchaseOrderHeaders || PATHS.getPurchaseOrderHeaders, { params });
        console.log('[authServices] getPurchaseOrderHeaders response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchaseOrderHeaders error ->', err && (err.message || err));
        throw err;
    }
}

// Get a single sales order header by header UUID (for prefilling billing/shipping)
export async function getSalesOrderHeaderById({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        let { userUuid: u, cmpUuid: c, envUuid: e } = { userUuid, cmpUuid, envUuid } || {};
        if (!u || !c || !e) {
            const [uu, cc, ee] = await Promise.all([
                userUuid || getUUID(),
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
            ]);
            u = uu; c = cc; e = ee;
        }

        // Helper to detect if response contains meaningful data
        const hasMeaningfulData = (respData) => {
            if (!respData) return false;
            const d = respData.Data ?? respData;
            if (!d) return false;
            if (Array.isArray(d)) return d.length > 0;
            if (typeof d === 'object') {
                if (Array.isArray(d?.Records) && d.Records.length > 0) return true;
                if (Array.isArray(d?.List) && d.List.length > 0) return true;
                if (Object.keys(d).length > 0) return true;
            }
            return false;
        };

        // Try a set of candidate query shapes - backend may expect different param names
        // Also include shapes that represent searching by PurchaseOrder number (if a non-UUID is passed)
        const candidateParams = [
            { headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { uuid: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { id: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { HeaderUUID: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { PurchaseOrderUUID: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { purchaseHeaderUuid: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { PurchaseOrderNo: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { purchaseOrderNo: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { PurchaseOrderNumber: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
            { purchaseOrderNumber: headerUuid, userUuid: u, cmpUuid: c, envUuid: e },
        ];

        // Helper: basic UUID format detection (36-char hex with dashes)
        const isUuidLike = (s) => typeof s === 'string' && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s);

        console.log('[authServices] getPurchaseOrderHeaderById headerUuid value ->', headerUuid, 'isUuidLike ->', isUuidLike(headerUuid));

        let lastResp = null;
        for (const params of candidateParams) {
            try {
                console.log('[authServices] getSalesOrderHeaderById trying params ->', params);
                const resp = await api.get(PATHS.getSalesOrderHeaderById, { params });
                console.log('[authServices] getSalesOrderHeaderById response status ->', resp && resp.status);
                lastResp = resp;
                const respData = resp?.data;
                if (hasMeaningfulData(respData)) {
                    return respData;
                }
                // If API returned a message indicating not found, log and continue
                const msg = respData?.Message || respData?.message || '';
                if (msg && /not found|no data|does not exist/i.test(String(msg))) {
                    console.log('[authServices] getSalesOrderHeaderById response indicates no data ->', msg);
                    // continue to next candidate
                } else {
                    // if response is 200 but empty Data, continue to try other param shapes
                    console.log('[authServices] getSalesOrderHeaderById empty response for params, trying next');
                }
            } catch (err) {
                console.warn('[authServices] getSalesOrderHeaderById request error for params ->', params, err && (err.message || err));
                // continue to next candidate
            }
        }

        // If we reach here, return the last response (may contain helpful message)
        if (lastResp) return lastResp.data;
        return { Message: 'No response from server' };
    } catch (err) {
        console.error('[authServices] getSalesOrderHeaderById error ->', err && (err.message || err));
        throw err;
    }
}

// Get a single sales performa invoice header by header UUID (for prefilling performa header)
export async function getSalesPerformaInvoiceHeaderById({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, cmpUuid: c, envUuid: e };
    console.log('[authServices] getSalesPerformaInvoiceHeaderById params ->', params);
    const resp = await api.get(PATHS.getSalesPerformaInvoiceHeaderById, { params });
    console.log('[authServices] getSalesPerformaInvoiceHeaderById response ->', resp);
    return resp.data;
}
export async function getPurchasePerformaInvoiceHeaderById({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, cmpUuid: c, envUuid: e };
    console.log('[authServices] getPurchasePerformaInvoiceHeaderById params ->', params);
    const resp = await api.get(PATHS.getPurchasePerformaInvoiceHeaderById, { params });
    console.log('[authServices] getPurchasePerformaInvoiceHeaderById response ->', resp);
    return resp.data;
}
export async function getSalesInvoiceHeaderById({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, cmpUuid: c, envUuid: e };
    console.log('[authServices] getSalesInvoiceHeaderById params ->', params);
    const resp = await api.get(PATHS.getSalesInvoiceHeaderById, { params });
    console.log('[authServices] getSalesInvoiceHeaderById response ->', resp);
    return resp.data;
}
export async function getPurchaseInvoiceHeaderById({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, cmpUuid: c, envUuid: e };
    console.log('[authServices] getPurchaseInvoiceHeaderById params ->', params);
    const resp = await api.get(PATHS.getPurchaseInvoiceHeaderById, { params });
    console.log('[authServices] getPurchaseInvoiceHeaderById response ->', resp);
    return resp.data;
}


export async function getPurchaseOrderHeaderById({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        let { userUuid: u, cmpUuid: c, envUuid: e } = { userUuid, cmpUuid, envUuid } || {};
        if (!u || !c || !e) {
            const [uu, cc, ee] = await Promise.all([
                userUuid || getUUID(),
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
            ]);
            u = uu; c = cc; e = ee;
        }
        const params = { headerUuid, cmpUuid: c, envUuid: e };
        console.log('[authServices] getPurchaseOrderHeaderById params ->', params);
        const resp = await api.get(PATHS.getPurchaseOrderHeaderById, { params });
        console.log('[authServices] getPurchaseOrderHeaderById response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchaseOrderHeaderById error ->', err && (err.message || err));
        throw err;
    }
}

// Get lines for a sales performa invoice header
export async function getSalesPerformaInvoiceLines({ headerUuid, cmpUuid, envUuid, userUuid, start = 0, length = 100 } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, cmpUuid: c, envUuid: e, start, length };
    console.log('[authServices] getSalesPerformaInvoiceLines params ->', params);
    const resp = await api.get(PATHS.getSalesPerformaInvoiceLines, { params });
    console.log('[authServices] getSalesPerformaInvoiceLines response ->', resp && resp.status);
    return resp.data;
}
// Get lines for a sales performa invoice header
export async function getPurchasePerformaInvoiceLines({ headerUuid, cmpUuid, envUuid, userUuid, start = 0, length = 100 } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { headerUuid, cmpUuid: c, envUuid: e, start, length };
    console.log('[authServices] getPurchasePerformaInvoiceLines params ->', params);
    const resp = await api.get(PATHS.getPurchasePerformaInvoiceLines, { params });
    console.log('[authServices] getPurchasePerformaInvoiceLines response ->', resp && resp.status);
    return resp.data;
}

// Update Sales Invoice Header
export async function updateSalesInvoiceHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updateSalesInvoiceHeader params ->', params);
        console.log('[authServices] updateSalesInvoiceHeader payload ->', payload);

        const resp = await api.post(PATHS.updateSalesInvoiceHeader, payload, { params });
        console.log('[authServices] updateSalesInvoiceHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updateSalesInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}
// Update Sales Invoice Header
export async function updatePurchaseInvoiceHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updatePurchaseInvoiceHeader params ->', params);
        console.log('[authServices] updatePurchaseInvoiceHeader payload ->', payload);

        const resp = await api.post(PATHS.updatePurchaseInvoiceHeader, payload, { params });
        console.log('[authServices] updatePurchaseInvoiceHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchaseInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}

// Get payment terms
export async function getPaymentTerms({ cmpUuid, envUuid } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    const params = { cmpUuid, envUuid };
    const resp = await api.get(PATHS.termsOfPayment, { params });
    return resp.data;
}

// Get payment methods
export async function getPaymentMethods({ cmpUuid, envUuid } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    const params = { cmpUuid, envUuid };
    const resp = await api.get(PATHS.modeOfPayment, { params });
    return resp.data;
}

// Add Sales Order (header)
export async function addSalesOrder(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addSalesOrder params ->', params);
        console.log('[authServices] addSalesOrder payload ->', payload);
        const resp = await api.post(PATHS.addSalesOrder, payload, { params });
        console.log('[authServices] addSalesOrder response ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.log(err, '123');
        console.log(err.message, '456');

        console.error('[authServices] addSalesOrder error ->', err && (err.message || err));
        throw err;
    }
}
// Add Purchase Order (header)
export async function addPurchaseOrder(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addPurchaseOrder params ->', params);
        console.log('[authServices] addPurchaseOrder payload ->', payload);
        const resp = await api.post(PATHS.addPurchaseOrder, payload, { params });
        console.log('[authServices] addPurchaseOrder response ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.log(err, '123');
        console.log(err.message, '456');

        console.error('[authServices] addPurchaseOrder error ->', err && (err.message || err));
        throw err;
    }
}

// Update Sales Order (header)
export async function updateSalesOrder(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updateSalesOrder params ->', params);
        console.log('[authServices] updateSalesOrder payload ->', payload);
        const resp = await api.post(PATHS.updateSalesOrder, payload, { params });
        console.log('[authServices] updateSalesOrder response ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updateSalesOrder error ->', err && (err.message || err));
        throw err;
    }
}
export async function updatePurchaseOrder(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updatePurchaseOrder params ->', params);
        console.log('[authServices] updatePurchaseOrder payload ->', payload);
        const resp = await api.post(PATHS.updatePurchaseOrderHeader, payload, { params });
        console.log('[authServices] updatePurchaseOrder response ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchaseOrder error ->', err && (err.message || err));
        throw err;
    }
}

// Update Purchase Quotation Header
export async function updatePurchaseQuotationHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID()
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updatePurchaseQuotationHeader params ->', params);
        console.log('[authServices] updatePurchaseQuotationHeader payload ->', payload);

        // Prefer explicit PATHS entry if present, fallback to common keys
        const targetPath = PATHS.UpdatePurchaseQuotationHeader || PATHS.postUpdatePurchaseQuotationHeader || PATHS.postUpdatePurchaseQuotationHeader || '/api/Account/UpdatePurchaseQuotationHeader';
        const resp = await api.post(targetPath, payload, { params });
        console.log('[authServices] updatePurchaseQuotationHeader response status ->', resp?.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchaseQuotationHeader error ->', err && (err.message || err));
        if (err?.response) {
            try { console.error('[authServices] updatePurchaseQuotationHeader response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
        }
        throw err;
    }
}

export async function deleteSalesHeader({ headerUuid, overrides = {} } = {}) {
    // uuid: header line uuid (primary), headerUuid: alternate naming
    if (!headerUuid) throw new Error('headerUuid (header UUID) is required');
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

        // send multiple param names to satisfy backend expectations
        const headerId = headerUuid;
        const params = {
            uuid: headerId,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deleteSalesHeader params ->', params);
        const resp = await api.delete(PATHS.deleteSalesHeader, { params });
        console.log('[authServices] deleteSalesHeader response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deleteSalesHeader error ->', err && (err.message || err));
        throw err;
    }
}

// Delete Purchase Inquiry Header
export async function deletePurchaseInquiryHeader({ headerUuid, overrides = {} } = {}) {
    if (!headerUuid) throw new Error('headerUuid (header UUID) is required');
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

        const headerId = headerUuid;
        const params = {
            uuid: headerId,
            headerUuid: headerId,
            UUID: headerId,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deletePurchaseInquiryHeader params ->', params);
        const targetPath = PATHS.deletePurchaseInquiryHeader || '/api/Account/DeletePurchaseInquiryHeader';
        const resp = await api.delete(targetPath, { params });
        console.log('[authServices] deletePurchaseInquiryHeader response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deletePurchaseInquiryHeader error ->', err && (err.message || err));
        throw err;
    }
}

export async function deleteSalesOrderHeader({ headerUuid, overrides = {} } = {}) {
    // uuid: header line uuid (primary), headerUuid: alternate naming
    if (!headerUuid) throw new Error('headerUuid (header UUID) is required');
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

        // send multiple param names to satisfy backend expectations
        const headerId = headerUuid;
        const params = {
            uuid: headerId,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deleteSalesOrderHeader params ->', params);
        const resp = await api.delete(PATHS.deleteSalesOrderHeader, { params });
        console.log('[authServices] deleteSalesOrderHeader response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deleteSalesOrderHeader error ->', err && (err.message || err));
        throw err;
    }
}

// Delete Sales Performa Invoice Header
export async function deleteSalesPerformaInvoiceHeader({ headerUuid, overrides = {} } = {}) {
    if (!headerUuid) throw new Error('headerUuid (header UUID) is required');
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

        // send multiple param names to satisfy backend expectations
        const headerId = headerUuid;
        const params = {
            uuid: headerId,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deleteSalesPerformaInvoiceHeader params ->', params);
        const resp = await api.delete(PATHS.deleteSalesPerformaInvoiceHeader, { params });
        console.log('[authServices] deleteSalesPerformaInvoiceHeader response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deleteSalesPerformaInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}
// Delete Purchase Order Header
export async function deletePurchaseOrderHeader({ headerUuid, overrides = {} } = {}) {
    if (!headerUuid) throw new Error('headerUuid (header UUID) is required');
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

        const headerId = headerUuid;
        const params = {
            uuid: headerId,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deletePurchaseOrderHeader params ->', params);
        const resp = await api.delete(PATHS.deletePurchaseOrderHeader || PATHS.addPurchaseOrder, { params });
        console.log('[authServices] deletePurchaseOrderHeader response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deletePurchaseOrderHeader error ->', err && (err.message || err));
        throw err;
    }
}
// Delete Purchase Performa Invoice Header
export async function deletePurchasePerformaInvoiceHeader({ headerUuid, overrides = {} } = {}) {
    if (!headerUuid) throw new Error('headerUuid (header UUID) is required');
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

        const headerId = headerUuid;
        const params = {
            uuid: headerId,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deletePurchasePerformaInvoiceHeader params ->', params);
        const resp = await api.delete(PATHS.deletePurchasePerformaInvoiceHeader, { params });
        console.log('[authServices] deletePurchasePerformaInvoiceHeader response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deletePurchasePerformaInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}
// Delete Purchase Invoice Header
export async function deletePurchaseInvoiceHeader({ headerUuid, overrides = {} } = {}) {
    if (!headerUuid) throw new Error('headerUuid (header UUID) is required');
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

        const headerId = headerUuid;
        const params = {
            uuid: headerId,
            headerUuid: headerId,
            UUID: headerId,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deletePurchaseInvoiceHeader params ->', params);
        const targetPath = PATHS.deletePurchaseInvoiceHeader || '/api/Account/DeletePurchaseInvoiceHeader';
        const resp = await api.delete(targetPath, { params });
        console.log('[authServices] deletePurchaseInvoiceHeader response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deletePurchaseInvoiceHeader error ->', err && (err.message || err));
        throw err;
    }
}
// Delete Purchase Quotation Header
export async function deletePurchaseQuotationHeader({ headerUuid, overrides = {} } = {}) {
    if (!headerUuid) throw new Error('headerUuid (header UUID) is required');
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

        const headerId = headerUuid;
        const params = {
            uuid: headerId,
            headerUuid: headerId,
            UUID: headerId,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deletePurchaseQuotationHeader params ->', params);
        const targetPath = PATHS.deletePurchaseQuotationHeader || '/api/Account/DeletePurchaseQuotationHeader';
        const resp = await api.delete(targetPath, { params });
        console.log('[authServices] deletePurchaseQuotationHeader response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deletePurchaseQuotationHeader error ->', err && (err.message || err));
        throw err;
    }
}
export async function addSalesInquiry(payload, overrides = {}) {
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
        PATHS.addSalesInquiry || '/api/Account/AddSalesHeader',
        payload,
        { params }
    );
    console.log('Save Manage Lead Opportunity response:', resp);
    return resp.data;
}
// Add sales Order line for a saved header
export async function addSalesOrderLine(payload = {}, overrides = {}) {
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
        const params = { userUuid, cmpUuid, envUuid };
        console.log('[authServices] addSalesLine params ->', params);
        console.log('[authServices] addSalesLine payload ->', payload);
        const resp = await api.post(PATHS.addSalesOrderLine, payload, { params });
        console.log('[authServices] addSalesLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addSalesLine error ->', err && (err.message || err));
        throw err;
    }
}
// Add sales Order line for a saved header
export async function addPurchaseOrderLine(payload = {}, overrides = {}) {
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
        const params = { userUuid, cmpUuid, envUuid };
        console.log('[authServices] addPurchaseOrderLine params ->', params);
        console.log('[authServices] addPurchaseOrderLine payload ->', payload);
        // Use dedicated addPurchaseOrderLine path (server may expose a different endpoint for creating purchase lines)
        const targetPath = PATHS.addPurchaseOrderLine || PATHS.getPurchaseOrderLines;
        console.log('[authServices] addPurchaseOrderLine targetPath ->', targetPath);
        const resp = await api.post(targetPath, payload, { params });
        console.log('[authServices] addPurchaseOrderLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addPurchaseOrderLine error ->', err && (err.message || err));
        throw err;
    }
}

// Add Purchase Quotation Line (line item)
export async function addPurchaseQuotationLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] addPurchaseQuotationLine params ->', params);
        console.log('[authServices] addPurchaseQuotationLine payload ->', payload);
        const targetPath = PATHS.AddPurchaseQuotationLine || '/api/Account/AddPurchaseQuotationLine';
        const resp = await api.post(targetPath, payload, { params });
        console.log('[authServices] addPurchaseQuotationLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addPurchaseQuotationLine error ->', err && (err.message || err));
        if (err?.response) {
            try { console.error('[authServices] addPurchaseQuotationLine response ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
        }
        throw err;
    }
}

// Update Purchase Quotation Line (line item)
export async function updatePurchaseQuotationLine(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        const params = { cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] updatePurchaseQuotationLine params ->', params);
        console.log('[authServices] updatePurchaseQuotationLine payload ->', payload);
        const targetPath = PATHS.UpdatePurchaseQuotationLine || '/api/Account/UpdatePurchaseQuotationLine';
        const resp = await api.post(targetPath, payload, { params });
        console.log('[authServices] updatePurchaseQuotationLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchaseQuotationLine error ->', err && (err.message || err));
        if (err?.response) {
            try { console.error('[authServices] updatePurchaseQuotationLine response ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
        }
        throw err;
    }
}

// Delete Purchase Quotation Line
export async function deletePurchaseQuotationLine({ lineUuid, headerUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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
        // include multiple possible parameter names to be tolerant to backend naming
        const params = {
            lineUuid,
            uuid: lineUuid,
            UUID: lineUuid,
            LineUUID: lineUuid,
            Id: lineUuid,
            id: lineUuid,
            LineId: lineUuid,
            // also include header identifiers if available (server requires headerUuid)
            headerUuid: headerUuid || overrides?.headerUuid || null,
            HeaderUUID: headerUuid || overrides?.headerUuid || null,
            HeaderId: headerUuid || overrides?.headerUuid || null,
            Header_Id: headerUuid || overrides?.headerUuid || null,
            userUuid,
            cmpUuid,
            envUuid,
        };
        console.log('[authServices] deletePurchaseQuotationLine params ->', params);
        const targetPath = PATHS.deletePurchaseQuotationLine || '/api/Account/DeletePurchaseQuotationLine';
        const resp = await api.delete(targetPath, { params });
        console.log('[authServices] deletePurchaseQuotationLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        try { console.error('[authServices] deletePurchaseQuotationLine error ->', err && (err.message || err)); } catch (_) { }
        if (err?.response) {
            try { console.error('[authServices] deletePurchaseQuotationLine response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
        }
        throw err;
    }
}

// Add Purchase Inquiry Line (line item for Purchase Inquiry)
export async function addPurchaseInquiryLine(payload = {}, overrides = {}) {
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
        const params = { userUuid, cmpUuid, envUuid };
        console.log('[authServices] addPurchaseInquiryLine params ->', params);
        console.log('[authServices] addPurchaseInquiryLine payload ->', payload);
        const resp = await api.post(PATHS.postAddPurchaseInquiryLine, payload, { params });
        console.log('[authServices] addPurchaseInquiryLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        try { console.error('[authServices] addPurchaseInquiryLine error ->', err && (err.message || err)); } catch (_) { }
        if (err?.response) {
            try { console.error('[authServices] addPurchaseInquiryLine response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
        }
        throw err;
    }
}

// Update Purchase Inquiry Line
export async function updatePurchaseInquiryLine(payload = {}, overrides = {}) {
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
        const params = { userUuid, cmpUuid, envUuid };
        console.log('[authServices] updatePurchaseInquiryLine params ->', params);
        console.log('[authServices] updatePurchaseInquiryLine payload ->', payload);
        const resp = await api.post(PATHS.postUpdatePurchaseInquiryLine, payload, { params });
        console.log('[authServices] updatePurchaseInquiryLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        try { console.error('[authServices] updatePurchaseInquiryLine error ->', err && (err.message || err)); } catch (_) { }
        if (err?.response) {
            try { console.error('[authServices] updatePurchaseInquiryLine response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
        }
        throw err;
    }
}

// Delete Purchase Inquiry Line
export async function deletePurchaseInquiryLine({ lineUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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

        const params = { lineUuid, UUID: lineUuid, userUuid, cmpUuid, envUuid };
        console.log('[authServices] deletePurchaseInquiryLine params ->', params);
        const resp = await api.delete(PATHS.deletePurchaseInquiryLine, { params });
        console.log('[authServices] deletePurchaseInquiryLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        try { console.error('[authServices] deletePurchaseInquiryLine error ->', err && (err.message || err)); } catch (_) { }
        if (err?.response) {
            try { console.error('[authServices] deletePurchaseInquiryLine response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
        }
        throw err;
    }
}

// Update an existing sales order line (order-specific endpoint)
export async function updateSalesOrderLine(payload = {}, overrides = {}) {
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
        const params = { userUuid, cmpUuid, envUuid };
        console.log('[authServices] updateSalesOrderLine params ->', params);
        console.log('[authServices] updateSalesOrderLine payload ->', payload);
        // updateSalesOrderLine should call the update-sales-order-line endpoint
        const resp = await api.post(PATHS.updateSalesOrderLine, payload, { params });
        console.log('[authServices] updateSalesOrderLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updateSalesOrderLine error ->', err && (err.message || err));
        throw err;
    }
}

// Update an existing sales order line (order-specific endpoint)
export async function updatePurchaseOrderLine(payload = {}, overrides = {}) {
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
        const params = { userUuid, cmpUuid, envUuid };
        console.log('[authServices] updatePurchaseOrderLine params ->', params);
        console.log('[authServices] updatePurchaseOrderLine payload ->', payload);
        const resp = await api.post(PATHS.updatePurchaseOrderline, payload, { params });
        console.log('[authServices] updatePurchaseOrderLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updatePurchaseOrderLine error ->', err && (err.message || err));
        throw err;
    }
}

export async function getSalesOrderLines({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!headerUuid) throw new Error('headerUuid is required');
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    // include multiple key names for header uuid to handle backend naming differences
    const params = { headerUuid, UUID: headerUuid, HeaderUUID: headerUuid, cmpUuid: c, envUuid: e, userUuid: u };
    console.log('[authServices] GetSalesOrderLine params ->', params);
    const resp = await api.get(PATHS.getSalesOrderLines, { params });
    console.log('[authServices] GetSalesOrderLine resp ->', resp);
    return resp.data;
}

// Add sales line for a saved header
export async function addSalesLine(payload = {}, overrides = {}) {
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
        const params = { userUuid, cmpUuid, envUuid };
        console.log('[authServices] addSalesLine params ->', params);
        console.log('[authServices] addSalesLine payload ->', payload);
        const resp = await api.post(PATHS.addSalesLine, payload, { params });
        console.log('[authServices] addSalesLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] addSalesLine error ->', err && (err.message || err));
        throw err;
    }
}

// Update an existing sales line
export async function updateSalesLine(payload = {}, overrides = {}) {
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
        const params = { userUuid, cmpUuid, envUuid };
        console.log('[authServices] updateSalesLine params ->', params);
        console.log('[authServices] updateSalesLine payload ->', payload);
        const resp = await api.post(PATHS.updateSalesLine, payload, { params });
        console.log('[authServices] updateSalesLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] updateSalesLine error ->', err && (err.message || err));
        throw err;
    }
}

// Delete an existing sales line
export async function deleteSalesLine({ lineUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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
        // Send multiple possible param names for compatibility with backend
        const params = {
            UUID: lineUuid,
            userUuid,
            cmpUuid,
            envUuid
        };
        console.log('[authServices] deleteSalesLine params ->', params);
        const resp = await api.delete(PATHS.deleteSalesLine, { params });
        console.log('[authServices] deleteSalesLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deleteSalesLine error ->', err && (err.message || err));
        throw err;
    }
}
// Delete an existing sales line
export async function deleteSalesOrderLine({ lineUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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
        // Send multiple possible param names for compatibility with backend
        const params = {
            UUID: lineUuid,
            userUuid,
            cmpUuid,
            envUuid
        };
        console.log('[authServices] deleteSalesOrderLine params ->', params);
        const resp = await api.delete(PATHS.deleteSalesOrderLine, { params });
        console.log('[authServices] deleteSalesOrderLine response ->', resp && resp.status);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deleteSalesOrderLine error ->', err && (err.message || err));
        throw err;
    }
}
export async function deletePurchaseOrderLine({ lineUuid, overrides = {} } = {}) {
    if (!lineUuid) throw new Error('lineUuid is required');
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
        // Send multiple possible param names for compatibility with backend
        const params = {
            uuid: lineUuid,
            userUuid,
            cmpUuid,
            envUuid
        };
        console.log('[authServices] deletePurchaseOrderLine params ->', params);
        // Some backends expect DELETE payload in the request body rather than query params.
        // Use axios delete with `data` in config so the server receives the params in the body.
        const resp = await api.delete(PATHS.deletePurchaseOrderLine, { params });
        console.log('[authServices] deletePurchaseOrderLine response ->', resp && resp.status, 'method: DELETE, path:', PATHS.getPurchaseOrderLines);
        return resp.data;
    } catch (err) {
        console.error('[authServices] deletePurchaseOrderLine error ->', err && (err.message || err));
        throw err;
    }
}

// Account Purchase

export async function getPurchaseHeaderInquiries({ cmpUuid, envUuid, userUuid, start = 0, length = 10, searchValue = '' } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e, g] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        cmpUuid = c;
        envUuid = e;
        userUuid = g;
    }

    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');

    const params = {
        cmpUuid,
        envUuid,
        start,
        length,
        searchValue,
    };
    console.log(params, "purchase inquiry")

    const resp = await api.get(PATHS.getPurchaseHeaderInquiries, { params });
    console.log(resp);

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
        Start: start,
        Length: length,
        SearchValue: searchValue,
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

// Get currencies list (no countryUuid required) - wraps PATHS.getCurrencies
export async function getCurrencies({ cmpUuid, envUuid, userUuid } = {}) {
    const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
    const params = { cmpUuid: c || '', envUuid: e || '', userUuid: u || '' };
    try { console.log('[authServices] getCurrencies params ->', params); } catch (_) { }
    const resp = await api.get(PATHS.getCurrencies || PATHS.currencies, { params });
    try { console.log('[authServices] getCurrencies resp ->', resp && resp.data); } catch (_) { }
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

// Account: Get All Inquiry Numbers (for dropdowns)
export async function getAllSalesInquiryNumbers({ cmpUuid, envUuid } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    const params = { cmpUuid, envUuid };
    const resp = await api.get(PATHS.getAllSalesInquiryNumbers, { params });
    console.log('Get All Inquiry Numbers response:', resp.data);

    return resp.data;
}
// Account: Get All Inquiry Numbers (for dropdowns)
export async function getAllPurchaseInquiryNumbers({ cmpUuid, envUuid } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    const params = { cmpUuid, envUuid };
    const resp = await api.get(PATHS.getAllPurchaseInquiryNumbers, { params });
    console.log('Get All Inquiry Numbers response:', resp.data);

    return resp.data;
}
// Account: Get Sales Order Numbers (for Sales Order dropdowns)
export async function getSalesOrderNumbers({ cmpUuid, envUuid } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    const params = { cmpUuid, envUuid };
    const resp = await api.get(PATHS.getSalesOrderNumbers, { params });
    console.log('Get Sales Order Numbers response:', resp.data);

    return resp.data;
}
export async function getPurchaseOrderNumbers({ cmpUuid, envUuid } = {}) {
    if (!cmpUuid || !envUuid) {
        const [c, e] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID()]);
        cmpUuid = c; envUuid = e;
    }
    if (!cmpUuid) throw new Error('Missing company UUID');
    if (!envUuid) throw new Error('Missing environment UUID');

    const params = { cmpUuid, envUuid };
    const resp = await api.get(PATHS.getPurchaseOrderNumbers, { params });
    console.log('Get Purchase Order Numbers response:', resp.data);

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
    if (!cmpUuid) throw new Error('cmpUuid is required');
    if (!envUuid) throw new Error('envUuid is required');
    if (!userUuid) throw new Error('userUuid is required');

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

// Timesheet: Get Timesheet PDF (base64 string)
export async function getTimesheetPDF({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!headerUuid) throw new Error('headerUuid is required');

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

        const params = { headerUuid, cmpUuid, envUuid, userUuid };

        try {
            const fullUrl = `${api.defaults.baseURL}/api/TimeSheet/GetTimesheetPDF`;
            console.log('🖨️ [getTimesheetPDF] Request URL:', fullUrl);
            console.log('📋 [getTimesheetPDF] Request Params:', params);
        } catch (_) { }

        const resp = await api.get(PATHS.timesheetSlip, { params });
        console.log('✅ [getTimesheetPDF] Response Status:', resp?.status);

        const unwrap = resp?.data ?? resp;
        const payload = unwrap?.Data ?? unwrap?.data ?? unwrap;

        const pdfBase64 =
            payload?.SlipBase64 ||
            payload?.pdfBase64 ||
            payload?.Pdf ||
            payload?.pdf ||
            payload?.FileBase64 ||
            payload?.fileBase64 ||

            (typeof payload === 'string' ? payload : null);

        if (!pdfBase64) {
            console.log('❌ [getTimesheetPDF] No base64 PDF found in response:', JSON.stringify(payload, null, 2));
            throw new Error('Timesheet PDF not found in response');
        }

        return pdfBase64;
    } catch (error) {
        console.log('❌ [getTimesheetPDF] Error:', error?.message || error);
        console.log('❌ [getTimesheetPDF] Error response:', error?.response?.data);
        console.log('❌ [getTimesheetPDF] Error status:', error?.response?.status);
        throw error;
    }
}

// Expense: Get Expense Slip PDF (base64 string)
export async function getExpenseSlip({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!headerUuid) throw new Error('headerUuid is required');
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        const params = { headerUuid, cmpUuid, envUuid, userUuid };
        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.expenseSlip}`;
            console.log('🧾 [getExpenseSlip] URL:', fullUrl, 'params:', params);
        } catch (_) { }
        const resp = await api.get(PATHS.expenseSlip, { params });
        const unwrap = resp?.data ?? resp;
        const payload = unwrap?.Data ?? unwrap?.data ?? unwrap;
        const pdfBase64 =
            payload?.SlipBase64 ||
            payload?.pdfBase64 ||
            payload?.Pdf ||
            payload?.pdf ||
            payload?.FileBase64 ||
            payload?.fileBase64 ||
            (typeof payload === 'string' ? payload : null);
        if (!pdfBase64) {
            console.log('❌ [getExpenseSlip] No base64 found in response:', JSON.stringify(payload, null, 2));
            throw new Error('Expense PDF not found in response');
        }
        return pdfBase64;
    } catch (error) {
        console.log('❌ [getExpenseSlip] Error:', error?.message || error);
        console.log('❌ [getExpenseSlip] Error response:', error?.response?.data);
        console.log('❌ [getExpenseSlip] Error status:', error?.response?.status);
        throw error;
    }
}

// Sales Order: Get Sales Order Slip PDF (base64 string)
export async function getSalesOrderSlip({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!headerUuid) throw new Error('headerUuid is required');
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        const params = { headerUuid, cmpUuid, envUuid };
        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.salesOrderSlip}`;
            console.log('📋 [getSalesOrderSlip] URL:', fullUrl, 'params:', params);
        } catch (_) { }
        const resp = await api.get(PATHS.salesOrderSlip, { params });
        console.log('[getSalesOrderSlip] Response Status:', resp?.status);
        const unwrap = resp?.data ?? resp;
        // const unwrap = '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Z2luCmJlZ2luY21hcAovQ0lEU3lzdGVtSW5mbyA8PCAvUmVnaXN0cnkgKEFkb2JlKSAvT3JkZXJpbmcgKFVDUykgL1N1cHBsZW1lbnQgMCA+PiBkZWYKL0NNYXBOYW1lIC9BZG9iZS1JZGVudGl0eS1VQ1MgZGVmCi9DTWFwVHlwZSAyIGRlZgoxIGJlZ2luY29kZXNwYWNlcmFuZ2UKPDAwMDA+IDxGRkZGPgplbmRjb2Rlc3BhY2VyYW5nZQoyIGJlZ2luYmZyYW5nZQo8MDAwMD4gPDAwMDA+IDwwMDAwPgo8MDAwMT4gPDAwMjM+IFs8MDA0NT4gPDAwNzg+IDwwMDcwPiA8MDA2NT4gPDAwNkU+IDwwMDczPiA8MDAyMD4gPDAwNDQ+IDwwMDc0PiA8MDA2MT4gPDAwNjk+IDwwMDZDPiA8MDA0RT4gPDAwNkQ+IDwwMDQzPiA8MDA3NT4gPDAwNzI+IDwwMDYzPiA8MDA3OT4gPDAwNkY+IDwwMDY0PiA8MDAyNj4gPDAwNDY+IDwwMDU0PiA8MDA0Mj4gPDAwNDE+IDwwMDUyPiA8MDA2Qj4gPDAwNDk+IDwwMDUzPiA8MDA2Mj4gPDAwM0E+IDwwMDUwPiA8MDA3Nj4gPDAwNzc+IF0KZW5kYmZyYW5nZQplbmRjbWFwCkNNYXBOYW1lIGN1cnJlbnRkaWN0IC9DTWFwIGRlZmluZXJlc291cmNlIHBvcAplbmQKZW5kCgplbmRzdHJlYW0KZW5kb2JqCjYgMCBvYmoKPDwgL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUwCi9CYXNlRm9udCAvQXJpYWxCb2xkCi9FbmNvZGluZyAvSWRlbnRpdHktSAovRGVzY2VuZGFudEZvbnRzIFsyMyAwIFJdCi9Ub1VuaWNvZGUgMjQgMCBSPj4KZW5kb2JqCjI2IDAgb2JqCjw8IC9UeXBlIC9Gb250RGVzY3JpcHRvcgovRm9udE5hbWUgL1FBQkFBQStBcmlhbFJlZ3VsYXIKL0ZsYWdzIDQgCi9Gb250QkJveCBbLTU5NC43MjY1NjIgLTI5MC41MjczNDMgMTc5MC4wMzkwNiA5MzAuMTc1NzgxIF0KL0l0YWxpY0FuZ2xlIDAgCi9Bc2NlbnQgNjUxLjM2NzE4NyAKL0Rlc2NlbnQgLTE4OC40NzY1NjIgCi9DYXBIZWlnaHQgMCAKL1N0ZW1WIDY1LjQyOTY4NzUgCi9Gb250RmlsZTIgMjcgMCBSCj4+CmVuZG9iagoyNyAwIG9iago8PAovTGVuZ3RoMSAxNjc2MCAKL0xlbmd0aCAzMCAwIFIKL0ZpbHRlciAvRmxhdGVEZWNvZGUKPj4Kc3RyZWFtCnic7VkJdFPXmX5Xiw0BOzbyAhjjJ8u2vMirsOUFL7IsW7K1GEnG2NiYZ+nZerYsCS0YmS2hFHooEChN0kKaxGlDSJo9mUCWJm2TNN1mpm2abkl6kvSkbZqeSZvTnukkWMx/73tPloFwOjmnM9NzQEjv3vv++y/fv93nRyGKopZRN1FSirI7q+uyekcPwspR+G6f9MUmzBLuuzD+I0Vl7PGyjMdzyvQoRWV6Ya3BCwsr/k2xGeZ3w7zIOxPZ9TXZjXfB/CWYP+kLuJmR57e/SFGrdsF8ZIbZFaRqqR6Y/xTmtJ+ZYStr3/sA5n+hqKoDlFT6OXSCklPL5KflWopCefxV+mNqQrJqmVyyIkUmwf9kb1FVl75J7doKXJbDl3JZDTTVQdGXLspfjW9C2tQ29HgHhS5dukRRshL5s1galU1JqHdhPiebA2tTKUqbqcwsVmYq35XeevFz0q0X75XNfXwoX9ZBSS7Fge77chqo0ilKhbRIJVVKFUppiTolVYL+9pxk9Xe+tPCrE99Gzx9pW5+nkdMfvYWOxcOStch37/S+vSBp16U/SB8FDllUEUUpVZnazAZdTi7/yUpNUReqpSm5Obo6XYOuRI3ZpqC0W+cn7txis2nr8tehWOz+c9slqNpygLNaEDL3eqcsVjkd1+xHqLCoo2N468RfP3sIHUW+By170cjWp54Z2oLQ1lGAjYoBZvtB9hpsIxZch8VmZ6oyN6hLVIWpICw7MzYffIiz2ZSF8xsatpna2/PygHvZAVRebu79/MJZyfCuRl1xSXtHYOFvFNgzR/xB88gp6rXZUuA8Nz8/L5t8+umPvyw9f9EsSN4r/SGVRyRnN2jreJMF2byhIPsk9/Jmk6moKH35vEJRXdsx0dcnPX/4joL12jpjZXDhgqTTXVMLKKCOzqcW/gvL7wQ8HwLOdZSRooqBizpFXVK/AeATPvWibWoy1YpgZwPMuaoSaUoq+eSKqDfoJO8OO53b7nS66IINWn0V8+IIqmqL7WjQrbkzu65m2+jcnMVSpLoxFaEVNxScW6sYepgtLc/JRQhujvSaCtegqKWARshq2WVsbioqXJW2MkepXD5epitVT2Sz7a2FhWhdfoVGXz7987c2bmyoRQ8WrUlftapQVa4v16Cy0p6GacAsFzDbJz1P3QBxgrSKnNwGnUKL0P74lx74IZ2fXfLq2fiXpOcXvjPi7p2WdAHMsOcQxOeL4I0VvIchQJEKpWYeelhy9P2FX0na3o1X/lxOL+yUHFn448W/SG7/UbwJdkUuvS+dBUn5IKk+RVVIHFKiAwYYoxxtDoEFppLfBZ4fMPWqitJWoHm0Ir2u1tyjb89bg+aPztPKmtqeKq/EuvDn/RUdRUWopLijYw4tiP6XHwAvaQT/C37gIzARA4U4BpKCMTczdkLTZ97OdRnyg08ds/ah+Ywby8t0bGfnfKl6uKupZU0ekp4/ZKyoQBUa+1lk679nISIZHNOUr12DDJ2nFn4h4Xz1DUXFhu6b4wrQYxZCZjfooUjoARqkkujDsmdP6qqrmza5Gjc2N5SWr8qTnj/hURYg7W2FCBXQjZsn4ukY5UB8n4SWN1CZMCkRok3Ls8hA6KFDIyPGTefCM4W6ghK0Ir7vvt+8/eFrL77z9rP23Yfvuz++Ke4EHo5L78km5TrKAFnDFwBtnRiu4ke3ISliQUsCS3aWEMA52VlYpCoFkzq+trK8Ymhoh9tiKSkuKnI0/MtTpm1V1ahJ558+dHJHYONG+dl0q/32O80mbd1rP+0PNeg2bgyGPv/Erl1GIzqb7m5vV6vXr6vXtrZWVxVkayrUNb2mre7BzZWVqKp660g4bU9HR3Pzpp6qypqaovpNm7ipraMbtKh+g9cLWXgM4m4W4i4DxxDUTzG9QT+lMhPmYAgxTKU8hj440L29s1Ndiqam4+/HH0HOcz3dUF4MldE4VMa0jMpKh4M5F44svC95tL017GhpVqwExKhLf0BxQB06UjYO7D0H4gdz5JaPngT5fVAFviovhpxRA5589ifpkEqCWpHBg5yZwceapaZ6bNsJrt++YUP+elRVs2378RemP3NfnyUwY+3rswQDnU7J4d/fcgzqbLnG3h+OfPt3x4/ZrIfvRTviz01NT08jAzJMT6FtMdCg69J70nOgQRHVAFEhOgs+ogdTRGcpMnSk/iHiSF3OYomSnrw7R9253dpsrahEzS7X6HwoiNCGhtHRnd/ffxM6NvejM273ws2qovb27oles8kU8PdZpb9OG9MYKxqnpl8egjzYOfvsHm66sRHdegoNoN0P3zY4uFDntFjVZQg5HccP99ts/ZfFsEJFZfIRpxWi6p0wWoGK6XrVTPjcJuPoaHwfegg9ct99n91r/8bb77z42odv/wbX3hOQ1Qrwej5VTry+GJV4pFBJhThWqSAE+CJCQuCEpPuRkWGdbnjkWUOxpes3v3zYUltXoi5db/geiu7sMqgg3QxdJ+OMnEaFxVuGfUfHmDWFBT3e+BmUubO9be3qFSkLT0veRGtXNzR0jG7cCLrE4l+UPg6ZvZoqBYuEGlMntlUhTTKlWQLign9ipzbo9dtio6M1VWhDvZud2dShL72x1zw1DU439016bf3xL8pVe0zFRe1tofDhU5FoWxtSKevjtdLOC4NDCI0Mv/DU1uHtDMbDAHX0EdLloLejXCHscHnAmgAwSiHNkVKQL5XeV8ZN3/vjubnde15+PhZDCy3L++2zQ+3tcYVEsaLOujvQZ0Xa7FP2TTfd/LsPDh08cOD9G9fd4XJWV6Gp2bbRvj7sy0aQawe57UItwSIW64jYDJPqiHpJHUnOkca70tpaA4GGhhrlwceMXUWq/Py6En2HJTAwUFqacecKbf1ooKY6a5Umd/brXQa1GtJmy1DwGWYcrVuzXautrGxroLOVlcqClqbujoaGorwsBSpQ6hpGs83lpai4uJZenZexXFm1br2u0bGpu0ettlrAgiZ0RFIm0eDcVtQrs5vQn9CRe+7BttVDFzwNeQV5XZytLEl0dbEaqkU/C30cPtLTF78iyaZ7zUde6+tDBqM/Yuw5mxH0P/cN/wzUcWVv30NfKC3LO3OmuWHL4MCORyYnRsY6O7u7d2deGGc47rTdYnG5Ts1VaCpAvgXy+nH5jdijPLY5wsmMHCkUymyllCCbLcSY5X5Fl3F7dJMdIYt1n629rej2/ZKjC3/tiX7m67M70eT+Xz65Ywfakr67vQ0NDX7hSL8dFamasiT3nI7f7UA7dz3zxIG7EOsBya9ASD0Alq8k50RsWD02XSt5YL5ldKzvMMuWe2WSRl1j3h1tI0ObhSqId5RTzYK2upzEIUjQr75ELI1C+wCnI6H+5GbxseM5o2jUDfY26YqKVq9GNS4X89XgDjQbfWz/NNeo0zX4fCdPM+OSmyBBfPZ+1Ne7I2AyoZp0f20dnDcKmxrHt7PLc23VNWh257demYsho3H/TX+++MXbrLbNA5I3jzg3bdny+X02m82OPTwIHj4HCGfwvud9qOL9PCjdtHf3ns7atLOSlia/b7cscmbvoTd//ft7Xzr9xus//MFRvL8Cek8LOZNTcGgHDspM9Hq8X5YRt8k+e+bMx7uBxgTIHIQMUYl5mTgkktgRyzU+BGIHS357Z97U9B0v7pzVar3c3Bn3+Lqv5DY22+csVoR6zbPbOjrQSPbXRkbQTfs/+HIk3Nxs679l9VhdzeDQcy8MDqKWZpAJJ2Pp8SvPYnPzaO+P47eiE6/EXwrCWSwLfSZ+18ID6Lcz8cOwq+DSh+gDuRSflItzheZen6mq19bDASxblZnFn8jQL3K7GgZr6lZlzc7CYXvZsixF0doTt6Sj/LyqypOSor3vM/En9y682q3IvmElAr4Alew20GY50QaBQiqUefRxyeNnH1+wyemPP5KlfPSWLOXjjyCOWgGt84BWJqUEn2TwpYMPF3g+KdGlLC2iradij720d4+u0Tu157tzu8+ifntsF8S1vX82BuHxBkrdP4X23/zOBY5rbgHE/nx+eAQK59bnHt26dXgEdFsGul0A3fiTLsLnQrhIpHH5c2igND+/DLkfW4jL6Ys9YfeUT/r0R2/hatuGT62wK4cqSTq36habPwZdiGidEOGSd7Y+EhrbvqEeVVePjUUHugzl8wt+q2WK6zWjPsuMz2Taday9NRQ4dSwabmtFRcVN6GfwDPf6+a3Dmwcfe3Fk65ZBHHNn4WeUOo/rlRaeec6eP38eVqOwmkOehYjHo/P4+Q/Wz0H/rOdPLtCZMs8di+9LufBfJpj3QnXBGVtA1VCd/GlSV5JoF6SPZic90yiSzcHHTWmWeHIUnYGMbA1koXfi6w96uZqa8VhHO1SVb0Eo6zu3tGwcG21pRq2tw9A062la39EbhhJpsUZCvb2S7xYZDWO3jMPD/PERQ1dR6eCWuXOhCEKR0EP7Bzej2m3NLS1NmwfbNqLmFsfCPd0depWqty8UsVr6cA3Pj++DHDtPrQMr1cJpVoc9KT66pPABFFq1obReWZCTrpKuiN/+8Mtw7FT/YD5+e0uBRtdoqY6fuh2ehejV29PWSi8svM6Fpqcl5Rcb72ixF5cgjD2cWCStgCZ5isWJIeZxKp/D2ThN7jp+PDO3pXmqy7lGW9G7nkZPX5A272XHqltL1RnHlhfQA4N7L34HuPVAlj4BPlPjU5sKd0NtqkroJCpI2PqEIUod6doqnfSJ4WfWKRTLvj8cXEHT2voe0xaJ8j8WPjzYWl9fVp6XtyKeNYxOZhuM4deH5fRBZWl5/cHOhkZ1WXbuwnOShoMrb1iTo1JWHrRUVR3E51r8vfnff/bB2I0b/4r/6HL5v0vx+D75AXhWQFRKYhH2yBsgrhTZA0AxID9AOCX/q5SPUe/KXrkUl35M7YJvDN1OzeErfDult1K5aAHy7hXqEMyj8v+kYpJxaha+AVhzwPcYvg/3LPA14nW5hjoh7DfA/kZYa4JxvUDzinAdlG2nKuC+Cb7w/EcVwL6jsN4KPJfBtR3WzoIuUfQGdQ7mvUCXD2uZMAZvUFnQ88PUV6hHqTdRL/LAZz96FP1Fkitpktwt+YnkLalSGpOekb4tU8nGZN+U/as8Td4rd8ufl/9a/qeU8hRjyo6UwykvpPwqdXWqKrU6dWPqPak/S11Y1kYQqqS6cR7yCF7xr1nyPPyS+5K1ZEVKKG8gMzyWUOmSImEspbokdcJYlkQjp1ZLdgrjFKA/LoxTKY/kDmG8DDI+XRgvp45IRVlp6TLpEVE3lJZ5XBgjSr7qjDCWUKmr7hbGUqpw1X3CWJZEI6dWrvqeME4B+teEcSpVu+oNYbyMWp15qzBeThkVacI4LVWicABnJJOCrJVrXWQsh3HG2u1knELWg2ScStb3kPEyMj5KxtBpJOvX3iGMeQz5MY8hP+Yx5MeyJBoeQ37MY8iPU6nxdc8IYx5DfsxjyI/T0rPy15HxDUn6r8C6VdSQ8cqk9XQ8rugg4wysW4WFjBUwXlUxTMZZSfTZhI+PjHOS1teQvTwOeYTmCBnnJ9EUJI2LCP1pMi4n43NkXEnGT+HxsiT9lyXJWpm0vlK05X6KpuoAkVpKByMX5aVYuFqpAOWHb4SKUUGyYoBZCMb4l4F1jlBUwR095YMPTTlgbRL2RyAP8YyFKwvUO+HXQyjT4GOC2TisstQsrNgJdz/IFeVYgHsMeEeBDw18A8CTo9wwdsM4CPdCCTl0QvsaSgujksRMR2mIDgxwCAItDXIZkIN5uKlpgbYXZl5YxXejoGM4YRPGgSN2+D5RnwmCBQ0dmAOLfGSVIUgstZHnExAspYmUKNx1E3vxbAJ4z8LeEFmJApWHIEfDuugPM+iE0eHIPj/BtoXsZwkFS82ATIy0h/zSgkYiLU3Ww7CC8QsmPLhoB74fAS042BkGFPSEEluEfTkJevmIjpfHRnMSJX0ZLQ3P1VaiRwh2iLaWUZuJfeGEDjqQh324yMkK9ibzFXFkCCo4Bj3EZixlmuA78ani90rKxVjsIrSzQOsHm3C0TsCHEzxXSawNAOocscFG7nhhBdseJhHYT2SFyB2O6O6E30UPY4tqqSaqEeL2Spywd6OgS5D4kvfqBNE3QqJ0iEQSTVCIkcjhPR1JRK9IjdcCJIdwjGGdWKKfh9AFhSjXEHz9RE6QaM3vdQtcWGHOEN5BYsEMUEXIPbxrnOghRu3lERgRdvD5ELpiZSJhgyYxX8yAK9EJkrkH9rhhrhGyAVccXq4mIedyC3iPzRKc3KQ+XA2zWcFSjlQOH6kRYi27HHu8x0dGpUBftiQjr86d1+HTYpuc72J8hkiGi/EmxvjVLBClX6lXS1IMYEt4WyJEnpg9IVIjYiR+AoCSn9RF5hMt5WOPWRJVfH0LCL+8VfwYV9qgUG+xtqI3RT6YElf1a8Uo35f8gmcWuYsZwgkoh0gH4EgORwTf4i4l1pEJks0+YqWI8tKo1hDPMGTsEeLgyrp9eSaUkv6F7WymquHDklqEZUyT6swSrzKwhhGaBArxXrXAc+yyXlAmZO9itQgnEBO1+Z9027+zu9HrLuNhEXnQ+YlonoI13k9i1LDkVOATuuJidF+rY4tR+cldG3uuP5E54aT+wvubjwJWkDVJYtkv+F1DbA4J3ZSvPbgyMAR/3s9iHPNxFRQqOC8B9wG+e/oTkcJQi6eWy+vZP8AXCYQYYntA6Dli/fCQlShgw+fIYhekSVfzCTFTKur4yb6lcB9bcm4Bb5clYeQhXca3pM5caeM1+JHqy5F9IvXVq5vmsuomYn/5bowaX0+T7Rb1WjxTLmbNYicSfagh9T5ApEwk5mxShOC6xXsoDNwWOyyv9TjRhRU6VTThy+RawvuwWvB4mGSJL6GDmNdLY+nvRzW5w/NWJneapTG9iMQswXHmU/pR7Ab4zOsXkGGTNPCQXyxzEZcpoHAn9Y7INeoxX/k9xAKx4zUvqeIMcAyQinP1pwj+/Cd2mUV8xE62iFFyTVm6K0xqBe+rccHuq/dc5hM8GkpYHyZR6ifc+SziO29yR/+0ESD2NxNlJHftVDfMBqFbOsiKGdbwudUBdzbDrAtWuyj8ly49uYPvq4mnBkkfMgHdAOlxPA8H/NpgPkRqXDdFkzme9QG9DXjhvUZqC5FhBG5OQukgvK2waoGrUaDDOwywMgBzPO4hVZCXZ4Nd/DORWeiJvKYuWKcTFi7VykwkippZYeYA/ibhrh54mwk/rD+W303GtoSe3YKmeoIR5ox5GkAjC5nh1QG49gOdk8jXE5t5bW3Ehm64z9tiJBpgyVWCrTwdxmezcAf7COtngc+iVXqCgYlos4ifAa79oDnm3wN3XaRD2GFnF7HUSdAzCphhay1ktmgV7ykDsQajijHogrEVvj0J7Bzkl9fFkcRtKXaD5P4iFW+fXvg1EOTsZMZ7w0BmLuIrfFcj+NJB7Lhc6iCJRCOh0hOLnYkI6SbRy2svRicvw56kCS8P+zZZFzGq6WvkCM9FvD8gePpKXDDqeoIJ1suZkPxJnKvup+tqanW0y8vS1oA/EIkFWdoQCAUDISbCBfxVtN7nox3cpDcSph1smA3tZD1VdFqaiR0PsbO0Pcj6XXiPhYkFohHaF5jk3LQ7EIyF8B4as6/R0iX4otPQDsYX9NImxu8OuKdhtTfg9dOmqCeMJbm8XJj2JfOZCIToTm7cx7kZHy1IBJoACKXDgWjIzcJlIjLLhFg66vewITqC7TC7aAvnZv1htoUOsyzNzoyzHg/roX38Ku1hw+4QF8QGEhkeNsJwvnCVPsQxPgc7GfUxIRGNZrJIC6t0qZVzhwJYatlmNhTGHHRVNVpCZHXxtKAiQ0dCjIedYULTdGDik+FNLBIQu0LMLOefpO0TE6ApXUk7AuOcn7Zxbm/Ax4Q1dD8TCXFujqGdDLE3TNc2NdYlVKLD0WDQx4GlEwF/pIoeCkTpGSZGR8HmCEYXL9ORAO0OsUyE1dAeLhwExDU04/fQwRAHd91AwsKVCdNBNjTDRSLAbjxGkBXxi8ANcENIHExgCRp8Jfgn1AmGAp6oO6KhcdzAXg3eIwoAw2a9YFmSZrMglPO7fVEPDjJR+4DfF6NLuTLej0nkwOFa2vJux3iG2DDGDSO+KABvT/BqIQiUciAlws5g94Q4kOoJzPp9AcazFD2GhwrCDcwJgCj4jUaCELYeFpuJabysL7gUUUglf0wgxw4BhoCPlxvnQOeqtDQcIxMBny9AQkCAWkOPM2HQNeBPhLbohFJvJBJsrq5m/VWz3DQXZD0cUxUITVbjWTVQjglJUAbuJWERxophNlfP2qtl208ECgumeBXDPBUAmzA07E7WB5lI4F6a1xjKJZmdltaPnRMm6QJ2AwQs7JoMMYCMR0NPhCBLIXrcXiY0CTZjjAEr8ChspwPjkJ1+DApDKosYZ3+/FVghJhwOQObg+PAE3NEZ8AjDFwDOB8iUYo5LrKWdQml5tYxo5GFxavN+uCodPctFvHg5Kdw0Qrhh7cXbPg7ilJeNeYX44goSSBJhCzX0TMDDTeArSwAJRsGgsJckLLAej+LkDeNFIUrAwmowPMxCtQYO2NcCSldVlU94EMknjYA0UWLWG5i5ho04DaIhPyjDEgaeAJRgossU646IAbYYxxD8Ho4kXjMf4sx4YCeb1CGg/uGUIfrgJAsuRopwK+xlwKpxdknmMkmGhrD4cASCCVdfSF4+0a8FAM43k5F22rtdg3qHkTY76X6HfbO5y9hFq/VOmKs19KDZZbIPuGigcOhtriHa3k3rbUN0n9nWpaGNW/odRqeTtjtos7XfYjbCmtlmsAx0mW09dCfss9mhEZkhE4Gpy05jgQIrs9GJmVmNDoMJpvpOs8XsGtLQ3WaXDfPsBqZ6ul/vcJkNAxa9g+4fcPTbnUYQ3wVsbWZbtwOkGK1Gm6sKpMIabdwME9pp0lssRJR+ALR3EP0M9v4hh7nH5KJNdkuXERY7jaCZvtNi5EWBUQaL3mzV0F16q77HSHbZgYuDkAnaDZqMZAnk6eG/wWW227AZBrvN5YCpBqx0uBJbB81Oo4bWO8xODEi3ww7sMZyww06YwD6bkeeCoaaXeARI8HzAaVzUpcuotwAvJ96cTFwFZ5wAeV5iyJPaOBVDafDkMQVPLu+RpybxnlN4zvGQZxOP9LT0Mek3pC/A92npM9IH/5ffTd1AvtffT/3zvZ/6x70buv5G5vobmetvZP7v38jwtfn6W5l/zrcyvPeuv5m5/mbm+puZ629mLq/m19/OLH07I6Jz/Q3N9Tc019/Q/D97Q5P0tw2G9Ahx/jbMkv/uwS756wb5+8aS+3BSka2X1cr6ZD2yVvhtWsLJD/ttQLeTnOH5WuZFj6J5KUVqK372DZEncSyD+m93LcSHCmVuZHN0cmVhbQplbmRvYmoKMzAgMCBvYmoKNzA0MAplbmRvYmoKMjggMCBvYmoKPDwgL1R5cGUgL0ZvbnQKL1N1YnR5cGUgL0NJREZvbnRUeXBlMgovQmFzZUZvbnQgL0FyaWFsUmVndWxhcgovQ0lEU3lzdGVtSW5mbyA8PCAvUmVnaXN0cnkgKEFkb2JlKSAvT3JkZXJpbmcgKElkZW50aXR5KSAvU3VwcGxlbWVudCAwID4+Ci9Gb250RGVzY3JpcHRvciAyNiAwIFIKL0NJRFRvR0lETWFwIC9JZGVudGl0eQovVyBbMCBbNjY2IDU5MiA0OTQgNDk0IDE5NyA0OTQgNDk0IDQ0NCAyNDcgNTkyIDQ5NCA3NDAgMjk1IDI5NSA1OTIgNTkyIDI0NyA0OTQgNDk0IDI5NSA2NDEgNDk0IDQ5NCA0NDQgMjk1IDQ5NCA0OTQgNDk0IDQ5NCA0OTQgNTQzIDQ0NCA0NDQgMjQ3IDY0MSA0OTQgNTkyIDQ5NCAyNDcgMTk3IDIzMSA0OTQgNDQ0IDI0NyA0OTQgXQpdCj4+CmVuZG9iagoyOSAwIG9iago8PCAvTGVuZ3RoIDY3MiA+PgpzdHJlYW0KL0NJREluaXQgL1Byb2NTZXQgZmluZHJlc291cmNlIGJlZ2luCjEyIGRpY3QgYmVnaW4KYmVnaW5jbWFwCi9DSURTeXN0ZW1JbmZvIDw8IC9SZWdpc3RyeSAoQWRvYmUpIC9PcmRlcmluZyAoVUNTKSAvU3VwcGxlbWVudCAwID4+IGRlZgovQ01hcE5hbWUgL0Fkb2JlLUlkZW50aXR5LVVDUyBkZWYKL0NNYXBUeXBlIDIgZGVmCjEgYmVnaW5jb2Rlc3BhY2VyYW5nZQo8MDAwMD4gPEZGRkY+CmVuZGNvZGVzcGFjZXJhbmdlCjIgYmVnaW5iZnJhbmdlCjwwMDAwPiA8MDAwMD4gPDAwMDA+CjwwMDAxPiA8MDAyQz4gWzwwMDQxPiA8MDA2Mj4gPDAwNjg+IDwwMDY5PiA8MDA2RT4gPDAwNjE+IDwwMDc2PiA8MDAyMD4gPDAwNEI+IDwwMDc1PiA8MDA2RD4gPDAwNzI+IDwwMDI4PiA8MDA1Mz4gPDAwNTA+IDwwMDJGPiA8MDAzMD4gPDAwMzY+IDwwMDI5PiA8MDA1Mj4gPDAwNzA+IDwwMDY1PiA8MDA3Mz4gPDAwMkQ+IDwwMDMyPiA8MDAzNT4gPDAwMzE+IDwwMDM5PiA8MDAzNz4gPDAwNTQ+IDwwMDYzPiA8MDA2Qj4gPDAwNzQ+IDwwMDRFPiA8MDA2Rj4gPDAwNTY+IDwwMDY0PiA8MDAyRT4gPDAwNkM+IDwwMDdDPiA8MDAzOD4gPDAwNzk+IDwwMDY2PiA8MjBCOT4gXQplbmRiZnJhbmdlCmVuZGNtYXAKQ01hcE5hbWUgY3VycmVudGRpY3QgL0NNYXAgZGVmaW5lcmVzb3VyY2UgcG9wCmVuZAplbmQKCmVuZHN0cmVhbQplbmRvYmoKNyAwIG9iago8PCAvVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTAKL0Jhc2VGb250IC9BcmlhbFJlZ3VsYXIKL0VuY29kaW5nIC9JZGVudGl0eS1ICi9EZXNjZW5kYW50Rm9udHMgWzI4IDAgUl0KL1RvVW5pY29kZSAyOSAwIFI+PgplbmRvYmoKMiAwIG9iago8PAovVHlwZSAvUGFnZXMKL0tpZHMgClsKNSAwIFIKXQovQ291bnQgMQovUHJvY1NldCBbL1BERiAvVGV4dCAvSW1hZ2VCIC9JbWFnZUNdCj4+CmVuZG9iagp4cmVmCjAgMzEKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwNDk4NzUgMDAwMDAgbiAKMDAwMDAwMDE5MyAwMDAwMCBuIAowMDAwMDAwMjg4IDAwMDAwIG4gCjAwMDAwMzA0NDYgMDAwMDAgbiAKMDAwMDA0MTA4MCAwMDAwMCBuIAowMDAwMDQ5NzM3IDAwMDAwIG4gCjAwMDAwMDAzMjUgMDAwMDAgbiAKMDAwMDAxMzU5NCAwMDAwMCBuIAowMDAwMDEzNjE1IDAwMDAwIG4gCjAwMDAwMzAwNDkgMDAwMDAgbiAKMDAwMDAzMDA3MSAwMDAwMCBuIAowMDAwMDMwMTIzIDAwMDAwIG4gCjAwMDAwMzAyNzkgMDAwMDAgbiAKMDAwMDAzMDE2NiAwMDAwMCBuIAowMDAwMDMwMzQyIDAwMDAwIG4gCjAwMDAwMzA3NzYgMDAwMDAgbiAKMDAwMDAzMzExNCAwMDAwMCBuIAowMDAwMDMwNTY3IDAwMDAwIG4gCjAwMDAwMzA3NTYgMDAwMDAgbiAKMDAwMDAzMzEzNSAwMDAwMCBuIAowMDAwMDMzMzg1IDAwMDAwIG4gCjAwMDAwNDAwNjYgMDAwMDAgbiAKMDAwMDA0MDQxOSAwMDAwMCBuIAowMDAwMDQwMDQ1IDAwMDAwIG4gCjAwMDAwNDEyMTUgMDAwMDAgbiAKMDAwMDA0MTQ2OCAwMDAwMCBuIAowMDAwMDQ4NjIxIDAwMDAwIG4gCjAwMDAwNDkwMTMgMDAwMDAgbiAKMDAwMDA0ODYwMCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDMxCi9JbmZvIDEgMCBSCi9Sb290IDE2IDAgUgo+PgpzdGFydHhyZWYKNDk5NzMKJSVFT0YK';
        const payload = unwrap?.Data ?? unwrap?.data ?? unwrap;
        const pdfBase64 =
            payload?.SlipBase64 ||
            payload?.pdfBase64 ||
            payload?.Pdf ||
            payload?.pdf ||
            payload?.FileBase64 ||
            payload?.fileBase64 ||
            (typeof payload === 'string' ? payload : null);
        if (!pdfBase64) {
            console.log('❌ [getSalesOrderSlip] No base64 found in response:', JSON.stringify(payload, null, 2));
            throw new Error('Sales Order PDF not found in response');
        }
        return pdfBase64;
    } catch (error) {
        console.log('❌ [getSalesOrderSlip] Error:', error?.message || error);
        console.log('❌ [getSalesOrderSlip] Error response:', error?.response?.data);
        console.log('❌ [getSalesOrderSlip] Error status:', error?.response?.status);
        throw error;
    }
}

// Purchase Order: Get Purchase Order Slip PDF (base64 string)
export async function getPurchaseOrderSlip({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!headerUuid) throw new Error('headerUuid is required');
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        const params = { headerUuid, cmpUuid, envUuid };
        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.purchaseOrderSlip}`;
            console.log('📋 [getPurchaseOrderSlip] URL:', fullUrl, 'params:', params);
        } catch (_) { }
        const resp = await api.get(PATHS.purchaseOrderSlip, { params });
        console.log('[getPurchaseOrderSlip] Response Status:', resp?.status);
        const unwrap = resp?.data ?? resp;
        const payload = unwrap?.Data ?? unwrap?.data ?? unwrap;
        const pdfBase64 =
            payload?.SlipBase64 ||
            payload?.pdfBase64 ||
            payload?.Pdf ||
            payload?.pdf ||
            payload?.FileBase64 ||
            payload?.fileBase64 ||
            (typeof payload === 'string' ? payload : null);
        if (!pdfBase64) {
            console.log('❌ [getPurchaseOrderSlip] No base64 found in response:', JSON.stringify(payload, null, 2));
            throw new Error('Purchase Order PDF not found in response');
        }
        return pdfBase64;
    } catch (error) {
        console.log('❌ [getPurchaseOrderSlip] Error:', error?.message || error);
        console.log('❌ [getPurchaseOrderSlip] Error response:', error?.response?.data);
        console.log('❌ [getPurchaseOrderSlip] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

// Purchase Performa Invoice: Get Purchase Performa Invoice Slip PDF (base64 string)
export async function getPurchasePerformaInvoiceSlip({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!headerUuid) throw new Error('headerUuid is required');
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        const params = { headerUuid, cmpUuid, envUuid };
        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.purchasePerformaInvoiceSlip}`;
            console.log('📋 [getPurchasePerformaInvoiceSlip] URL:', fullUrl, 'params:', params);
        } catch (_) { }
        const resp = await api.get(PATHS.purchasePerformaInvoiceSlip, { params });
        console.log('[getPurchasePerformaInvoiceSlip] Response Status:', resp?.status);
        const unwrap = resp?.data ?? resp;
        const payload = unwrap?.Data ?? unwrap?.data ?? unwrap;
        
        // Handle nested structure like {data: {pdfBase64: '...'}}
        const pdfBase64 =
            payload?.SlipBase64 ||
            payload?.pdfBase64 ||
            payload?.data?.pdfBase64 ||
            payload?.Pdf ||
            payload?.pdf ||
            payload?.FileBase64 ||
            payload?.fileBase64 ||
            (typeof payload === 'string' ? payload : null);
        if (!pdfBase64) {
            console.log('❌ [getPurchasePerformaInvoiceSlip] No base64 found in response:', JSON.stringify(payload, null, 2));
            throw new Error('Purchase Performa Invoice PDF not found in response');
        }
        return pdfBase64;
    } catch (error) {
        console.log('❌ [getPurchasePerformaInvoiceSlip] Error:', error?.message || error);
        console.log('❌ [getPurchasePerformaInvoiceSlip] Error response:', error?.response?.data);
        console.log('❌ [getPurchasePerformaInvoiceSlip] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

// Get related documents for a purchase performa
export async function getPurchasePerformaRelatedDocuments({ purchasePerformaUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!purchasePerformaUuid) throw new Error('purchasePerformaUuid is required');
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { purchasePerformaUuid, cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] getPurchasePerformaRelatedDocuments params ->', params);
        const resp = await api.get('/api/Account/GetPurchasePerformaRelatedDocuments', { params });
        console.log('[authServices] getPurchasePerformaRelatedDocuments resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchasePerformaRelatedDocuments error ->', err && (err.message || err));
        throw err;
    }
}

// Get related documents for a purchase invoice
export async function getPurchaseInvoiceRelatedDocuments({ purchaseInvoiceUuid, cmpUuid, envUuid, userUuid } = {}) {
    if (!purchaseInvoiceUuid) throw new Error('purchaseInvoiceUuid is required');
    try {
        const [c, e, u] = await Promise.all([cmpUuid || getCMPUUID(), envUuid || getENVUUID(), userUuid || getUUID()]);
        const params = { purchaseInvoiceUuid, cmpUuid: c, envUuid: e, userUuid: u };
        console.log('[authServices] getPurchaseInvoiceRelatedDocuments params ->', params);
        const resp = await api.get('/api/Account/GetPurchaseInvoiceRelatedDocuments', { params });
        console.log('[authServices] getPurchaseInvoiceRelatedDocuments resp ->', resp);
        return resp.data;
    } catch (err) {
        console.error('[authServices] getPurchaseInvoiceRelatedDocuments error ->', err && (err.message || err));
        throw err;
    }
}

// Purchase Invoice: Get Purchase Invoice Slip PDF (base64 string)
export async function getPurchaseInvoiceSlip({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!headerUuid) throw new Error('headerUuid is required');
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        const params = { headerUuid, cmpUuid, envUuid };
        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.purchaseInvoiceSlip}`;
            console.log('📋 [getPurchaseInvoiceSlip] URL:', fullUrl, 'params:', params);
        } catch (_) { }
        const resp = await api.get(PATHS.purchaseInvoiceSlip, { params });
        console.log('[getPurchaseInvoiceSlip] Response Status:', resp?.status);
        console.log('[getPurchaseInvoiceSlip] Full Response:', resp);
        const unwrap = resp?.data ?? resp;
        const payload = unwrap?.Data ?? unwrap?.data ?? unwrap;
        const pdfBase64 =
            payload?.data?.pdfBase64 ||
            payload?.pdfBase64 ||
            payload?.SlipBase64 ||
            payload?.Pdf ||
            payload?.pdf ||
            payload?.FileBase64 ||
            payload?.fileBase64 ||
            (typeof payload === 'string' ? payload : null);

            console.log(pdfBase64,'8522')
        if (!pdfBase64) {
            console.log('❌ [getPurchaseInvoiceSlip] No base64 found in response:', JSON.stringify(payload, null, 2));
            throw new Error('Purchase Invoice PDF not found in response');
        }
        return pdfBase64;
    } catch (error) {
        console.log('❌ [getPurchaseInvoiceSlip] Error:', error?.message || error);
        console.log('❌ [getPurchaseInvoiceSlip] Error response:', error?.response?.data);
        console.log('❌ [getPurchaseInvoiceSlip] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

// Sales Performa Invoice: Get Sales Performa Invoice Slip PDF (base64 string)
export async function getSalesPerformaInvoiceSlip({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!headerUuid) throw new Error('headerUuid is required');
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        const params = { headerUuid, cmpUuid, envUuid, userUuid };
        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.salesPerformaInvoiceSlip}`;
            console.log('📋 [getSalesPerformaInvoiceSlip] URL:', fullUrl, 'params:', params);
        } catch (_) { }
        const resp = await api.get(PATHS.salesPerformaInvoiceSlip, { params });
        console.log(resp,'555');
        
        const unwrap = resp?.data ?? resp;
        const payload = unwrap?.Data ?? unwrap?.data ?? unwrap;
        const pdfBase64 =
            payload?.SlipBase64 ||
            payload?.pdfBase64 ||
            payload?.Pdf ||
            payload?.pdf ||
            payload?.FileBase64 ||
            payload?.fileBase64 ||
            (typeof payload === 'string' ? payload : null);
        if (!pdfBase64) {
            console.log('❌ [getSalesPerformaInvoiceSlip] No base64 found in response:', JSON.stringify(payload, null, 2));
            throw new Error('Sales Performa Invoice PDF not found in response');
        }
        return pdfBase64;
    } catch (error) {
        console.log('❌ [getSalesPerformaInvoiceSlip] Error:', error?.message || error);
        console.log('❌ [getSalesPerformaInvoiceSlip] Error response:', error?.response?.data);
        console.log('❌ [getSalesPerformaInvoiceSlip] Error status:', error?.response?.status);
        throw error;
    }
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

        const resp = await api.post(PATHS.attendanceSubmit, payload, { params });
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

        // Allow caller to include UUIDs inside payload under common keys
        userUuid = userUuid || payload?.UserUuid || payload?.userUuid || null;
        cmpUuid = cmpUuid || payload?.CmpUuid || payload?.cmpUuid || null;
        envUuid = envUuid || payload?.EnvUuid || payload?.envUuid || null;

        // Fallback to stored values when not provided
        if (!userUuid || !cmpUuid || !envUuid) {
            const [u, c, e] = await Promise.all([
                userUuid || getUUID(),
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
            ]);
            userUuid = userUuid || u;
            cmpUuid = cmpUuid || c;
            envUuid = envUuid || e;
        }

        if (!userUuid) throw new Error('Missing user UUID');
        if (!cmpUuid) throw new Error('Missing company UUID');
        if (!envUuid) throw new Error('Missing environment UUID');

        const params = { userUuid, cmpUuid, envUuid };
        console.log('API params:', params);

        // Build multipart form body
        const form = new FormData();
        const appendedFields = [];
        const appendIfDefined = (key, value) => {
            if (value === undefined || value === null) return;
            try { form.append(key, String(value)); } catch (_) { try { form.append(key, value); } catch (_) {} }
            appendedFields.push(key);
        };
        // append both lowercase and capitalized variants for compatibility
        appendIfDefined('userUuid', userUuid);
        appendIfDefined('UserUuid', userUuid);
        appendIfDefined('cmpUuid', cmpUuid);
        appendIfDefined('CmpUuid', cmpUuid);
        appendIfDefined('envUuid', envUuid);
        appendIfDefined('EnvUuid', envUuid);

        // File support: prefer { uri, name, type } else fallback to string
        const fileObj = payload?.profileImageFile;
        if (fileObj?.uri && fileObj?.name) {
            form.append('profileImage', {
                uri: fileObj.uri,
                name: fileObj.name,
                type: fileObj.type || 'image/jpeg',
            });
        } else if (payload?.ProfilePath || payload?.profilePath || payload?.profileImage) {
            // Support three styles callers may send: ProfilePath, profilePath, or profileImage
            const p = payload?.ProfilePath || payload?.profilePath || payload?.profileImage;
            // Append multiple possible server-expected keys
            appendIfDefined('ProfilePath', p);
            appendIfDefined('profilePath', p);
            appendIfDefined('ProfileImage', p);
            appendIfDefined('profileImage', p);
            appendIfDefined('profileImagePath', p);
            appendIfDefined('ProfileImagePath', p);
        }

        try { console.log('[authServices] updateProfileImage - form entries appended'); } catch(_) {}

        try {
            try { console.log('[authServices] updateProfileImage - sending to', PATHS.updateProfileImage, 'params', params); } catch (_) {}
            try { console.log('[authServices] updateProfileImage - appended fields ->', appendedFields); } catch (_) {}
            const resp = await api.post(PATHS.updateProfileImage, form, {
                params,
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            console.log('Update profile image response:', resp && resp.data ? resp.data : resp);
            return resp.data;
        } catch (error) {
            console.log('[authServices] updateProfileImage error response data:', error?.response?.data);
            console.log('[authServices] updateProfileImage error status:', error?.response?.status);
            throw error;
        }
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
export async function getDashboardLeadSummary({ cmpUuid, envUuid, superAdminUuid, start, length } = {}) {
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
            cmpUuid: cmpUuid,
            envUuid: envUuid,
            superAdminUuid: superAdminUuid,
            // Optional server-side pagination (support multiple casings)
            ...(start !== undefined && { start, Start: start }),
            ...(length !== undefined && { length, Length: length }),
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
            const [c, e, g] = await Promise.all([
                cmpUUID || getCMPUUID(),
                envUUID || getENVUUID(),
                userUUID || getUUID(),
            ]);
            cmpUUID = c; envUUID = e; userUUID = g;
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
            cmpUuid = c; envUuid = e; superAdminUuid = u;

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
            cmpUuid = c; envUuid = e; superAdminUuid = u;

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
            cmpUuid = c; envUuid = e; superAdminUuid = u;

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

// Add the API endpoint for submitting a purchase quotation header
export async function postAddPurchaseQuotationHeader(payload = {}, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        const [c, e, u] = await Promise.all([
            cmpUuid || getCMPUUID(),
            envUuid || getENVUUID(),
            userUuid || getUUID(),
        ]);
        const params = { cmpUuid: c || '', envUuid: e || '', userUuid: u || '' };
        try { console.log('[authServices] postAddPurchaseQuotationHeader params ->', params); } catch (_) { }

        const targetPath = PATHS.postAddPurchaseQuotationHeader || PATHS.postpurchaseQuotationHeader || '/api/Account/AddPurchaseQuotationHeader';
        const resp = await api.post(targetPath, payload, { params });
        try { console.log('[authServices] postAddPurchaseQuotationHeader resp ->', resp && resp.status); } catch (_) { }
        return resp.data;
    } catch (err) {
        try {
            console.error('[authServices] postAddPurchaseQuotationHeader error ->', err && (err.message || err));
            if (err?.response) {
                try { console.error('[authServices] postAddPurchaseQuotationHeader response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
            }
        } catch (_) { }
        throw err;
    }
}

export async function getSalesInvoiceSlip({ headerUuid, cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!headerUuid) throw new Error('headerUuid is required');
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }
        const params = { headerUuid, cmpUuid, envUuid, userUuid };
        try {
            const fullUrl = `${api.defaults.baseURL}${PATHS.salesInvoiceSlip}`;
            console.log('📋 [getSalesInvoiceSlip] URL:', fullUrl, 'params:', params);
        } catch (_) { }
        const resp = await api.get(PATHS.salesInvoiceSlip, { params });
        const unwrap = resp?.data ?? resp;
        const payload = unwrap?.Data ?? unwrap?.data ?? unwrap;
        const pdfBase64 =
            payload?.SlipBase64 ||
            payload?.pdfBase64 ||
            payload?.Pdf ||
            payload?.pdf ||
            payload?.FileBase64 ||
            payload?.fileBase64 ||
            (typeof payload === 'string' ? payload : null);
        if (!pdfBase64) {
            console.log('❌ [getSalesInvoiceSlip] No base64 found in response:', JSON.stringify(payload, null, 2));
            throw new Error('Sales Invoice PDF not found in response');
        }
        return pdfBase64;
    } catch (error) {
        console.log('❌ [getSalesInvoiceSlip] Error:', error?.message || error);
        console.log('❌ [getSalesInvoiceSlip] Error response:', error?.response?.data);
        console.log('❌ [getSalesInvoiceSlip] Error status:', error?.response?.status);
        throw error;
    }
}

export async function updateSalesInvoicePayment(payload, { cmpUuid, envUuid, userUuid } = {}) {
    try {
        if (!payload) throw new Error('payload is required');
        try { console.log('[authServices] updateSalesInvoicePayment - incoming payload ->', JSON.stringify(payload, null, 2)); } catch (_) { console.log('[authServices] updateSalesInvoicePayment - incoming payload (raw) ->', payload); }
        if (!cmpUuid || !envUuid || !userUuid) {
            const [c, e, u] = await Promise.all([
                cmpUuid || getCMPUUID(),
                envUuid || getENVUUID(),
                userUuid || getUUID(),
            ]);
            cmpUuid = c; envUuid = e; userUuid = u;
        }

        const params = { cmpUuid, envUuid, userUuid };
        const PATH = '/api/Account/UpdateSalesInvoicePayment';
        try { console.log('[authServices] updateSalesInvoicePayment PATH:', PATH, 'params:', params); } catch (_) { }

        // If payload contains files, decide whether to send multipart (actual file objects)
        if (payload && payload.files) {
            const filesArr = Array.isArray(payload.files) ? payload.files : [payload.files];
            const hasFileObjects = filesArr.some(f => f && typeof f === 'object' && (f.uri || f.fileUri || f.uriString));

            if (!hasFileObjects) {
                // Files are references/strings returned by uploadFiles -> send JSON payload
                try { console.log('[authServices] updateSalesInvoicePayment - sending JSON (files are references)'); } catch (_) { }
                const resp = await api.post(PATH, payload, { params });
                try { console.log('[authServices] updateSalesInvoicePayment resp ->', resp && resp.status); } catch (_) { }
                return resp.data ?? resp;
            }

            try { console.log('[authServices] updateSalesInvoicePayment sending multipart/form-data with files'); } catch (_) { }
            const form = new FormData();
            const appendedFields = [];
            // Append all non-file fields
            Object.keys(payload).forEach((k) => {
                if (k === 'files') return;
                const v = payload[k];
                try {
                    if (v === null || v === undefined) return;
                    if (typeof v === 'object') {
                        const sval = JSON.stringify(v);
                        form.append(k, sval);
                        appendedFields.push({ key: k, value: sval });
                    } else {
                        const sval = String(v);
                        form.append(k, sval);
                        appendedFields.push({ key: k, value: sval });
                    }
                } catch (e) {
                    try { console.warn('[authServices] updateSalesInvoicePayment append field failed', k, e); } catch (_) { }
                }
            });
            try { console.log('[authServices] updateSalesInvoicePayment - appended fields ->', JSON.stringify(appendedFields, null, 2)); } catch (_) { console.log('[authServices] updateSalesInvoicePayment - appended fields (raw) ->', appendedFields); }

            // Append files: support array of file objects or array of refs
            const files = Array.isArray(payload.files) ? payload.files : [payload.files];
            try { console.log('[authServices] updateSalesInvoicePayment - files to append ->', JSON.stringify(files, null, 2)); } catch (_) { console.log('[authServices] updateSalesInvoicePayment - files to append (raw) ->', files); }
            for (const f of files) {
                if (!f) continue;
                // If looks like a file object with uri, append as file
                if (typeof f === 'object' && (f.uri || f.fileUri || f.uriString)) {
                    const entry = { uri: f.uri || f.uriString || f.fileUri, name: f.name || f.fileName || 'file', type: f.type || f.mime || 'application/octet-stream' };
                    form.append('files', entry);
                    try { console.log('[authServices] updateSalesInvoicePayment appended file object ->', JSON.stringify(entry)); } catch (_) { console.log('[authServices] updateSalesInvoicePayment appended file object (raw) ->', entry); }
                } else {
                    // treat as a reference string or JSON object
                    const sval = (typeof f === 'string') ? f : JSON.stringify(f);
                    form.append('files', sval);
                    try { console.log('[authServices] updateSalesInvoicePayment appended file ref ->', sval); } catch (_) { console.log('[authServices] updateSalesInvoicePayment appended file ref (raw) ->', sval); }
                }
            }

            const resp = await api.post(PATH, form, { params });
            try { console.log('[authServices] updateSalesInvoicePayment multipart resp ->', resp && resp.status); } catch (_) { }
            return resp.data ?? resp;
        }

        // Send JSON payload (application/json) as default
        const resp = await api.post(PATH, payload, { params });
        try { console.log('[authServices] updateSalesInvoicePayment resp ->', resp && resp.status); } catch (_) { }
        return resp.data ?? resp;
    } catch (err) {
        try {
            console.error('[authServices] updateSalesInvoicePayment error ->', err && (err.message || err));
            if (err?.response) {
                try { console.error('[authServices] updateSalesInvoicePayment response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
            }
        } catch (_) { }
        throw err;
    }
}

export async function uploadFiles(fileObj, { filepath = 'SalesInv' } = {}) {
    try {
        if (!fileObj) throw new Error('fileObj is required');
        // Backend expects multipart/form-data payload only. Do NOT send query params.
        // We'll include `Filepath` inside the form data if the server needs it.
        const PATH = '/api/CompanySetup/upload-file';
        try { console.log('[authServices] uploadFiles PATH:', PATH); } catch (_) { }

        const form = new FormData();
        // include Filepath as a form field (not a query param)
        try { form.append('Filepath', filepath); } catch (_) { }
        // Log incoming file object(s) for debugging
        try { console.log('[authServices] uploadFiles - incoming fileObj ->', JSON.stringify(fileObj, null, 2)); } catch (_) { try { console.log('[authServices] uploadFiles - incoming (non-serializable) ->', fileObj); } catch (_) { } }
        // Support single fileObj or array; build a small descriptor array for logging
        const appendedFiles = [];
        // Server UI indicates a single file field named `File`. Support both single and array input,
        // but only send as one or multiple `File` entries (server may accept repeated keys).
        if (Array.isArray(fileObj)) {
            fileObj.forEach((f) => {
                const entry = { uri: f.uri || f.uriString || f.fileUri, name: f.name || f.fileName || 'file', type: f.type || f.mime || 'application/octet-stream' };
                appendedFiles.push(entry);
                form.append('File', entry);
            });
        } else {
            const f = fileObj;
            const entry = { uri: f.uri || f.uriString || f.fileUri, name: f.name || f.fileName || 'file', type: f.type || f.mime || 'application/octet-stream' };
            appendedFiles.push(entry);
            form.append('File', entry);
        }
        try { console.log('[authServices] uploadFiles - appended files ->', JSON.stringify(appendedFiles, null, 2)); } catch (_) { console.log('[authServices] uploadFiles - appended files (raw) ->', appendedFiles); }

        // Send form-data payload only (no query params). Let axios set the Content-Type boundary.
        // Use global axios directly to bypass the `api` instance interceptors which would add `cmpUuid`.
        const token = await getAccessToken().catch(() => null);
        const headers = {};
        if (token) headers.Authorization = `Bearer ${token}`;

        try {
            const resp = await axios.post(`${BASE_URL}${PATH}`, form, { headers });
            try { console.log('[authServices] uploadFiles resp ->', resp && resp.status); } catch (_) { }
            return resp.data ?? resp;
        } catch (err) {
            // Common issue on Android: content:// URIs can cause axios/XHR to fail with "Network Error".
            // Fall back to the native fetch API which handles FormData + content:// URIs better.
            try {
                console.warn('[authServices] uploadFiles axios failed, falling back to fetch:', err?.message || err);
                const uploadUrl = `${BASE_URL}${PATH}`;
                const fetchHeaders = {};
                if (token) fetchHeaders.Authorization = `Bearer ${token}`;
                // Do not set Content-Type header; let fetch / RN set the multipart boundary
                const fetchResp = await fetch(uploadUrl, { method: 'POST', headers: fetchHeaders, body: form });
                const text = await fetchResp.text();
                let data;
                try { data = JSON.parse(text); } catch (_) { data = text; }
                try { console.log('[authServices] uploadFiles fetch resp ->', fetchResp && fetchResp.status); } catch (_) { }
                return data;
            } catch (fetchErr) {
                console.error('[authServices] uploadFiles fetch fallback failed ->', fetchErr && (fetchErr.message || fetchErr));
                if (fetchErr?.response) {
                    try { console.error('[authServices] uploadFiles fetch response data ->', JSON.stringify(fetchErr.response.data, null, 2)); } catch (_) { }
                }
                throw err;
            }
        }
    } catch (err) {
        try {
            console.error('[authServices] uploadFiles error ->', err && (err.message || err));
            if (err?.response) {
                try { console.error('[authServices] uploadFiles response data ->', JSON.stringify(err.response.data, null, 2)); } catch (_) { }
            }
        } catch (_) { }
        throw err;
    }
}

export async function convertSalesOrderToInvoice({ salesOrderUuid, CmpUUID, EnvUUID, UserUUID } = {}) {
    try {
        if (!CmpUUID || !EnvUUID || !UserUUID) {
            const [c, e, u] = await Promise.all([
                CmpUUID || getCMPUUID(),
                EnvUUID || getENVUUID(),
                UserUUID || getUUID(),
            ]);
            CmpUUID = c; EnvUUID = e; UserUUID = u;
        }
        const params = { salesOrderUuid, CmpUUID, EnvUUID, UserUUID };
        console.log('🔄 [convertSalesOrderToInvoice] Params:', PATHS.convertSalesOrderToInvoice, params);
        
        const resp = await api.get(PATHS.convertSalesOrderToInvoice, {params});
        console.log('✅ [convertSalesOrderToInvoice] Response:', resp?.data);
        
        return resp?.data ?? resp;
    } catch (error) {
        console.log('❌ [convertSalesOrderToInvoice] Error:', error?.message || error);
        console.log('❌ [convertSalesOrderToInvoice] Error response:', error?.response?.data);
        console.log('❌ [convertSalesOrderToInvoice] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

export async function convertSalesPerformaToInvoice({ performaUuid, EnvUUID, CmpUUID, UserUUID } = {}) {
    try {
        if (!CmpUUID || !EnvUUID || !UserUUID) {
            const [c, e, u] = await Promise.all([
                CmpUUID || getCMPUUID(),
                EnvUUID || getENVUUID(),
                UserUUID || getUUID(),
            ]);
            CmpUUID = c; EnvUUID = e; UserUUID = u;
        }
        const params = { performaUuid, EnvUUID, CmpUUID, UserUUID };
        console.log('🔄 [convertSalesPerformaToInvoice] Params:', PATHS.convertSalesPerformaToInvoice, params);
        
        const resp = await api.get(PATHS.convertSalesPerformaToInvoice, {params});
        console.log('✅ [convertSalesPerformaToInvoice] Response:', resp?.data);
        
        return resp?.data ?? resp;
    } catch (error) {
        console.log('❌ [convertSalesPerformaToInvoice] Error:', error?.message || error);
        console.log('❌ [convertSalesPerformaToInvoice] Error response:', error?.response?.data);
        console.log('❌ [convertSalesPerformaToInvoice] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

export async function convertPurchaseOrderToInvoice({ purchaseOrderUuid, EnvUUID, CmpUUID, UserUUID } = {}) {
    try {
        if (!CmpUUID || !EnvUUID || !UserUUID) {
            const [c, e, u] = await Promise.all([
                CmpUUID || getCMPUUID(),
                EnvUUID || getENVUUID(),
                UserUUID || getUUID(),
            ]);
            CmpUUID = c; EnvUUID = e; UserUUID = u;
        }
        const params = { purchaseOrderUuid, EnvUUID, CmpUUID, UserUUID };
        console.log('🔄 [convertPurchaseOrderToInvoice] Params:', PATHS.convertPurchaseOrderToInvoice, params);
        
        const resp = await api.get(PATHS.convertPurchaseOrderToInvoice, {params});
        console.log('✅ [convertPurchaseOrderToInvoice] Response:', resp?.data);
        
        return resp?.data ?? resp;
    } catch (error) {
        console.log('❌ [convertPurchaseOrderToInvoice] Error:', error?.message || error);
        console.log('❌ [convertPurchaseOrderToInvoice] Error response:', error?.response?.data);
        console.log('❌ [convertPurchaseOrderToInvoice] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

export async function convertPurchaseQuotationToOrder({ quotationUUID, EnvUUID, CmpUUID, UserUUID } = {}) {
    try {
        if (!CmpUUID || !EnvUUID || !UserUUID) {
            const [c, e, u] = await Promise.all([
                CmpUUID || getCMPUUID(),
                EnvUUID || getENVUUID(),
                UserUUID || getUUID(),
            ]);
            CmpUUID = c; EnvUUID = e; UserUUID = u;
        }
        const params = { quotationUUID, EnvUUID, CmpUUID, UserUUID };
        console.log('🔄 [convertPurchaseQuotationToOrder] Params:', PATHS.convertPurchaseQuotationToOrder, params);
        
        const resp = await api.get(PATHS.convertPurchaseQuotationToOrder, {params});
        console.log('✅ [convertPurchaseQuotationToOrder] Response:', resp?.data);
        
        return resp?.data ?? resp;
    } catch (error) {
        console.log('❌ [convertPurchaseQuotationToOrder] Error:', error?.message || error);
        console.log('❌ [convertPurchaseQuotationToOrder] Error response:', error?.response?.data);
        console.log('❌ [convertPurchaseQuotationToOrder] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

export async function convertInquiryToSalesOrder({ inquiryUuid, CmpUUID, EnvUUID, UserUUID } = {}) {
    try {
        if (!CmpUUID || !EnvUUID || !UserUUID) {
            const [c, e, u] = await Promise.all([
                CmpUUID || getCMPUUID(),
                EnvUUID || getENVUUID(),
                UserUUID || getUUID(),
            ]);
            CmpUUID = c; EnvUUID = e; UserUUID = u;
        }
        const params = { inquiryUuid, CmpUUID, EnvUUID, UserUUID };
        console.log('🔄 [convertInquiryToSalesOrder] Params:', PATHS.convertInquiryToSalesOrder, params);
        
        const resp = await api.get(PATHS.convertInquiryToSalesOrder, {params});
        console.log('✅ [convertInquiryToSalesOrder] Response:', resp?.data);
        
        return resp?.data ?? resp;
    } catch (error) {
        console.log('❌ [convertInquiryToSalesOrder] Error:', error?.message || error);
        console.log('❌ [convertInquiryToSalesOrder] Error response:', error?.response?.data);
        console.log('❌ [convertInquiryToSalesOrder] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

export async function convertInquiryToPurchaseOrder({ inquiryUuid, CmpUUID, EnvUUID, UserUUID } = {}) {
    try {
        if (!CmpUUID || !EnvUUID || !UserUUID) {
            const [c, e, u] = await Promise.all([
                CmpUUID || getCMPUUID(),
                EnvUUID || getENVUUID(),
                UserUUID || getUUID(),
            ]);
            CmpUUID = c; EnvUUID = e; UserUUID = u;
        }
        const params = { inquiryUuid, CmpUUID, EnvUUID, UserUUID };
        console.log('🔄 [convertInquiryToPurchaseOrder] Params:', PATHS.convertInquiryToPurchaseOrder, params);
        
        const resp = await api.get(PATHS.convertInquiryToPurchaseOrder, {params});
        console.log('✅ [convertInquiryToPurchaseOrder] Response:', resp?.data);
        
        return resp?.data ?? resp;
    } catch (error) {
        console.log('❌ [convertInquiryToPurchaseOrder] Error:', error?.message || error);
        console.log('❌ [convertInquiryToPurchaseOrder] Error response:', error?.response?.data);
        console.log('❌ [convertInquiryToPurchaseOrder] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}

export async function convertPurchasePerformaToInvoice({ performaUuid, CmpUUID, EnvUUID, UserUUID } = {}) {
    try {
        if (!CmpUUID || !EnvUUID || !UserUUID) {
            const [c, e, u] = await Promise.all([
                CmpUUID || getCMPUUID(),
                EnvUUID || getENVUUID(),
                UserUUID || getUUID(),
            ]);
            CmpUUID = c; EnvUUID = e; UserUUID = u;
        }
        const params = { performaUuid, CmpUUID, EnvUUID, UserUUID };
        console.log('🔄 [convertPurchasePerformaToInvoice] Params:', PATHS.convertPurchasePerformaToInvoice, params);
        
        const resp = await api.get(PATHS.convertPurchasePerformaToInvoice, {params});
        console.log('✅ [convertPurchasePerformaToInvoice] Response:', resp?.data);
        
        return resp?.data ?? resp;
    } catch (error) {
        console.log('❌ [convertPurchasePerformaToInvoice] Error:', error?.message || error);
        console.log('❌ [convertPurchasePerformaToInvoice] Error response:', error?.response?.data);
        console.log('❌ [convertPurchasePerformaToInvoice] Error status:', error?.response?.status);
        
        // Create user-friendly error
        const userError = new Error(extractErrorMessage(error));
        userError.originalError = error;
        throw userError;
    }
}
