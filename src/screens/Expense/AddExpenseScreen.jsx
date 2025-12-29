import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Image, PermissionsAndroid, Platform } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Dropdown from '../../components/common/Dropdown';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import AccordionItem from '../../components/common/AccordionItem';
import AppHeader from '../../components/common/AppHeader';
import BottomSheetConfirm from '../../components/common/BottomSheetConfirm';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import { pick, types, isCancel } from '@react-native-documents/picker';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import { fetchUserProjects, fetchUserProjectTasks, fetchExpenseTypes, fetchCurrencies, fetchExpenseUnits, getCountries, getStates, getCities, addExpenseHeader, updateExpenseHeader, addExpenseLine, updateExpenseLine, deleteExpenseLine, fetchExpenseLinesByHeader, fetchExpenses, uploadFiles } from '../../api/authServices';
import { getCMPUUID, getENVUUID, getUUID } from '../../api/tokenStorage';
import Loader from '../../components/common/Loader';

const sampleProjects = [];

// const unitTypes = ['Km', 'Days', 'Hours', 'Quantity', 'Kg', 'Night'];

const HeaderLabel = ({ title }) => (
  <Text style={styles.sectionHeading}>{title}</Text>
);

const LabeledInput = ({ placeholder, rightIcon, value, onPress, onChangeText, editable = false, inputRef, onSubmitEditing }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.inputWrapper}>
    <TextInput
      ref={inputRef}
      style={styles.textInput}
      placeholder={placeholder}
      placeholderTextColor="#8e8e93"
      value={value}
      editable={editable}
      pointerEvents={editable ? "auto" : "none"}
      onChangeText={onChangeText}
      keyboardType={editable ? "numeric" : "default"}
      returnKeyType="done"
      blurOnSubmit={true}
      onSubmitEditing={onSubmitEditing}
    />
    {!!rightIcon && (
      <Icon name={rightIcon} size={rf(3.8)} color="#8e8e93" />
    )}
  </TouchableOpacity>
);

// Date helpers: display as dd-MMM-yyyy for UI, keep API as yyyy-mm-dd
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
const formatDate = (d) => {
  const date = parseDateFlexible(d);
  if (!date) return '';
  const dd = String(date.getDate()).padStart(2, '0');
  const mon = MONTHS_SHORT[date.getMonth()];
  const yy = date.getFullYear();
  return `${dd}-${mon}-${yy}`;
};

// API format (yyyy-mm-dd)
const formatDateApi = (d) => {
  const date = parseDateFlexible(d);
  if (!date) return '';
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const AddExpenseScreen = ({ navigation, route }) => {
  // Check if we're in edit mode
  const isEditMode = route?.params?.editMode || false;
  const editHeaderUuid = route?.params?.headerUuid || null;
  const expenseData = route?.params?.expenseData || null;
  const routeLineUuid = route?.params?.lineUuid || null;
  const [selectedProject, setSelectedProject] = useState(null); // { id, name }
  const [selectedTask, setSelectedTask] = useState(null); // { id, name }
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [selectedExpenseType, setSelectedExpenseType] = useState(null);
  const [otherExpenseType, setOtherExpenseType] = useState('');
  const [selectedUnitType, setSelectedUnitType] = useState(null);

  // API data states
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]); // [{ id, name }]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [adding, setAdding] = useState(false);

  // Location data states
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Expense types data states
  const [expenseTypes, setExpenseTypes] = useState([]);
  const [loadingExpenseTypes, setLoadingExpenseTypes] = useState(false);

  // Expense units data states
  const [unitTypes, setUnitTypes] = useState([]); // [{ id, name }]
  const [loadingUnits, setLoadingUnits] = useState(false);

  // Currency data states
  const [currencies, setCurrencies] = useState([]);
  const [loadingCurrencies, setLoadingCurrencies] = useState(false);

  // Form state for proper binding
  const [form, setForm] = useState({
    projectName: '',
    projectTask: '',
    fromDate: '',
    toDate: '',
    expenseType: '',
    country: '',
    state: '',
    city: '',
    currency: '',
    quantity: '',
    unitType: '',
    unitCost: '',
    totalCost: '',
    taxAmount: '',
    billAmount: '',
    documentDate: '',
    purpose: ''
  });

  const updateForm = (key) => (value) => setForm(prev => ({ ...prev, [key]: value }));

  const [applyForApproval, setApplyForApproval] = useState(false);
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [billFilePath, setBillFilePath] = useState(null);

  // Date state
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [documentDate, setDocumentDate] = useState(null);
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [openDoc, setOpenDoc] = useState(false);

  // Temporary list to showcase Accordion items in place of table
  const [items, setItems] = useState([]);
  const [activeCode, setActiveCode] = useState(null);

  // Refs for controlled focus order
  const quantityRef = useRef(null);
  const unitCostRef = useRef(null);
  const taxAmountRef = useRef(null);
  const remarksRef = useRef(null);

  // Submit confirmation sheet
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [validationVisible, setValidationVisible] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const headerUuidRef = useRef('');
  const [headerUuid, setHeaderUuid] = useState('');
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Delete confirmation bottom sheet (same as TimesheetScreen)
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  // Line add success bottom sheet
  const [lineAddSheetVisible, setLineAddSheetVisible] = useState(false);
  const [lineAddMessage, setLineAddMessage] = useState('');
  const [infoSheet, setInfoSheet] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: '',
    onConfirm: undefined,
    onCancel: undefined,
  });

  const showInfoSheet = useCallback((config = {}) => {
    setInfoSheet({
      visible: true,
      title: config.title || '',
      message: config.message || '',
      confirmText: config.confirmText || 'OK',
      cancelText: config.cancelText ?? '',
      onConfirm: config.onConfirm,
      onCancel: config.onCancel,
    });
  }, []);

  const hideInfoSheet = useCallback(() => {
    setInfoSheet(prev => ({ ...prev, visible: false }));
  }, []);

  const availableTasks = useMemo(() => {
    if (!selectedProject) return [];
    return tasks;
  }, [selectedProject, tasks]);

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedTask(null);
    updateForm('projectName')(project?.name || '');
    updateForm('projectTask')('');
    // fetch tasks for this project
    (async () => {
      try {
        const resp = await fetchUserProjectTasks({ projectUuid: project?.id });
        const raw = Array.isArray(resp?.Data) ? resp.Data : [];
        const taskOptions = raw
          .filter(t => t && t.Task_Title)
          .map((t) => ({ id: t.UUID || t.Uuid || t.id, name: String(t.Task_Title) }));
        setTasks(taskOptions);
      } catch (_e) {
        setTasks([]);
      }
    })();
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    updateForm('projectTask')(task?.name || '');
  };

  // Load countries on component mount
  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const response = await getCountries({ cmpUuid, envUuid });
      if (response?.Data) {
        setCountries(response.Data);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Load expense types
  const loadExpenseTypes = async () => {
    try {
      setLoadingExpenseTypes(true);
      const response = await fetchExpenseTypes();
      if (response?.Data) {
        const data = Array.isArray(response.Data) ? response.Data : [];
        const withOther = [
          ...data,
          { Uuid: 'OTHER', ExpenseTypeName: 'Other' },
        ];
        setExpenseTypes(withOther);
      }
    } catch (error) {
      console.error('Error loading expense types:', error);
    } finally {
      setLoadingExpenseTypes(false);
    }
  };

  // Deterministic getter that also returns array for immediate matching
  const fetchAndSetExpenseTypes = async () => {
    try {
      setLoadingExpenseTypes(true);
      const response = await fetchExpenseTypes();
      const data = Array.isArray(response?.Data) ? response.Data : [];
      const withOther = [
        ...data,
        { Uuid: 'OTHER', ExpenseTypeName: 'Other' },
      ];
      setExpenseTypes(withOther);
      return withOther;
    } catch (e) {
      setExpenseTypes([]);
      return [];
    } finally {
      setLoadingExpenseTypes(false);
    }
  };

  // Load currencies based on selected country
  const loadCurrencies = async (countryUuid) => {
    try {
      setLoadingCurrencies(true);
      const response = await fetchCurrencies({ countryUuid });
      if (response?.Data) {
        setCurrencies(response.Data);
      }
    } catch (error) {
      console.error('Error loading currencies:', error);
    } finally {
      setLoadingCurrencies(false);
    }
  };

  // Load expense units
  const loadExpenseUnits = async () => {
    try {
      setLoadingUnits(true);
      const response = await fetchExpenseUnits();
      const arr = Array.isArray(response?.Data) ? response.Data : [];
      // Normalize to objects with id and name
      const units = arr
        .filter(u => u && (u.Unit_Name || u.UnitName || u.Name))
        .map(u => ({ id: u.UUID || u.Uuid || u.id, name: String(u.Unit_Name || u.UnitName || u.Name) }));
      setUnitTypes(units);
    } catch (error) {
      console.error('Error loading expense units:', error);
      setUnitTypes([]);
    } finally {
      setLoadingUnits(false);
    }
  };

  const fetchAndSetUnits = async () => {
    try {
      setLoadingUnits(true);
      const response = await fetchExpenseUnits();
      const arr = Array.isArray(response?.Data) ? response.Data : [];
      const units = arr
        .filter(u => u && (u.Unit_Name || u.UnitName || u.Name))
        .map(u => ({ id: u.UUID || u.Uuid || u.id, name: String(u.Unit_Name || u.UnitName || u.Name) }));
      setUnitTypes(units);
      return units;
    } catch (e) {
      setUnitTypes([]);
      return [];
    } finally {
      setLoadingUnits(false);
    }
  };

  // Load states when country is selected
  const loadStates = async (countryUuid) => {
    try {
      setLoadingStates(true);
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const response = await getStates({ cmpUuid, countryUuid, envUuid });
      if (response?.Data) {
        setStates(response.Data);
      }
    } catch (error) {
      console.error('Error loading states:', error);
    } finally {
      setLoadingStates(false);
    }
  };

  // Load cities when state is selected
  const loadCities = async (stateUuid) => {
    try {
      setLoadingCities(true);
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const response = await getCities({ stateUuid, cmpUuid, envUuid });
      if (response?.Data) {
        setCities(response.Data);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  // Handle country selection
  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setSelectedState(null);
    setSelectedCity(null);
    setSelectedCurrency(null);
    setStates([]);
    setCities([]);
    setCurrencies([]);
    updateForm('country')(country?.CountryName || '');
    updateForm('state')('');
    updateForm('city')('');
    updateForm('currency')('');
    if (country?.Uuid) {
      loadStates(country.Uuid);
      loadCurrencies(country.Uuid);
    }
  };

  // Handle state selection
  const handleStateSelect = (state) => {
    setSelectedState(state);
    setSelectedCity(null);
    setCities([]);
    updateForm('state')(state?.StateName || '');
    updateForm('city')('');
    if (state?.Uuid) {
      loadCities(state.Uuid);
    }
  };

  // Handle city selection
  const handleCitySelect = (city) => {
    setSelectedCity(city);
    updateForm('city')(city?.CityName || '');
    // prevent accidental focus jumps
    try { require('react-native').Keyboard.dismiss(); } catch (_) { }
  };

  const handleToggle = (code) => setActiveCode(prev => (prev === code ? null : code));
  const handleView = () => { };
  const applyLineToForm = async (lineItem) => {
    if (!lineItem) return;
    // Quantity, costs, tax, totals
    updateForm('quantity')(lineItem.quantity != null ? String(lineItem.quantity) : '');
    updateForm('unitCost')(lineItem.unitCost != null ? String(lineItem.unitCost) : '');
    updateForm('taxAmount')(lineItem.taxAmount != null ? String(lineItem.taxAmount) : '');
    updateForm('totalCost')(lineItem.totalCost != null ? String(lineItem.totalCost) : '');
    updateForm('billAmount')(lineItem.billAmount != null ? String(lineItem.billAmount) : '');
    // Document date
    if (lineItem.documentDate) {
      const d = parseDateFlexible(lineItem.documentDate);
      setDocumentDate(d);
      updateForm('documentDate')(formatDate(d));
    }
    // Remarks
    if (lineItem.expenseRemarks != null) {
      updateForm('purpose')(String(lineItem.expenseRemarks));
    }
    // Other expense type handling
    if (lineItem.isOtherExpenseType) {
      const otherName = lineItem.otherExpenseTypeName || lineItem.expenseType || '';
      setOtherExpenseType(otherName);
      // Ensure the dropdown shows only 'Other' (not the custom name)
      let typesArr = expenseTypes;
      if (!typesArr || typesArr.length === 0) {
        try {
          const response = await fetchExpenseTypes();
          const data = Array.isArray(response?.Data) ? response.Data : [];
          typesArr = data;
        } catch (_e) {
          typesArr = expenseTypes || [];
        }
      }
      const cleaned = (typesArr || []).filter(et => !(et?.Uuid === 'CUSTOM' || et?.UUID === 'CUSTOM'));
      const existingOther = cleaned.find(et => (et?.Uuid === 'OTHER' || et?.UUID === 'OTHER') || (et?.ExpenseTypeName === 'Other' || et?.Name === 'Other'));
      const otherType = existingOther || { Uuid: 'OTHER', ExpenseTypeName: 'Other' };
      const ensureOtherList = existingOther ? cleaned : [otherType, ...cleaned];
      setExpenseTypes(ensureOtherList);
      setSelectedExpenseType(otherType);
      updateForm('expenseType')('Other');
    }
    // Unit type
    const utId = lineItem.unitTypeUuid;
    if (utId) {
      let unitsArr = unitTypes;
      if (!unitsArr || unitsArr.length === 0) {
        try { unitsArr = await fetchAndSetUnits(); } catch (_e) { unitsArr = []; }
      }
      const unitType = unitsArr.find(ut => (ut.id || ut.UUID || ut.Uuid) === utId);
      if (unitType) {
        setSelectedUnitType(unitType);
        updateForm('unitType')(unitType.name);
      }
    }
    // Attachment
    if (lineItem.billUrl) {
      setSelectedAttachment({ name: 'Existing Bill', uri: lineItem.billUrl, type: 'application/pdf', size: 0 });
      setBillFilePath(lineItem.billUrl);
    }
  };
  const scrollViewRef = useRef(null);  
  const headerRef  = useRef(null);
  const handleEdit = async (item) => {
   
    try {
      setActiveCode(item?.soleExpenseCode || null);
      await applyLineToForm(item);
        // 👇 Wait a short moment to ensure layout is ready
        setTimeout(() => {
          headerRef.current?.measureLayout(
            scrollViewRef.current.getInnerViewNode(),
            (x, y) => {
              scrollViewRef.current.scrollTo({ y, animated: true }); // 👈 scrolls to header
            }
          );
        }, 100);
    } catch (_e) { }
  };
  const openDeleteSheet = (code) => {
    setDeleteTarget(code);
    setDeleteConfirmVisible(true);
  };

  const confirmDeleteLine = async () => {
    if (!deleteTarget) return;
    try {
      await deleteExpenseLine({ lineUuid: deleteTarget });
      await loadHeaderLines();
      try { await fetchExpenses(); } catch (_e) { }
      setDeleteTarget(null);
      setDeleteConfirmVisible(false);
      Alert.alert('Deleted', 'Expense line deleted successfully.');
    } catch (e) {
      Alert.alert('Delete failed', String(e?.response?.data?.Message || e?.message || 'Failed to delete line'));
    }
  };

  const cancelDelete = () => {
    setDeleteConfirmVisible(false);
    setDeleteTarget(null);
  };

  const requestStoragePermissionAndroid = async () => {
    if (Platform.OS !== 'android') return true;

    const sdkVersion = Platform.constants?.Release ? Number(Platform.constants.Release) : 0;

    // On Android 13 (API 33+) use READ_MEDIA_*; otherwise use READ_EXTERNAL_STORAGE
    if (Platform.Version >= 33) {
      const readImages = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      return readImages === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const handlePickDocument = async () => {
    try {
      const hasPerm = await requestStoragePermissionAndroid();
      if (!hasPerm) {
        showInfoSheet({
          title: 'Permission required',
          message: 'Storage permission is needed to pick a file.',
          confirmText: 'OK',
        });
        return;
      }

      const [file] = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false
      });

      if (file) {
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        const mime = file.type || file.mimeType || '';
        if (!allowedTypes.includes(mime)) {
          Alert.alert('Invalid File Type', 'Please select a PDF, PNG, or JPG file.');
          return;
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size && file.size > maxSize) {
          Alert.alert('File Too Large', 'File size must be less than 10MB.');
          return;
        }

        const docObj = {
          name: file.name,
          uri: file.uri,
          type: mime,
          size: file.size,
        };
        setSelectedAttachment(docObj);

        // Immediately upload to server with fixed Filepath 'BillUrl'
        try {
          const uploadResp = await uploadFiles(docObj, { filepath: 'BillUrl' });
          const upData = uploadResp?.Data || uploadResp || {};
          const uploaded = upData?.Files || upData?.files || upData?.UploadedFiles || upData?.FilePaths || upData || [];
          const finalRefs = Array.isArray(uploaded) ? uploaded : (uploaded ? [uploaded] : []);
          const paths = finalRefs.map(r => {
            try { return r?.RemoteResponse?.path || r?.path || r?.FilePath || (typeof r === 'string' ? r : null); } catch (_) { return null; }
          }).filter(Boolean);
          if (paths.length) setBillFilePath(paths.join(','));
        } catch (uErr) {
          console.warn('Bill upload failed', uErr);
          // keep local selection so user can retry on submit
        }
      }
    } catch (err) {
      if (isCancel && isCancel(err)) {
        return;
      }
      console.warn('Document pick error:', err);
      // Alert.alert('Document Picker Error', String(err?.message || err));
    }
  };

  const isImageFile = (file) => {
    const mime = file?.type || file?.mimeType || '';
    return /^image\//.test(mime);
  };

  // Auto-calculate total and bill amounts based on quantity and unit cost
  useEffect(() => {
    const quantityRaw = String(form.quantity ?? '').trim();
    const unitCostRaw = String(form.unitCost ?? '').trim();
    const taxRaw = String(form.taxAmount ?? '').trim();

    const qtyProvided = quantityRaw !== '';
    const unitCostProvided = unitCostRaw !== '';
    const taxProvided = taxRaw !== '';

    const quantityNum = parseFloat(quantityRaw.replace(/,/g, '.')) || 0;
    const unitCostNum = parseFloat(unitCostRaw.replace(/,/g, '.')) || 0;
    const taxAmountNum = parseFloat(taxRaw.replace(/,/g, '.')) || 0;

    const total = quantityNum * unitCostNum;
    const shouldShowTotal = qtyProvided && unitCostProvided && Number.isFinite(total) && total !== 0;
    const totalStr = shouldShowTotal ? total.toFixed(2) : '';

    const bill = total + (taxProvided ? taxAmountNum : 0);
    const shouldShowBill = (shouldShowTotal || taxProvided) && Number.isFinite(bill) && bill !== 0;
    const billStr = shouldShowBill ? bill.toFixed(2) : '';

    if (form.totalCost !== totalStr) {
      updateForm('totalCost')(totalStr);
    }
    if (form.billAmount !== billStr) {
      updateForm('billAmount')(billStr);
    }
  }, [form.quantity, form.unitCost, form.taxAmount]);

  const toIsoString = (val) => {
    if (!val) return '';
    try {
      if (val instanceof Date) return val.toISOString();
      const d = new Date(val);
      return isNaN(d.getTime()) ? '' : d.toISOString();
    } catch (_e) { return ''; }
  };

  const getUuidLike = (obj, keys = ['Uuid', 'UUID', 'id']) => {
    if (!obj || typeof obj !== 'object') return '';
    for (const k of keys) {
      if (obj[k]) return obj[k];
    }
    return '';
  };

  // Normalizers and match helpers for resilient name matching
  const normalize = (v) => String(v ?? '').trim().toLowerCase();
  const findCountryByName = (arr, name) => {
    const n = normalize(name);
    return arr.find(c => [c?.CountryName, c?.Name, c?.countryName].some(x => normalize(x) === n));
  };
  const findStateByName = (arr, name) => {
    const n = normalize(name);
    return arr.find(s => [s?.StateName, s?.Name, s?.stateName].some(x => normalize(x) === n));
  };
  const findCityByName = (arr, name) => {
    const n = normalize(name);
    return arr.find(c => [c?.CityName, c?.Name, c?.cityName].some(x => normalize(x) === n));
  };
  const findCurrencyByName = (arr, name) => {
    const n = normalize(name);
    return arr.find(c => [c?.Currency_Name, c?.CurrencyName, c?.Name, c?.currencyName].some(x => normalize(x) === n));
  };

  const mapLineToItem = (line, headerData = null) => {
    const id = line?.UUID || line?.Uuid || line?.uuid || line?.Id || line?.id || Math.random().toString(36).slice(2);
    const qty = parseFloat(String(line?.Quantity ?? '').replace(/,/g, '.')) || 0;
    const unitCost = parseFloat(String(line?.UnitCost ?? '').replace(/,/g, '.')) || 0;
    const tax = parseFloat(String(line?.TaxAmount ?? '').replace(/,/g, '.')) || 0;
    const totalCost = parseFloat(String(line?.TotalCost ?? '').replace(/,/g, '.')) || 0;
    const billAmount = parseFloat(String(line?.BillAmount ?? '').replace(/,/g, '.')) || 0;
    const doc = line?.Document_Date || line?.DocumentDate || '';

    // Use header data for expense type if available, otherwise fallback to line data
    const expenseType = headerData?.ExpenseType || line?.ExpenseType || 'Expense';
    const isOtherExpenseType = line?.IsOtherExpenseType === true;
    const otherExpenseTypeName = line?.OtherFields || line?.OtherExpenseType || '';

    return {
      soleExpenseCode: String(id),
      expenseName: expenseType, // This will now show the actual expense type from header
      amount: Number.isFinite(billAmount) && billAmount !== 0 ? billAmount.toFixed(2) : '0.00',
      documentFromDate: doc ? formatDate(doc) : '',
      documentToDate: doc ? formatDate(doc) : '',
      // Line data
      billAmount: Number.isFinite(billAmount) && billAmount !== 0 ? billAmount.toFixed(2) : '0.00',
      billUrl: line?.BillUrl || null,
      documentDate: doc ? formatDate(doc) : '',
      erExpenseHeaderUuid: line?.ERExpenseHeader_UUID || '',
      expenseRemarks: line?.Expense_Remarks || null,
      expenseType: expenseType, // This will also show the actual expense type
      quantity: qty,
      taxAmount: Number.isFinite(tax) && tax !== 0 ? tax.toFixed(2) : '0.00',
      totalCost: Number.isFinite(totalCost) && totalCost !== 0 ? totalCost.toFixed(2) : '0.00',
      unitCost: Number.isFinite(unitCost) && unitCost !== 0 ? unitCost.toFixed(2) : '0.00',
      unitTypeUuid: line?.UnitType_UUID || '',
      isOtherExpenseType,
      otherExpenseTypeName,
    };
  };

  const loadHeaderLines = async () => {
    try {
      const currentHeader = headerUuidRef?.current || headerUuid;
      if (!currentHeader) return;
      const resp = await fetchExpenseLinesByHeader({ headerUuid: currentHeader });

      // Handle the new API response structure with Header and Lines
      const dataRoot = resp?.Data ?? resp?.data ?? resp;
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


      // Map line data with header information
      const mapped = lines.map(line => mapLineToItem(line, headerData));
      setItems(mapped);
      // Keep all accordions closed by default
      setActiveCode(null);
    } catch (e) {
    }
  };

  useEffect(() => {
    if (headerUuid) {
      headerUuidRef.current = headerUuid;
      loadHeaderLines();
    }
  }, [headerUuid]);

  // Load expense data for editing using existing API
  const loadExpenseForEdit = async () => {
    if (!isEditMode || !editHeaderUuid) return;

    try {
      setLoading(true);

      // Use the existing fetchExpenseLinesByHeader API
      const resp = await fetchExpenseLinesByHeader({ headerUuid: editHeaderUuid });

      // Handle the response structure
      const dataRoot = resp?.Data ?? resp?.data ?? resp;
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



      // Auto-fill form with header data if available
      if (headerData) {
        // Set header UUID
        headerUuidRef.current = editHeaderUuid;
        setHeaderUuid(editHeaderUuid);

        // Auto-fill project if available


        if (headerData.ProjectName || headerData.Project_Title) {
          const projectName = headerData.ProjectName || headerData.Project_Title;
          // Ensure projects are loaded before matching
          let projectOptionsLocal = projects;
          if (!Array.isArray(projectOptionsLocal) || projectOptionsLocal.length === 0) {
            try {
              const projResp2 = await fetchUserProjects();
              const projectsRaw2 = Array.isArray(projResp2?.Data?.Projects) ? projResp2.Data.Projects : [];
              projectOptionsLocal = projectsRaw2
                .filter(p => p && p.Project_Title)
                .map(p => ({ id: p.UUID || p.Uuid || p.id, name: String(p.Project_Title) }));
              if (projectOptionsLocal.length) setProjects(projectOptionsLocal);
            } catch (_pe) {
              projectOptionsLocal = projects;
            }
          }
          const pn = (projectName || '').toString().trim().toLowerCase();
          const project = projectOptionsLocal.find(p => (p?.name || '').toString().trim().toLowerCase() === pn);
          if (project) {
            setSelectedProject(project);
            updateForm('projectName')(project.name);

            // Load tasks for this project
            try {
              const taskResp = await fetchUserProjectTasks({ projectUuid: project.id });
              const raw = Array.isArray(taskResp?.Data) ? taskResp.Data : [];
              const taskOptions = raw
                .filter(t => t && t.Task_Title)
                .map((t) => ({ id: t.UUID || t.Uuid || t.id, name: String(t.Task_Title) }));
              // Attempt to match header task; if not found, inject a synthetic option to display it
              let nextTasks = taskOptions;
              if (headerData.ProjectTask || headerData.Task_Title) {
                const taskName = headerData.ProjectTask || headerData.Task_Title;
                const tn = (taskName || '').toString().trim().toLowerCase();
                let task = taskOptions.find(t => (t?.name || '').toString().trim().toLowerCase() === tn);
                if (!task && taskName) {
                  const synthetic = { id: `custom-${tn}`, name: taskName };
                  nextTasks = [synthetic, ...taskOptions];
                  task = synthetic;
                }
                setTasks(nextTasks);
                if (task) {
                  setSelectedTask(task);
                  updateForm('projectTask')(task.name);
                }
              } else {
                setTasks(nextTasks);
              }
            } catch (e) {
              console.error('Error loading tasks for edit:', e);
            }
          }
        }

        // Auto-fill dates
        if (headerData.DocDateFrom || headerData.Doc_Date_From || headerData.DocumentDateFrom) {
          const fromDate = parseDateFlexible(headerData.DocDateFrom || headerData.Doc_Date_From || headerData.DocumentDateFrom);
          setFromDate(fromDate);
          updateForm('fromDate')(formatDate(fromDate));
        }

        if (headerData.DocDateTo || headerData.Doc_Date_To || headerData.DocumentDateTo) {
          const toDate = parseDateFlexible(headerData.DocDateTo || headerData.Doc_Date_To || headerData.DocumentDateTo);
          setToDate(toDate);
          updateForm('toDate')(formatDate(toDate));
        }

        // Auto-fill expense type with robust logic

        // Ensure expense types are loaded before matching
        let typesArr = expenseTypes;
        if (!typesArr || typesArr.length === 0) {
          try { typesArr = await fetchAndSetExpenseTypes(); } catch (_e) { typesArr = []; }
        }

        // Find helper (case-insensitive)
        const matchByName = (list, name) => {
          if (!name) return undefined;
          const n = String(name).trim().toLowerCase();
          return list.find(et => {
            const label = et?.ExpenseTypeName || et?.Name || '';
            return String(label).trim().toLowerCase() === n;
          });
        };

        const expenseTypeName = headerData.ExpenseType || headerData.ExpenseTypeName || '';
        const otherFieldValue = headerData.OtherFields || headerData.OtherExpenseType || '';
        const otherType = typesArr.find(et => (et?.Uuid === 'OTHER' || et?.UUID === 'OTHER') || (et?.ExpenseTypeName === 'Other' || et?.Name === 'Other'))
          || { Uuid: 'OTHER', ExpenseTypeName: 'Other' };

        if (otherFieldValue) {
          // Explicit custom type from header → select Other and prefill textbox
          setSelectedExpenseType(otherType);
          updateForm('expenseType')(otherType.ExpenseTypeName || otherType.Name || 'Other');
          setOtherExpenseType(String(otherFieldValue));
        } else if (expenseTypeName) {
          const matched = matchByName(typesArr, expenseTypeName);
          if (matched && !((matched?.Uuid || matched?.UUID) === 'OTHER' || (matched?.ExpenseTypeName === 'Other' || matched?.Name === 'Other'))) {
            // Known type → select in dropdown
            setSelectedExpenseType(matched);
            updateForm('expenseType')(matched.ExpenseTypeName || matched.Name);
            setOtherExpenseType('');
          } else {
            // Unknown type or explicitly Other with no OtherFields
            setSelectedExpenseType(otherType);
            updateForm('expenseType')(otherType.ExpenseTypeName || otherType.Name || 'Other');
            setOtherExpenseType(String(expenseTypeName));
          }
        }

        // Auto-fill location data with proper timing

        // Normalize header field variants (new API may use Country/State/City/Currency)
        const hdrCountry = headerData.CountryName || headerData.Country || '';
        const hdrState = headerData.StateName || headerData.State || '';
        const hdrCity = headerData.CityName || headerData.City || '';
        const hdrCurrency = headerData.CurrencyName || headerData.Currency || headerData.Currency_Name || '';

        // Deterministic, awaited autofill flow with local fallbacks
        try {
          // Ensure countries list (fallback fetch if not ready)
          let countriesArr = countries;
          if (!Array.isArray(countriesArr) || countriesArr.length === 0) {
            const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
            const countriesResp = await getCountries({ cmpUuid, envUuid });
            countriesArr = Array.isArray(countriesResp?.Data) ? countriesResp.Data : [];
            if (countriesArr.length) setCountries(countriesArr);
          }

          if (hdrCountry) {
            const country = findCountryByName(countriesArr, hdrCountry);
            if (country) {
              setSelectedCountry(country);
              updateForm('country')(country.CountryName);

              // Fetch states deterministically and select
              const [cmpUuid2, envUuid2] = await Promise.all([getCMPUUID(), getENVUUID()]);
              const sResp = await getStates({ cmpUuid: cmpUuid2, countryUuid: country.Uuid || country.UUID || country.uuid || country.Id || country.id, envUuid: envUuid2 });
              const sArr = Array.isArray(sResp?.Data) ? sResp.Data : [];
              setStates(sArr);

              if (hdrState) {
                const state = findStateByName(sArr, hdrState);
                if (state) {
                  setSelectedState(state);
                  updateForm('state')(state.StateName);

                  // Fetch cities deterministically and select
                  const [cmpUuid3, envUuid3] = await Promise.all([getCMPUUID(), getENVUUID()]);
                  const cResp = await getCities({ stateUuid: state.Uuid || state.UUID || state.uuid || state.Id || state.id, cmpUuid: cmpUuid3, envUuid: envUuid3 });
                  const cArr = Array.isArray(cResp?.Data) ? cResp.Data : [];
                  setCities(cArr);

                  if (hdrCity) {
                    const city = findCityByName(cArr, hdrCity);
                    if (city) {
                      setSelectedCity(city);
                      updateForm('city')(city.CityName);
                    }
                  }
                }
              }

              // Fetch currencies deterministically and select
              const curResp = await fetchCurrencies({ countryUuid: country.Uuid || country.UUID || country.uuid || country.Id || country.id });
              const curArr = Array.isArray(curResp?.Data) ? curResp.Data : [];
              setCurrencies(curArr);

              if (hdrCurrency) {
                const currency = findCurrencyByName(curArr, hdrCurrency);
                if (currency) {
                  setSelectedCurrency(currency);
                  updateForm('currency')(currency.Currency_Name || currency.CurrencyName || currency.Name || currency.currencyName);
                }
              }
            }
          }
        } catch (autoErr) { }

        // Set approval status
        if (headerData.IsApprovalApply !== undefined) {
          setApplyForApproval(!!headerData.IsApprovalApply);
        }
      }

      // Map line data with header information
      const mapped = lines.map(line => mapLineToItem(line, headerData));
      setItems(mapped);

      // Keep all accordions closed by default while editing
      setActiveCode(null);

      // Do not auto-fill expense parameter fields when visiting screen for edit

      // Mark data as loaded
      setIsDataLoaded(true);

    } catch (e) { 
      console.error('Error loading expense for edit:', e);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!selectedProject) {
      Alert.alert('Missing data', 'Please select a Project.');
      return;
    }
    if (!selectedExpenseType) {
      Alert.alert('Missing data', 'Please select an Expense Type.');
      return;
    }
    if ((selectedExpenseType?.Uuid === 'OTHER' || selectedExpenseType?.UUID === 'OTHER') && !otherExpenseType.trim()) {
      Alert.alert('Missing data', 'Please type the Expense name for "Other".');
      return;
    }

    // Check if there are any line items
    if (items.length === 0) {
      Alert.alert('No line items', 'Please add at least one expense line before submitting.');
      return;
    }

    const payload = {
      UUID: (await getUUID()) || '',
      Master_Company_UUID: (await getCMPUUID()) || '',
      Master_Environment_UUID: (await getENVUUID()) || '',
      Project_UUID: getUuidLike(selectedProject),
      ProjectTask_UUID: getUuidLike(selectedTask, ['id']) || '',
      Doc_Date_From: toIsoString(fromDate || form.fromDate),
      Doc_Date_To: toIsoString(toDate || form.toDate),
      ExpenseType_UUID: ((selectedExpenseType?.Uuid === 'OTHER' || selectedExpenseType?.UUID === 'OTHER') ? 'Other' : getUuidLike(selectedExpenseType)),
      Country_UUID: getUuidLike(selectedCountry),
      State_UUID: getUuidLike(selectedState),
      City_UUID: getUuidLike(selectedCity),
      Currency_UUID: getUuidLike(selectedCurrency, ['UUID', 'Uuid', 'id']),
      IsApprovalApply: !!applyForApproval,
      IsDisplay: true,
      ...(selectedExpenseType?.Uuid === 'OTHER' || selectedExpenseType?.UUID === 'OTHER'
        ? { OtherFields: otherExpenseType.trim() }
        : {}),
    };

    try {
      setSubmitting(true);
      if (isEditMode && (editHeaderUuid || headerUuidRef.current)) {
        // Update existing header with approval status
        const updateBody = {
          ...payload,
          UUID: editHeaderUuid || headerUuidRef.current,
        };
        try { console.log('Update Expense Header payload:', JSON.stringify(updateBody, null, 2)); } catch (_e) { }
        const resp = await updateExpenseHeader(updateBody);
        const updatedUuid = resp?.Data?.UUID || resp?.Data?.Uuid || resp?.UUID || resp?.Uuid || (editHeaderUuid || headerUuidRef.current);
        if (updatedUuid) {
          headerUuidRef.current = updatedUuid;
          setHeaderUuid(updatedUuid);
        }

        Alert.alert('Success', 'Expense updated successfully.');
        try { await fetchExpenses(); } catch (_e) { }
      } else {
        // If no header exists, create one first
        if (!headerUuidRef.current) {
          const headerPayload = {
            ...payload,
            IsApprovalApply: false, // Create header without approval first
          };
          const headerResp = await addExpenseHeader(headerPayload);
          const newHeaderUuid = headerResp?.Data?.UUID || headerResp?.Data?.Uuid || headerResp?.UUID || headerResp?.Uuid || '';
          if (newHeaderUuid) {
            headerUuidRef.current = newHeaderUuid;
            setHeaderUuid(newHeaderUuid);
          }
        }

        // Now update the header with final approval status
        if (headerUuidRef.current) {
          const finalPayload = {
            ...payload,
            UUID: headerUuidRef.current,
          };
          await updateExpenseHeader(finalPayload);
        }

        Alert.alert('Success', 'Expense submitted successfully.');
        try { await fetchExpenses(); } catch (_e) { }
      }
      setConfirmVisible(false);
      // Load existing lines for this header if any
      await loadHeaderLines();
      try { await fetchExpenses(); } catch (_e) { }
      // Redirect to Expense list after final submit/update
      try { navigation.goBack(); } catch (_navErr) { }
    } catch (e) {
      Alert.alert('Submit failed', String(e?.response?.data?.Message || e?.message || 'Failed to submit'));
    } finally {
      setSubmitting(false);
    }
  };
  // Normalize to yyyy-mm-dd (no time)
  const dateOnly = (val) => {
    // Ensure API expects yyyy-mm-dd (no time)
    if (!val) return '';
    const s = formatDateApi(val);
    if (s) return s;
    const raw = String(val);
    return raw.length >= 10 ? raw.slice(0, 10) : raw;
  };
  const handleAdd = async () => {
    // Basic validation for line items only
    if (!form.quantity || !form.unitCost) {
      Alert.alert('Missing data', 'Please fill Quantity and Unit Cost.');
      return;
    }

    // Ensure a header exists; if not, create it first (but don't submit it)
    if (!headerUuidRef.current) {
      const headerPayload = {
        UUID: (await getUUID()) || '',
        Master_Company_UUID: (await getCMPUUID()) || '',
        Master_Environment_UUID: (await getENVUUID()) || '',
        Project_UUID: getUuidLike(selectedProject),
        ProjectTask_UUID: getUuidLike(selectedTask, ['id']) || '',
        Doc_Date_From: toIsoString(fromDate || form.fromDate),
        Doc_Date_To: toIsoString(toDate || form.toDate),
        ExpenseType_UUID: ((selectedExpenseType?.Uuid === 'OTHER' || selectedExpenseType?.UUID === 'OTHER') ? 'Other' : getUuidLike(selectedExpenseType)),
        Country_UUID: getUuidLike(selectedCountry),
        State_UUID: getUuidLike(selectedState),
        City_UUID: getUuidLike(selectedCity),
        Currency_UUID: getUuidLike(selectedCurrency, ['UUID', 'Uuid', 'id']),
        IsApprovalApply: false, // Don't apply for approval when just adding lines
        IsDisplay: true,
        ...(selectedExpenseType?.Uuid === 'OTHER' || selectedExpenseType?.UUID === 'OTHER'
          ? { OtherFields: otherExpenseType.trim() }
          : {}),
      };
      try {
        setAdding(true);
        const headerResp = await addExpenseHeader(headerPayload);
        const newHeaderUuid = headerResp?.Data?.UUID || headerResp?.Data?.Uuid || headerResp?.UUID || headerResp?.Uuid || '';
        if (newHeaderUuid) {
          headerUuidRef.current = newHeaderUuid;
          setHeaderUuid(newHeaderUuid);
        }
      } catch (e) {
        Alert.alert('Failed to create header', String(e?.response?.data?.Message || e?.message || 'Failed to create header'));
        setAdding(false);
        return;
      }
    }

    // Build the line payload with exact backend keys
    const linePayload = {
      UUID: (await getUUID()) || '',
      Master_Company_UUID: (await getCMPUUID()) || '',
      Master_Environment_UUID: (await getENVUUID()) || '',
      ERExpenseHeader_UUID: headerUuidRef?.current || '',
      UserUUID: (await getUUID()) || '',
      UnitType_UUID: selectedUnitType?.id || '',
      UnitCost: form.unitCost,
      Quantity: form.quantity,
      TaxAmount: form.taxAmount,
      Document_Date: dateOnly(documentDate || form.documentDate),
      BillUrl: billFilePath || '',
      Expense_Remarks: form.purpose,
      // documentFile: selectedAttachment ? { uri: selectedAttachment.uri, name: selectedAttachment.name || 'bill', type: selectedAttachment.type || 'application/octet-stream' } : undefined,
    };

    try {
      setAdding(true);
      const apiResp = await addExpenseLine(linePayload);
      await loadHeaderLines();
      setLineAddMessage('Expense line added successfully.');
      setLineAddSheetVisible(true);
      // Reset form for next line entry
      resetLineForm();
    } catch (e) {
      Alert.alert('Add failed', String(e?.response?.data?.Message || e?.message || 'Failed to add line'));
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateLine = async () => {
    if (!activeCode) {
      Alert.alert('No selection', 'Please select a line to update.');
      return;
    }
    if (!headerUuidRef.current && !headerUuid) {
      Alert.alert('Missing header', 'Header is not available to update a line.');
      return;
    }


    const linePayload = {
      UUID: activeCode,
      Master_Company_UUID: (await getCMPUUID()) || '',
      Master_Environment_UUID: (await getENVUUID()) || '',
      ERExpenseHeader_UUID: headerUuidRef?.current || headerUuid || '',
      UserUUID: (await getUUID()) || '',
      UnitType_UUID: selectedUnitType?.id || '',
      UnitCost: form.unitCost,
      Quantity: form.quantity,
      TaxAmount: form.taxAmount,
      Document_Date: dateOnly(documentDate || form.documentDate),
      BillUrl: billFilePath || '',
      Expense_Remarks: form.purpose,
      // documentFile: selectedAttachment ? { uri: selectedAttachment.uri, name: selectedAttachment.name || 'bill', type: selectedAttachment.type || 'application/octet-stream' } : undefined,
    };

    try {
      setAdding(true);
      try { console.log('Update Expense Line payload:', JSON.stringify(linePayload, null, 2)); } catch (_e) { }
      await updateExpenseLine(linePayload);
      await loadHeaderLines();
      showInfoSheet({
        title: 'Success',
        message: 'Expense line updated successfully.',
        confirmText: 'OK',
      });
      // After successful update, reset to allow adding a new line immediately
      resetLineForm();
    } catch (e) {
      Alert.alert('Update failed', String(e?.response?.data?.Message || e?.message || 'Failed to update line'));
    } finally {
      setAdding(false);
    }
  };

  // Reset line-entry fields to enable adding a fresh line after update
  const resetLineForm = () => {
    setSelectedUnitType(null);
    setSelectedAttachment(null);
    setBillFilePath(null);
    setDocumentDate(null);
    setActiveCode(null);
    setForm(prev => ({
      ...prev,
      quantity: '',
      unitType: '',
      unitCost: '',
      totalCost: '',
      taxAmount: '',
      billAmount: '',
      documentDate: '',
      purpose: '',
    }));
  };

  // Small action button always adds a new line (edit and create modes)

  // Load projects, countries, and expense types on component mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [projResp] = await Promise.all([
          fetchUserProjects(),
          loadCountries(),
          loadExpenseTypes(),
          loadExpenseUnits(),
        ]);
        const projectsRaw = Array.isArray(projResp?.Data?.Projects) ? projResp.Data.Projects : [];
        const projectOptions = projectsRaw
          .filter(p => p && p.Project_Title)
          .map(p => ({ id: p.UUID || p.Uuid || p.id, name: String(p.Project_Title) }));
        if (isMounted) setProjects(projectOptions);

        // If in edit mode, load expense data after basic data is loaded
        if (isEditMode && editHeaderUuid) {
          await loadExpenseForEdit();
        }
      } catch (e) {
        console.error('Error in loadData:', e);
        if (isMounted) setError(e?.message || 'Failed to load data');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
      try { controller.abort(); } catch (_e) { }
    };
  }, [isEditMode, editHeaderUuid]);


  // Show loader while projects are loading, or while edit-mode auto-fill hasn't completed
  if ((loading && projects.length === 0) || (isEditMode && !isDataLoaded)) {
    return <Loader />;
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title={isEditMode ? "Edit Expense" : "Expense Reimbursement"}
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        
       
          <HeaderLabel title="Expense Information" /> 

        <Dropdown
          placeholder="Project Name"
          value={selectedProject?.name}
          options={projects.length ? projects : sampleProjects}
          getLabel={(p) => p.name}
          getKey={(p) => p.id}
          hint="Project Name"
          onSelect={handleSelectProject}
        />

        <Dropdown
          placeholder="Project Task"
          value={selectedTask?.name}
          options={availableTasks}
          getLabel={(t) => t.name}
          getKey={(t) => t.id}
          hint="Project Task"
          disabled={!selectedProject}
          onSelect={handleSelectTask}
        />


        <View style={styles.row}>
          <View style={styles.half}>
            <LabeledInput placeholder="From Date" rightIcon="calendar-today" value={form.fromDate || formatDate(fromDate)} onPress={() => setOpenFrom(true)} />
          </View>
          <View style={styles.half}>
            <LabeledInput placeholder="To Date" rightIcon="calendar-today" value={form.toDate || formatDate(toDate)} onPress={() => setOpenTo(true)} />
          </View>
        </View>

        <Dropdown
          placeholder="Expense Type"
          value={selectedExpenseType?.ExpenseTypeName || selectedExpenseType?.Name || ''}
          options={expenseTypes}
          getLabel={(expenseType) => expenseType?.ExpenseTypeName || expenseType?.Name || expenseType?.expenseTypeName || String(expenseType)}
          getKey={(expenseType) => expenseType?.Uuid || expenseType?.UUID || expenseType?.id || String(expenseType)}
          hint="Expense Type"
          onSelect={(expenseType) => {
            setSelectedExpenseType(expenseType);
            updateForm('expenseType')(expenseType?.ExpenseTypeName || expenseType?.Name || '');
            if (!((expenseType?.Uuid || expenseType?.UUID) === 'OTHER')) {
              setOtherExpenseType('');
            }
          }}
          loading={loadingExpenseTypes}
        />

        {(selectedExpenseType?.Uuid === 'OTHER' || selectedExpenseType?.UUID === 'OTHER') && (
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.textInput}
              placeholder="Type Expense Name"
              placeholderTextColor="#8e8e93"
              value={otherExpenseType}
              onChangeText={setOtherExpenseType}
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => { }}
            />
          </View>
        )}

        <HeaderLabel title="Location Parameter Section" />

        <Dropdown
          placeholder="Country"
          value={selectedCountry?.CountryName || ''}
          options={countries}
          getLabel={(country) => country?.CountryName || country?.Name || country?.countryName || String(country)}
          getKey={(country) => country?.Uuid || country?.UUID || country?.id || String(country)}
          hint="Country"
          onSelect={handleCountrySelect}
          loading={loadingCountries}
        />

        <Dropdown
          placeholder="State"
          value={selectedState?.StateName || ''}
          options={states}
          getLabel={(state) => state.StateName}
          getKey={(state) => state.Uuid}
          hint="State"
          onSelect={handleStateSelect}
          loading={loadingStates}
          disabled={!selectedCountry}
        />

        <Dropdown
          placeholder="City"
          value={selectedCity?.CityName || ''}
          options={cities}
          getLabel={(city) => city.CityName}
          getKey={(city) => city.Uuid}
          hint="City"
          onSelect={handleCitySelect}
          loading={loadingCities}
          disabled={!selectedState}
        />

        <Dropdown
          placeholder="Currency"
          value={selectedCurrency?.Currency_Name || selectedCurrency?.CurrencyName || selectedCurrency?.Name || ''}
          options={currencies}
          getLabel={(currency) => currency?.Currency_Name || currency?.CurrencyName || currency?.Name || currency?.currencyName || String(currency)}
          getKey={(currency) => currency?.UUID || currency?.Uuid || currency?.id || String(currency)}
          hint="Currency"
          onSelect={(currency) => {
            setSelectedCurrency(currency);
            updateForm('currency')(currency?.Currency_Name || currency?.CurrencyName || currency?.Name || '');
          }}
          loading={loadingCurrencies}
          disabled={!selectedCountry}
        />
      <View ref={headerRef}>
        <HeaderLabel title="Expense Parameter Section" />
      </View>

        <LabeledInput 
          placeholder="Quantity"
          value={form.quantity}
          onPress={() => { }}
          editable={true}
          onChangeText={updateForm('quantity')}
          inputRef={quantityRef}
          onSubmitEditing={() => unitCostRef.current?.focus()}
        />

        <Dropdown
          placeholder="Unit Type"
          value={selectedUnitType?.name || form.unitType}
          options={unitTypes}
          getLabel={(t) => t.name}
          getKey={(t) => t.id}
          hint="Unit Type"
          onSelect={(t) => {
            setSelectedUnitType(t);
            updateForm('unitType')(t?.name || '');
            // after choosing unit type, move to Unit Cost field
            setTimeout(() => unitCostRef.current?.focus(), 0);
          }}
          loading={loadingUnits}
        />

        <LabeledInput
          placeholder="Unit Cost"
          value={form.unitCost}
          onPress={() => { }}
          editable={true}
          onChangeText={updateForm('unitCost')}
          inputRef={unitCostRef}
          onSubmitEditing={() => taxAmountRef.current?.focus()}
        />
        <LabeledInput
          placeholder="Total Cost (auto fill)"
          value={form.totalCost}
          onPress={() => { }}
          editable={false}
          onChangeText={() => { }}
        />
        <LabeledInput
          placeholder="Tax Amount"
          value={form.taxAmount}
          onPress={() => { }}
          editable={true}
          onChangeText={updateForm('taxAmount')}
          inputRef={taxAmountRef}
          onSubmitEditing={() => { }}
        />
        <LabeledInput
          placeholder="Bill Amount (auto fill)"
          value={form.billAmount}
          onPress={() => { }}
          editable={false}
          onChangeText={() => { }}
        />
        <LabeledInput placeholder="Document Date" rightIcon="calendar-today" value={form.documentDate || formatDate(documentDate)} onPress={() => setOpenDoc(true)} />

        <HeaderLabel title="General Info" />

        <TouchableOpacity activeOpacity={0.85} style={styles.uploadRow} onPress={handlePickDocument}>

          <Text style={styles.uploadText} numberOfLines={1} ellipsizeMode="tail">{'Upload Bill/Slip'}</Text>
          <TouchableOpacity activeOpacity={0.8} style={styles.uploadButton} onPress={handlePickDocument}>
            <Icon name="cloud-upload" size={rf(4)} color="#fff" />
          </TouchableOpacity>

        </TouchableOpacity>
        <Text style={styles.uploadHint}>Allowed: PDF, PNG, JPG • Max size 10 MB</Text>

        {/* Below-field file preview (image square or PDF card) */}
        {selectedAttachment && (
          <View style={styles.previewCard}>
            {isImageFile(selectedAttachment) && !!selectedAttachment?.uri ? (
              <View style={{ alignItems: 'flex-start' }}>
                <Image
                  source={{ uri: selectedAttachment.uri }}
                  style={styles.previewThumb}
                  resizeMode="cover"
                />
                {!!selectedAttachment?.name && (
                  <Text style={styles.previewFileName} numberOfLines={1} ellipsizeMode="tail">{selectedAttachment.name}</Text>
                )}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedAttachment(null)}
                  style={styles.previewRemove}
                >
                  <Icon name="close" size={rf(3.6)} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.pdfRow}>
                <View style={styles.pdfIconWrap}>
                  <Icon name="picture-as-pdf" size={rf(6)} color="#ef4444" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.previewFileName} numberOfLines={2} ellipsizeMode="tail">{selectedAttachment?.name || 'Selected file'}</Text>
                  <Text style={styles.previewMeta}>Tap Upload to replace or use X to remove</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setSelectedAttachment(null)}
                  style={styles.removeInline}
                >
                  <Icon name="close" size={rf(3.8)} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.remarkBox}>
          <TextInput
            ref={remarksRef}
            style={styles.remarkInput}
            placeholder="Purpose of Expense (Remarks)"
            placeholderTextColor="#8e8e93"
            multiline
            value={form.purpose}
            onChangeText={updateForm('purpose')}
            returnKeyType="done"
            blurOnSubmit={true}
            onSubmitEditing={() => { }}
          />
        </View>

        <View style={styles.applyRow}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => setApplyForApproval(prev => !prev)} style={[styles.checkbox, applyForApproval && styles.checkboxChecked]}>
            {applyForApproval && <Icon name="check" size={rf(3.4)} color="#fff" />}
          </TouchableOpacity>
          <Text style={styles.applyText}>Apply for Approval</Text>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.addBtnSmall}
            onPress={() => {
              if (adding || submitting) return;
              if (activeCode) {
                handleUpdateLine();
              } else {
                handleAdd();
              }
            }}
            disabled={adding || submitting}
          >
            <Text style={styles.addBtnSmallText}>
              {adding ? 'Adding...' : (activeCode ? 'Update' : 'Add')}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.tableTitle}>Expenses</Text>
        {items.length === 0 ? (
          <View style={styles.tableEmpty}>
            <Text style={styles.tableEmptyText}>No data available</Text>
          </View>
        ) : (
          items.map((item) => (
            <AccordionItem
              key={item.soleExpenseCode}
              item={item}
              isActive={activeCode === item.soleExpenseCode}
              onToggle={() => handleToggle(item.soleExpenseCode)}
              onEdit={handleEdit}
              onDelete={openDeleteSheet}
              headerLeftLabel="Expense"
              headerRightLabel="Bill Amount"
              customRows={[
                { label: 'Bill Amount', value: `₹ ${item.billAmount}` },
                { label: 'Bill URL', value: item.billUrl || 'No file' },
                { label: 'Document Date', value: item.documentDate },
                //{ label: 'ER Expense Header UUID', value: item.erExpenseHeaderUuid },
                { label: 'Expense Remarks', value: item.expenseRemarks || 'No remarks' },
                { label: 'Expense Type', value: item.expenseType },
                { label: 'Quantity', value: item.quantity },
                { label: 'Tax Amount', value: `₹ ${item.taxAmount}` },
                { label: 'Total Cost', value: `₹ ${item.totalCost}` },
                { label: 'Unit Cost', value: `₹ ${item.unitCost}` },
                //{ label: 'Unit Type UUID', value: item.unitTypeUuid },
              ]}
            />
          ))
        )}

        <View style={styles.footerButtons}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={styles.submitBtn}
            onPress={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Aggregate required-field validation into one message
              const missing = [];
              if (!selectedProject) missing.push('Project');
              if (!selectedExpenseType) {
                missing.push('Expense Type');
              } else if ((selectedExpenseType?.Uuid === 'OTHER' || selectedExpenseType?.UUID === 'OTHER') && !otherExpenseType.trim()) {
                missing.push('Expense name for "Other"');
              }
              if (items.length === 0) missing.push('At least one expense line');

              if (missing.length > 0) {
                const message = `Please complete the following before submitting:\n\n• ${missing.join('\n• ')}`;
                setValidationMessage(message);
                setValidationVisible(true);
                return;
              }
              setConfirmVisible(true);
            }}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>{submitting ? 'Submitting...' : (isEditMode ? 'Update' : 'Submit')}</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <BottomSheetConfirm
        visible={confirmVisible}
        title={isEditMode ? 'Update Expense?' : 'Submit Expense?'}
        message={isEditMode ? "Are you sure you want to update this expense?" : "You won't be able to revert this!"}
        confirmText={isEditMode ? 'Yes, update it!' : 'Yes, submit it!'}
        cancelText={'No, Cancel!'}
        onConfirm={handleSubmit}
        onCancel={() => setConfirmVisible(false)}
      />

      {/* Validation message sheet (single action) */}
      <BottomSheetConfirm
        visible={validationVisible}
        title={'Missing data'}
        snapPoints={[hp(60)]}
        message={'Please fill all the required fields before submitting.'}
        confirmText={'OK'}
        cancelText={''}
        onConfirm={() => setValidationVisible(false)}
        onCancel={() => setValidationVisible(false)}
      />

      {/* Delete Confirmation Bottom Sheet (same component as TimesheetScreen) */}
      <BottomSheetConfirm
        visible={deleteConfirmVisible}
        title={'Delete Expense Line'}
        message={'This action cannot be undone.'}
        confirmText={'Delete'}
        cancelText={'Cancel'}
        onConfirm={confirmDeleteLine}
        onCancel={cancelDelete}
      />

      {/* Line add success sheet */}
      <BottomSheetConfirm
        visible={lineAddSheetVisible}
        title={'Success'}
        message={lineAddMessage || 'Expense line added successfully.'}
        confirmText={'OK'}
        cancelText={''}
        onConfirm={() => setLineAddSheetVisible(false)}
        onCancel={() => setLineAddSheetVisible(false)}
      />

      <BottomSheetConfirm
        visible={infoSheet.visible}
        title={infoSheet.title}
        message={infoSheet.message}
        confirmText={infoSheet.confirmText}
        cancelText={infoSheet.cancelText}
        onConfirm={() => {
          hideInfoSheet();
          if (typeof infoSheet.onConfirm === 'function') {
            infoSheet.onConfirm();
          }
        }}
        onCancel={() => {
          hideInfoSheet();
          if (typeof infoSheet.onCancel === 'function') {
            infoSheet.onCancel();
          }
        }}
      />

      <DatePickerBottomSheet
        isVisible={openFrom}
        onClose={() => setOpenFrom(false)}
        selectedDate={fromDate || new Date()}
        onDateSelect={(date) => {
          setFromDate(date);
          updateForm('fromDate')(formatDate(date));
        }}
        title="Select From Date"
        maxDate={(function () { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); })()}
      />

      <DatePickerBottomSheet
        isVisible={openTo}
        onClose={() => setOpenTo(false)}
        selectedDate={toDate || new Date()}
        onDateSelect={(date) => {
          setToDate(date);
          updateForm('toDate')(formatDate(date));
        }}
        title="Select To Date"
        maxDate={(function () { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); })()}
      />

      <DatePickerBottomSheet
        isVisible={openDoc}
        onClose={() => setOpenDoc(false)}
        selectedDate={documentDate || new Date()}
        onDateSelect={(date) => {
          setDocumentDate(date);
          updateForm('documentDate')(formatDate(date));
        }}
        title="Select Document Date"
      />
    </View>
  );
};

export default AddExpenseScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    //paddingTop: safeAreaTop,
  },
  content: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
  },
  sectionHeading: {
    fontSize: rf(3.6),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  // Bottom sheet shared styles (aligned with ManageTimeSheetApproval)
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
    paddingBottom: hp(2.5),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  sheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalTitleText: {
    fontSize: rf(4.2),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  closeButtonIcon: {
    padding: wp(1),
  },
  deleteMessage: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: rf(3.6),
    marginBottom: hp(2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  deleteButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(4),
  },
  deleteConfirmBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
    flex: 1,
  },
  deleteConfirmText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    textAlign: 'center',
  },
  deleteCancelBtn: {
    backgroundColor: '#6b7280',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
    flex: 1,
  },
  deleteCancelText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: wp(3),
  },
  half: {
    flex: 1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(4),
    paddingVertical: wp(1),
    marginTop: hp(1.2),
  },
  textInput: {
    flex: 1,
    fontSize: rf(3.5),
    color: COLORS.textMuted,
    paddingVertical: 0,
    marginRight: wp(2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  uploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2.5),
    paddingLeft: wp(4),
    paddingRight: wp(2),
    height: hp(5.2),
    marginTop: hp(1.2),
  },
  uploadText: {
    fontSize: rf(4.2),
    paddingLeft: wp(1),
    color: '#8e8e93',
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    padding: wp(2),
    borderRadius: wp(2),
    
  },
  uploadHint: {
    marginTop: hp(0.6),
    color: '#8e8e93',
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    fontStyle: 'italic',
  },
  previewCard: {
    marginTop: hp(1),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    borderRadius: wp(2.5),
    padding: wp(3),
  },
  previewWrapper: {
    alignSelf: 'flex-start',
    marginTop: hp(1.2),
    position: 'relative',
  },
  previewInField: {
    marginLeft: wp(3),
    position: 'relative',
  },
  previewThumb: {
    width: wp(20),
    height: wp(20),
    borderRadius: wp(2),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#f9fafb',
  },
  previewRemove: {
    position: 'absolute',
    top: wp(1.5),
    right: wp(1.5),
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: wp(7),
    height: wp(7),
    borderRadius: wp(3.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFileName: {
    marginTop: hp(0.8),
    maxWidth: wp(70),
    color: COLORS.text,
    fontSize: rf(3.6),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  previewMeta: {
    marginTop: hp(0.2),
    color: COLORS.textMuted,
    fontSize: rf(2.8),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  pdfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },
  pdfIconWrap: {
    width: wp(12),
    height: wp(12),
    borderRadius: wp(2),
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: wp(22),
    height: wp(16),
    borderRadius: wp(2),
  },
  removeBadge: {
    position: 'absolute',
    top: -hp(1),
    left: -hp(1),
    backgroundColor: COLORS.primary,
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  removeInline: {
    marginLeft: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  remarkBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(4),
    // paddingVertical: hp(1.2),
    marginTop: hp(1.2),
    minHeight: hp(12),
  },
  remarkInput: {
    minHeight: hp(9),
    textAlignVertical: 'top',
    fontSize: rf(4.2),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  applyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
  },
  checkbox: {
    width: wp(5.2),
    height: wp(5.2),
    borderWidth: 1,
    borderRadius: wp(1),
    borderColor: COLORS.border,
    marginRight: wp(2),
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: rf(3.2),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  addBtnSmall: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
  },
  addBtnSmallText: {
    color: COLORS.bg,
    fontSize: rf(3.2),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  tableTitle: {
    fontSize: rf(3.6),
    fontWeight: '700',
    color: COLORS.text,
    marginTop: hp(2),
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  tableEmpty: {
    alignItems: 'center',
    paddingVertical: hp(3),
  },
  tableEmptyText: {
    color: '#8e8e93',
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(2.5),
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: wp(2.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2),
    flex: 1,
    marginRight: wp(3),
  },
  submitBtnText: {
    color: COLORS.bg,
    fontSize: rf(3.6),
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  cancelBtn: {
    backgroundColor: '#374151',
    paddingVertical: wp(2.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2),
    flex: 1,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  editModeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: wp(2),
    marginBottom: hp(1.5),
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  editModeText: {
    fontSize: rf(3.2),
    color: COLORS.primary,
    marginLeft: wp(2),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    flex: 1,
  },
}); 
