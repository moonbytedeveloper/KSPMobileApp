import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { wp, hp, rf } from '../../../../utils/responsive';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, inputStyles } from '../../../styles/styles';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useRoute } from '@react-navigation/native';
import DatePickerBottomSheet from '../../../../components/common/CustomDatePicker';
import { addSalesInquiry, getCustomers, getItemTypes, getItemMasters, getUnits, addSalesHeader, addSalesLine, updateSalesHeader, getSalesHeader, getSalesLines, updateSalesLine, deleteSalesLine } from '../../../../api/authServices';
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
        if (datePickerField === 'requested') setRequestedDate(formatted);
        if (datePickerField === 'expected') setExpectedPurchaseDate(formatted);
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
                        console.log('UpdateSalesLine payload ->', payload);
                        const resp = await updateSalesLine(payload);
                        console.log('UpdateSalesLine resp ->', resp);
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
                    } catch (e) {
                        console.log('UpdateSalesLine error ->', e?.message || e);
                        Alert.alert('Error', e?.message || 'Failed to update line on server');
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
                    console.log('AddSalesLine payload ->', payload);
                    const resp = await addSalesLine(payload);
                    console.log('AddSalesLine resp ->', resp);
                    // Try to extract created line UUID from response
                    const createdLineUuid = resp?.Data?.UUID || resp?.UUID || resp?.Data?.LineUUID || resp?.LineUUID || null;
                    const newItem = { ...newItemBase, lineUuid: createdLineUuid };
                    setLineItems(prev => [...prev, newItem]);
                    setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null });
                } catch (e) {
                    console.log('AddSalesLine error ->', e?.message || e);
                    Alert.alert('Error', e?.message || 'Failed to add line to server');
                } finally {
                    setLineAdding(false);
                }
            })();
            return;
        }

        // Local-only add (header not saved yet)
        setLineItems([...lineItems, newItemBase]);
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
                // fetch header
                const headerResp = await getSalesHeader({ headerUuid: headerUuidParam });
                console.log('Prefill getSalesHeader ->', headerResp);
                const headerData = headerResp?.Data || {};

                // Prefill fields using exact API keys
                setProjectName(headerData.ProjectName || '');
                setInquiryNo(headerData.InquiryNo || '');
                // API returns dates in dd-MMM-yyyy already — keep as-is
                if (headerData.OrderDate) setRequestedDate(headerData.OrderDate);
                if (headerData.RequestedDeliveryDate) setExpectedPurchaseDate(headerData.RequestedDeliveryDate);

                // Customer
                if (headerData.CustomerUUID || headerData.CustomerId || headerData.CustomerID) {
                    const custUuid = headerData.CustomerUUID || headerData.CustomerId || headerData.CustomerID;
                    setCustomerUuid(custUuid);
                    // Prefer the freshly fetched customers list for immediate lookup
                    const found = (customersList || customers || []).find(c => (c.UUID || c.Id || c.id) === custUuid) || null;
                    if (found) {
                        setCustomerName(found?.Name || found?.DisplayName || found?.name || '');
                    } else if (headerData.CustomerName || headerData.Customer) {
                        setCustomerName(headerData.CustomerName || headerData.Customer);
                    }
                }

                // mark saved and store response
                setHeaderResponse(headerResp);
                setHeaderSaved(true);
                setHeaderEditing(false);

                // fetch lines
                const linesResp = await getSalesLines({ headerUuid: headerUuidParam });
                console.log('Prefill getSalesLines ->', linesResp);
                const records = linesResp?.Data?.Records || [];
                const mapped = (records || []).map((ln, idx) => ({
                    id: ln?.SrNo || idx + 1,
                    itemType: ln?.ItemTypeName || '',
                    itemTypeUuid: null,
                    itemName: ln?.ItemName || '',
                    itemNameUuid: null,
                    quantity: ln?.Quantity || 0,
                    unit: '',
                    unitUuid: null,
                    lineUuid: ln?.UUID || null,
                }));
                setLineItems(mapped);
            } catch (e) {
                console.log('Prefill error ->', e?.message || e);
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
                    console.log('Deleting sales line ->', { uuid: toDelete.lineUuid, headerUuid });
                    const resp = await deleteSalesLine({ lineUuid: toDelete.lineUuid });
                    console.log('DeleteSalesLine resp ->', resp);
                    // remove locally after successful delete
                    setLineItems(prev => prev.filter(it => it.id !== id));
                } catch (e) {
                    console.log('DeleteSalesLine error ->', e?.message || e);
                    Alert.alert('Error', e?.message || 'Failed to delete line on server');
                } finally {
                    setLineAdding(false);
                }
            })();
            return;
        }

        // Local-only remove if not persisted
        setLineItems(lineItems.filter(item => item.id !== id));
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
                UUID: '',
                CustomerUUID: customerUuid,
                OrderDate: uiDateToApiDate(requestedDate) || null,
                RequestedDeliveryDate: uiDateToApiDate(expectedPurchaseDate) || null,
                ProjectName: projectName || '',
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

    const handleUpdateHeader = async () => {
        try {
            setHeaderSubmitting(true);
            if (!customerUuid) {
                Alert.alert('Validation', 'Please select a customer');
                setHeaderSubmitting(false);
                return;
            }
            // get header UUID from previous response
            const headerUuid = headerResponse?.Data?.UUID || headerResponse?.UUID || headerResponse?.Data?.HeaderUUID || headerResponse?.HeaderUUID || headerResponse?.HeaderUuid || headerResponse?.Data?.HeaderUuid;
            if (!headerUuid) {
                Alert.alert('Error', 'Header UUID missing. Cannot update header.');
                setHeaderSubmitting(false);
                return;
            }

            const payload = {
                UUID: headerUuid,
                CustomerUUID: customerUuid,
                OrderDate: uiDateToApiDate(requestedDate) || null,
                RequestedDeliveryDate: uiDateToApiDate(expectedPurchaseDate) || null,
                ProjectName: projectName || '',
                InquiryNo: inquiryNo || ''
            };
            console.log('UpdateSalesHeader payload ->', payload);
            const resp = await updateSalesHeader(payload, { userUuid: await getUUID(), cmpUuid: await getCMPUUID(), envUuid: await getENVUUID() });
            console.log('UpdateSalesHeader resp ->', resp);
            setHeaderResponse(resp);
            setHeaderSaved(true);
            setHeaderEditing(false);
            setExpandedId(null);
        } catch (e) {
            console.log('UpdateSalesHeader error ->', e?.message || e);
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
                    title="Add Sales Inquiry"
                    onLeftPress={() => { 
                            navigation.goBack();
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
                                    <TouchableOpacity onPress={() => { setHeaderEditing(true); setExpandedId(1); }}>
                                        <Icon name="edit" size={rf(5)} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            ) : null
                        }
                    >
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Project Name*</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput
                                        style={[inputStyles.input, { color: COLORS.text }]}
                                        value={projectName}
                                        onChangeText={setProjectName}
                                        placeholder="eg. Ksp"
                                        placeholderTextColor={COLORS.textLight}
                                    />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Customer Name*</Text>
                                <View style={{ zIndex: 9999, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="- Select Customer -"
                                        value={customerName}
                                        options={customers}
                                        getLabel={(c) => c?.Name || c?.DisplayName || c?.name || ''}
                                        getKey={(c) => c?.UUID || c?.Id || c?.id || (c?.Name ?? c)}
                                        onSelect={(v) => {
                                            // Dropdown returns the selected item (object)
                                            if (v && typeof v === 'object') {
                                                setCustomerName(v?.Name || v?.DisplayName || v?.name || '');
                                                setCustomerUuid(v?.UUID || v?.Id || v?.id || null);
                                            } else {
                                                // fallback for string values
                                                setCustomerName(v);
                                                setCustomerUuid(null);
                                            }
                                        }}
                                        renderInModal={true}
                                        inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
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
                                            textStyle={[inputStyles.input, { fontSize: rf(3.4) }]}
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
                                            textStyle={[inputStyles.input, { fontSize: rf(3.4) }]}
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
                                            textStyle={inputStyles.input}
                                        />
                                    </View>
                                </View>

                            </View>
                            <View style={styles.addButtonWrapper}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.addButton}
                                    onPress={handleAddItem}
                                >
                                    <Text style={styles.addButtonText}>Add</Text>
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

                {/* <View style={styles.footerBar}>
                    <View style={styles.footerButtonsRow}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={loading}
                        >
                            <Text style={styles.submitButtonText}>{loading ? 'Submitting...' : 'Submit'}</Text>
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
