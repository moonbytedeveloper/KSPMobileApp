import { Linking } from 'react-native';

class UniversalLinkService {
  constructor() {
    this.navigationRef = null;
    this.setupLinkingHandlers();
  }

  // Set navigation reference for programmatic navigation
  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  // Setup universal link handlers
  setupLinkingHandlers() {
    // Handle universal links when app is already running
    Linking.addEventListener('url', this.handleUniversalLink.bind(this));

    // Handle universal links when app is opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('App opened from universal link:', url);
        this.handleUniversalLink({ url });
      }
    });
  }

  // Handle universal link navigation
  handleUniversalLink(event) {
    const { url } = event;
    console.log('Universal link received:', url);

    try {
      const parsedUrl = this.parseUniversalLink(url);
      
      if (parsedUrl) {
        this.navigateToScreen(parsedUrl);
      }
    } catch (error) {
      console.error('Error handling universal link:', error);
    }
  }

  // Parse universal link URL
  parseUniversalLink(url) {
    try {
      const urlObj = new URL(url);
      
      // Extract path and query parameters
      const path = urlObj.pathname;
      const params = {};
      
      // Parse query parameters
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Define your app's URL scheme and domain
      const appDomain = 'erp.kspconsults.com'; // Your actual domain
      const appScheme = 'kspapp'; // Your app scheme
      
      // Check if it's a valid app link
      if (urlObj.hostname === appDomain || urlObj.protocol === `${appScheme}:`) {
        return {
          path,
          params,
          originalUrl: url
        };
      }

      return null;
    } catch (error) {
      console.error('Error parsing universal link:', error);
      return null;
    }
  }

  // Navigate to specific screen based on universal link
  navigateToScreen(parsedLink) {
    if (!this.navigationRef) {
      console.warn('Navigation ref not set, cannot navigate');
      return;
    }

    const { path, params } = parsedLink;
    
    console.log('Navigating to:', path, 'with params:', params);

    // Define your app's navigation structure based on AppStack.jsx
    const navigationMap = {
      // Home/Dashboard routes
      '/': 'Main',
      '/home': 'Main',
      '/dashboard': 'Main',
      
      // Authentication routes
      '/login': 'Login',
      '/forgot-password': 'ForgotPassword',
      '/otp-verification': 'OTPVerification',
      '/new-password': 'NewPassword',
      
      // Profile routes
      '/profile': 'Profile',
      '/edit-profile': 'EditProfile',
      
      // Timesheet routes
      '/timesheet': 'Timesheet',
      '/timesheet/approval': 'TimesheetsApproval',
      '/timesheet/pending': 'PendingTimesheet',
      '/timesheet/manage-approval': 'ManageTimeSheetApproval',
      '/timesheet/manage-worklist': 'ManageMyWorklist',
      
      // Leave routes
      '/leave': 'LeaveList',
      '/leave/apply': 'ApplyLeave',
      '/leave/manage': 'ManageLeaves',
      
      // Expense routes
      '/expense': 'Expense',
      '/expense/add': 'AddExpense',
      '/expense/approval': 'ExpenseApproval',
      
      // Admin routes
      '/admin': 'AdminDashboard',
      '/admin/leads': 'AllLeads',
      '/admin/proposals': 'AllProposals',
      '/admin/payments': 'PaymentStatus',
      '/admin/employees': 'TotalEmployeesWorking',
      '/admin/hours': 'TotalHoursReported',
      '/admin/invoices': 'TotalInvoices',
      
      // Business Development routes
      '/business-development': 'BusinessDevelopment',
      '/leads': 'ManageLead',
      '/leads/follow-up': 'ManageLeadFollowUp',
      '/leads/proposal': 'ManageLeadProposal',
      
      // HRA routes
      '/hra': 'HRA',
      '/hra/attendance': 'HRA',
      '/hra/leaves': 'ManageLeaves',
      '/hra/view-attendance': 'ViewAttendance',
      
      // Other routes
      '/holiday': 'HolidayView',
      '/notifications': 'Notification',
      '/total-project': 'TotalProject',
      
      // File viewers
      '/file-viewer': 'FileViewerScreen',
      '/image-viewer': 'ImageViewerScreen',
    };

    // Find matching route
    const targetScreen = navigationMap[path];
    
    if (targetScreen) {
      // Navigate to the target screen
      this.navigationRef.navigate(targetScreen, params);
    } else {
      console.warn('No matching route found for path:', path);
      // Navigate to main as fallback
      this.navigationRef.navigate('Main');
    }
  }

  // Generate universal link for sharing
  generateUniversalLink(screen, params = {}) {
    const baseUrl = 'https://erp.kspconsults.com'; // Your actual domain
    const queryString = Object.keys(params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');
    
    const url = queryString ? `${baseUrl}${screen}?${queryString}` : `${baseUrl}${screen}`;
    return url;
  }

  // Check if app can handle a URL
  canHandleUrl(url) {
    try {
      const urlObj = new URL(url);
      const appDomain = 'erp.kspconsults.com'; // Your actual domain
      const appScheme = 'kspapp'; // Your app scheme
      
      return urlObj.hostname === appDomain || urlObj.protocol === `${appScheme}:`;
    } catch (error) {
      return false;
    }
  }
}

export default new UniversalLinkService();
