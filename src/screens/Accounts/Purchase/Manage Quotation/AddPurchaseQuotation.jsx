import React, { useState, useRef, useEffect } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
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
import { COLORS, TYPOGRAPHY, inputStyles, SPACING } from '../../../styles/styles';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formStyles } from '../../../styles/styles';
import DatePickerBottomSheet from '../../../../components/common/CustomDatePicker';
import { getPurchasequotationVendor, getItems, postAddPurchaseQuotationHeader, updatePurchaseQuotationHeader, addPurchaseQuotationLine, updatePurchaseQuotationLine, deletePurchaseQuotationLine, getPurchaseQuotationLines, fetchProjects, getPurchaseQuotationHeaderById, uploadFiles } from '../../../../api/authServices';
import { publish } from '../../../../utils/eventBus';
import { getCMPUUID, getENVUUID } from '../../../../api/tokenStorage';
import { getErrorMessage } from '../../../../utils/errorMessage';
import { pick, types, isCancel } from '@react-native-documents/picker';
import { getAllPurchaseInquiryNumbers } from '../../../../api/authServices';
import { getPaymentTerms, getPaymentMethods } from '../../../../api/authServices';

const COL_WIDTHS = {
  ITEM: wp(50), // 35%
  QTY: wp(35), // 30%
  RATE: wp(35), // 30%
  TAX: wp(35), // 30%
  AMOUNT: wp(35), // 30%
  ACTION: wp(35), // 30%
};
const AccordionSection = ({ id, title, expanded, onToggle, children, wrapperStyle, rightActions, banner }) => {
  return (
    <View style={[styles.sectionWrapper, wrapperStyle]}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={styles.sectionHeader}
        onPress={() => onToggle(id)}
      >
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {rightActions ? (
            <View style={{ marginRight: wp(2) }}>{rightActions}</View>
          ) : null}
          <Icon
            name={expanded ? 'expand-less' : 'expand-more'}
            size={rf(4.2)}
            color={COLORS.text}
          />
        </View>
      </TouchableOpacity>
      {banner ? <View style={styles.sectionBanner}>{banner}</View> : null}
      {expanded && <View style={styles.line} />}
      {expanded && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
};

// Validation schema for Header form
const HeaderValidationSchema = Yup.object().shape({
  VendorName: Yup.string().trim().required('Vendor is required'),
  QuotationTitle: Yup.string().trim().required('Quotation Title is required'),
  ProjectName: Yup.string().test('project-or-uuid', 'Project is required', function (val) {
    const { ProjectUUID } = this.parent || {};
    const hasVal = typeof val === 'string' && val.trim() !== '';
    const hasUuid = typeof ProjectUUID === 'string' && ProjectUUID.trim() !== '';
    return !!(hasVal || hasUuid);
  }),
  PaymentTerm: Yup.string().trim().required('Payment term is required'),
  PaymentMethod: Yup.string().trim().required('Payment method is required'),
  // PQDocument: Yup.mixed().required('PQ Document is required'),
});

const AddPurchaseQuotation = () => {
  const [expandedId, setExpandedId] = useState(1);
  const navigation = useNavigation();
  const route = useRoute();
  // Header edit / submit state (mirror Sales Performa behavior)
  const [headerSubmitted, setHeaderSubmitted] = useState(false);
  const [headerEditable, setHeaderEditable] = useState(true);
  const [headerSubmitting, setHeaderSubmitting] = useState(false);
  const screenTheme = {
    text: COLORS.text,
    textLight: COLORS.textLight,
    bg: '#fff',
  };
  const toggleSection = id => {
    // Prevent opening header unless editable (user clicked Edit)
    if (id === 1 && !headerEditable) return;

    // If header has been submitted and is not editable, prevent opening other sections
    if (typeof headerSubmitted !== 'undefined' && headerSubmitted && id !== 1) {
      navigation.goBack();
      return;
    }

    setExpandedId(prev => (prev === id ? null : id));
  };

  const addItem = () => {
    // Open the Create Order section and reset the line editor for a new item
    setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '1', unit: '', unitUuid: null, desc: '', hsn: '', rate: '' });
    setEditItemId(null);
    setExpandedId(4);
  };

  // Demo options for dropdowns
  const paymentTerms = ['Net 7', 'Net 15', 'Net 30'];
  const taxOptions = ['IGST', 'CGST', 'SGST', 'No Tax'];
  const countries = ['India', 'United States', 'United Kingdom'];
  // Purchase quotation numbers (fetched from API)
  const [purchaseQuotationNumbers, setPurchaseQuotationNumbers] = useState([]);
  const customers = ['Acme Corp', 'Beta Ltd'];
  const state = ['Gujarat', 'Delhi', 'Mumbai'];
  const city = ['vadodara', 'surat',];



  const paymentMethods = [
    'Cash',
    'Bank Transfer',
  ];
  const [vendorOptions, setVendorOptions] = useState([]);
  // payment methods fetched from API
  const [paymentMethodOptions, setPaymentMethodOptions] = useState([]);

  const [projects, setProjects] = useState([]);

  // payment terms fetched from API
  const [paymentTermOptions, setPaymentTermOptions] = useState([]);




  // Master items (loaded from API)
  const [masterItems, setMasterItems] = useState([]);
  const [masterItemsLoading, setMasterItemsLoading] = useState(false);

  // Form state
  const [headerForm, setHeaderForm] = useState({
    companyName: '',
    opportunityTitle: '',
    purchaseOrderNumber: '',
    quotationTitle: '',
    clientName: '',
    phone: '',
    email: '',
  });
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
  // LINE editor state (match ManageSalesOrder behaviour)
  const [currentItem, setCurrentItem] = useState({
    itemType: '',
    itemTypeUuid: null,
    itemName: '',
    itemNameUuid: null,
    quantity: '1',
    unit: '',
    unitUuid: null,
    desc: '',
    hsn: '',
    rate: '',
  });
  const [editItemId, setEditItemId] = useState(null);
  const [isAddingLine, setIsAddingLine] = useState(false);
  const [headerSaved, setHeaderSaved] = useState(false);
  const [headerResponse, setHeaderResponse] = useState(null);
  console.log(headerResponse,'909090');
  
  // Table controls
  const [tableSearch, setTableSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageSizes = [5, 10, 25, 50];
  const [invoiceDate, setInvoiceDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [openDatePicker, setOpenDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState(null); // 'invoice' | 'due'
  const [datePickerSelectedDate, setDatePickerSelectedDate] = useState(
    new Date(),
  );
  const [paymentTerm, setPaymentTerm] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectUUID, setProjectUUID] = useState('');
  const [vendor, setVendor] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [shippingCharges, setShippingCharges] = useState('0');
  const [discount, setDiscount] = useState('0');
  const [adjustments, setAdjustments] = useState('0');
  const [adjustmentLabel, setAdjustmentLabel] = useState('Adjustments');
  const [file, setFile] = useState(null);
  const formikSetFieldValueRef = useRef(null);
  const formikSubmitRef = useRef(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [uploadedFilePaths, setUploadedFilePaths] = useState([]);
  const [file2, setFile2] = useState(null);
  const [uploadedAnotherFiles, setUploadedAnotherFiles] = useState([]);
  const [uploadedAnotherFilePaths, setUploadedAnotherFilePaths] = useState([]);
  const [showShippingTip, setShowShippingTip] = useState(false);
  const [showAdjustmentTip, setShowAdjustmentTip] = useState(false);

  // Refs + focused state so tapping the whole box focuses the TextInput
  const purchaseOrderRef = useRef(null);
  const quotationTitleRef = useRef(null);
  const discountRef = useRef(null);
  const termsRef = useRef(null);
  const notesRef = useRef(null);

  const [focusedPurchaseOrder, setFocusedPurchaseOrder] = useState(false);
  const [focusedQuotationTitle, setFocusedQuotationTitle] = useState(false);
  const [focusedDiscount, setFocusedDiscount] = useState(false);
  const [focusedTerms, setFocusedTerms] = useState(false);
  const [focusedNotes, setFocusedNotes] = useState(false);

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
    setIsShippingSame(true);
    setExpandedId(3);
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

  const openDatePickerFor = field => {
    let initial = new Date();
    if (field === 'invoice' && invoiceDate) {
      const parsed = new Date(invoiceDate);
      if (!isNaN(parsed)) initial = parsed;
    }
    if (field === 'due' && dueDate) {
      const parsed = new Date(dueDate);
      if (!isNaN(parsed)) initial = parsed;
    }
    setDatePickerSelectedDate(initial);
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
    setOpenDatePicker(false);
    setDatePickerField(null);
  };

  const computeAmount = (qty, rate) => {
    const q = parseFloat(qty) || 0;
    const r = parseFloat(rate) || 0;
    return (q * r).toFixed(2);
  };

  const computeSubtotal = () => {
    const sum = items.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
    return sum.toFixed(2);
  };

  const [totalTax, setTotalTax] = useState('0');
  const [serverTotalAmount, setServerTotalAmount] = useState('');
  const [linesLoading, setLinesLoading] = useState(false);
  const [isSavingHeader, setIsSavingHeader] = useState(false);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [headerErrors, setHeaderErrors] = useState({});
  // Show Purchase Quotation Number only when navigated from ViewPurchaseQuotation (edit/prefill)
  const [showPurchaseQuotationNoField, setShowPurchaseQuotationNoField] = useState(false);

  const isHeaderValid = () => {
    return (
      ( (projectName && String(projectName).trim() !== '') || (projectUUID && String(projectUUID).trim() !== '') ) &&
      headerForm.companyName && String(headerForm.companyName).trim() !== '' &&
      vendor && String(vendor).trim() !== '' &&
      headerForm.quotationTitle && String(headerForm.quotationTitle).trim() !== '' &&
      paymentTerm && String(paymentTerm).trim() !== '' &&
      paymentMethod && String(paymentMethod).trim() !== '' &&
      true
    );
  };

  const validateHeaderFields = () => {
    const errors = {};
    // If project UUID present but no display name, try to resolve label from loaded projects
    if ((!projectName || String(projectName).trim() === '') && (projectUUID && String(projectUUID).trim() !== '')) {
      try {
        const found = (projects || []).find(p => String(p.value) === String(projectUUID));
        if (found && found.label) {
          setProjectName(found.label);
          try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('ProjectName', found.label); } catch (_) {}
        }
      } catch (_) { }
    }
    if ((!projectName || String(projectName).trim() === '') && (!projectUUID || String(projectUUID).trim() === '')) errors.projectName = 'Project Name is required';
    if (!headerForm.companyName || String(headerForm.companyName).trim() === '') errors.companyName = 'Purchase Inquiry No is required';
    if (!vendor || String(vendor).trim() === '') errors.vendor = 'Vendor Name is required';
    if (!headerForm.quotationTitle || String(headerForm.quotationTitle).trim() === '') errors.quotationTitle = 'Quotation Title is required';
    if (!paymentTerm || String(paymentTerm).trim() === '') errors.paymentTerm = 'Payment Term is required';
    if (!paymentMethod || String(paymentMethod).trim() === '') errors.paymentMethod = 'Payment Method is required';
    setHeaderErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const errorBorder = (field) => (headerErrors[field] ? { borderColor: '#dc3545', borderWidth: 1 } : {});

  // Helper to extract array from various response shapes
  const extractArray = (resp) => {
    const d = resp?.Data ?? resp;
    if (Array.isArray(d)) return d;
    if (Array.isArray(d?.List)) return d.List;
    if (Array.isArray(d?.Records)) return d.Records;
    if (Array.isArray(d?.Items)) return d.Items;
    return [];
  };

  // Load saved purchase order lines for a header and normalize them into `items`
  const loadPurchaseOrderLines = async (headerUuid) => {
    if (!headerUuid) return;
    try {
      setLinesLoading(true);
      const c = await getCMPUUID();
      const e = await getENVUUID();
      let resp;
      try {
        resp = await getPurchaseQuotationLines({ headerUuid, cmpUuid: c, envUuid: e });
      } catch (e) {
        // fallback attempt
        resp = await getPurchaseQuotationLines({ headerUuid, cmpUuid: c, envUuid: e });
      }
   console.log(resp,'getPurchaseQuotationLines');
   
      const raw = resp?.Data?.Records || resp?.Data || resp || [];
      const list = Array.isArray(raw) ? raw : [];
      const normalized = list.map((r, idx) => {
        const serverUuid = r?.UUID || r?.LineUUID || r?.Id || r?.Line_Id || null;
        const itemUuid = r?.ItemUUID || r?.ItemUuid || r?.ItemId || r?.Item || null;
        const name = r?.ItemName || r?.Name || r?.Item || r?.Description || '';
        const sku = r?.SKU || r?.Sku || r?.ItemCode || '';
        const rate = String(r?.Rate ?? r?.Price ?? r?.UnitPrice ?? 0);
        const desc = r?.Description || r?.Desc || '';
        const hsn = r?.HSNCode || r?.HSN || r?.hsn || '';
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
      try {
        const tot = resp?.Data?.TotalAmount ?? resp?.TotalAmount ?? resp?.Data?.NetAmount ?? resp?.NetAmount ?? null;
        const tTax = resp?.Data?.TotalTax ?? resp?.TotalTax ?? null;
        if (tTax !== null && typeof tTax !== 'undefined') setTotalTax(String(tTax));
        if (tot !== null && typeof tot !== 'undefined') setServerTotalAmount(String(tot));
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.warn('loadPurchaseOrderLines error', err?.message || err);
      setItems([]);
    } finally {
      setLinesLoading(false);
    }
  };

  const deleteItem = async id => {
    try {
      console.log('[AddPurchaseQuotation] deleteItem called ->', id);
      const toDelete = items.find(r => r.id === id);
      console.log('[AddPurchaseQuotation] toDelete ->', toDelete);
      // If header is saved and item exists on server, try deleting on server
      if (headerSaved && toDelete && toDelete.serverUuid) {
        try {
          const headerUuidToSend = headerResponse?.UUID || headerResponse?.Id || route?.params?.headerUuid || null;
          await deletePurchaseQuotationLine({ lineUuid: toDelete.serverUuid, headerUuid: headerUuidToSend });
        } catch (e) {
          console.error('deletePurchaseQuotationLine error ->', e);
          Alert.alert('Warning', 'Unable to delete line on server. Removed locally.');
        }
      }
      // Remove locally regardless
      setItems(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.warn('deleteItem error', e);
    }
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
      quantity: it.qty || '1',
      unit: it.unit || '',
      unitUuid: it.unitUuid || null,
      desc: it.desc || it.desc || '',
      hsn: it.hsn || '',
      rate: it.rate || '',
    });
    setEditItemId(id);
    // open create order section
    setExpandedId(4);
  };

  const handleAddLineItem = async () => {
    try {
      setIsAddingLine(true);
      const nextId = items.length ? items[items.length - 1].id + 1 : 1;
      const existingEdit = editItemId ? items.find(x => x.id === editItemId) : null;
      // try to find matching master item for defaults
      const master = (masterItems || []).find(m => {
        if (!m) return false;
        return (
          String(m.name || '').toLowerCase() === String(currentItem.itemName || '').toLowerCase() ||
          String(m.sku || '').toLowerCase() === String(currentItem.itemNameUuid || '').toLowerCase() ||
          String(m.uuid || '').toLowerCase() === String(currentItem.itemNameUuid || '').toLowerCase()
        );
      });

      const rate = (currentItem.rate && String(currentItem.rate).trim() !== '') ? String(currentItem.rate) : (master ? String(master.rate || '0') : '0');
      const qty = currentItem.quantity || '1';
      const amount = computeAmount(qty, rate);

      const newItem = {
        id: editItemId || nextId,
        selectedItem: master || null,
        name: currentItem.itemName || (master ? master.name : ''),
        itemType: currentItem.itemType || '',
        itemTypeUuid: currentItem.itemTypeUuid || null,
        itemNameUuid: currentItem.itemNameUuid || null,
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
      const headerUuidForLine = headerResponse?.UUID || headerResponse?.Uuid || headerResponse?.Id || headerResponse?.HeaderUUID || headerResponse?.HeaderId || route?.params?.headerUuid || null;
      if (headerSaved && headerUuidForLine) {
        try {
          const payload = {
            HeaderUUID: headerUuidForLine,
            ItemUUID: (master && master.uuid) || currentItem.itemNameUuid || null,
            Quantity: Number(qty) || 0,
            Description: newItem.desc || '',
            HSNSACNO: newItem.hsn || '',
            Rate: Number(rate) || 0,
          };
          let resp;
          if (editItemId) {
            const existing = existingEdit;
            console.log('[AddPurchaseQuotation] existing item for edit ->', existing);
            if (existing && existing.serverUuid) {
              const upayload = {
                UUID: existing.serverUuid,
                HeaderUUID: headerUuidForLine,
                ItemUUID: (master && master.uuid) || currentItem.itemNameUuid || null,
                Quantity: Number(qty) || 0,
                Description: newItem.desc || '',
                HSNSACNO: newItem.hsn || '',
                Rate: Number(rate) || 0,
              };
              // Detect if anything actually changed compared to local `existing` values.
              const existingItemUUID = existing.itemUuid || existing.itemNameUuid || existing.sku || null;
              const existingQty = Number(existing.qty || 0);
              const existingDesc = String(existing.desc || '');
              const existingHsn = String(existing.hsn || '');
              const existingRate = Number(existing.rate || 0);
              const newItemUUID = upayload.ItemUUID || null;
              const newQty = Number(upayload.Quantity || 0);
              const newDesc = String(upayload.Description || '');
              const newHsn = String(upayload.HSNSACNO || '');
              const newRate = Number(upayload.Rate || 0);

              const changed = (
                String(existingItemUUID) !== String(newItemUUID) ||
                Number(existingQty) !== Number(newQty) ||
                String(existingDesc) !== String(newDesc) ||
                String(existingHsn) !== String(newHsn) ||
                Number(existingRate) !== Number(newRate)
              );

              if (changed) {
                // Update quotation line on server only if something changed
                resp = await updatePurchaseQuotationLine(upayload);
              } else {
                // Nothing changed — skip server call and treat as successful update locally
                resp = null;
                console.log('[AddPurchaseQuotation] update skipped — no changes detected for item', editItemId);
              }
            } else {
              resp = await addPurchaseQuotationLine(payload);
            }
          } else {
            resp = await addPurchaseQuotationLine(payload);
          }
          console.log('[AddPurchaseQuotation] addPurchaseQuotationLine resp ->', resp);
          const data = resp?.Data || resp || null;
          const serverItem = data && (Array.isArray(data) ? data[0] : data);
          // try to find any server-provided id (UUID or numeric) inside serverItem
          const findServerId = (obj) => {
            // Prefer explicit identifier keys first, then fall back to a cautious recursive search
            if (!obj || typeof obj !== 'object') return null;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const preferKeys = ['UUID', 'Uuid', 'uuid', 'LineUUID', 'Line_Id', 'LineId', 'Id', 'id'];
            for (const k of preferKeys) {
              if (Object.prototype.hasOwnProperty.call(obj, k)) {
                const v = obj[k];
                if (v || v === 0) return String(v);
              }
            }

            // fallback: recursive search but avoid mistaking numeric fields like Rate/Quantity/Amount for an id
            const excludedNumericKeys = new Set(['rate', 'quantity', 'amount', 'total', 'price', 'discount']);
            const inner = (o) => {
              if (!o || typeof o !== 'object') return null;
              for (const k of Object.keys(o)) {
                const v = o[k];
                if (v === null || typeof v === 'undefined') continue;
                if (typeof v === 'string') {
                  const s = v.trim();
                  if (uuidRegex.test(s)) return s;
                  const lk = String(k).toLowerCase();
                  if (/^\d+$/.test(s) && (lk.includes('id') || lk.includes('uuid') || lk.includes('line'))) return s;
                }
                if (typeof v === 'number') {
                  const lk = String(k).toLowerCase();
                  if (lk.includes('id') || lk.includes('uuid') || lk.includes('line')) return String(v);
                  if (!excludedNumericKeys.has(lk)) {
                    // as a last resort allow numeric values, but prefer id-like keys first
                    // continue searching other keys instead of returning immediately
                  }
                }
                if (typeof v === 'object') {
                  const f = inner(v);
                  if (f) return f;
                }
              }
              return null;
            };
            return inner(obj);
          };
          const detectedId = serverItem ? findServerId(serverItem) : null;
          const itemToPush = {
            ...newItem,
            id: editItemId ? editItemId : nextId,
            serverUuid: serverItem?.UUID || serverItem?.LineUUID || serverItem?.Id || detectedId || existingEdit?.serverUuid || null,
            itemUuid: serverItem?.ItemUUID || serverItem?.ItemUuid || serverItem?.ItemId || newItem.itemNameUuid || null,
            sku: serverItem?.SKU || newItem.sku,
            rate: (serverItem && (serverItem?.Rate ?? serverItem?.rate)) ?? newItem.rate,
            desc: serverItem?.Description ?? newItem.desc,
          };
          if (editItemId) {
            setItems(prev => prev.map(it => it.id === editItemId ? { ...it, ...itemToPush, id: editItemId } : it));
            setEditItemId(null);
          } else {
            setItems(prev => [...prev, itemToPush]);
          }
        } catch (err) {
          console.error('addPurchaseOrderLine error ->', err);
          Alert.alert('Error', getErrorMessage(err, 'Unable to add line to server. Saved locally.'));
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
          setItems(prev => prev.map(it => it.id === editItemId ? { ...it, ...newItem, id: editItemId } : it));
          setEditItemId(null);
        } else {
          setItems(prev => [...prev, newItem]);
        }
        setIsAddingLine(false);
      }

      // reset editor
      setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '1', unit: '', unitUuid: null, desc: '', hsn: '', rate: '' });
    } catch (e) {
      console.warn('handleAddLineItem error', e);
      setIsAddingLine(false);
    }
  };

  const handleCreateOrder = async () => {
    setIsSavingHeader(true);
    try {
      const subtotalNum = parseFloat(computeSubtotal()) || 0;
      const totalTaxNum = parseFloat(totalTax) || 0;
      const serverNum = (serverTotalAmount !== null && serverTotalAmount !== undefined && String(serverTotalAmount).trim() !== '') ? parseFloat(serverTotalAmount) : NaN;
      const totalAmountNum = (!isNaN(serverNum))
        ? (serverNum + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) - (parseFloat(discount) || 0))
        : (subtotalNum + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + totalTaxNum - (parseFloat(discount) || 0));

      const resolveCityUuid = (c) => {
        if (!c) return '';
        if (typeof c === 'string') return c;
        return c?.UUID || c?.Uuid || c?.Id || '';
      };

      const resolvedInquiry = resolveOptionValue(purchaseQuotationNumbers, headerForm.companyName) || headerForm.companyName || '';
      console.log('[AddPurchaseQuotation] resolvedInquiry ->', resolvedInquiry, 'headerForm.companyName ->', headerForm.companyName);
      const payload = {
        UUID: headerResponse?.UUID || '',
        InquiryNo: resolvedInquiry || '',
        VendorUUID: vendor || headerForm.clientName || '',
        ProjectUUID: projectUUID || '',
        PaymentTerm: paymentTerm || '',
        PaymentMode: paymentMethod || '',
        Note: terms || '',
        QuotationTitle: headerForm.quotationTitle || '',
        QuotationNo: headerForm.purchaseOrderNumber || '',
        TermsConditions: notes || '',
        TotalTax: totalTaxNum,
        TotalAmount: totalAmountNum,
        ShippingCharges: parseFloat(shippingCharges) || 0,
        Discount: parseFloat(discount) || 0,
        AdjustmentField: adjustmentLabel || '',
        AdjustmentPrice: parseFloat(adjustments) || 0,
      };
      // Ensure we include HeaderUUID (backend may expect this key) and put header UUID into `UUID` as well
      const resolvedHeaderUuid = headerResponse?.UUID || headerResponse?.Uuid || headerResponse?.Id || headerResponse?.HeaderUUID || route?.params?.headerUuid || '';
      if (resolvedHeaderUuid) {
        payload.HeaderUUID = resolvedHeaderUuid;
        payload.UUID = resolvedHeaderUuid;
      }
      // Attach uploaded file path(s) when updating header as QuotationDocument
      if (Array.isArray(uploadedFilePaths) && uploadedFilePaths.length > 0) {
        payload.QuotationDocument = uploadedFilePaths.length === 1 ? uploadedFilePaths[0] : uploadedFilePaths;
        try { console.log('Attaching QuotationDocument to updateHeader payload ->', JSON.stringify(payload.QuotationDocument, null, 2)); } catch (_) { console.log('Attaching QuotationDocument to updateHeader payload ->', payload.QuotationDocument); }
      }

      // Attach second uploaded file path(s) as AnotherDocument when present
      if (Array.isArray(uploadedAnotherFilePaths) && uploadedAnotherFilePaths.length > 0) {
        payload.AnotherDocument = uploadedAnotherFilePaths.length === 1 ? uploadedAnotherFilePaths[0] : uploadedAnotherFilePaths;
        try { console.log('Attaching AnotherDocument to updateHeader payload ->', JSON.stringify(payload.AnotherDocument, null, 2)); } catch (_) { console.log('Attaching AnotherDocument to updateHeader payload ->', payload.AnotherDocument); }
      }

      console.log('AddPurchaseQuotation: submit payload ->', payload);
      // Always call update API on final submit from footer
      let resp = await updatePurchaseQuotationHeader(payload);

      const data = resp?.Data || resp || {};
      setHeaderResponse(data);
      setHeaderSaved(true);
      setIsEditingHeader(false);
      setHeaderSubmitted(true);
      setHeaderEditable(false);
      setExpandedId(4);
      Alert.alert('Success', 'Order submitted successfully');
      try { await loadPurchaseOrderLines(data?.UUID || data?.Id || data?.HeaderUUID || headerResponse?.UUID); } catch (e) { /* ignore */ }
      try {
        // publish added event so list screen can update quickly
        try {
          const mapped = {
            UUID: data?.UUID || data?.Uuid || data?.Id,
            QuotationNo: data?.QuotationNo || headerForm.purchaseOrderNumber || '',
            QuotationTitle: data?.QuotationTitle || headerForm.quotationTitle || '',
            VendorName: data?.VendorName || headerForm.clientName || vendor || '',
            _raw: data,
          };
          publish('purchaseQuotation.added', mapped);
        } catch (_) { }
        // navigate back to list so user can see newly added record
        try { navigation.goBack(); } catch (_) { }
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.error('handleCreateOrder error ->', err);
      Alert.alert('Error', getErrorMessage(err, 'Unable to submit order'));
    } finally {
      setIsSavingHeader(false);
    }
  };
  const onCancel = () => {
    navigation.goBack();
  };

  // Submit header only (creates header UUID and locks header fields)
  const submitHeader = async () => {
    // Validate required header fields before submitting
    const isValid = validateHeaderFields();
    // if (!isValid) {
    //   Alert.alert('Validation', 'Please fill all required header fields before submitting.');
    //   return;
    // }
    setHeaderSubmitting(true);
    try {
      const subtotalNum = parseFloat(computeSubtotal()) || 0;
      const totalTaxNum = parseFloat(totalTax) || 0;
      const totalAmountNum = subtotalNum + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + totalTaxNum - (parseFloat(discount) || 0);

      const resolvedInquiry = resolveOptionValue(purchaseQuotationNumbers, headerForm.companyName) || headerForm.companyName || '';
      console.log('[AddPurchaseQuotation] submitHeader resolvedInquiry ->', resolvedInquiry, 'headerForm.companyName ->', headerForm.companyName);
      const payload = {
        UUID: headerResponse?.UUID || '',
        PurchaseOrderNo: headerForm.purchaseOrderNumber || '',
        InquiryNo: resolvedInquiry || '',
        VendorUUID: vendor || headerForm.clientName || '',
        ProjectUUID: projectUUID || '',
        PaymentTerm: paymentTerm || '',
        PaymentMode: paymentMethod || '',
        Note: notes || '',
        QuotationNo: headerForm.purchaseOrderNumber || '',
        QuotationTitle: headerForm.quotationTitle || '',
        TermsConditions: terms || '',
        Discount: parseFloat(discount) || 0,
        QuotationDocument: Array.isArray(uploadedFilePaths) && uploadedFilePaths.length > 0 ? (uploadedFilePaths.length === 1 ? uploadedFilePaths[0] : uploadedFilePaths) : undefined,
        AnotherDocument: Array.isArray(uploadedAnotherFilePaths) && uploadedAnotherFilePaths.length > 0 ? (uploadedAnotherFilePaths.length === 1 ? uploadedAnotherFilePaths[0] : uploadedAnotherFilePaths) : undefined,
      };

      // Ensure HeaderUUID is present for update calls and place header UUID in `UUID`
      const resolvedHeaderUuid2 = headerResponse?.UUID || headerResponse?.Uuid || headerResponse?.Id || headerResponse?.HeaderUUID || route?.params?.headerUuid || '';
      if (resolvedHeaderUuid2) {
        payload.HeaderUUID = resolvedHeaderUuid2;
        payload.UUID = resolvedHeaderUuid2;
      }

      let resp;
      if (headerResponse?.UUID) {
        resp = await updatePurchaseQuotationHeader(payload);
      } else {
        // Create a purchase quotation header instead of creating a purchase order header
        resp = await postAddPurchaseQuotationHeader(payload);
      }

      const data = resp?.Data || resp || {};
      console.log(payload, 811);
      console.log('submitHeader response header UUID ->', data?.UUID || data?.Uuid || data?.Id || data?.HeaderUUID || null);
      setHeaderResponse(data);
      setHeaderSaved(true);

      // Show success message and only after user dismisses, lock header and open Create Order
      Alert.alert('Success', 'Header submitted successfully', [
        {
          text: 'OK',
          onPress: async () => {
            try {
              setHeaderSubmitted(true);
              setHeaderEditable(false);
              setExpandedId(4);
              await loadPurchaseOrderLines(data?.UUID || data?.Id || data?.HeaderUUID || headerResponse?.UUID);
            } catch (e) {
              /* ignore */
            }
          },
        },
      ], { cancelable: false });
    } catch (err) {
      console.error('submitHeader error ->', err);
      Alert.alert('Error', getErrorMessage(err, 'Unable to submit header'));
    } finally {
      setIsEditingHeader(false);
      setHeaderSubmitting(false);
    }
  };

  const updateHeader = async () => {
    const headerUuid = headerResponse?.UUID || headerResponse?.Uuid || headerResponse?.Id || headerResponse?.HeaderUUID || headerResponse?.HeaderId || route?.params?.headerUuid || null;
    if (!headerUuid) {
      Alert.alert('Error', 'No header UUID to update');
      return;
    }
    // Validate required header fields before updating
    const isValid = validateHeaderFields();
    if (!isValid) {
      Alert.alert('Validation', 'Please fill all required header fields before updating.');
      return;
    }
    setHeaderSubmitting(true);
    try {
      const subtotalNum = parseFloat(computeSubtotal()) || 0;
      const totalTaxNum = parseFloat(totalTax) || 0;
      const totalAmountNum = subtotalNum + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + totalTaxNum - (parseFloat(discount) || 0);
      const resolvedInquiry = resolveOptionValue(purchaseQuotationNumbers, headerForm.companyName) || headerForm.companyName || '';
      console.log('[AddPurchaseQuotation] updateHeader resolvedInquiry ->', resolvedInquiry, 'headerForm.companyName ->', headerForm.companyName);
      const payload = {
        UUID: headerUuid,
        PurchaseOrderNo: headerForm.purchaseOrderNumber || '',
        // Inquiry_No: resolvedInquiry || '',
        InquiryNo: resolvedInquiry || '',
        Vendor_UUID: vendor || headerForm.clientName || '',
        VendorUUID: vendor || headerForm.clientName || '',
        ProjectUUID: projectUUID || '',
        PaymentTermUUID: paymentTerm || '',
        PaymentMethodUUID: paymentMethod || '',
        PaymentTerm: paymentTerm || '',
        PaymentMode: paymentMethod || '',
        OrderDate: uiDateToApiDate(invoiceDate),
        DueDate: uiDateToApiDate(dueDate),
        Notes: notes || '',
        Note: notes || '',
        QuotationNo: headerForm.purchaseOrderNumber || '',
        QuotationTitle: headerForm.quotationTitle || '',
        TermsConditions: terms || '',
        BillingBuildingNo: billingForm.buildingNo || '',
        BillingStreet1: billingForm.street1 || '',
        BillingStreet2: billingForm.street2 || '',
        BillingPostalCode: billingForm.postalCode || '',
        BillingCountryUUID: billingForm.country || '',
        BillingStateUUID: billingForm.state || '',
        BillingCityUUID: billingForm.city || '',
        IsShipAddrSame: !!isShippingSame,
        ShippingBuildingNo: shippingForm.buildingNo || '',
        ShippingStreet1: shippingForm.street1 || '',
        ShippingStreet2: shippingForm.street2 || '',
        ShippingPostalCode: shippingForm.postalCode || '',
        ShippingCountryUUID: shippingForm.country || '',
        ShippingStateUUID: shippingForm.state || '',
        ShippingCityUUID: shippingForm.city || '',
        SubTotal: subtotalNum,
        TotalTax: totalTaxNum,
        TotalAmount: totalAmountNum,
        ShippingCharges: parseFloat(shippingCharges) || 0,
        Discount: parseFloat(discount) || 0,
        AdjustmentField: adjustmentLabel || '',
        AdjustmentPrice: parseFloat(adjustments) || 0,
        QuotationDocument: Array.isArray(uploadedFilePaths) && uploadedFilePaths.length > 0 ? (uploadedFilePaths.length === 1 ? uploadedFilePaths[0] : uploadedFilePaths) : undefined,
        AnotherDocument: Array.isArray(uploadedAnotherFilePaths) && uploadedAnotherFilePaths.length > 0 ? (uploadedAnotherFilePaths.length === 1 ? uploadedAnotherFilePaths[0] : uploadedAnotherFilePaths) : undefined,
      };
      // Also add HeaderUUID for API compatibility
      if (headerUuid) payload.HeaderUUID = headerUuid;
      const resp = await updatePurchaseQuotationHeader(payload);
      const data = resp?.Data || resp || {};
      // update local headerResponse with server-returned data
      console.log('updateHeader response header UUID ->', data?.UUID || data?.Uuid || data?.Id || data?.HeaderUUID || null);
      setHeaderResponse(data);

      Alert.alert('Success', 'Header updated successfully', [
        {
          text: 'OK',
          onPress: async () => {
            try {
              setHeaderEditable(false);
              setHeaderSubmitted(true);
              setExpandedId(4);
              await loadPurchaseOrderLines(data?.UUID || data?.Id || data?.HeaderUUID || headerUuid);
              // Publish update so any list screen can refresh in-place without navigation
              try {
                const mapped = {
                  UUID: data?.UUID || data?.Uuid || data?.Id,
                  QuotationNo: data?.QuotationNo || headerForm.purchaseOrderNumber || '',
                  QuotationTitle: data?.QuotationTitle || headerForm.quotationTitle || '',
                  VendorName: data?.VendorName || headerForm.clientName || vendor || '',
                  _raw: data,
                };
                publish('purchaseQuotation.updated', mapped);
              } catch (_) { }
            } catch (e) { /* ignore */ }
          },
        },
      ], { cancelable: false });
    } catch (err) {
      console.error('updateHeader error ->', err);
      Alert.alert('Error', getErrorMessage(err, 'Unable to update header'));
    } finally {
      setIsEditingHeader(false);
      setHeaderSubmitting(false);
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

        // Prepare the selected file object
        const fileObj = {
          name: selectedFile.name || selectedFile.fileName || 'attachment',
          uri: selectedFile.uri || selectedFile.fileUri || selectedFile.uriString,
          type: selectedFile.type || selectedFile.mime || 'application/octet-stream',
          size: selectedFile.size,
        };

        // Optimistically set the selected file for UI
        setFile(fileObj);
        // Update Formik value if available
        if (formikSetFieldValueRef.current) {
          formikSetFieldValueRef.current('PQDocument', fileObj);
        }

        // Immediately upload the picked file with fixed Filepath 'QuotationDocument'
        try {
          const uploadResp = await uploadFiles(fileObj, { filepath: 'QuotationDocument' });
          const upData = uploadResp?.Data || uploadResp || {};
          const uploaded = upData?.Files || upData?.files || upData?.UploadedFiles || upData?.FilePaths || upData || [];
          const finalRefs = Array.isArray(uploaded) ? uploaded : (uploaded ? [uploaded] : []);
          setUploadedFiles(finalRefs);

          const paths = finalRefs.map(r => {
            try { return r?.RemoteResponse?.path || r?.path || (typeof r === 'string' ? r : null); } catch (_) { return null; }
          }).filter(Boolean);
          setUploadedFilePaths(paths);

        } catch (uErr) {
          console.warn('uploadFiles (QuotationDocument) failed', uErr);
          Alert.alert('Upload Error', 'Unable to upload the selected file. Please try again.');
          // clear selection on failure
          setFile(null);
          setUploadedFiles([]);
          setUploadedFilePaths([]);
          // Update Formik value if available
          if (formikSetFieldValueRef.current) {
            formikSetFieldValueRef.current('PQDocument', null);
          }
        }
      }
    } catch (err) {
      if (isCancel && isCancel(err)) {
        return;
      }
      console.warn('Document pick error:', err);
    }
  };

  // Second file picker (AnotherDocument)
  const pickAnotherFile = async () => {
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
        const allowedTypes = [
          'application/pdf',
          'image/png',
          'image/jpeg',
          'image/jpg',
        ];
        if (!allowedTypes.includes(selectedFile.type)) {
          Alert.alert('Invalid File Type', 'Please select a PDF, PNG, or JPG file.');
          return;
        }
        const maxSize = 10 * 1024 * 1024;
        if (selectedFile.size && selectedFile.size > maxSize) {
          Alert.alert('File Too Large', 'File size must be less than 10MB.');
          return;
        }

        const fileObj = {
          name: selectedFile.name || selectedFile.fileName || 'attachment',
          uri: selectedFile.uri || selectedFile.fileUri || selectedFile.uriString,
          type: selectedFile.type || selectedFile.mime || 'application/octet-stream',
          size: selectedFile.size,
        };

        setFile2(fileObj);

        // Immediately upload with fixed Filepath 'AnotherDocument'
        try {
          const uploadResp = await uploadFiles(fileObj, { filepath: 'AnotherDocument' });
          const upData = uploadResp?.Data || uploadResp || {};
          const uploaded = upData?.Files || upData?.files || upData?.UploadedFiles || upData?.FilePaths || upData || [];
          const finalRefs = Array.isArray(uploaded) ? uploaded : (uploaded ? [uploaded] : []);
          setUploadedAnotherFiles(finalRefs);
          const paths = finalRefs.map(r => { try { return r?.RemoteResponse?.path || r?.path || (typeof r === 'string' ? r : null); } catch (_) { return null; } }).filter(Boolean);
          setUploadedAnotherFilePaths(paths);
        } catch (uErr) {
          console.warn('uploadFiles (AnotherDocument) failed', uErr);
          Alert.alert('Upload Error', 'Unable to upload the selected file. Please try again.');
          setFile2(null);
          setUploadedAnotherFiles([]);
          setUploadedAnotherFilePaths([]);
        }
      }
    } catch (err) {
      if (isCancel && isCancel(err)) return;
      console.warn('Document pick error (another):', err);
    }
  };

  const removeFile = () => {
    setFile(null);
    setUploadedFiles([]);
    setUploadedFilePaths([]);
    // Update Formik value if available
    if (formikSetFieldValueRef.current) {
      formikSetFieldValueRef.current('PQDocument', null);
    }
  };

  const removeFile2 = () => {
    setFile2(null);
    setUploadedAnotherFiles([]);
    setUploadedAnotherFilePaths([]);
  };

  // Fetch vendors for Purchase Quotation dropdown (preserve UUIDs when available)
  useEffect(() => {
    let mounted = true;
    const loadVendors = async () => {
      try {
        const resp = await getPurchasequotationVendor();
        console.log('getPurchasequotationVendor response ->', resp);
        const list = resp?.Data || resp || [];
        if (!mounted) return;
        const mapped = (Array.isArray(list) ? list : []).map(it => {
          if (!it) return null;
          if (typeof it === 'string') {
            const label = it.toString().trim();
            return { label, value: label };
          }
          const label = String(it.VendorName || it.Name || it.CompanyName || it.DisplayName || it.ContactName || it.Value || '').trim();
          const value = it.UUID || it.VendorUUID || it.Id || it.Value || label;
          return { label: label || String(value), value };
        }).filter(Boolean);
        // dedupe by value
        const uniqueMap = new Map();
        mapped.forEach(m => { if (m && m.value) uniqueMap.set(String(m.value), m); });
        const unique = Array.from(uniqueMap.values());
        setVendorOptions(unique);
      } catch (err) {
        console.error('Error loading purchase quotation vendors ->', err && (err.message || err));
        setVendorOptions([]);
      }
    };
    loadVendors();
    return () => { mounted = false; };
  }, []);

  // After payment method options load, resolve payment method from headerResponse (if present)
  useEffect(() => {
    try {
      if (!headerResponse) return;
      const incoming = headerResponse.PaymentMethodUUID || headerResponse.PaymentMethod || headerResponse.PaymentMode || headerResponse.PaymentMethodName || null;
      if (!incoming) return;
      const resolved = resolveOptionValue(paymentMethodOptions, incoming);
      if (resolved) {
        setPaymentMethod(resolved);
        try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('PaymentMethod', resolved); } catch (_) {}
      } else {
        setPaymentMethod(incoming);
        try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('PaymentMethod', incoming); } catch (_) {}
      }
    } catch (e) { /* ignore */ }
  }, [paymentMethodOptions, headerResponse]);

  // Fetch purchase quotation numbers for dropdown
  useEffect(() => {
    let mounted = true;
    const loadNumbers = async () => {
      try {
        const cmp = await getCMPUUID();
        const env = await getENVUUID();
        const resp = await getAllPurchaseInquiryNumbers({ cmpUuid: cmp, envUuid: env });
        console.log('getAllPurchaseInquiryNumbers() response ->', resp);
        const list = resp?.Data || resp || [];
        if (!mounted) return;
        const mapped = (Array.isArray(list) ? list : []).map(it => {
          if (!it) return null;
          if (typeof it === 'string') return { label: it.toString().trim(), value: it.toString().trim() };
          const label = it.InquiryNo || it.InquiryNo || it.Value || it.Label || it.Text || '';
          const value = it.UUID || it.Uuid || it.Id || it.InquiryUUID || it.InquiryId || label || '';
          return { label: String(label).trim(), value: String(value).trim() };
        }).filter(Boolean);
        // de-duplicate by value
        const seen = new Set();
        const unique = mapped.filter(m => {
          if (!m || !m.value) return false;
          if (seen.has(m.value)) return false;
          seen.add(m.value);
          return true;
        });
        setPurchaseQuotationNumbers(unique);
      } catch (err) {
        try { console.error('Error loading purchase inquiry numbers ->', err && (err.message || err)); } catch (_) {}
        // Prefer server-provided message when available
        let msg = '';
        try {
          if (err && err.response && err.response.data) {
            msg = err.response.data.Message || err.response.data.message || '';
          } else if (err && err.data) {
            msg = err.data.Message || err.data.message || '';
          } else if (err && err.message) {
            msg = err.message;
          }
        } catch (_) { msg = '' }
        if (!msg) msg = 'Unable to load purchase inquiry numbers';
        Alert.alert('Error', msg);
        setPurchaseQuotationNumbers([]);
      }
    };
    loadNumbers();
    return () => { mounted = false; };
  }, []);

  // When purchaseQuotationNumbers load, if we have a prefilling header, ensure
  // headerForm.companyName matches one of the loaded options (case-insensitive)
  // so the Dropdown shows the friendly label instead of a raw/unmatched value.
  useEffect(() => {
    try {
      if (!headerResponse) return;
      if (!Array.isArray(purchaseQuotationNumbers) || purchaseQuotationNumbers.length === 0) return;
      const incoming = headerResponse.Inquiry_No || headerResponse.InquiryNo || headerResponse.PurchaseRequestNumber || headerResponse.PurchaseRequestNo || headerResponse.companyName || headerResponse.InquiryNumber || headerForm.companyName || '';
      if (!incoming) return;
      const candidate = String(incoming).trim();
      const found = purchaseQuotationNumbers.find(p => {
        if (!p) return false;
        const label = (typeof p === 'string') ? String(p) : String(p.label || p.Value || p.value || p.Label || p.Text || '');
        return label.trim().toLowerCase() === candidate.toLowerCase();
      });
      if (found) {
        // store UUID/value in headerForm for payload, but Dropdown will display label via getLabel/getKey
        setHeaderForm(s => ({ ...s, companyName: (found.value ?? (typeof found === 'string' ? found : found.label)) }));
      } else {
        // keep incoming value as fallback (could be UUID or label)
        setHeaderForm(s => ({ ...s, companyName: incoming }));
      }
    } catch (e) {
      /* ignore */
    }
  }, [purchaseQuotationNumbers, headerResponse]);

  // Fetch payment terms for dropdown
  useEffect(() => {
    let mounted = true;
    const loadTerms = async () => {
      try {
        const resp = await getPaymentTerms();
        console.log('getPaymentTerms response ->', resp);
        const list = resp?.Data || resp || [];
        if (!mounted) return;
        const mapped = (Array.isArray(list) ? list : []).map(it => {
          if (!it) return null;
          if (typeof it === 'string') return { label: it, value: it };
          const label = String(it.Name || it.Value || it.Label || it.Term || it.PaymentTerm || it.Text || it.Description || '').trim();
          const value = it.UUID || it.Value || it.Id || label;
          return { label: label || String(value), value };
        }).filter(Boolean);
        const uniqueMap = new Map();
        mapped.forEach(m => { if (m && m.value) uniqueMap.set(String(m.value), m); });
        setPaymentTermOptions(Array.from(uniqueMap.values()));
      } catch (err) {
        console.error('Error loading payment terms ->', err && (err.message || err));
        setPaymentTermOptions([]);
      }
    };
    loadTerms();
    return () => { mounted = false; };
  }, []);

  // Fetch payment methods for dropdown
  useEffect(() => {
    let mounted = true;
    const loadMethods = async () => {
      try {
        const resp = await getPaymentMethods();
        console.log('getPaymentMethods response ->', resp);
        const list = resp?.Data || resp || [];
        if (!mounted) return;
        const mapped = (Array.isArray(list) ? list : []).map(it => {
          if (!it) return null;
          if (typeof it === 'string') return { label: it, value: it };
          const label = String(it.Name || it.Value || it.Label || it.Mode || it.PaymentMethod || it.Text || it.Description || '').trim();
          const value = it.UUID || it.Value || it.Id || label;
          return { label: label || String(value), value };
        }).filter(Boolean);
        const uniqueMap = new Map();
        mapped.forEach(m => { if (m && m.value) uniqueMap.set(String(m.value), m); });
        const finalMethods = Array.from(uniqueMap.values());
        setPaymentMethodOptions(finalMethods);

        // If we have header data in route params, try to resolve its payment method to an option value
        try {
          const hdr = route?.params?.headerData || null;
          if (hdr) {
            const incoming = hdr.PaymentMethodUUID || hdr.PaymentMethod || hdr.PaymentMode || hdr.PaymentMethodName || hdr.PaymentMethodId || null;
            if (incoming) {
              // Try to find by value first, then by label (case-insensitive)
              let found = finalMethods.find(m => String(m.value) === String(incoming));
              if (!found) found = finalMethods.find(m => String(m.label).toLowerCase() === String(incoming).toLowerCase());
              if (found) {
                setPaymentMethod(found.value);
                try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('PaymentMethod', found.value); } catch (_) {}
              } else {
                setPaymentMethod(incoming);
                try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('PaymentMethod', incoming); } catch (_) {}
              }
            }
          }
        } catch (e) { /* ignore */ }
      } catch (err) {
        console.error('Error loading payment methods ->', err && (err.message || err));
        setPaymentMethodOptions([]);
      }
    };
    loadMethods();
    return () => { mounted = false; };
  }, []);

  // Load master items from API (normalized to { name, sku, rate, desc, hsn, uuid })
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setMasterItemsLoading(true);
        const resp = await getItems({mode:"Purchase"});
        const rawList = resp?.Data?.Records || resp?.Data || resp || [];
        const list = Array.isArray(rawList) ? rawList : [];
        const normalized = list.map(it => ({
          name: it?.Name || it?.name || it?.ItemName || '',
          sku: it?.SKU || it?.sku || it?.Sku || it?.ItemCode || '',
          rate: (it?.Rate ?? it?.rate ?? it?.Price) || 0,
          desc: it?.Description || it?.description || it?.Desc || '',
          hsn: it?.HSNCode || it?.HSN || it?.hsn || '',
          uuid: it?.UUID || it?.Uuid || it?.uuid || null,
          raw: it,
        }));
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

  // Load projects for Project Name dropdown
  useEffect(() => {
    let mounted = true;
    const loadProjects = async () => {
      try {
        const resp = await fetchProjects();
        const raw = resp?.Data ?? resp ?? [];
        const list = Array.isArray(raw) ? raw : (raw?.Records || raw?.List || raw?.Items || []);
        const safeLabel = (raw) => {
          if (raw === null || typeof raw === 'undefined') return '';
          if (typeof raw === 'string') return raw;
          if (typeof raw === 'number' || typeof raw === 'boolean') return String(raw);
          if (typeof raw === 'object') {
            return raw?.ProjectName || raw?.Name || raw?.Label || raw?.Value || raw?.Text || raw?.DisplayName || JSON.stringify(raw);
          }
          return String(raw);
        };

        const normalized = (Array.isArray(list) ? list : []).map(it => {
          if (!it) return null;
          const rawLabel = it?.ProjectTitle ?? it?.ProjectName ?? it?.Name ?? it?.Title ?? it?.DisplayName ?? it?.Value ?? (typeof it === 'string' ? it : '');
          const labelStr = safeLabel(rawLabel).trim();
          // Extract UUID with proper case-sensitive field names
          let value = it?.Uuid ?? it?.UUID ?? it?.ProjectUUID ?? it?.Id ?? it?.ProjectId ?? it?.projectId ?? it?.uuid ?? it?.id ?? null;
          if (value && typeof value === 'object') {
            // try to extract common id fields
            value = value?.Uuid || value?.UUID || value?.Id || value?.projectId || JSON.stringify(value);
          }
          // Only use label as value if no proper UUID found and generate a unique ID
          if (value === null || typeof value === 'undefined' || value === '' || value === labelStr) {
            value = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          }
          return { label: labelStr || String(value), value };
        }).filter(Boolean);
        if (!mounted) return;
        setProjects(normalized);

        // If navigated with headerData, try to set selected project (prefer UUID)
        const hdr = route?.params?.headerData || null;
        if (hdr) {
          const uuid = hdr?.ProjectUUID || hdr?.ProjectId || hdr?.Project_Id || hdr?.Project || null;
          const name = hdr?.ProjectTitle || hdr?.ProjectName || hdr?.Project || null;
          if (uuid) {
            // Store UUID for Dropdown `value` so option is selected correctly
            setProjectUUID(uuid);
            try { if (formikSetFieldValueRef.current) { formikSetFieldValueRef.current('ProjectUUID', uuid); } } catch (_) {}
            // Also try to set a friendly display name when available
            if (name) setProjectName(name);
            try { if (formikSetFieldValueRef.current && name) { formikSetFieldValueRef.current('ProjectName', name); } } catch (_) {}
          } else if (name) {
            // Try to resolve the label to one of the loaded options and set the matching value
            const found = normalized.find(p => String(p.label).toLowerCase() === String(name).toLowerCase());
            if (found) {
              setProjectUUID(found.value);
              setProjectName(found.label);
              try { if (formikSetFieldValueRef.current) { formikSetFieldValueRef.current('ProjectUUID', found.value); formikSetFieldValueRef.current('ProjectName', found.label); } } catch (_) {}
            } else {
              // Fallback: keep display name, UUID blank
              setProjectName(name);
              setProjectUUID('');
              try { if (formikSetFieldValueRef.current) { formikSetFieldValueRef.current('ProjectName', name); formikSetFieldValueRef.current('ProjectUUID', ''); } } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.error('fetchProjects error ->', err && (err.message || err));
        if (mounted) setProjects([]);
      }
    };
    loadProjects();
    return () => { mounted = false; };
  }, [route?.params]);

  // Helper to resolve an incoming header value (uuid or label) to an option.value from a loaded options array
  const resolveOptionValue = (options, incoming) => {
    if (!incoming || !Array.isArray(options) || options.length === 0) return null;
    // match by value first (exact), then by label case-insensitive
    const byValue = options.find(o => String(o.value) === String(incoming));
    if (byValue) return byValue.value;
    const byLabel = options.find(o => String(o.label).toLowerCase() === String(incoming).toLowerCase());
    if (byLabel) return byLabel.value;
    return null;
  };

  // When `projects` are loaded, if we already have headerResponse (from route or API), resolve its project into the Dropdown
  useEffect(() => {
    try {
      if (!headerResponse) return;
      // Try many possible locations and shapes for a project UUID provided by backend
      const tryExtract = (obj) => {
        if (!obj) return null;
        // direct keys
        const direct = obj.ProjectUUID || obj.ProjectId || obj.Project_Id || obj.Project || obj.projectUUID || obj.projectId || obj.ProjectID || obj.ProjectIdentifier;
        if (direct) return direct;
        // nested project object
        const nested = obj.Project || obj.project || obj.ProjectObj || obj.ProjectInfo || null;
        if (nested && typeof nested === 'object') {
          return nested.UUID || nested.Uuid || nested.Id || nested.Id || nested.ProjectUUID || nested.projectUUID || nested.projectId || nested.Id;
        }
        return null;
      };

      const incomingRaw = tryExtract(headerResponse) || headerResponse.ProjectName || headerResponse.ProjectTitle || null;
      if (!incomingRaw) return;

      // If incomingRaw is an object, try its inner id keys
      let incoming = incomingRaw;
      if (typeof incomingRaw === 'object') {
        incoming = incomingRaw.UUID || incomingRaw.Uuid || incomingRaw.Id || incomingRaw.value || incomingRaw.ProjectUUID || null;
      }

      const resolved = resolveOptionValue(projects, incoming);
      if (resolved) {
        setProjectUUID(resolved);
        try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('ProjectUUID', resolved); } catch (_) {}
        const label = (projects.find(p => String(p.value) === String(resolved)) || {}).label || '';
        if (label) setProjectName(label);
        try { if (label) { try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('ProjectName', label); } catch (_) {} } } catch (_) {}
      } else {
        // fallback: if incoming looks like a UUID, set it as UUID and set name if available
        setProjectUUID(incoming || '');
        try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('ProjectUUID', incoming || ''); } catch (_) {}
        if (headerResponse.ProjectName || headerResponse.ProjectTitle) setProjectName(headerResponse.ProjectName || headerResponse.ProjectTitle);
        try { if (headerResponse.ProjectName || headerResponse.ProjectTitle) { try { if (formikSetFieldValueRef.current) formikSetFieldValueRef.current('ProjectName', headerResponse.ProjectName || headerResponse.ProjectTitle); } catch (_) {} } } catch (_) {}
      }
    } catch (e) { /* ignore */ }
  }, [projects, headerResponse]);

  // If navigated here for Edit, prefill header fields from route.params.headerData
  useEffect(() => {
    try {
      const params = route?.params || {};
      const hdr = params.headerData || null;
      const headerUuid = params.headerUuid || (hdr && (hdr.UUID || hdr.Id || hdr.Id));
      if (hdr) {
        // Map common server keys to local state where possible
        setHeaderResponse(hdr);
        setHeaderSaved(true);
        setHeaderEditable(true);
        setIsEditingHeader(true);
        setExpandedId(1);

        setHeaderForm(s => ({
          ...s,
          companyName: hdr.Inquiry_No || hdr.InquiryNo || hdr.PurchaseRequestNumber || hdr.PurchaseRequestNo || hdr.companyName || hdr.InquiryNumber || '',
          quotationTitle: hdr.QuotationTitle || hdr.Title || hdr.quotationTitle || hdr.SalesOrderTitle || '',
          purchaseOrderNumber: hdr.PurchaseOrderNo || hdr.PurchaseOrderNumber || s.purchaseOrderNumber || '',
          purchaseQuotationNumber: hdr.QuotationNo || hdr.QuotationNumber || hdr.Quotation || hdr.QuotationNo || s.purchaseQuotationNumber || '',
        }));

        // Prefer server UUIDs for vendor binding; fall back to readable name only if UUID not present
        setVendor(hdr.Vendor_UUID || hdr.VendorUUID || hdr.VendorId || hdr.Vendor || hdr.VendorName || hdr.CustomerName || '');

        // Set project name for display and UUID for API
        const projectDisplayName = hdr.ProjectName || hdr.Project || hdr.ProjectTitle || '';
        const projectId = hdr.ProjectUUID || hdr.Project_Id || hdr.ProjectId || hdr.UUID || hdr.Uuid || '';
        setProjectName(projectDisplayName); // Use name for display
        setProjectUUID(projectId); // Use UUID for API
        try {
          if (formikSetFieldValueRef.current) {
            formikSetFieldValueRef.current('ProjectName', projectDisplayName || '');
            formikSetFieldValueRef.current('ProjectUUID', projectId || '');
          }
        } catch (_) {}

        setPaymentTerm(hdr.PaymentTermUUID || hdr.PaymentTerm || hdr.PaymentTermUUID || '');
        setPaymentMethod(hdr.PaymentMethodUUID || hdr.PaymentMethod || hdr.PaymentMethodUUID || '');

        // Dates: convert server date to UI format if present
        try {
          const od = hdr.OrderDate || hdr.Order_Date || hdr.OrderedAt || hdr.OrderDateString || hdr.Order_Date_String || hdr.OrderDateTime || hdr.OrderedDate;
          const dd = hdr.DueDate || hdr.Due_Date || hdr.ExpectedDate || hdr.DeliveryDate || hdr.RequiredDate;
          if (od) setInvoiceDate(formatUiDate(od));
          if (dd) setDueDate(formatUiDate(dd));
        } catch (e) { /* ignore */ }

        // Load lines for this header if UUID available
        const uuidToLoad = headerUuid || (hdr && (hdr.UUID || hdr.Id || hdr.HeaderUUID));
        if (uuidToLoad) {
          loadPurchaseOrderLines(uuidToLoad);
        }
        // Prefill notes and terms/conditions from server keys
        try {
          const incomingTerms = hdr.TermsConditions || hdr.Terms || hdr.TermsAndConditions || hdr.Terms_Conditions || hdr.TermsCondition || hdr.TermsandConditions || '';
          const incomingNotes = hdr.Notes || hdr.Note || hdr.NotesText || hdr.Remarks || hdr.Remark || '';
          if (incomingTerms) setTerms(incomingTerms);
          if (incomingNotes) setNotes(incomingNotes);
        } catch (e) { /* ignore */ }
      }
    } catch (e) {
      console.warn('prefill from route params failed', e);
    }
  }, [route?.params]);

  // If navigated here with just headerUuid (edit button), call API to fetch header and prefill
  useEffect(() => {
    const headerUuid = route?.params?.headerUuid || null;
    if (!headerUuid) return;
    let mounted = true;
    (async () => {
      try {
        // setIsPrefilling(true);
        const resp = await getPurchaseQuotationHeaderById({ headerUuid });
        try { console.log('getPurchaseQuotationHeaderById raw response ->', resp); } catch (_) {}
        try { console.log('getPurchaseQuotationHeaderById raw response (stringified) ->', JSON.stringify(resp, null, 2)); } catch (_) {}
        const data = resp?.Data || resp || null;
        console.log('getPurchaseQuotationHeaderById -> header UUID:', data);
        
        if (!mounted || !data) return;
          console.log('getPurchaseQuotationHeaderById -> header UUID:', data?.UUID || data?.Uuid || data?.Id || data?.HeaderUUID || null);
        // reuse existing prefill logic used for route.headerData
        setHeaderResponse(data);
        setHeaderSaved(true);
        setHeaderEditable(true);
        setIsEditingHeader(true);
        setExpandedId(1);

        setHeaderForm(s => ({
          ...s,
          companyName: data.Inquiry_No || data.InquiryNo || data.PurchaseRequestNumber || data.PurchaseRequestNo || data.companyName || data.InquiryNumber || '',
          quotationTitle: data.QuotationTitle || data.Title || data.quotationTitle || data.SalesOrderTitle || '',
          purchaseOrderNumber: data.PurchaseOrderNo || data.PurchaseOrderNumber || s.purchaseOrderNumber || '',
          purchaseQuotationNumber: data.QuotationNo || data.QuotationNumber || data.Quotation || data.QuotationNo || s.purchaseQuotationNumber || '',
        }));

        // Prefer server UUIDs for vendor binding; fall back to readable name only if UUID not present
        setVendor(data.Vendor_UUID || data.VendorUUID || data.VendorId || data.Vendor || data.VendorName || data.CustomerName || '');
        const projectDisplayName = data.ProjectName || data.Project || data.ProjectTitle || '';
        const projectId = data.ProjectUUID || data.Project_Id || data.ProjectId || data.UUID || data.Uuid || '';
        setProjectName(projectDisplayName);
        setProjectUUID(projectId);
        try {
          if (formikSetFieldValueRef.current) {
            formikSetFieldValueRef.current('ProjectName', projectDisplayName || '');
            formikSetFieldValueRef.current('ProjectUUID', projectId || '');
          }
        } catch (_) {}
        setPaymentTerm(data.PaymentTermUUID || data.PaymentTerm || data.PaymentTermUUID || '');
        setPaymentMethod(data.PaymentMethodUUID || data.PaymentMethod || data.PaymentMethodUUID || '');

        const uuidToLoad = headerUuid || (data && (data.UUID || data.Id || data.HeaderUUID));
        if (uuidToLoad) {
          try { await loadPurchaseOrderLines(uuidToLoad); } catch (e) { /* ignore */ }
        }
        // Prefill notes and terms/conditions from server response
        try {
          const incomingTerms = data.TermsConditions || data.Terms || data.TermsAndConditions || data.Terms_Conditions || data.TermsCondition || data.TermsandConditions || '';
          const incomingNotes = data.Notes || data.Note || data.NotesText || data.Remarks || data.Remark || '';
          if (incomingTerms) setTerms(incomingTerms);
          if (incomingNotes) setNotes(incomingNotes);
        } catch (e) { /* ignore */ }
      } catch (err) {
        console.warn('Failed to load purchase quotation header by id', err?.message || err);
      } finally {
        if (mounted) setIsPrefilling(false);
      }
    })();
    return () => { mounted = false; };
  }, [route?.params?.headerUuid]);

  // When navigated with header data or headerUuid, show the Purchase Quotation Number field
  useEffect(() => {
    try {
      const params = route?.params || {};
      if (params?.headerData || params?.headerUuid || params?.prefillHeader) {
        setShowPurchaseQuotationNoField(true);
      }
    } catch (e) {
      // ignore
    }
  }, [route?.params]);

  return (
    <>
      <View style={{ flex: 1, backgroundColor: '#fff' }}>
        <AppHeader
          title="Add Quotation Order"
          onLeftPress={() => {
            navigation.goBack();
          }}  
        />
        <View style={styles.headerSeparator} />
        <ScrollView
          contentContainerStyle={[styles.container]}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Header / Basic Details */}
          <Formik
            initialValues={{
              VendorName: vendor || '',
              QuotationTitle: headerForm.quotationTitle || '',
              ProjectName: projectName || '',
              ProjectUUID: projectUUID || '',
              PaymentTerm: paymentTerm || headerResponse?.PaymentTermUUID || headerResponse?.PaymentTerm || '',
              PaymentMethod: paymentMethod || headerResponse?.PaymentMode || headerResponse?.PaymentMethod || headerResponse?.PaymentMethodUUID || '',
              PQDocument: file || null,
            }}
            enableReinitialize
            validationSchema={HeaderValidationSchema}
            onSubmit={async (values) => {
              // Keep local state in sync with Formik values
              setVendor(values.VendorName || '');
              setHeaderForm(s => ({ ...s, quotationTitle: values.QuotationTitle || '' }));
              setProjectName(values.ProjectName || '');
              setProjectUUID(values.ProjectUUID || null);
              setPaymentTerm(values.PaymentTerm || '');
              setPaymentMethod(values.PaymentMethod || '');
              
              // Call the appropriate submit handler
              try {
                const shouldUpdate = (isEditingHeader || (headerResponse?.UUID && headerEditable));
                if (shouldUpdate) {
                  await updateHeader();
                } else {
                  await submitHeader();
                }
              } catch (e) {
                // Error already handled in handlers
              }
            }}
          >
            {({ values, handleChange, handleBlur, setFieldValue, errors, touched, submitForm, submitCount }) => {
              // Store setFieldValue and submitForm in refs so file handler and submit button can use them
              formikSetFieldValueRef.current = setFieldValue;
              formikSubmitRef.current = submitForm;
              return (
                <AccordionSection
                  id={1}
                  title="Header"
                  expanded={expandedId === 1}
                  onToggle={toggleSection}
                  rightActions={
                    headerSubmitted && !headerEditable ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(2) }}>
                        <Icon name="check-circle" size={rf(5)} color={COLORS.success || '#28a755'} />
                        <TouchableOpacity onPress={() => { setHeaderEditable(true); setIsEditingHeader(true); setExpandedId(1); setShowPurchaseQuotationNoField(true); }}>
                          <Icon name="edit" size={rf(4.4)} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : null
                  }
                >
            {showPurchaseQuotationNoField && (
              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={inputStyles.label}>Purchase Quotation Number*</Text>
                  <View style={[inputStyles.box]}>
                    <TextInput
                      style={[inputStyles.input, { color: '#000000' }]}
                      value={headerForm.purchaseQuotationNumber || headerResponse?.QuotationNo || headerResponse?.QuotationNumber || ''}
                      placeholder="eg."
                      placeholderTextColor={COLORS.textLight}
                      editable={false}
                      pointerEvents="none"
                    />
                  </View>
                </View>
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Purchase Inquiry No.</Text>
                <Dropdown
                  placeholder="select Purchase Inquiry"
                  value={headerForm.companyName}
                  options={purchaseQuotationNumbers}
                  getLabel={p => (p?.label ?? String(p))}
                  getKey={p => (p?.value ?? String(p))}
                  onSelect={opt => {
                    if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                    try {
                      const selected = opt && (opt.value ?? opt);
                      setHeaderForm(s => ({ ...s, companyName: selected }));
                    } catch (e) {
                      setHeaderForm(s => ({ ...s, companyName: opt || '' }));
                    }
                  }}
                  inputBoxStyle={inputStyles.box}
                // textStyle={inputStyles.input}
                />
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}> Vendor Name*  </Text>
                <View style={{ zIndex: 9998, elevation: 20 }}>
                  <Dropdown
                    placeholder="-Select Vendor-"
                    value={values.VendorName || ''}
                    options={vendorOptions}
                    getLabel={p => (p?.label ?? String(p))}
                    getKey={p => (p?.value ?? String(p))}
                    onSelect={opt => {
                      if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                      try {
                        const selectedValue = opt && (opt.value ?? opt?.UUID ?? opt);
                        setFieldValue('VendorName', selectedValue || '');
                        setVendor(selectedValue);
                      } catch (e) {
                        setFieldValue('VendorName', opt || '');
                        setVendor(opt);
                      }
                    }}
                    renderInModal={true}
                    inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                  // textStyle={inputStyles.input}
                  />
                </View>
                {errors.VendorName && (touched.VendorName || submitCount > 0) ? (
                  <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.VendorName}</Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.row, { marginTop: hp(1.5) }]}>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Quotation Title*</Text>
                <View
                  style={[inputStyles.box]}
                  onStartShouldSetResponder={() => true}
                  onResponderGrant={() => quotationTitleRef.current?.focus()}
                >
                  <TextInput
                    ref={quotationTitleRef}
                    onFocus={() => setFocusedQuotationTitle(true)}
                    onBlur={(e) => {
                      setFocusedQuotationTitle(false);
                      handleBlur('QuotationTitle')(e);
                    }}
                    style={[
                      inputStyles.input,
                      { color: focusedQuotationTitle ? '#000000' : COLORS.text, textShadowColor: focusedQuotationTitle ? '#000000' : 'transparent' },
                    ]}
                    value={values.QuotationTitle}
                    onChangeText={(v) => {
                      setFieldValue('QuotationTitle', v);
                      setHeaderForm(s => ({ ...s, quotationTitle: v }));
                    }}
                    placeholder="eg."
                    placeholderTextColor={COLORS.textLight}
                    editable={headerEditable}
                  />
                </View>
                {errors.QuotationTitle && (touched.QuotationTitle || submitCount > 0) ? (
                  <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.QuotationTitle}</Text>
                ) : null}
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Project Name*</Text>
                <View style={{ zIndex: 9998, elevation: 20 }}>
                  <Dropdown
                    placeholder="Select Project"
                    value={values.ProjectUUID || projectUUID || ''}
                    options={projects}
                    getLabel={p => p?.label || ''}
                    getKey={p => p?.value}
                    onSelect={opt => {
                      if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                      // Extract UUID for API and name for display
                      try {
                        console.log('Selected project option:', opt);
                        const selectedUUID = opt?.value || '';
                        const selectedName = opt?.label || '';

                        console.log('Final UUID being set:', selectedUUID);
                        console.log('Selected name:', selectedName);

                        setFieldValue('ProjectName', selectedName);
                        setFieldValue('ProjectUUID', selectedUUID);
                        setProjectUUID(selectedUUID); // Store UUID for API
                        setProjectName(selectedName); // Store name for display
                        try { if (formikSetFieldValueRef.current) { formikSetFieldValueRef.current('ProjectUUID', selectedUUID); formikSetFieldValueRef.current('ProjectName', selectedName); } } catch (_) {}
                      } catch (e) {
                        console.log('Error in project selection:', e);
                        setFieldValue('ProjectName', opt || '');
                        setFieldValue('ProjectUUID', '');
                        setProjectUUID('');
                        setProjectName(opt);
                        try { if (formikSetFieldValueRef.current) { formikSetFieldValueRef.current('ProjectUUID', ''); formikSetFieldValueRef.current('ProjectName', opt || ''); } } catch (_) {}
                      }
                    }}
                    renderInModal={true}
                    inputBoxStyle={[inputStyles.box]}
                  // textStyle={inputStyles.input}
                  />
                </View>
                {errors.ProjectName && (touched.ProjectName || submitCount > 0) ? (
                  <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.ProjectName}</Text>
                ) : null}
              </View>
            </View>

            <View style={[styles.row, { marginTop: hp(1.5) }]}>

              <View style={styles.col}>
                <Text style={inputStyles.label}>Payment Term* </Text>

                <View style={{ zIndex: 9998, elevation: 20 }}>
                  <Dropdown
                    placeholder="Select Payment Term"
                    value={values.PaymentTerm || ''}
                    options={paymentTermOptions}
                    getLabel={p => (p?.label ?? String(p))}
                    getKey={p => (p?.value ?? String(p))}
                    onSelect={opt => {
                      if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                      try {
                        const v = opt && (opt.value ?? opt);
                        setFieldValue('PaymentTerm', v || '');
                        setPaymentTerm(v);
                      } catch (e) {
                        setFieldValue('PaymentTerm', opt || '');
                        setPaymentTerm(opt);
                      }
                    }}
                    renderInModal={true}
                    inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                  // textStyle={inputStyles.input}
                  />
                </View>
                {errors.PaymentTerm && (touched.PaymentTerm || submitCount > 0) ? (
                  <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.PaymentTerm}</Text>
                ) : null}
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}>payment Method* </Text>

                <View style={{ zIndex: 9998, elevation: 20 }}>
                  <Dropdown
                    placeholder="Payment Method"
                    value={values.PaymentMethod || ''}
                    options={(paymentMethodOptions && paymentMethodOptions.length) ? paymentMethodOptions : paymentMethods.map(m => ({ label: m, value: m }))}
                    getLabel={p => (p?.label ?? String(p))}
                    getKey={p => (p?.value ?? String(p))}
                    onSelect={opt => {
                      if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                      try {
                        const v = opt && (opt.value ?? opt);
                        setFieldValue('PaymentMethod', v || '');
                        setPaymentMethod(v);
                      } catch (e) {
                        setFieldValue('PaymentMethod', opt || '');
                        setPaymentMethod(opt);
                      }
                    }}
                    renderInModal={true}
                    inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                  // textStyle={inputStyles.input}
                  />
                </View>
                {errors.PaymentMethod && (touched.PaymentMethod || submitCount > 0) ? (
                  <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.PaymentMethod}</Text>
                ) : null}
              </View>
            </View>
            <View style={[styles.row, { marginTop: hp(1.5) }]}>
              <View style={styles.attachCol}>
                <Text style={inputStyles.label}>Upload PQ Document</Text>
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
                    placeholderTextColor="#9ca3af"
                    value={values.PQDocument?.name || file?.name || ''}
                    editable={false}
                  />
                  {values.PQDocument || file ? (
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
                      onPress={() => {
                        if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                        pickFile();
                      }}
                    >
                      <Icon name="cloud-upload" size={rf(4)} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
                {/* {errors.PQDocument && (touched.PQDocument || submitCount > 0) ? (
                  <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.PQDocument}</Text>
                ) : null} */}
                <Text style={styles.uploadHint}>
                  Allowed: PDF, PNG, JPG • Max size 10 MB
                </Text>
              </View>
            </View>

            <View style={{ marginTop: hp(1.5), flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  submitForm();
                }}
                style={{
                  backgroundColor: COLORS.primary,
                  paddingVertical: hp(1),
                  paddingHorizontal: wp(4),
                  borderRadius: 6,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                disabled={headerSubmitting || (headerSubmitted && !headerEditable)}
              >
                {headerSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontFamily: TYPOGRAPHY.fontFamilyMedium, fontSize: rf(3.2) }}>{(isEditingHeader || (headerResponse?.UUID && headerEditable)) ? 'Update' : 'Submit'}</Text>
                )}
              </TouchableOpacity>
            </View>
                </AccordionSection>
              );
            }}
          </Formik>

          {/* Section 2: Billing Address */}
          {/* <AccordionSection
            id={2}
            title="Billing Address"
            expanded={expandedId === 2}
            onToggle={toggleSection}
          >
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Building No.</Text>
                <View style={[inputStyles.box]}>
                  <TextInput
                    style={[inputStyles.input]}
                    value={billingForm.buildingNo}
                    onChangeText={v =>
                      setBillingForm(s => ({ ...s, buildingNo: v }))
                    }
                    placeholder="eg."
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Street 1</Text>
                <View style={[inputStyles.box]}>
                  <TextInput
                    style={[inputStyles.input]}
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
                <View style={[inputStyles.box]}>
                  <TextInput
                    style={[inputStyles.input]}
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
                <Text style={inputStyles.label}>Postal Code</Text>
                <View style={[inputStyles.box]}>
                  <TextInput
                    style={[inputStyles.input]}
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
                <Text style={inputStyles.label}>Country Name</Text>
                <View style={{ zIndex: 9999, elevation: 20 }}>
                  <Dropdown
                    placeholder="- Select Country -"
                    value={billingForm.country}
                    options={countries}
                    getLabel={c => c}
                    getKey={c => c}
                    onSelect={c => setBillingForm(s => ({ ...s, country: c }))}
                    inputBoxStyle={inputStyles.box}
                    style={{ marginBottom: hp(1.6) }}
                    renderInModal={true}
                  />
                </View>
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}>State Name</Text>
                 <View style={{ zIndex: 9999, elevation: 20 }}>
                  <Dropdown
                    placeholder="- Select State -"
                    value={billingForm.country}
                    options={state}
                    getLabel={c => c}
                    getKey={c => c}
                    onSelect={c => setBillingForm(s => ({ ...s, country: c }))}
                    inputBoxStyle={inputStyles.box}
                    style={{ marginBottom: hp(1.6) }}
                    renderInModal={true}
                  />
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={inputStyles.label}>City Name</Text>
                <View style={{ zIndex: 9998, elevation: 20 }}>
                  <Dropdown
                    placeholder="- Select City -"
                    value={billingForm.city}
                    options={city}
                    getLabel={c => c}
                    getKey={c => c}
                    onSelect={c => setBillingForm(s => ({ ...s, city: c }))}
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
                    copyBillingToShipping();
                  }}
                >
                  <View style={styles.checkboxBox}>
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
          </AccordionSection> */}

          {/* Section 3: Shipping Address */}
          {/* <AccordionSection
            id={3}
            title="Shipping Address"
            expanded={expandedId === 3}
            onToggle={toggleSection}
          >
            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={inputStyles.label}>Building No.</Text>
                <View style={[inputStyles.box]}>
                  <TextInput
                    style={[inputStyles.input]}
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
                <Text style={inputStyles.label}>Street 1</Text>
                <View style={[inputStyles.box]}>
                  <TextInput
                    style={[inputStyles.input]}
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
                <View style={[inputStyles.box]}>
                  <TextInput
                    style={[inputStyles.input]}
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
                <Text style={inputStyles.label}>Postal Code</Text>
                <View style={[inputStyles.box]}>
                  <TextInput
                    style={[inputStyles.input]}
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
                <Text style={inputStyles.label}>Country Name</Text>
                <View style={{ zIndex: 9999, elevation: 20 }}>
                  <Dropdown
                    placeholder="- Select Country -"
                    value={shippingForm.country}
                    options={countries}
                    getLabel={c => c}
                    getKey={c => c}
                    onSelect={c => setShippingForm(s => ({ ...s, country: c }))}
                    inputBoxStyle={inputStyles.box}
                    textStyle={inputStyles.input}
                    style={{ marginBottom: hp(1.6) }}
                    renderInModal={true}
                  />
                </View>
              </View>
              <View style={styles.col}>
                <Text style={inputStyles.label}>State Name</Text>
                <View style={{ zIndex: 9999, elevation: 20 }}>
                  <Dropdown
                    placeholder="- Select State -"
                    value={shippingForm.state}
                    options={state}
                    getLabel={c => c}
                    getKey={c => c}
                    onSelect={c => setShippingForm(s => ({ ...s, state: c }))}
                    inputBoxStyle={inputStyles.box}
                    textStyle={inputStyles.input}
                    style={{ marginBottom: hp(1.6) }}
                    renderInModal={true}
                  />
                </View>
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.col}>
                <Text style={inputStyles.label}>City Name</Text>
                <View style={{ zIndex: 9998, elevation: 20 }}>
                  <Dropdown
                    placeholder="- Select City -"
                    value={shippingForm.city}
                    options={city}
                    getLabel={c => c}
                    getKey={c => c}
                    onSelect={c => setShippingForm(s => ({ ...s, city: c }))}
                    inputBoxStyle={inputStyles.box}
                    textStyle={inputStyles.input}
                    style={{ marginBottom: hp(1.6) }}
                    renderInModal={true}
                  />
                </View>
              </View>
              <View style={styles.col} />
            </View>
          </AccordionSection> */}

          {/* Section 4: Create Order */}
          <AccordionSection
            id={4}
            title="Create Order"
            expanded={expandedId === 4}
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

              {/* LINE form: Item | Description | Quantity | Rate | Amount (copied UI from ManageSalesOrder) */}
              <View style={{ marginBottom: hp(1.5) }}>
                <View style={{ width: '100%', marginBottom: hp(1) }}>
                  <Text style={inputStyles.label}>Item*</Text>
                  <View style={{ zIndex: 9999, elevation: 20 }}>
                    <Dropdown
                      placeholder="Select Item"
                      value={currentItem.itemNameUuid || currentItem.itemName}
                      options={masterItems}
                      getLabel={it => (it?.name || String(it))}
                      getKey={it => (it?.uuid || it?.sku || it)}
                      onSelect={v => {
                        if (v && typeof v === 'object') {
                          setCurrentItem(ci => ({ ...ci, itemName: v?.name || v, itemNameUuid: v?.uuid || v?.sku || v, rate: String(v?.rate || ci?.rate || ''), desc: v?.desc || ci?.desc || '', hsn: v?.hsn || ci?.hsn || '' }));
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

                <View style={{ width: '100%', marginBottom: hp(1) }}>
                  <Text style={inputStyles.label}>Description</Text>
                  <TextInput
                    style={[styles.descInput, { minHeight: hp(10), width: '100%' }]}
                    value={currentItem.desc || ''}
                    onChangeText={t => setCurrentItem(ci => ({ ...ci, desc: t }))}
                    placeholder="Enter description"
                    placeholderTextColor={COLORS.textLight}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={{ width: '100%', marginBottom: hp(1) }}>
                  <Text style={inputStyles.label}>HSN/SAC</Text>
                  <TextInput
                    style={[inputStyles.box, { color: screenTheme.text, width: '100%' }]}
                    value={currentItem.hsn || ''}
                    onChangeText={t => setCurrentItem(ci => ({ ...ci, hsn: t }))}
                    placeholder="Enter HSN/SAC code"
                    placeholderTextColor={COLORS.textLight}
                  />
                </View>

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
                      style={[
                        styles.addButton,
                        (isAddingLine || !(currentItem.itemName || currentItem.itemNameUuid)) ? { opacity: 1 } : null,
                        { backgroundColor: COLORS.primary }
                      ]}
                      onPress={handleAddLineItem}
                      disabled={isAddingLine || !(currentItem.itemName || currentItem.itemNameUuid)}
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
                        onPress={() => { setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '1', unit: '', unitUuid: null, desc: '', rate: '' }); setEditItemId(null); }}
                      >
                        <Text style={styles.addButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
              {/* Table container (search + pagination + table) */}
              {linesLoading ? (
                <View style={{ paddingVertical: hp(4), alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : items.length > 0 && (
                <View>
                  <View style={styles.tableControlsRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={{ marginRight: wp(2) }}>Show</Text>
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
                      <Text style={{ marginLeft: wp(2) }}>entries</Text>
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
                            <Text style={[styles.th, { width: wp(10) }]}>Sr.No</Text>
                            <Text style={[styles.th, { width: wp(30) }]}>Item Details</Text>
                            <Text style={[styles.th, { width: wp(25) }]}>Description</Text>
                            <Text style={[styles.th, { width: wp(20) }]}>HSN/SAC</Text>
                            <Text style={[styles.th, { width: wp(20) }]}>Quantity</Text>
                            <Text style={[styles.th, { width: wp(20) }]}>Rate</Text>
                            <Text style={[styles.th, { width: wp(20) }]}>Amount</Text>
                            <Text style={[styles.th, { width: wp(40) }]}>Action</Text>
                          </View>
                        </View>

                        <View style={styles.tbody}>
                          {(() => {
                            const q = String(tableSearch || '').trim().toLowerCase();
                            const filtered = q ? items.filter(it => {
                              return (
                                String(it.name || '').toLowerCase().includes(q) ||
                                String(it.itemType || '').toLowerCase().includes(q) ||
                                String(it.desc || '').toLowerCase().includes(q) ||
                                String(it.hsn || '').toLowerCase().includes(q)
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
                                    <View style={[styles.td, { width: wp(25) }]}>
                                      <Text style={styles.tdText}>{item.desc}</Text>
                                    </View>
                                    <View style={[styles.td, { width: wp(20), paddingVertical: hp(0.5), minHeight: hp(4) }]}>
                                      <Text style={[styles.tdText, { fontSize: rf(2.8), lineHeight: rf(3.2) }]} numberOfLines={2} ellipsizeMode="tail">{item.hsn || ''}</Text>
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

              {/* Totals / Summary area */}
              <View style={styles.billContainer}>
                {/* Subtotal */}
                <View style={styles.row}>
                  <Text style={styles.labelBold}>Subtotal:</Text>
                  <Text style={styles.valueBold}>₹{computeSubtotal()}</Text>
                </View>

                {/* Shipping Charges */}
                <View style={styles.rowInput}>
                  <Text style={styles.label}>Discount:</Text>

                  <View style={styles.inputRightGroup}>
                    <View
                      onStartShouldSetResponder={() => true}
                      onResponderGrant={() => discountRef.current?.focus()}
                      style={{ flex: 1 }}
                    >
                      <TextInput
                        ref={discountRef}
                        onFocus={() => setFocusedDiscount(true)}
                        onBlur={() => setFocusedDiscount(false)}
                        value={String(discount)}
                        onChangeText={setDiscount}
                        keyboardType="numeric"
                        style={[
                          styles.inputBox,
                          { color: focusedDiscount ? '#000000' : COLORS.text, textShadowColor: focusedDiscount ? '#000000' : 'transparent' },
                        ]}
                      />
                    </View>

                    {/* Question Icon with Tooltip */}

                  </View>

                  <Text style={styles.value}>
                    -₹{parseFloat(discount || 0).toFixed(2)}
                  </Text>
                </View>



                {/* Total Tax */}
                <View style={styles.row}>
                  <Text style={styles.label}>Total Tax:</Text>
                  <Text style={styles.value}>₹0.00</Text>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Total Amount */}
                <View style={styles.row}>
                  <Text style={styles.labelBold}>Total Amount:</Text>
                  <Text style={styles.valueBold}>
                    ₹
                    {(
                      parseFloat(computeSubtotal()) +
                      parseFloat(shippingCharges || 0) +
                      parseFloat(adjustments || 0) +
                      parseFloat(totalTax || 0) -
                      parseFloat(discount || 0)
                    ).toFixed(2)}
                  </Text>
                </View>
              </View>

              {/* Notes + Attach file inline */}
              <View style={styles.notesAttachRow}>
                <View style={styles.notesCol}>
                  <Text style={inputStyles.label}>Notes</Text>
                  <View
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={() => termsRef.current?.focus()}
                  >
                    <TextInput
                      ref={termsRef}
                      onFocus={() => setFocusedTerms(true)}
                      onBlur={() => setFocusedTerms(false)}
                      style={[
                        styles.noteBox,
                        { color: focusedTerms ? '#000000' : COLORS.text, textShadowColor: focusedTerms ? '#000000' : 'transparent' },
                      ]}
                      multiline
                      numberOfLines={4}
                      value={terms}
                      onChangeText={setTerms}
                      placeholder="Add any Terms & Condition..."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
                </View>


                <View style={styles.notesCol}>
                  <Text style={inputStyles.label}>Terms & Conditions</Text>
                  <View
                    onStartShouldSetResponder={() => true}
                    onResponderGrant={() => notesRef.current?.focus()}
                  >
                    <TextInput
                      ref={notesRef}
                      onFocus={() => setFocusedNotes(true)}
                      onBlur={() => setFocusedNotes(false)}
                      style={[
                        styles.noteBox,
                        { color: focusedNotes ? '#000000' : COLORS.text, textShadowColor: focusedNotes ? '#000000' : 'transparent' },
                      ]}
                      multiline
                      numberOfLines={4}
                      value={notes}
                      onChangeText={setNotes}
                      placeholder="Terms & Conditions..."
                      placeholderTextColor={COLORS.textLight}
                    />
                  </View>
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
                      placeholderTextColor="#9ca3af"
                      value={file2?.name || ''}
                      editable={false}
                    />
                    {file2 ? (
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={removeFile2}
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
                        onPress={() => {
                          // Allow uploading an additional attachment from this field
                          // even when header is read-only — it's a separate document.
                          pickAnotherFile();
                        }}
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
            </View>
          </AccordionSection>

          {/* Section 5: Notes (full width) */}
          {/* <AccordionSection id={5} title="Notes" expanded={expandedId === 5} onToggle={toggleSection}>
                            <Text style={inputStyles.label}>Notes</Text>
                            <TextInput style={styles.noteBox} multiline numberOfLines={4} value={notes} onChangeText={setNotes} placeholder="Add any remarks..." placeholderTextColor={COLORS.textLight} />
                        </AccordionSection> */}
        </ScrollView>
        <DatePickerBottomSheet
          isVisible={openDatePicker}
          onClose={closeDatePicker}
          selectedDate={datePickerSelectedDate}
          onDateSelect={handleDateSelect}
          title="Select Date"
        />
                {(Array.isArray(expandedId) ? expandedId.includes(4) : expandedId === 4) && (

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
            <TouchableOpacity
              activeOpacity={0.85}
              style={[formStyles.primaryBtn, { paddingVertical: hp(1.4) }]}
              onPress={handleCreateOrder}
              disabled={false}
            >
              <Text style={formStyles.primaryBtnText}>
                Submit
                {/* {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Submit')} */}
              </Text>
            </TouchableOpacity>
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
        </View>)}
      </View>
    </>
  );
};

export default AddPurchaseQuotation;

const styles = StyleSheet.create({
  container: {
    padding: wp(3.5),
    paddingBottom: hp(6),
    backgroundColor: '#fff',
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
    backgroundColor: COLORS.bg,
    shadowColor: '#000',
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
    backgroundColor: COLORS.bg,
  },
  sectionBanner: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    backgroundColor: (COLORS.success || '#28a755') + '15',
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
    backgroundColor: COLORS.bg,
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
    backgroundColor: COLORS.bg,
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
    backgroundColor: COLORS.bg,
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
    backgroundColor: COLORS.bg,
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
  thead: { backgroundColor: '#f1f1f1' },
  tr: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },

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
  actionButton: {
    backgroundColor: '#6c757d',
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2),
    borderRadius: wp(1),
  },

  /* ── TH (header) ── */
  th: {
    paddingVertical: hp(1.4),
    textAlign: 'center',
    fontWeight: '700',
    fontSize: wp(3),
    borderRightWidth: 1,
    borderRightColor: '#CFCFCF',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
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
  },
  tdText: {
    fontSize: wp(3),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
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

  /* ── ITEM CARD ── */
  // itemCard: {
  //     backgroundColor: '#fff',
  //     padding: wp(2),
  //     borderRadius: wp(1.5),
  //     borderWidth: 1,
  //     borderColor: '#ddd',
  // },
  // itemTitle: { fontWeight: 'bold', fontSize: wp(3.6), color: COLORS.text },
  // itemSku: { fontSize: wp(3), color: COLORS.textLight, marginTop: hp(0.2) },
  // itemDesc: {
  //     marginTop: hp(0.6),
  //     borderWidth: 1,
  //     borderColor: '#ced4da',
  //     borderRadius: wp(1),
  //     padding: wp(1.5),
  //     backgroundColor: '#fff',
  //     minHeight: hp(6),
  //     textAlignVertical: 'top',
  //     fontSize: wp(3.2),
  // },
  // hsnBadge: {
  //     marginTop: hp(0.8),
  //     backgroundColor: '#17a2b8',
  //     color: '#fff',
  //     fontSize: wp(2.8),
  //     paddingHorizontal: wp(2),
  //     paddingVertical: hp(0.4),
  //     borderRadius: wp(2),
  //     alignSelf: 'flex-start',
  // },

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
