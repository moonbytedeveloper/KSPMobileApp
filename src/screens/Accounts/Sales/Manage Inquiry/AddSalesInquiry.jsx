import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { wp, hp, rf } from '../../../../utils/responsive';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, inputStyles } from '../../../styles/styles';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatePickerBottomSheet from '../../../../components/common/CustomDatePicker';
// Network API calls removed from this screen — local-only behavior
import { getUUID, getCMPUUID, getENVUUID } from '../../../../api/tokenStorage';
import { fetchProjects, getSalesHeader, getCustomers, addSalesInquiry, addSalesLine, updateSalesLine, deleteSalesLine, getItemTypes, getItemMasters, getUnits } from '../../../../api/authServices';
import { uiDateToApiDate } from '../../../../utils/dateUtils';
import BottomSheetConfirm from '../../../../components/common/BottomSheetConfirm';

const AccordionSection = ({ id, title, expanded, onToggle, children, wrapperStyle, rightActions }) => {
    return (
        <View style={[styles.sectionWrapper, wrapperStyle]}>
            <View style={styles.sectionHeader}>
                <TouchableOpacity activeOpacity={0.8} style={{ flex: 1 }} onPress={() => onToggle(id)}>
                    <Text style={styles.sectionTitle}>{title}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {rightActions ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: wp(2) }}>
                            {rightActions}
                        </View>
                    ) : null}
                    <TouchableOpacity onPress={() => onToggle(id)} activeOpacity={0.8}>
                        <Icon name={expanded ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.text} />
                    </TouchableOpacity>
                </View>
            </View>
            {expanded && <View style={styles.line} />}
            {expanded && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
};

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

    // Called when user explicitly taps the edit icon for the header.
    // Ensure the header fields are populated into component state so the
    // user sees the full, editable form. We reset the userEdited flags so
    // the prefill will apply in this explicit-edit scenario.
    const enterHeaderEditMode = async () => {
        try {
            setHeaderEditing(true);
            setExpandedId(1);
            // Reset user-edited marks so prefill applies now
            userEditedRef.current = { project: false, customer: false, requestedDate: false, expectedDate: false };

            // If we already have headerResponse from a previous prefill, use it
            const headerData = headerResponse?.Data || headerResponse || null;
            if (headerData) {
                setProjectName(headerData.ProjectName || '');
                setInquiryNo(headerData.InquiryNo || '');
                if (headerData.OrderDate) setRequestedDate(headerData.OrderDate);
                if (headerData.RequestedDeliveryDate) setExpectedPurchaseDate(headerData.RequestedDeliveryDate);

                const custUuid = headerData.CustomerUUID || headerData.CustomerId || headerData.CustomerID;
                if (custUuid) {
                    setCustomerUuid(custUuid);
                    const found = (customers || []).find(c => (c.UUID || c.Id || c.id) === custUuid) || null;
                    if (found) setCustomerName(found?.Name || found?.DisplayName || found?.name || '');
                    else if (headerData.CustomerName || headerData.Customer) setCustomerName(headerData.CustomerName || headerData.Customer);
                }
            } else {
                // If headerResponse not present, attempt a fresh fetch using any route param
                const headerUuidParam = route?.params?.headerUuid || route?.params?.HeaderUUID || route?.params?.headerUUID || route?.params?.uuid || route?.params?.headerRaw?.UUID || route?.params?.headerRaw?.Id;
                if (headerUuidParam) {
                    try {
                        const resp = await getSalesHeader({ headerUuid: headerUuidParam });
                        const hd = resp?.Data || {};
                        setProjectName(hd.ProjectName || '');
                        setInquiryNo(hd.InquiryNo || '');
                        if (hd.OrderDate) setRequestedDate(hd.OrderDate);
                        if (hd.RequestedDeliveryDate) setExpectedPurchaseDate(hd.RequestedDeliveryDate);
                        const custUuid = hd.CustomerUUID || hd.CustomerId || hd.CustomerID;
                        if (custUuid) {
                            setCustomerUuid(custUuid);
                            const found = (customers || []).find(c => (c.UUID || c.Id || c.id) === custUuid) || null;
                            if (found) setCustomerName(found?.Name || found?.DisplayName || found?.name || '');
                            else if (hd.CustomerName || hd.Customer) setCustomerName(hd.CustomerName || hd.Customer);
                        }
                        // store response for later
                        setHeaderResponse(resp);
                        setHeaderSaved(true);
                    } catch (e) {
                        console.log('enterHeaderEditMode fetch error ->', e?.message || e);
                    }
                }
            }
        } catch (e) {
            console.log('enterHeaderEditMode error ->', e?.message || e);
        }
    };

    // Demo options for dropdowns
    const currencyTypes = ['- Select Currency -', 'USD', 'INR', 'EUR', 'GBP'];
    const demoItemTypes = ['- Select Item -', 'Furniture', 'Electronics', 'Office Supplies', 'Equipment'];
    const itemNames = ['- Select Item -', 'Chair', 'Table', 'Desk', 'Cabinet'];
    const CustomerType = ['- Select Customer -', 'Abhinav', 'Raj',];
    const countries = ['- Select Country -', 'India', 'United States', 'United Kingdom', 'Australia', 'Germany'];
    const units = ['- Select Unit -', 'Pcs', 'Box', 'Set', 'Unit', 'failed'];

    // Form state
    const [uuid, setUuid] = useState('0e073e1b-3b3f-4ae2-8f77-5');
    const [currencyType, setCurrencyType] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerUuid, setCustomerUuid] = useState(null);
    const [customers, setCustomers] = useState([]);
    const [projects, setProjects] = useState([]);
    const [projectUuid, setProjectUuid] = useState(null);
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
    const [showInquiryNoField, setShowInquiryNoField] = useState(false);
    const [country, setCountry] = useState('');
    const [loading, setLoading] = useState(false);
    const [successSheetVisible, setSuccessSheetVisible] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [headerSubmitting, setHeaderSubmitting] = useState(false);
    const [headerSaved, setHeaderSaved] = useState(false);
    const [headerResponse, setHeaderResponse] = useState(null);
    const [headerEditing, setHeaderEditing] = useState(false);

    // Track whether the user has manually edited header fields so background
    // prefill/mapping logic doesn't overwrite their changes.
    const userEditedRef = useRef({ project: false, customer: false, requestedDate: false, expectedDate: false });

    // Line items state
    const [lineItems, setLineItems] = useState([]);
    const [lineAdding, setLineAdding] = useState(false);
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
            const d = new Date(date);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dd = String(d.getDate()).padStart(2, '0');
            const mmm = months[d.getMonth()];
            const yyyy = String(d.getFullYear());
            return `${dd}-${mmm}-${yyyy}`;
        } catch (e) {
            return '';
        }
    };


    const openDatePickerFor = (field) => {
        let initial = new Date();
        if (field === 'requested' && requestedDate) {
            const parsed = new Date(requestedDate);
            if (!isNaN(parsed)) initial = parsed;
        }
        if (field === 'expected' && expectedPurchaseDate) {
            const parsed = new Date(expectedPurchaseDate);
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

    const handleDateSelect = (date) => {
        const formatted = formatUiDate(date);
        if (datePickerField === 'requested') {
            setRequestedDate(formatted);
            userEditedRef.current.requestedDate = true;
        }
        if (datePickerField === 'expected') {
            setExpectedPurchaseDate(formatted);
            userEditedRef.current.expectedDate = true;
        }
        setOpenDatePicker(false);
        setDatePickerField(null);
    };

    const handleAddItem = async () => {
        if (!currentItem.itemType || !currentItem.itemName || !currentItem.quantity || !currentItem.unit) {
            Alert.alert('Validation', 'Please fill all fields');
            return;
        }

        // If editing, prefer server update when line has a server UUID; otherwise perform local update
        if (editLineItemId) {
            const existing = lineItems.find(i => i.id === editLineItemId) || {};
            const existingLineUuid = existing?.lineUuid || existing?.LineUUID || existing?.UUID || null;

            // If this line is already saved on server, call updateSalesLine
            if (existingLineUuid) {
                setLineAdding(true);
                try {
                    const payload = {
                        UUID: existingLineUuid,
                        LineUUID: existingLineUuid,
                        SrNo: existing?.SrNo || editLineItemId,
                        ItemTypeUUID: currentItem.itemTypeUuid || existing.itemTypeUuid || null,
                        ItemTypeName: currentItem.itemType || existing.itemType || '',
                        ItemUUID: currentItem.itemNameUuid || existing.itemNameUuid || null,
                        ItemName: currentItem.itemName || existing.itemName || '',
                        Quantity: currentItem.quantity,
                        UnitUUID: currentItem.unitUuid || existing.unitUuid || null,
                        Unit: currentItem.unit || existing.unit || ''
                    };
                    console.log('updateSalesLine payload ->', payload);
                    const resp = await updateSalesLine(payload);
                    console.log('updateSalesLine resp ->', resp);

                    const updatedUuid = resp?.Data?.UUID || resp?.Data?.LineUUID || resp?.UUID || existingLineUuid;
                    const updatedItem = {
                        ...existing,
                        itemType: currentItem.itemType,
                        itemTypeUuid: currentItem.itemTypeUuid || existing.itemTypeUuid || null,
                        itemName: currentItem.itemName,
                        itemNameUuid: currentItem.itemNameUuid || existing.itemNameUuid || null,
                        quantity: currentItem.quantity,
                        unit: currentItem.unit,
                        unitUuid: currentItem.unitUuid || existing.unitUuid || null,
                        lineUuid: updatedUuid,
                    };

                    setLineItems(prev => prev.map(it => it.id === editLineItemId ? updatedItem : it));
                    setEditLineItemId(null);
                    setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
                } catch (e) {
                    console.log('updateSalesLine error ->', e?.message || e);
                    Alert.alert('Error', e?.message || 'Failed to update line on server. Changes saved locally.');
                    // fallback to local update
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
                    setEditLineItemId(null);
                    setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
                } finally {
                    setLineAdding(false);
                }
                return;
            }

            // No server UUID -> perform local-only update
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
            // reset editor
            setEditLineItemId(null);
            setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
            return;
        }

        // If header is saved on server, create payload and post line to API
        const headerUuid = headerResponse?.Data?.UUID || headerResponse?.Data?.HeaderUUID || headerResponse?.Data?.Id || null;
        if (headerSaved && headerUuid) {
            setLineAdding(true);
            try {
                const srNo = lineItems.length ? Math.max(...lineItems.map(i => i.id)) + 1 : 1;
                const payload = {
                    HeaderUUID: headerUuid,
                    headerUuid: headerUuid,
                    UUID: headerUuid,
                    SrNo: srNo,
                    ItemTypeUUID: currentItem.itemTypeUuid || null,
                    ItemTypeName: currentItem.itemType || '',
                    ItemUUID: currentItem.itemNameUuid || null,
                    ItemName: currentItem.itemName || '',
                    Quantity: currentItem.quantity,
                    UnitUUID: currentItem.unitUuid || null,
                    Unit: currentItem.unit || ''
                };

                console.log('addSalesLine payload ->', payload);
                const resp = await addSalesLine(payload);
                console.log('addSalesLine resp ->', resp);

                // Map response to local item. Prefer resp.Data.UUID or resp.Data.LineUUID
                const createdUuid = resp?.Data?.UUID || resp?.Data?.LineUUID || resp?.Data?.Id || resp?.UUID || null;
                const newItem = {
                    id: srNo,
                    itemType: currentItem.itemType,
                    itemTypeUuid: currentItem.itemTypeUuid || null,
                    itemName: currentItem.itemName,
                    itemNameUuid: currentItem.itemNameUuid || null,
                    quantity: currentItem.quantity,
                    unit: currentItem.unit,
                    unitUuid: currentItem.unitUuid || null,
                    lineUuid: createdUuid,
                };

                setLineItems(prev => [...prev, newItem]);
                setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
            } catch (e) {
                console.log('addSalesLine error ->', e?.message || e);
                Alert.alert('Error', e?.message || 'Failed to add line to server. Saving locally instead.');
                // fallback to local add if API fails
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
                setLineItems(prev => [...prev, newItemBase]);
                setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
            } finally {
                setLineAdding(false);
            }
            return;
        }

        // Header not saved on server — perform a local-only add
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

        setLineItems(prev => [...prev, newItemBase]);
        setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
    };

    // Fetch customers for dropdown (prefer API, fall back to demo list)
    const fetchCustomers = async () => {
        try {
            const resp = await getCustomers();
            const list = resp?.Data || resp?.Records || resp?.List || resp || [];
            const arr = Array.isArray(list) ? list : [];
            setCustomers(arr);
            return arr;
        } catch (e) {
            console.log('fetchCustomers error ->', e?.message || e);
            const list = (CustomerType || []).slice(1).map((name, idx) => ({ UUID: `local-cust-${idx + 1}`, Name: name }));
            setCustomers(list);
            return list;
        }
    };

    const fetchProjectsList = async () => {
        try {
            const resp = await fetchProjects();
            const list = resp?.Data || resp?.Records || resp?.List || resp || [];
            const arr = Array.isArray(list) ? list : [];
            setProjects(arr);
            return arr;
        } catch (e) {
            console.log('fetchProjectsList error ->', e?.message || e);
            const list = [];
            setProjects(list);
            return list;
        }
    };

    const fetchItemTypes = async () => {
        setItemTypesLoading(true);
        try {
            // Prefer API-backed item types
            const resp = await getItemTypes();
            const list = resp?.Data || resp?.Records || resp?.List || resp || [];
            const arr = Array.isArray(list) ? list : [];
            setServerItemTypes(arr);
            return arr;
        } catch (e) {
            console.log('fetchItemTypes error ->', e?.message || e);
            // Local fallback: use demoItemTypes as simple objects
            const list = (demoItemTypes || []).slice(1).map((name, idx) => ({ UUID: `local-it-${idx + 1}`, Name: name }));
            setServerItemTypes(list);
            return list;
        } finally {
            setItemTypesLoading(false);
        }
    };

    const fetchItemMasters = async (itemTypeUuid = null) => {
        setItemMastersLoading(true);
        try {
            // Prefer API-backed item masters for the given item type
            // Call signature: pass identifier if available (service may accept an object or raw id)
            const resp = await getItemMasters(itemTypeUuid ? { itemTypeUuid } : {});
            const list = resp?.Data || resp?.Records || resp?.List || resp || [];
            const arr = Array.isArray(list) ? list : [];
            setServerItemMasters(arr);
            return arr;
        } catch (e) {
            console.log('fetchItemMasters error ->', e?.message || e);
            // Local fallback: use itemNames demo list
            const list = (itemNames || []).slice(1).map((name, idx) => ({ UUID: `local-im-${idx + 1}`, Name: name }));
            setServerItemMasters(list);
            return list;
        } finally {
            setItemMastersLoading(false);
        }
    };

    const fetchUnits = async () => {
        setUnitsLoading(true);
        try {
            const resp = await getUnits();
            const list = resp?.Data || resp?.Records || resp?.List || resp || [];
            const arr = Array.isArray(list) ? list : [];
            setServerUnits(arr);
            return arr;
        } catch (e) {
            console.log('fetchUnits error ->', e?.message || e);
            const list = (units || []).slice(1).map((name, idx) => ({ UUID: `local-unit-${idx + 1}`, Name: name }));
            setServerUnits(list);
            return list;
        } finally {
            setUnitsLoading(false);
        }
    };

    // Always load lookup lists on mount so new entries have dropdowns populated
    React.useEffect(() => {
        // Load local/demo lookup lists on mount
        (async () => {
            try {
                await Promise.all([
                    fetchCustomers(),
                    fetchProjectsList(),
                    fetchItemTypes(),
                    fetchItemMasters(null),
                    fetchUnits(),
                ]);
            } catch (e) {
                console.log('Initial lookup load error ->', e?.message || e);
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

    React.useEffect(() => {
        (async () => {
            const headerUuidParam = route?.params?.headerUuid || route?.params?.HeaderUUID || route?.params?.headerUUID || route?.params?.uuid || route?.params?.headerRaw?.UUID || route?.params?.headerRaw?.Id;
            // Only warn if route params were explicitly provided but header uuid is missing
            const hasRouteParams = !!route?.params && Object.keys(route.params).length > 0;
            // If a header identifier is present in route params (navigated from ManageInquiry edit),
            // show the Inquiry No field (read-only) so the user sees the number immediately.
            if (headerUuidParam) setShowInquiryNoField(true);
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
                // Use route-provided headerRaw (if present) to prefill locally. No network calls.
                const headerRaw = route?.params?.headerRaw || route?.params?.headerData || null;
                if (headerRaw) {
                    if (!headerEditing) {
                        if (!userEditedRef.current.project) setProjectName(headerRaw.ProjectName || '');
                        // also bind project UUID when available so API posts use UUID
                        if (headerRaw.ProjectUUID || headerRaw.ProjectId || headerRaw.Project) {
                            setProjectUuid(headerRaw.ProjectUUID || headerRaw.ProjectId || headerRaw.Project || null);
                        }
                        setInquiryNo(headerRaw.InquiryNo || '');
                        if (headerRaw.OrderDate && !userEditedRef.current.requestedDate) setRequestedDate(headerRaw.OrderDate);
                        if (headerRaw.RequestedDeliveryDate && !userEditedRef.current.expectedDate) setExpectedPurchaseDate(headerRaw.RequestedDeliveryDate);
                    } else {
                        if (!inquiryNo) setInquiryNo(headerRaw.InquiryNo || '');
                    }

                    if (headerRaw.CustomerUUID || headerRaw.CustomerId || headerRaw.CustomerID) {
                        const custUuid = headerRaw.CustomerUUID || headerRaw.CustomerId || headerRaw.CustomerID;
                        if (!userEditedRef.current.customer) {
                            setCustomerUuid(custUuid);
                            const found = (customersList || customers || []).find(c => (c.UUID || c.Id || c.id) === custUuid) || null;
                            if (found) setCustomerName(found?.Name || found?.DisplayName || found?.name || '');
                            else if (headerRaw.CustomerName || headerRaw.Customer) setCustomerName(headerRaw.CustomerName || headerRaw.Customer);
                        }
                    }

                    // store local header response and mark saved
                    setHeaderResponse({ Data: headerRaw });
                    setHeaderSaved(true);

                    // Map any provided lines from headerRaw (if available)
                    const records = headerRaw?.Lines || headerRaw?.Data?.Lines || headerRaw?.LinesRecords || [];
                    const mapped = (records || []).map((ln, idx) => ({
                        id: ln?.SrNo || idx + 1,
                        itemType: ln?.ItemTypeName || ln?.ItemType || '',
                        itemTypeUuid: null,
                        itemName: ln?.ItemName || ln?.Name || '',
                        itemNameUuid: null,
                        quantity: ln?.Quantity || 0,
                        unit: ln?.Unit || '',
                        unitUuid: null,
                        lineUuid: ln?.UUID || null,
                    }));
                    setLineItems(mapped);
                }
            } catch (e) {
                console.log('Prefill local error ->', e?.message || e);
            } finally {
                // Clear route params after handling prefill so stale header UUIDs don't persist
                try {
                    if (navigation && navigation.setParams) {
                        navigation.setParams({});
                    }
                } catch (e) {
                    // ignore
                }
            }
        })();
    }, [route?.params]);

    const handleEditItem = async (id) => {
        const item = lineItems.find(i => i.id === id);
        if (item) {
            const itemTypeUuid = item.itemTypeUuid || item.ItemType_UUID || item.ItemTypeUuid || null;
            const itemNameUuid = item.itemNameUuid || item.ItemName_UUID || item.ItemNameUuid || null;
            const unitUuid = item.unitUuid || item.Unit_UUID || item.UnitUuid || null;

            // Populate editor state including UUIDs so dropdowns can use them
            setCurrentItem({
                itemType: item.itemType || '',
                itemTypeUuid: itemTypeUuid,
                itemName: item.itemName || '',
                itemNameUuid: itemNameUuid,
                quantity: item.quantity || '',
                unit: item.unit || '',
                unitUuid: unitUuid
            });

            setEditLineItemId(id);

            // Ensure lookup lists are loaded for the selected item type and units
            // so the dropdowns show the selected option immediately.
            try {
                if (itemTypeUuid) await fetchItemMasters(itemTypeUuid);
                await fetchUnits();
            } catch (e) {
                console.log('handleEditItem lookup fetch error ->', e?.message || e);
            }

            // Expand LINE section so editor is visible
            setExpandedId(2);
        }
    };

    const cancelEdit = () => {
        setEditLineItemId(null);
        setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', quantity: '', unit: '' });
    };

    const handleDeleteItem = (id) => {
        const toDelete = lineItems.find(item => item.id === id);
        if (!toDelete) return;

        // If this line exists on server (has lineUuid), confirm and call delete API
        const existingLineUuid = toDelete?.lineUuid || toDelete?.LineUUID || toDelete?.UUID || null;
        if (existingLineUuid) {
            // Direct delete without confirmation (per user request)
            (async () => {
                setLineAdding(true);
                try {
                    console.log('deleteSalesLine ->', existingLineUuid);
                    await deleteSalesLine({ lineUuid: existingLineUuid });
                    // remove from local state after successful server delete
                    setLineItems(prev => prev.filter(item => item.id !== id));
                } catch (e) {
                    console.log('deleteSalesLine error ->', e?.message || e);
                    Alert.alert('Error', e?.message || 'Failed to delete line on server');
                } finally {
                    setLineAdding(false);
                }
            })();
            return;
        }

        // Local-only line (no server UUID) — remove immediately
        setLineItems(prev => prev.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            // Local-only submit: validate and show success without network
            if (!customerUuid) {
                Alert.alert('Validation', 'Please select a customer');
                setLoading(false);
                return;
            }
            const payload = {
                projectName,
                projectUUID: projectUuid || '',
                customerUUID: customerUuid,
                requestedDate,
                expectedPurchaseDate,
                lineItems
            };
            console.log('Local submit payload ->', payload);
            setSuccessMessage('Sales inquiry saved locally');
            setSuccessSheetVisible(true);
        } catch (e) {
            console.log('Error Message:', e && e.message ? e.message : e);
            Alert.alert('Error', e && e.message ? e.message : 'Failed to submit sales inquiry');
        } finally {
            setLoading(false);
        }
    };

    // Submit header to AddSalesHeader API
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
                projectName,
                customerUUID: customerUuid,
                requestedDate: uiDateToApiDate(requestedDate) || null,
                expectedPurchaseDate: uiDateToApiDate(expectedPurchaseDate) || null,
                InquiryNo: inquiryNo || '',
              
            };
            console.log('addSalesInquiry payload ->', payload);
            // Call API to save the combined sales inquiry (header + lines)
            const resp = await addSalesInquiry(payload);
            console.log('addSalesInquiry resp ->', resp);
            // Use response Data as headerResponse when available
            const headerResp = resp?.Data ? resp : { Data: resp?.Data || resp };
            setHeaderResponse(headerResp);
            setHeaderSaved(true);
            setHeaderEditing(false);
            userEditedRef.current = { project: false, customer: false, requestedDate: false, expectedDate: false };
            // Show success message from API if provided
            const msg = resp?.Message || resp?.message || 'Header saved successfully';
            setSuccessMessage(String(msg));
            setSuccessSheetVisible(true);
            setExpandedId(null);
        } catch (e) {
            console.log('AddSalesHeader error ->', e?.message || e);
            Alert.alert('Error', e?.message || 'Failed to save header');
        } finally {
            setHeaderSubmitting(false);
        }
    };

    const handleUpdateHeader = async () => {
        try {
            setHeaderSubmitting(true);
            if (!customerUuid) {
                Alert.alert('Validation', 'Please select a customer');
                setHeaderSubmitting(false);
                return;
            }
            // Local-only update: simulate update by updating headerResponse
            const headerUuid = headerResponse?.Data?.UUID || `local-header-${Date.now()}`;
            const payload = {
                UUID: headerUuid,
                CustomerUUID: customerUuid,
                ProjectUUID: projectUuid || '',
                OrderDate: uiDateToApiDate(requestedDate) || null,
                RequestedDeliveryDate: uiDateToApiDate(expectedPurchaseDate) || null,
                ProjectName: projectName || '',
                InquiryNo: inquiryNo || ''
            };
            console.log('Local update header payload ->', payload);
            setHeaderResponse({ Data: payload });
            setHeaderSaved(true);
            setHeaderEditing(false);
            userEditedRef.current = { project: false, customer: false, requestedDate: false, expectedDate: false };
            setExpandedId(null);
        } catch (e) {
            console.log('UpdateSalesHeader error ->', e?.message || e);
            Alert.alert('Error', e?.message || 'Failed to update header');
        } finally {
            setHeaderSubmitting(false);
        }
    };

    const handleCancel = () => {
        if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
            navigation.goBack();
        } else {
            try { navigation.replace('Main'); } catch (e) { try { navigation.navigate('Main'); } catch (_) { /* ignore */ } }
        }
    };

    return (
        <>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>

                    <AppHeader
          title="Add Sales Inquiry"
          onLeftPress={() => {
              if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
                  navigation.goBack();
              } else {
                  try { navigation.replace('Main'); } catch (e) { try { navigation.navigate('Main'); } catch (_) { /* ignore */ } }
              }
          }}
        />
              
                <View style={styles.headerSeparator} />
                <ScrollView contentContainerStyle={[styles.container]} showsVerticalScrollIndicator={false}>
                    {/* Section 1: HEADER */}
                    <AccordionSection
                        id={1}
                        title="HEADER"
                        expanded={expandedId === 1}
                        onToggle={handleHeaderToggle}
                        rightActions={
                            headerSaved ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(2) }}>
                                    <Icon name="check-circle" size={rf(5)} color={COLORS.success || '#28a755'} />
                                    <TouchableOpacity onPress={() => enterHeaderEditMode()}>
                                        <Icon name="edit" size={rf(5)} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            ) : null
                        }
                    >
                        {showInquiryNoField && (
                            <View style={[styles.row, { marginBottom: hp(1.2) }]}> 
                                <View style={styles.col}>
                                    <Text style={inputStyles.label}>Inquiry No</Text>
                                    <View style={[inputStyles.box, { marginTop: hp(0.5) }]}>
                                        <TextInput
                                            style={[inputStyles.input, { color: COLORS.text }]}
                                            value={inquiryNo}
                                            placeholder="Inquiry No"
                                            placeholderTextColor={COLORS.textLight}
                                            editable={false}
                                        />
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Project Name*</Text>
                                <View style={{ zIndex: 9998, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="- Select Project -"
                                        value={projectName}
                                        options={projects}
                                        getLabel={(p) => p?.ProjectTitle || p?.Name || p?.DisplayName || p?.name || ''}
                                        getKey={(p) => p?.Uuid || p?.UUID || p?.Id || p?.id || (p?.ProjectTitle ?? p)}
                                        onSelect={(v) => {
                                            if (v && typeof v === 'object') {
                                                setProjectName(v?.ProjectTitle || v?.Name || v?.DisplayName || v?.name || '');
                                                setProjectUuid(v?.Uuid || v?.UUID || v?.Id || v?.id || null);
                                                userEditedRef.current.project = true;
                                            } else {
                                                setProjectName(v);
                                                setProjectUuid(null);
                                                userEditedRef.current.project = true;
                                            }
                                        }}
                                        renderInModal={true}
                                        inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                                        // textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Customer Name*</Text>
                                <View style={{ zIndex: 9999, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="- Select Customer -"
                                        value={customerUuid || customerName}
                                        options={customers}
                                        getLabel={(c) => c?.Name || c?.DisplayName || c?.name || ''}
                                        getKey={(c) => c?.UUID || c?.Id || c?.id || (c?.Name ?? c)}
                                        onSelect={(v) => {
                                            // Dropdown returns the selected item (object)
                                            if (v && typeof v === 'object') {
                                                setCustomerName(v?.Name || v?.DisplayName || v?.name || '');
                                                setCustomerUuid(v?.UUID || v?.Id || v?.id || null);
                                                userEditedRef.current.customer = true;
                                            } else {
                                                // fallback for string values
                                                setCustomerName(v);
                                                setCustomerUuid(null);
                                                userEditedRef.current.customer = true;
                                            }
                                        }}
                                        renderInModal={true}
                                        inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                                        // textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Ordered Date*</Text>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => openDatePickerFor('requested')}
                                    style={{ marginTop: hp(0.8) }}
                                >
                                    <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                        <Text style={[
                                            inputStyles.input,
                                            styles.datePickerText,
                                            !requestedDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                            requestedDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                        ]}>
                                            {requestedDate || 'mm/dd/yyyy'}
                                        </Text>
                                        <View style={[
                                            styles.calendarIconContainer,
                                            requestedDate && styles.calendarIconContainerSelected
                                        ]}>
                                            <Icon
                                                name="calendar-today"
                                                size={rf(3.2)}
                                                color={requestedDate ? COLORS.primary : COLORS.textLight}
                                            />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Requested Delivery Date*</Text>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => openDatePickerFor('expected')}
                                    style={{ marginTop: hp(0.8) }}
                                >
                                    <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                        <Text style={[
                                            inputStyles.input,
                                            styles.datePickerText,
                                            !expectedPurchaseDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                            expectedPurchaseDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                        ]}>
                                            {expectedPurchaseDate || 'mm/dd/yyyy'}
                                        </Text>
                                        <View style={[
                                            styles.calendarIconContainer,
                                            expectedPurchaseDate && styles.calendarIconContainerSelected
                                        ]}>
                                            <Icon
                                                name="calendar-today"
                                                size={rf(3.2)}
                                                color={expectedPurchaseDate ? COLORS.primary : COLORS.textLight}
                                            />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={{ marginTop: hp(2), flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
                            <TouchableOpacity
                                activeOpacity={0.85}
                                style={[styles.submitButton, headerSubmitting && styles.submitButtonDisabled]}
                                onPress={headerEditing ? handleUpdateHeader : handleSubmitHeader}
                                disabled={headerSubmitting}
                            >
                                <Text style={styles.submitButtonText}>{headerSubmitting ? (headerEditing ? 'Updating...' : 'Saving...') : (headerEditing ? 'Update Header' : 'Save Header')}</Text>
                            </TouchableOpacity>

                        </View>
                    </AccordionSection>

                    {/* Section 2: LINE */}
                    {headerSaved && (
                        <AccordionSection id={2} title="LINE" expanded={expandedId === 2} onToggle={toggleSection}>
                            <View style={styles.row}>
                                <View style={styles.col}>
                                    <Text style={inputStyles.label}>Item Type*</Text>
                                    <View style={{ zIndex: 9998, elevation: 20 }}>
                                        <Dropdown
                                            placeholder="- Select Item -"
                                            value={currentItem.itemType}
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
                                            value={currentItem.itemName}
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
                                            placeholder="eg."
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
                                            value={currentItem.unit}
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
               {/* No longer needed */}
                {/* <View style={styles.footerBar}>
                    <View style={styles.footerButtonsRow}>
                      
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.submitButtonText}>{loading ? 'Submitting...' : 'Submit'}</Text>
                        </TouchableOpacity>
                          <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View> */}
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
        justifyContent: 'flex-end',
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
