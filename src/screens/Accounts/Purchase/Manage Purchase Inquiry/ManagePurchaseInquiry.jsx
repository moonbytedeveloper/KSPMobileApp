import React, { useState, useRef, useEffect } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { wp, hp, rf } from '../../../../utils/responsive';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, inputStyles, formStyles } from '../../../styles/styles';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatePickerBottomSheet from '../../../../components/common/CustomDatePicker';
import { addSalesInquiry, getCustomers, getItemTypes, getItems, getUnits, addSalesHeader, addPurchaseInquiryHeader, addPurchaseInquiryLine, getPurchasequotationVendor, getCurrencies, getProjects, getPurchaseInquiryHeader, getPurchaseInquiryLines, updatePurchaseInquiryHeader, updatePurchaseInquiryLine, deletePurchaseInquiryLine } from '../../../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../../../api/tokenStorage';
import { getErrorMessage } from '../../../../utils/errorMessage';
import { uiDateToApiDate } from '../../../../utils/dateUtils';
import BottomSheetConfirm from '../../../../components/common/BottomSheetConfirm';

const AccordionSection = ({ id, title, expanded, onToggle, children, wrapperStyle, rightActions }) => {
    return (
        <View style={[styles.sectionWrapper, wrapperStyle]}>
            <TouchableOpacity activeOpacity={0.8} style={styles.sectionHeader} onPress={() => onToggle(id)}>
                <Text style={styles.sectionTitle}>{title}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>

                    {rightActions ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: wp(2) }}>
                            {rightActions}
                        </View>
                    ) : null}
                    <Icon name={expanded ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.text} />
                </View>
            </TouchableOpacity>
            {expanded && <View style={styles.line} />}
            {expanded && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
};

// Validation schema for Header form
const HeaderValidationSchema = Yup.object().shape({
    // VendorName: Yup.string().trim().required('Vendor is required'),
    VendorName: Yup.string().test('Vendor-or-uuid', 'Vendor is required', function (val) {
        const { VendorName } = this.parent || {};
        const hasVal = typeof val === 'string' && val.trim() !== '';
        const hasUuid = typeof VendorUUID === 'string' && VendorUUID.trim() !== '';
        return !!(hasVal || hasUuid);
    }),
    VendorUUID: Yup.string().test('vendor-uuid-or-name', 'Vendor is required', function (val) {
        const { VendorName } = this.parent || {};
        const hasUuid = typeof val === 'string' && val.trim() !== '';
        const hasName = typeof VendorName === 'string' && VendorName.trim() !== '';
        return !!(hasUuid || hasName);
    }),
    CurrencyType: Yup.string().test('currency-type-or-uuid', 'Currency type is required', function (val) {
        const { CurrencyUUID } = this.parent || {};
        const hasType = (typeof val === 'string' && val.trim() !== '') || (val !== null && val !== undefined && String(val).trim() !== '');
        const hasUuid = CurrencyUUID !== null && CurrencyUUID !== undefined && String(CurrencyUUID).trim() !== '';
        return !!(hasType || hasUuid);
    }),

    CurrencyUUID: Yup.mixed().test('currency-uuid-or-type', 'Currency type is required', function (val) {
        const { CurrencyType } = this.parent || {};
        const hasUuid = val !== null && val !== undefined && String(val).trim() !== '';
        const hasType = (typeof CurrencyType === 'string' && CurrencyType.trim() !== '') || (CurrencyType !== null && CurrencyType !== undefined && String(CurrencyType).trim() !== '');
        return !!(hasUuid || hasType);
    }),
    RequestTitle: Yup.string().trim().required('Request Title is required'),
    RequestedDate: Yup.string().trim().required('Requested Date is required'),
    ProjectName: Yup.string().test('project-or-uuid', 'Project is required', function (val) {
        const { ProjectUUID } = this.parent || {};
        const hasVal = typeof val === 'string' && val.trim() !== '';
        const hasUuid = typeof ProjectUUID === 'string' && ProjectUUID.trim() !== '';
        return !!(hasVal || hasUuid);
    }),
    ExpectedPurchaseDate: Yup.string().trim().required('Expected Purchase Date is required'),
});

const AddSalesInquiry = () => {
    const [expandedId, setExpandedId] = useState(1);
    const navigation = useNavigation();
    const toggleSection = (id) => setExpandedId((prev) => (prev === id ? null : id));
    // If header is saved, prevent opening it by tapping the header area (unless editing)
    const handleHeaderToggle = (id) => {
        if (id === 1 && headerSaved && !headerEditing) {
            Alert.alert('Header saved', 'To edit the header, please tap the edit icon.');
            return;
        }
        toggleSection(id);
    };

    // Demo options for dropdowns (fallbacks)
    const currencyTypes = ['- Select Currency -', 'USD', 'INR', 'EUR', 'GBP'];
    const demoItemTypes = ['- Select Item -', 'Furniture', 'Electronics', 'Office Supplies', 'Equipment'];
    const itemNames = ['- Select Item -', 'Chair', 'Table', 'Desk', 'Cabinet'];
    // Static vendors and projects lists (fallback)
    const vendorsStatic = ['- Select Vendor -', 'Vendor A', 'Vendor B', 'Vendor C'];
    const projectsStatic = ['- Select Project -', 'Project Alpha', 'Project Beta', 'Project Gamma'];
    const countries = ['- Select Country -', 'India', 'United States', 'United Kingdom', 'Australia', 'Germany'];
    const units = ['- Select Unit -', 'Pcs', 'Box', 'Set', 'Unit', 'failed'];

    // Form state
    // vendor selection replaces the previous UUID free-text field
    const [vendorName, setVendorName] = useState('');
    const [vendorUuid, setVendorUuid] = useState(null);
    const [vendors, setVendors] = useState([]);
    const [currencyOptions, setCurrencyOptions] = useState([]);
    // project selection for Project Name dropdown
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedProjectUuid, setSelectedProjectUuid] = useState(null);
    const [projects, setProjects] = useState([]);
    const formikSetFieldValueRef = useRef(null);
    // Debug: log projects whenever they change to help troubleshooting dropdown
    React.useEffect(() => {
        try {
            console.log('Projects state updated ->', projects);
        } catch (e) { }
    }, [projects]);
    const [currencyType, setCurrencyType] = useState('');
    const [currencyUuid, setCurrencyUuid] = useState(null);
    const [customerName, setCustomerName] = useState('');
    const [customerUuid, setCustomerUuid] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [serverItemTypes, setServerItemTypes] = useState([]);
    const [itemTypesLoading, setItemTypesLoading] = useState(false);
    const [serverItemMasters, setServerItemMasters] = useState([]);
    const [itemMastersLoading, setItemMastersLoading] = useState(false);
    const [serverUnits, setServerUnits] = useState([]);
    const [unitsLoading, setUnitsLoading] = useState(false);
    const [requestTitle, setRequestTitle] = useState('');
    const [requestedDate, setRequestedDate] = useState('');
    const [expectedPurchaseDate, setExpectedPurchaseDate] = useState('');
    const [projectName, setProjectName] = useState('');
    const [inquiryNo, setInquiryNo] = useState('');
    const [country, setCountry] = useState('');
    const [loading, setLoading] = useState(false);
    const [successSheetVisible, setSuccessSheetVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [headerSubmitting, setHeaderSubmitting] = useState(false);
    const [headerSaved, setHeaderSaved] = useState(false);
    const [headerResponse, setHeaderResponse] = useState(null);
    const [headerEditing, setHeaderEditing] = useState(false);

    // Line items state
    const [lineItems, setLineItems] = useState([]);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const pageSizes = [5, 10, 25, 50];
    const [searchQuery, setSearchQuery] = useState('');
    const filteredLineItems = lineItems.filter(li => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            (li.itemType || '').toString().toLowerCase().includes(q) ||
            (li.itemName || '').toString().toLowerCase().includes(q) ||
            (li.quantity || '').toString().toLowerCase().includes(q)
        );
    });

    const totalLineItems = filteredLineItems.length;
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalLineItems);
    const pagedLineItems = filteredLineItems.slice(startIndex, endIndex);
    const totalPages = Math.max(1, Math.ceil(totalLineItems / pageSize));
    // Normalize server line objects into UI-friendly shape
    const normalizeLine = (ln, idx) => {
        const lineUuid = ln?.UUID || ln?.Id || ln?.LineUUID || ln?.lineUuid || ln?.id || null;
        const itemType = ln?.ItemTypeName || ln?.ItemType || ln?.ItemType_Title || ln?.ItemTypeName || ln?.TypeName || ln?.itemType || ln?.ItemType_Display || '';
        const itemTypeUuid = ln?.ItemType_UUID || ln?.ItemTypeUUID || ln?.ItemTypeId || ln?.ItemTypeId || ln?.ItemTypeId || ln?.itemTypeUuid || null;
        const itemName = ln?.ItemName || ln?.Name || ln?.Item || ln?.ProductName || ln?.itemName || '';
        const itemNameUuid = ln?.ItemName_UUID || ln?.ItemUUID || ln?.ItemId || ln?.ItemId || ln?.itemNameUuid || null;
        const quantity = (ln?.Quantity ?? ln?.Qty ?? ln?.quantity ?? ln?.QuantityOrdered) || '';
        const unit = ln?.UnitName || ln?.Unit || ln?.Unit_Display || ln?.unit || '';
        const unitUuid = ln?.Unit_UUID || ln?.UnitUUID || ln?.UnitId || ln?.unitUuid || null;
        return {
            id: idx + 1,
            lineUuid,
            itemType: String(itemType || ''),
            itemTypeUuid: itemTypeUuid || null,
            itemName: String(itemName || ''),
            itemNameUuid: itemNameUuid || null,
            quantity: String(quantity || ''),
            unit: String(unit || ''),
            unitUuid: unitUuid || null,
            raw: ln,
        };
    };

    // Helper to extract array of lines from various server response shapes
    const parseLinesFromResp = (resp) => {
        if (!resp) return [];
        const candidate = resp.Data || resp.List || resp.Records || resp;
        if (!candidate) return [];
        if (Array.isArray(candidate)) return candidate;
        if (candidate.Records && Array.isArray(candidate.Records)) return candidate.Records;
        if (candidate.List && Array.isArray(candidate.List)) return candidate.List;
        // Some endpoints return Data as an object with nested arrays
        if (resp.Data && Array.isArray(resp.Data)) return resp.Data;
        return [];
    };

    // Helper: find matching option by uuid/id or by display/name (case-insensitive)
    const findOptionByUuidOrName = (options = [], needle) => {
        if (!options || !options.length || !needle) return null;
        const s = String(needle).trim();
        if (!s) return null;
        const needleLower = s.toLowerCase();
        // Try exact uuid/id match first
        for (const opt of options) {
            const id = opt?.UUID || opt?.Uuid || opt?.Id || opt?.id || opt?.VendorUUID || opt?.Vendor_Id || opt?.ProjectUUID || opt?.Project_Id || '';
            if (String(id) === s) return opt;
        }
        // Try matching by common name/display fields
        for (const opt of options) {
            const name = (opt && (opt?.Name || opt?.DisplayName || opt?.VendorName || opt?.ProjectTitle || opt?.ProjectName || opt?.CurrencyName || opt?.Code || String(opt))) || '';
            if (String(name).toLowerCase() === needleLower) return opt;
        }
        // Fallback: partial contains
        for (const opt of options) {
            const name = (opt && (opt?.Name || opt?.DisplayName || opt?.VendorName || opt?.ProjectTitle || opt?.ProjectName || opt?.CurrencyName || opt?.Code || String(opt))) || '';
            if (String(name).toLowerCase().includes(needleLower)) return opt;
        }
        return null;
    };

    // Debug: log key state when lines or header state changes
    useEffect(() => {
        try {
            console.log('DEBUG state -> lineItems.length:', Array.isArray(lineItems) ? lineItems.length : 0, 'headerSaved:', headerSaved, 'expandedId:', expandedId, 'currentHeaderUuid:', currentHeaderUuid);
        } catch (e) { }
    }, [lineItems, headerSaved, expandedId, currentHeaderUuid]);
    const [lineAdding, setLineAdding] = useState(false);
    // Map of headerUuid -> array of line items (keeps lines isolated per header)
    const [headerLinesMap, setHeaderLinesMap] = useState({});
    // Current header UUID we are editing (null while creating a new header)
    const [currentHeaderUuid, setCurrentHeaderUuid] = useState(null);
    const [currentItem, setCurrentItem] = useState({
        itemType: '',
        itemTypeUuid: null,
        itemName: '',
        itemNameUuid: null,
        quantity: '',
        unit: '',
        unitUuid: null
    });
    const [editLineItemId, setEditLineItemId] = useState(null);

    // Date picker state
    const [openDatePicker, setOpenDatePicker] = useState(false);
    const [datePickerField, setDatePickerField] = useState(null);
    const [datePickerSelectedDate, setDatePickerSelectedDate] = useState(new Date());

    // Reset all local state to initial defaults so screen is fresh when reopened
    const resetAllState = () => {
        try {
            setVendorName('');
            setVendorUuid(null);
            setVendors([]);
            setCurrencyOptions([]);
            setSelectedProject(null);
            setSelectedProjectUuid(null);
            setProjects([]);
            setCurrencyType('');
            setCurrencyUuid(null);
            setCustomerName('');
            setCustomerUuid(null);
            setCustomers([]);
            setServerItemTypes([]);
            setItemTypesLoading(false);
            setServerItemMasters([]);
            setItemMastersLoading(false);
            setServerUnits([]);
            setUnitsLoading(false);
            setRequestTitle('');
            setRequestedDate('');
            setExpectedPurchaseDate('');
            setProjectName('');
            setInquiryNo('');
            setCountry('');
            setLoading(false);
            setSuccessSheetVisible(false);
            setSuccessMessage('');
            setHeaderSubmitting(false);
            setHeaderSaved(false);
            setHeaderResponse(null);
            setHeaderEditing(false);
            setLineItems([]);
            setLineAdding(false);
            setHeaderLinesMap({});
            setCurrentHeaderUuid(null);
            setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
            setEditLineItemId(null);
            setOpenDatePicker(false);
            setDatePickerField(null);
            setDatePickerSelectedDate(new Date());
        } catch (e) {
            console.warn('resetAllState error', e);
        }
    };
    // Render numbered page buttons (with simple ellipses for long ranges)
    const renderPageButtons = (currentPage, totalPages) => {
        // if (!totalPages || totalPages <= 1) return null;
        const buttons = [];
        const pushPage = (p) => {
            buttons.push(
                <TouchableOpacity
                    key={`p-${p}`}
                    style={[styles.pageButton, currentPage === p && styles.pageButtonActive, { marginHorizontal: wp(0.8) }]}
                    onPress={() => setPage(p)}
                    disabled={currentPage === p}
                >
                    <Text style={[styles.pageButtonText, currentPage === p && styles.pageButtonTextActive]}>{String(p)}</Text>
                </TouchableOpacity>
            );
        };

        // If few pages, show all
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pushPage(i);
            return buttons;
        }

        // Always show first
        pushPage(1);
        let left = Math.max(2, currentPage - 1);
        let right = Math.min(totalPages - 1, currentPage + 1);

        if (left > 2) {
            buttons.push(<Text key="ell-left" style={{ marginHorizontal: wp(1) }}>...</Text>);
        }

        for (let i = left; i <= right; i++) pushPage(i);

        if (right < totalPages - 1) {
            buttons.push(<Text key="ell-right" style={{ marginHorizontal: wp(1) }}>...</Text>);
        }

        // Always show last
        pushPage(totalPages);
        return buttons;
    };

    // Clear local state when this screen loses focus so next open is fresh
    useEffect(() => {
        const unsub = navigation.addListener && navigation.addListener('blur', () => {
            resetAllState();
        });
        return () => {
            try { if (unsub && typeof unsub === 'function') unsub(); } catch (_) { }
        };
    }, [navigation]);

    const formatUiDate = (date) => {
        try {
            if (date === null || date === undefined || date === '') return '';
            let dObj = null;
            // If already a Date
            if (date instanceof Date && !isNaN(date.getTime())) {
                dObj = date;
            } else {
                const s = String(date).trim();
                // Match UI format dd-Mmm-yyyy e.g. 20-Nov-2025
                if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(s)) {
                    const [ddStr, mmm, yyyyStr] = s.split('-');
                    const monthsMap = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
                    const mm = monthsMap[mmm];
                    if (mm) dObj = new Date(Number(yyyyStr), mm - 1, Number(ddStr));
                }
                // Match API format yyyy-MM-dd
                if (!dObj && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
                    const [y, m, d] = s.split('-').map(Number);
                    dObj = new Date(y, (m || 1) - 1, d || 1);
                }
                // Fallback to Date parse
                if (!dObj) {
                    const parsed = new Date(s);
                    if (!isNaN(parsed.getTime())) dObj = parsed;
                }
            }
            if (!dObj || isNaN(dObj.getTime())) return '';
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dd = String(dObj.getDate()).padStart(2, '0');
            const mmm = months[dObj.getMonth()] || '';
            const yyyy = String(dObj.getFullYear());
            return `${dd}-${mmm}-${yyyy}`;
        } catch (e) {
            return '';
        }
    };
    const handleCreateOrder = () => {
        // Call update header API when final submit button is clicked
        handleUpdateHeader(true); // true indicates final submit - should navigate back
    }
    // Helpers to compute display names robustly (avoid placeholder values)
    const isPlaceholderString = (s) => typeof s === 'string' && /select/i.test(s);

    const getVendorDisplayName = () => {
        if (vendorName && !isPlaceholderString(vendorName)) return vendorName;
        // try to find vendor from vendors list by uuid
        try {
            const found = (vendors || []).find(v => (v?.UUID === vendorUuid || v?.Id === vendorUuid || v?.id === vendorUuid));
            if (found) return found?.Name || found?.DisplayName || found?.name || '';
        } catch (e) { }
        return '';
    };

    const getProjectDisplayName = () => {
        if (projectName && !isPlaceholderString(projectName)) return projectName;
        try {
            // selectedProject may be object or primitive
            if (selectedProject && typeof selectedProject === 'object') {
                return selectedProject?.ProjectTitle || selectedProject?.ProjectName || selectedProject?.Name || selectedProject?.Title || selectedProject?.DisplayName || selectedProject?.name || '';
            }
            const found = (projects || []).find(p => (p?.UUID === selectedProjectUuid || p?.Uuid === selectedProjectUuid || p?.ProjectUUID === selectedProjectUuid || p?.Id === selectedProjectUuid || p?.id === selectedProjectUuid));
            if (found) return found?.ProjectTitle || found?.ProjectName || found?.Name || found?.Title || found?.DisplayName || found?.name || '';
        } catch (e) { }
        return '';
    };


    const openDatePickerFor = (field) => {
        let initial = new Date();
        if (field === 'requested' && requestedDate) {
            // requestedDate may be in UI format 'dd-Mmm-yyyy' (e.g. '20-Nov-2025') which
            // `new Date()` does not parse reliably. Convert to API format then construct Date.
            try {
                const api = uiDateToApiDate(requestedDate); // returns 'yyyy-MM-dd' or null
                if (api) {
                    const [y, m, d] = String(api).split('-').map(Number);
                    // month is zero-based
                    initial = new Date(y, (m || 1) - 1, d || 1);
                } else {
                    const parsed = new Date(requestedDate);
                    if (!isNaN(parsed)) initial = parsed;
                }
            } catch (e) {
                const parsed = new Date(requestedDate);
                if (!isNaN(parsed)) initial = parsed;
            }
        }
        if (field === 'expected' && expectedPurchaseDate) {
            try {
                const api = uiDateToApiDate(expectedPurchaseDate);
                if (api) {
                    const [y, m, d] = String(api).split('-').map(Number);
                    initial = new Date(y, (m || 1) - 1, d || 1);
                } else {
                    const parsed = new Date(expectedPurchaseDate);
                    if (!isNaN(parsed)) initial = parsed;
                }
            } catch (e) {
                const parsed = new Date(expectedPurchaseDate);
                if (!isNaN(parsed)) initial = parsed;
            }
        }
        setDatePickerSelectedDate(initial);
        setDatePickerField(field);
        setOpenDatePicker(true);
    };

    const closeDatePicker = () => {
        setOpenDatePicker(false);
        setDatePickerField(null);
    };

    const handleDateSelect = (date) => {
        const formatted = formatUiDate(date);
        if (datePickerField === 'requested') {
            setRequestedDate(formatted);
            if (formikSetFieldValueRef.current) {
                formikSetFieldValueRef.current('RequestedDate', formatted);
            }
        }
        if (datePickerField === 'expected') {
            setExpectedPurchaseDate(formatted);
            if (formikSetFieldValueRef.current) {
                formikSetFieldValueRef.current('ExpectedPurchaseDate', formatted);
            }
        }
        setOpenDatePicker(false);
        setDatePickerField(null);
    };

    const handleAddItem = () => {
        if (!currentItem.itemType || !currentItem.itemName || !currentItem.quantity || !currentItem.unit) {
            Alert.alert('Validation', 'Please fill all fields');
            return;
        }
        // If editing, update the existing item
        if (editLineItemId) {
            const existing = lineItems.find(it => it.id === editLineItemId);
            // If the item exists on server (has lineUuid) and header is saved, call update API
            const headerUuid = headerResponse?.Data?.UUID || headerResponse?.UUID || headerResponse?.Data?.HeaderUUID || headerResponse?.HeaderUUID || headerResponse?.HeaderUuid || headerResponse?.Data?.HeaderUuid;
            if (existing?.lineUuid && headerSaved && headerUuid) {
                (async () => {
                    try {
                        setLineAdding(true);
                        // Resolve UUIDs from available lookups if necessary
                        const resolvedItemTypeUuid = currentItem.itemTypeUuid || existing.itemTypeUuid || (findOptionByUuidOrName(serverItemTypes, currentItem.itemType)?.UUID || findOptionByUuidOrName(serverItemTypes, currentItem.itemType)?.Uuid || null);
                        const resolvedItemNameUuid = currentItem.itemNameUuid || existing.itemNameUuid || (findOptionByUuidOrName(serverItemMasters, currentItem.itemName)?.UUID || findOptionByUuidOrName(serverItemMasters, currentItem.itemName)?.Uuid || null);
                        const resolvedUnitUuid = currentItem.unitUuid || existing.unitUuid || (findOptionByUuidOrName(serverUnits, currentItem.unit)?.UUID || findOptionByUuidOrName(serverUnits, currentItem.unit)?.Uuid || null);

                        const payload = {
                            UUID: existing.lineUuid,
                            HeaderUUID: headerUuid,
                            ItemType_UUID: resolvedItemTypeUuid || null,
                            ItemName_UUID: resolvedItemNameUuid || null,
                            Quantity: Number(currentItem.quantity) || Number(existing.quantity) || 0,
                            Unit_UUID: resolvedUnitUuid || null,
                        };
                        console.log('UpdatePurchaseInquiryLine payload ->', payload);
                        const resp = await updatePurchaseInquiryLine(payload, { userUuid: await getUUID(), cmpUuid: await getCMPUUID(), envUuid: await getENVUUID() });
                        console.log('UpdatePurchaseInquiryLine resp ->', resp);
                        // Update local state with new values
                        setLineItems(prev => prev.map(it => it.id === editLineItemId ? {
                            ...it,
                            itemType: currentItem.itemType,
                            itemTypeUuid: currentItem.itemTypeUuid || it.itemTypeUuid,
                            itemName: currentItem.itemName,
                            itemNameUuid: currentItem.itemNameUuid || it.itemNameUuid,
                            quantity: currentItem.quantity,
                            unit: currentItem.unit,
                            unitUuid: currentItem.unitUuid || it.unitUuid
                        } : it));
                        // Also update the in-memory per-header lines map
                        try {
                            const key = currentHeaderUuid || headerUuid || '__draft';
                            setHeaderLinesMap(prevMap => {
                                const list = Array.isArray(prevMap[key]) ? prevMap[key] : lineItems;
                                const updated = list.map(it => it.id === editLineItemId ? ({
                                    ...it,
                                    itemType: currentItem.itemType,
                                    itemTypeUuid: currentItem.itemTypeUuid || it.itemTypeUuid,
                                    itemName: currentItem.itemName,
                                    itemNameUuid: currentItem.itemNameUuid || it.itemNameUuid,
                                    quantity: currentItem.quantity,
                                    unit: currentItem.unit,
                                    unitUuid: currentItem.unitUuid || it.unitUuid
                                }) : it);
                                return { ...prevMap, [key]: updated };
                            });
                        } catch (_) { }
                    } catch (e) {
                        console.log('UpdatePurchaseInquiryLine error ->', e?.message || e);
                        const backendMsg = e?.response?.data?.Message || e?.response?.data || e?.message || null;
                        try {
                            if (backendMsg) {
                                const msg = typeof backendMsg === 'string' ? backendMsg : JSON.stringify(backendMsg);
                                Alert.alert('Update failed', msg);
                            } else {
                                Alert.alert('Error', getErrorMessage(e, 'Failed to update line on server'));
                            }
                        } catch (_) {
                            Alert.alert('Error', getErrorMessage(e, 'Failed to update line on server'));
                        }
                    } finally {
                        setEditLineItemId(null);
                        setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
                        setLineAdding(false);
                    }
                })();
                return;
            }

            // Local-only update (line not yet saved on server)
            setLineItems(prev => prev.map(it => it.id === editLineItemId ? {
                ...it,
                itemType: currentItem.itemType,
                itemTypeUuid: currentItem.itemTypeUuid || it.itemTypeUuid,
                itemName: currentItem.itemName,
                itemNameUuid: currentItem.itemNameUuid || it.itemNameUuid,
                quantity: currentItem.quantity,
                unit: currentItem.unit,
                unitUuid: currentItem.unitUuid || it.unitUuid
            } : it));
            // persist to draft map so switching headers doesn't leak it
            try {
                const key = currentHeaderUuid || '__draft';
                setHeaderLinesMap(prev => {
                    const list = Array.isArray(prev[key]) ? prev[key] : lineItems;
                    const updated = list.map(it => it.id === editLineItemId ? ({
                        ...it,
                        itemType: currentItem.itemType,
                        itemTypeUuid: currentItem.itemTypeUuid || it.itemTypeUuid,
                        itemName: currentItem.itemName,
                        itemNameUuid: currentItem.itemNameUuid || it.itemNameUuid,
                        quantity: currentItem.quantity,
                        unit: currentItem.unit,
                        unitUuid: currentItem.unitUuid || it.unitUuid
                    }) : it);
                    return { ...prev, [key]: updated };
                });
            } catch (_) { }
            // reset editor
            setEditLineItemId(null);
            setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
            return;
        }

        const newItemBase = {
            id: lineItems.length ? Math.max(...lineItems.map(i => i.id)) + 1 : 1,
            itemType: currentItem.itemType,
            itemTypeUuid: currentItem.itemTypeUuid || null,
            itemName: currentItem.itemName,
            itemNameUuid: currentItem.itemNameUuid || null,
            quantity: currentItem.quantity,
            unit: currentItem.unit,
            unitUuid: currentItem.unitUuid || null,
            lineUuid: null,
        };

        // If header already saved, post the line immediately
        if (headerSaved) {
            (async () => {
                try {
                    setLineAdding(true);
                    // Determine header UUID from headerResponse (try multiple keys)
                    const headerUuid = headerResponse?.Data?.UUID || headerResponse?.UUID || headerResponse?.Data?.HeaderUUID || headerResponse?.HeaderUUID || headerResponse?.HeaderUuid || headerResponse?.Data?.HeaderUuid;
                    if (!headerUuid) {
                        Alert.alert('Error', 'Header UUID missing. Cannot add line to server.');
                        return;
                    }
                    // Resolve UUIDs from lookups if needed
                    const resolvedNewItemTypeUuid = newItemBase.itemTypeUuid || (findOptionByUuidOrName(serverItemTypes, newItemBase.itemType)?.UUID || findOptionByUuidOrName(serverItemTypes, newItemBase.itemType)?.Uuid || null);
                    const resolvedNewItemNameUuid = newItemBase.itemNameUuid || (findOptionByUuidOrName(serverItemMasters, newItemBase.itemName)?.UUID || findOptionByUuidOrName(serverItemMasters, newItemBase.itemName)?.Uuid || null);
                    const resolvedNewUnitUuid = newItemBase.unitUuid || (findOptionByUuidOrName(serverUnits, newItemBase.unit)?.UUID || findOptionByUuidOrName(serverUnits, newItemBase.unit)?.Uuid || null);

                    const payload = {
                        UUID: '',
                        HeaderUUID: headerUuid,
                        ItemType_UUID: resolvedNewItemTypeUuid || null,
                        ItemName_UUID: resolvedNewItemNameUuid || null,
                        Quantity: Number(newItemBase.quantity) || 0,
                        Unit_UUID: resolvedNewUnitUuid || null,
                    };
                    console.log('AddPurchaseInquiryLine payload ->', payload);
                    const resp = await addPurchaseInquiryLine(payload, { userUuid: await getUUID(), cmpUuid: await getCMPUUID(), envUuid: await getENVUUID() });
                    console.log('AddPurchaseInquiryLine resp ->', resp);
                    // Try to extract created line UUID from response
                    const createdLineUuid = resp?.Data?.UUID || resp?.UUID || resp?.Data?.LineUUID || resp?.LineUUID || resp?.Data?.Id || null;
                    const newItem = { ...newItemBase, unitUuid: resolvedNewUnitUuid || newItemBase.unitUuid || null, itemTypeUuid: resolvedNewItemTypeUuid || newItemBase.itemTypeUuid || null, itemNameUuid: resolvedNewItemNameUuid || newItemBase.itemNameUuid || null, lineUuid: createdLineUuid };
                    setLineItems(prev => {
                        const next = [...prev, newItem];
                        return next;
                    });
                    // update per-header map
                    try {
                        const key = currentHeaderUuid || headerUuid || '__draft';
                        setHeaderLinesMap(prev => {
                            const list = Array.isArray(prev[key]) ? prev[key] : [];
                            return { ...prev, [key]: [...list, newItem] };
                        });
                    } catch (_) { }
                    setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
                } catch (e) {
                    console.log('AddPurchaseInquiryLine error ->', e?.message || e);
                    const backendMsg = e?.response?.data?.Message || e?.response?.data || e?.message || null;
                    try {
                        if (backendMsg) {
                            const msg = typeof backendMsg === 'string' ? backendMsg : JSON.stringify(backendMsg);
                            Alert.alert('Add line failed', msg);
                        } else {
                            Alert.alert('Error', getErrorMessage(e, 'Failed to add line to server'));
                        }
                    } catch (_) {
                        Alert.alert('Error', getErrorMessage(e, 'Failed to add line to server'));
                    }
                } finally {
                    setLineAdding(false);
                }
            })();
            return;
        }

        // Local-only add (header not saved yet)
        setLineItems(prev => [...prev, newItemBase]);
        // store in draft map
        try {
            setHeaderLinesMap(prev => {
                const list = Array.isArray(prev.__draft) ? prev.__draft : [];
                return { ...prev, ['__draft']: [...list, newItemBase] };
            });
        } catch (_) { }
        setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
    };

    // Fetch customers for dropdown
    const fetchCustomers = async () => {
        try {
            const resp = await getCustomers();
            console.log('GetCustomers resp ->', resp);
            const data = resp?.Data || resp || [];
            const list = Array.isArray(data) ? data : (data?.List || []);
            setCustomers(list);
            return list;
        } catch (e) {
            console.log('Error fetching customers', e?.message || e);
            return [];
        }
    };

    const fetchItemTypes = async () => {
        try {
            setItemTypesLoading(true);
            const resp = await getItemTypes();
            console.log('GetItemTypes resp ->', resp);
            const data = resp?.Data || resp || [];
            const list = Array.isArray(data) ? data : (data?.List || []);
            setServerItemTypes(list);
            return list;
        } catch (e) {
            console.log('Error fetching item types', e?.message || e);
            return [];
        } finally {
            setItemTypesLoading(false);
        }
    };

    const fetchItemMasters = async (itemTypeUuid = null) => {
        try {
            setItemMastersLoading(true);
            const resp = await getItems({ mode: 'Purchase' });
            console.log('getItems resp ->', resp);
            const data = resp?.Data || resp || {};
            // Support multiple shapes: Data may contain Records, List, or be an array itself
            const list = Array.isArray(data) ? data : (Array.isArray(data?.Records) ? data.Records : (Array.isArray(data?.List) ? data.List : []));
            setServerItemMasters(list);
            return list;
        } catch (e) {
            console.log('Error fetching item masters', e?.message || e);
            return [];
        } finally {
            setItemMastersLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const resp = await getProjects();
            console.log('GetProjects resp ->', resp);
            const data = resp?.Data || resp || [];
            const list = Array.isArray(data) ? data : (data?.List || []);
            setProjects(list.length ? list : projectsStatic);
            return list;
        } catch (e) {
            console.log('Error fetching projects', e?.message || e);
            setProjects(projectsStatic);
            return [];
        }
    };

    // Fetch vendors for purchase quotation dropdown
    const fetchVendors = async () => {
        try {
            const resp = await getPurchasequotationVendor();
            console.log('GetPurchasequotationVendor resp ->', resp);
            const data = resp?.Data || resp || [];
            const list = Array.isArray(data) ? data : (data?.List || []);
            // If API returned empty list, fall back to static vendors
            setVendors((list && list.length) ? list : vendorsStatic);
            return list;
        } catch (e) {
            console.log('Error fetching purchase quotation vendors', e?.message || e);
            // On error, keep fallback static list
            setVendors(vendorsStatic);
            return [];
        }
    };

    const fetchCurrenciesFromServer = async () => {
        try {
            const resp = await getCurrencies();
            console.log('GetCurrencies resp ->', resp);
            const data = resp?.Data || resp || [];
            const list = Array.isArray(data) ? data : (data?.List || []);
            setCurrencyOptions(list.length ? list : []);
            return list;
        } catch (e) {
            console.log('Error fetching currencies', e?.message || e);
            setCurrencyOptions([]);
            return [];
        }
    };

    const fetchUnits = async () => {
        try {
            setUnitsLoading(true);
            const resp = await getUnits();
            console.log('GetUnits resp ->', resp);
            const data = resp?.Data || resp || [];
            const list = Array.isArray(data) ? data : (data?.List || []);
            setServerUnits(list);
            return list;
        } catch (e) {
            console.log('Error fetching units', e?.message || e);
            return [];
        } finally {
            setUnitsLoading(false);
        }
    };

    // Always load lookup lists on mount so new entries have dropdowns populated
    React.useEffect(() => {
        (async () => {
            try {
                await Promise.all([
                    fetchCustomers(),
                    fetchItemTypes(),
                    fetchItemMasters(null),
                    fetchUnits(),
                    fetchVendors(),
                    fetchCurrenciesFromServer(),
                    fetchProjects(),
                ]);
            } catch (e) {
                console.log('Initial lookup fetch error ->', e?.message || e);
            }
        })();
    }, []);

    const route = useRoute();

    React.useEffect(() => {
        // Log incoming route params for debugging navigation issues
        try {
            console.log('AddSalesInquiry route params ->', route?.params);
        } catch (e) {
            console.log('AddSalesInquiry route params log error ->', e);
        }
    }, [route?.params]);

    // Helper: extract header UUID from various possible response shapes
    const extractHeaderUuid = (hr) => {
        if (!hr) return route?.params?.headerUuid || route?.params?.HeaderUUID || null;
        // direct fields
        if (hr?.UUID) return hr.UUID;
        if (hr?.Id) return hr.Id;
        if (hr?.HeaderUUID) return hr.HeaderUUID;
        if (hr?.HeaderUuid) return hr.HeaderUuid;
        if (hr?.IdString) return hr.IdString;
        // Data wrapper
        if (hr?.Data) {
            const d = hr.Data;
            if (d.UUID) return d.UUID;
            if (d.HeaderUUID) return d.HeaderUUID;
            if (Array.isArray(d.Records) && d.Records.length && (d.Records[0].UUID || d.Records[0].Id)) {
                return d.Records[0].UUID || d.Records[0].Id;
            }
            if (Array.isArray(d.List) && d.List.length && (d.List[0].UUID || d.List[0].Id)) {
                return d.List[0].UUID || d.List[0].Id;
            }
        }
        // fallback to route params
        return route?.params?.headerUuid || route?.params?.HeaderUUID || null;
    };

    React.useEffect(() => {
        (async () => {
            const headerUuidParam = route?.params?.headerUuid || route?.params?.HeaderUUID || route?.params?.headerUUID || route?.params?.uuid || route?.params?.headerRaw?.UUID || route?.params?.headerRaw?.Id;
            // Only warn if route params were explicitly provided but header uuid is missing
            const hasRouteParams = !!route?.params && Object.keys(route.params).length > 0;
            if (!headerUuidParam) {
                if (hasRouteParams) {
                    console.warn('AddSalesInquiry prefill requested but header UUID missing in route params');
                    Alert.alert('Prefill error', 'Header identifier missing. Cannot prefill for edit.');
                }
                // nothing to prefill for a fresh add — lookups are already loaded
                return;
            }

            // fetch lookup lists first (capture returned lists for immediate lookup)
            let customersList = [];
            try {
                const results = await Promise.all([
                    fetchCustomers(),
                    fetchItemTypes(),
                    fetchItemMasters(null),
                    fetchVendors(),
                    fetchUnits(),
                    fetchCurrenciesFromServer(),
                    fetchProjects(),
                ]);
                customersList = results[0] || [];
            } catch (e) {
                console.log('Lookup fetch error ->', e?.message || e);
            }

            try {
                // fetch purchase inquiry header
                const headerResp = await getPurchaseInquiryHeader({ headerUuid: headerUuidParam });
                console.log('Prefill getPurchaseInquiryHeader ->', headerResp);
                const headerData = headerResp?.Data || headerResp || {};

                // Prefill known header fields (use multiple fallbacks)
                setProjectName(headerData.ProjectName || headerData.Project_Name || headerData.Project || '');
                setVendorName(headerData.VendorName || headerData.Vendor_Name || headerData.Vendor || '');
                setInquiryNo(headerData.InquiryNo || headerData.Inquiry_No || headerData.InquiryNumber || '');
                if (headerData.RequestTitle || headerData.Title) setRequestTitle(headerData.RequestTitle || headerData.Title || '');
                // Pick Requested Date from multiple possible header keys and convert to UI format
                const pickFirst = (keys) => {
                    for (const k of keys) {
                        if (headerData[k]) return headerData[k];
                    }
                    return null;
                };
                const reqRaw = pickFirst(['RequestDate', 'OrderDate', 'Request_Date', 'InquiryDate', 'RequestedDate', 'CreatedOn', 'CreatedAt', 'DocDate', 'DocumentDate', 'Date']);
                if (reqRaw) {
                    const ui = formatUiDate(reqRaw);
                    if (ui) setRequestedDate(ui);
                }

                // Expected Purchase Date (many possible server keys)
                const expRaw = pickFirst(['ExpectedPurchaseDate', 'ExpectedDate', 'Expected_PurchaseDate', 'RequestedDeliveryDate', 'DeliveryDate', 'ExpectedDeliveryDate', 'ExpectedPurchase_Date']);
                if (expRaw) {
                    const uiExp = formatUiDate(expRaw);
                    if (uiExp) setExpectedPurchaseDate(uiExp);
                }

                // Vendor
                const vendorUuidVal = headerData.VendorUUID || headerData.VendorId || headerData.VendorID || headerData.Vendor || null;
                if (vendorUuidVal) {
                    setVendorUuid(vendorUuidVal);
                    setVendorName(headerData.VendorName || headerData.Vendor || headerData.Vendor_DisplayName || '');
                }

                // Currency
                const currencyUuidVal = headerData.CurrencyUUID || headerData.CurrencyTypeUUID || headerData.CurrencyId || headerData.CurrencyID || null;
                if (currencyUuidVal) {
                    setCurrencyUuid(currencyUuidVal);
                    setCurrencyType(headerData.CurrencyName || headerData.Name || headerData.CurrencyCode || '');
                }

                // Project
                const projUuid = headerData.ProjectUUID || headerData.Project_Id || headerData.ProjectId || headerData.ProjectId || null;
                if (projUuid) {
                    setSelectedProjectUuid(projUuid);
                    setProjectName(headerData.ProjectName || headerData.ProjectTitle || headerData.Project || '');
                    // Also set selectedProject to maintain consistency
                    setSelectedProject({
                        UUID: projUuid,
                        ProjectTitle: headerData.ProjectName || headerData.ProjectTitle || headerData.Project || '',
                        Name: headerData.ProjectName || headerData.ProjectTitle || headerData.Project || ''
                    });
                    console.log('Prefilled project UUID:', projUuid);
                }

                // Normalize header response: backend sometimes returns Data as array
                // Ensure `headerResponse` points to the actual header object so
                // update handlers can reliably extract the header UUID.
                const headerDataNormalized = Array.isArray(headerData) && headerData.length ? headerData[0] : headerData;
                setHeaderResponse(headerDataNormalized || headerResp);
                setHeaderSaved(true);
                setHeaderEditing(true);
                // Track current header UUID and load only its lines (if any)
                const resolvedHeaderUuid = extractHeaderUuid(headerDataNormalized || headerResp);
                setCurrentHeaderUuid(resolvedHeaderUuid);
                // Attempt to fetch lines from server for this header (preferred).
                // If the header response doesn't include the UUID in expected keys, fall back to the route param.
                try {
                    const fetchUuid = resolvedHeaderUuid || headerUuidParam || null;
                    console.log('Fetching lines for header UUIDs -> resolved:', resolvedHeaderUuid, 'routeParam:', headerUuidParam, 'using:', fetchUuid);
                    if (fetchUuid) {
                        const linesResp = await getPurchaseInquiryLines({ headerUuid: fetchUuid, cmpUuid: await getCMPUUID(), envUuid: await getENVUUID(), userUuid: await getUUID() });
                        try { console.log('getPurchaseInquiryLines resp ->', linesResp); } catch (_) { }
                        const serverLines = parseLinesFromResp(linesResp);
                        if (serverLines && serverLines.length) {
                            const normalized = serverLines.map((ln, idx) => normalizeLine(ln, idx));
                            setLineItems(normalized);
                            // cache lines
                            setHeaderLinesMap(prev => ({ ...prev, [fetchUuid]: serverLines }));
                            // If there are server lines, open the Create Order section so table is visible
                            try { setHeaderSaved(true); setExpandedId(2); } catch (_) { }
                            // Debug: verify state after React updates
                            setTimeout(() => {
                                try { console.log('Post-prefill lineItems length ->', (normalized || []).length); console.log('expandedId after prefill ->', expandedId); } catch (_) { }
                            }, 50);
                        } else {
                            const cached = fetchUuid ? (headerLinesMap[fetchUuid] || []) : [];
                            setLineItems(cached);
                            // keep header open for editing when no lines
                            try { setExpandedId(1); } catch (_) { }
                        }
                    }
                } catch (linesErr) {
                    console.log('Error fetching inquiry lines ->', linesErr?.message || linesErr);
                    const cached = resolvedHeaderUuid ? (headerLinesMap[resolvedHeaderUuid] || []) : [];
                    setLineItems(cached);
                }

                // NOTE: lines for purchase inquiry may be fetched separately if endpoint exists.
                // For now, leave lineItems as-is; they will be editable once header is saved.
            } catch (e) {
                console.log('Prefill error ->', e?.message || e);
            } finally {
                // Keep route params intact so the previous screen (ViewPurchaseInquiry)
                // can receive any params it expects when we navigate back.
                // Removing the explicit `setParams({})` avoids unexpected navigation issues.
            }
        })();
    }, [route?.params]);

    // If prefill provided only a vendor UUID but not a display name, try to resolve it
    // from the loaded `vendors` lookup so validation and display show the name.
    useEffect(() => {
        try {
            if (vendorUuid && (!vendorName || String(vendorName).trim() === '') && Array.isArray(vendors) && vendors.length) {
                const found = vendors.find(v => {
                    const id = v?.UUID || v?.Uuid || v?.Id || v?.id || v;
                    return String(id) === String(vendorUuid) || String(v?.VendorUUID) === String(vendorUuid) || String(v?.VendorId) === String(vendorUuid);
                });
                if (found) {
                    const name = found?.Name || found?.VendorName || found?.DisplayName || String(found);
                    setVendorName(name || '');
                    // update Formik if it's mounted
                    if (formikSetFieldValueRef && formikSetFieldValueRef.current) {
                        try {
                            formikSetFieldValueRef.current('VendorName', name || '');
                            formikSetFieldValueRef.current('VendorUUID', vendorUuid || '');
                        } catch (_) { }
                    }
                }
            }
        } catch (e) {
            // ignore
        }
    }, [vendorUuid, vendors]);

    // Resolve vendor when only VendorName provided (match by name or uuid)
    useEffect(() => {
        try {
            if ((!vendorUuid || vendorUuid === null) && vendorName && Array.isArray(vendors) && vendors.length) {
                const found = findOptionByUuidOrName(vendors, vendorName);
                if (found) {
                    const uuid = found?.UUID || found?.Uuid || found?.Id || found?.id || null;
                    setVendorUuid(uuid);
                    // update formik
                    if (formikSetFieldValueRef && formikSetFieldValueRef.current) {
                        try { formikSetFieldValueRef.current('VendorUUID', uuid || ''); } catch (_) { }
                    }
                }
            }
        } catch (e) { }
    }, [vendorName, vendors]);

    // Ensure Formik sees currency values when we prefill from header data
    useEffect(() => {
        try {
            if (formikSetFieldValueRef && formikSetFieldValueRef.current) {
                formikSetFieldValueRef.current('CurrencyUUID', currencyUuid || '');
                formikSetFieldValueRef.current('CurrencyType', currencyType || '');
            }
        } catch (e) {
            // ignore
        }
    }, [currencyUuid, currencyType]);

    // Resolve currency selection by matching label or uuid when lookups are available
    useEffect(() => {
        try {
            if ((!currencyUuid || currencyUuid === null) && currencyType && Array.isArray(currencyOptions) && currencyOptions.length) {
                const found = findOptionByUuidOrName(currencyOptions, currencyType);
                if (found) {
                    const uuid = found?.UUID || found?.Uuid || found?.Id || found?.id || null;
                    setCurrencyUuid(uuid);
                    if (formikSetFieldValueRef && formikSetFieldValueRef.current) {
                        try { formikSetFieldValueRef.current('CurrencyUUID', uuid || ''); } catch (_) { }
                    }
                }
            }
        } catch (e) { }
    }, [currencyType, currencyOptions]);

    // Resolve selected project when only name or uuid present
    useEffect(() => {
        try {
            if ((!selectedProject || typeof selectedProject !== 'object') && (selectedProjectUuid || projectName) && Array.isArray(projects) && projects.length) {
                const needle = selectedProjectUuid || projectName;
                const found = findOptionByUuidOrName(projects, needle);
                if (found) {
                    const uuid = found?.Uuid || found?.UUID || found?.ProjectUUID || found?.Project_Id || found?.Id || found?.id || null;
                    setSelectedProject(found);
                    setSelectedProjectUuid(uuid);
                    if (formikSetFieldValueRef && formikSetFieldValueRef.current) {
                        try {
                            formikSetFieldValueRef.current('ProjectName', found?.ProjectTitle || found?.ProjectName || found?.Name || '');
                            formikSetFieldValueRef.current('ProjectUUID', uuid || '');
                        } catch (_) { }
                    }
                }
            }
        } catch (e) { }
    }, [selectedProjectUuid, projectName, projects]);

    const handleEditItem = (id) => {
        const item = lineItems.find(i => i.id === id);
        if (item) {
            setCurrentItem({
                itemType: item.itemType || item.raw?.ItemType || '',
                itemTypeUuid: item.itemTypeUuid || item.ItemType_UUID || item.raw?.ItemType_UUID || item.raw?.ItemTypeId || null,
                itemName: item.itemName || item.raw?.ItemName || '',
                itemNameUuid: item.itemNameUuid || item.ItemName_UUID || item.raw?.ItemUUID || item.raw?.ItemId || null,
                quantity: item.quantity,
                unit: item.unit || item.raw?.Unit || '',
                unitUuid: item.unitUuid || item.raw?.Unit_UUID || item.raw?.UnitId || null,
                rate: item.raw?.Rate || item.rate || ''
            });
            setEditLineItemId(id);
            // Expand LINE section so editor is visible (optional)
            setExpandedId(2);
        }
    };

    const cancelEdit = () => {
        setEditLineItemId(null);
        setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', quantity: '', unit: '' });
    };

    const handleDeleteItem = (id) => {
        const toDelete = lineItems.find(item => item.id === id);
        // If this line exists on server (has lineUuid) and header is saved, call delete API
        if (toDelete?.lineUuid && headerSaved) {
            (async () => {
                try {
                    setLineAdding(true);
                    const headerUuid = headerResponse?.Data?.UUID || headerResponse?.UUID || headerResponse?.Data?.HeaderUUID || headerResponse?.HeaderUUID || headerResponse?.HeaderUuid || headerResponse?.Data?.HeaderUuid;
                    console.log('Deleting purchase inquiry line ->', { uuid: toDelete.lineUuid, headerUuid });
                    const resp = await deletePurchaseInquiryLine({ lineUuid: toDelete.lineUuid, overrides: { userUuid: await getUUID(), cmpUuid: await getCMPUUID(), envUuid: await getENVUUID() } });
                    console.log('DeletePurchaseInquiryLine resp ->', resp);
                    // remove locally after successful delete
                    setLineItems(prev => {
                        const next = prev.filter(it => it.id !== id);
                        return next;
                    });
                    // update per-header map
                    try {
                        const key = currentHeaderUuid || headerUuid || '__draft';
                        setHeaderLinesMap(prev => {
                            const list = Array.isArray(prev[key]) ? prev[key] : [];
                            return { ...prev, [key]: list.filter(it => it.id !== id) };
                        });
                    } catch (_) { }
                } catch (e) {
                    console.log('DeletePurchaseInquiryLine error ->', e?.message || e);
                    const backendMsg = e?.response?.data?.Message || e?.response?.data || e?.message || null;
                    try {
                        if (backendMsg) {
                            const msg = typeof backendMsg === 'string' ? backendMsg : JSON.stringify(backendMsg);
                            Alert.alert('Delete failed', msg);
                        } else {
                            Alert.alert('Error', getErrorMessage(e, 'Failed to delete line on server'));
                        }
                    } catch (_) {
                        Alert.alert('Error', getErrorMessage(e, 'Failed to delete line on server'));
                    }
                } finally {
                    setLineAdding(false);
                }
            })();
            return;
        }

        // Local-only remove if not persisted
        setLineItems(prev => prev.filter(item => item.id !== id));
        try {
            const key = currentHeaderUuid || '__draft';
            setHeaderLinesMap(prev => {
                const list = Array.isArray(prev[key]) ? prev[key] : [];
                return { ...prev, [key]: list.filter(it => it.id !== id) };
            });
        } catch (_) { }
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const userUuid = await getUUID();
            if (!userUuid) {
                Alert.alert('Authentication', 'User not logged in');
                setLoading(false);
                return;
            }

            if (!customerUuid) {
                Alert.alert('Validation', 'Please select a customer');
                setLoading(false);
                return;
            }

            const payload = {
                projectName,
                customerUUID: customerUuid,
                requestedDate: uiDateToApiDate(requestedDate),
                expectedPurchaseDate: uiDateToApiDate(expectedPurchaseDate),
                lineItems: lineItems.map((item, index) => ({
                    srNo: index + 1,
                    ItemType_UUID: item.itemTypeUuid || item.ItemType_UUID || null,
                    ItemName_UUID: item.itemNameUuid || item.ItemName_UUID || null,
                    quantity: item.quantity,
                    Unit_UUID: item.unitUuid || item.Unit_UUID || null,
                }))
            };

            console.log('Final Payload:', payload);

            const resp = await addSalesInquiry(payload);
            console.log('Final SALES INQUIRY resp:', resp);
            // Use sensible response message fallbacks
            const message = resp?.Message || resp?.message || resp?.Data?.Message || 'Sales inquiry submitted successfully';
            setSuccessMessage(String(message));
            setSuccessSheetVisible(true);
        } catch (e) {
            console.log('Error Message:', e && e.message ? e.message : e);
            Alert.alert('Error', e && e.message ? e.message : 'Failed to submit sales inquiry');
        } finally {
            setLoading(false);
        }
    };

    // Submit header to AddSalesHeader API (legacy sales helper kept for backwards compatibility)
    const handleSubmitHeader = async () => {
        try {
            setHeaderSubmitting(true);
            // Basic validation
            if (!customerUuid) {
                Alert.alert('Validation', 'Please select a customer');
                setHeaderSubmitting(false);
                return;
            }
            const payload = {
                UUID: '',
                CustomerUUID: customerUuid,
                Vendor_UUID: vendorUuid || '',
                VendorUUID: vendorUuid || '',
                Project_UUID: selectedProjectUuid || '',
                ProjectUUID: selectedProjectUuid || '',
                Currency_UUID: currencyUuid || '',
                CurrencyUUID: currencyUuid || '',
                OrderDate: uiDateToApiDate(requestedDate) || null,
                RequestedDeliveryDate: uiDateToApiDate(expectedPurchaseDate) || null,
                InquiryNo: inquiryNo || ''
            };
            console.log('AddSalesHeader payload ->', payload);
            // call API helper
            const resp = await addSalesHeader(payload, { userUuid: await getUUID(), cmpUuid: await getCMPUUID(), envUuid: await getENVUUID() });
            console.log('AddSalesHeader resp ->', resp);
            setHeaderResponse(resp);
            setHeaderSaved(true);
            setHeaderEditing(false);
            // collapse header section
            setExpandedId(null);
        } catch (e) {
            console.log('AddSalesHeader error ->', e?.message || e);
            Alert.alert('Error', getErrorMessage(e, 'Failed to save header'));
        } finally {
            setHeaderSubmitting(false);
        }
    };

    // New: validate visible header fields and call purchase-inquiry POST helper
    const handleApplyHeader = async () => {
        try {
            setHeaderSubmitting(true);
            // Backend requires RequestTitle and CurrencyTypeUUID. Validate them and map currency to CurrencyTypeUUID.
            if (!requestTitle || !requestTitle.trim()) {
                Alert.alert('Validation', 'Request Title is required');
                setHeaderSubmitting(false);
                return;
            }
            // Accept either a resolved UUID or a currency label/value from the Dropdown
            if (!currencyUuid && !(currencyType && String(currencyType).trim() !== '')) {
                Alert.alert('Validation', 'Please select a currency');
                setHeaderSubmitting(false);
                return;
            }

            // Attempt to resolve a UUID from available currency options when only label is present
            let resolvedCurrencyUuid = currencyUuid || '';
            if (!resolvedCurrencyUuid && currencyType) {
                try {
                    const found = (currencyOptions || []).find(c => {
                        const label = (typeof c === 'string') ? String(c) : (c?.Name || c?.CurrencyName || c?.Code || c?.DisplayName || c?.Currency || '');
                        const id = (typeof c === 'string') ? '' : (c?.UUID || c?.Uuid || c?.Id || c?.CurrencyUUID || '');
                        return String(label).trim() === String(currencyType).trim() || String(id) === String(currencyType).trim();
                    });
                    if (found) resolvedCurrencyUuid = found?.UUID || found?.Uuid || found?.Id || found?.CurrencyUUID || '';
                } catch (e) { /* ignore */ }
            }

            const payload = {
                UUID: '',
                VendorUUID: vendorUuid,
                VendorName: vendorName || undefined,
                // include both keys for compatibility; prefer resolved UUID when available
                CurrencyUUID: resolvedCurrencyUuid || currencyUuid || '',
                CurrencyTypeUUID: resolvedCurrencyUuid || currencyUuid || currencyType || '',
                RequestTitle: requestTitle,
                // Send multiple date key variants to match backend expectations
                RequestDate: uiDateToApiDate(requestedDate) || null,
                RequestedDate: uiDateToApiDate(requestedDate) || null,
                OrderDate: uiDateToApiDate(requestedDate) || null,
                Request_Date: uiDateToApiDate(requestedDate) || null,
                RequestedDeliveryDate: uiDateToApiDate(expectedPurchaseDate) || null,
                ExpectedPurchaseDate: uiDateToApiDate(expectedPurchaseDate) || null,
                ProjectUUID: selectedProjectUuid || ''
            };

            console.log('selectedProjectUuid value:', selectedProjectUuid);
            console.log('AddPurchaseInquiryHeader payload ->', payload);

            const resp = await addPurchaseInquiryHeader(payload, { userUuid: await getUUID(), cmpUuid: await getCMPUUID(), envUuid: await getENVUUID() });
            console.log('AddPurchaseInquiryHeader resp ->', resp);
            setHeaderResponse(resp);
            setHeaderSaved(true);
            setHeaderEditing(false);
            // Open LINE section after successful header submission
            setExpandedId(2);
            // Fetch server lines for the newly created header (if backend returned header UUID)
            try {
                const createdHeaderUuid = extractHeaderUuid(resp);
                if (createdHeaderUuid) {
                    setCurrentHeaderUuid(createdHeaderUuid);
                    const linesResp = await getPurchaseInquiryLines({ headerUuid: createdHeaderUuid, cmpUuid: await getCMPUUID(), envUuid: await getENVUUID(), userUuid: await getUUID() });
                    const serverLines = parseLinesFromResp(linesResp);
                    if (serverLines && serverLines.length) {
                        const normalized = serverLines.map((ln, idx) => normalizeLine(ln, idx));
                        setLineItems(normalized);
                        setHeaderLinesMap(prev => ({ ...prev, [createdHeaderUuid]: serverLines }));
                        setTimeout(() => { try { console.log('Post-create lineItems length ->', (normalized || []).length); setExpandedId(2); } catch (_) { } }, 50);
                    }
                }
            } catch (e) {
                console.log('Fetch lines after create error ->', e?.message || e);
            }
            // success notification removed (non-blocking flow requested)
        } catch (e) {
            console.log('AddPurchaseInquiryHeader error ->', e?.message || e);
            // Try to show backend error message if available
            const backendMsg = e?.response?.data?.Message || e?.response?.data?.message || e?.response?.data || null;
            try {
                if (backendMsg) {
                    const msg = typeof backendMsg === 'string' ? backendMsg : JSON.stringify(backendMsg);
                    Alert.alert('Save failed', msg);
                } else {
                    Alert.alert('Error', getErrorMessage(e, 'Failed to save header'));
                }
            } catch (alertErr) {
                console.log('Alert show error ->', alertErr);
            }
        } finally {
            setHeaderSubmitting(false);
        }
    };

    const handleUpdateHeader = async (isFromFinalSubmit = false) => {
        try {
            setHeaderSubmitting(true);
            // For purchase inquiry updates ensure minimal required fields are present
            if (!requestTitle || !requestTitle.trim()) {
                Alert.alert('Validation', 'Request Title is required');
                setHeaderSubmitting(false);
                return;
            }
            if (!currencyUuid) {
                Alert.alert('Validation', 'Please select a currency');
                setHeaderSubmitting(false);
                return;
            }

            // get header UUID from previous response (use helper to cover shapes)
            const headerUuid = extractHeaderUuid(headerResponse);
            if (!headerUuid) {
                Alert.alert('Error', 'Header UUID missing. Cannot update header.');
                setHeaderSubmitting(false);
                return;
            }

            const payload = {
                UUID: headerUuid,
                VendorUUID: vendorUuid || '',
                VendorName: vendorName || undefined,
                // include both keys for compatibility
                CurrencyUUID: currencyUuid || '',
                CurrencyTypeUUID: currencyUuid || '',
                RequestTitle: requestTitle || '',
                // Send multiple date key variants to match backend expectations
                RequestDate: uiDateToApiDate(requestedDate) || null,
                RequestedDate: uiDateToApiDate(requestedDate) || null,
                OrderDate: uiDateToApiDate(requestedDate) || null,
                Request_Date: uiDateToApiDate(requestedDate) || null,
                RequestedDeliveryDate: uiDateToApiDate(expectedPurchaseDate) || null,
                ExpectedPurchaseDate: uiDateToApiDate(expectedPurchaseDate) || null,
                ProjectUUID: selectedProjectUuid || '',
                InquiryNo: inquiryNo || ''
            };
            console.log('selectedProjectUuid value:', selectedProjectUuid);
            console.log('UpdatePurchaseInquiryHeader payload ->', payload);
            // Quick on-screen debug so you can confirm the payload and UUID before the API call
            // try { Alert.alert('Updating header', `UUID: ${headerUuid}\nProjectUUID: ${selectedProjectUuid || 'null'}\nRequestDate: ${payload.RequestDate || ''}`); } catch (_) { }

            const resp = await updatePurchaseInquiryHeader(payload, { userUuid: await getUUID(), cmpUuid: await getCMPUUID(), envUuid: await getENVUUID() });
            console.log('UpdatePurchaseInquiryHeader resp ->', resp);
            try {
                const message = resp?.Message || resp?.message || resp?.Data?.Message || 'Updated';
                Alert.alert('Update response', String(message));
            } catch (_) { }
            setHeaderResponse(resp);
            setHeaderSaved(true);
            setHeaderEditing(false);

            if (isFromFinalSubmit) {
                // Navigate back when called from final submit
                try {
                    navigation.navigate('ViewPurchaseInquiry');
                } catch (e) {
                    navigation.goBack();
                }
            } else {
                // Open LINE section after regular header update
                setExpandedId(2);
            }
            // Refresh lines from server for this header
            try {
                const updatedHeaderUuid = extractHeaderUuid(resp);
                if (updatedHeaderUuid) {
                    setCurrentHeaderUuid(updatedHeaderUuid);
                    const linesResp = await getPurchaseInquiryLines({ headerUuid: updatedHeaderUuid, cmpUuid: await getCMPUUID(), envUuid: await getENVUUID(), userUuid: await getUUID() });
                    const serverLines = parseLinesFromResp(linesResp);
                    if (serverLines && serverLines.length) {
                        const normalized = serverLines.map((ln, idx) => normalizeLine(ln, idx));
                        setLineItems(normalized);
                        setHeaderLinesMap(prev => ({ ...prev, [updatedHeaderUuid]: serverLines }));
                        setTimeout(() => { try { console.log('Post-update lineItems length ->', (normalized || []).length); setExpandedId(2); } catch (_) { } }, 50);
                    }
                }
            } catch (e) {
                console.log('Fetch lines after update error ->', e?.message || e);
            }
        } catch (e) {
            console.log('UpdatePurchaseInquiryHeader error ->', e?.message || e);
            Alert.alert('Error', getErrorMessage(e, 'Failed to update header'));
        } finally {
            setHeaderSubmitting(false);
        }
    };

    const handleCancel = () => {
        // Reset local state then navigate back so next open is a fresh screen
        try { resetAllState(); } catch (_) { }
        navigation.goBack();
    };

    return (
        <>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <AppHeader
                    title="Add Purchase Inquiry"
                    onLeftPress={() => {
                        navigation.goBack();
                    }}
                />


                <View style={styles.headerSeparator} />
                <ScrollView contentContainerStyle={[styles.container]} showsVerticalScrollIndicator={false}>
                    {/* Section 1: HEADER */}
                    <Formik
                        initialValues={{
                            VendorName: vendorName || '',
                            VendorUUID: vendorUuid || '',
                            CurrencyType: currencyType || '',
                            CurrencyUUID: currencyUuid || '',
                            RequestTitle: requestTitle || '',
                            RequestedDate: requestedDate || '',
                            ProjectName: projectName || '',
                            ProjectUUID: selectedProjectUuid || '',
                            ExpectedPurchaseDate: expectedPurchaseDate || '',
                        }}
                        enableReinitialize
                        validationSchema={HeaderValidationSchema}
                        onSubmit={async (values) => {
                            // Keep local state in sync with Formik values
                            setVendorName(values.VendorName || '');
                            setVendorUuid(values.VendorUUID || null);
                            setCurrencyType(values.CurrencyType || '');
                            setCurrencyUuid(values.CurrencyUUID || null);
                            setRequestTitle(values.RequestTitle || '');
                            setRequestedDate(values.RequestedDate || '');
                            setProjectName(values.ProjectName || '');
                            setSelectedProjectUuid(values.ProjectUUID || null);
                            setExpectedPurchaseDate(values.ExpectedPurchaseDate || '');

                            // Call the appropriate submit handler
                            try {
                                if (headerEditing) {
                                    await handleUpdateHeader(false);
                                } else {
                                    await handleApplyHeader();
                                }
                            } catch (e) {
                                // Error already handled in handlers
                            }
                        }}
                    >
                        {({ values, handleChange, handleBlur, setFieldValue, errors, touched, submitForm, submitCount }) => {
                            // Store setFieldValue in ref so date handlers can use it
                            formikSetFieldValueRef.current = setFieldValue;
                            return (
                                <AccordionSection
                                    id={1}
                                    title="HEADER"
                                    expanded={expandedId === 1}
                                    onToggle={handleHeaderToggle}
                                    rightActions={
                                        headerSaved ? (
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(2) }}>
                                                <Icon name="check-circle" size={rf(5)} color={COLORS.success || '#28a755'} />
                                                <TouchableOpacity onPress={() => { setHeaderEditing(true); setExpandedId(1); }}>
                                                    <Icon name="edit" size={rf(5)} color={COLORS.primary} />
                                                </TouchableOpacity>
                                            </View>
                                        ) : null
                                    }
                                >
                                    {/* Reordered rows per request:
                            1) Vendor Name | Currency Type
                            2) Request Title | Requested Date
                            3) Project Name | Expected Purchase Date
                        */}

                                    {/* Show Inquiry No only when editing an existing header (have a header UUID).
                            This prevents an empty placeholder space when creating a new record. */}
                                    {(currentHeaderUuid || route?.params?.headerUuid) && (
                                        <View style={[styles.row, { marginBottom: hp(1) }]}>
                                            <View style={styles.col}>
                                                <Text style={inputStyles.label}>Inquiry No</Text>
                                                <TouchableOpacity
                                                    activeOpacity={0.8}
                                                    onPress={() => { /* no-op for now, read-only display */ }}
                                                >
                                                    <View style={[inputStyles.box, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: wp(3) }]}>
                                                        <Text style={[inputStyles.input, { flex: 1, color: COLORS.text }]} numberOfLines={1} ellipsizeMode="tail">
                                                            {inquiryNo || '—'}
                                                        </Text>
                                                        <Icon name="keyboard-arrow-down" size={rf(4)} color={COLORS.textLight} />
                                                    </View>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.row}>
                                        <View style={styles.col}>
                                            <Text style={inputStyles.label}>Vendor Name*</Text>
                                            <View style={{ zIndex: 9998, elevation: 20 }}>
                                                <Dropdown
                                                    placeholder="Select Vendor"
                                                    value={values.VendorName || values.VendorUUID || ''}
                                                    options={vendors}
                                                    getLabel={(v) => (typeof v === 'string' ? v : v?.Name || v?.DisplayName || '')}
                                                    getKey={(v) => (typeof v === 'string' ? v : v?.UUID || v?.Id || v?.id || v?.Name)}
                                                    onSelect={(v) => {
                                                        if (v && typeof v === 'object') {
                                                            const name = v?.Name || v?.DisplayName || v?.name || '';
                                                            const uuid = v?.Uuid || v?.UUID || v?.Id || v?.id || null;
                                                            setFieldValue('VendorName', name);
                                                            setFieldValue('VendorUUID', uuid || '');
                                                            setVendorName(name);
                                                            setVendorUuid(uuid);
                                                        } else if (typeof v === 'string') {
                                                            // ignore placeholder-like selections
                                                            if (isPlaceholderString(v)) {
                                                                setFieldValue('VendorName', '');
                                                                setFieldValue('VendorUUID', '');
                                                                setVendorName('');
                                                                setVendorUuid(null);
                                                                return;
                                                            }
                                                            setFieldValue('VendorName', v);
                                                            setFieldValue('VendorUUID', '');
                                                            setVendorName(v);
                                                            setVendorUuid(null);
                                                        } else {
                                                            setFieldValue('VendorName', '');
                                                            setFieldValue('VendorUUID', '');
                                                            setVendorName('');
                                                            setVendorUuid(null);
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
                                        <View style={styles.col}>
                                            <Text style={inputStyles.label}>Currency Type*</Text>
                                            <View style={{ zIndex: 9999, elevation: 20 }}>
                                                <Dropdown
                                                    placeholder="Select Currency"
                                                    value={values.CurrencyUUID || values.CurrencyType || ''}
                                                    options={currencyOptions || []}
                                                    getLabel={(c) => (typeof c === 'string' ? c : c?.Name || c?.CurrencyName || c?.Code || c?.DisplayName || c?.name || '')}
                                                    getKey={(c) => (typeof c === 'string' ? c : c?.UUID || c?.Id || c?.id || c?.Code || c?.Name)}
                                                    onSelect={(v) => {
                                                        if (v && typeof v === 'object') {
                                                            const currencyName = v?.Name || v?.CurrencyName || v?.Code || v?.DisplayName || v?.name || '';
                                                            const currencyUuid = v?.Uuid || v?.Id || v?.id || null;
                                                            setFieldValue('CurrencyType', currencyName);
                                                            setFieldValue('CurrencyUUID', currencyUuid || '');
                                                            setCurrencyType(currencyName);
                                                            setCurrencyUuid(currencyUuid);
                                                        } else {
                                                            setFieldValue('CurrencyType', v || '');
                                                            setFieldValue('CurrencyUUID', '');
                                                            setCurrencyType(v);
                                                            setCurrencyUuid(null);
                                                        }
                                                    }}
                                                    renderInModal={true}
                                                    inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                                                // textStyle={inputStyles.input}
                                                />
                                            </View>
                                            {errors.CurrencyType && (touched.CurrencyType || submitCount > 0) ? (
                                                <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.CurrencyType}</Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    <View style={[styles.row, { marginTop: hp(1.5) }]}>
                                        <View style={styles.col}>
                                            <Text style={inputStyles.label}>Request Title*</Text>
                                            <View style={[inputStyles.box]}>
                                                <TextInput
                                                    style={[inputStyles.input, { color: COLORS.text }]}
                                                    value={values.RequestTitle}
                                                    onChangeText={(v) => {
                                                        setFieldValue('RequestTitle', v);
                                                        setRequestTitle(v);
                                                    }}
                                                    onBlur={handleBlur('RequestTitle')}
                                                    placeholder="Request Title"
                                                    placeholderTextColor={COLORS.textLight}
                                                />
                                            </View>
                                            {errors.RequestTitle && (touched.RequestTitle || submitCount > 0) ? (
                                                <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.RequestTitle}</Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.col}>
                                            <Text style={inputStyles.label}>Requested Date*</Text>
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                onPress={() => openDatePickerFor('requested')}
                                                style={{ marginTop: hp(0.8) }}
                                            >
                                                <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                                    <Text style={[
                                                        inputStyles.input,
                                                        styles.datePickerText,
                                                        !values.RequestedDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                                        values.RequestedDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                                    ]}>
                                                        {values.RequestedDate || 'dd/mm/yyyy'}
                                                    </Text>
                                                    <View style={[
                                                        styles.calendarIconContainer,
                                                        values.RequestedDate && styles.calendarIconContainerSelected
                                                    ]}>
                                                        <Icon
                                                            name="calendar-today"
                                                            size={rf(3.2)}
                                                            color={values.RequestedDate ? COLORS.primary : COLORS.textLight}
                                                        />
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                            {errors.RequestedDate && (touched.RequestedDate || submitCount > 0) ? (
                                                <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.RequestedDate}</Text>
                                            ) : null}
                                        </View>
                                    </View>

                                    <View style={[styles.row, { marginTop: hp(1.5) }]}>
                                        <View style={styles.col}>
                                            <Text style={inputStyles.label}>Project Name*</Text>
                                            <View style={{ zIndex: 9999, elevation: 20 }}>
                                                <Dropdown
                                                    placeholder="Select Project"
                                                    value={values.ProjectName || values.ProjectUUID || ''}
                                                    options={projects || []}
                                                    getLabel={(p) => {
                                                        if (typeof p === 'string') return p;
                                                        return p?.ProjectTitle || p?.Project_Name || p?.Name || p?.ProjectName || p?.Title || p?.DisplayName || p?.projectTitle || p?.name || '';
                                                    }}
                                                    getKey={(p) => {
                                                        if (typeof p === 'string') return p;
                                                        return p?.Uuid || p?.UUID || p?.ProjectUUID || p?.Project_Id || p?.Id || p?.id || p?.uuid || '';
                                                    }}
                                                    onSelect={(v) => {
                                                        try { console.log('Project dropdown selected ->', v); } catch (e) { }
                                                        if (v && typeof v === 'object') {
                                                            const name = v?.ProjectTitle || v?.Name || v?.ProjectName || v?.Title || v?.DisplayName || v?.name || JSON.stringify(v);
                                                            const uuid = v?.Uuid || v?.UUID || v?.ProjectUUID || v?.Project_Id || v?.Id || v?.id || null;
                                                            console.log('Extracted UUID from object:', uuid, 'Name:', name);
                                                            setFieldValue('ProjectName', name);
                                                            setFieldValue('ProjectUUID', uuid || '');
                                                            setSelectedProject(v);
                                                            setSelectedProjectUuid(uuid);
                                                            setProjectName(name);
                                                        } else if (typeof v === 'string') {
                                                            // ignore placeholder-like selections
                                                            if (isPlaceholderString(v)) {
                                                                setFieldValue('ProjectName', '');
                                                                setFieldValue('ProjectUUID', '');
                                                                setSelectedProject(null);
                                                                setSelectedProjectUuid(null);
                                                                setProjectName('');
                                                                return;
                                                            }

                                                            // Check if string contains JSON with UUID
                                                            try {
                                                                const parsed = JSON.parse(v);
                                                                if (parsed && typeof parsed === 'object') {
                                                                    const extractedUuid = parsed?.Uuid || parsed?.UUID || parsed?.ProjectUUID || parsed?.Id || null;
                                                                    const extractedName = parsed?.ProjectTitle || parsed?.Name || parsed?.ProjectName || v;
                                                                    console.log('Extracted UUID from JSON:', extractedUuid, 'Name:', extractedName);
                                                                    setFieldValue('ProjectName', extractedName);
                                                                    setFieldValue('ProjectUUID', extractedUuid || '');
                                                                    setSelectedProject(parsed);
                                                                    setSelectedProjectUuid(extractedUuid);
                                                                    setProjectName(extractedName);
                                                                    return;
                                                                }
                                                            } catch (jsonError) {
                                                                // Not JSON, treat as regular string
                                                            }

                                                            // selected a primitive from static list
                                                            setFieldValue('ProjectName', v);
                                                            setFieldValue('ProjectUUID', v);
                                                            setSelectedProject(v);
                                                            setSelectedProjectUuid(v);
                                                            setProjectName(v);
                                                        } else {
                                                            setFieldValue('ProjectName', '');
                                                            setFieldValue('ProjectUUID', '');
                                                            setSelectedProject(null);
                                                            setSelectedProjectUuid(null);
                                                            setProjectName('');
                                                        }
                                                    }}
                                                    renderInModal={true}
                                                    inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                                                // textStyle={inputStyles.input}
                                                />
                                            </View>
                                            {errors.ProjectName && (touched.ProjectName || submitCount > 0) ? (
                                                <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.ProjectName}</Text>
                                            ) : null}
                                        </View>
                                        <View style={styles.col}>
                                            <Text style={inputStyles.label}>Expected Purchase Date*</Text>
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                onPress={() => openDatePickerFor('expected')}
                                                style={{ marginTop: hp(0.8) }}
                                            >
                                                <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                                    <Text style={[
                                                        inputStyles.input,
                                                        styles.datePickerText,
                                                        !values.ExpectedPurchaseDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                                        values.ExpectedPurchaseDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                                    ]}>
                                                        {values.ExpectedPurchaseDate || 'dd/mm/yyyy'}
                                                    </Text>
                                                    <View style={[
                                                        styles.calendarIconContainer,
                                                        values.ExpectedPurchaseDate && styles.calendarIconContainerSelected
                                                    ]}>
                                                        <Icon
                                                            name="calendar-today"
                                                            size={rf(3.2)}
                                                            color={values.ExpectedPurchaseDate ? COLORS.primary : COLORS.textLight}
                                                        />
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                            {errors.ExpectedPurchaseDate && (touched.ExpectedPurchaseDate || submitCount > 0) ? (
                                                <Text style={{ color: '#ef4444', marginTop: hp(0.4), fontSize: rf(2.6) }}>{errors.ExpectedPurchaseDate}</Text>
                                            ) : null}
                                        </View>
                                    </View>
                                    <View style={{ marginTop: hp(2), flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            style={[styles.submitButton, headerSubmitting && styles.submitButtonDisabled]}
                                            onPress={submitForm}
                                            disabled={headerSubmitting}
                                        >
                                            <Text style={styles.submitButtonText}>{headerSubmitting ? (headerEditing ? 'Updating...' : 'Saving...') : (headerEditing ? 'Update' : 'Save')}</Text>
                                        </TouchableOpacity>

                                    </View>
                                </AccordionSection>
                            );
                        }}
                    </Formik>

                    {/* Section 2: LINE */}
                    {(headerSaved || (Array.isArray(lineItems) && lineItems.length > 0)) && (
                        <AccordionSection id={2} title="Create Order" expanded={(expandedId === 2) || (Array.isArray(lineItems) && lineItems.length > 0)} onToggle={toggleSection}>
                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <Text style={inputStyles.label}>Item Type*</Text>
                                    <View style={{ zIndex: 9998, elevation: 20 }}>
                                        <Dropdown
                                            placeholder="- Select Item -"
                                            value={currentItem.itemTypeUuid || currentItem.itemType}
                                            options={serverItemTypes || []}
                                            getLabel={(it) => it?.Name || it?.DisplayName || it?.name || it}
                                            getKey={(it) => it?.UUID || it?.Id || it}
                                            onSelect={(v) => {
                                                if (v && typeof v === 'object') {
                                                    const selectedUuid = v?.UUID || v?.Id || v?.id || null;
                                                    setCurrentItem({ ...currentItem, itemType: v?.Name || v?.DisplayName || v?.name || '', itemTypeUuid: selectedUuid });
                                                    // Fetch item masters for this item type
                                                    fetchItemMasters(selectedUuid);
                                                } else {
                                                    setCurrentItem({ ...currentItem, itemType: v, itemTypeUuid: null });
                                                    fetchItemMasters(null);
                                                }
                                            }}
                                            renderInModal={true}
                                            inputBoxStyle={[inputStyles.box, { minHeight: hp(4.6), paddingVertical: 0, marginTop: hp(0.5) }]}
                                        // textStyle={[inputStyles.input, { fontSize: rf(3.4) }]}
                                        />
                                    </View>
                                </View>
                                <View style={styles.col}>
                                    <Text style={inputStyles.label}>Item Name*</Text>
                                    <View style={{ zIndex: 9997, elevation: 20 }}>
                                        <Dropdown
                                            placeholder="- Select Item -"
                                            value={currentItem.itemNameUuid || currentItem.itemName}
                                            options={serverItemMasters || []}
                                            getLabel={(it) => it?.Name || it?.DisplayName || it?.name || it}
                                            getKey={(it) => it?.UUID || it?.Id || it}
                                            onSelect={(v) => {
                                                if (v && typeof v === 'object') {
                                                    setCurrentItem({ ...currentItem, itemName: v?.Name || v?.DisplayName || v?.name || '', itemNameUuid: v?.UUID || v?.Id || v?.id || null });
                                                } else {
                                                    setCurrentItem({ ...currentItem, itemName: v, itemNameUuid: null });
                                                }
                                            }}
                                            renderInModal={true}
                                            inputBoxStyle={[inputStyles.box, { minHeight: hp(4.6), paddingVertical: 0, marginTop: hp(0.5) }]}
                                        // textStyle={[inputStyles.input, { fontSize: rf(3.4) }]}
                                        />
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.row, { marginTop: hp(1.5), alignItems: 'flex-end' }]}>
                                <View style={styles.colSmall}>
                                    <Text style={inputStyles.label}>Quantity*</Text>
                                    <View style={[inputStyles.box, { marginTop: hp(0.5) }]}>
                                        <TextInput
                                            style={[inputStyles.input, { flex: 1, fontSize: rf(3.4), color: COLORS.text }]}
                                            value={currentItem.quantity}
                                            onChangeText={(v) => setCurrentItem({ ...currentItem, quantity: v })}
                                            placeholder="eg. Auto fill"
                                            placeholderTextColor={COLORS.textLight}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                                <View style={styles.colSmall}>
                                    <Text style={inputStyles.label}>Unit*</Text>
                                    <View style={{ zIndex: 9996, elevation: 20 }}>
                                        <Dropdown
                                            placeholder="- Select Unit -"
                                            value={currentItem.unitUuid || currentItem.unit}
                                            options={serverUnits || []}
                                            getLabel={(u) => u?.Name || u?.DisplayName || u?.name || u}
                                            getKey={(u) => u?.UUID || u?.Id || u}
                                            onSelect={(v) => {
                                                if (v && typeof v === 'object') {
                                                    setCurrentItem({ ...currentItem, unit: v?.Name || v?.DisplayName || v?.name || '', unitUuid: v?.UUID || v?.Id || v?.id || null });
                                                } else {
                                                    setCurrentItem({ ...currentItem, unit: v, unitUuid: null });
                                                }
                                            }}
                                            renderInModal={true}
                                            inputBoxStyle={[inputStyles.box, { marginTop: hp(0.5) }]}
                                        // textStyle={inputStyles.input}
                                        />
                                    </View>
                                </View>

                            </View>
                            <View style={styles.addButtonWrapper}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[
                                        styles.addButton,
                                        (lineAdding || !(currentItem.itemName || currentItem.itemNameUuid)) ? { opacity: 1 } : null,
                                    ]}
                                    onPress={handleAddItem}
                                    disabled={lineAdding || !(currentItem.itemName || currentItem.itemNameUuid)}
                                >
                                    <Text style={styles.addButtonText}>{editLineItemId ? (lineAdding ? 'Updating...' : 'Update') : (lineAdding ? 'Adding...' : 'Add')}</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Line Items Table */}
                            {lineItems.length > 0 && (
                                <View style={styles.tableContainer}>
                                    {/* Top controls: show page size and search */}
                                    <View style={styles.tableControlsRow}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={[{ color: '#000000', marginRight: wp(2) }]}>Show</Text>
                                            <Dropdown
                                                placeholder={String(pageSize)}
                                                value={String(pageSize)}
                                                options={pageSizes}
                                                onSelect={v => { setPageSize(Number(v)); setPage(1); }}
                                                renderInModal={true}
                                                inputBoxStyle={[inputStyles.box, { width: wp(20), paddingVertical: hp(0.6) }]}
                                            />
                                        </View>

                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            <Text style={[{ color: '#000000', marginRight: wp(1) }]}>entries</Text>
                                            <TextInput
                                                placeholder="Search..."
                                                placeholderTextColor={COLORS.textLight}
                                                value={searchQuery}
                                                onChangeText={t => { setSearchQuery(t); setPage(1); }}
                                                style={[inputStyles.box, { color: '#000000', width: wp(40), paddingHorizontal: wp(2) }]}
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
                                                {/* Table Header */}
                                                <View style={styles.thead}>
                                                    <View style={styles.tr}>
                                                        <Text style={[styles.th, { width: wp(15) }]}>Sr.No</Text>
                                                        <Text style={[styles.th, { width: wp(50) }]}>Item</Text>
                                                        <Text style={[styles.th, { width: wp(20) }]}>Quantity</Text>
                                                        <Text style={[styles.th, { width: wp(25) }]}>Action</Text>
                                                    </View>
                                                </View>



                                                {/* Table Body */}
                                                <View style={styles.tbody}>
                                                    {(() => {
                                                        const q = String(searchQuery || '').trim().toLowerCase();
                                                        const filtered = q ? lineItems.filter(it => {
                                                            return (
                                                                String(it.name || '').toLowerCase().includes(q) ||
                                                                String(it.itemType || '').toLowerCase().includes(q) ||
                                                                String(it.desc || '').toLowerCase().includes(q) ||
                                                                String(it.hsn || '').toLowerCase().includes(q)
                                                            );
                                                        }) : lineItems;
                                                        const total = filtered.length;
                                                        const ps = Number(pageSize) || 10;
                                                        const totalPages = Math.max(1, Math.ceil(total / ps));
                                                        const currentPage = Math.min(Math.max(1, page), totalPages);
                                                        const start = (currentPage - 1) * ps;
                                                        const end = Math.min(start + ps, total);
                                                        const visible = filtered.slice(start, end);

                                                        return (
                                                            <>
                                                                {pagedLineItems.map((item, idx) => (
                                                                    <View key={item.id} style={styles.tr}>
                                                                        <View style={[styles.td, { width: wp(15) }]}>
                                                                            <Text style={styles.tdText}>{startIndex + idx + 1}</Text>
                                                                        </View>
                                                                        <View style={[styles.td, { width: wp(50), alignItems: 'flex-start', paddingLeft: wp(2) }]}>
                                                                            <Text style={styles.tdText}>• Item Type: {item.itemType}</Text>
                                                                            <Text style={styles.tdText}>• Name: {item.itemName}</Text>
                                                                        </View>
                                                                        <View style={[styles.td, { width: wp(20) }]}>
                                                                            <Text style={styles.tdText}>{item.quantity}</Text>
                                                                        </View>
                                                                        <View style={[styles.tdAction, { width: wp(25) }]}>
                                                                            <TouchableOpacity
                                                                                style={styles.actionButton}
                                                                                onPress={() => handleEditItem(item.id)}
                                                                            >
                                                                                <Icon name="edit" size={rf(3.6)} color="#fff" />
                                                                            </TouchableOpacity>
                                                                            <TouchableOpacity
                                                                                style={[styles.actionButton, { marginLeft: wp(2) }]}
                                                                                onPress={() => handleDeleteItem(item.id)}
                                                                            >
                                                                                <Icon name="delete" size={rf(3.6)} color="#fff" />
                                                                            </TouchableOpacity>
                                                                        </View>
                                                                    </View>
                                                                ))}
                                                                <View style={styles.paginationContainer}>
                                                                    <View style={{ flex: 1 }}>
                                                                        <Text style={[{ color: COLORS.textMuted }]}>
                                                                            Showing {totalLineItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalLineItems} entries
                                                                        </Text>
                                                                    </View>
                                                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                        <TouchableOpacity
                                                                            style={[styles.pageButton, { marginRight: wp(2) }]}
                                                                            disabled={currentPage <= 1}
                                                                            onPress={() => setPage(p => Math.max(1, p - 1))}
                                                                        >
                                                                            <Text style={styles.pageButtonText}>Previous</Text>
                                                                        </TouchableOpacity>
                                                                        {renderPageButtons(currentPage, totalPages)}

                                                                        <TouchableOpacity
                                                                            style={[styles.pageButton, { marginLeft: wp(2) }]}
                                                                            disabled={currentPage >= totalPages}
                                                                            onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                                                                        >
                                                                            <Text style={styles.pageButtonText}>Next</Text>
                                                                        </TouchableOpacity>
                                                                    </View>
                                                                </View>
                                                            </>);
                                                    })()}
                                                </View>
                                            </View>
                                        </ScrollView>

                                    </View>
                                </View>
                            )}
                        </AccordionSection>
                    )}


                </ScrollView>



                <DatePickerBottomSheet
                    isVisible={openDatePicker}
                    onClose={closeDatePicker}
                    selectedDate={datePickerSelectedDate}
                    onDateSelect={handleDateSelect}
                    title="Select Date"
                />

                <BottomSheetConfirm
                    visible={successSheetVisible}
                    title="Success"
                    message={successMessage}
                    confirmText="OK"
                    cancelText={null}
                    onConfirm={() => {
                        // Clear form data when confirming
                        setProjectName('');
                        setCustomerName('');
                        setRequestedDate('');
                        setExpectedPurchaseDate('');
                        setLineItems([]);
                        setCurrentItem({ itemType: '', itemName: '', quantity: '', unit: '' });
                        setInquiryNo('');
                        setCountry('');
                        setCurrencyType('');
                        setSuccessSheetVisible(false);
                    }}
                    onCancel={() => setSuccessSheetVisible(false)}
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
                                onPress={handleCancel}
                            >
                                <Text style={formStyles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                    </View>)}
            </View>
        </>
    );
};

export default AddSalesInquiry;


const styles = StyleSheet.create({
    container: {
        padding: wp(3.5),
        paddingBottom: hp(6),
        backgroundColor: '#fff'
    },
    line: {
        borderBottomColor: COLORS.border,
        borderBottomWidth: hp(0.2),
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
    pageButtonActive: {
        backgroundColor: COLORS.primary,
    },
    pageButtonTextActive: {
        color: '#fff',
    },
    headerSeparator: {
        height: 1,
        width: '100%'
    },
    sectionWrapper: {
        marginBottom: hp(1.8),
        borderRadius: wp(2.5),
        overflow: 'visible',
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
    sectionTitle: {
        fontSize: rf(4),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: '700',
    },
    sectionBody: {
        padding: wp(2),
    },
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
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    col: {
        width: '48%'
    },
    colSmall: {
        width: '48%'
    },
    addButtonWrapper: {
        flex: 1,
        alignItems: 'flex-end',
        marginTop: hp(5),
        paddingLeft: wp(2),
    },
    addButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: hp(1.2),
        paddingHorizontal: wp(6),
        borderRadius: wp(1.5),
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: wp(20),
    },
    addButtonText: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontSize: rf(3.6),
        fontWeight: '600',
    },
    tableContainer: {
        marginTop: hp(2),
        marginBottom: hp(2),
    },
    tableWrapper: {
        borderWidth: 1,
        borderColor: '#CFCFCF',
        borderRadius: wp(1.5),
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    table: {
        width: '100%',
    },
    thead: {
        backgroundColor: '#f1f1f1',
    },
    tbody: {
        backgroundColor: '#fff',
    },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    th: {
        paddingVertical: hp(1.4),
        paddingHorizontal: wp(2),
        textAlign: 'center',
        fontWeight: '700',
        fontSize: wp(3),
        borderRightWidth: 1,
        borderRightColor: '#CFCFCF',
        color: COLORS.text,
    },
    td: {
        paddingVertical: hp(1),
        paddingHorizontal: wp(1),
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
    },
    tdAction: {
        paddingVertical: hp(1),
        paddingHorizontal: wp(1),
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRightWidth: 0,
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
    actionButtonText: {
        color: '#fff',
        fontSize: wp(2.8),
        fontWeight: '600',
    },
    footerBar: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    footerButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: wp(3.5),
        paddingVertical: hp(1),
        gap: wp(3),
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        paddingVertical: hp(1.4),
        paddingHorizontal: wp(6),
        borderRadius: wp(1.5),
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: wp(25),
    },
    cancelButtonText: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontSize: rf(3.6),
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: hp(1.4),
        paddingHorizontal: wp(6),
        borderRadius: wp(1.5),
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonDisabled: {
        opacity: 0.6,
    },
    submitButtonText: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontSize: rf(3.6),
        fontWeight: '600',
    },
    tableControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: wp(1.8),
    },
    tableTopControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: wp(2),
    },
    paginationButton: {
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.6),
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#d0d0d0',
        marginLeft: wp(1),
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    paginationButtonActive: {
        backgroundColor: '#e4572e',
        borderColor: '#e4572e',
        borderRadius: 6,
    },
    paginationButtonDisabled: {
        backgroundColor: '#e9ecef',
        borderColor: '#d0d0d0',
    },
    paginationButtonText: {
        color: '#4a4a4a',
        fontSize: rf(3.6),
    },
    paginationButtonTextActive: {
        color: '#fff',
    },
});
