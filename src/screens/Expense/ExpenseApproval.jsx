import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppHeader from '../../components/common/AppHeader';
import Loader from '../../components/common/Loader';
import Dropdown from '../../components/common/Dropdown';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, text, layout, SHADOW, buttonStyles } from '../styles/styles';
import { DrawerActions } from '@react-navigation/native';
import { getApprovedByMeExpenses, getSoleApprovalData, fetchExpenseLinesByHeader, getApprovalDetails, processApprovalOrRejection, getMyApprovedExpenses, getMyRejectedExpenses, getPendingApprovals, fetchUserProjects, getEmployees, getExpenseSlip } from '../../api/authServices';

const sampleProjects = [
  { id: 'p1', name: 'Project Alpha', tasks: ['Design', 'Development', 'Testing'] },
  { id: 'p2', name: 'Project Beta', tasks: ['Research', 'Implementation'] },
  { id: 'p3', name: 'Internal Ops', tasks: ['Procurement', 'Travel', 'Reimbursement'] },
  { id: 'p4', name: 'Real Estate Software', tasks: ['Planning', 'Execution'] },
  { id: 'p5', name: 'Moonbyte001', tasks: ['Module A', 'Module B', 'Module C'] },
];

// Employees are loaded from API via getEmployees()

const pageSizes = [10, 25, 50, 100];

// Reusable component for displaying expense data
const ExpenseDataComponent = ({ data, onActionPress, getStatusColor, getStatusBgColor, showActions = true, showExpenseDetails = true }) => {
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.dataContent}
    >
      {data.map((item, index) => {
        const [expanded, setExpanded] = useState(false);
        const toggle = () => setExpanded((s) => !s);
        const statusColor = getStatusColor(item.status || '');
        const statusBg = getStatusBgColor(item.status || '');
        const title = item.expenseName || item.projectName || `Expense #${item.srNo}`;
        return (
          <View key={item.id || index} style={styles.tsCard}>
            <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
              <View style={styles.tsRowHeader}>
                <View style={styles.tsHeaderLeft}>
                  <View style={[styles.tsDot, { backgroundColor: COLORS.primary }]} />
                  <View style={styles.tsHeaderLeftContent}>
                    <Text style={[text.caption, styles.tsCaption]}>EXPENSE</Text>
                    <Text style={[text.title, styles.tsTitle]} numberOfLines={1}>{title}</Text>
                  </View>
                </View>
                <View style={styles.tsHeaderRight}>
                  <View>
                    <Text style={[text.caption, styles.tsCaption, { textAlign: 'right' }]}>AMOUNT</Text>
                    <Text style={[text.title, styles.tsHours]}>{item.amount}</Text>
                  </View>
                  <Icon name={expanded ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.textMuted} />
                </View>
              </View>
            </TouchableOpacity>

            {expanded && (
              <View style={styles.tsDetailArea}>
                <View style={styles.detailRow}>
                  <Text style={[text.caption, styles.detailLabel]}>SR NO</Text>
                  <Text style={[text.body, styles.detailValue]}>{item.srNo}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[text.caption, styles.detailLabel]}>PROJECT</Text>
                  <Text style={[text.body, styles.detailValue]}>{item.projectName}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[text.caption, styles.detailLabel]}>TASK</Text>
                  <Text style={[text.body, styles.detailValue]}>{item.projectTask}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[text.caption, styles.detailLabel]}>ENTERED BY</Text>
                  <Text style={[text.body, styles.detailValue]}>{item.enteredBy}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[text.caption, styles.detailLabel]}>EXPENSE CODE</Text>
                  <Text style={[text.body, styles.detailValue]}>{item.soleExpenseCode}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[text.caption, styles.detailLabel]}>PERIOD</Text>
                  <Text style={[text.body, styles.detailValue]}>{item.documentFromDate} - {item.documentToDate}</Text>
                </View>
                {/* Status field removed as per requirement */}

                <View style={styles.tsActionsRowPrimary}>
                  {showExpenseDetails && (
                    <TouchableOpacity onPress={() => onActionPress(item, 'viewExpenseDetails')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.viewBtn]}>
                      <Icon name="description" size={rf(5)} style={buttonStyles.iconView} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => onActionPress(item, 'viewApprovalDetails')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.scheduleBtn]}>
                    <Icon name="schedule" size={rf(5)} style={buttonStyles.iconSchedule} />
                  </TouchableOpacity>
                  {showActions && (
                    <>
                      <TouchableOpacity onPress={() => onActionPress(item, 'approve')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.editBtn]}>
                        <Icon name="fact-check" size={rf(5)} style={buttonStyles.iconEdit} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onActionPress(item, 'reject')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.deleteBtn]}>
                        <Icon name="delete" size={rf(5)} style={buttonStyles.iconDelete} />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              </View>
            )}
          </View>
        );
      })}

      {data.length === 0 && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No expense records found.</Text>
        </View>
      )}
    </ScrollView>
  );
};

const ExpenseApproval = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('expenseToApprove');
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [remark, setRemark] = useState('');
  const [reason, setReason] = useState('');
  const [approveMode, setApproveMode] = useState('form'); // 'form' | 'success'
  const [printing, setPrinting] = useState(false);

  // API state management
  const [apiApprovedByMeData, setApiApprovedByMeData] = useState([]);
  const [apiExpenseToApproveData, setApiExpenseToApproveData] = useState([]);
  const [apiMyApprovedExpensesData, setApiMyApprovedExpensesData] = useState([]);
  const [apiMyRejectedExpensesData, setApiMyRejectedExpensesData] = useState([]);
  const [apiPendingApprovalsData, setApiPendingApprovalsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Projects and employees state management
  const [projects, setProjects] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [projectsError, setProjectsError] = useState(null);
  const [employeesError, setEmployeesError] = useState(null);

  // Expense details state management
  const [expenseDetailsData, setExpenseDetailsData] = useState(null);
  const [expenseDetailsLoading, setExpenseDetailsLoading] = useState(false);
  const [expenseDetailsError, setExpenseDetailsError] = useState(null);

  // Approval details state management
  const [approvalDetailsData, setApprovalDetailsData] = useState(null);
  const [approvalDetailsLoading, setApprovalDetailsLoading] = useState(false);
  const [approvalDetailsError, setApprovalDetailsError] = useState(null);

  // Approval/rejection process state management
  const [processingApproval, setProcessingApproval] = useState(false);
  const [processingRejection, setProcessingRejection] = useState(false);

  // Dropdown open states to ensure only one is open at a time
  const [isTabDropdownOpen, setIsTabDropdownOpen] = useState(false);
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  // Normalize API error to human-friendly message
  const getReadableError = useCallback((err, fallback = 'Something went wrong. Please try again.') => {
    try {
      const res = err?.response;
      const data = res?.data ?? {};
      const candidates = [
        data?.message,
        data?.Message,
        data?.error,
        data?.errorMessage,
        data?.Error,
        data?.Data?.Message,
        Array.isArray(data?.errors) ? data.errors.map(e => e?.message || e).filter(Boolean).join(', ') : null,
      ].filter(Boolean);
      if (candidates.length) return String(candidates[0]);

      if (typeof err?.message === 'string') {
        if (/network error/i.test(err.message)) return 'Network error. Check your connection and retry.';
        if (/timeout/i.test(err.message) || err?.code === 'ECONNABORTED') return 'Request timed out. Please try again.';
      }
    } catch (_) { }
    return fallback;
  }, []);

  const expenseDetailsSheetRef = useRef(null);
  const approvalDetailsSheetRef = useRef(null);
  const approveSheetRef = useRef(null);
  const rejectSheetRef = useRef(null);

  const snapPoints = useMemo(() => [hp(80)], []);

  // API call function for approved by me expenses
  const fetchApprovedByMeExpenses = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const start = page * size;
      const response = await getApprovedByMeExpenses(start, size);
      console.log('API Response:', response);

      // Transform API response to match component structure
      const transformedData = transformApiDataToComponentFormat(response);
      setApiApprovedByMeData(transformedData);

      // Set total records for pagination
      const totalFromResponse = response?.Data?.recordsTotal || response?.Data?.TotalCount || response?.TotalCount || transformedData.length;
      console.log('API Response Debug:', {
        response: response,
        recordsTotal: response?.Data?.recordsTotal,
        TotalCount: response?.Data?.TotalCount,
        totalFromResponse,
        transformedDataLength: transformedData.length
      });
      setTotalRecords(totalFromResponse);
    } catch (err) {
      console.error('Error fetching approved by me expenses:', err);
      setError(getReadableError(err, 'Failed to load approved expenses'));
    } finally {
      setLoading(false);
    }
  };

  // API call function for expense to approve data
  const fetchExpenseToApproveData = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const start = page * size;
      const response = await getSoleApprovalData({
        start: start,
        length: size
      });
      console.log('Sole Approval Data API Response:', response);

      // Transform API response to match component structure
      const transformedData = transformApiDataToComponentFormat(response);
      setApiExpenseToApproveData(transformedData);

      // Set total records for pagination
      const totalFromResponse = response?.Data?.recordsTotal || response?.Data?.TotalCount || response?.TotalCount || transformedData.length;
      console.log('API Response Debug:', {
        response: response,
        recordsTotal: response?.Data?.recordsTotal,
        TotalCount: response?.Data?.TotalCount,
        totalFromResponse,
        transformedDataLength: transformedData.length
      });
      setTotalRecords(totalFromResponse);
    } catch (err) {
      console.error('Error fetching expense to approve data:', err);
      setError(getReadableError(err, 'Failed to load expenses to approve'));
    } finally {
      setLoading(false);
    }
  };

  // API call function for my approved expenses
  const fetchMyApprovedExpenses = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const start = page * size;
      const response = await getMyApprovedExpenses({
        start: start,
        length: size
      });
      console.log('My Approved Expenses API Response:', response);

      // Transform API response to match component structure
      const transformedData = transformApiDataToComponentFormat(response);
      setApiMyApprovedExpensesData(transformedData);

      // Set total records for pagination
      const totalFromResponse = response?.Data?.recordsTotal || response?.Data?.TotalCount || response?.TotalCount || transformedData.length;
      console.log('API Response Debug:', {
        response: response,
        recordsTotal: response?.Data?.recordsTotal,
        TotalCount: response?.Data?.TotalCount,
        totalFromResponse,
        transformedDataLength: transformedData.length
      });
      setTotalRecords(totalFromResponse);
    } catch (err) {
      console.error('Error fetching my approved expenses:', err);
      setError(getReadableError(err, 'Failed to load my approved expenses'));
    } finally {
      setLoading(false);
    }
  };

  // API call function for my rejected expenses
  const fetchMyRejectedExpenses = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const start = page * size;
      const response = await getMyRejectedExpenses({
        start: start,
        length: size
      });
      console.log('My Rejected Expenses API Response:', response);

      // Transform API response to match component structure
      const transformedData = transformApiDataToComponentFormat(response);
      setApiMyRejectedExpensesData(transformedData);

      // Set total records for pagination
      const totalFromResponse = response?.Data?.recordsTotal || response?.Data?.TotalCount || response?.TotalCount || transformedData.length;
      console.log('API Response Debug:', {
        response: response,
        recordsTotal: response?.Data?.recordsTotal,
        TotalCount: response?.Data?.TotalCount,
        totalFromResponse,
        transformedDataLength: transformedData.length
      });
      setTotalRecords(totalFromResponse);
    } catch (err) {
      console.error('Error fetching my rejected expenses:', err);
      setError(getReadableError(err, 'Failed to load my rejected expenses'));
    } finally {
      setLoading(false);
    }
  };

  // API call function for pending approvals
  const fetchPendingApprovals = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const start = page * size;
      const response = await getPendingApprovals({
        projectUUID: selectedProject?.id || '',
        employeeUUID: selectedEmployee?.id || '',
        start: start,
        length: size
      });
      console.log('Pending Approvals API Response:', response);

      // Transform API response to match component structure
      const transformedData = transformApiDataToComponentFormat(response);
      setApiPendingApprovalsData(transformedData);

      // Set total records for pagination
      const totalFromResponse = response?.Data?.recordsTotal || response?.Data?.TotalCount || response?.TotalCount || transformedData.length;
      console.log('API Response Debug:', {
        response: response,
        recordsTotal: response?.Data?.recordsTotal,
        TotalCount: response?.Data?.TotalCount,
        totalFromResponse,
        transformedDataLength: transformedData.length
      });
      setTotalRecords(totalFromResponse);
    } catch (err) {
      console.error('Error fetching pending approvals:', err);
      setError(getReadableError(err, 'Failed to load pending approvals'));
    } finally {
      setLoading(false);
    }
  };

  // Transform API data to match component structure
  const transformApiDataToComponentFormat = (apiData) => {
    // Defensive logging + handle different API response structures
    try {
      const topKeys = apiData && typeof apiData === 'object' ? Object.keys(apiData) : [];
      const dataKeys = apiData?.Data && typeof apiData.Data === 'object' ? Object.keys(apiData.Data) : [];
      console.log('transformApiDataToComponentFormat keys:', { topKeys, dataKeys });
    } catch (_) {}

    const tryArrays = [];
    tryArrays.push(apiData?.Data?.data);
    tryArrays.push(apiData?.Data); // sometimes Data itself is array
    tryArrays.push(apiData?.Data?.ExpenseToApprovalData);
    tryArrays.push(apiData?.Data?.expensetoapprovaldata);
    tryArrays.push(apiData?.data);
    tryArrays.push(apiData); // raw array

    let dataArray = [];
    for (const candidate of tryArrays) {
      if (Array.isArray(candidate)) { dataArray = candidate; break; }
    }

    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      console.warn('transformApiDataToComponentFormat: no list found, returning []');
      return [];
    }

    return dataArray.map((item, index) => ({
      id: item.headeruuid || item.headerUuid || item.UUID || item.id || index + 1,
      srNo: item.srno ? String(item.srno).padStart(3, '0') : String(index + 1).padStart(3, '0'),
      projectName: item.projectname || item.projectName || 'N/A',
      projectTask: item.projecttask || item.projectTask || 'N/A',
      enteredBy: item.enteredby || item.enteredBy || 'N/A',
      soleExpenseCode: item.expensecode || item.soleExpenseCode || 'N/A',
      expenseName: item.expensename || item.expenseName || 'N/A',
      documentFromDate: item.docfromtodate ? item.docfromtodate.split(' to ')[0] : (item.documentFromDate || 'N/A'),
      documentToDate: item.docfromtodate ? item.docfromtodate.split(' to ')[1] : (item.documentToDate || 'N/A'),
      amount: item.amount ? `₹ ${item.amount.toLocaleString()}` : '₹ 0',
      //status: item.status || 'Pending',
      headerUuid: item.headeruuid || item.headerUuid || item.UUID || '',
      expenseDetails: {
        project: item.projectname || item.projectName || 'N/A',
        task: item.projecttask || item.projectTask || 'N/A',
        date: item.docfromtodate ? item.docfromtodate.split(' to ')[0] : (item.documentFromDate || 'N/A'),
        amount: item.amount ? `₹ ${item.amount.toLocaleString()}` : '₹ 0',
        description: item.expensename || item.expenseName || 'N/A'
      },
      approvalDetails: {
        actionDate: item.approvalDate || 'N/A',
        enteredBy: item.enteredby || item.enteredBy || 'N/A',
        status: item.status || 'Pending',
        contactNo: item.contactNo || 'N/A'
      }
    }));
  };

  // Fetch expense details by header UUID
  const fetchExpenseDetails = async (headerUuid) => {
    if (!headerUuid) {
      setExpenseDetailsError('No header UUID provided');
      return;
    }

    try {
      setExpenseDetailsLoading(true);
      setExpenseDetailsError(null);

      const response = await fetchExpenseLinesByHeader({ headerUuid });
      console.log('Expense Details API Response:', response);

      // Handle the response structure similar to AddExpenseScreen
      const dataRoot = response?.Data ?? response?.data ?? response;
      let lines = [];
      let headerData = null;

      if (dataRoot && typeof dataRoot === 'object') {
        // Check for the new structure with Header and Lines
        if (Array.isArray(dataRoot.Lines)) {
          lines = dataRoot.Lines;
          headerData = dataRoot.Header || dataRoot.header || null;
        } else {
          // Fallback to old structure handling
          const candidateArrays = [
            Array.isArray(dataRoot) ? dataRoot : null,
            Array.isArray(dataRoot?.Rows) ? dataRoot.Rows : null,
            Array.isArray(dataRoot?.items) ? dataRoot.items : null,
            Array.isArray(dataRoot?.Items) ? dataRoot.Items : null,
            Array.isArray(dataRoot?.List) ? dataRoot.List : null,
          ].filter(Boolean);
          lines = candidateArrays.length ? candidateArrays[0] : [];
        }
      }

      // Transform the data to match the expected format
      const transformedData = {
        header: headerData,
        lines: lines.map((line, index) => {
          const qty = parseFloat(String(line?.Quantity ?? '').replace(/,/g, '.')) || 0;
          const unitCost = parseFloat(String(line?.UnitCost ?? '').replace(/,/g, '.')) || 0;
          const tax = parseFloat(String(line?.TaxAmount ?? '').replace(/,/g, '.')) || 0;
          const totalCost = parseFloat(String(line?.TotalCost ?? '').replace(/,/g, '.')) || 0;
          const billAmount = parseFloat(String(line?.BillAmount ?? '').replace(/,/g, '.')) || 0;
          const doc = line?.Document_Date || line?.DocumentDate || '';

          return {
            id: line?.UUID || line?.Uuid || line?.uuid || line?.Id || line?.id || index + 1,
            quantity: qty,
            unitCost: Number.isFinite(unitCost) && unitCost !== 0 ? unitCost.toFixed(2) : '0.00',
            taxAmount: Number.isFinite(tax) && tax !== 0 ? tax.toFixed(2) : '0.00',
            totalCost: Number.isFinite(totalCost) && totalCost !== 0 ? totalCost.toFixed(2) : '0.00',
            billAmount: Number.isFinite(billAmount) && billAmount !== 0 ? billAmount.toFixed(2) : '0.00',
            documentDate: doc ? String(doc).slice(0, 10) : '',
            billUrl: line?.BillUrl || null,
            expenseRemarks: line?.Expense_Remarks || null,
            unitType: line?.UnitType_Name || line?.UnitTypeName || 'N/A',
            expenseType: headerData?.ExpenseType || line?.ExpenseType || 'N/A',
            isOtherExpenseType: line?.IsOtherExpenseType === true,
            otherExpenseTypeName: line?.OtherFields || line?.OtherExpenseType || '',
          };
        })
      };

      setExpenseDetailsData(transformedData);
    } catch (err) {
      console.error('Error fetching expense details:', err);
      setExpenseDetailsError(err.message || 'Failed to fetch expense details');
    } finally {
      setExpenseDetailsLoading(false);
    }
  };

  // Fetch approval details by header UUID
  const fetchApprovalDetails = async (headerUuid) => {
    if (!headerUuid) {
      setApprovalDetailsError('No header UUID provided');
      return;
    }

    try {
      setApprovalDetailsLoading(true);
      setApprovalDetailsError(null);

      const response = await getApprovalDetails({ headeruuid: headerUuid });
      console.log('Approval Details API Response:', response);

      // Transform the response data - handle array format
      const dataArray = response?.Data || [];
      const latestEntry = dataArray.length > 0 ? dataArray[0] : {};

      const transformedData = {
        actionDate: latestEntry?.actiondate || 'N/A',
        enteredBy: latestEntry?.enteredby || 'N/A',
        status: latestEntry?.status || 'N/A',
        contactNo: latestEntry?.actiontakenby || 'N/A',
        approvalComments: latestEntry?.remarksbyapproval || 'N/A',
        approvedBy: latestEntry?.actiontakenby || 'N/A',
        approvedDate: latestEntry?.actiondate || 'N/A',
        rejectionReason: latestEntry?.remarksbyapproval || 'N/A',
        rejectedBy: latestEntry?.actiontakenby || 'N/A',
        rejectedDate: latestEntry?.actiondate || 'N/A',
        // Additional fields for better display
        actionTakenBy: latestEntry?.actiontakenby || 'N/A',
        remarksByApproval: latestEntry?.remarksbyapproval || 'N/A',
        allHistory: dataArray // Keep full history for potential future use
      };

      setApprovalDetailsData(transformedData);
    } catch (err) {
      try { console.log(err?.response?.status, '4001'); } catch (_) { }
      setApprovalDetailsError(getReadableError(err, 'Failed to fetch approval details'));
    } finally {
      setApprovalDetailsLoading(false);
    }
  };
  // console.log(approvalDetailsError,'approvalDetailsError')
  // Frontend search filter function
  const filterDataBySearch = (data, searchTerm) => {
    // Ensure data is an array
    if (!Array.isArray(data)) {
      return [];
    }

    if (!searchTerm || searchTerm.trim() === '') {
      return data;
    }

    const searchLower = searchTerm.toLowerCase().trim();
    return data.filter(item => {
      // Ensure item exists and is an object
      if (!item || typeof item !== 'object') {
        return false;
      }

      // Search across multiple fields
      const searchableFields = [
        item.expenseName || '',
        item.projectName || '',
        item.projectTask || '',
        item.enteredBy || '',
        item.soleExpenseCode || '',
        item.amount || '',
        item.documentFromDate || '',
        item.documentToDate || ''
      ];

      return searchableFields.some(field =>
        field.toLowerCase().includes(searchLower)
      );
    });
  };

  const getCurrentData = () => {
    let data = [];
    switch (activeTab) {
      case 'expenseToApprove':
        data = (apiExpenseToApproveData && apiExpenseToApproveData.length > 0) ? apiExpenseToApproveData : [];
        break;
      case 'myApprovalExpense':
        data = (apiMyApprovedExpensesData && apiMyApprovedExpensesData.length > 0) ? apiMyApprovedExpensesData : [];
        break;
      case 'pendingApproval':
        data = (apiPendingApprovalsData && apiPendingApprovalsData.length > 0) ? apiPendingApprovalsData : [];
        break;
      case 'myExpense':
        data = myExpenseData || [];
        break;
      case 'myRejectedExpense':
        data = (apiMyRejectedExpensesData && apiMyRejectedExpensesData.length > 0) ? apiMyRejectedExpensesData : [];
        break;
      case 'approvedByMe':
        data = (apiApprovedByMeData && apiApprovedByMeData.length > 0) ? apiApprovedByMeData : [];
        break;
      default:
        data = [];
    }

    // Ensure data is an array before filtering
    if (!Array.isArray(data)) {
      data = [];
    }

    // Apply frontend search filter
    return filterDataBySearch(data, searchValue);
  };

  // Get filtered data for pagination
  const filteredData = getCurrentData();
  const totalFilteredRecords = Array.isArray(filteredData) ? filteredData.length : 0;
  const totalPages = Math.ceil(totalRecords / pageSize) || 0;

  // Debug logging
  console.log('Pagination Debug:', {
    totalRecords,
    pageSize,
    totalPages,
    currentPage,
    shouldShowPagination: totalRecords > pageSize
  });
  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    const items = [];
    const current = currentPage + 1; // 1-based
    const last = totalPages;

    items.push('prev');

    // Determine the four numeric pages to display
    let pages = [];
    if (last <= 4) {
      for (let p = 1; p <= last; p++) pages.push(p);
    } else if (current <= 2) {
      pages = [1, 2, 3, last];
    } else if (current >= last - 1) {
      pages = [1, last - 2, last - 1, last];
    } else {
      pages = [1, current - 1, current, last];
    }

    // Dedupe and sort just in case of overlap
    pages = Array.from(new Set(pages)).sort((a, b) => a - b);
    // If fewer than 4 due to overlaps, pad from the left/right to keep 4 where possible
    if (last > 4) {
      while (pages.length < 4) {
        const first = pages[0];
        const lastNum = pages[pages.length - 1];
        if (first > 1) {
          pages.unshift(first - 1);
        } else if (lastNum < last) {
          pages.push(lastNum + 1);
        } else {
          break;
        }
      }
    }

    // Insert only ONE ellipsis: near end → left ellipsis; otherwise → right ellipsis
    const isNearEnd = (pages[1] === last - 2 && pages[2] === last - 1);
    items.push(pages[0]);
    if (isNearEnd) {
      if (pages[1] > pages[0] + 1) items.push('left-ellipsis');
    }
    items.push(pages[1]);
    items.push(pages[2]);
    if (!isNearEnd) {
      if (pages[3] > pages[2] + 1) items.push('right-ellipsis');
    }
    items.push(pages[3]);

    items.push('next');
    return items;
  }, [currentPage, totalPages]);

  const handlePageChange = useCallback((page) => {
    const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
    setCurrentPage(clamped);
    loadDataForCurrentTab(clamped, pageSize);
  }, [totalPages, pageSize]);

  const handleItemsPerPageChange = useCallback((size) => {
    setPageSize(size);
    setCurrentPage(0);
    loadDataForCurrentTab(0, size);
  }, []);

  const handleSearch = useCallback(() => {
    setCurrentPage(0);
    // Search is now handled by frontend filtering, no need to reload data
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchValue('');
    setCurrentPage(0);
  }, []);

  const loadDataForCurrentTab = useCallback((page = currentPage, size = pageSize) => {
    if (activeTab === 'approvedByMe') {
      fetchApprovedByMeExpenses(page, size);
    } else if (activeTab === 'expenseToApprove') {
      fetchExpenseToApproveData(page, size);
    } else if (activeTab === 'myApprovalExpense') {
      fetchMyApprovedExpenses(page, size);
    } else if (activeTab === 'myRejectedExpense') {
      fetchMyRejectedExpenses(page, size);
    } else if (activeTab === 'pendingApproval') {
      fetchPendingApprovals(page, size);
    }
  }, [activeTab, currentPage, pageSize]);

  // Fetch data when tab changes
  useEffect(() => {
    setCurrentPage(0); // Reset to first page when tab changes
    loadDataForCurrentTab(0, pageSize);
  }, [activeTab, pageSize]);

  // Load projects and employees data
  const loadProjectsAndEmployees = useCallback(async () => {
    try {
      setProjectsLoading(true);
      setEmployeesLoading(true);
      setProjectsError(null);
      setEmployeesError(null);

      // Fetch projects and employees in parallel
      const [projectsResp, employeesResp] = await Promise.all([
        fetchUserProjects().catch(err => {
          console.error('[ExpenseApproval] fetchUserProjects error:', err);
          setProjectsError(getReadableError(err, 'Could not load projects'));
          return { Data: { Projects: [] } };
        }),
        getEmployees().catch(err => {
          console.error('[ExpenseApproval] getEmployees error:', err);
          setEmployeesError(getReadableError(err, 'Could not load employees'));
          return { Data: [] };
        })
      ]);

      console.log('[ExpenseApproval] fetchUserProjects response:', projectsResp);
      console.log('[ExpenseApproval] getEmployees response:', employeesResp);

      // Transform projects data
      const projectsRaw = Array.isArray(projectsResp?.Data?.Projects) ? projectsResp.Data.Projects : [];
      const projectOptions = projectsRaw
        .filter(p => p && p.Project_Title)
        .map(p => ({ id: p.UUID || p.Uuid || p.id, name: String(p.Project_Title) }));
      setProjects(projectOptions);

      // Transform employees data (API returns [{ Uuid, FullName }, ...])
      const employeesRawCandidates = [
        Array.isArray(employeesResp?.Data) ? employeesResp.Data : null,
        Array.isArray(employeesResp?.data) ? employeesResp.data : null,
        Array.isArray(employeesResp) ? employeesResp : null,
      ].filter(Boolean);
      const employeesRaw = employeesRawCandidates.length ? employeesRawCandidates[0] : [];
      const employeeOptions = employeesRaw
        .filter(e => e && (e.FullName || e.Name))
        .map(e => ({ id: e.Uuid || e.UUID || e.uuid || e.Id || e.id, name: String(e.FullName || e.Name) }));
      setEmployees(employeeOptions);

      console.log('[ExpenseApproval] mapped projects:', projectOptions);
      console.log('[ExpenseApproval] mapped employees:', employeeOptions);
    } catch (e) {
      console.error('[ExpenseApproval] load error:', e);
      setError(getReadableError(e, 'Failed to load projects and employees'));
    } finally {
      setProjectsLoading(false);
      setEmployeesLoading(false);
    }
  }, []);

  // Load projects and employees on component mount
  useEffect(() => {
    loadProjectsAndEmployees();
  }, [loadProjectsAndEmployees]);

  // Reset to first page when search value changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchValue]);
 
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      case 'submitted':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#d1fae5';
      case 'pending':
        return '#fef3c7';
      case 'rejected':
        return '#fee2e2';
      case 'submitted':
        return '#dbeafe';
      default:
        return '#f3f4f6';
    }
  };

  const handleActionPress = (expense, action) => {
    console.log('Action pressed:', action, 'for expense:', expense.id, 'headerUuid:', expense.headerUuid);
    setSelectedExpense(expense);
    setSelectedAction(action);
    setRemark('');
    setReason('');
    if (action === 'approve') setApproveMode('form');

    switch (action) {
      case 'viewExpenseDetails':
        // Only show expense details for tabs other than myApprovalExpense and myRejectedExpense
        if (activeTab !== 'myApprovalExpense' && activeTab !== 'myRejectedExpense') {
          // Fetch expense details before opening the sheet
          if (expense.headerUuid) {
            console.log('Fetching expense details for headerUuid:', expense.headerUuid);
            fetchExpenseDetails(expense.headerUuid);
          } else {
            console.log('No headerUuid found for expense:', expense);
          }
          expenseDetailsSheetRef.current?.present();
        }
        break;
      case 'viewApprovalDetails':
        // Fetch approval details before opening the sheet
        if (expense.headerUuid) {
          console.log('Fetching approval details for headerUuid:', expense.headerUuid);
          fetchApprovalDetails(expense.headerUuid);
        } else {
          console.log('No headerUuid found for expense:', expense);
        }
        approvalDetailsSheetRef.current?.present();
        break;
      case 'approve':
        approveSheetRef.current?.present();
        break;
      case 'reject':
        rejectSheetRef.current?.present();
        break;
    }
  };

  const handleApprove = async () => {
    if (!selectedExpense?.headerUuid) {
      Alert.alert('Error', 'No expense selected for approval');
      return;
    }

    try {
      setProcessingApproval(true);
      console.log('Approving expense:', selectedExpense.id, 'Remark:', remark);

      const response = await processApprovalOrRejection({
        headerUuid: selectedExpense.headerUuid,
        isApproved: true,
        remark: remark.trim()
      });

      console.log('Approval response:', response);
      setApproveMode('success');

      // Refresh the data after successful approval
      if (activeTab === 'expenseToApprove') {
        await fetchExpenseToApproveData();
      } else if (activeTab === 'approvedByMe') {
        await fetchApprovedByMeExpenses();
      } else if (activeTab === 'myApprovalExpense') {
        await fetchMyApprovedExpenses();
      } else if (activeTab === 'pendingApproval') {
        await fetchPendingApprovals();
      }
    } catch (error) {
      console.error('Error approving expense:', error);
      Alert.alert('Approval Failed', error.message || 'Failed to approve expense');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense?.headerUuid) {
      Alert.alert('Error', 'No expense selected for rejection');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingRejection(true);
      console.log('Rejecting expense:', selectedExpense.id, 'Reason:', reason);

      const response = await processApprovalOrRejection({
        headerUuid: selectedExpense.headerUuid,
        isApproved: false,
        remark: reason.trim()
      });

      console.log('Rejection response:', response);
      Alert.alert('Success', 'Expense has been rejected successfully');
      rejectSheetRef.current?.dismiss();

      // Refresh the data after successful rejection
      if (activeTab === 'expenseToApprove') {
        await fetchExpenseToApproveData();
      } else if (activeTab === 'approvedByMe') {
        await fetchApprovedByMeExpenses();
      } else if (activeTab === 'myApprovalExpense') {
        await fetchMyApprovedExpenses();
      } else if (activeTab === 'pendingApproval') {
        await fetchPendingApprovals();
      }
    } catch (error) {
      console.error('Error rejecting expense:', error);
      Alert.alert('Rejection Failed', error.message || 'Failed to reject expense');
    } finally {
      setProcessingRejection(false);
    }
  };

  const handleViewExpenseDetails = () => {
    console.log('Viewing expense details:', selectedExpense.id);
    expenseDetailsSheetRef.current?.dismiss();
  };

  const handlePrintTimesheet = useCallback(async () => {
    try {
      if (!selectedExpense?.headerUuid) {
        Alert.alert('Error', 'No expense selected');
        return;
      }
      setPrinting(true);
      const pdfBase64 = await getExpenseSlip({ headerUuid: selectedExpense.headerUuid });
      if (!pdfBase64) {
        Alert.alert('Preview Unavailable', 'Expense PDF is not available right now.');
        return;
      }
      expenseDetailsSheetRef.current?.dismiss();
      navigation.navigate('FileViewerScreen', {
        pdfBase64,
        fileName: `ExpenseSlip_${selectedExpense?.srNo || selectedExpense?.id}`,
        opportunityTitle: selectedExpense?.projectName || 'Expense',
        companyName: selectedExpense?.enteredBy || '',
      });
    } catch (e) {
      console.log('[ExpenseApproval] print open failed:', e?.message || e);
      Alert.alert('Failed', 'Unable to open the expense slip.');
    } finally {
      setPrinting(false);
    }
  }, [selectedExpense]);

  const handleViewApprovalDetails = () => {
    console.log('Viewing approval details:', selectedExpense.id);
    approvalDetailsSheetRef.current?.dismiss();
  };

  const closeSheet = (sheetRef) => {
    sheetRef.current?.dismiss();
    setSelectedExpense(null);
    setSelectedAction('');
    setRemark('');
    setReason('');
    setApproveMode('form');
    // Clear expense details data when closing sheets
    setExpenseDetailsData(null);
    setExpenseDetailsError(null);
    // Clear approval details data when closing sheets
    setApprovalDetailsData(null);
    setApprovalDetailsError(null);
  };

  const tabs = [
    { key: 'expenseToApprove', label: 'Expense to Approve' },
    { key: 'myApprovalExpense', label: 'My Approval Expense' },
    { key: 'pendingApproval', label: 'Pending Approval' },
    // { key: 'myExpense', label: 'My Expense' },
    { key: 'myRejectedExpense', label: 'My Rejected Expense' },
    { key: 'approvedByMe', label: 'Approved By Me' },
  ];

  // Full-screen loader for initial data loading
  if (loading && (
    (activeTab === 'approvedByMe' && apiApprovedByMeData.length === 0) ||
    (activeTab === 'expenseToApprove' && apiExpenseToApproveData.length === 0) ||
    (activeTab === 'myApprovalExpense' && apiMyApprovedExpensesData.length === 0) ||
    (activeTab === 'myRejectedExpense' && apiMyRejectedExpensesData.length === 0) ||
    (activeTab === 'pendingApproval' && apiPendingApprovalsData.length === 0)
  )) {
    return (
      <View style={styles.safeArea}>
        <AppHeader
          title="Expense Approval"
          onLeftPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return;
            }
            let parent = navigation;
            for (let i = 0; i < 3; i++) {
              parent = parent?.getParent?.();
              if (!parent) break;
              if (typeof parent.openDrawer === 'function') {
                parent.openDrawer();
                return;
              }
            }
            navigation.dispatch(DrawerActions.openDrawer());
          }}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Expense Approval"
        onLeftPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return;
          }
          let parent = navigation;
          for (let i = 0; i < 3; i++) {
            parent = parent?.getParent?.();
            if (!parent) break;
            if (typeof parent.openDrawer === 'function') {
              parent.openDrawer();
              return;
            }
          }
          navigation.dispatch(DrawerActions.openDrawer());
          // no drawer? fall back to initial route behavior if needed
        }}
        onRightPress={() => navigation.navigate('Notification')}
      />
      <View style={styles.container}>


        {/* Tab Selection Dropdown */}
        <View style={styles.tabDropdownContainer}>
          <Dropdown
            placeholder="Select Expense Type"
            value={tabs.find(tab => tab.key === activeTab)?.label || ''}
            options={tabs}
            getLabel={(tab) => tab.label}
            getKey={(tab) => tab.key}
            hint="Select Expense Type"
            onSelect={(tab) => setActiveTab(tab.key)}
            isOpen={isTabDropdownOpen}
            onOpenChange={(next) => {
              setIsTabDropdownOpen(next);
              if (next) {
                setIsProjectDropdownOpen(false);
                setIsEmployeeDropdownOpen(false);
              }
            }}
            style={{ width: '100%' }}
          />
        </View>

        {/* Filter and Search Section */}

        <View style={styles.filterSection}>
          <View style={styles.inlineRow}>
            <View style={styles.inlineHalf}>
              <Dropdown
                placeholder={projectsLoading ? "Loading projects..." : "Project Name"}
                value={selectedProject?.name}
                options={projects.length ? projects : sampleProjects}
                getLabel={(p) => p.name}
                getKey={(p) => p.id}
                hint="Project Name"
                onSelect={(project) => setSelectedProject(project)}
                disabled={projectsLoading}
                isOpen={isProjectDropdownOpen}
                onOpenChange={(next) => {
                  setIsProjectDropdownOpen(next);
                  if (next) {
                    setIsTabDropdownOpen(false);
                    setIsEmployeeDropdownOpen(false);
                  }
                }}
              />
            </View>

            <View style={styles.inlineHalf}>
              <Dropdown
                placeholder={employeesLoading ? "Loading employees..." : "Employee"}
                value={selectedEmployee?.name}
                options={employees}
                getLabel={(e) => e.name}
                getKey={(e) => e.id}
                hint="Employee"
                onSelect={(employee) => setSelectedEmployee(employee)}
                disabled={employeesLoading}
                isOpen={isEmployeeDropdownOpen}
                onOpenChange={(next) => {
                  setIsEmployeeDropdownOpen(next);
                  if (next) {
                    setIsTabDropdownOpen(false);
                    setIsProjectDropdownOpen(false);
                  }
                }}
              />
            </View>
          </View>

          {/* Error messages for dropdowns */}
          {projectsError && (
            <View style={styles.dropdownErrorContainer}>
              <Text style={styles.dropdownErrorText}>⚠️ {projectsError}</Text>
            </View>
          )}
          {employeesError && (
            <View style={styles.dropdownErrorContainer}>
              <Text style={styles.dropdownErrorText}>⚠️ {employeesError}</Text>
            </View>
          )}

          <View style={styles.searchRow}>
            <Text style={styles.showText}>Show</Text>
            <Dropdown
              placeholder={String(pageSize)}
              value={String(pageSize)}
              options={pageSizes}
              hideSearch
              maxPanelHeightPercent={15}
              inputBoxStyle={{ paddingHorizontal: wp(3.2) }}
              style={{ width: wp(14), marginBottom: hp(1.1), marginEnd: wp(1.1) }}
              onSelect={handleItemsPerPageChange}
            />

            <View style={styles.searchInputContainer}>
              <Icon name="search" size={rf(3.8)} color="#8e8e93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search expenses..."
                placeholderTextColor="#8e8e93"
                returnKeyType="search"
                value={searchValue}
                onChangeText={setSearchValue}
                onSubmitEditing={handleSearch}
                clearButtonMode="while-editing"
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.searchButton, searchValue.trim() && styles.clearButton]}
              onPress={searchValue.trim() ? handleClearSearch : handleSearch}
            >
              <Text style={styles.searchButtonText}>
                {searchValue.trim() ? 'Clear' : 'Search'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.contentContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {error && (activeTab === 'approvedByMe' || activeTab === 'expenseToApprove' || activeTab === 'myApprovalExpense' || activeTab === 'myRejectedExpense' || activeTab === 'pendingApproval') ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                {/* <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={activeTab === 'approvedByMe' ? fetchApprovedByMeExpenses : 
                           activeTab === 'expenseToApprove' ? fetchExpenseToApproveData :
                           activeTab === 'myApprovalExpense' ? fetchMyApprovedExpenses :
                           activeTab === 'myRejectedExpense' ? fetchMyRejectedExpenses :
                           fetchPendingApprovals}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity> */}
              </View>
            ) : (
              <>
                {Array.isArray(filteredData) && filteredData
                  .slice(currentPage * pageSize, (currentPage + 1) * pageSize)
                  .map(expense => (
                    <ExpenseDataComponent
                      key={expense.id}
                      data={[expense]}
                      onActionPress={handleActionPress}
                      getStatusColor={getStatusColor}
                      getStatusBgColor={getStatusBgColor}
                      showActions={activeTab === 'expenseToApprove'}
                      showExpenseDetails={activeTab !== 'myApprovalExpense' && activeTab !== 'myRejectedExpense'}
                    />
                  ))}

                {(!Array.isArray(filteredData) || filteredData.length === 0) && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      {searchValue.trim() ? 'No expense records found matching your search.' : 'No expense records found.'}
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </View>

        {/* Inline overlay loader while fetching data (e.g., on Next/Prev) */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <Loader size="small" style={{ backgroundColor: 'transparent' }} />
          </View>
        )}

        {/* Pagination */}
        {totalRecords > pageSize && (
          <View style={styles.paginationContainerTop}>
            <Text style={styles.pageInfo}>
              Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRecords)} of {totalRecords} entries
              {searchValue.trim() && ` (filtered from ${totalRecords} total)`}
            </Text>
            <View style={styles.pageNavigation}>
              {pageItems.map((it, idx) => {
                if (it === 'prev') {
                  const disabled = currentPage === 0;
                  return (
                    <TouchableOpacity
                      key={`prev-${idx}`}
                      style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]}
                      disabled={disabled}
                      onPress={() => handlePageChange(currentPage - 1)}
                    >
                      <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Previous</Text>
                    </TouchableOpacity>
                  );
                }
                if (it === 'next') {
                  const disabled = currentPage >= totalPages - 1;
                  return (
                    <TouchableOpacity
                      key={`next-${idx}`}
                      style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]}
                      disabled={disabled}
                      onPress={() => handlePageChange(currentPage + 1)}
                    >
                      <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Next</Text>
                    </TouchableOpacity>
                  );
                }
                if (it === 'left-ellipsis' || it === 'right-ellipsis') {
                  return (
                    <View key={`dots-${idx}`} style={styles.pageDots}><Text style={styles.pageNumberText}>...</Text></View>
                  );
                }
                if (typeof it !== 'number') {
                  return null;
                }
                const pageNum = it;
                const active = pageNum === currentPage + 1;
                return (
                  <TouchableOpacity
                    key={`p-${pageNum}`}
                    style={[styles.pageNumberBtn, active && styles.pageNumberBtnActive]}
                    onPress={() => handlePageChange(pageNum - 1)}
                  >
                    <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{pageNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Expense Details Bottom Sheet */}
        <BottomSheetModal
          ref={expenseDetailsSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(expenseDetailsSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Expense Details</Text>
              <TouchableOpacity onPress={() => closeSheet(expenseDetailsSheetRef)} style={styles.closeButton}>
                <Icon name="close" size={rf(5)} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollableContent}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContentContainer}
            >
              {expenseDetailsLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading expense details...</Text>
                </View>
              ) : expenseDetailsError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{expenseDetailsError}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() => selectedExpense?.headerUuid && fetchExpenseDetails(selectedExpense.headerUuid)}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : expenseDetailsData ? (
                <View style={styles.expenseDetails}>
                  {/* Header Information */}
                  {expenseDetailsData.header && (
                    <>
                      <Text style={styles.sectionTitle}>Header Information</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Project:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.ProjectName || expenseDetailsData.header.Project_Title || 'N/A'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Task:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.ProjectTask || expenseDetailsData.header.Task_Title || 'N/A'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>From Date:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.DocumentDateFrom || expenseDetailsData.header.Doc_Date_From || 'N/A'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>To Date:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.DocumentDateTo || expenseDetailsData.header.Doc_Date_To || 'N/A'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Expense Type:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.ExpenseType || 'N/A'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Country:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.CountryName || expenseDetailsData.header.Country || 'N/A'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>State:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.StateName || expenseDetailsData.header.State || 'N/A'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>City:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.CityName || expenseDetailsData.header.City || 'N/A'}</Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Currency:</Text>
                        <Text style={styles.detailValue}>{expenseDetailsData.header.CurrencyName || expenseDetailsData.header.Currency || 'N/A'}</Text>
                      </View>
                    </>
                  )}

                  {/* Line Items */}
                  {expenseDetailsData.lines && expenseDetailsData.lines.length > 0 && (
                    <>
                      <Text style={styles.sectionTitle}>Line Items</Text>
                      {expenseDetailsData.lines.map((line, index) => (
                        <View key={line.id || index} style={styles.lineItemContainer}>
                          <Text style={styles.lineItemTitle}>Line {index + 1}</Text>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Quantity:</Text>
                            <Text style={styles.detailValue}>{line.quantity}</Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Unit Type:</Text>
                            <Text style={styles.detailValue}>{line.unitType}</Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Unit Cost:</Text>
                            <Text style={styles.detailValue}>₹ {line.unitCost}</Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Total Cost:</Text>
                            <Text style={styles.detailValue}>₹ {line.totalCost}</Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Tax Amount:</Text>
                            <Text style={styles.detailValue}>₹ {line.taxAmount}</Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Bill Amount:</Text>
                            <Text style={styles.detailValue}>₹ {line.billAmount}</Text>
                          </View>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Document Date:</Text>
                            <Text style={styles.detailValue}>{line.documentDate || 'N/A'}</Text>
                          </View>

                          {line.billUrl && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Bill URL:</Text>
                              <Text style={styles.detailValue}>{line.billUrl}</Text>
                            </View>
                          )}

                          {line.expenseRemarks && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Remarks:</Text>
                              <Text style={styles.detailValue}>{line.expenseRemarks}</Text>
                            </View>
                          )}

                          {line.isOtherExpenseType && line.otherExpenseTypeName && (
                            <View style={styles.detailRow}>
                              <Text style={styles.detailLabel}>Other Expense Type:</Text>
                              <Text style={styles.detailValue}>{line.otherExpenseTypeName}</Text>
                            </View>
                          )}
                        </View>
                      ))}
                    </>
                  )}

                  <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity style={styles.closeButtonStyle} onPress={handleViewExpenseDetails}>
                      <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                  style={[styles.closeButtonStyle, printing && styles.disabledButton]}
                  onPress={handlePrintTimesheet}
                  disabled={printing}
                >
                  <Text style={styles.closeButtonText}>{printing ? 'Opening...' : 'Print'}</Text>
                </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No expense details available.</Text>
                </View>
              )}
            </ScrollView>
          </BottomSheetView>
        </BottomSheetModal>

        {/* Approval Details Bottom Sheet */}
        <BottomSheetModal
          ref={approvalDetailsSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(approvalDetailsSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Approval Details</Text>
              <TouchableOpacity onPress={() => closeSheet(approvalDetailsSheetRef)} style={styles.closeButton}>
                <Icon name="close" size={rf(5)} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {approvalDetailsLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading approval details...</Text>
              </View>
            ) : approvalDetailsError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{approvalDetailsError}</Text>
                {/* <TouchableOpacity 
                  style={styles.retryButton} 
                  onPress={() => selectedExpense?.headerUuid && fetchApprovalDetails(selectedExpense.headerUuid)}
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity> */}
              </View>
            ) : approvalDetailsData ? (
              <ScrollView style={styles.approvalDetailsList} showsVerticalScrollIndicator={false}>
                {(approvalDetailsData.allHistory || []).map((detail, idx) => (
                  <View key={`${idx}-${detail?.actiondate || detail?.ActionDate || 'row'}`} style={styles.approvalItem}>
                    <Text style={styles.approvalTitle}>Approval #{idx + 1}</Text>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Action Date:</Text>
                      <Text style={styles.detailValue}>{detail.ActionDate || detail.actiondate || detail.actionDate || '-'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Entered By:</Text>
                      <Text style={styles.detailValue}>{detail.EnteredBy || detail.enteredby || detail.enteredBy || '-'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={[styles.statusBadge, {
                        color: '#fff',
                        backgroundColor: getStatusColor(detail.Status || detail.status || 'Pending')
                      }]}>
                        {detail.Status || detail.status || 'Pending'}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Action Taken By:</Text>
                      <Text style={styles.detailValue}>{detail.ActionTakenBy || detail.actiontakenby || detail.actionTakenBy || '-'}</Text>
                    </View>

                    {(detail.RemarksByApproval || detail.remarksbyapproval || detail.remarksByApproval) &&
                      (detail.RemarksByApproval || detail.remarksbyapproval || detail.remarksByApproval) !== 'N/A' && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Remarks:</Text>
                          <Text style={styles.detailValue}>{detail.RemarksByApproval || detail.remarksbyapproval || detail.remarksByApproval}</Text>
                        </View>
                      )}

                    <View style={styles.approvalDivider} />
                  </View>
                ))}

                {(!approvalDetailsData.allHistory || approvalDetailsData.allHistory.length === 0) && (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>No approval details available.</Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No approval details available.</Text>
              </View>
            )}

            <TouchableOpacity style={styles.closeButtonStyle} onPress={handleViewApprovalDetails}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheetModal>

        {/* Approve Bottom Sheet */}
        <BottomSheetModal
          ref={approveSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(approveSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={styles.sheetContent}>
            {approveMode === 'form' ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Approve Expense</Text>
                  <TouchableOpacity onPress={() => closeSheet(approveSheetRef)} style={styles.closeButton}>
                    <Icon name="close" size={rf(5)} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {selectedExpense && (
                  <View style={styles.approvalForm}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Expense:</Text>
                      <Text style={styles.detailValue}>{selectedExpense.expenseName}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Amount:</Text>
                      <Text style={styles.detailValue}>{selectedExpense.amount}</Text>
                    </View>

                    {/* <View style={styles.remarkSection}>
                      <Text style={styles.remarkLabel}>Remark</Text>
                      <TextInput
                        style={styles.remarkInput}
                        placeholder="Enter your remark here..."
                        placeholderTextColor="#9ca3af"
                        value={remark}
                        onChangeText={setRemark}
                        multiline
                        numberOfLines={3}
                      />
                    </View> */}

                    <TouchableOpacity
                      style={[styles.approveButton, processingApproval && styles.disabledButton]}
                      onPress={handleApprove}
                      disabled={processingApproval}
                    >
                      <Text style={styles.approveButtonText}>
                        {processingApproval ? 'Approving...' : 'Approve'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconCircleMark}>✓</Text>
                </View>
                <Text style={styles.successDone}>Done</Text>
                <Text style={styles.successMessage}>Expense has been Approved!</Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.primaryBtn}
                  onPress={() => closeSheet(approveSheetRef)}
                >
                  <Text style={styles.primaryBtnText}>Ok</Text>
                </TouchableOpacity>
              </>
            )}
          </BottomSheetView>
        </BottomSheetModal>

        {/* Reject Bottom Sheet */}
        <BottomSheetModal
          ref={rejectSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(rejectSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reject Expense</Text>
              <TouchableOpacity onPress={() => closeSheet(rejectSheetRef)} style={styles.closeButton}>
                <Icon name="close" size={rf(5)} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.reasonSection}>
              <TextInput
                style={styles.reasonInput}
                placeholder="Enter reason for rejection..."
                placeholderTextColor="#9ca3af"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity
              style={[styles.rejectButton, processingRejection && styles.disabledButton]}
              onPress={handleReject}
              disabled={processingRejection}
            >
              <Text style={styles.rejectButtonText}>
                {processingRejection ? 'Rejecting...' : 'Reject'}
              </Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    // paddingTop: safeAreaTop,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  inlineRow: {
    flexDirection: 'row',
    gap: wp(3),
  },
  inlineHalf: {
    flex: 1,
  },
  tabDropdownContainer: {
    // marginBottom: hp(2),
    marginTop: hp(1),
  },
  filterSection: {
    marginBottom: hp(2),
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
  },
  showText: {
    fontSize: rf(3.2),
    color: '#555',
    marginRight: wp(2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: wp(2),
    height: hp(5.3), // added
    flex: 1,
    marginEnd: wp(2),
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(1.5),
    fontSize: rf(4),
    color: COLORS.text,
    height: hp(6),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  // Reimbursement pill-style buttons
  buttonNeutral: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#c8c811ff',
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonNeutralText: {
    color: '#c8c811ff',
    fontSize: rf(3),
    fontWeight: '800',
    textAlign: 'center',
  },
  buttonPositive: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#07b807ff',
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPositiveText: {
    color: '#07b807ff',
    fontSize: rf(3),
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonNegative: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#FF0000',
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonNegativeText: {
    color: '#FF0000',
    fontSize: rf(3),
    fontWeight: '600',
    textAlign: 'center',
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
  },
  clearButton: {
    backgroundColor: '#ef4444',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: rf(3.2),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  dataContent: {
    paddingBottom: hp(4),
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp(3),
    paddingTop: wp(4),
    paddingHorizontal: wp(4),
    paddingBottom: wp(6),
    marginTop: hp(2),
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: '#333',
    marginBottom: hp(2),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.2),
  },
  fieldLabel: {
    fontSize: rf(3.6),
    color: '#555',
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  fieldValue: {
    fontSize: rf(3.8),
    color: '#111',
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
  },
  // Opportunity-style card styles for Expense
  tsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: '#eee',
    padding: SPACING.md,
    marginBottom: hp(-3),
    ...SHADOW.elevation2,
  },
  tsRowHeader: {
    ...layout.rowSpaceBetween,
  },
  tsHeaderLeft: {
    ...layout.rowCenter,
    gap: SPACING.sm,
    flex: 1,
  },
  tsHeaderLeftContent: {
    maxWidth: wp(60),
  },
  tsDot: {
    width: wp(3.5),
    height: wp(3.5),
    borderRadius: RADIUS.md,
  },
  tsCaption: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textLight,
    fontWeight: '700',
    marginBottom: hp(0.3),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  tsTitle: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
    maxWidth: wp(50),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  tsHeaderRight: {
    ...layout.rowCenter,
    gap: SPACING.sm,
  },
  tsHours: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  tsDetailArea: {
    marginTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: hp(1.2),
  },
  tsBadge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  tsBadgeText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  tsActionsRowPrimary: {
    ...layout.rowCenter,
    justifyContent: 'space-between',
    gap: wp(6),
    marginTop: hp(0.8),
  },
  statusBadge: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(5),
    fontSize: rf(3),
    fontWeight: '600',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: hp(2),
    paddingTop: hp(1),
    paddingBottom: hp(1),
    gap: wp(2),
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(0.5),
  },
  actionButton: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  viewButton: {
    backgroundColor: '#6b7280',
  },
  approvalDetailsButton: {
    backgroundColor: '#6b7280',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  contentContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: hp(4),
  },
  // Bottom Sheet Styles
  handle: {
    alignSelf: 'center',
    width: wp(18),
    height: hp(0.7),
    backgroundColor: '#2e2e2e',
    borderRadius: hp(0.6),
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  sheetContent: {
    backgroundColor: '#fff',
    paddingHorizontal: wp(6),
    paddingBottom: hp(2.5),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  sheetBackground: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: rf(4.2),
    fontWeight: '600',
    color: '#1f2937',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  closeButton: {
    padding: wp(1),
  },
  expenseDetails: {
    marginBottom: hp(2),
  },
  approvalDetails: {
    marginBottom: hp(2),
  },
  approvalForm: {
    marginBottom: hp(2),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  detailLabel: {
    fontSize: rf(3.4),
    fontWeight: '500',
    color: '#6b7280',
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  detailValue: {
    fontSize: rf(3.4),
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  remarkSection: {
    marginTop: hp(2),
    marginBottom: hp(2),
  },
  remarkLabel: {
    fontSize: rf(3.4),
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: hp(1),
  },
  remarkInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    fontSize: rf(3.2),
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
  },
  reasonSection: {
    marginBottom: hp(2),
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    fontSize: rf(3.2),
    color: '#1f2937',
    backgroundColor: '#f9fafb',
    textAlignVertical: 'top',
    minHeight: hp(15),
  },
  approveButton: {
    backgroundColor: '#10B981',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
  },
  // Success state styles
  iconCircle: {
    alignSelf: 'center',
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    borderWidth: 2,
    borderColor: COLORS.success + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.5),
  },
  iconCircleMark: {
    fontSize: TYPOGRAPHY.h1,
    color: COLORS.success,
    fontWeight: '800',
  },
  successDone: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.subtitle,
    color: '#6b7280',
    marginTop: hp(0.6),
    marginBottom: hp(0.6),
  },
  successMessage: {
    textAlign: 'center',
    color: '#111',
    fontSize: TYPOGRAPHY.subtitle,
    marginBottom: hp(1.6),
  },
  primaryBtn: {
    backgroundColor: '#FB6B35',
    paddingVertical: hp(1.2),
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignSelf: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: TYPOGRAPHY.subtitle,
  },
  rejectButton: {
    backgroundColor: '#EF4444',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
  },
  closeButtonStyle: {
    backgroundColor: '#6b7280',
    paddingVertical: wp(2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
    marginTop: hp(2),
    marginHorizontal: 'auto',
    width:wp(35)
  },
  closeButtonText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
  },
  // Loading and Error states
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  loadingText: {
    fontSize: rf(3.2),
    color: '#6b7280',
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  errorText: {
    fontSize: rf(3.2),
    textAlign: 'center',
    marginBottom: hp(2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  // Dropdown error styles
  dropdownErrorContainer: {
    marginTop: hp(0.5),
    marginBottom: hp(1),
    paddingHorizontal: wp(2),
  },
  dropdownErrorText: {
    fontSize: rf(2.8),
    color: '#ef4444',
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2),
  },
  retryButtonText: {
    color: '#fff',
    fontSize: rf(3.2),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  // New styles for expense details
  sectionTitle: {
    fontSize: rf(3.8),
    fontWeight: '700',
    color: '#1f2937',
    marginTop: hp(2),
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  lineItemContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: wp(2),
    padding: wp(3),
    marginBottom: hp(1),
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  lineItemTitle: {
    fontSize: rf(3.4),
    fontWeight: '600',
    color: '#374151',
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  // Scrollable content styles
  scrollableContent: {
    flex: 1,
    maxHeight: hp(65), // Limit the height to allow scrolling within the bottom sheet
  },
  scrollContentContainer: {
    paddingBottom: hp(2), // Add padding at the bottom for better scrolling
  },
  // Disabled button style
  disabledButton: {
    opacity: 0.6,
  },
  // Pagination styles
  paginationContainerTop: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    backgroundColor: '#f8f9fa',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
    marginBottom: hp(1),
  },
  pageButtonTextual: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    backgroundColor: '#fff',
  },
  pageButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  pageText: {
    fontSize: rf(3.5),
    color: COLORS.primary,
    fontWeight: '600',
  },
  pageTextDisabled: {
    color: '#9ca3af',
  },
  pageDots: {
    paddingHorizontal: wp(1.5),
    minWidth: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.8),
  },
  pageNumberBtn: {
    minWidth: wp(8),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2.4),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  pageNumberBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pageNumberText: {
    fontSize: rf(3.6),
    color: COLORS.primary,
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
  pageInfo: {
    fontSize: rf(3.5),
    color: '#6b7280',
    marginBottom: hp(0.5),
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  // Approval details list styles
  approvalDetailsList: {
    maxHeight: hp(35),
    marginBottom: hp(2),
  },
  approvalItem: {
    marginBottom: hp(2),
    paddingBottom: hp(1),
  },
  approvalTitle: {
    fontSize: rf(3.8),
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  approvalDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: hp(1),
  },
});

export default ExpenseApproval;
