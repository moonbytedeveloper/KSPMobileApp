import React, { useContext, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { TabContext } from '../../navigation/BottomTabs/TabContext';
import TimesheetItem from '../../components/common/TimesheetItem';
import AppHeader from '../../components/common/AppHeader';
import { DrawerActions, useFocusEffect } from '@react-navigation/native';
import BottomSheetConfirm from '../../components/common/BottomSheetConfirm';
import CommonBottomSheet from '../../components/common/CommonBottomSheet';
import Dropdown from '../../components/common/Dropdown';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { COLORS, RADIUS, TYPOGRAPHY, SPACING } from '../styles/styles';
import { ScrollView } from 'react-native-gesture-handler';
import { getManageTimesheet, fetchUserProjects, fetchUserProjectTasks, addTimesheetLine, deleteTimesheetLine, submitTimesheetLine, transferTimesheetTasks, checkAddTimesheetEligibility } from '../../api/authServices';
import { useUser } from '../../contexts/UserContext';
import Loader from '../../components/common/Loader';
const parseHhMm = (hhmm) => {
  const [hh, mm] = (hhmm || '0:0').split(':').map((p) => parseInt(p, 10) || 0);
  return { hh, mm };
};

const formatHhMm = (totalMinutes) => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
};

// Normalize arbitrary time input to strict 24h HH:MM (00-23, 00-59)
const normalizeToHhMm = (value) => {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;
  // Accept formats like H, HH, H:M, HH:MM
  let hh = 0, mm = 0;
  if (v.includes(':')) {
    const [hStr, mStr] = v.split(':');
    if (hStr === undefined || mStr === undefined) return null;
    if (!/^\d{1,2}$/.test(hStr) || !/^\d{1,2}$/.test(mStr)) return null;
    hh = parseInt(hStr, 10);
    mm = parseInt(mStr, 10);
  } else if (/^\d{1,2}$/.test(v)) {
    // Plain hour like "2" or "08" -> HH:00
    hh = parseInt(v, 10);
    mm = 0;
  } else {
    return null;
  }
  if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
};

// Date helpers: UI shows dd-MMM-yyyy, API payloads remain yyyy-mm-dd
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const parseDateFlexible = (val) => {
  if (!val) return null;
  if (val instanceof Date && !isNaN(val.getTime())) return val;
  try {
    if (typeof val === 'string') {
      const s = val.trim();
      // dd-MMM-yyyy (e.g., 01-Nov-2025)
      const m1 = s.match(/^([0-3]?\d)-([A-Za-z]{3})-(\d{4})$/);
      if (m1) {
        const day = parseInt(m1[1], 10);
        const monIdx = MONTHS_SHORT.map(x => x.toLowerCase()).indexOf(m1[2].toLowerCase());
        const year = parseInt(m1[3], 10);
        if (monIdx >= 0) return new Date(year, monIdx, day);
      }
      // yyyy-mm-dd
      const m2 = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (m2) {
        const year = parseInt(m2[1], 10);
        const monIdx = parseInt(m2[2], 10) - 1;
        const day = parseInt(m2[3], 10);
        return new Date(year, monIdx, day);
      }
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch (_) { return null; }
};

// UI display format (dd-MMM-yyyy)
const formatUiDate = (date) => {
  const d = parseDateFlexible(date);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_SHORT[d.getMonth()];
  const yy = d.getFullYear();
  return `${dd}-${mon}-${yy}`;
};

// API format (dd-MMM-yyyy) - e.g., 30-Nov-2025
const formatDateApi = (date) => {
  const d = parseDateFlexible(date);
  if (!d) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mon = MONTHS_SHORT[d.getMonth()];
  const yy = d.getFullYear();
  return `${dd}-${mon}-${yy}`;
};

const TimesheetScreen = ({ navigation }) => {
  const { setActiveIndex } = useContext(TabContext);
  const { userData } = useUser();
  const [activeId, setActiveId] = useState(null);
  const [data, setData] = useState([]);
  const [name, setName] = useState('');
  const [fromDate, setFromDate] = useState('From Date');
  const [toDate, setToDate] = useState('To Date');
  const [status, setStatus] = useState('Pending');
  const [fromDateValue, setFromDateValue] = useState(new Date());
  const [toDateValue, setToDateValue] = useState(new Date());
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timesheetData, setTimesheetData] = useState(null);

  // Selection state for transfer functionality
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]); // Changed to array for multiple selection
  const [transferDate, setTransferDate] = useState(null);
  const [transferDateValue, setTransferDateValue] = useState(new Date());
  const [openTransferDate, setOpenTransferDate] = useState(false);

  // Helper function to check if a date is Monday
  const isMonday = (date) => {
    return date.getDay() === 1; // 1 = Monday
  };

  // Helper function to get Sunday of the same week
  const getSundayOfWeek = (mondayDate) => {
    const sunday = new Date(mondayDate);
    sunday.setDate(mondayDate.getDate() + 6); // Add 6 days to get Sunday
    return sunday;
  };

  // Transform API data to match UI structure
  const transformTimesheetData = (apiData) => {
    if (!apiData || !apiData.Lines) return [];

    // Group lines by project and task
    const groupedData = {};
    apiData.Lines.forEach(line => {
      console.log(line,'line')
      const key = `${line.Project_UUID}-${line.Task_UUID}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          id: key,
          // taskName: `${line.ProjectTitle} • ${line.TaskTitle}`,
          projectName: line.ProjectTitle,
          projectTask: line.TaskTitle,
          fromDate: apiData.From_Date ? formatUiDate(parseDateFlexible(apiData.From_Date) || apiData.From_Date) : apiData.From_Date,
          toDate: apiData.To_Date ? formatUiDate(parseDateFlexible(apiData.To_Date) || apiData.To_Date) : apiData.To_Date,
          status: apiData.Timesheet_Status,
          totalHours: '00:00',
          lines: [],
          // Preserve UUIDs for posting
          projectUuid: line.Project_UUID || line.ProjectUuid || line.ProjectUUID,
          taskUuid: line.Task_UUID || line.TaskUuid || line.TaskUUID,
        };
      }
      groupedData[key].lines.push(line);
    });

    // Calculate total hours for each group
    Object.values(groupedData).forEach(group => {
      const totalMinutes = group.lines.reduce((acc, line) => {
        const [hh, mm] = (line.Hours || '0:0').split(':').map(p => parseInt(p, 10) || 0);
        return acc + hh * 60 + mm;
      }, 0);
      group.totalHours = formatHhMm(totalMinutes);

      // Log line data with hours for debugging
      console.log('📊 [TimesheetScreen] Line Data for Task:', group.taskName, {
        totalLines: group.lines.length,
        totalHours: group.totalHours,
        lineDetails: group.lines.map(line => ({
          date: line.Date_of_Task || line.Date,
          hours: line.Hours,
          remark: line.Remark || 'No remark',
          projectTitle: line.ProjectTitle,
          taskTitle: line.TaskTitle,
          dayOfWeek: line.Day_of_Week
        }))
      });
    });

    return Object.values(groupedData);
  };

  // Fetch timesheet data
  const fetchTimesheetData = async (fromDateParam, toDateParam) => {
    // Prevent multiple simultaneous calls
    if (isFetchingRef.current) {
      console.log('🔧 [TimesheetScreen] Already fetching data, skipping...');
      return;
    }

    try {
      console.log('🔧 [TimesheetScreen] Starting fetchTimesheetData:', { fromDateParam, toDateParam, isLoading });
      isFetchingRef.current = true;
      setIsLoading(true);
      // Don't clear data immediately to prevent flickering
      // setData([]);
      // setTimesheetData(null);

      // Log the request parameters including dates
      console.log('🚀 [TimesheetScreen] API Request Parameters:', {
        frmD: fromDateParam,
        toD: toDateParam,
        fromDateType: typeof fromDateParam,
        toDateType: typeof toDateParam
      });

      console.log('🔧 [TimesheetScreen] Making API call to getManageTimesheet');
      // Convert display format (dd-MMM-yyyy) to API format (yyyy-mm-dd) if dates are provided
      const apiFromDate = fromDateParam && fromDateParam !== 'From Date' 
        ? formatDateApi(parseDateFlexible(fromDateParam) || fromDateParam)
        : fromDateParam;
      const apiToDate = toDateParam && toDateParam !== 'To Date'
        ? formatDateApi(parseDateFlexible(toDateParam) || toDateParam)
        : toDateParam;
      
      const response = await getManageTimesheet({
        frmD: apiFromDate,
        toD: apiToDate
      });
      console.log('🔧 [TimesheetScreen] API response received:', { success: response.Success, hasData: !!response.Data });

      // Log raw line data structure
      if (response.Data?.Lines && response.Data.Lines.length > 0) {
        console.log('📋 [TimesheetScreen] Raw Line Data Structure:', {
          sampleLine: response.Data.Lines[0],
          allLineKeys: response.Data.Lines[0] ? Object.keys(response.Data.Lines[0]) : [],
          linesWithHours: response.Data.Lines.map(line => ({
            date: line.Date_of_Task || line.Date,
            hours: line.Hours,
            projectTitle: line.ProjectTitle,
            taskTitle: line.TaskTitle,
            remark: line.Remark,
            dayOfWeek: line.Day_of_Week
          }))
        });
      }

      if (response.Success && response.Data) {
        console.log(response, '85258')
        setTimesheetData(response.Data);
        setName(response.Data.EmpName || '');
        setStatus(response.Data.Timesheet_Status || 'Pending');

        // Log leave data for debugging
        if (response.Data.LeaveData && response.Data.LeaveData.length > 0) {
          console.log('🏖️ [TimesheetScreen] Leave data received:', {
            leaveCount: response.Data.LeaveData.length,
            leaveDates: response.Data.LeaveData.map(leave => ({
              date: leave.LeaveDate,
              weekday: leave.WeekdayName
            }))
          });
        }

        // Set dates if provided (only if they're different to prevent infinite loops)
        // Parse and format dates from API for display (dd-MMM-yyyy)
        if (response.Data.From_Date && response.Data.From_Date !== fromDate) {
          const parsedFromDate = parseDateFlexible(response.Data.From_Date);
          if (parsedFromDate) {
            setFromDate(formatUiDate(parsedFromDate));
            setFromDateValue(parsedFromDate);
          }
        }
        if (response.Data.To_Date && response.Data.To_Date !== toDate) {
          const parsedToDate = parseDateFlexible(response.Data.To_Date);
          if (parsedToDate) {
            setToDate(formatUiDate(parsedToDate));
            setToDateValue(parsedToDate);
          }
        }

        // Transform and set data
        const transformedData = transformTimesheetData(response.Data);
        setData(transformedData);
      } else {
        Alert.alert('Error', response.Message || 'Failed to fetch timesheet data');
      }
    } catch (error) {
      console.error('Error fetching timesheet data:', error);
      Alert.alert('Error', 'Failed to fetch timesheet data. Please try again.');
    } finally {
      console.log('🔧 [TimesheetScreen] fetchTimesheetData completed, setting loading to false');
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  };

  // Delete confirmation bottom sheet
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState(null);

  // Add-row Project/Task picker bottom sheet
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null); // { id, name, tasks }
  const [selectedTask, setSelectedTask] = useState(null); // string
  const snapPoints = useMemo(() => [hp(40), hp(75)], []);
  const [currentSnapIndex, setCurrentSnapIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Description bottom sheet state
  const [descVisible, setDescVisible] = useState(false);
  const [descText, setDescText] = useState('');
  const [descContext, setDescContext] = useState(null); // { itemId, dateKey, timeText }

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  // Eligibility state for timesheet operations
  const [eligibilityVisible, setEligibilityVisible] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);

  const availableTasks = useMemo(() => {
    if (!selectedProject) return [];
    return tasks;
  }, [selectedProject, tasks]);

  // useEffect removed - CommonBottomSheet handles visibility internally

  // Load projects for project/task pickers
  useEffect(() => {
    (async () => {
      try {
        const projResp = await fetchUserProjects();
        const projectsRaw = Array.isArray(projResp?.Data?.Projects) ? projResp.Data.Projects : [];
        const projectOptions = projectsRaw
          .filter((p) => p && p.Project_Title)
          .map((p) => ({ id: p.UUID || p.Uuid || p.id, name: String(p.Project_Title) }));
        setProjects(projectOptions);
      } catch (_e) {
        setProjects([]);
      }
    })();
  }, []);

  // Fetch data on component focus for fresh data every time
  useFocusEffect(
    React.useCallback(() => {
      // Only fetch if we don't have data or if dates are not set
      if (data.length === 0 || fromDate === 'From Date' || toDate === 'To Date') {
        // Use selected dates if available, otherwise fetch without parameters
        if (fromDate !== 'From Date' && toDate !== 'To Date') {
          console.log('🔧 [TimesheetScreen] useFocusEffect: Fetching with selected dates:', { fromDate, toDate });
          fetchTimesheetData(fromDate, toDate);
        } else {
          console.log('🔧 [TimesheetScreen] useFocusEffect: Fetching without date parameters');
          fetchTimesheetData();
        }
      }
      return () => { };
    }, [data.length, fromDate, toDate])
  );

  // Fetch data when dates change
  useEffect(() => {
    if (fromDate !== 'From Date' && toDate !== 'To Date' && !isLoading) {
      console.log('🔧 [TimesheetScreen] Date changed, fetching data:', { fromDate, toDate });

      // Add a small delay to prevent rapid successive calls when both dates are set simultaneously
      const timeoutId = setTimeout(() => {
        fetchTimesheetData(fromDate, toDate);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [fromDate, toDate]);

  const totalHours = useMemo(() => {
    // Use API data if available, otherwise calculate from local data
    if (timesheetData && timesheetData.Total_Hours) {
      return timesheetData.Total_Hours;
    }

    if (!data || data.length === 0) {
      return '00:00';
    }

    const minutes = data.reduce((acc, item) => {
      const { hh, mm } = parseHhMm(item.totalHours);
      return acc + hh * 60 + mm;
    }, 0);
    return formatHhMm(minutes);
  }, [data, timesheetData]);

  const toggleItem = (id) => {
    setActiveId((prev) => (prev === id ? null : id));
  };

  const handleView = (item) => {
    console.log('View timesheet', item.id);
  };

  const handleEdit = (item) => {
    console.log('Edit timesheet', item.id);
  };

  const handleDelete = (id) => {
    setPendingDeleteId(id);
    setConfirmVisible(true);
  };

  const confirmDelete = async () => {
    try {
      if (!pendingDeleteId) {
        console.log('🔧 [TimesheetScreen] No pending delete ID, closing confirmation');
        setConfirmVisible(false);
        setPendingDeleteId(null);
        return;
      }

      console.log('🔧 [TimesheetScreen] Starting delete operation for ID:', pendingDeleteId);
      const currentItem = data.find((t) => t.id === pendingDeleteId);
      if (!currentItem) {
        console.log('🔧 [TimesheetScreen] Item not found, closing confirmation');
        setConfirmVisible(false);
        setPendingDeleteId(null);
        return;
      }

      const headerUuid = timesheetData?.HeaderUUID || timesheetData?.UUID || '';
      const projectUuid = currentItem?.projectUuid || currentItem?.lines?.[0]?.Project_UUID || '';
      const taskUuid = currentItem?.taskUuid || currentItem?.lines?.[0]?.Task_UUID || '';

      if (!headerUuid || !projectUuid || !taskUuid) {
        Alert.alert('Missing data', 'Unable to find required identifiers to delete.');
        setConfirmVisible(false);
        setPendingDeleteId(null);
        return;
      }

      console.log('🔧 [TimesheetScreen] Calling delete API');
      await deleteTimesheetLine({ headerUuid, projectUuid, taskUuid });

      console.log('🔧 [TimesheetScreen] Delete successful, updating local state');
      // Remove locally and collapse
      setData((prev) => prev.filter((t) => t.id !== pendingDeleteId));
      setActiveId((prev) => (prev === pendingDeleteId ? null : prev));

      console.log('🔧 [TimesheetScreen] Closing confirmation sheet');
      setConfirmVisible(false);
      setPendingDeleteId(null);

      // Refetch fresh data in background without blocking UI
      setTimeout(async () => {
        try {
          console.log('🔧 [TimesheetScreen] Refreshing data in background');
          await fetchTimesheetData(fromDate !== 'From Date' ? fromDate : undefined, toDate !== 'To Date' ? toDate : undefined);
        } catch (error) {
          console.error('🔧 [TimesheetScreen] Error refreshing data:', error);
        }
      }, 100);

    } catch (e) {
      console.error('🔧 [TimesheetScreen] Delete error:', e);
      const msg = e?.response?.data?.Message || e?.message || 'Failed to delete timesheet entry.';
      Alert.alert('Error', String(msg));
      setConfirmVisible(false);
      setPendingDeleteId(null);
    }
  };

  const closeConfirm = () => {
    console.log('🔧 [TimesheetScreen] Closing confirmation sheet via cancel');
    setConfirmVisible(false);
    setPendingDeleteId(null);
  };

  // Selection and transfer functions
  const selectItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      // If clicking a selected item, deselect it
      setSelectedItems(prev => prev.filter(id => id !== itemId));
      // If no items left, exit selection mode
      if (selectedItems.length === 1) {
        setIsSelectionMode(false);
      }
    } else {
      // Add the new item to selection
      setSelectedItems(prev => [...prev, itemId]);
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
    setIsSelectionMode(false);
  };

  const openTransferDatePicker = () => {
    setOpenTransferDate(true);
  };

  const handleTransfer = async () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Selection', 'Please select timesheet lines to transfer.');
      return;
    }

    if (!transferDate) {
      Alert.alert('No Date', 'Please select a target date for transfer.');
      return;
    }

    try {
      setIsLoading(true);
      const headerUuid = timesheetData?.HeaderUUID || timesheetData?.UUID || '';

      if (!headerUuid) {
        Alert.alert('Missing data', 'Timesheet header is missing. Please reload the screen.');
        return;
      }

      // Calculate target week dates (Monday to Sunday)
      const targetMonday = new Date(transferDateValue);
      const targetSunday = getSundayOfWeek(targetMonday);
      const fromDateStr = formatDateApi(targetMonday);
      const toDateStr = formatDateApi(targetSunday);

      // Get all selected items
      const selectedItemsData = data.filter(t => selectedItems.includes(t.id));
      if (selectedItemsData.length === 0) {
        Alert.alert('Error', 'Selected items not found.');
        return;
      }

      // Collect project:task UUIDs from selected items
      const projectTaskUuids = [];
      selectedItemsData.forEach((item) => {
        const projectUuid = item?.projectUuid || item?.lines?.[0]?.Project_UUID || item?.lines?.[0]?.ProjectUuid || item?.lines?.[0]?.ProjectUUID;
        const taskUuid = item?.taskUuid || item?.lines?.[0]?.Task_UUID || item?.lines?.[0]?.TaskUuid || item?.lines?.[0]?.TaskUUID;

        if (!projectUuid || !taskUuid) {
          throw new Error(`Project or Task UUID not found for item: `);
        }

        projectTaskUuids.push(`${projectUuid}:${taskUuid}`);
      });

      // Join all project:task UUIDs with commas
      const lineUuidsString = projectTaskUuids.join(',');

      console.log('🔄 [TimesheetScreen] Bulk Transfer Request:', {
        lineUuids: lineUuidsString,
        fromDate: fromDateStr,
        toDate: toDateStr,
        headerUuid,
        selectedCount: selectedItems.length,
        format: 'projectuuid:taskuuid'
      });

      // Transfer all selected items in a single API call
      await transferTimesheetTasks({
        lineUuid: lineUuidsString,
        fromDate: fromDateStr,
        toDate: toDateStr,
        headerUuid
      });

      Alert.alert('Success', `Successfully transferred ${selectedItems.length} timesheet line(s) to the week of ${fromDateStr}.`);

      // Clear selection and refresh data
      clearSelection();
      await fetchTimesheetData(fromDate !== 'From Date' ? fromDate : undefined, toDate !== 'To Date' ? toDate : undefined);

    } catch (error) {
      console.error('Bulk transfer error:', error);
      const msg = error?.response?.data?.Message || error?.message || `Failed to transfer ${selectedItems.length} timesheet line(s).`;
      Alert.alert('Transfer Error', String(msg));
    } finally {
      setIsLoading(false);
    }
  };


  const openFromPicker = () => {
    setOpenFrom(true);
  };

  const openToPicker = () => {
    // Disabled - to date is auto-calculated
    return;
  };

  // Check if add time item is allowed based on timesheet status
  const isAddTimeItemAllowed = status === 'Pending' || status === 'Rejected';

  // Check if submit is allowed based on timesheet status and data
  const isSubmitAllowed = (status === 'Pending' || status === 'Rejected') && data.length > 0 && totalHours !== '00:00';

  const addRow = async () => {
    try {
      console.log('🔧 [TimesheetScreen] Add Time Item button pressed');
      console.log('🔧 [TimesheetScreen] Current status:', status, 'isAddTimeItemAllowed:', isAddTimeItemAllowed);

      if (!isAddTimeItemAllowed) {
        Alert.alert('Not Allowed', 'Cannot add time items when timesheet is submitted.');
        return;
      }

      setIsLoading(true);

      const resp = await checkAddTimesheetEligibility();
      console.log('🔧 [TimesheetScreen] Eligibility check response:', resp);
      const success = resp?.Success === true || resp?.success === true;
      const message = resp?.Message || resp?.message || 'You are not allowed to add timesheet.';
      console.log('🔧 [TimesheetScreen] Eligibility success:', success, 'Message:', message);
      if (success) {
        console.log('🔧 [TimesheetScreen] Setting picker visible to true');
        setPickerVisible(true);
      } else {
        console.log('🔧 [TimesheetScreen] Showing eligibility error:', message);
        setEligibilityMessage(String(message));
        setEligibilityVisible(true);
      }
    } catch (e) {
      console.error('🔧 [TimesheetScreen] Eligibility check error:', e);
      const msg = e?.response?.data?.Message || e?.message || 'Failed to check eligibility.';
      setEligibilityMessage(String(msg));
      setEligibilityVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    if (refreshing || isLoading) return;
    setRefreshing(true);
    try {
      await fetchTimesheetData(fromDate !== 'From Date' ? fromDate : undefined, toDate !== 'To Date' ? toDate : undefined);
    } catch (error) {
      console.error('Error refreshing timesheet data:', error);
      Alert.alert('Error', 'Failed to refresh timesheet data. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveProjectTask = () => {
    console.log('🔧 [TimesheetScreen] handleSaveProjectTask called');
    console.log('🔧 [TimesheetScreen] selectedProject:', selectedProject);
    console.log('🔧 [TimesheetScreen] selectedTask:', selectedTask);

    if (!selectedProject || !selectedTask) {
      console.log('🔧 [TimesheetScreen] Missing project or task, cannot save');
      return; // simple guard
    }

    const next = {
      id: `ts-${Date.now()}`,
      taskName: `${selectedProject.name} • ${selectedTask.name}`,
      projectName: selectedProject.name,
      projectTask: selectedTask.name,
      fromDate: fromDate === 'From Date' ? formatUiDate(fromDateValue) : fromDate,
      toDate: toDate === 'To Date' ? formatUiDate(toDateValue) : toDate,
      status: 'Pending',
      totalHours: '00:00',
      // Attach UUIDs for posting
      projectUuid: selectedProject.id,
      taskUuid: selectedTask.id,
      lines: [],
    };

    console.log('🔧 [TimesheetScreen] Creating new timesheet item:', next);
    setData((prev) => [next, ...prev]);
    setActiveId(next.id);
    setPickerVisible(false);
    setSelectedProject(null);
    setSelectedTask(null);
    console.log('🔧 [TimesheetScreen] Timesheet item added successfully');
  };

  // Full-screen loader while first load is in progress (safe position after all hooks)
  if (isLoading && data.length === 0) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Timesheet"
          onLeftPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              setActiveIndex(0);
            } else {
              setActiveIndex(0);
            }
          }}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }

  const StatusBadge = ({ label = 'Pending' }) => {
    const palette = {
      Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
      Submitted: { bg: COLORS.infoBg, color: COLORS.info, border: COLORS.info },
      Approved: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
      Rejected: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
    };
    const theme = palette[label] || palette.Pending;

    return (
      <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Timesheet"
        onLeftPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            setActiveIndex(0)
          } else {
            setActiveIndex(0)
            // fallback → for BottomTabs (no goBack)
            // or do nothing
          }
        }}
        onRightPress={() => navigation.navigate('Notification')}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Manage Timesheet</Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.leaveButton} onPress={() => navigation.navigate('ApplyLeave')}>
            <Text style={styles.leaveButtonText}>Apply for Leave</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.input}>
          <Icon name="person" size={rf(5.6)} color="#9ca3af" />
          <TextInput value={name} editable={false} style={styles.inputField} />
        </View>

        <View style={styles.row2}>
          <TouchableOpacity activeOpacity={0.8} onPress={openFromPicker} style={styles.picker}>
            <Text style={styles.pickerText}>{fromDate}</Text>
            <Icon name="calendar-today" size={rf(3.2)} color="#9ca3af" />
          </TouchableOpacity>
          <View style={[styles.picker, styles.disabledPicker]}>
            <Text style={[styles.pickerText, styles.disabledPickerText]}>{toDate}</Text>
            <Icon name="calendar-today" size={rf(3.2)} color="#d1d5db" />
          </View>
        </View>

        <View style={styles.row2}>
          <View style={styles.infoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.iconBadge}>
                <Icon name="access-time" size={rf(3)} color="#ef4444" />
              </View>
              <Text style={styles.infoLabel}>Total Hours</Text>
            </View>
            <Text style={styles.infoValue}>{totalHours}</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.iconBadge, { backgroundColor: '#dbeafe' }]}>
                <Icon name="assignment" size={rf(3)} color="#1e40af" />
              </View>
              <Text style={styles.infoLabel}>Timesheet Status</Text>
            </View>
            <View style={styles.statusPill}>
              <StatusBadge label={status} />
            </View>
          </View>
        </View>

        <View style={[styles.sectionHeaderRow, { marginTop: hp(1) }]}>
          <Text style={styles.sectionTitle}>Timesheet</Text>
          <View style={styles.headerActions}>
            {!isSelectionMode ? (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.addRowButton, !isAddTimeItemAllowed && styles.buttonDisabled]}
                  onPress={() => {
                    console.log('🔧 [TimesheetScreen] Add Time Item button onPress triggered');
                    addRow();
                  }}
                  disabled={!isAddTimeItemAllowed}
                >
                  <Text style={[styles.addRowText, !isAddTimeItemAllowed && styles.buttonDisabledText]}>
                    + Add Time Item
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.submitInlineButton, !isSubmitAllowed && styles.buttonDisabled]}
                  onPress={async () => {
                    if (!isSubmitAllowed) {
                      if (status === 'Submitted' || status === 'Approved') {
                        Alert.alert('Not Allowed', 'Cannot submit timesheet when it is already submitted.');
                      } else if (data.length === 0) {
                        Alert.alert('No Data', 'Please add at least one timesheet entry before submitting.');
                      } else if (totalHours === '00:00') {
                        Alert.alert('No Hours', 'Please enter hours for at least one timesheet entry before submitting.');
                      } else {
                        Alert.alert('Not Allowed', 'Cannot submit timesheet at this time.');
                      }
                      return;
                    }

                    try {
                      const headerUuid = timesheetData?.HeaderUUID || timesheetData?.UUID || '';
                      if (!headerUuid) {
                        Alert.alert('Missing data', 'Timesheet header is missing. Please reload the screen.');
                        return;
                      }
                      setIsLoading(true);
                      const resp = await submitTimesheetLine({ headerUuid });
                      const ok = resp?.Success === true || resp?.success === true;
                      if (!ok) {
                        const msg = resp?.Message || resp?.message || 'Failed to submit timesheet.';
                        Alert.alert('Error', String(msg));
                      } else {
                        // Show success message and refresh data to update status
                        Alert.alert(
                          'Success',
                          'Timesheet submitted successfully!',
                          [
                            {
                              text: 'OK',
                              onPress: async () => {
                                // Refresh data to update status from Pending to Submitted
                                console.log('🔧 [TimesheetScreen] Refreshing data after submission');
                                setIsLoading(true);
                                await fetchTimesheetData(fromDate !== 'From Date' ? fromDate : undefined, toDate !== 'To Date' ? toDate : undefined);
                              }
                            }
                          ]
                        );
                      }
                    } catch (e) {
                      const msg = e?.response?.data?.Message || e?.message || 'Failed to submit timesheet.';
                      Alert.alert('Error', String(msg));
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  disabled={!isSubmitAllowed}
                >
                  <Text style={[styles.submitInlineText, !isSubmitAllowed && styles.buttonDisabledText]}>
                    Submit
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.transferButton}
                  onPress={openTransferDatePicker}
                  disabled={selectedItems.length === 0}
                >
                  <Text style={[styles.transferButtonText, { opacity: selectedItems.length === 0 ? 0.5 : 1 }]}>
                    Transfer Selected ({selectedItems.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.cancelButton}
                  onPress={clearSelection}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {data.map((item) => (
          <TimesheetItem
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            onToggle={() => toggleItem(item.id)}
            onView={handleView}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isSelectionMode={isSelectionMode}
            isSelected={selectedItems.includes(item.id)}
            onLongPress={() => {
              if (!isSelectionMode) {
                setIsSelectionMode(true);
              }
              selectItem(item.id);
            }}
            onSelect={() => selectItem(item.id)}
            leaveData={timesheetData?.LeaveData || []}
            timesheetStatus={status}
            onDayHoursFilled={(itemId, dateKey, timeText) => {
              // Find the existing remark for this date
              const item = data.find(item => item.id === itemId);
              const existingRemark = item?.lines?.find(line => {
                const lineDate = line.Date_of_Task || line.Date;
                if (!lineDate) return false;
                const dateStr = lineDate.includes('T') ? lineDate.split('T')[0] : lineDate;
                return dateStr === dateKey;
              })?.Remark || '';

              setDescContext({ itemId, dateKey, timeText });
              setDescText(existingRemark);
              setDescVisible(true);
            }}
          />
        ))}

        {data.length === 0 && !isLoading && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No timesheets found.</Text>
          </View>
        )}
      </ScrollView>

      {/* Project/Task Picker Bottom Sheet */}
      <CommonBottomSheet
        visible={pickerVisible}
        onDismiss={() => {
          console.log('🔧 [TimesheetScreen] Bottom sheet dismissed');
          setPickerVisible(false);
          setIsDropdownOpen(false);
        }}
        snapPoints={isDropdownOpen ? [hp(50), hp(75)] : snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        backdropOpacity={0.45}
        backdropPressBehavior="close"
        handleIndicatorStyle={styles.bsHandle}
        backgroundStyle={styles.bsBackground}
        contentContainerStyle={[styles.bsContent, isDropdownOpen && { paddingBottom: hp(1) }]}
      >
        <View style={styles.bsHeaderRow}>
          <Text style={styles.bsTitle}>Select Project and Task Detail</Text>
          <TouchableOpacity onPress={() => setPickerVisible(false)} activeOpacity={0.8}>
            <Icon name="close" size={rf(4)} color="#111827" />
          </TouchableOpacity>
        </View>

        <Dropdown
          placeholder="Select Project"
          value={selectedProject?.name}
          options={projects}
          getLabel={(p) => p.name}
          getKey={(p) => p.id}
          hint="Select Project"
          onSelect={(p) => {
            setSelectedProject(p);
            setSelectedTask(null);
            (async () => {
              try {
                const resp = await fetchUserProjectTasks({ projectUuid: p?.id });
                const raw = Array.isArray(resp?.Data) ? resp.Data : [];
                const taskOptions = raw
                  .filter((t) => t && t.Task_Title)
                  .map((t) => ({ id: t.Task_UUID || t.TaskUuid || t.UUID || t.id, name: String(t.Task_Title) }));
                setTasks(taskOptions);
              } catch (_e) {
                setTasks([]);
              } finally {
                // Snap to index handled by CommonBottomSheet
              }
            })();
          }}
          onOpenChange={(open) => {
            console.log('🔧 [TimesheetScreen] Project dropdown open change:', open);
            setIsDropdownOpen(open);
            if (open) {
              setCurrentSnapIndex(1);
            } else {
              setCurrentSnapIndex(0);
            }
          }}
        />

        <Dropdown
          placeholder="Select Task"
          value={selectedTask?.name}
          options={availableTasks}
          getLabel={(t) => t.name}
          getKey={(t) => t.id}
          hint="Select Task"
          disabled={!selectedProject}
          onSelect={(t) => {
            setSelectedTask(t);
          }}
          onOpenChange={(open) => {
            console.log('🔧 [TimesheetScreen] Task dropdown open change:', open);
            setIsDropdownOpen(open);
            if (open) {
              setCurrentSnapIndex(1);
            } else {
              setCurrentSnapIndex(0);
            }
          }}
        />

        <View style={{ alignItems: 'flex-end', marginTop: hp(1.2) }}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.bsSaveBtn}
            onPress={handleSaveProjectTask}
          >
            <Text style={styles.bsSaveText}>Save</Text>
          </TouchableOpacity>
        </View>
      </CommonBottomSheet>

      {/* Description Bottom Sheet */}
      <CommonBottomSheet
        visible={descVisible}
        onDismiss={() => {
          // prevent dismissal if empty
          if (descText && descText.trim().length > 0) {
            setDescVisible(false);
            setDescContext(null);
            setDescText('');
          }
        }}
        snapPoints={[hp(40), hp(40)]}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        backdropOpacity={0.6}
        backdropPressBehavior="none"
        keyboardBehavior="extend"
        keyboardBlurBehavior="restore"
        contentContainerStyle={{ paddingTop: hp(1) }}
      >
        <View style={styles.bsHeaderRow}>
          <Text style={styles.bsTitle}>Add Description</Text>
        </View>
        <BottomSheetScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: hp(4) }}>
          {!!descContext && (
            <View style={{ marginBottom: hp(1) }}>
              <Text style={{ color: '#6b7280', fontSize: rf(3.2) }}>
                {`For ${formatUiDate(descContext.dateKey)} • ${descContext.timeText}`}
              </Text>
            </View>
          )}
          <View style={styles.inputDescWrapper}>
            <BottomSheetTextInput
              style={styles.inputDesc}
              placeholder="Write description..."
              placeholderTextColor="#9ca3af"
              value={descText}
              onChangeText={setDescText}
              multiline
              numberOfLines={6}
              scrollEnabled
              textAlignVertical="top"
            />
          </View>
          <View style={{ alignItems: 'flex-end', marginTop: hp(1.2), marginBottom: hp(2.5) }}>
            <TouchableOpacity
              activeOpacity={0.85}
              style={styles.bsSaveBtn}
              onPress={async () => {
                try {
                  // Persist description with the time entry (in-memory augmentation)
                  if (descContext) {
                    const { itemId, dateKey, timeText } = descContext;
                    setData((prev) =>
                      prev.map((it) =>
                        it.id === itemId
                          ? { ...it, descriptions: { ...(it.descriptions || {}), [dateKey]: { time: timeText, description: descText } } }
                          : it
                      )
                    );

                    // Prepare API params
                    const currentItem = data.find((it) => it.id === itemId);
                    const firstLine = currentItem?.lines?.[0];
                    const projectuuid = currentItem?.projectUuid || firstLine?.Project_UUID || firstLine?.ProjectUuid || firstLine?.ProjectUUID || firstLine?.Project;
                    const taskuuid = currentItem?.taskUuid || firstLine?.Task_UUID || firstLine?.TaskUuid || firstLine?.TaskUUID || firstLine?.Task;

                    // Resolve header UUID from top-level timesheet data (backend provides HeaderUUID)
                    const headeruuid = timesheetData?.HeaderUUID || timesheetData?.UUID || timesheetData?.Header_UUID || timesheetData?.TimesheetHeader_UUID || timesheetData?.HeaderUuid || timesheetData?.Timesheet_Header_UUID || '';

                    const specificDate = formatUiDate(parseDateFlexible(dateKey)); // already yyyy-mm-dd
                    const normalized = normalizeToHhMm(timeText);
                    if (!normalized) {
                      Alert.alert('Invalid time', 'Please enter time in 24-hour HH:MM format.');
                      return;
                    }
                    const timeSlots = normalized; // strict HH:MM
                    const description = descText || '';

                    if (!projectuuid || !taskuuid) {
                      Alert.alert('Missing data', 'Project or Task information is missing for this entry.');
                    } else if (!headeruuid) {
                      Alert.alert('Missing data', 'Timesheet header is missing. Please reload the screen.');
                    } else {
                      try { console.log('🕒 [Timesheet] Posting line', { projectuuid, taskuuid, headeruuid, timeSlots, description, specificDate }); } catch (_) { }
                      const resp = await addTimesheetLine({ projectuuid, taskuuid, headeruuid, timeSlots, description, specificDate });
                      const ok = resp?.Success === true || resp?.success === true;
                      if (!ok) {
                        const msg = resp?.Message || resp?.message || 'Failed to save timesheet entry.';
                        Alert.alert('Error', String(msg));
                      } else {
                        // Close the description sheet immediately after successful save
                        setDescVisible(false);
                        setDescContext(null);
                        setDescText('');
                        // Refetch to show fresh data
                        setIsLoading(true);
                        await fetchTimesheetData(fromDate !== 'From Date' ? fromDate : undefined, toDate !== 'To Date' ? toDate : undefined);
                      }
                    }
                  }
                } catch (e) {
                  const msg = e?.response?.data?.Message || e?.message || 'Failed to save timesheet entry.';
                  Alert.alert('Error', String(msg));
                } finally {
                  // No-op: success branch already closed the sheet; keep here for error paths
                }
              }}
              disabled={!(descText && descText.trim().length > 0)}
            >
              <Text style={[styles.bsSaveText, { opacity: descText && descText.trim().length > 0 ? 1 : 0.5 }]}>Save</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetScrollView>
      </CommonBottomSheet>

      <DatePickerBottomSheet
        isVisible={openFrom}
        onClose={() => setOpenFrom(false)}
        selectedDate={fromDateValue}
        onDateSelect={(date) => {
          console.log('🔧 [TimesheetScreen] Date selected:', date);
          setFromDateValue(date);
          setFromDate(formatUiDate(date));

          // Automatically set to date as Sunday of the same week
          const sundayDate = getSundayOfWeek(date);
          setToDateValue(sundayDate);
          setToDate(formatUiDate(sundayDate));

          console.log('🔧 [TimesheetScreen] Dates set:', {
            fromDate: formatUiDate(date),
            toDate: formatUiDate(sundayDate)
          });
        }}
        title="Select Monday (From Date)"
        mondayOnly={true}
      />

      <DatePickerBottomSheet
        isVisible={openTransferDate}
        onClose={() => setOpenTransferDate(false)}
        selectedDate={transferDateValue}
        onDateSelect={(date) => {
          setTransferDateValue(date);
          setTransferDate(formatUiDate(date));
          setOpenTransferDate(false);

          // Show confirmation dialog
          Alert.alert(
            'Confirm Transfer',
            `Transfer ${selectedItems.length} selected timesheet line(s) to the week of ${formatUiDate(date)}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Transfer', onPress: handleTransfer }
            ]
          );
        }}
        title="Select Target Monday (Transfer Date)"
        mondayOnly={true}
      />

      {/* To Date picker is disabled - no longer needed */}

      <BottomSheetConfirm
        visible={confirmVisible}
        title={'Delete Timesheet?'}
        message={'This action cannot be undone.'}
        confirmText={'Delete'}
        cancelText={'Cancel'}
        onConfirm={confirmDelete}
        onCancel={closeConfirm}
        autoCloseOnConfirm={false}
      />

      <BottomSheetConfirm
        visible={eligibilityVisible}
        title={'Cannot Add Timesheet'}
        message={eligibilityMessage || 'You are not allowed to add timesheet.'}
        confirmText={'OK'}
        cancelText={''}
        onConfirm={() => setEligibilityVisible(false)}
        onCancel={() => setEligibilityVisible(false)}
      />

    </View>
  );
};

export default TimesheetScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // paddingTop: safeAreaTop,
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
    padding: 1,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(12), // Extra padding to avoid bottom navigation
  },
  sectionHeaderRow: {
    marginTop: hp(0.5),
    marginBottom: hp(1.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: rf(5),
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  hintText: {
    fontSize: rf(3),
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    marginTop: hp(0.3),
  },
  leaveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: wp(1.6),
    paddingHorizontal: wp(3),
    borderRadius: RADIUS.md,
  },
  leaveButtonText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: rf(3.6),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: wp(2.2),
    marginBottom: hp(1.2),
    height: hp(6.2),
    justifyContent: 'center',
  },
  inputField: {
    fontSize: TYPOGRAPHY.input,
    color: COLORS.text,
    flex: 1,
    paddingVertical: 0,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  row2: {
    flexDirection: 'row',
    gap: wp(3),
    marginBottom: hp(1.2),
  },
  picker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: wp(3),
    height: hp(6.2),
  },
  pickerText: {
    color: COLORS.textMuted,
    fontSize: rf(4),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  disabledPicker: {
    backgroundColor: '#f9fafb',
    borderColor: '#e5e7eb',
  },
  disabledPickerText: {
    color: '#9ca3af',
  },
  infoCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    justifyContent: 'space-between',
  },
  iconBadge: {
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    marginRight: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.dangerBg,
  },
  infoLabel: {
    fontSize: rf(4),
    lineHeight: rf(4),
    color: COLORS.textMuted,
    marginLeft: wp(1),
    fontWeight: '800',
    flex: 1,
    flexShrink: 1,
    flexWrap: 'wrap',
    includeFontPadding: false,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  infoValue: {
    marginTop: hp(1),
    fontSize: rf(5.2),
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingVertical: hp(0.6),
    // paddingHorizontal: wp(3),
    borderRadius: wp(5),
    marginTop: hp(1),
  },
  statusPillText: {
    color: '#92400e',
    fontWeight: '700',
    fontSize: rf(3.6),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  addRowButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    borderRadius: RADIUS.md,
  },
  addRowText: {
    color: COLORS.bg,
    fontWeight: '800',
    fontSize: rf(3.8),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  submitInlineButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    borderRadius: RADIUS.md,
  },
  submitInlineText: {
    color: COLORS.bg,
    fontWeight: '800',
    fontSize: rf(3.8),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  transferButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: RADIUS.md,
  },
  transferButtonText: {
    color: COLORS.bg,
    fontWeight: '800',
    fontSize: rf(3.8),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: RADIUS.md,
  },
  cancelButtonText: {
    color: COLORS.bg,
    fontWeight: '800',
    fontSize: rf(3.8),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  emptyContainer: {
    paddingVertical: hp(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: rf(4.2),
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },

  // Bottom sheet styles
  bsHandle: {
    alignSelf: 'center',
    width: wp(18),
    height: hp(0.7),
    backgroundColor: '#2e2e2e',
    borderRadius: hp(0.6),
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  bsBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  bsContent: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(6),
    paddingTop: hp(1),
    paddingBottom: hp(1),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  bsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
    marginTop: hp(0.5),
  },
  bsTitle: {
    fontSize: rf(4),
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  bsSaveBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(4),
    borderRadius: RADIUS.md,
  },
  bsSaveText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: rf(3.6),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  inputDescWrapper: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
  },
  inputDesc: {
    minHeight: hp(16),
    maxHeight: hp(24),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    color: COLORS.text,
    fontSize: rf(3.6),
    textAlignVertical: 'top',
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  buttonDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: '#d1d5db',
    borderWidth: 1,
  },
  buttonDisabledText: {
    color: COLORS.textMuted,
  },
});
