import React, { useState, useRef } from 'react';
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
import { addSalesInquiry, getCustomers, getItemTypes, getItemMasters, getUnits, addSalesHeader, addPurchaseInquiryHeader, addSalesLine, addPurchaseInquiryLine, updateSalesHeader, getSalesHeader, getSalesLines, updateSalesLine, deleteSalesLine, getPurchasequotationVendor, getCurrencies, getProjects, getPurchaseInquiryHeader, updatePurchaseInquiryHeader, updatePurchaseInquiryLine, deletePurchaseInquiryLine } from '../../../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../../../api/tokenStorage';
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
    VendorName: Yup.string().trim().required('Vendor is required'),
    VendorUUID: Yup.string().test('vendor-uuid-or-name', 'Vendor is required', function (val) {
        const { VendorName } = this.parent || {};
        const hasUuid = typeof val === 'string' && val.trim() !== '';
        const hasName = typeof VendorName === 'string' && VendorName.trim() !== '';
        return !!(hasUuid || hasName);
    }),
    CurrencyType: Yup.string().trim().required('Currency type is required'),
    CurrencyUUID: Yup.string().test('currency-uuid-or-type', 'Currency type is required', function (val) {
        const { CurrencyType } = this.parent || {};
        const hasUuid = typeof val === 'string' && val.trim() !== '';
        const hasType = typeof CurrencyType === 'string' && CurrencyType.trim() !== '';
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
                        const payload = {
                            UUID: existing.lineUuid,
                            HeaderUUID: headerUuid,
                            ItemType_UUID: currentItem.itemTypeUuid || existing.itemTypeUuid || null,
                            ItemName_UUID: currentItem.itemNameUuid || existing.itemNameUuid || null,
                            Quantity: Number(currentItem.quantity) || Number(existing.quantity) || 0,
                            Unit_UUID: currentItem.unitUuid || existing.unitUuid || null,
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
                                Alert.alert('Error', e?.message || 'Failed to update line on server');
                            }
                        } catch (_) {
                            Alert.alert('Error', e?.message || 'Failed to update line on server');
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
                    const payload = {
                        UUID: '',
                        HeaderUUID: headerUuid,
                        ItemType_UUID: newItemBase.itemTypeUuid,
                        ItemName_UUID: newItemBase.itemNameUuid,
                        Quantity: Number(newItemBase.quantity) || 0,
                        Unit_UUID: newItemBase.unitUuid || null,
                    };
                    console.log('AddPurchaseInquiryLine payload ->', payload);
                    const resp = await addPurchaseInquiryLine(payload, { userUuid: await getUUID(), cmpUuid: await getCMPUUID(), envUuid: await getENVUUID() });
                    console.log('AddPurchaseInquiryLine resp ->', resp);
                    // Try to extract created line UUID from response
                    const createdLineUuid = resp?.Data?.UUID || resp?.UUID || resp?.Data?.LineUUID || resp?.LineUUID || resp?.Data?.Id || null;
                    const newItem = { ...newItemBase, lineUuid: createdLineUuid };
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
                            Alert.alert('Error', e?.message || 'Failed to add line to server');
                        }
                    } catch (_) {
                        Alert.alert('Error', e?.message || 'Failed to add line to server');
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
            const resp = await getItemMasters({ itemTypeUuid });
            console.log('GetItemMasters resp ->', resp);
            const data = resp?.Data || resp || [];
            const list = Array.isArray(data) ? data : (data?.List || []);
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
        return hr?.UUID || hr?.Id || hr?.IdString || hr?.HeaderUUID || hr?.HeaderId || hr?.HeaderUuid || hr?.Data?.UUID || hr?.Data?.HeaderUUID || hr?.Data?.HeaderUuid || route?.params?.headerUuid || null;
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
                    fetchUnits(),
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
                    setCurrencyType(headerData.CurrencyName || headerData.Currency || headerData.CurrencyCode || '');
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
                // load any cached lines for this header (in-memory)
                const cached = resolvedHeaderUuid ? (headerLinesMap[resolvedHeaderUuid] || []) : [];
                setLineItems(cached);

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

    const handleEditItem = (id) => {
        const item = lineItems.find(i => i.id === id);
        if (item) {
            setCurrentItem({
                itemType: item.itemType,
                itemTypeUuid: item.itemTypeUuid || item.ItemType_UUID || null,
                itemName: item.itemName,
                itemNameUuid: item.itemNameUuid || item.ItemName_UUID || null,
                quantity: item.quantity,
                unit: item.unit
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
                            Alert.alert('Error', e?.message || 'Failed to delete line on server');
                        }
                    } catch (_) {
                        Alert.alert('Error', e?.message || 'Failed to delete line on server');
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
            Alert.alert('Error', e?.message || 'Failed to save header');
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
            if (!currencyUuid) {
                Alert.alert('Validation', 'Please select a currency');
                setHeaderSubmitting(false);
                return;
            }

            const payload = {
                UUID: '',
                VendorUUID: vendorUuid,
                VendorName: vendorName || undefined,
                // include both keys for compatibility
                CurrencyUUID: currencyUuid,
                CurrencyTypeUUID: currencyUuid,
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
                    Alert.alert('Error', e?.message || 'Failed to save header');
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
        } catch (e) {
            console.log('UpdatePurchaseInquiryHeader error ->', e?.message || e);
            Alert.alert('Error', e?.message || 'Failed to update header');
        } finally {
            setHeaderSubmitting(false);
        }
    };

    const handleCancel = () => {
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
                                                    value={values.VendorUUID || values.VendorName || ''}
                                                    options={vendors}
                                                    getLabel={(v) => (typeof v === 'string' ? v : v?.Name || v?.DisplayName || '')}
                                                    getKey={(v) => (typeof v === 'string' ? v : v?.UUID || v?.Id || v?.id || v?.Name)}
                                                    onSelect={(v) => {
                                                        if (v && typeof v === 'object') {
                                                            const name = v?.Name || v?.DisplayName || v?.name || '';
                                                            const uuid = v?.UUID || v?.Id || v?.id || null;
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
                                                    options={currencyOptions.length ? currencyOptions : currencyTypes}
                                                    getLabel={(c) => (typeof c === 'string' ? c : c?.Name || c?.CurrencyName || c?.Code || c?.DisplayName || c?.name || '')}
                                                    getKey={(c) => (typeof c === 'string' ? c : c?.UUID || c?.Id || c?.id || c?.Code || c?.Name)}
                                                    onSelect={(v) => {
                                                        if (v && typeof v === 'object') {
                                                            const currencyName = v?.Name || v?.CurrencyName || v?.Code || v?.DisplayName || v?.name || '';
                                                            const currencyUuid = v?.UUID || v?.Id || v?.id || null;
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
                                                    options={projects.length ? projects : projectsStatic}
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
                                            <Text style={styles.submitButtonText}>{headerSubmitting ? (headerEditing ? 'Updating...' : 'Saving...') : (headerEditing ? 'Update Header' : 'Save Header')}</Text>
                                        </TouchableOpacity>

                                    </View>
                                </AccordionSection>
                            );
                        }}
                    </Formik>

                    {/* Section 2: LINE */}
                    {headerSaved && (
                        <AccordionSection id={2} title="Create Order" expanded={expandedId === 2} onToggle={toggleSection}>
                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <Text style={inputStyles.label}>Item Type*</Text>
                                    <View style={{ zIndex: 9998, elevation: 20 }}>
                                        <Dropdown
                                            placeholder="- Select Item -"
                                            value={currentItem.itemTypeUuid || currentItem.itemType}
                                            options={serverItemTypes.length ? serverItemTypes : demoItemTypes}
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
                                            options={serverItemMasters.length ? serverItemMasters : itemNames}
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
                                            options={serverUnits.length ? serverUnits : units}
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
                                    style={styles.addButton}
                                    onPress={handleAddItem}
                                    disabled={lineAdding}
                                >
                                    <Text style={styles.addButtonText}>{editLineItemId ? (lineAdding ? 'Updating...' : 'Update') : (lineAdding ? 'Adding...' : 'Add')}</Text>
                                </TouchableOpacity>
                            </View>
                        </AccordionSection>
                    )}

                    {/* Line Items Table */}
                    {lineItems.length > 0 && (
                        <View style={styles.tableContainer}>
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
                                            {lineItems.map((item, index) => (
                                                <View key={item.id} style={styles.tr}>
                                                    <View style={[styles.td, { width: wp(15) }]}>
                                                        <Text style={styles.tdText}>{index + 1}</Text>
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
                                        </View>
                                    </View>
                                </ScrollView>
                            </View>
                        </View>
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

                </View>
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
});
