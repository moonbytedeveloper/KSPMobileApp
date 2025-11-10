import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppHeader from '../../components/common/AppHeader';
import Loader from '../../components/common/Loader';
import Dropdown from '../../components/common/Dropdown';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, text, layout, SHADOW, buttonStyles } from '../styles/styles';
import { getApprovedTimesheets, getSubmittedAndPendingTimesheets, getTimesheetPDF } from '../../api/authServices';

const sampleProjects = [
  { id: 'p1', name: 'Project Alpha', tasks: ['Design', 'Development', 'Testing'] },
  { id: 'p2', name: 'Project Beta', tasks: ['Research', 'Implementation'] },
  { id: 'p3', name: 'Internal Ops', tasks: ['Procurement', 'Travel', 'Reimbursement'] },
  { id: 'p4', name: 'Real Estate Software', tasks: ['Planning', 'Execution'] },
  { id: 'p5', name: 'Moonbyte001', tasks: ['Module A', 'Module B', 'Module C'] },
];

const pageSizes = [10, 25, 50, 100];

const TimesheetCard = ({ timesheet, onActionPress, getStatusColor, getStatusBgColor, expanded: expandedProp, onToggle, isApprovedTab = false }) => {
  const [expandedUncontrolled, setExpandedUncontrolled] = useState(false);
  const isControlled = typeof expandedProp === 'boolean';
  const expanded = isControlled ? expandedProp : expandedUncontrolled;


  const toggle = useCallback(() => {
    if (isControlled) {
      onToggle && onToggle(); // parent handles state
    } else {
      setExpandedUncontrolled(prev => !prev); // local toggle
    }
  }, [isControlled, onToggle]);


  const statusColor = getStatusColor(timesheet.status);
  const statusBg = getStatusBgColor(timesheet.status);
  const StatusBadge = ({ label = 'Pending' }) => {
    const palette = {
      Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
      'Not Updated': { bg: COLORS.divider, color: 'gray', border: 'gray' },
      Submitted: { bg: COLORS.infoBg, color: COLORS.info, border: COLORS.info },
      Approved: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
      Closed: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.danger },
    };

    const theme = palette[label] || palette.Pending;

    return (
      <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
      </View>
    );
  };
  return (
    <View style={styles.tsCard}>
      <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
        <View style={styles.tsRowHeader}>
          <View style={styles.tsHeaderLeft}>
            <View style={[styles.tsDot, {
              backgroundColor: timesheet.status === 'Approved'
                ? COLORS.success
                : timesheet.status === 'Pending'
                  ? COLORS.warning
                  : timesheet.status === 'Submitted' ? COLORS.info : COLORS.danger,
            }]} />
            <View style={styles.tsHeaderLeftContent}>
              <Text style={[text.caption, styles.tsCaption]}>Timesheet</Text>
              <Text style={[text.title, styles.tsTitle]} numberOfLines={1}>{timesheet.employeeName || `Timesheet #${timesheet.srNo}`}</Text>
            </View>
          </View>
          <View style={styles.tsHeaderRight}>
            <View>
              <Text style={[text.caption, styles.tsCaption, { textAlign: 'right' }]}>Total Hours</Text>
              <Text style={[text.title, styles.tsHours]}>{timesheet.totalHoursWorked}</Text>
            </View>
            <Icon name={expanded ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.textMuted} />
          </View>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.tsDetailArea}>
          <View style={styles.detailRow}>
            <Text style={[text.caption, styles.detailLabel]}>Sr No</Text>
            <Text style={[text.body, styles.detailValue]}>{timesheet.srNo}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={[text.caption, styles.detailLabel]}>Period</Text>
            <Text style={[text.body, styles.detailValue]}>{timesheet.fromDate} - {timesheet.toDate}</Text>
          </View>
          {!isApprovedTab && (
            <View style={styles.detailRow}>
              <Text style={[text.caption, styles.detailLabel]}>Next Approval (Hr)</Text>
              <Text style={[text.body, styles.detailValue]}>{timesheet.nextApproval}</Text>
            </View>
          )}
          <View style={styles.detailRow}>
            <Text style={[text.caption, styles.detailLabel]}>Status</Text>
            <StatusBadge label={timesheet.status} />
          </View>

          <View style={styles.tsActionsRowPrimary}>
            <TouchableOpacity onPress={() => onActionPress(timesheet, 'view')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.viewBtn]}>
              <Icon name="description" size={rf(5)} style={buttonStyles.iconView} />
            </TouchableOpacity>
            {isApprovedTab && (
              <TouchableOpacity onPress={() => onActionPress(timesheet, 'approvalDetails')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.scheduleBtn]}>
                <Icon name="schedule" size={rf(5)} style={buttonStyles.iconSchedule} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const ManageMyWorklist = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('submitted');
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [submittedData, setSubmittedData] = useState([]);
  const [approvedData, setApprovedData] = useState([]);
  const [isLoadingApproved, setIsLoadingApproved] = useState(false);
  const [totalSubmittedRecords, setTotalSubmittedRecords] = useState(0);
  const [approvedError, setApprovedError] = useState('');
  const [totalApprovedRecords, setTotalApprovedRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0); // zero-based
  const [isLoadingSubmitted, setIsLoadingSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState(null); // New state for expanded card
  const [printing, setPrinting] = useState(false);


  const viewSheetRef = useRef(null);
  const approvalDetailsSheetRef = useRef(null);

  const handleTabSwitch = (tab) => {
    setSelectedProject(null);
    setSelectedTask(null);
    setSearchTerm('');
    setCurrentPage(0);
    setActiveTab(tab);
  };

  const snapPoints = useMemo(() => [hp(60)], []);

  // Build dynamic project options from current tab's data
  const projectOptions = useMemo(() => {
    const data = activeTab === 'approved' ? approvedData : submittedData;
    const unique = new Map();
    data.forEach((ts) => {
      const proj = (ts?.projectDetails?.project || '').trim();
      if (proj) {
        const key = proj.toLowerCase();
        if (!unique.has(key)) unique.set(key, { id: key, name: proj });
      }
      // Include from timesheet lines as well
      (ts?.timesheetLines || []).forEach((l) => {
        const lp = (l?.ProjectName || l?.Project || '').trim();
        if (lp) {
          const lk = lp.toLowerCase();
          if (!unique.has(lk)) unique.set(lk, { id: lk, name: lp });
        }
      });
    });
    const arr = Array.from(unique.values());
    return arr.length ? arr : sampleProjects; // fallback to sample list if empty
  }, [activeTab, approvedData, submittedData]);

  const availableTasks = useMemo(() => {
    if (!selectedProject) return [];
    const data = activeTab === 'approved' ? approvedData : submittedData;
    const target = (selectedProject?.name || '').trim().toLowerCase();
    const tasksSet = new Set();
    data.forEach((ts) => {
      const pdProj = (ts?.projectDetails?.project || '').trim().toLowerCase();
      if (pdProj === target && ts?.projectDetails?.task) tasksSet.add(String(ts.projectDetails.task));
      (ts?.timesheetLines || []).forEach((l) => {
        const lp = (l?.ProjectName || l?.Project || '').trim().toLowerCase();
        if (lp === target && (l?.TaskName || l?.Task)) tasksSet.add(String(l.TaskName || l.Task));
      });
    });
    const arr = Array.from(tasksSet);
    return arr.length ? arr : [];
  }, [activeTab, approvedData, submittedData, selectedProject]);

  // Filter data by selected project/task (like ExpenseScreen)
  const filteredTimesheets = useMemo(() => {
    const data = activeTab === 'approved' ? approvedData : submittedData;
    const normalize = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
    const selProj = normalize(selectedProject?.name);
    const selTask = normalize(selectedTask);

    return data.filter((ts) => {
      // Aggregate candidate values
      const pdProj = normalize(ts?.projectDetails?.project);
      const pdTask = normalize(ts?.projectDetails?.task);

      const lineMatches = (ts?.timesheetLines || []).some((l) => {
        const lp = normalize(l?.ProjectName || l?.Project);
        const lt = normalize(l?.TaskName || l?.Task);
        const projectMatches = selProj ? lp === selProj : true;
        const taskMatches = selTask ? lt === selTask : true;
        return projectMatches && taskMatches;
      });

      const headerMatches = (() => {
        const projectMatches = selProj ? pdProj === selProj : true;
        const taskMatches = selTask ? pdTask === selTask : true;
        return projectMatches && taskMatches;
      })();

      return headerMatches || lineMatches;
    });
  }, [activeTab, approvedData, submittedData, selectedProject, selectedTask]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedTask(null);
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
  };

  // Sample data for Submitted & Pending Timesheet
  const submittedTimesheetData = [
    {
      id: 1,
      headerUuid: 1,
      srNo: '001',
      employeeName: 'Abhinav Kumar',
      totalHoursWorked: '40:00',
      fromDate: '01-08-2025',
      toDate: '07-08-2025',
      nextApproval: 'HR Manager',
      status: 'Submitted',
      projectDetails: {
        project: 'Moonbyte001',
        task: 'Testing the data',
        date: '04/08/2025',
        totalTime: '03:00',
        description: 'Test'
      }
    },
    {
      id: 2,
      headerUuid: 2,
      srNo: '002',
      employeeName: 'Riya Sharma',
      totalHoursWorked: '32:30',
      fromDate: '08-08-2025',
      toDate: '14-08-2025',
      nextApproval: 'HR Manager',
      status: 'Pending',
      projectDetails: {
        project: 'Project Alpha',
        task: 'UI Development',
        date: '10/08/2025',
        totalTime: '02:30',
        description: 'UI Development work'
      }
    }
  ];

  // Sample data for Approved Timesheet
  const approvedTimesheetData = [
    {
      id: 3,
      headerUuid: 3,
      srNo: '003',
      employeeName: 'Aman Verma',
      totalHoursWorked: '38:45',
      fromDate: '15-08-2025',
      toDate: '21-08-2025',
      status: 'Approved',
      projectDetails: {
        project: 'Project Beta',
        task: 'Backend Integration',
        date: '18/08/2025',
        totalTime: '04:00',
        description: 'Backend Integration work'
      },
      approvalDetails: {
        actionDate: '04-08-2025',
        enteredBy: 'Abhinav Kumar',
        status: 'Approved',
        actionTakenBy: 'Manan Jadav'
      }
    },
    {
      id: 4,
      headerUuid: 4,
      srNo: '004',
      employeeName: 'John Doe',
      totalHoursWorked: '35:20',
      fromDate: '22-08-2025',
      toDate: '28-08-2025',
      status: 'Approved',
      projectDetails: {
        project: 'Project Gamma',
        task: 'API Development',
        date: '25/08/2025',
        totalTime: '03:30',
        description: 'API Development work'
      },
      approvalDetails: {
        actionDate: '05-08-2025',
        enteredBy: 'John Doe',
        status: 'Approved',
        actionTakenBy: 'HR Manager'
      }
    }
  ];

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return COLORS.success;
      case 'submitted':
        return COLORS.info;
      case 'pending':
        return COLORS.warning;
      case 'rejected':
        return COLORS.danger;
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return COLORS.successBg;
      case 'submitted':
        return COLORS.successBg;
      case 'pending':
        return COLORS.warningBg;
      case 'rejected':
        return COLORS.dangerBg;
      default:
        return '#f3f4f6';
    }
  };

  const handleActionPress = (timesheet, action) => {
    setSelectedTimesheet(timesheet);
    setSelectedAction(action);

    switch (action) {
      case 'view':
        viewSheetRef.current?.present();
        break;
      case 'approvalDetails':
        approvalDetailsSheetRef.current?.present();
        break;
    }
  };
  const handlePrintTimesheet = useCallback(async () => {
    if (!selectedTimesheet || printing) {
      return;
    }

    const timesheet = selectedTimesheet;

    try {
      setPrinting(true);
      const pdfBase64 = await getTimesheetPDF({
        headerUuid: timesheet.headerUuid || timesheet.id,
      });

      if (!pdfBase64) {
        Alert.alert('Preview Unavailable', 'Timesheet PDF is not available right now.');
        return;
      }

      // Close the sheet before navigating
      closeSheet(viewSheetRef);

      navigation.navigate('FileViewerScreen', {
        pdfBase64,
        fileName: `Timesheet_${timesheet.srNo || timesheet.id}`,
        opportunityTitle: timesheet.projectDetails?.project || 'Timesheet',
        companyName: timesheet.employeeName,
      });
    } catch (error) {
      console.log('Error preparing timesheet PDF:', error?.message || error);
      Alert.alert('Preview Failed', 'Unable to load the timesheet PDF. Please try again.');
    } finally {
      setPrinting(false);
    }
  }, [selectedTimesheet, printing]);
  const handleView = () => {
    console.log('Viewing timesheet:', selectedTimesheet.id);
    viewSheetRef.current?.dismiss();
  };

  const handleApprovalDetails = () => {
    console.log('Viewing approval details for timesheet:', selectedTimesheet.id);
    approvalDetailsSheetRef.current?.dismiss();
  };

  const closeSheet = (sheetRef) => {
    sheetRef.current?.dismiss();
    setSelectedTimesheet(null);
    setSelectedAction('');
  };

  const currentData = activeTab === 'submitted' ? submittedData : approvedTimesheetData;

  // Fetch Approved Timesheets from API
  const mapApprovedRows = (resp) => {
    try {
      const container = resp?.Data ?? resp?.data ?? resp;
      const rows = Array.isArray(container?.data) ? container.data
        : Array.isArray(container?.Rows) ? container.Rows
          : Array.isArray(container?.rows) ? container.rows
            : Array.isArray(container?.Items) ? container.Items
              : Array.isArray(container?.items) ? container.items
                : Array.isArray(container) ? container : [];
      return rows.map((row, idx) => {
        const fromDate = row.FromDate || row.fromDate || '';
        const toDate = row.ToDate || row.toDate || '';
        const totalHours = row.TotalHours || row.TotalHoursWorked || row.Total_Hours || row.totalHours || '0:00';
        const employee = row.EmployeeName || row.Employee_Name || row.UserName || row.userName || '';
        const status = row.Status || row.status || 'Approved';
        const firstLine = Array.isArray(row.TimesheetLines) && row.TimesheetLines.length > 0 ? row.TimesheetLines[0] : null;
        return {
          id: row.UUID || row.Uuid || row.Id || row.id || idx + 1,
          headerUuid: row.HeaderUuid || row.HeaderUUID || row.UUID || row.Uuid || row.Id || row.id || null,
          srNo: String(row.SrNo || row.Sr_No || row.Sr || row.srNo || idx + 1).padStart(3, '0'),
          employeeName: employee || `Timesheet #${idx + 1}`,
          totalHoursWorked: String(totalHours),
          fromDate: String(fromDate || ''),
          toDate: String(toDate || ''),
          status: status,
          projectDetails: {
            project: firstLine?.ProjectName || '-',
            task: firstLine?.TaskName || '-',
            date: firstLine?.Date || '-',
            totalTime: firstLine?.TotalTime || String(totalHours),
            description: firstLine?.Description || '-',
          },
          timesheetLines: Array.isArray(row.TimesheetLines) ? row.TimesheetLines : [],
          approvalDetails: Array.isArray(row.ApprovalDetails) ? row.ApprovalDetails : [],
        };
      });
    } catch (_e) {
      return [];
    }
  };

  const loadApproved = async ({ start = 0, length = pageSize, searchValue = searchTerm } = {}) => {
    try {
      setApprovedError('');
      setIsLoadingApproved(true);
      const resp = await getApprovedTimesheets({ start, length, searchValue, sortColumn: 'FromDate' });
      try {
        console.log('🔵 [ManageMyWorklist] Approved API raw response:', JSON.stringify(resp, null, 2));
      } catch (_) { }
      const mapped = mapApprovedRows(resp);
      try {
        console.log('🟢 [ManageMyWorklist] Approved mapped items (count):', mapped.length);
        console.log('🟢 [ManageMyWorklist] First mapped item:', mapped[0]);
      } catch (_) { }
      setApprovedData(mapped);
      const total = (typeof resp?.Data?.recordsTotal === 'number' && resp.Data.recordsTotal)
        || (typeof resp?.Data?.recordsFiltered === 'number' && resp.Data.recordsFiltered)
        || (typeof resp?.recordsTotal === 'number' && resp.recordsTotal)
        || (typeof resp?.recordsFiltered === 'number' && resp.recordsFiltered)
        || mapped.length;
      setTotalApprovedRecords(total);
    } catch (e) {
      console.log('Error loading approved timesheets:', e?.message);
      setApprovedError('Failed to load approved timesheets');
      setApprovedData([]);
      setTotalApprovedRecords(0);
    } finally {
      setIsLoadingApproved(false);
    }
  };

  // Fetch Submitted & Pending Timesheets from API (log raw response only)
  const loadSubmittedPending = async ({ start = 0, length = pageSize } = {}) => {
    try {
      setIsLoadingSubmitted(true);
      const resp = await getSubmittedAndPendingTimesheets({ start, length });
      try {
        console.log('🔵 [ManageMyWorklist] Submitted&Pending API raw response:', JSON.stringify(resp, null, 2));
      } catch (_) { }

      // Map response to UI-friendly structure
      const container = resp?.Data ?? resp?.data ?? resp;
      const rows = Array.isArray(container?.data) ? container.data
        : Array.isArray(container?.Rows) ? container.Rows
          : Array.isArray(container?.rows) ? container.rows
            : Array.isArray(container?.Items) ? container.Items
              : Array.isArray(container?.items) ? container.items
                : Array.isArray(container) ? container : [];

      const mapped = rows.map((row, idx) => {
        const fromDate = row.FromDate || row.fromDate || '';
        const toDate = row.ToDate || row.toDate || '';
        const totalHours = row.TotalHours || row.TotalHoursWorked || row.Total_Hours || row.totalHours || '0:00';
        const employee = row.EmployeeName || row.Employee_Name || row.UserName || row.userName || '';
        const status = row.Status || row.status || 'Submitted';
        const nextApproval = row.NextApproval || row.nextApproval || '-';
        const firstLine = Array.isArray(row.TimesheetLines) && row.TimesheetLines.length > 0 ? row.TimesheetLines[0] : null;
        return {
          id: row.HeaderUuid || row.HeaderUUID || row.UUID || row.Id || row.id || idx + 1,
          headerUuid: row.HeaderUuid || row.HeaderUUID || row.UUID || row.Id || row.id || null,
          srNo: String(idx + 1).padStart(3, '0'),
          employeeName: employee || `Timesheet #${idx + 1}`,
          totalHoursWorked: String(totalHours),
          fromDate: String(fromDate || ''),
          toDate: String(toDate || ''),
          status: status,
          nextApproval: String(nextApproval),
          projectDetails: {
            project: firstLine?.Project || firstLine?.ProjectName || '-',
            task: firstLine?.Task || firstLine?.TaskName || '-',
            date: firstLine?.Date || '-',
            totalTime: firstLine?.TotalTime || String(totalHours),
            description: firstLine?.Description || '-',
          },
          timesheetLines: Array.isArray(row.TimesheetLines) ? row.TimesheetLines.map(l => ({
            ProjectName: l.Project || l.ProjectName,
            TaskName: l.Task || l.TaskName,
            Date: l.Date,
            TotalTime: l.TotalTime,
            Description: l.Description,
          })) : [],
        };
      });
      setSubmittedData(mapped);
      const total = (typeof container?.recordsTotal === 'number' && container.recordsTotal)
        || (typeof container?.recordsFiltered === 'number' && container.recordsFiltered)
        || mapped.length;
      setTotalSubmittedRecords(total);
    } catch (e) {
      console.log('Error loading submitted/pending timesheets:', e?.message);
    } finally {
      setIsLoadingSubmitted(false);
    }
  };

  // Auto-load when switching to Approved tab or changing page size
  useEffect(() => {
    if (activeTab === 'approved') {
      const start = currentPage * pageSize;
      loadApproved({ start, length: pageSize, searchValue: searchTerm });
    } else if (activeTab === 'submitted') {
      const start = currentPage * pageSize;
      loadSubmittedPending({ start, length: pageSize });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, pageSize, currentPage]);

  const totalPages = Math.ceil((activeTab === 'approved' ? totalApprovedRecords : totalSubmittedRecords) / pageSize) || 0;
  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    const items = [];
    const current = currentPage + 1; // 1-based
    const last = totalPages;

    items.push('prev');

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

    pages = Array.from(new Set(pages)).sort((a, b) => a - b);
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

  const handlePageChange = (page) => {
    const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
    setCurrentPage(clamped);
  };

  const handleItemsPerPageChange = (size) => {
    setPageSize(size);
    setCurrentPage(0);
    if (activeTab === 'approved') {
      loadApproved({ start: 0, length: size, searchValue: searchTerm });
    } else if (activeTab === 'submitted') {
      loadSubmittedPending({ start: 0, length: size });
    }
  };

  // Full-screen loader for Approved tab initial load
  if (activeTab === 'approved' && isLoadingApproved && approvedData.length === 0) {
    return (
      <View style={styles.safeArea}>
        <AppHeader
          title="Manage My Worklist"
          onLeftPress={() => navigation.goBack()}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }

  // Full-screen loader for Submitted tab initial load
  if (activeTab === 'submitted' && isLoadingSubmitted && submittedData.length === 0) {
    return (
      <View style={styles.safeArea}>
        <AppHeader
          title="Manage My Worklist"
          onLeftPress={() => navigation.goBack()}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <AppHeader
        title="Manage My Worklist"
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />
      <View style={styles.container}>
        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'submitted' && styles.activeTab]}
            onPress={() => handleTabSwitch('submitted')}
          >
            <Text style={[styles.tabText, activeTab === 'submitted' && styles.activeTabText]}>
              Submitted & Pending Timesheet
            </Text>
            {activeTab === 'submitted' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'approved' && styles.activeTab]}
            onPress={() => handleTabSwitch('approved')}
          >
            <Text style={[styles.tabText, activeTab === 'approved' && styles.activeTabText]}>
              Approved Timesheet
            </Text>
            {activeTab === 'approved' && <View style={styles.tabUnderline} />}
          </TouchableOpacity>
        </View>

        {/* Filter and Search Section */}
        <View style={styles.filterSection}>
          <View style={styles.row}>
            <View style={styles.half}>
              <Dropdown
                placeholder="Project Name"
                value={selectedProject?.name}
                options={projectOptions}
                getLabel={(p) => p.name}
                getKey={(p) => p.id}
                hint="Project Name"
                onSelect={handleSelectProject}
              />
            </View>
            <View style={styles.half}>
              <Dropdown
                placeholder="Project Task"
                value={selectedTask}
                options={availableTasks}
                getLabel={(t) => t}
                getKey={(t, i) => `${t}-${i}`}
                hint="Project Task"
                disabled={!selectedProject}
                onSelect={handleSelectTask}
              />
            </View>
          </View>

          <View style={styles.searchRow}>
            <Text style={styles.showText}>Show</Text>
            <Dropdown
              placeholder={String(pageSize)}
              value={String(pageSize)}
              options={pageSizes}
              getLabel={(n) => String(n)}
              getKey={(n) => String(n)}
              hideSearch
              inputBoxStyle={{ paddingHorizontal: wp(3.2) }}
              style={{ width: wp(14), marginBottom: hp(1.1) }}
              onSelect={handleItemsPerPageChange}
            />

            <View style={styles.searchInputContainer}>
              <Icon name="search" size={rf(3.8)} color="#8e8e93" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search"
                placeholderTextColor="#8e8e93"
                returnKeyType="search"
                value={searchTerm}
                onChangeText={setSearchTerm}
                onSubmitEditing={() => {
                  if (activeTab === 'approved') {
                    loadApproved({ start: 0, length: pageSize, searchValue: searchTerm });
                  }
                }}
              />
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.searchButton}
              onPress={() => {
                if (activeTab === 'approved') {
                  setCurrentPage(0);
                  loadApproved({ start: 0, length: pageSize, searchValue: searchTerm });
                }
              }}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {(activeTab === 'approved' ? filteredTimesheets : filteredTimesheets).map(timesheet => (
            <TimesheetCard
              key={timesheet.id}
              timesheet={timesheet}
              onActionPress={handleActionPress}
              getStatusColor={getStatusColor}
              getStatusBgColor={getStatusBgColor}
              isApprovedTab={activeTab === 'approved'}
              expanded={expandedId === timesheet.id}
              onToggle={() => setExpandedId(expandedId === timesheet.id ? null : timesheet.id)}
            />
          ))}

          {activeTab === 'approved' && !isLoadingApproved && approvedData.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No timesheet records found.</Text>
            </View>
          )}

          {activeTab === 'submitted' && !isLoadingSubmitted && currentData.length === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No timesheet records found.</Text>
            </View>
          )}
        </ScrollView>

        {/* Inline overlay loader while fetching Approved tab data (e.g., on Next/Prev) */}
        {activeTab === 'approved' && isLoadingApproved && (
          <View style={styles.loadingOverlay}>
            <Loader size="small" style={{ backgroundColor: 'transparent' }} />
          </View>
        )}
        {activeTab === 'submitted' && isLoadingSubmitted && (
          <View style={styles.loadingOverlay}>
            <Loader size="small" style={{ backgroundColor: 'transparent' }} />
          </View>
        )}

        {(() => {
          const totalRecords = activeTab === 'approved' ? totalApprovedRecords : totalSubmittedRecords;
          const isLoadingAny = activeTab === 'approved' ? isLoadingApproved : isLoadingSubmitted;
          if (totalRecords <= pageSize) return null;
          return (
            <View style={styles.paginationContainerTop}>
              <Text style={styles.pageInfo}>
                Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRecords)} of {totalRecords} entries
              </Text>
              <View style={styles.pageNavigation}>
                {pageItems.map((it, idx) => {
                  if (it === 'prev') {
                    const disabled = isLoadingAny || currentPage === 0;
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
                    const disabled = isLoadingAny || currentPage >= totalPages - 1;
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
                      disabled={isLoadingAny}
                    >
                      <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{pageNum}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* View Details Bottom Sheet */}
        <BottomSheetModal
          ref={viewSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(viewSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={styles.sheetContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Time Sheet</Text>
              <TouchableOpacity onPress={() => closeSheet(viewSheetRef)} style={styles.closeButton}>
                <Icon name="close" size={rf(5)} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedTimesheet && (
              <View style={styles.timesheetDetails}>
                <ScrollView style={styles.timesheetList} showsVerticalScrollIndicator={false}>
                  {(selectedTimesheet.timesheetLines || []).map((line, idx) => (
                    <View key={`${idx}-${line?.Date || 'line'}`} style={styles.timesheetItem}>
                      <Text style={styles.timesheetTitle}>Entry #{idx + 1}</Text>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Project:</Text>
                        <Text style={styles.detailValue}>{line?.ProjectName || '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Task:</Text>
                        <Text style={styles.detailValue}>{line?.TaskName || '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Date:</Text>
                        <Text style={styles.detailValue}>{line?.Date || '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Total Time:</Text>
                        <Text style={styles.detailValue}>{line?.TotalTime || '-'}</Text>
                      </View>
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Description:</Text>
                        <Text style={styles.detailValue}>{line?.Description || '-'}</Text>
                      </View>
                      <View style={styles.itemDivider} />
                    </View>
                  ))}
                  {(!selectedTimesheet.timesheetLines || selectedTimesheet.timesheetLines.length === 0) && (
                    <View style={styles.emptyBox}>
                      <Text style={styles.emptyText}>No timesheet entries found.</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.actionButtonsContainer}>
                <TouchableOpacity style={styles.closeButtonStyle} onPress={handleView}>
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
            )}
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

            <ScrollView style={styles.timesheetList} showsVerticalScrollIndicator={false}>
              {(selectedTimesheet?.approvalDetails || []).map((detail, idx) => (
                <View key={`${idx}-${detail?.ActionDate || detail?.actionDate || 'row'}`} style={styles.timesheetItem}>
                  <Text style={styles.timesheetTitle}>Approval #{idx + 1}</Text>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Action Date:</Text>
                    <Text style={styles.detailValue}>{detail.ActionDate || detail.actionDate || '-'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Entered By:</Text>
                    <Text style={styles.detailValue}>{detail.EnteredBy || detail.enteredBy || '-'}</Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <Text style={[styles.statusBadge, {
                      color: '#fff',
                      backgroundColor: '#10B981'
                    }]}>
                      {detail.Status || detail.status || 'Approved'}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Action Taken By:</Text>
                    <Text style={styles.detailValue}>{detail.ActionTakenBy || detail.actionTakenBy || '-'}</Text>
                  </View>

                  <View style={styles.itemDivider} />
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.closeButtonStyle} onPress={handleApprovalDetails}>
              <Text style={styles.closeButtonText}>Close</Text>
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
    backgroundColor: COLORS.bg,
    // paddingTop: safeAreaTop,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  tabContainer: {
    flexDirection: 'row',
    //marginTop: hp(0),
    marginBottom: hp(2),
    backgroundColor: COLORS.bgMuted,
    borderRadius: wp(2),
    padding: wp(1),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.5),
    position: 'relative',
  },
  activeTab: {
    backgroundColor: COLORS.bg,
    borderRadius: wp(1.5),
  },
  tabText: {
    fontSize: rf(3.4),
    fontWeight: '600',
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    textAlign: 'center',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    borderRadius: 1,
  },
  filterSection: {
    marginBottom: hp(2),
  },
  row: {
    flexDirection: 'row',
    gap: wp(3),
  },
  half: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: '#e5e7eb',
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    position: 'relative',
    zIndex: 1000,
    elevation: 2,
    marginHorizontal: wp(-3.8),
  },
  showText: {
    fontSize: rf(3.2),
    color: COLORS.text,
    marginRight: wp(2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    marginHorizontal: wp(2),
    //paddingVertical: hp(0.8),
    height: hp(5.3),
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(1.5),
    fontSize: rf(4),
    color: COLORS.text,
    height: hp(6),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
  },
  searchButtonText: {
    color: '#fff',
    fontSize: rf(3.2),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  listContent: {
    paddingBottom: hp(4),
  },
  // Opportunity-style card
  tsCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginTop: hp(2),
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
  },
  tsTitle: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
    maxWidth: wp(50),
  },
  tsHeaderRight: {
    ...layout.rowCenter,
    gap: SPACING.sm,
  },
  tsHours: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
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
  },
  tsActionsRowPrimary: {
    ...layout.rowCenter,
    justifyContent: 'flex-start',
    gap: wp(6),
    marginTop: hp(0.8),
  },
  sectionTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: COLORS.text,
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
    color: COLORS.textMuted,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  fieldValue: {
    fontSize: rf(3.8),
    color: COLORS.text,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
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
  // Timesheet pill buttons (match `TimesheetItem`)
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
    textAlign: 'center'
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: '#fb923c',
    marginHorizontal: wp(1),
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondaryText: {
    color: '#fb923c',
    fontSize: rf(3),
    fontWeight: '800',
    textAlign: 'center'
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  badge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '600',
    padding: 1
  },
  paginationContainerTop: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
  },
  pageButtonTextual: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    backgroundColor: COLORS.bg,
  },
  pageButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  pageText: {
    fontSize: rf(3.5),
    color: COLORS.primary,
    fontWeight: '600',
  },
  pageTextDisabled: {
    color: COLORS.textMuted,
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
    borderColor: COLORS.border,
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
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
    color: COLORS.textLight,
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
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(6),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  sheetBackground: {
    backgroundColor: COLORS.bg,
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
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  closeButton: {
    padding: wp(1),
  },
  timesheetDetails: {
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
    color: COLORS.textMuted,
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  detailValue: {
    fontSize: rf(3.4),
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
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
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  disabledButton: {
    opacity: 0.6,
  },
  approvalDetails: {
    marginBottom: hp(2),
  },
  timesheetList: {
    maxHeight: hp(35),
  },
  timesheetItem: {
    marginBottom: hp(2),
    paddingBottom: hp(1),
  },
  timesheetTitle: {
    fontSize: rf(3.8),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: hp(1),
  },
});

export default ManageMyWorklist;
