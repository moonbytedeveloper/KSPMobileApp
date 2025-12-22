import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  PermissionsAndroid,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from 'react-native';
import { wp, hp, rf } from '../../../../utils/responsive';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, inputStyles, SPACING, useThemeColors } from '../../../styles/styles';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formStyles } from '../../../styles/styles';
import DatePickerBottomSheet from '../../../../components/common/CustomDatePicker';
import { addSalesOrder, updateSalesOrder, addSalesOrderLine, updateSalesOrderLine, getCustomers, getCountries, getStates, getCities, getPaymentTerms, getPaymentMethods, fetchProjects, getAllSalesInquiryNumbers, getSalesOrderHeaderById, getItems, getSalesLines, getSalesOrderLines, deleteSalesOrderLine, getSalesOrderSlip, uploadFiles } from '../../../../api/authServices';
import { getCMPUUID, getENVUUID } from '../../../../api/tokenStorage';
import { pick, types, isCancel } from '@react-native-documents/picker';

const COL_WIDTHS = {
  ITEM: wp(40),
  DESC: wp(50),
  QTY: wp(30),
  RATE: wp(30),
  AMOUNT: wp(30),
  ACTION: wp(30),
};
const AccordionSection = ({
  id,
  title,
  expanded,
  onToggle,
  children,
  wrapperStyle,
  rightActions,
}) => {
  return (
    <View style={[styles.sectionWrapper, wrapperStyle]}>
      {/* <TouchableOpacity
                activeOpacity={0.8}
                style={styles.sectionHeader}
                onPress={() => {
                  setStatus && setStatus(undefined);
                  setOpenSection1(true);
                  setOpenSection2(false);
                  setOpenSection3(false);
                }}
              >
                <Text style={styles.sectionHeaderText}>Basic Details</Text>
                <Icon name={openSection1 ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.text} />
              </TouchableOpacity> */}
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.sectionHeader}
        onPress={() => onToggle(id)}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {rightActions}
          <Icon
            name={expanded ? 'expand-less' : 'expand-more'}
            size={rf(4.2)}
            color={COLORS.text}
          />
        </View>
      </TouchableOpacity>
      {expanded && <View style={styles.line} />}
      {expanded && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
};

const ManageSalesOrder = () => {
  const themeColors = useThemeColors();
  const [expandedIds, setExpandedIds] = useState([1]);
  const navigation = useNavigation();
  const toggleSection = id => setExpandedIds(prev => {
    const has = Array.isArray(prev) ? prev.includes(id) : prev === id;
    if (has) return (Array.isArray(prev) ? prev.filter(x => x !== id) : []);
    return Array.isArray(prev) ? [...prev, id] : [id];
  });

  // Per-screen theme override: use dark text on forced-white backgrounds
  const screenTheme = {
    ...themeColors,
    text: COLORS.text,
    textLight: COLORS.textLight,
    bg: '#fff',
  };

  // Demo options for dropdowns
  <View style={styles.addButtonWrapperRow}>
    <TouchableOpacity activeOpacity={0.8} style={styles.addButton} onPress={handleAddLineItem}>
      <Text style={styles.addButtonText}>{editItemId ? 'Update' : 'Add'}</Text>
    </TouchableOpacity>
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.addButton, { backgroundColor: '#6c757d', marginLeft: wp(3) }]}
      onPress={() => {
        // Cancel/clear current line editor
        setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null, desc: '', hsn: '', rate: '' });
        setEditItemId(null);
      }}
    >
      <Text style={styles.addButtonText}>Cancel</Text>
    </TouchableOpacity>
  </View>
  // const state = ['Gujarat', 'Delhi', 'Mumbai'];
  // const city = ['vadodara', 'surat',];



  const paymentMethods = [

    'Bank Transfer',
    'Mobile App Development',

  ];

  // Master items (loaded from server)
  const [masterItems, setMasterItems] = useState([]);
  const [masterItemsLoading, setMasterItemsLoading] = useState(false);

  // Load master items from API on mount
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setMasterItemsLoading(true);
        const c = await getCMPUUID();
        const e = await getENVUUID();
        const resp = await getItems({ cmpUuid: c, envUuid: e });
        const rawList = resp?.Data?.Records || resp?.Data || resp || [];
        const list = Array.isArray(rawList) ? rawList : [];
        const normalized = list.map(it => ({
          name: it?.Name || it?.name || it?.ItemName || '',
          sku: it?.SKU || it?.sku || it?.Sku || it?.ItemCode || '',
          rate: (it?.Rate ?? it?.rate ?? it?.Price) || 0,
          desc: it?.Description || it?.description || it?.Desc || '',
          hsn: it?.HSNCode || it?.hsn || it?.HSN || '',
          uuid: it?.UUID || it?.Uuid || it?.uuid || null,
          raw: it,
        }));
        console.log(normalized, 'get itemsss');

        if (mounted) setMasterItems(normalized);
      } catch (err) {
        console.warn('getItems failed', err);
        if (mounted) setMasterItems([]);
      } finally {
        if (mounted) setMasterItemsLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);
  const [SalesInquiryNo, setSalesInquiry] = useState('');
  // Form state
  const [headerForm, setHeaderForm] = useState({
    SalesInquiryUUID: '',
    SalesInquiryNo: '',
    CustomerUUID: '',
    CustomerName: '',
    SalesOrderNo: '',
    DueDays: '',
  });
  const [dueDays, setDueDays] = useState();
  const dueDaysRef = React.useRef('');
  React.useEffect(() => {
    // sync headerForm.DueDays into dueDays when headerForm is prefilled
    try {
      const hf = headerForm?.DueDays;
      if (typeof hf !== 'undefined' && String(hf) !== String(dueDays)) {
        setDueDays(hf ?? 0);
      }
    } catch (e) { /* ignore */ }
  }, [headerForm?.DueDays]);
  const [billingForm, setBillingForm] = useState({
    buildingNo: '',
    street1: '',
    street2: '',
    postalCode: '',
    country: '',
    state: '',
    city: '',
  });
  const [shippingForm, setShippingForm] = useState({
    buildingNo: '',
    street1: '',
    street2: '',
    postalCode: '',
    country: '',
    state: '',
    city: '',
  });
  const [isShippingSame, setIsShippingSame] = useState(false);
  const [items, setItems] = useState([]);
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [headerHasDates, setHeaderHasDates] = useState(false);
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null); // 'invoice' | 'due'
  const [datePickerSelectedDate, setDatePickerSelectedDate] = useState(
    new Date(),
  );
  const [paymentTerm, setPaymentTerm] = useState('');
  const [paymentTermUuid, setPaymentTermUuid] = useState(null);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [project, setProject] = useState('');
  const [projectUUID, setProjectUUID] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentMethodUUID, setPaymentMethodUUID] = useState('');
  const [shippingCharges, setShippingCharges] = useState('0');
  const [adjustments, setAdjustments] = useState('0');
  const [adjustmentLabel, setAdjustmentLabel] = useState('Adjustments');
  const [totalTax, setTotalTax] = useState('0');
  const [serverTotalAmount, setServerTotalAmount] = useState('');
  const [linesLoading, setLinesLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadedFilePath, setUploadedFilePath] = useState(null);
  const [showShippingTip, setShowShippingTip] = useState(false);
  const [showAdjustmentTip, setShowAdjustmentTip] = useState(false);
  const [headerSaved, setHeaderSaved] = useState(false);
  const [headerResponse, setHeaderResponse] = useState(null);
  const [isPrefilling, setIsPrefilling] = useState(false);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [reloadAttempts, setReloadAttempts] = useState(0);
  const MAX_RELOAD_ATTEMPTS = 5;
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [customersOptions, setCustomersOptions] = useState([]);
  const [paymentTermsOptions, setPaymentTermsOptions] = useState([]);
  const [paymentMethodsOptions, setPaymentMethodsOptions] = useState([]);
  const [projectsOptions, setProjectsOptions] = useState([]);
  const [countriesOptions, setCountriesOptions] = useState([]);
  const [salesInquiryNosOptions, setSalesInquiryNosOptions] = useState([]);
  const [statesOptions, setStatesOptions] = useState([]);
  const [citiesOptions, setCitiesOptions] = useState([]);
  const [shippingStatesOptions, setShippingStatesOptions] = useState([]);
  const [shippingCitiesOptions, setShippingCitiesOptions] = useState([]);
  // Selected objects for billing/shipping dropdowns (LeadForm pattern)
  const [selectedBillingCountry, setSelectedBillingCountry] = useState(null);
  const [selectedBillingState, setSelectedBillingState] = useState(null);
  const [selectedBillingCity, setSelectedBillingCity] = useState(null);
  const [selectedShippingCountry, setSelectedShippingCountry] = useState(null);
  const [selectedShippingState, setSelectedShippingState] = useState(null);
  const [selectedShippingCity, setSelectedShippingCity] = useState(null);
  const route = useRoute();

  // Helper to prefill header/billing/shipping from a server/object payload
  const prefillFromData = (data) => {
    if (!data) return;
    try {
      const resolveUuid = (val) => {
        if (!val) return '';
        if (typeof val === 'string') return val;
        return val?.UUID || val?.Uuid || val?.Id || val?.Id || val?.CountryUuid || val?.CountryId || '';
      };
      // Prefill header fields (best-effort mapping)
      setHeaderForm(s => ({
        ...s,
        SalesOrderNo: data?.SalesOrderNo || data?.SalesOrderNumber || data?.SalesOrder || s.SalesOrderNo || '',
        SalesInquiryNo: data?.InquiryNo || data?.SalesInquiryNo || data?.SalesInquiryNumber || s.SalesInquiryNo || '',
        SalesInquiryUUID: data?.SalesInquiryUUID || data?.SalesInquiryId || data?.SalesInquiry || data?.InquiryNo || s.SalesInquiryUUID || '',
        CustomerUUID: data?.CustomerUUID || data?.CustomerId || data?.Customer || s.CustomerUUID || '',
        CustomerName: data?.CustomerName || data?.Customer || data?.CustomerDisplayName || s.CustomerName || '',
        DueDays: data?.DueDays || data?.PaymentDueDays || data?.OrderDays || data?.Days || s.DueDays || '',
      }));

      // Set SalesInquiry display value from InquiryNo
      if (data?.InquiryNo) {
        setSalesInquiry(data.InquiryNo);
      }

      // Also set dueDays state directly
      const daysValue = data?.DueDays || data?.PaymentDueDays || data?.OrderDays || data?.Days || '';
      if (daysValue) {
        setDueDays(String(daysValue));
      }

      // Set UUID states for proper dropdown mapping (only if not empty)
      if ((data?.PaymentTermUUID || data?.PaymentTermsUUID) && (data.PaymentTermUUID?.trim() !== '' || data.PaymentTermsUUID?.trim() !== '')) {
        const termUuid = data.PaymentTermUUID || data.PaymentTermsUUID;
        setPaymentTermUuid(termUuid);
      }
      if (data?.PaymentMethodUUID && data.PaymentMethodUUID.trim() !== '') {
        setPaymentMethodUUID(data.PaymentMethodUUID);
      }
      if (data?.ProjectUUID && data.ProjectUUID.trim() !== '') {
        setProjectUUID(data.ProjectUUID);
      }

      // Set additional form states
      if (data?.Notes !== undefined) setNotes(data.Notes || '');
      if (data?.TermsConditions !== undefined) setTerms(data.TermsConditions || '');
      if (data?.ShippingCharges !== undefined) setShippingCharges(String(data.ShippingCharges || 0));
      if (data?.AdjustmentField !== undefined) setAdjustmentLabel(data.AdjustmentField || 'Adjustments');
      if (data?.AdjustmentPrice !== undefined) setAdjustments(String(data.AdjustmentPrice || 0));
      if (data?.TotalTax !== undefined) setTotalTax(String(data.TotalTax || 0));
      try {
        const headerTotal = data?.TotalAmount ?? data?.NetAmount ?? data?.HeaderTotalAmount ?? data?.SubTotal ?? null;
        if (headerTotal !== null && typeof headerTotal !== 'undefined') setServerTotalAmount(String(headerTotal));
      } catch (e) { /* ignore */ }

      // Set response data if this is a saved header
      if (data?.UUID) {
        setHeaderResponse(data);
        setHeaderSaved(true);
      }

      // Prefill billing (best-effort keys)
      setBillingForm({
        buildingNo: data?.BillingBuildingNo || data?.Billing?.buildingNo || data?.BillingBuilding || data?.BillBuilding || '',
        street1: data?.BillingStreet1 || data?.Billing?.street1 || data?.billingStreet1 || data?.Street1 || '',
        street2: data?.BillingStreet2 || data?.Billing?.street2 || data?.billingStreet2 || '',
        postalCode: data?.BillingPostalCode || data?.Billing?.postalCode || data?.PostalCode || data?.billingPostal || '',
        country: data?.BillingCountryUUID || resolveUuid(data?.BillingCountry || data?.BillingCountryName || data?.Country) || '',
        state: data?.BillingStateUUID || resolveUuid(data?.BillingState || data?.State) || '',
        city: data?.BillingCityUUID || resolveUuid(data?.BillingCity || data?.City) || '',
      });

      // Set billing UUID states for dropdowns - defer to useEffect for proper mapping
      // Store UUIDs directly, let useEffect map them to proper objects when options load
      // if (data?.BillingCountryUUID) setSelectedBillingCountry(data.BillingCountryUUID);
      // if (data?.BillingStateUUID) setSelectedBillingState(data.BillingStateUUID);
      // if (data?.BillingCityUUID) setSelectedBillingCity(data.BillingCityUUID);

      // Prefill shipping (best-effort keys)
      setShippingForm({
        buildingNo: data?.ShippingBuildingNo || data?.Shipping?.buildingNo || data?.ShipBuilding || '',
        street1: data?.ShippingStreet1 || data?.Shipping?.street1 || data?.ShipStreet1 || '',
        street2: data?.ShippingStreet2 || data?.Shipping?.street2 || data?.ShipStreet2 || '',
        postalCode: data?.ShippingPostalCode || data?.Shipping?.postalCode || data?.ShipPostal || '',
        country: data?.ShippingCountryUUID || resolveUuid(data?.ShippingCountry || data?.ShipCountry) || '',
        state: data?.ShippingStateUUID || resolveUuid(data?.ShippingState || data?.ShipState) || '',
        city: data?.ShippingCityUUID || resolveUuid(data?.ShippingCity || data?.ShipCity) || '',
      });

      // Set shipping UUID states for dropdowns - defer to useEffect for proper mapping
      // Store UUIDs directly, let useEffect map them to proper objects when options load
      // if (data?.ShippingCountryUUID) setSelectedShippingCountry(data.ShippingCountryUUID);
      // if (data?.ShippingStateUUID) setSelectedShippingState(data.ShippingStateUUID);
      // if (data?.ShippingCityUUID) setSelectedShippingCity(data.ShippingCityUUID);

      // Prefill IsShipAddrSame checkbox
      const shipSame = data?.IsShipAddrSame === true || data?.IsShipAddrSame === 'true' || data?.IsShipAddrSame === 'True' || data?.IsShipAddrSame === 1 || data?.Is_ShipAddrSame === true || data?.IsShipAddrSame === 'Y' || data?.IsShipAddrSame === 'y';
      setIsShippingSame(shipSame);

      // Copy billing to shipping if they're the same - this is handled above in the shipping form set
      // No need for additional setTimeout as shipping form is already set correctly

      // Prefill project / payment term / payment method / sales inquiry display + UUIDs
      // Project
      const projUuid = data?.ProjectUUID || data?.ProjectId || data?.Project || data?.ProjectUuid || data?.Project_Id || null;
      if (projUuid && projUuid.trim() !== '') {
        setProjectUUID(projUuid);
        setProject(data?.ProjectTitle || data?.ProjectName || data?.Project || '');
      } else {
        // Clear project fields if UUID is empty
        setProjectUUID('');
        setProject('');
      }

      // Payment term
      const pTermUuid = data?.PaymentTermUUID || data?.PaymentTermsUUID || data?.PaymentTermId || data?.PaymentTerm || data?.PaymentTermUuid || null;
      if (pTermUuid && pTermUuid.trim() !== '') {
        setPaymentTermUuid(pTermUuid);
        setPaymentTerm(data?.PaymentTermName || data?.PaymentTerm || data?.Term || '');
      } else {
        // Clear payment term fields if UUID is empty
        setPaymentTermUuid('');
        setPaymentTerm('');
      }

      // Payment method
      const pMethodUuid = data?.PaymentMethodUUID || data?.PaymentMethodId || data?.PaymentMethod || data?.PaymentMethodUuid || null;
      if (pMethodUuid && pMethodUuid.trim() !== '') {
        setPaymentMethodUUID(pMethodUuid);
        setPaymentMethod(data?.PaymentMethodName || data?.PaymentMethod || data?.Mode || '');
      } else {
        // Clear payment method fields if UUID is empty
        setPaymentMethodUUID('');
        setPaymentMethod('');
      }

      // Sales Inquiry display (support multiple key names and nested structures)
      // InquiryNo from API response should be treated as the UUID for Sales Inquiry
      const sinqUuid = data?.InquiryNo || data?.SalesInquiryUUID || data?.SalesInquiryId || data?.SalesInquiry || data?.SalesInquiryUuid || data?.Header?.SalesInquiryUUID || data?.Header?.SalesInquiryId || null;
      // immediate attempt to set SalesInquiry display value from many possible keys
      const immediateInquiryNo = data?.SalesInquiryNo || data?.SalesInquiryNumber || data?.SalesInquiry || data?.InquiryNo || data?.InquiryNumber || data?.Inquiry || data?.Header?.SalesInquiryNo || data?.Header?.InquiryNo || data?.Header?.SalesInquiryNumber || null;

      if (sinqUuid && sinqUuid.trim() !== '') {
        setHeaderForm(s => ({ ...s, SalesInquiryUUID: sinqUuid, SalesInquiryNo: immediateInquiryNo || sinqUuid }));
        // Only set the display name if we have it immediately, otherwise let useEffect handle UUID->name mapping
        if (immediateInquiryNo && immediateInquiryNo.trim() !== '') {
          setSalesInquiry(immediateInquiryNo);
        } else {
          // Clear the display value so useEffect can map UUID to name from salesInquiryNosOptions
          setSalesInquiry('');
        }
      } else if (immediateInquiryNo && immediateInquiryNo.trim() !== '') {
        // If we have name but no UUID, set the name
        setSalesInquiry(immediateInquiryNo);
        setHeaderForm(s => ({ ...s, SalesInquiryUUID: immediateInquiryNo, SalesInquiryNo: immediateInquiryNo }));
      } else {
        // Clear sales inquiry fields if both are empty
        setSalesInquiry('');
        setHeaderForm(s => ({ ...s, SalesInquiryUUID: '', SalesInquiryNo: '' }));
      }

      // Dates: robust parsing for various server date formats -> UI format dd-MMM-yyyy
      const parseDateVal = (d) => {
        if (!d && d !== 0) return null;
        if (typeof d === 'number') return new Date(d);
        if (typeof d === 'string') {
          // Direct dd-MMM-yyyy format (already in UI format)
          if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(d)) return d; // Return as-is if already in UI format
          // MS JSON format: /Date(1234567890)/
          const ms = d.match(/\/Date\((\d+)(?:[+-]\d+)?\)\//);
          if (ms) return new Date(parseInt(ms[1], 10));
          // plain numeric string
          if (/^\d+$/.test(d)) return new Date(parseInt(d, 10));
          // ISO or yyyy-mm-dd or yyyy/mm/dd
          const iso = new Date(d);
          if (!isNaN(iso)) return iso;
          // try yyyy-mm-dd or yyyy/mm/dd fallback
          const ymd = d.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
          if (ymd) return new Date(`${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}T00:00:00Z`);
        }
        return null;
      };
      const formatForUi = (d) => {
        try {
          const parsed = parseDateVal(d);
          if (!parsed || isNaN(parsed)) return '';
          const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const dd = String(parsed.getDate()).padStart(2, '0');
          const mmm = months[parsed.getMonth()];
          const yyyy = String(parsed.getFullYear());
          return `${dd}-${mmm}-${yyyy}`;
        } catch (e) { return '' }
      };

      // If API already returns dates in dd-MMM-yyyy (e.g. "13-Nov-2025"), bind them directly
      const simpleDatePattern = /^\d{1,2}-[A-Za-z]{3}-\d{4}$/;
      if (typeof data?.OrderDate === 'string' && simpleDatePattern.test(data.OrderDate)) {
        setInvoiceDate(data.OrderDate);
        const parsed = parseDateVal(data.OrderDate);
        if (parsed && !isNaN(parsed)) setDatePickerSelectedDate(parsed);
        setHeaderHasDates(true);
      }
      if (typeof data?.DueDate === 'string' && simpleDatePattern.test(data.DueDate)) {
        setDueDate(data.DueDate);
        const parsed2 = parseDateVal(data.DueDate);
        if (parsed2 && !isNaN(parsed2)) setDatePickerSelectedDate(parsed2);
        setHeaderHasDates(true);
      }

      // try many candidate keys including nested Header/Order structures (fallback)
      const orderCandidates = [
        data?.OrderDate,
        data?.Order_Date,
        data?.DeliveryDate,
        data?.OrderDateUTC,
        data?.OrderDT,
        data?.InvoiceDate,
        data?.Invoice_Date,
        data?.Header?.OrderDate,
        data?.Header?.InvoiceDate,
        data?.Order?.OrderDate,
        data?.Header?.Order_Date,
      ];
      const dueCandidates = [
        data?.DueDate,
        data?.PaymentDueDate,
        data?.Due_Date,
        data?.PaymentDue,
        data?.Header?.DueDate,
        data?.Order?.DueDate,
        data?.Header?.Due_Date,
      ];

      const firstOrder = orderCandidates.find(v => v !== undefined && v !== null);
      const firstDue = dueCandidates.find(v => v !== undefined && v !== null);
      if (firstOrder || firstDue) setHeaderHasDates(true);
      if (!invoiceDate && firstOrder) {
        const v = formatForUi(firstOrder);
        if (v && v !== '') {
          setInvoiceDate(v);
          const pd = parseDateVal(firstOrder);
          if (pd && !isNaN(pd)) setDatePickerSelectedDate(pd);
        } else if (typeof firstOrder === 'string') {
          // final fallback: show raw string if parsing failed
          setInvoiceDate(firstOrder);
        }
      }
      if (!dueDate && firstDue) {
        const v2 = formatForUi(firstDue);
        if (v2 && v2 !== '') {
          setDueDate(v2);
          const pd2 = parseDateVal(firstDue);
          if (pd2 && !isNaN(pd2)) setDatePickerSelectedDate(pd2);
        } else if (typeof firstDue === 'string') {
          // final fallback: show raw string if parsing failed
          setDueDate(firstDue);
        }
      }

      // Focus header for editing; do not show Create Order until header is updated
      // Also open Billing and Shipping sections for convenience
      // Prefill dates - handle dd-MMM-yyyy format from API
      if (data?.OrderDate) {
        const orderDate = data.OrderDate;
        if (typeof orderDate === 'string') {
          setInvoiceDate(orderDate);
          setHeaderHasDates(true);
        }
      }
      if (data?.DueDate) {
        const dueDate = data.DueDate;
        if (typeof dueDate === 'string') {
          setDueDate(dueDate);
          setHeaderHasDates(true);
        }
      }

      // Bind any header-level totals if present in the payload
      try {
        const headerTax = data?.TotalTax ?? data?.TaxAmount ?? data?.HeaderTotalTax ?? null;
        const headerTotal = data?.TotalAmount ?? data?.NetAmount ?? data?.HeaderTotalAmount ?? data?.SubTotal ?? null;
        if (headerTax !== null && typeof headerTax !== 'undefined') setTotalTax(String(headerTax));
        if (headerTotal !== null && typeof headerTotal !== 'undefined') setServerTotalAmount(String(headerTotal));
      } catch (e) { /* ignore */ }

      // Prefill notes, terms, shipping charges, adjustments
      if (data?.Notes || data?.CustomerNotes || data?.Note) {
        setNotes(data.Notes || data.CustomerNotes || data.Note || '');
      }
      if (data?.TermsConditions || data?.Terms || data?.TermsAndConditions) {
        setTerms(data.TermsConditions || data.Terms || data.TermsAndConditions || '');
      }
      // Set shipping charges (handle null/zero values)
      const shippingCharges = data?.ShippingCharges;
      if (shippingCharges !== undefined) {
        setShippingCharges(String(shippingCharges || 0));
      }

      // Set adjustments (handle null/zero values)
      const adjustmentPrice = data?.AdjustmentPrice;
      if (adjustmentPrice !== undefined) {
        setAdjustments(String(adjustmentPrice || 0));
      }

      if (data?.AdjustmentField) {
        setAdjustmentLabel(String(data.AdjustmentField));
      }

      setIsEditingHeader(true);
      setHeaderSaved(false);
      setExpandedIds([1, 2, 3]);
    } catch (e) {
      console.log('Prefill error', e);
    }
  };

  // If navigated here from ViewSalesOrder with prefillHeader param, populate header/billing/shipping
  useEffect(() => {
    const p = route?.params?.prefillHeader;
    if (!p) return;
    const data = p?.Data || p;
    (async () => {
      try {
        setIsPrefilling(true);
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay to show loader
        prefillFromData(data);
      } finally {
        setIsPrefilling(false);
      }
    })();
  }, [route?.params?.prefillHeader, route?.params]);

  // If navigated with headerUuid (or headerUuid + cmpUuid/envUuid), call server to fetch header
  useEffect(() => {
    const headerUuid = route?.params?.headerUuid || route?.params?.HeaderUUID || route?.params?.UUID;
    if (!headerUuid) return;
    (async () => {
      setIsPrefilling(true);
      try {
        const cmpUuid = route?.params?.cmpUuid || route?.params?.cmpUUID || route?.params?.cmp || undefined;
        const envUuid = route?.params?.envUuid || route?.params?.envUUID || route?.params?.env || undefined;
        const resp = await getSalesOrderHeaderById({ headerUuid, cmpUuid, envUuid });
        console.log(resp, '33');
        const data = resp?.Data || resp || null;
        if (data) {
          setHeaderResponse(data);
          prefillFromData(data);
          // load saved lines for this header
          try { await loadSalesOrderLines(data?.UUID || headerUuid); } catch (e) { /* ignore */ }
        }
      } catch (e) {
        console.warn('Error loading sales order header by id', e?.message || e);
      } finally {
        // ensure loader hides after prefill attempt
        setIsPrefilling(false);
      }
    })();
  }, [route?.params?.headerUuid, route?.params?.cmpUuid, route?.params?.envUuid, route?.params]);

  // Current item being entered in the LINE form
  const [currentItem, setCurrentItem] = useState({
    itemType: '',
    itemTypeUuid: null,
    itemName: '',
    itemNameUuid: null,
    quantity: '',
    unit: '',
    unitUuid: null,
    desc: '',
    hsn: '',
    rate: '',
  });
  const [editItemId, setEditItemId] = useState(null);
  // Table controls: search + pagination
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [5, 10, 25, 50];

  // Simple unit / itemType lists (can be replaced with server data)
  const demoItemTypes = ['Furniture', 'Electronics', 'Accessories'];
  const units = ['pcs', 'kg', 'meter', 'set'];

  // Helper to safely render labels for values which may be objects or strings
  const renderLabel = (val, keys = []) => {
    try {
      if (val === null || typeof val === 'undefined') return '';
      if (typeof val === 'string' || typeof val === 'number') return String(val);
      if (typeof val === 'object') {
        for (let k of keys) {
          if (val && (val[k] || val[k] === 0)) return String(val[k]);
        }
        // common fallbacks
        if (val.Name) return String(val.Name);
        if (val.CustomerName) return String(val.CustomerName);
        if (val.DisplayName) return String(val.DisplayName);
        if (val.InquiryNo) return String(val.InquiryNo);
        if (val.ProjectTitle) return String(val.ProjectTitle);
        if (val.Term) return String(val.Term);
        if (val.Mode) return String(val.Mode);
        if (val.UUID) return String(val.UUID);
        return JSON.stringify(val);
      }
      return String(val);
    } catch (e) {
      return '';
    }
  };

  // Permission handling for Android
  const requestStoragePermissionAndroid = async () => {
    if (Platform.OS !== 'android') return true;

    const sdkVersion = Platform.constants?.Release
      ? Number(Platform.constants.Release)
      : 0;

    // On Android 13 (API 33+) use READ_MEDIA_*; otherwise use READ_EXTERNAL_STORAGE
    if (Platform.Version >= 33) {
      const readImages = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      );
      return readImages === PermissionsAndroid.RESULTS.GRANTED;
    }

    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const copyBillingToShipping = () => {
    setShippingForm({ ...billingForm });
    setSelectedShippingCountry(selectedBillingCountry);
    setSelectedShippingState(selectedBillingState);
    setSelectedShippingCity(selectedBillingCity);
    setIsShippingSame(true);
  };

  // Toggle copy: if already copied, clear shipping form and uncheck
  const toggleCopyBillingToShipping = () => {
    if (!isShippingSame) {
      setShippingForm({ ...billingForm });
      setSelectedShippingCountry(selectedBillingCountry);
      setSelectedShippingState(selectedBillingState);
      setSelectedShippingCity(selectedBillingCity);
      setIsShippingSame(true);
    } else {
      setShippingForm({
        buildingNo: '',
        street1: '',
        street2: '',
        postalCode: '',
        country: '',
        state: '',
        city: '',
      });

      setSelectedShippingCountry(null);
      setSelectedShippingState(null);
      setSelectedShippingCity(null);
      setIsShippingSame(false);
    }
  };

  const formatUiDate = date => {
    try {
      const d = new Date(date);
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const dd = String(d.getDate()).padStart(2, '0');
      const mmm = months[d.getMonth()];
      const yyyy = String(d.getFullYear());
      return `${dd}-${mmm}-${yyyy}`;
    } catch (e) {
      return '';
    }
  };

  const uiDateToApiDate = uiDateStr => {
    if (!uiDateStr) return '';
    try {
      const parts = uiDateStr.split('-');
      if (parts.length !== 3) return '';
      const [dd, mmm, yyyy] = parts;
      const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
      const mm = months[mmm] || '01';
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      return '';
    }
  };

  const hasHeaderData = () => {
    const headerFilled = Object.values(headerForm || {}).some(v => v && String(v).trim() !== '');
    const billingFilled = Object.values(billingForm || {}).some(v => v && String(v).trim() !== '');
    const shippingFilled = Object.values(shippingForm || {}).some(v => v && String(v).trim() !== '');
    return headerFilled || billingFilled || shippingFilled;
  };

  const saveHeader = async () => {
    setIsSavingHeader(true);
    try {
      const resolveCityUuid = (c) => {
        if (!c) return '';
        if (typeof c === 'string') return c;
        return c?.UUID || c?.Uuid || c?.Id || '';
      };

      const subtotalNum = parseFloat(computeSubtotal()) || 0;
      const totalTaxNum = parseFloat(totalTax) || 0;
      // Always compute TotalAmount from subtotal + shipping + adjustments + tax
      const totalAmountNum = subtotalNum + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + totalTaxNum;

      const payload = {
        UUID: headerResponse?.UUID || '',
        SalesOrderNo: headerForm.SalesOrderNo || '',
        SalesInquiryUUID: headerForm.SalesInquiryUUID || '',
        CustomerUUID: headerForm.CustomerUUID || '',
        ProjectUUID: projectUUID || '',
        PaymentTermUUID: paymentTermUuid || '',
        PaymentMethodUUID: paymentMethodUUID || '',
        OrderDate: uiDateToApiDate(invoiceDate),
        DueDate: uiDateToApiDate(dueDate),
        Notes: notes || '',
        TermsConditions: terms || '',
        BillingBuildingNo: billingForm.buildingNo || '',
        BillingStreet1: billingForm.street1 || '',
        BillingStreet2: billingForm.street2 || '',
        BillingPostalCode: billingForm.postalCode || '',
        BillingCountryUUID: billingForm.country || '',
        BillingStateUUID: billingForm.state || '',
        BillingCityUUID: resolveCityUuid(billingForm.city),
        IsShipAddrSame: !!isShippingSame,
        ShippingBuildingNo: shippingForm.buildingNo || '',
        ShippingStreet1: shippingForm.street1 || '',
        ShippingStreet2: shippingForm.street2 || '',
        ShippingPostalCode: shippingForm.postalCode || '',
        ShippingCountryUUID: shippingForm.country || '',
        ShippingStateUUID: shippingForm.state || '',
        ShippingCityUUID: resolveCityUuid(shippingForm.city),
        SubTotal: subtotalNum,
        TotalTax: totalTaxNum,
        TotalAmount: totalAmountNum,
        ShippingCharges: parseFloat(shippingCharges) || 0,
        AdjustmentField: adjustmentLabel || '',
        AdjustmentPrice: parseFloat(adjustments) || 0,
        Days: parseInt(dueDays, 10) || 0,
        // Attach uploaded file path when available (returned by /api/CompanySetup/upload-file)
        FilePath: uploadedFilePath || '',
      };

      console.log('saveHeader payload ->', payload, 'isEditing:', isEditingHeader);
      let resp;
      if (isEditingHeader && headerResponse?.UUID) {
        resp = await updateSalesOrder(payload);
      } else {
        resp = await addSalesOrder(payload);
      }

      console.log('saveHeader resp ->', resp);
      const data = resp?.Data || resp || {};
      setHeaderResponse(data);
      setHeaderSaved(true);
      setIsEditingHeader(false);
      // collapse header section after successful save
      setExpandedIds([]);
      // load lines for this header now that header is saved
      try { await loadSalesOrderLines(data?.UUID || data?.Id || data?.HeaderUUID || headerResponse?.UUID); } catch (e) { /* ignore */ }
      Alert.alert('Success', 'Header saved successfully');
    } catch (err) {
      console.error('saveHeader error ->', err);
      Alert.alert('Error', err?.message || 'Unable to save header');
    } finally {
      setIsSavingHeader(false);
    }
  };

  const openDatePickerFor = field => {
    let initial = datePickerSelectedDate || new Date();
    const parseUiString = (s) => {
      if (!s || typeof s !== 'string') return null;
      const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
      if (m) {
        const dd = parseInt(m[1], 10);
        const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        const mm = months[m[2]];
        if (typeof mm === 'number') return new Date(m[3], mm, dd);
      }
      const parsed = new Date(s);
      if (!isNaN(parsed)) return parsed;
      return null;
    };

    if (field === 'invoice' && invoiceDate) {
      const p = parseUiString(invoiceDate);
      if (p) initial = p;
    }
    if (field === 'due' && dueDate) {
      const p2 = parseUiString(dueDate);
      if (p2) initial = p2;
    }
    setDatePickerSelectedDate(initial);
    console.log('[ManageSalesOrder] openDatePickerFor field=', field, 'current dueDays=', dueDays, 'dueDaysRef=', dueDaysRef.current, 'headerForm.DueDays=', headerForm?.DueDays);
    setDatePickerField(field);
    setOpenDatePicker(true);
  };

  const closeDatePicker = () => {
    setOpenDatePicker(false);
    setDatePickerField(null);
  };

  const handleDateSelect = date => {
    const formatted = formatUiDate(date);
    if (datePickerField === 'invoice') setInvoiceDate(formatted);
    if (datePickerField === 'due') setDueDate(formatted);
    // If user selected Order Date, immediately calculate Due Date using DueDays (if present)
    if (datePickerField === 'invoice') {
      try {
        const rawDays = dueDays ?? headerForm?.DueDays ?? '';
        const days = (typeof rawDays === 'number') ? rawDays : parseInt(String(rawDays).replace(/\D/g, ''), 10);
        console.log('[ManageSalesOrder] handleDateSelect invoice, rawDueDays=', rawDays, 'parsedDays=', days);
        // use centralized calculator (pass Date and days so it reads fresh values)
        calculateDueDate(date, rawDays);
      } catch (e) { /* ignore */ }
    }

    setOpenDatePicker(false);
    setDatePickerField(null);
  };

  // Centralized calculation: Order Date (Date or UI string) + days -> DueDate (UI string dd-MMM-yyyy)
  const calculateDueDate = (orderDateInput = null, daysInput = null) => {
    try {
      // determine base date
      let baseDate = null;
      if (orderDateInput instanceof Date && !isNaN(orderDateInput)) {
        baseDate = orderDateInput;
      } else {
        const od = orderDateInput ?? invoiceDate;
        if (!od) return;
        // try dd-MMM-yyyy first (our UI)
        const m = String(od).match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
        if (m) {
          const dd = parseInt(m[1], 10);
          const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
          const mm = months[m[2]];
          baseDate = new Date(m[3], mm, dd);
        } else if (/\//.test(String(od))) {
          // try dd/MM/YYYY or similar
          const parts = String(od).split('/');
          if (parts.length === 3) {
            baseDate = new Date(parts[2], parts[1] - 1, parts[0]);
          }
        }
        if (!baseDate) {
          const parsed = new Date(od);
          if (!isNaN(parsed)) baseDate = parsed;
        }
      }
      if (!baseDate) return;

      // determine days
      const rawDays = (typeof daysInput !== 'undefined' && daysInput !== null) ? daysInput : (dueDays ?? headerForm?.DueDays ?? '');
      const days = (typeof rawDays === 'number') ? rawDays : parseInt(String(rawDays).replace(/\D/g, ''), 10);
      if (isNaN(days)) return;

      const newDue = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + days);
      const newDueStr = formatUiDate(newDue);
      console.log('[ManageSalesOrder] calculateDueDate -> base=', baseDate, 'days=', days, 'due=', newDueStr);
      setDueDate(newDueStr);
    } catch (e) {
      console.warn('calculateDueDate error', e);
    }
  };

  // Auto-calculate Due Date as Order Date + DueDays (if DueDays is set)
  React.useEffect(() => {
    // whenever invoiceDate or dueDays change, recompute due date
    if (invoiceDate && dueDays) {
      calculateDueDate(invoiceDate, dueDays);
    }
  }, [invoiceDate, dueDays]);

  // Clear all form state when screen comes into focus without params (fresh navigation)
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Only clear if no params (fresh navigation, not edit mode)
      const params = route?.params;
      if (!params?.prefillHeader && !params?.headerUuid && !params?.HeaderUUID && !params?.UUID) {
        // Clear all state
        setHeaderForm({
          SalesInquiryUUID: '',
          SalesInquiryNo: '',
          CustomerUUID: '',
          CustomerName: '',
          SalesOrderNo: '',
          DueDays: '',
        });
        setBillingForm({
          buildingNo: '',
          street1: '',
          street2: '',
          postalCode: '',
          country: '',
          state: '',
          city: '',
        });
        setShippingForm({
          buildingNo: '',
          street1: '',
          street2: '',
          postalCode: '',
          country: '',
          state: '',
          city: '',
        });
        setIsShippingSame(false);
        setItems([]);
        setInvoiceDate('');
        setDueDate('');
        setDueDays('');
        setHeaderHasDates(false);
        setPaymentTerm('');
        setPaymentTermUuid(null);
        setNotes('');
        setTerms('');
        setProject('');
        setProjectUUID('');
        setPaymentMethod('');
        setPaymentMethodUUID('');
        setShippingCharges('0');
        setAdjustments('0');
        setAdjustmentLabel('Adjustments');
        setTotalTax('0');
        setServerTotalAmount('');
        setFile(null);
        setHeaderSaved(false);
        setHeaderResponse(null);
        setIsEditingHeader(false);
        setIsPrefilling(false);
        setIsSavingHeader(false);
        setIsGeneratingPDF(false);
        setSelectedBillingCountry(null);
        setSelectedBillingState(null);
        setSelectedBillingCity(null);
        setSelectedShippingCountry(null);
        setSelectedShippingState(null);
        setSelectedShippingCity(null);
        setStatesOptions([]);
        setCitiesOptions([]);
        setShippingStatesOptions([]);
        setShippingCitiesOptions([]);
        setCurrentItem({
          itemType: '',
          itemTypeUuid: null,
          itemName: '',
          itemNameUuid: null,
          quantity: '',
          unit: '',
          unitUuid: null,
          desc: '',
          hsn: '',
          rate: '',
        });
        setEditItemId(null);
        setTableSearch('');
        setPage(1);
        setSalesInquiry('');
        setExpandedIds([1]);
      }
    });

    return unsubscribe;
  }, [navigation, route?.params]);

  const computeAmount = (qty, rate) => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    return (q * r).toFixed(2);
  };

  // Fetch lookups on mount
  // Helper to extract array from various response shapes
  const extractArray = (resp) => {
    const d = resp?.Data ?? resp;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.List)) return d.List;
    if (Array.isArray(d?.Records)) return d.Records;
    if (Array.isArray(d?.Items)) return d.Items;
    return [];
  };

  // Fetch lookups on mount
  React.useEffect(() => {
    (async () => {
      try {
        setIsInitialLoading(true);
        const [custResp, termsResp, methodsResp, countriesResp, projectsResp, inquiriesResp] = await Promise.all([
          getCustomers(),
          getPaymentTerms(),
          getPaymentMethods(),
          getCountries(),
          fetchProjects(),
          getAllSalesInquiryNumbers(),
        ]);

        const custList = extractArray(custResp);
        console.log(custList,'001');
        
        const termsList = extractArray(termsResp);
        const methodsList = extractArray(methodsResp);
        const countriesList = extractArray(countriesResp);
        console.log(countriesList, '566');

        const projectsList = extractArray(projectsResp);
        const inquiriesList = extractArray(inquiriesResp);

        // Normalize inquiry entries so dropdowns/prefill mapping find display values instead of raw UUIDs
        const normalizedInquiries = (Array.isArray(inquiriesList) ? inquiriesList : []).map((r, idx) => ({
          UUID: r?.UUID || r?.Uuid || r?.Id || r?.Id || r?.InquiryUUID || r?.SalesInquiryUUID || null,
          InquiryNo: r?.SalesInqNo || r?.SalesInquiryNo || r?.InquiryNo || r?.SalesOrderNo || r?.SalesOrder || r?.Name || r?.Title || String(r),
          // include other helpful fields used elsewhere
          SalesPerInvNo: r?.SalesPerInvNo || r?.PerformaNo || r?.PerformaInvoiceNo || null,
          raw: r,
        }));

        setCustomersOptions(custList);
        setPaymentTermsOptions(termsList);
        setPaymentMethodsOptions(methodsList);
        setCountriesOptions(countriesList);
        setProjectsOptions(projectsList);
        setSalesInquiryNosOptions(normalizedInquiries);

        console.log('[ManageSalesOrder] lookup counts ->', {
          customers: Array.isArray(custList) ? custList.length : 0,
          paymentTerms: Array.isArray(termsList) ? termsList.length : 0,
          paymentMethods: Array.isArray(methodsList) ? methodsList.length : 0,
          countries: Array.isArray(countriesList) ? countriesList.length : 0,
          projects: Array.isArray(projectsList) ? projectsList.length : 0,
          inquiries: Array.isArray(inquiriesList) ? inquiriesList.length : 0,
        });
      } catch (e) {
        console.warn('Lookup fetch error', e?.message || e);
      } finally {
        setIsInitialLoading(false);
      }
    })();
  }, []);

  // Load saved sales order lines for a header and normalize them into `items`
  const loadSalesOrderLines = async (headerUuid) => {
    if (!headerUuid) return;
    try {
      setLinesLoading(true);
      const c = await getCMPUUID();
      const e = await getENVUUID();
      let resp;
      try {
        // Prefer specialized GetSalesOrderLines if available on backend
        if (typeof getSalesOrderLines === 'function') {
          resp = await getSalesOrderLines({ headerUuid, cmpUuid: c, envUuid: e });
        } else {
          resp = await getSalesLines({ headerUuid, cmpUuid: c, envUuid: e });
        }
      } catch (e) {
        // fallback to older endpoint name
        resp = await getSalesLines({ headerUuid, cmpUuid: c, envUuid: e });
      }
      const raw = resp?.Data?.Records || resp?.Data || resp || [];
      const list = Array.isArray(raw) ? raw : [];
      // normalize server line objects to UI `items` shape
      const normalized = list.map((r, idx) => {
        const serverUuid = r?.UUID || r?.LineUUID || r?.Id || r?.Line_Id || null;
        const itemUuid = r?.ItemUUID || r?.ItemUuid || r?.ItemId || r?.Item || r?.ItemId || null;
        const name = r?.ItemName || r?.Name || r?.Item || r?.Description || '';
        const sku = r?.SKU || r?.Sku || r?.ItemCode || '';
        const rate = String(r?.Rate ?? r?.Price ?? r?.UnitPrice ?? 0);
        const desc = r?.Description || r?.Desc || '';
        const hsn = r?.HSNCode || r?.HSN || r?.hsn || r?.HSNSACNO || '-';
        const qty = String(r?.Quantity ?? r?.Qty ?? r?.QuantityOrdered ?? 1);
        const amtNum = Number(r?.Amount ?? r?.TotalAmount ?? r?.NetAmount ?? r?.LineAmount ?? 0) || 0;
        const amount = amtNum.toFixed(2);
        const tax = r?.TaxType || r?.Tax || 'IGST';
        const unit = r?.Unit || '';
        return {
          id: idx + 1,
          serverUuid,
          itemUuid,
          selectedItem: null,
          name,
          sku,
          rate,
          desc,
          hsn,
          qty,
          tax,
          amount,
          unit,
        };
      });

      setItems(normalized);

      // if API returns header totals alongside lines, bind them
      try {
        const tot = resp?.Data?.TotalAmount ?? resp?.TotalAmount ?? resp?.Data?.NetAmount ?? resp?.NetAmount ?? null;
        const tTax = resp?.Data?.TotalTax ?? resp?.TotalTax ?? null;
        if (tTax !== null && typeof tTax !== 'undefined') setTotalTax(String(tTax));
        if (tot !== null && typeof tot !== 'undefined') setServerTotalAmount(String(tot));
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.warn('loadSalesOrderLines error', err?.message || err);
      setItems([]);
    } finally {
      setLinesLoading(false);
    }
  };


  const loadStatesForCountry = async (countryUuid, target = 'billing') => {
    try {
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const resp = await getStates({ cmpUuid, countryUuid, envUuid });
      const list = resp?.Data && Array.isArray(resp.Data) ? resp.Data : extractArray(resp);
      if (target === 'billing') setStatesOptions(list);
      else setShippingStatesOptions(list);
    } catch (e) {
      console.warn('Error loading states', e?.message || e);
      if (target === 'billing') setStatesOptions([]);
      else setShippingStatesOptions([]);
    }
  };

  const loadCitiesForState = async (stateUuid, target = 'billing') => {
    try {
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const resp = await getCities({ stateUuid, cmpUuid, envUuid });
      const list = resp?.Data && Array.isArray(resp.Data) ? resp.Data : extractArray(resp);
      if (target === 'billing') setCitiesOptions(list);
      else setShippingCitiesOptions(list);
    } catch (e) {
      console.warn('Error loading cities', e?.message || e);
      if (target === 'billing') setCitiesOptions([]);
      else setShippingCitiesOptions([]);
    }
  };

  const handleBillingCountrySelect = (selected) => {
    setSelectedBillingCountry(selected);
    setSelectedBillingState(null);
    setSelectedBillingCity(null);
    setStatesOptions([]);
    setCitiesOptions([]);
    const countryUuid = selected?.Uuid || selected?.UUID || selected?.CountryUuid || selected?.Id || (typeof selected === 'string' ? selected : null);
    setBillingForm(s => ({ ...s, country: countryUuid || '', state: '', city: '' }));
    if (countryUuid) loadStatesForCountry(countryUuid, 'billing');
  };

  const handleBillingStateSelect = (selected) => {
    setSelectedBillingState(selected);
    setSelectedBillingCity(null);
    setCitiesOptions([]);
    const stateUuid = selected?.Uuid || selected?.UUID || selected?.StateUuid || selected?.Id || (typeof selected === 'string' ? selected : null);
    setBillingForm(s => ({ ...s, state: stateUuid || '', city: '' }));
    if (stateUuid) loadCitiesForState(stateUuid, 'billing');
  };

  const handleShippingCountrySelect = (selected) => {
    setSelectedShippingCountry(selected);
    setSelectedShippingState(null);
    setSelectedShippingCity(null);
    setShippingStatesOptions([]);
    setShippingCitiesOptions([]);
    const countryUuid = selected?.Uuid || selected?.UUID || selected?.CountryUuid || selected?.Id || (typeof selected === 'string' ? selected : null);
    setShippingForm(s => ({ ...s, country: countryUuid || '', state: '', city: '' }));
    if (countryUuid) loadStatesForCountry(countryUuid, 'shipping');
  };

  const handleShippingStateSelect = (selected) => {
    setSelectedShippingState(selected);
    setSelectedShippingCity(null);
    setShippingCitiesOptions([]);
    const stateUuid = selected?.Uuid || selected?.UUID || selected?.StateUuid || selected?.Id || (typeof selected === 'string' ? selected : null);
    setShippingForm(s => ({ ...s, state: stateUuid || '', city: '' }));
    if (stateUuid) loadCitiesForState(stateUuid, 'shipping');
  };

  // Fetch states when billing country changes
  React.useEffect(() => {
    (async () => {
      try {
        // compute countryUuid safely (in case billingForm.country holds an object)
        let countryUuid = null;
        const cVal = billingForm.country;
        if (!cVal) countryUuid = null;
        else if (typeof cVal === 'string') countryUuid = cVal;
        else if (typeof cVal === 'object') countryUuid = cVal?.UUID || cVal?.Id || cVal?.CountryUuid || cVal?.CountryId || null;
        if (countryUuid) {
          const resp = await getStates({ countryUuid });
          const data = resp?.Data || resp || [];
          const list = Array.isArray(data) ? data : (data?.List || data?.Records || []);
          setStatesOptions(list);
        }
      } catch (e) {
        console.warn('Get states error', e?.message || e);
      }
    })();
  }, [billingForm.country]);

  // Fetch cities when billing state changes
  React.useEffect(() => {
    (async () => {
      try {
        // compute stateUuid safely
        let stateUuid = null;
        const sVal = billingForm.state;
        if (!sVal) stateUuid = null;
        else if (typeof sVal === 'string') stateUuid = sVal;
        else if (typeof sVal === 'object') stateUuid = sVal?.UUID || sVal?.Id || sVal?.StateUuid || sVal?.StateId || null;
        if (stateUuid) {
          const resp = await getCities({ stateUuid });
          const data = resp?.Data || resp || [];
          const list = Array.isArray(data) ? data : (data?.List || data?.Records || []);
          setCitiesOptions(list);
        }
      } catch (e) {
        console.warn('Get cities error', e?.message || e);
      }
    })();
  }, [billingForm.state]);

  // Fetch states when shipping country changes
  React.useEffect(() => {
    (async () => {
      try {
        // compute countryUuid safely for shipping
        let countryUuid = null;
        const cVal = shippingForm.country;
        if (!cVal) countryUuid = null;
        else if (typeof cVal === 'string') countryUuid = cVal;
        else if (typeof cVal === 'object') countryUuid = cVal?.UUID || cVal?.Id || cVal?.CountryUuid || cVal?.CountryId || null;
        if (countryUuid) {
          const resp = await getStates({ countryUuid });
          const data = resp?.Data || resp || [];
          const list = Array.isArray(data) ? data : (data?.List || data?.Records || []);
          setShippingStatesOptions(list);
        }
      } catch (e) {
        console.warn('Get shipping states error', e?.message || e);
      }
    })();
  }, [shippingForm.country]);

  // Fetch cities when shipping state changes
  React.useEffect(() => {
    (async () => {
      try {
        // compute stateUuid safely for shipping
        let stateUuid = null;
        const sVal = shippingForm.state;
        if (!sVal) stateUuid = null;
        else if (typeof sVal === 'string') stateUuid = sVal;
        else if (typeof sVal === 'object') stateUuid = sVal?.UUID || sVal?.Id || sVal?.StateUuid || sVal?.StateId || null;
        if (stateUuid) {
          const resp = await getCities({ stateUuid });
          const data = resp?.Data || resp || [];
          const list = Array.isArray(data) ? data : (data?.List || data?.Records || []);
          setShippingCitiesOptions(list);
        }
      } catch (e) {
        console.warn('Get shipping cities error', e?.message || e);
      }
    })();
  }, [shippingForm.state]);

  // Map billingForm.country/state/city UUIDs (strings) to selected objects when options are available
  React.useEffect(() => {
    // Map country
    if (billingForm?.country && !selectedBillingCountry && Array.isArray(countriesOptions) && countriesOptions.length) {
      const found = countriesOptions.find(c => (
        c?.UUID === billingForm.country ||
        c?.Uuid === billingForm.country ||
        c?.Id === billingForm.country ||
        c?.CountryUuid === billingForm.country ||
        c?.CountryId === billingForm.country ||
        String(c?.UUID) === String(billingForm.country)
      ));
      if (found) {
        // use handler to ensure states are loaded
        handleBillingCountrySelect(found);
      }
    }
  }, [billingForm?.country, countriesOptions]);

  React.useEffect(() => {
    // Map state
    if (billingForm?.state && !selectedBillingState && Array.isArray(statesOptions) && statesOptions.length) {
      const found = statesOptions.find(s => (
        s?.UUID === billingForm.state ||
        s?.Uuid === billingForm.state ||
        s?.Id === billingForm.state ||
        s?.StateUuid === billingForm.state ||
        s?.StateId === billingForm.state ||
        String(s?.UUID) === String(billingForm.state)
      ));
      if (found) {
        handleBillingStateSelect(found);
      }
    }
  }, [billingForm?.state, statesOptions]);

  React.useEffect(() => {
    // Map city
    if (billingForm?.city && !selectedBillingCity && Array.isArray(citiesOptions) && citiesOptions.length) {
      const found = citiesOptions.find(ci => (
        ci?.UUID === billingForm.city ||
        ci?.Uuid === billingForm.city ||
        ci?.Id === billingForm.city ||
        ci?.CityUuid === billingForm.city ||
        ci?.CityId === billingForm.city ||
        String(ci?.UUID) === String(billingForm.city)
      ));
      if (found) {
        setSelectedBillingCity(found);
        setBillingForm(s => ({ ...s, city: found?.UUID || found }));
      }
    }
  }, [billingForm?.city, citiesOptions]);

  // Map shippingForm.country/state/city UUIDs to selected objects when options are available
  React.useEffect(() => {
    if (shippingForm?.country && !selectedShippingCountry && Array.isArray(countriesOptions) && countriesOptions.length) {
      const found = countriesOptions.find(c => (
        c?.UUID === shippingForm.country ||
        c?.Uuid === shippingForm.country ||
        c?.Id === shippingForm.country ||
        c?.CountryUuid === shippingForm.country ||
        c?.CountryId === shippingForm.country ||
        String(c?.UUID) === String(shippingForm.country)
      ));
      if (found) {
        handleShippingCountrySelect(found);
      }
    }
  }, [shippingForm?.country, countriesOptions]);

  React.useEffect(() => {
    if (shippingForm?.state && !selectedShippingState && Array.isArray(shippingStatesOptions) && shippingStatesOptions.length) {
      const found = shippingStatesOptions.find(s => (
        s?.UUID === shippingForm.state ||
        s?.Uuid === shippingForm.state ||
        s?.Id === shippingForm.state ||
        s?.StateUuid === shippingForm.state ||
        s?.StateId === shippingForm.state ||
        String(s?.UUID) === String(shippingForm.state)
      ));
      if (found) {
        handleShippingStateSelect(found);
      }
    }
  }, [shippingForm?.state, shippingStatesOptions]);

  React.useEffect(() => {
    if (shippingForm?.city && !selectedShippingCity && Array.isArray(shippingCitiesOptions) && shippingCitiesOptions.length) {
      const found = shippingCitiesOptions.find(ci => (
        ci?.UUID === shippingForm.city ||
        ci?.Uuid === shippingForm.city ||
        ci?.Id === shippingForm.city ||
        ci?.CityUuid === shippingForm.city ||
        ci?.CityId === shippingForm.city ||
        String(ci?.UUID) === String(shippingForm.city)
      ));
      if (found) {
        setSelectedShippingCity(found);
        setShippingForm(s => ({ ...s, city: found?.UUID || found }));
      }
    }
  }, [shippingForm?.city, shippingCitiesOptions]);

  // Map project / payment term / payment method / sales inquiry / customer when lookup options load
  React.useEffect(() => {
    // Customer - Map UUID to display name
    if (headerForm?.CustomerUUID && !headerForm?.CustomerName && Array.isArray(customersOptions) && customersOptions.length) {
      const found = customersOptions.find(c => (
        c?.UUID === headerForm.CustomerUUID || c?.Id === headerForm.CustomerUUID || String(c?.UUID) === String(headerForm.CustomerUUID)
      ));
      if (found) {
        const customerDisplayName = found?.CustomerName || found?.Name || found?.DisplayName || String(found);
        setHeaderForm(s => ({ ...s, CustomerName: customerDisplayName }));
      }
    }

    // Project
    if (!project && projectUUID && Array.isArray(projectsOptions) && projectsOptions.length) {
      const found = projectsOptions.find(p => (
        p?.Uuid === projectUUID || p?.UUID === projectUUID || p?.Id === projectUUID || String(p?.Uuid) === String(projectUUID)
      ));
      if (found) {
        setProject(found?.ProjectTitle || found?.Name || found?.Project || String(found));
        setProjectUUID(found?.Uuid || found?.UUID || found?.Id || projectUUID);
      }
    }

    // Payment term
    if ((!paymentTerm || !paymentTermUuid) && paymentTermUuid && Array.isArray(paymentTermsOptions) && paymentTermsOptions.length) {
      const found = paymentTermsOptions.find(t => (
        t?.UUID === paymentTermUuid || t?.Uuid === paymentTermUuid || t?.Id === paymentTermUuid || String(t?.UUID) === String(paymentTermUuid)
      ));
      if (found) {
        setPaymentTerm(found?.Name || found?.Term || String(found));
        setPaymentTermUuid(found?.UUID || found?.Uuid || found?.Id || paymentTermUuid);
      }
    }

    // Payment method
    if ((!paymentMethod || !paymentMethodUUID) && paymentMethodUUID && Array.isArray(paymentMethodsOptions) && paymentMethodsOptions.length) {
      const found = paymentMethodsOptions.find(m => (
        m?.UUID === paymentMethodUUID || m?.Uuid === paymentMethodUUID || m?.Id === paymentMethodUUID || String(m?.UUID) === String(paymentMethodUUID)
      ));
      if (found) {
        setPaymentMethod(found?.Name || found?.Mode || String(found));
        setPaymentMethodUUID(found?.UUID || found?.Uuid || found?.Id || paymentMethodUUID);
      }
    }

    // Sales Inquiry - Map UUID/InquiryNo to display name
    if (headerForm?.SalesInquiryUUID && Array.isArray(salesInquiryNosOptions) && salesInquiryNosOptions.length) {
      const found = salesInquiryNosOptions.find(s => (
        s?.UUID === headerForm.SalesInquiryUUID ||
        s?.Uuid === headerForm.SalesInquiryUUID ||
        s?.Id === headerForm.SalesInquiryUUID ||
        s?.InquiryNo === headerForm.SalesInquiryUUID ||
        String(s?.UUID) === String(headerForm.SalesInquiryUUID) ||
        String(s?.InquiryNo) === String(headerForm.SalesInquiryUUID)
      ));
      if (found) {
        const inquiryDisplayName = found?.InquiryNo || found?.SalesInqNo || found?.SalesInquiryNo || found?.Name || String(found);
        // Only update if current display name is empty, UUID, or doesn't match the proper display name
        if (!SalesInquiryNo || SalesInquiryNo === '' || SalesInquiryNo === headerForm.SalesInquiryUUID || SalesInquiryNo !== inquiryDisplayName) {
          setSalesInquiry(inquiryDisplayName);
        }
        // Update both SalesInquiryNo and ensure UUID is properly set
        const properUUID = found?.UUID || found?.Uuid || found?.Id || found?.InquiryNo || headerForm?.SalesInquiryUUID;
        setHeaderForm(s => ({
          ...s,
          SalesInquiryUUID: properUUID,
          SalesInquiryNo: inquiryDisplayName
        }));
      }
    }
  }, [customersOptions, projectsOptions, paymentTermsOptions, paymentMethodsOptions, salesInquiryNosOptions, headerForm?.CustomerUUID, headerForm?.CustomerName, projectUUID, paymentTermUuid, paymentMethodUUID, headerForm?.SalesInquiryUUID, project, paymentTerm, paymentMethod, SalesInquiryNo]);

  // Keep loader until mapping of header -> lookup objects completes (or timeout)
  React.useEffect(() => {
    if (!isPrefilling) return;

    const mappingReady = () => {
      try {
        // Billing mapping
        if (billingForm?.country && !selectedBillingCountry) return false;
        if (billingForm?.state && !selectedBillingState) return false;
        if (billingForm?.city && !selectedBillingCity) return false;

        // Shipping mapping
        if (shippingForm?.country && !selectedShippingCountry) return false;
        if (shippingForm?.state && !selectedShippingState) return false;
        if (shippingForm?.city && !selectedShippingCity) return false;

        // Customer mapping
        if (headerForm?.CustomerUUID && (!headerForm?.CustomerName || String(headerForm.CustomerName).trim() === '')) return false;

        // Project / payment / inquiry mapping (these are strings after mapping)
        if (projectUUID && (!project || String(project).trim() === '')) return false;
        if (paymentTermUuid && (!paymentTerm || String(paymentTerm).trim() === '')) return false;
        if (paymentMethodUUID && (!paymentMethod || String(paymentMethod).trim() === '')) return false;
        if (headerForm?.SalesInquiryUUID && (!SalesInquiryNo || String(SalesInquiryNo).trim() === '')) return false;

        // Dates: if header contained dates then invoice/due should be non-empty
        if (headerHasDates && (!invoiceDate || !dueDate)) return false;
        return true;
      } catch (e) { return true; }
    };

    if (mappingReady()) {
      setIsPrefilling(false);
      setReloadAttempts(0); // Reset reload attempts on success
      return undefined;
    }

    // Auto-reload mechanism: if mapping is not ready after timeout and we haven't exceeded max attempts
    const timeout = setTimeout(() => {
      console.log(`[ManageSalesOrder] Mapping not ready after timeout, reload attempt: ${reloadAttempts + 1}/${MAX_RELOAD_ATTEMPTS}`);

      if (reloadAttempts < MAX_RELOAD_ATTEMPTS) {
        // Check if we have prefill data that should be mapped
        const shouldReload = (
          (headerForm?.CustomerUUID && !headerForm?.CustomerName) ||
          (projectUUID && !project) ||
          (paymentTermUuid && !paymentTerm) ||
          (paymentMethodUUID && !paymentMethod) ||
          (headerForm?.SalesInquiryUUID && (!SalesInquiryNo || !headerForm?.SalesInquiryNo)) ||
          (billingForm?.country && !selectedBillingCountry) ||
          (shippingForm?.country && !selectedShippingCountry)
        );

        if (shouldReload) {
          setReloadAttempts(prev => prev + 1);
          // Force re-trigger the prefill process by re-calling prefillFromData
          const prefillData = route?.params?.prefillHeader?.Data || route?.params?.prefillHeader;
          if (prefillData) {
            console.log('[ManageSalesOrder] Auto-reloading prefill data...');
            setTimeout(() => {
              try {
                prefillFromData(prefillData);
              } catch (e) {
                console.warn('[ManageSalesOrder] Auto-reload prefill failed:', e);
              }
            }, 500);
          }
        } else {
          setIsPrefilling(false);
        }
      } else {
        console.warn('[ManageSalesOrder] Max reload attempts reached, stopping auto-reload');
        setIsPrefilling(false);
      }
    }, 3000); // Reduced timeout to 3 seconds for faster reloads

    return () => clearTimeout(timeout);
  }, [isPrefilling, reloadAttempts, billingForm?.country, billingForm?.state, billingForm?.city, shippingForm?.country, shippingForm?.state, shippingForm?.city, selectedBillingCountry, selectedBillingState, selectedBillingCity, selectedShippingCountry, selectedShippingState, selectedShippingCity, headerForm?.CustomerUUID, headerForm?.CustomerName, projectUUID, project, paymentTermUuid, paymentTerm, paymentMethodUUID, paymentMethod, headerForm?.SalesInquiryUUID, SalesInquiryNo, headerHasDates, invoiceDate, dueDate]);

  const computeSubtotal = () => {
    const sum = items.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
    return sum.toFixed(2);
  };

  const addItem = () => {
    setItems(prev => {
      const nextId = prev.length ? prev[prev.length - 1].id + 1 : 1;
      return [
        ...prev,
        {
          id: nextId,
          selectedItem: null,
          name: '',
          sku: '',
          rate: '0',
          desc: '',
          hsn: '',
          qty: '1',
          tax: 'IGST',
          amount: '0.00',
        },
      ];
    });
  };

  const deleteItem = id => {
    const it = items.find(x => x.id === id);
    if (!it) return;
    // if this line exists on server, confirm and call API
    if (it.serverUuid) {
      Alert.alert(
        'Delete Line',
        'Are you sure you want to delete this line?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete', style: 'destructive', onPress: async () => {
              try {
                setLinesLoading(true);
                await deleteSalesOrderLine({ lineUuid: it.serverUuid });
                // Clear serverTotalAmount so UI recomputes totals from current items
                // (in case backend doesn't return updated totals immediately).
                setServerTotalAmount('');
                // After deleting on server, reload lines (and header totals) from server
                // so UI reflects updated totals (TotalAmount, TotalTax, etc.).
                try {
                  const headerUuid = headerResponse?.UUID || headerResponse?.Id || headerResponse?.HeaderUUID || headerResponse?.Header_Id || null;
                  if (headerUuid) {
                    await loadSalesOrderLines(headerUuid);
                  } else {
                    // fallback: remove locally if header identifier not available
                    setItems(prev => prev.filter(r => r.id !== id));
                  }
                } catch (reloadErr) {
                  // still remove locally to keep UI consistent
                  console.warn('reload lines after delete failed', reloadErr?.message || reloadErr);
                  setItems(prev => prev.filter(r => r.id !== id));
                }
              } catch (e) {
                console.error('deleteSalesOrderLine error ->', e?.message || e);
                Alert.alert('Error', e?.message || 'Unable to delete line');
              } finally {
                setLinesLoading(false);
              }
            }
          }
        ]
      );
      return;
    }
    // otherwise just remove locally and clear server total so UI recomputes
    setItems(prev => prev.filter(r => r.id !== id));
    setServerTotalAmount('');
  };

  const selectMasterItem = (rowId, item) => {
    setItems(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const qty = r.qty || '1';
        return {
          ...r,
          selectedItem: item,
          name: item.name,
          sku: item.sku,
          rate: String(item.rate),
          desc: item.desc || '',
          hsn: item.hsn || '',
          amount: computeAmount(qty, item.rate),
        };
      }),
    );
  };

  const updateItemField = (rowId, key, value) => {
    setItems(prev =>
      prev.map(r => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [key]: value };
        if (key === 'qty' || key === 'rate') {
          updated.amount = computeAmount(updated.qty, updated.rate);
        }
        return updated;
      }),
    );
  };

  const [isAddingLine, setIsAddingLine] = useState(false);

  // Add an item from the LINE form into the table
  const handleAddLineItem = async () => {
    const nextId = items.length ? items[items.length - 1].id + 1 : 1;
    // try to find matching master item for rate/sku/desc
    const master = masterItems.find(m => {
      if (!m) return false;
      return (
        String(m.name || '').toLowerCase() === String(currentItem.itemName || '').toLowerCase() ||
        String(m.sku || '').toLowerCase() === String(currentItem.itemNameUuid || '').toLowerCase()
      );
    });
    // prefer manually entered rate, otherwise master rate
    const rate = (currentItem.rate && String(currentItem.rate).trim() !== '') ? String(currentItem.rate) : (master ? String(master.rate || '0') : '0');
    const qty = currentItem.quantity || '1';
    const amount = computeAmount(qty, rate);

    const newItem = {
      id: nextId,
      selectedItem: master || null,
      name: currentItem.itemName || (master ? master.name : ''),
      itemType: currentItem.itemType || '',
      itemTypeUuid: currentItem.itemTypeUuid || null,
      itemNameUuid: currentItem.itemNameUuid || currentItem.itemNameUuid || null,
      sku: master ? master.sku : '',
      rate: rate,
      desc: currentItem.desc && currentItem.desc.length ? currentItem.desc : (master ? master.desc || '' : ''),
      hsn: currentItem.hsn && currentItem.hsn.length ? currentItem.hsn : (master ? master.hsn || '' : ''),
      qty: qty,
      tax: 'IGST',
      amount: amount,
      unit: currentItem.unit || '',
    };

    // If header has been saved to server (we have Header UUID), attempt to POST the line
    if (headerSaved && headerResponse?.UUID) {
      try {
        setIsAddingLine(true);
        const payload = {
          HeaderUUID: headerResponse.UUID,
          ItemUUID: (master && master.uuid) || currentItem.itemNameUuid || null,
          Quantity: Number(qty) || 0,
          Description: newItem.desc || '',
          HSNSACNO: newItem.hsn || '',
          Rate: Number(rate) || 0,
        };
        console.log('Adding sales line payload ->', payload);
        // If we are editing an existing line that exists on server, call update API instead
        let resp;
        if (editItemId) {
          const existing = items.find(x => x.id === editItemId);
          if (existing && existing.serverUuid) {
            // include UUID in payload as required by update API
            const upayload = {
              UUID: existing.serverUuid,
              HeaderUUID: headerResponse.UUID,
              ItemUUID: (master && master.uuid) || currentItem.itemNameUuid || null,
              Quantity: Number(qty) || 0,
              Description: newItem.desc || '',
              HSNSACNO: newItem.hsn || '',
              Rate: Number(rate) || 0,
            };
            console.log('Updating sales order line payload ->', upayload);
            try {
              resp = await updateSalesOrderLine(upayload);
            } catch (e) {
              console.error('updateSalesOrderLine error ->', e);
              throw e;
            }
          } else {
            resp = await addSalesOrderLine(payload);
          }
        } else {
          resp = await addSalesOrderLine(payload);
        }
        console.log('addSalesOrderLine resp ->', resp);
        const data = resp?.Data || resp || null;
        // Prefer server-returned values when available
        const serverItem = data && (Array.isArray(data) ? data[0] : data);
        // Bind server-returned totals (Tax / Total) when API provides them
        try {
          const respTax = data?.TaxAmount ?? data?.TotalTax ?? serverItem?.TaxAmount ?? serverItem?.TotalTax ?? resp?.TaxAmount ?? resp?.TotalTax ?? null;
          const respTotal = data?.TotalAmount ?? data?.NetAmount ?? serverItem?.TotalAmount ?? serverItem?.NetAmount ?? resp?.TotalAmount ?? resp?.NetAmount ?? null;
          if (respTax !== null && typeof respTax !== 'undefined') setTotalTax(String(respTax));
          if (respTotal !== null && typeof respTotal !== 'undefined') setServerTotalAmount(String(respTotal));
        } catch (e) {
          // ignore parsing errors
        }
        const itemToPush = {
          ...newItem,
          id: editItemId ? editItemId : nextId,
          serverUuid: serverItem?.UUID || serverItem?.LineUUID || serverItem?.Id || null,
          itemUuid: serverItem?.ItemUUID || serverItem?.ItemUuid || serverItem?.ItemId || newItem.itemNameUuid || null,
          sku: serverItem?.SKU || newItem.sku,
          rate: (serverItem && (serverItem?.Rate ?? serverItem?.rate)) ?? newItem.rate,
          desc: serverItem?.Description ?? newItem.desc,
          hsn: serverItem?.HSNCode || serverItem?.HSN || serverItem?.hsn || newItem.hsn,
        };
        if (editItemId) {
          setItems(prev => prev.map(it => it.id === editItemId ? { ...it, ...itemToPush, id: editItemId } : it));
          setEditItemId(null);
        } else {
          setItems(prev => [...prev, itemToPush]);
        }
        // Refresh lines from server to ensure totals and canonical data
        try {
          await loadSalesOrderLines(headerResponse?.UUID || payload?.HeaderUUID || headerResponse?.Id);
        } catch (e) { /* ignore */ }
      } catch (err) {
        console.error('addSalesOrderLine error ->', err);
        Alert.alert('Error', err?.message || 'Unable to add line to server. Saved locally.');
        // fallback: still add locally so user doesn't lose work
        if (editItemId) {
          setItems(prev => prev.map(it => it.id === editItemId ? { ...it, ...newItem, id: editItemId } : it));
          setEditItemId(null);
        } else {
          setItems(prev => [...prev, newItem]);
        }
      } finally {
        setIsAddingLine(false);
      }
    } else {
      // not saved on server yet - keep local
      if (editItemId) {
        // update existing
        setItems(prev => prev.map(it => it.id === editItemId ? { ...it, ...newItem, id: editItemId } : it));
        setEditItemId(null);
      } else {
        setItems(prev => [...prev, newItem]);
      }
    }

    // reset form
    setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: 1, unit: '', unitUuid: null, desc: '', hsn: '', rate: '' });
  };

  const handleEditItem = id => {
    const it = items.find(i => i.id === id);
    if (!it) return;
    // Try to resolve the matching master item by uuid or sku/name so dropdown shows proper label
    const matchedMaster = masterItems.find(m => (m.uuid && it.itemUuid && String(m.uuid) === String(it.itemUuid)) || (m.sku && it.sku && String(m.sku) === String(it.sku)) || (m.name && it.name && String(m.name).toLowerCase() === String(it.name).toLowerCase()));
    setCurrentItem({
      itemType: it.itemType || '',
      itemTypeUuid: it.itemTypeUuid || null,
      itemName: matchedMaster ? matchedMaster.name : (it.name || ''),
      itemNameUuid: it.itemUuid || it.itemNameUuid || it.sku || (matchedMaster ? matchedMaster.uuid : null) || null,
      quantity: it.qty || '',
      unit: it.unit || '',
      unitUuid: it.unitUuid || null,
      desc: it.desc || it.desc || '',
      hsn: it.hsn || '',
      rate: it.rate || '',
    });
    setEditItemId(id);
    // scroll to top of create order section if needed by expanding it
    setExpandedIds([4]);
  };

  const handleCreateOrder = async () => {
    setIsSavingHeader(true);
    try {
      const resolveCityUuid = (c) => {
        if (!c) return '';
        if (typeof c === 'string') return c;
        return c?.UUID || c?.Uuid || c?.Id || '';
      };

      const subtotalNum = parseFloat(computeSubtotal()) || 0;
      const totalTaxNum = parseFloat(totalTax) || 0;
      // Always compute TotalAmount from subtotal + shipping + adjustments + tax
      const totalAmountNum = subtotalNum + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + totalTaxNum;

      const payload = {
        UUID: headerResponse?.UUID || '',
        SalesOrderNo: headerForm.SalesOrderNo || '',
        SalesInquiryUUID: headerForm.SalesInquiryUUID || '',
        CustomerUUID: headerForm.CustomerUUID || '',
        ProjectUUID: projectUUID || '',
        PaymentTermUUID: paymentTermUuid || '',
        PaymentMethodUUID: paymentMethodUUID || '',
        OrderDate: uiDateToApiDate(invoiceDate),
        DueDate: uiDateToApiDate(dueDate),
        Notes: notes || '',
        TermsConditions: terms || '',
        BillingBuildingNo: billingForm.buildingNo || '',
        BillingStreet1: billingForm.street1 || '',
        BillingStreet2: billingForm.street2 || '',
        BillingPostalCode: billingForm.postalCode || '',
        BillingCountryUUID: billingForm.country || '',
        BillingStateUUID: billingForm.state || '',
        BillingCityUUID: resolveCityUuid(billingForm.city),
        IsShipAddrSame: !!isShippingSame,
        ShippingBuildingNo: shippingForm.buildingNo || '',
        ShippingStreet1: shippingForm.street1 || '',
        ShippingStreet2: shippingForm.street2 || '',
        ShippingPostalCode: shippingForm.postalCode || '',
        ShippingCountryUUID: shippingForm.country || '',
        ShippingStateUUID: shippingForm.state || '',
        ShippingCityUUID: resolveCityUuid(shippingForm.city),
        SubTotal: subtotalNum,
        TotalTax: totalTaxNum,
        TotalAmount: totalAmountNum,
        ShippingCharges: parseFloat(shippingCharges) || 0,
        AdjustmentField: adjustmentLabel || '',
        AdjustmentPrice: parseFloat(adjustments) || 0,
        Days: parseInt(dueDays, 10) || 0,
        FilePath: uploadedFilePath || '',
      };

      console.log('Final Submit payload ->', payload);
      let resp;
      if (headerResponse?.UUID) {
        resp = await updateSalesOrder(payload);
      } else {
        // If header UUID not present, fallback to addSalesOrder
        resp = await addSalesOrder(payload);
      }

      console.log('Final submit resp ->', resp);
      const data = resp?.Data || resp || {};
      setHeaderResponse(data);
      setHeaderSaved(true);
      Alert.alert('Success', 'Order submitted successfully');
      // reload lines to ensure totals reflect server
      try { await loadSalesOrderLines(data?.UUID || data?.Id || data?.HeaderUUID || headerResponse?.UUID); } catch (e) { /* ignore */ }

      // Don't clear form data in edit mode to preserve prefilled information
      // Only reset edit states
      setIsEditingHeader(false);
      setEditItemId(null);
    } catch (err) {
      console.error('handleCreateOrder error ->', err);
      Alert.alert('Error', err?.message || 'Unable to submit order');
    } finally {
      setIsSavingHeader(false);
    }
  };

  // Download Sales Order PDF function
  const handleDownloadPDF = async () => {
    try {
      // Check if we have a header UUID (order is saved)
      const headerUuidCandidate = headerResponse?.UUID || headerResponse?.Id || headerResponse?.HeaderUUID;
      if (!headerUuidCandidate) {
        Alert.alert('Error', 'Please save the sales order first before downloading PDF.');
        return;
      }

      setIsGeneratingPDF(true);
      const pdfBase64 = await getSalesOrderSlip({ headerUuid: headerUuidCandidate });

      if (!pdfBase64) {
        Alert.alert('Error', 'Sales Order PDF is not available right now.');
        return;
      }

      // Navigate to PDF viewer with the base64 data
      navigation.navigate('FileViewerScreen', {
        pdfBase64,
        fileName: `SalesOrder_${headerForm.SalesOrderNo || headerForm.InvoiceNo || 'Document'}`,
        opportunityTitle: headerForm.CustomerName || 'Sales Order',
        companyName: headerForm.Project || '',
      });
    } catch (error) {
      console.log('[ManageSalesOrder] PDF download failed:', error?.message || error);
      Alert.alert('Error', error?.message || 'Unable to generate the sales order PDF.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const onCancel = () => {
    // Reset header form to initial empty values
    setHeaderForm({
      SalesInquiryUUID: '',
      SalesInquiryNo: '',
      CustomerUUID: '',
      CustomerName: '',
      SalesOrderNo: '',
      DueDays: '',
    });
    setDueDays('');

    // Reset billing/shipping
    setBillingForm({ buildingNo: '', street1: '', street2: '', postalCode: '', country: '', state: '', city: '' });
    setShippingForm({ buildingNo: '', street1: '', street2: '', postalCode: '', country: '', state: '', city: '' });
    setIsShippingSame(false);

    // Clear line items and current line editor
    setItems([]);
    setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null, desc: '', hsn: '', rate: '' });
    setEditItemId(null);

    // Reset dates, totals and other header-level state
    setInvoiceDate('');
    setDueDate('');
    setHeaderHasDates(false);
    setOpenDatePicker(false);
    setDatePickerField(null);
    setDatePickerSelectedDate(new Date());

    setPaymentTerm('');
    setPaymentTermUuid(null);
    setPaymentMethod('');
    setPaymentMethodUUID(null);
    setProject('');
    setProjectUUID('');
    setNotes('');
    setTerms('');
    setShippingCharges('0');
    setAdjustments('0');
    setAdjustmentLabel('Adjustments');
    setTotalTax('0');
    setServerTotalAmount('');

    // Clear file and UI flags
    setFile(null);
    setShowShippingTip(false);
    setShowAdjustmentTip(false);
    setHeaderSaved(false);
    setHeaderResponse(null);
    setIsPrefilling(false);
    setIsSavingHeader(false);
    setIsEditingHeader(false);
    setIsInitialLoading(false);
    setReloadAttempts(0);
    setIsGeneratingPDF(false);

    // Clear dropdown option caches (keep lookups if you prefer caching)
    setCustomersOptions([]);
    setPaymentTermsOptions([]);
    setPaymentMethodsOptions([]);
    setProjectsOptions([]);
    setCountriesOptions([]);
    setSalesInquiryNosOptions([]);
    setStatesOptions([]);
    setCitiesOptions([]);
    setShippingStatesOptions([]);
    setShippingCitiesOptions([]);

    setSelectedBillingCountry(null);
    setSelectedBillingState(null);
    setSelectedBillingCity(null);
    setSelectedShippingCountry(null);
    setSelectedShippingState(null);
    setSelectedShippingCity(null);

    // Reset table/pagination/search
    setTableSearch('');
    setPage(1);
    setPageSize(10);

    // Navigate directly to the Sales Order list to avoid landing on unrelated screens
    try {
      navigation.replace('ViewSalesOrder');
    } catch (e) {
      try { navigation.navigate('ViewSalesOrder'); } catch (err) { /* ignore */ }
    }
  };

  // File attachment functions
  const pickFile = async () => {
    try {
      const hasPerm = await requestStoragePermissionAndroid();
      if (!hasPerm) {
        Alert.alert(
          'Permission required',
          'Storage permission is needed to pick a file.',
        );
        return;
      }

      const [selectedFile] = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false,
      });

      if (selectedFile) {
        // Validate file type
        const allowedTypes = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ];
        if (!allowedTypes.includes(selectedFile.type)) {
          Alert.alert(
            'Invalid File Type',
            'Please select a PDF, PNG, or JPG file.',
          );
          return;
        }

        // Validate file size (10MB = 10 * 1024 * 1024 bytes)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (selectedFile.size && selectedFile.size > maxSize) {
          Alert.alert('File Too Large', 'File size must be less than 10MB.');
          return;
        }

        // Set the selected file
        const fileObj = {
          name: selectedFile.name,
          uri: selectedFile.uri,
          type: selectedFile.type,
          size: selectedFile.size,
        };
        setFile(fileObj);

        // Immediately upload the file to server with fixed Filepath 'SalesOrders'
        try {
          const uploadResp = await uploadFiles({ uri: fileObj.uri, name: fileObj.name, type: fileObj.type }, { filepath: 'SalesOrders' });
          console.log('uploadFiles response (SalesOrders):', uploadResp);
          // Normalize common response shapes to an array of file refs
          const upData = uploadResp?.Data || uploadResp || {};
          const uploaded = upData?.Files || upData?.files || upData?.UploadedFiles || upData?.FilePaths || upData || [];
          const finalRefs = Array.isArray(uploaded) ? uploaded : (uploaded ? [uploaded] : []);
          try { console.log('Normalized upload refs ->', JSON.stringify(finalRefs, null, 2)); } catch (_) { console.log('Normalized upload refs ->', finalRefs); }

          // Extract string paths from refs (support RemoteResponse.path, path, or plain string)
          const paths = finalRefs.map(r => {
            try { return r?.RemoteResponse?.path || r?.path || (typeof r === 'string' ? r : null); } catch (_) { return null; }
          }).filter(Boolean);

          if (paths.length > 0) {
            // For sales orders we expect a single file; store string or array depending on count
            setUploadedFilePath(paths.length === 1 ? paths[0] : paths);
            try { console.log('Extracted uploaded file path(s):', JSON.stringify(paths, null, 2)); } catch (_) { console.log('Extracted uploaded file path(s):', paths); }
          } else {
            console.warn('Could not extract uploaded file path from response', uploadResp);
          }
        } catch (upErr) {
          console.error('SalesOrders file upload failed', upErr);
          Alert.alert('Upload Error', upErr?.message || 'Failed to upload file');
        }
      }
    } catch (err) {
      if (isCancel && isCancel(err)) {
        return;
      }
      console.warn('Document pick error:', err);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <>
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        {(isPrefilling || isInitialLoading) && (
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.bg + '75', zIndex: 9999 }}>
            <ActivityIndicator size="large" color={themeColors?.primary || '#000'} />
            {reloadAttempts > 0 && (
              <Text style={{ marginTop: 10, fontSize: 14, color: themeColors?.primary || '#000' }}>
                Loading attempt {reloadAttempts}/{MAX_RELOAD_ATTEMPTS}
              </Text>
            )}
          </View>
        )}
        <AppHeader
          title="Manage Sales Order"
          onLeftPress={() => {
            try {
              navigation.navigate('ViewSalesOrder');
            } catch (e) {
              navigation.goBack();
            }
          }}
        />
        <View style={styles.headerSeparator} />
        <ScrollView
          contentContainerStyle={[styles.container]}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Header / Basic Details */}
          <AccordionSection
            id={1}
            title="Header"
            expanded={Array.isArray(expandedIds) ? expandedIds.includes(1) : expandedIds === 1}
            onToggle={() => { if (headerSaved && !isEditingHeader) return; toggleSection(1); }}
            rightActions={headerSaved ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: wp(2) }}>
                <TouchableOpacity onPress={() => { /* no-op check */ }} style={{ marginRight: wp(3) }}>
                  <Icon name="check-circle" size={rf(4)} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setIsEditingHeader(true); setHeaderSaved(false); setExpandedIds([1]); }}>
                  <Icon name="edit" size={rf(4)} color={themeColors.success} />
                </TouchableOpacity>
              </View>
            ) : null}
          >
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Sales Inquiry No </Text>
                {headerSaved && !isEditingHeader ? (
                  <View style={[inputStyles.box]}>
                    <Text style={inputStyles.input}>{renderLabel(headerForm.SalesInquiryNo || headerForm.SalesInquiryUUID, ['InquiryNo', 'SalesInqNo', 'SalesInquiryNo'])}</Text>
                  </View>
                ) : (
                  <Dropdown
                    placeholder="-Sales Inquiry No-"
                    value={(() => {
                      // Find the selected inquiry object from options based on UUID or InquiryNo
                      if (headerForm?.SalesInquiryUUID && salesInquiryNosOptions?.length) {
                        return salesInquiryNosOptions.find(opt =>
                          opt?.UUID === headerForm.SalesInquiryUUID ||
                          opt?.Id === headerForm.SalesInquiryUUID ||
                          opt?.InquiryNo === headerForm.SalesInquiryUUID ||
                          String(opt?.UUID) === String(headerForm.SalesInquiryUUID) ||
                          String(opt?.InquiryNo) === String(headerForm.SalesInquiryUUID)
                        );
                      }
                      return null;
                    })()}
                    options={salesInquiryNosOptions}
                    getLabel={c => (c?.InquiryNo || c?.SalesInqNo || c?.SalesInquiryNo || c?.Name || String(c))}
                    getKey={c => (c?.UUID || c?.Id || c?.InquiryNo || c)}
                    onSelect={v => {
                      const inquiryNo = v?.InquiryNo || v?.SalesInqNo || v?.SalesInquiryNo || v;
                      // For UUID, prefer actual UUID field, fallback to InquiryNo if UUID not available
                      const inquiryUUID = v?.UUID || v?.Id || v?.InquiryNo || (typeof v === 'string' ? v : '');

                      setHeaderForm(s => ({
                        ...s,
                        SalesInquiryNo: inquiryNo,
                        SalesInquiryUUID: inquiryUUID,
                      }));
                      setSalesInquiry(inquiryNo);
                    }}
                    inputBoxStyle={inputStyles.box}
                    // textStyle={inputStyles.input}
                  />
                )}
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Customer Name* </Text>

                {/* <Text style={inputStyles.label}>Customer Name*</Text> */}
                {headerSaved && !isEditingHeader ? (
                  <View style={[inputStyles.box]}>
                    <Text style={inputStyles.input}>{renderLabel(headerForm.CustomerName, ['CustomerName', 'Name', 'DisplayName'])}</Text>
                  </View>
                ) : (
                    <Dropdown
                    placeholder="Customer Name*"
                    value={headerForm.CustomerUUID || headerForm.CustomerName}
                    options={customersOptions}
                    getLabel={c => (c?.CustomerName || c?.Name || c?.DisplayName || String(c))}
                    getKey={c => (c?.UUID || c?.Id || c)}
                    onSelect={v => setHeaderForm(s => ({
                      ...s,
                      CustomerName: v?.CustomerName || v,
                      CustomerUUID: v?.UUID || v?.Id || (typeof v === 'string' ? v : ''),
                    }))}
                    inputBoxStyle={inputStyles.box}
                    // textStyle={inputStyles.input}
                  />
                )}
              </View>
            </View>

            <View style={[styles.row, { marginTop: hp(1.5) }]}>

              <View style={styles.col}>
                <Text style={inputStyles.label}>Project Name*</Text>

                {/* <Text style={[inputStyles.label, { marginBottom: hp(1.5) }]}>Project Name*</Text> */}
                <View style={{ zIndex: 9998, elevation: 20 }}>
                  {headerSaved && !isEditingHeader ? (
                    <View style={[inputStyles.box]}>
                      <Text style={inputStyles.input}>{renderLabel(project || projectUUID, ['ProjectTitle', 'Name'])}</Text>
                    </View>
                  ) : (
                    <Dropdown
                      placeholder="-Select Project-"
                      value={project}
                      options={projectsOptions}
                      getLabel={p => (p?.Name || p?.ProjectTitle || String(p))}
                      getKey={p => (p?.Uuid || p?.Id || p)}
                      onSelect={v => { setProject(v?.ProjectTitle || v), setProjectUUID(v?.Uuid || v); }}
                      renderInModal={true}
                      inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                      // textStyle={inputStyles.input}
                    />
                  )}
                </View>
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Payment Term*</Text>

                {/* <Text style={[inputStyles.label, { marginBottom: hp(1.5) }]}>Project Name*</Text> */}
                <View style={{ zIndex: 9998, elevation: 20 }}>
                  {headerSaved && !isEditingHeader ? (
                    <View style={[inputStyles.box]}>
                      <Text style={inputStyles.input}>{renderLabel(paymentTerm || paymentTermUuid, ['Name', 'Term'])}</Text>
                    </View>
                  ) : (
                    <Dropdown
                      placeholder="-Select Payment Term-"
                      value={paymentTerm}
                      options={paymentTermsOptions}
                      getLabel={p => (p?.Name || p?.Term || String(p))}
                      getKey={p => (p?.UUID || p?.Id || p)}
                      onSelect={v => { setPaymentTerm(v?.Name || v), setPaymentTermUuid(v?.UUID || v) }}
                      renderInModal={true}
                      inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                      // textStyle={inputStyles.input}
                    />
                  )}
                </View>
              </View>
            </View>

            <View style={[styles.row, { marginTop: hp(1.5) }]}>


              <View style={styles.col}>
                <Text style={inputStyles.label}>Payment Method*</Text>

                <View style={{ zIndex: 9998, elevation: 20 }}>
                  {headerSaved && !isEditingHeader ? (
                    <View style={[inputStyles.box]}>
                      <Text style={inputStyles.input}>{renderLabel(paymentMethod || paymentMethodUUID, ['Name', 'Mode'])}</Text>
                    </View>
                  ) : (
                    <Dropdown
                      placeholder="-Select Payment Method-"
                      value={paymentMethod}
                      options={paymentMethodsOptions}
                      getLabel={p => (p?.Name || p?.Mode || String(p))}
                      getKey={p => (p?.UUID || p?.Id || p)}
                      onSelect={v => { setPaymentMethod(v?.Name || v), setPaymentMethodUUID(v?.UUID || v) }}
                      renderInModal={true}
                      inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                      // textStyle={inputStyles.input}
                    />
                  )}
                </View>
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Days*</Text>
                {headerSaved && !isEditingHeader ? (
                  <View style={[inputStyles.box]} pointerEvents="none">
                    <Text style={inputStyles.input}>{renderLabel(dueDays || headerForm.DueDays)}</Text>
                  </View>
                ) : (
                  <View style={[inputStyles.box]}>
                    <TextInput
                      style={[inputStyles.input, { color: screenTheme.text }]}
                      value={dueDays}
                      onChangeText={t => {
                        const cleanValue = String(t).replace(/[^0-9]/g, '');
                        setDueDays(cleanValue);
                        setHeaderForm(s => ({ ...s, DueDays: cleanValue }));
                      }}
                      placeholder="-Days-"
                      placeholderTextColor={screenTheme.textLight}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
                )}
              </View>

            </View>
            {/* <View style={[styles.row, { marginTop: hp(1.5) }]}>
            

            </View> */}
            <View style={[styles.row, { marginTop: hp(1.5) }]}>
              <View style={styles.col}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openDatePickerFor('invoice')}
                >
                  <Text style={inputStyles.label}>Order Date* </Text>

                  <View
                    style={[
                      inputStyles.box,
                      styles.innerFieldBox,
                      styles.datePickerBox,
                      { alignItems: 'center' },
                    ]}
                  >
                    <Text
                      style={[
                        inputStyles.input,
                        styles.datePickerText,
                        !invoiceDate && {
                          color: COLORS.textLight,
                          fontFamily: TYPOGRAPHY.fontFamilyRegular,
                        },
                        invoiceDate && {
                          color: COLORS.text,
                          fontFamily: TYPOGRAPHY.fontFamilyMedium,
                        },
                      ]}
                    >
                      {invoiceDate || 'Order Date'}
                    </Text>
                    <View
                      style={[
                        styles.calendarIconContainer,
                        invoiceDate && styles.calendarIconContainerSelected,
                      ]}
                    >
                      <Icon
                        name="calendar-today"
                        size={rf(3.2)}
                        color={invoiceDate ? COLORS.primary : COLORS.textLight}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

              <View style={styles.col}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => openDatePickerFor('due')}
                >
                  <Text style={inputStyles.label}>Due Date* </Text>

                  <View
                    style={[
                      inputStyles.box,
                      styles.innerFieldBox,
                      styles.datePickerBox,
                      { alignItems: 'center' },
                    ]}
                  >
                    <Text
                      style={[
                        inputStyles.input,
                        styles.datePickerText,
                        !dueDate && {
                          color: COLORS.textLight,
                          fontFamily: TYPOGRAPHY.fontFamilyRegular,
                        },
                        dueDate && {
                          color: COLORS.text,
                          fontFamily: TYPOGRAPHY.fontFamilyMedium,
                        },
                      ]}
                    >
                      {dueDate || 'Due Date'}
                    </Text>
                    <View
                      style={[
                        styles.calendarIconContainer,
                        dueDate && styles.calendarIconContainerSelected,
                      ]}
                    >
                      <Icon
                        name="calendar-today"
                        size={rf(3.2)}
                        color={dueDate ? COLORS.primary : COLORS.textLight}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              </View>

            </View>
            <View style={[styles.row, { marginTop: hp(1.5) }]}>
              {(headerForm?.SalesOrderNo && (headerSaved || isEditingHeader)) ? (
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Sales Order Number*</Text>

                  {/* Show Sales Order Number only when editing an existing header or when viewing a saved header.
                   It must be read-only in both cases; hide it during Add-mode (creating new header). */}

                  <View style={[inputStyles.box]} pointerEvents="none">
                    <Text editable={false} style={[inputStyles.input, { flex: 1 }]}>{renderLabel(headerForm.SalesOrderNo)}</Text>
                  </View>
                </View>
              ) : null}
            </View>

          </AccordionSection>

          {/* Section 2: Billing Address */}
          {!(headerSaved && !isEditingHeader) && (
            <AccordionSection
              id={2}
              title="Billing Address"
              expanded={Array.isArray(expandedIds) ? expandedIds.includes(2) : expandedIds === 2}
              onToggle={toggleSection}
            >
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Building No.*</Text>
                  <View style={[inputStyles.box]} pointerEvents="box-none">
                    <TextInput
                      style={[inputStyles.input, { flex: 1, color: screenTheme.text }]}
                      value={billingForm.buildingNo}
                      onChangeText={v =>
                        setBillingForm(s => ({ ...s, buildingNo: v }))
                      }
                      placeholder="eg."
                      placeholderTextColor={screenTheme.textLight}
                    />
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Street 1*</Text>
                  <View style={[inputStyles.box]} pointerEvents="box-none">
                    <TextInput
                      style={[inputStyles.input, { color: screenTheme.text, flex: 1 }]}
                      value={billingForm.street1}
                      onChangeText={v =>
                        setBillingForm(s => ({ ...s, street1: v }))
                      }
                      placeholder="eg."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Street 2</Text>
                  <View style={[inputStyles.box]} pointerEvents="box-none">
                    <TextInput
                      style={[inputStyles.input, { flex: 1 }]}
                      value={billingForm.street2}
                      onChangeText={v =>
                        setBillingForm(s => ({ ...s, street2: v }))
                      }
                      placeholder="eg."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Postal Code*</Text>
                  <View style={[inputStyles.box]} pointerEvents="box-none">
                    <TextInput
                      style={[inputStyles.input, { flex: 1 }]}
                      value={billingForm.postalCode}
                      onChangeText={v =>
                        setBillingForm(s => ({ ...s, postalCode: v }))
                      }
                      placeholder="eg."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Country Name*</Text>
                  <View style={{ zIndex: 9999, elevation: 20 }}>
                    <Dropdown
                      placeholder="Select Country*"
                      value={selectedBillingCountry}
                      options={countriesOptions}
                      getLabel={c => (c?.Name || c?.CountryName || c?.countryName || String(c))}
                      getKey={c => (c?.UUID || c?.Id || c)}
                      onSelect={(v) => { handleBillingCountrySelect(v); }}
                      inputBoxStyle={inputStyles.box}
                      style={{ marginBottom: hp(1.6) }}
                      renderInModal={true}
                    />
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>State Name*</Text>
                  <View style={{ zIndex: 9999, elevation: 20 }}>
                    <Dropdown
                      placeholder="Select State*"
                      value={selectedBillingState}
                      options={statesOptions}
                      getLabel={c => (c?.Name || c?.StateName || String(c))}
                      getKey={c => (c?.UUID || c?.Id || c)}
                      onSelect={handleBillingStateSelect}
                      inputBoxStyle={inputStyles.box}
                      style={{ marginBottom: hp(1.6) }}
                      renderInModal={true}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>City Name*</Text>
                  <View style={{ zIndex: 9998, elevation: 20 }}>
                    <Dropdown
                      placeholder="- Select City -"
                      value={selectedBillingCity}
                      options={citiesOptions}
                      getLabel={c => (c?.Name || c?.CityName || String(c))}
                      getKey={c => (c?.UUID || c?.Id || c)}
                      onSelect={c => {
                        setSelectedBillingCity(c);
                        setBillingForm(s => ({ ...s, city: c?.UUID || c }));
                      }}
                      inputBoxStyle={inputStyles.box}
                      style={{ marginBottom: hp(1.6) }}
                      renderInModal={true}
                    />
                  </View>
                </View>
                <View style={[styles.col, styles.checkboxCol]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={styles.checkboxRow}
                    onPress={() => {
                      toggleCopyBillingToShipping();
                    }}
                  >
                    <View style={[styles.checkboxBox, isShippingSame && styles.checkboxBoxChecked]}>
                      {isShippingSame ? (
                        <Icon name="check" size={rf(3)} color="#fff" />
                      ) : null}
                    </View>
                    <View style={{ width: '80%' }}>
                      <Text
                        style={[
                          inputStyles.label,
                          { marginLeft: wp(2), marginTop: 0 },
                        ]}
                      >
                        Is Shipping Address Same
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </AccordionSection>
          )}

          {/* Section 3: Shipping Address */}
          {!(headerSaved && !isEditingHeader) && (
            <AccordionSection
              id={3}
              title="Shipping Address"
              expanded={Array.isArray(expandedIds) ? expandedIds.includes(3) : expandedIds === 3}
              onToggle={toggleSection}
            >
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Building No.*</Text>
                  <View style={[inputStyles.box]} pointerEvents="box-none">
                    <TextInput
                      style={[inputStyles.input, { flex: 1 }]}
                      value={shippingForm.buildingNo}
                      onChangeText={v =>
                        setShippingForm(s => ({ ...s, buildingNo: v }))
                      }
                      placeholder="eg."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Street 1*</Text>
                  <View style={[inputStyles.box]} pointerEvents="box-none">
                    <TextInput
                      style={[inputStyles.input, { flex: 1 }]}
                      value={shippingForm.street1}
                      onChangeText={v =>
                        setShippingForm(s => ({ ...s, street1: v }))
                      }
                      placeholder="eg."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Street 2</Text>
                  <View style={[inputStyles.box]} pointerEvents="box-none">
                    <TextInput
                      style={[inputStyles.input, { flex: 1 }]}
                      value={shippingForm.street2}
                      onChangeText={v =>
                        setShippingForm(s => ({ ...s, street2: v }))
                      }
                      placeholder="eg."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Postal Code*</Text>
                  <View style={[inputStyles.box]} pointerEvents="box-none">
                    <TextInput
                      style={[inputStyles.input, { flex: 1 }]}
                      value={shippingForm.postalCode}
                      onChangeText={v =>
                        setShippingForm(s => ({ ...s, postalCode: v }))
                      }
                      placeholder="eg."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Country Name*</Text>
                  <View style={{ zIndex: 9999, elevation: 20 }}>
                    <Dropdown
                      placeholder="- Select Country -"
                      value={selectedShippingCountry}
                      options={countriesOptions}
                      getLabel={c => (c?.Name || c?.CountryName || c?.countryName || String(c))}
                      getKey={c => (c?.UUID || c?.Id || c)}
                      onSelect={handleShippingCountrySelect}
                      inputBoxStyle={inputStyles.box}
                      // textStyle={inputStyles.input}
                      style={{ marginBottom: hp(1.6) }}
                      renderInModal={true}
                    />
                  </View>
                </View>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>State Name*</Text>
                  <View style={{ zIndex: 9999, elevation: 20 }}>
                    <Dropdown
                      placeholder="- Select State -"
                      value={selectedShippingState}
                      options={shippingStatesOptions}
                      getLabel={c => (c?.Name || c?.StateName || String(c))}
                      getKey={c => (c?.UUID || c?.Id || c)}
                      onSelect={handleShippingStateSelect}
                      inputBoxStyle={inputStyles.box}
                      // textStyle={inputStyles.input}
                      style={{ marginBottom: hp(1.6) }}
                      renderInModal={true}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>City Name*</Text>
                  <View style={{ zIndex: 9998, elevation: 20 }}>
                    <Dropdown
                      placeholder="- Select City -"
                      value={selectedShippingCity}
                      options={shippingCitiesOptions}
                      getLabel={c => (c?.Name || c?.CityName || String(c))}
                      getKey={c => (c?.UUID || c?.Id || c)}
                      onSelect={c => {
                        setSelectedShippingCity(c);
                        setShippingForm(s => ({ ...s, city: c?.UUID || c }));
                      }}
                      inputBoxStyle={inputStyles.box}
                      // textStyle={inputStyles.input}
                      style={{ marginBottom: hp(1.6) }}
                      renderInModal={true}
                    />
                  </View>
                </View>
                <View style={styles.col} />
              </View>

              {/* Submit button inside Shipping section when header fields filled */}
              <View style={{ marginTop: hp(1.2), alignItems: 'flex-end' }}>
                {hasHeaderData() && !headerSaved ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    style={[formStyles.primaryBtn, { paddingVertical: hp(1), width: wp(36) }]}
                    onPress={saveHeader}
                    disabled={isSavingHeader}
                  >
                    <Text style={formStyles.primaryBtnText}>
                      {isSavingHeader ? (isEditingHeader ? 'Updating...' : 'Saving...') : (isEditingHeader ? 'Update' : 'Submit')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </AccordionSection>
          )}

          {/* Section 4: Create Order */}
          {headerSaved && (
            <AccordionSection
              id={4}
              title="Create Order"
              expanded={Array.isArray(expandedIds) ? expandedIds.includes(4) : expandedIds === 4}
              onToggle={toggleSection}
              wrapperStyle={{ overflow: 'visible' }}
            >
              <View style={{ marginTop: hp(1) }}>
                <Text
                  style={[
                    styles.sectionTitle,
                    {
                      marginBottom: hp(1),
                      color: COLORS.textMuted,
                      fontWeight: '700',
                      fontSize: wp(4.5),
                    },
                  ]}
                >
                  Item Details
                </Text>

                {/* LINE form: Item | Description | Quantity | Rate | Amount */}
                <View style={{ marginBottom: hp(1.5) }}>
                  {/* Item dropdown full width */}
                  <View style={{ width: '100%', marginBottom: hp(1) }}>
                    <Text style={inputStyles.label}>Item*</Text>
                    <View style={{ zIndex: 9999, elevation: 20 }}>
                      <Dropdown
                        placeholder="Select Item"
                        value={currentItem.itemName}
                        options={masterItems}
                        getLabel={it => (it?.name || String(it))}
                        getKey={it => (it?.sku || it)}
                        onSelect={v => {
                          if (v && typeof v === 'object') {
                            setCurrentItem(ci => ({ ...ci, itemName: v?.name || v, itemNameUuid: v?.sku || v, rate: String(v?.rate || ci?.rate || ''), desc: v?.desc || ci?.desc || '', hsn: v?.hsn || ci?.hsn || '' }));
                          } else {
                            setCurrentItem(ci => ({ ...ci, itemName: v, itemNameUuid: null }));
                          }
                        }}
                        renderInModal={true}
                        inputBoxStyle={[inputStyles.box, { width: '100%' }]}
                        // textStyle={inputStyles.input}
                      />
                    </View>
                  </View>

                  {/* Description full width */}
                  <View style={{ width: '100%', marginBottom: hp(1) }}>
                    <Text style={inputStyles.label}>Description</Text>
                    <TextInput
                      style={[styles.descInput, { minHeight: hp(10), width: '100%', color: screenTheme.text }]}
                      value={currentItem.desc || ''}
                      onChangeText={t => setCurrentItem(ci => ({ ...ci, desc: t }))}
                      placeholder="Enter description"
                      placeholderTextColor={screenTheme.textLight}
                      multiline
                      numberOfLines={3}
                    />
                  </View>

                  {/* HSN/SAC field */}
                  <View style={{ width: '100%', marginBottom: hp(1) }}>
                    <Text style={inputStyles.label}>HSN/SAC</Text>
                    <View style={[inputStyles.box, { marginTop: hp(0.5), width: '100%' }]}>
                      <TextInput
                        style={[inputStyles.input]}
                        value={currentItem.hsn || ''}
                        onChangeText={t => setCurrentItem(ci => ({ ...ci, hsn: t }))}
                        placeholder="Enter HSN/SAC code"
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>
                  </View>

                  {/* Two fields in one line: Quantity & Rate */}
                  <View style={[styles.row, { justifyContent: 'space-between' }]}>
                    <View style={{ width: '48%' }}>
                      <Text style={inputStyles.label}>Quantity*</Text>
                      <View style={[inputStyles.box, { marginTop: hp(0.5), width: '100%' }]}>
                        <TextInput
                          style={[inputStyles.input, { textAlign: 'center' }]}
                          value={String(currentItem.quantity || '')}
                          onChangeText={v => setCurrentItem(ci => ({ ...ci, quantity: v }))}
                          keyboardType="numeric"
                          placeholder="1"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>

                    <View style={{ width: '48%' }}>
                      <Text style={inputStyles.label}>Rate*</Text>
                      <View style={[inputStyles.box, { marginTop: hp(0.5), width: '100%' }]}>
                        <TextInput
                          style={[inputStyles.input, { textAlign: 'center' }]}
                          value={String(currentItem.rate ?? '')}
                          onChangeText={v => setCurrentItem(ci => ({ ...ci, rate: v }))}
                          keyboardType="numeric"
                          placeholder="0"
                          placeholderTextColor={COLORS.textLight}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Amount display and action buttons */}
                  <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginTop: hp(1) }]}>
                    <View style={{ width: '40%' }}>
                      <Text style={inputStyles.label}>Amount</Text>
                      <View style={[inputStyles.box, { marginTop: hp(0.5), width: '60%' }]}>
                        <Text style={[inputStyles.input, { textAlign: 'center', fontWeight: '600' }]}>₹{computeAmount(currentItem.quantity || 0, currentItem.rate || 0)}</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: 'row' }}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.addButton, { backgroundColor: COLORS.primary }]}
                        onPress={handleAddLineItem}
                        disabled={isAddingLine}
                      >
                        {isAddingLine ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={[styles.addButtonText, { color: '#fff' }]}>{editItemId ? 'Update' : 'Add'}</Text>
                        )}
                      </TouchableOpacity>
                      {editItemId ? (
                        <TouchableOpacity
                          activeOpacity={0.8}
                          style={[styles.addButton, { backgroundColor: '#6c757d', marginLeft: wp(3) }]}
                          onPress={() => { setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null, desc: '', hsn: '', rate: '' }); setEditItemId(null); }}
                        >
                          <Text style={styles.addButtonText}>Cancel</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                </View>


              </View>

              {/* Table container (search + pagination + table) */}
              {linesLoading ? (
                <View style={{ paddingVertical: hp(4), alignItems: 'center',  color: screenTheme.text }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View> 
              ) : items.length > 0 && (
                <View>
                  <View style={styles.tableControlsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={{ marginRight: wp(2), color: screenTheme.text  }}>Show</Text>
                      <Dropdown
                        placeholder={String(pageSize)}
                        value={String(pageSize)}
                        options={pageSizes}
                        getLabel={p => String(p)}
                        getKey={p => String(p)}
                        onSelect={v => { setPageSize(Number(v)); setPage(1); }}
                        inputBoxStyle={{ width: wp(18) }}
                        // textStyle={inputStyles.input}
                      />
                      <Text style={{ marginLeft: wp(2) , color: screenTheme.text }}>entries</Text>
                    </View>

                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                      <TextInput
                        style={[inputStyles.box, { width: wp(40), height: hp(5), paddingHorizontal: wp(2) }]}
                        placeholder="Search..."
                        value={tableSearch}
                        onChangeText={t => { setTableSearch(t); setPage(1); }}
                        placeholderTextColor={COLORS.textLight}
                      />
                    </View>
                  </View>

                  <View style={styles.tableWrapper}>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      nestedScrollEnabled={true}
                      keyboardShouldPersistTaps="handled"
                      directionalLockEnabled={true}
                    >
                      <View style={styles.table}>
                        <View style={styles.thead}>
                          <View style={styles.tr}>
                            <Text style={[styles.th, { color: screenTheme.text, width: wp(10) }]}>Sr.No</Text>
                            <Text style={[styles.th, { color: screenTheme.text, width: wp(30) }]}>Item Details</Text>
                            <Text style={[styles.th, { color: screenTheme.text, width: wp(30) }]}>Description</Text>
                            <Text style={[styles.th, { color: screenTheme.text, width: wp(25) }]}>HSN/SAC</Text>
                            <Text style={[styles.th, { color: screenTheme.text, width: wp(20) }]}>Quantity</Text>
                            <Text style={[styles.th, { color: screenTheme.text, width: wp(20) }]}>Rate</Text>
                            <Text style={[styles.th, { color: screenTheme.text, width: wp(20) }]}>Amount</Text>
                            <Text style={[styles.th, { color: screenTheme.text, width: wp(40) }]}>Action</Text>
                          </View>
                        </View>

                        <View style={styles.tbody}>
                          {(() => {
                            const q = String(tableSearch || '').trim().toLowerCase();
                            const filtered = q ? items.filter(it => {
                              return (
                                String(it.name || '').toLowerCase().includes(q) ||
                                String(it.itemType || '').toLowerCase().includes(q) ||
                                String(it.hsn || '').toLowerCase().includes(q) ||
                                String(it.desc || '').toLowerCase().includes(q)
                              );
                            }) : items;
                            const total = filtered.length;
                            const ps = Number(pageSize) || 10;
                            const totalPages = Math.max(1, Math.ceil(total / ps));
                            const currentPage = Math.min(Math.max(1, page), totalPages);
                            const start = (currentPage - 1) * ps;
                            const end = Math.min(start + ps, total);
                            const visible = filtered.slice(start, end);

                            return (
                              <>
                                {visible.map((item, idx) => (
                                  <View key={item.id} style={styles.tr}>
                                    <View style={[styles.td, { width: wp(10) }]}>
                                      <Text style={styles.tdText}>{start + idx + 1}</Text>
                                    </View>
                                    <View style={[styles.td, { width: wp(30), paddingLeft: wp(2) }]}>
                                      <Text style={styles.tdText}>{item.name}</Text>
                                    </View>
                                    <View style={[styles.td, { width: wp(30) }]}>
                                      <Text style={styles.tdText}>{item.desc}</Text>
                                    </View>
                                    <View style={[styles.td, { width: wp(25) }]}>
                                      <Text style={styles.tdText}>{item.hsn}</Text>
                                    </View>
                                    <View style={[styles.td, { width: wp(20) }]}>
                                      <Text style={styles.tdText}>{item.qty}</Text>
                                    </View>
                                    <View style={[styles.td, { width: wp(20) }]}>
                                      <Text style={styles.tdText}>₹{item.rate}</Text>
                                    </View>
                                    <View style={[styles.td, { width: wp(20) }]}>
                                      <Text style={[styles.tdText, { fontWeight: '600' }]}>₹{item.amount}</Text>
                                    </View>
                                    <View style={[styles.tdAction, { width: wp(40) }, { flexDirection: 'row', paddingLeft: wp(2) }]}>
                                      <TouchableOpacity style={styles.actionButton} onPress={() => handleEditItem(item.id)}>
                                        <Icon name="edit" size={rf(3.6)} color="#fff" />
                                      </TouchableOpacity>
                                      <TouchableOpacity style={[styles.actionButton, { marginLeft: wp(2) }]} onPress={() => deleteItem(item.id)}>
                                        <Icon name="delete" size={rf(3.6)} color="#fff" />
                                      </TouchableOpacity>
                                    </View>
                                  </View>
                                ))}

                                <View style={styles.paginationRow}>
                                  <Text style={{ color: COLORS.textMuted }}>
                                    Showing {total === 0 ? 0 : start + 1} to {end} of {total} entries
                                  </Text>
                                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity
                                      style={[styles.pageButton, { marginRight: wp(2) }]}
                                      disabled={currentPage <= 1}
                                      onPress={() => setPage(p => Math.max(1, p - 1))}
                                    >
                                      <Text style={styles.pageButtonText}>Previous</Text>
                                    </TouchableOpacity>
                                    <Text style={{ marginHorizontal: wp(2) }}>{currentPage}</Text>
                                    <TouchableOpacity
                                      style={styles.pageButton}
                                      disabled={currentPage >= totalPages}
                                      onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                                    >
                                      <Text style={styles.pageButtonText}>Next</Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>
                              </>
                            );
                          })()}
                        </View>
                      </View>
                    </ScrollView>
                  </View>
                </View>
              )}
              <View style={styles.billContainer}>
                {/* Subtotal */}
                <View style={styles.row}>
                  <Text style={styles.labelBold}>Subtotal:</Text>
                  <Text style={styles.valueBold}>₹{computeSubtotal()}</Text>
                </View>

                {/* Shipping Charges */}
                <View style={styles.rowInput}>
                  <Text style={styles.label}>Shipping Charges :</Text>

                  <View style={styles.inputRightGroup}>
                    <TextInput
                      value={String(shippingCharges)}
                      onChangeText={setShippingCharges}
                      keyboardType="numeric"
                      style={[styles.inputBox, { color: screenTheme.text }]}
                    />

                    {/* Question Icon with Tooltip */}
                    <View style={styles.helpIconWrapper}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowShippingTip(!showShippingTip);
                          setShowAdjustmentTip(false);
                        }}
                        style={styles.helpIconContainer}
                      >
                        <Text style={styles.helpIcon}>?</Text>
                      </TouchableOpacity>

                      {/* Tooltip */}
                      {showShippingTip && (
                        <>
                          <Modal
                            transparent
                            visible={showShippingTip}
                            animationType="none"
                            onRequestClose={() => setShowShippingTip(false)}
                          >
                            <TouchableWithoutFeedback
                              onPress={() => setShowShippingTip(false)}
                            >
                              <View style={styles.modalOverlay} />
                            </TouchableWithoutFeedback>
                          </Modal>
                          <View style={styles.tooltipBox}>
                            <Text style={styles.tooltipText}>
                              Amount spent on shipping the goods.
                            </Text>
                            <View style={styles.tooltipArrow} />
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  <Text style={styles.value}>
                    ₹{parseFloat(shippingCharges || 0).toFixed(2)}
                  </Text>
                </View>

                {/* Adjustments */}
                <View style={styles.rowInput}>
                  <TextInput
                    value={adjustmentLabel}
                    onChangeText={setAdjustmentLabel}
                    underlineColorAndroid="transparent"
                    style={styles.labelInput}
                  />

                  <View style={styles.inputRightGroup}>
                    <TextInput
                      value={String(adjustments)}
                      onChangeText={setAdjustments}
                      keyboardType="numeric"
                      style={[styles.inputBox, { color: screenTheme.text }]}
                    />
                    {/* Question Icon with Tooltip */}
                    <View style={styles.helpIconWrapper}>
                      <TouchableOpacity
                        onPress={() => {
                          setShowAdjustmentTip(!showAdjustmentTip);
                          setShowShippingTip(false);
                        }}
                        style={styles.helpIconContainer}
                      >
                        <Text style={styles.helpIcon}>?</Text>
                      </TouchableOpacity>

                      {/* Tooltip */}
                      {showAdjustmentTip && (
                        <>
                          <Modal
                            transparent
                            visible={showAdjustmentTip}
                            animationType="none"
                            onRequestClose={() => setShowAdjustmentTip(false)}
                          >
                            <TouchableWithoutFeedback
                              onPress={() => setShowAdjustmentTip(false)}
                            >
                              <View style={styles.modalOverlay} />
                            </TouchableWithoutFeedback>
                          </Modal>
                          <View style={styles.tooltipBox}>
                            <Text style={styles.tooltipText}>
                              Additional charges or discounts applied to the
                              order.
                            </Text>
                            <View style={styles.tooltipArrow} />
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  <Text style={styles.value}>
                    ₹{parseFloat(adjustments || 0).toFixed(2)}
                  </Text>
                </View>

                {/* Total Tax */}
                <View style={styles.row}>
                  <Text style={styles.label}>Total Tax:</Text>
                  <Text style={styles.value}>₹{(parseFloat(totalTax) || 0).toFixed(2)}</Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Total Amount */}
                <View style={styles.row}>
                  <Text style={styles.labelBold}>Total Amount:</Text>
                  <Text style={styles.valueBold}>
                    ₹
                    {(() => {
                      const subtotal = parseFloat(computeSubtotal()) || 0;
                      const tax = parseFloat(totalTax) || 0;
                      const displayed = subtotal + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + tax;
                      return displayed.toFixed(2);
                    })()}
                  </Text>
                </View>
              </View>

              {/* Notes + Attach file inline */}
              <View style={styles.notesAttachRow}>
                <View style={styles.notesCol}>
                  <Text style={inputStyles.label}>Notes</Text>
                  <TextInput
                    style={[styles.noteBox, { color: screenTheme.text }]}
                    multiline
                    numberOfLines={4}
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Add any remarks..."
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
                <View style={styles.notesCol}>
                  <Text style={inputStyles.label}>Terms & Conditions</Text>
                  <TextInput
                    style={[styles.noteBox, { color: screenTheme.text }]}
                    multiline
                    numberOfLines={4}
                    value={terms}
                    onChangeText={setTerms}
                    placeholder="Terms & Conditions..."
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
                <View style={styles.attachCol}>
                  <Text style={inputStyles.label}>Attach file</Text>
                  <View
                    style={[
                      inputStyles.box,
                      { justifyContent: 'space-between' },
                      styles.fileInputBox,
                    ]}
                  >
                    <TextInput
                      style={[inputStyles.input, { fontSize: rf(4.2) }]}
                      placeholder="Attach file"
                      placeholderTextColor={COLORS.textLight}
                      value={file?.name || ''}
                      editable={false}
                    />
                    {file ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={removeFile}
                      >
                        <Icon
                          name="close"
                          size={rf(3.6)}
                          color="#ef4444"
                          style={{ marginRight: SPACING.sm }}
                        />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.uploadButton]}
                        onPress={pickFile}
                      >
                        <Icon name="cloud-upload" size={rf(4)} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={styles.uploadHint}>
                    Allowed: PDF, PNG, JPG • Max size 10 MB
                  </Text>
                </View>
              </View>
            </AccordionSection>
          )}

          {/* Section 5: Notes (full width) */}
          {/* <AccordionSection id={5} title="Notes" expanded={expandedId === 5} onToggle={toggleSection}>
                            <Text style={inputStyles.label}>Notes</Text>
                            <TextInput style={styles.noteBox} multiline numberOfLines={4} value={notes} onChangeText={setNotes} placeholder="Add any remarks..." placeholderTextColor={COLORS.textLight} />
                        </AccordionSection> */}
        </ScrollView>


        <View style={styles.footerBar}>
          <View
            style={[
              formStyles.actionsRow,
              {
                justifyContent: 'space-between',
                paddingHorizontal: wp(3.5),
                paddingVertical: hp(1),
              },
            ]}
          >
            <View style={{ flexDirection: 'row', flex: 1, gap: wp(2) }}>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[formStyles.primaryBtn, { paddingVertical: hp(1.4), flex: 1 }]}
                onPress={handleCreateOrder}
                disabled={false}
              >
                <Text style={formStyles.primaryBtnText}>
                  Submit
                  {/* {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Submit')} */}
                </Text>
              </TouchableOpacity>

              {/* PDF Download Button - Show only if header is saved */}
            </View>

            <TouchableOpacity
              activeOpacity={0.85}
              style={formStyles.cancelBtn}
              onPress={onCancel}
            >
              <Text style={formStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          {/* <View style={styles.centerButtonContainer}>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleCreateOrder}>
                        <Text style={styles.primaryButtonText}>Submit</Text>
                    </TouchableOpacity> */}
        </View>
        <DatePickerBottomSheet
          isVisible={openDatePicker}
          onClose={closeDatePicker}
          selectedDate={datePickerSelectedDate}
          onDateSelect={handleDateSelect}
          title="Select Date"
        />

      </View>
    </>
  );
};

export default ManageSalesOrder;

const styles = StyleSheet.create({
  container: {
    padding: wp(3.5),
    // paddingBottom: hp(6),
    backgroundColor: '#fff',
  },
  line: {
    borderBottomColor: COLORS.border,
    borderBottomWidth: hp(0.2),
    // marginVertical: hp(0.7),
  },
  headerSeparator: {
    height: 1,
    // backgroundColor: COLORS.border,
    width: '100%',
  },
  sectionWrapper: {
    marginBottom: hp(1.8),
    borderRadius: wp(2.5),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
    backgroundColor: '#fff',
  },
  sectionTitle: {
    fontSize: rf(4),
    // paddingVertical: hp(0.3),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontWeight: '700',
  },
  sectionBody: {
    padding: wp(2),
  },
  // Date picker helper styles (matching LeadForm)
  datePickerContainer: {},
  datePickerBox: {},
  datePickerText: {
    flex: 1,
    fontSize: rf(3.6),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    marginLeft: wp(2),
  },
  calendarIconContainer: {
    padding: wp(1),
    borderRadius: wp(1),
    marginLeft: wp(1),
  },
  calendarIconContainerSelected: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: wp(2),
    paddingVertical: wp(1),
  },
  innerFieldBox: {
    borderColor: '#e5e7eb',
    borderWidth: 0.8,
    height: hp(5.4),
  },
  label: {
    marginTop: hp(1.2),
    color: COLORS.textMuted,
    fontSize: rf(3.0),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  // input: {
  //     borderWidth: 0.8,
  //     borderColor: COLORS.border,
  //     borderRadius: wp(2.5),
  //     paddingHorizontal: wp(3.2),
  //     height: hp(5.2),
  //     marginTop: hp(0.8),
  //     fontFamily: TYPOGRAPHY.fontFamilyRegular,
  //     color: COLORS.text
  // },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  col: {
    width: '48%',
  },
  colFull: {
    width: '100%',
  },
  checkboxCol: {
    justifyContent: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBox: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(1.2),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#F97316',
    borderColor: '#F97316',
  },
  smallInput: {
    width: wp(12),
    borderWidth: 0.8,
    borderColor: COLORS.border,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(3.2),
    height: hp(5.2),
    marginLeft: wp(2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    color: COLORS.text,
  },
  itemWrapper: {
    marginTop: hp(1.2),
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1),
  },
  amountBox: {
    width: wp(18),
    alignItems: 'flex-end',
  },
  noteBox: {
    borderWidth: 0.8,
    borderColor: COLORS.border,
    borderRadius: wp(2.5),
    padding: wp(3),
    backgroundColor: '#fff',
    marginTop: hp(1),
  },
  centerButtonContainer: {
    alignItems: 'center',
    marginVertical: hp(1),
    backgroundColor: '#fff',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.primary,
    marginLeft: wp(2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  summaryLabel: {
    fontSize: rf(3.2),
    color: COLORS.textMuted,
    marginBottom: hp(1),
  },
  previewBox: {
    borderWidth: 0.8,
    borderColor: COLORS.border,
    borderRadius: wp(2.5),
    padding: wp(3),
    backgroundColor: '#fff',
  },
  previewText: {
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    marginBottom: hp(0.6),
  },
  itemCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(1.2),
    padding: wp(3),
    marginBottom: hp(1.2),
    backgroundColor: '#fff',
  },
  itemHeader: {
    marginTop: hp(0.6),
    marginBottom: hp(0.6),
  },
  descInput: {
    borderWidth: 0.8,
    borderColor: COLORS.border,
    borderRadius: wp(1.2),
    padding: wp(2),
    backgroundColor: '#fff',
    minHeight: hp(8),
    textAlignVertical: 'top',
  },
  /* removed duplicate red deleteBtn to avoid extra spacing; keep the final deleteBtn style below */
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.6),
    borderRadius: wp(2.5),
    marginTop: hp(1.6),
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    fontSize: rf(3.6),
  },
  //  Table Style
  // tableHeaderCell: {
  //     fontSize: rf(1.7),
  //     fontWeight: '600',
  //     width: wp(12),
  //     textAlign: 'center',
  //     paddingVertical: hp(1),
  // },

  // tableHeaderCellWide: {
  //     fontSize: rf(1.7),
  //     fontWeight: '600',
  //     width: wp(50),
  //     textAlign: 'center',
  //     paddingVertical: hp(1),
  // },

  // tableRow: {
  //     flexDirection: 'row',
  //     borderBottomWidth: 1,
  //     borderColor: COLORS.border,
  //     paddingHorizontal: wp(1),
  //     alignItems: 'center',
  // },

  // tableCell: {
  //     width: wp(12),
  //     padding: wp(1),
  //     borderRightWidth: 1,
  //     borderColor: COLORS.border,
  // },

  tableCellWide: {
    width: wp(50),
    padding: wp(1),
    borderRightWidth: 1,
    borderColor: COLORS.border,
  },

  // input: {
  //     textAlign: 'center',
  //     // borderWidth: 1,
  //     // borderColor: COLORS.border,
  //     // borderRadius: wp(1),
  //     paddingHorizontal: wp(2),
  //     paddingVertical: hp(0.8),
  // },

  // deleteBtn: {
  //     backgroundColor: COLORS.primary,
  //     paddingVertical: hp(0.8),
  //     paddingHorizontal: wp(3),
  //     borderRadius: wp(1),
  // },
  // //  end here
  selectedContainer: {
    backgroundColor: '#f3f3f3', // light muted background
    padding: wp(3),
    marginTop: hp(0.8),
    borderBottomLeftRadius: wp(3), // round bottom-left
    borderBottomRightRadius: wp(1), // slight curve
    borderWidth: 1,
    borderColor: '#ddd',
  },

  itemHeader: {
    marginBottom: hp(0.8),
  },

  itemName: {
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    color: COLORS.text,
    fontSize: wp(3.7),
  },

  itemSku: {
    color: COLORS.textLight,
    marginTop: hp(0.4),
    fontSize: wp(3),
  },

  descInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: wp(2),
    marginTop: hp(0.8),
    borderRadius: wp(2),
    color: COLORS.text,
  },

  hsnTag: {
    backgroundColor: COLORS.info,
    fontSize: wp(2.2),
    color: '#fff',
    padding: wp(1.2),
    borderRadius: wp(2),
    alignSelf: 'flex-start',
    marginTop: hp(1),
  },
  /* Totals / Notes styles */
  totalsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(1.5),
    padding: wp(3),
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(1.2),
  },
  totalsLeft: {
    width: '55%',
  },
  totalsRight: {
    width: '45%',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: hp(0.6),
  },
  totalsRowSmall: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    marginBottom: hp(0.3),
  },
  totalsLabel: {
    fontSize: rf(3.2),
    color: COLORS.textMuted,
  },
  totalsValue: {
    fontSize: rf(3.2),
    color: COLORS.text,
  },
  totalsLabelSmall: {
    fontSize: rf(2.8),
    color: COLORS.textMuted,
    marginRight: wp(2),
  },
  totalsDivider: {
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    width: '100%',
    marginVertical: hp(0.8),
  },
  totalsRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  totalsLabelBold: {
    fontSize: rf(3.4),
    fontWeight: '700',
    color: COLORS.text,
  },
  totalsValueBold: {
    fontSize: rf(3.4),
    fontWeight: '700',
    color: COLORS.text,
  },
  smallNumericInput: {
    width: wp(24),
    borderWidth: 0.8,
    borderColor: COLORS.border,
    borderRadius: wp(1.2),
    paddingHorizontal: wp(2),
    height: hp(5),
    backgroundColor: '#fff',
  },
  notesAttachRow: {
    flexDirection: 'column',
    marginTop: hp(1.2),
    alignItems: 'flex-start',
  },
  notesCol: {
    width: wp(90.5),
    flex: 1,
    paddingRight: wp(2),
    marginTop: hp(0.8),

  },
  attachCol: {
    width: wp(88.5),
    flex: 1,
    alignItems: 'flex-start',
  },
  attachBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chooseFileBtn: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderRadius: wp(1),
  },
  chooseFileText: {
    color: COLORS.text,
  },
  fileNameBox: {
    marginLeft: wp(2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(1),
    width: wp(60),
    justifyContent: 'center',
  },
  fileNameText: {
    color: COLORS.textLight,
    fontSize: rf(3),
    marginLeft: wp(2),
    flex: 1,
  },
  fileDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: wp(2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(1),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(1),
    backgroundColor: '#fff',
    flex: 1,
  },
  previewImage: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(1),
    marginRight: wp(2),
  },
  removeBtn: {
    marginLeft: wp(2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
  },
  removeBtnText: {
    color: '#dc3545',
    fontSize: rf(4),
    fontWeight: 'bold',
  },
  noFile: {
    marginLeft: wp(2),
    paddingHorizontal: wp(2),
    paddingVertical: hp(1),
  },
  noFileText: {
    color: COLORS.textLight,
    fontSize: rf(3),
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    padding: wp(2.2),
    borderRadius: wp(2),
  },
  fileInputBox: {
    marginTop: hp(0.8),
    width: '100%',
  },
  uploadHint: {
    marginTop: hp(0.6),
    color: '#6b7280',
    fontSize: rf(2.8),
    fontStyle: 'italic',
  },
  tableWrapper: {
    borderWidth: 1,
    borderColor: '#CFCFCF',
    borderRadius: wp(1.5),
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  table: { minWidth: wp(170) },

  /* ── COMMON ── */
  thead: {
    backgroundColor: '#f1f1f1',
  },
  tr: {
    flexDirection: 'row',

  },

  /* ── TH (header) ── */
  th: {
    paddingVertical: hp(1.4),
    textAlign: 'center',
    fontWeight: '700',
    fontSize: wp(3),
    borderRightWidth: 1,
    borderRightColor: '#CFCFCF',
  },

  /* ── TD (body) ── */
  td: {
    paddingHorizontal: wp(0.8),
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    paddingVertical: hp(1.2),
  },
  tdText: {
    fontSize: wp(3),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  actionButton: {
    backgroundColor: '#6c757d',
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderRadius: wp(1),
  },
  addButtonWrapperRow: {
    flexDirection: 'row',
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  addButton: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: wp(1),
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: wp(18),
  },
  addButtonText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: wp(3.4),
    textAlign: 'center',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  tableControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: wp(2),
  },
  paginationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: wp(2),
    width: '100%',
  },
  pageButton: {
    backgroundColor: '#e5e7eb',
    paddingVertical: hp(0.6),
    paddingHorizontal: wp(3),
    borderRadius: wp(0.8),
  },
  pageButtonText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  tdAction: {
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  /* ── INPUT ── */
  input: {
    width: '100%',
    textAlign: 'center',
    fontSize: wp(3.2),
    color: COLORS.text,
    paddingVertical: hp(0.6),
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: wp(1),
    backgroundColor: '#fff',
  },
  /* ── BUTTONS ── */
  deleteBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(5),
    borderRadius: wp(1),
  },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: wp(2.8) },

  addBtn: {
    marginTop: hp(1.5),
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: hp(0.9),
    paddingHorizontal: wp(4),
    borderRadius: wp(1),
    alignSelf: 'flex-start',
  },
  addBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: wp(3.5) },
  billContainer: {
    paddingVertical: 10,
    width: '100%',
  },

  rowInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },

  label: {
    fontSize: 14,
    color: '#333',
    width: '35%',
  },

  labelBold: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },

  value: {
    fontSize: 14,
    color: '#333',
    width: '20%',
    textAlign: 'right',
  },

  valueBold: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    textAlign: 'right',
  },

  inputRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '35%',
    justifyContent: 'flex-end',
    position: 'relative',
    zIndex: 1,
  },

  inputBox: {
    width: 70,
    height: 35,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    textAlign: 'center',
    marginRight: 8,
    backgroundColor: '#fff',
  },

  labelInput: {
    fontSize: 14,
    color: '#000000',
    width: '35%',
    height: 35,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    paddingHorizontal: 8,
    textAlign: 'left',
    backgroundColor: '#fff',
  },

  helpIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  helpIcon: {
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 12,
    color: '#777',
  },

  divider: {
    height: 1,
    backgroundColor: '#ddd',
    marginVertical: 10,
  },

  helpIconWrapper: {
    position: 'relative',
    zIndex: 100,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  tooltipBox: {
    position: 'absolute',
    bottom: hp(5),
    right: -wp(4),
    backgroundColor: '#1e2530',
    padding: 12,
    borderRadius: 8,
    width: 220,
    maxWidth: wp(60),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
    zIndex: 101,
  },

  tooltipText: {
    color: '#fff',
    fontSize: 13,
    lineHeight: 18,
  },

  tooltipArrow: {
    position: 'absolute',
    bottom: -8,
    right: 18,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#1e2530',
  },
});
