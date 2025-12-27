
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useRoute, useIsFocused } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';
import { getpurchaseQuotationHeaders, deletePurchaseQuotationHeader, getPurchasequotationVendor, convertPurchaseQuotationToOrder } from '../../../../api/authServices';
import { getErrorMessage } from '../../../../utils/errorMessage';
import { subscribe, publish } from '../../../../utils/eventBus';

const SALES_ORDERS = [
    {
        id: 'KP1524',
        salesOrderNumber: 'KP1524',
        customerName: 'Moonbyte',
        deliveryDate: '15-12-24',
        dueDate: '15-12-24',
        salesInvoiceNumber: 'OR.002',
     
    },
    {
        id: 'KP1525',
        salesOrderNumber: 'KP1525',
        customerName: 'Northwind Retail',
        deliveryDate: '04-01-25',
        dueDate: '20-12-24',
        salesInvoiceNumber: 'OR.002',
       
    },
    {
        id: 'KP1526',
        salesOrderNumber: 'KP1526',
        customerName: 'Creative Labs',
        deliveryDate: '22-12-24',
        dueDate: '18-12-24',
        salesInvoiceNumber: 'OR.002',
        
    },
    {
        id: 'KP1527',
        salesOrderNumber: 'KP1527',
        customerName: 'BlueStone Pvt Ltd',
        deliveryDate: '11-01-25',
        dueDate: '28-12-24',
        salesInvoiceNumber: 'OR.002',
     
    },
    {
        id: 'KP1528',
        salesOrderNumber: 'KP1528',
        customerName: 'Aero Technologies',
        deliveryDate: '29-12-24',
        dueDate: '24-12-24',
        salesInvoiceNumber: 'OR.002',
       
    },
    {
        id: 'KP1529',
        salesOrderNumber: 'KP1529',
        customerName: 'UrbanNest Homes',
        deliveryDate: '05-02-25',
        dueDate: '12-01-25',
        salesInvoiceNumber: '₹1,85,300',
        
    },
];

const ITEMS_PER_PAGE_OPTIONS = ['5', '10', '20', '50'];

const ViewPurchaseQuotation = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(Number(ITEMS_PER_PAGE_OPTIONS[1]));
    const [currentPage, setCurrentPage] = useState(0);
    const [orders, setOrders] = useState([]);
    const [vendorMap, setVendorMap] = useState({});

    function resolveVendorName(it) {
        if (!it) return '';
        const name = it?.VendorName || it?.Vendor || it?.CompanyName || it?.CustomerName || it?.Customer || it?.Name;
        if (name && typeof name === 'string' && name.trim() !== '') return name;
        const uuid = it?.VendorUUID || it?.Vendor_UUID || it?.VendorId || it?.Vendor_Id || it?.CustomerUUID || it?.Customer_Id || it?.UUID || it?.Uuid;
        if (uuid) {
            const keyed = String(uuid);
            if (vendorMap && vendorMap[keyed]) return vendorMap[keyed];
            return keyed;
        }
        return '';
    }
    const [loadingOrders, setLoadingOrders] = useState(false);
    const [ordersError, setOrdersError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const route = useRoute();
    const isFocused = useIsFocused();

    const onRefresh = async () => {
        try {
            setRefreshing(true);
            setOrdersError(null);
            const resp = await getpurchaseQuotationHeaders();
            const payload = resp?.Data ?? resp?.data ?? resp ?? [];
            const list = Array.isArray(payload) ? payload : (payload?.Records || payload?.List || []);
            const mapped = (list || []).map((it) => ({
                id: it?.UUID || it?.Uuid || it?.Id || it?.PurchaseQuotationHeaderId || it?.PurchaseQuotationHeader_UUID || String(Math.random()),
                quotationNumber: it?.QuotationNo || it?.QuotationNumber || it?.Quotation_No || it?.QuotationNo || it?.Quotation || it?.Number || '',
                quotationTitle: it?.QuotationTitle || it?.Title || it?.Quotation_Title || it?.SalesOrderTitle || '',
                customerName: (it?.VendorName || it?.Vendor || it?.CompanyName || it?.CustomerName || it?.Customer || it?.Name) || '',
                purchaseRequestNumber: it?.PurchaseRequestNumber || it?.PurchaseRequestNo || it?.PurchaseRequest || it?.PRNumber || it?.InquiryNo || it?.InquiryNumber || it?.ReferenceNumber || it?.SalesInvoiceNumber || it?.salesInvoiceNumber || '',
                salesOrderNumber: it?.QuotationNo || it?.QuotationNumber || it?.Quotation_No || it?.QuotationNo || it?.Number || '',
                status: it?.Status || it?.ApprovalStatus || it?.Approval || '',
                deliveryDate: it?.DeliveryDate || it?.RequiredDate || '',
                dueDate: it?.DueDate || it?.ExpectedDate || '',
                _raw: it,
            }));
            setOrders(mapped);
            setCurrentPage(0);
        } catch (err) {
            console.error('getpurchaseQuotationHeaders (refresh) error ->', err);
            setOrdersError(err);
        } finally {
            setRefreshing(false);
        }
    };

    const filteredOrders = useMemo(() => {
        const source = (orders && orders.length) ? orders : SALES_ORDERS;
        const query = searchQuery.trim().toLowerCase();
        if (!query) return source;
        return source.filter((order) => {
            const haystack = `${order.salesOrderNumber || ''} ${order.quotationNumber || ''} ${order.quotationTitle || ''} ${order.purchaseRequestNumber || ''} ${order.customerName || ''} ${order.contactPerson || ''} ${order.status || ''}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [searchQuery, orders]);

    const totalPages = useMemo(() => {
        if (filteredOrders.length === 0) return 0;
        return Math.ceil(filteredOrders.length / itemsPerPage);
    }, [filteredOrders.length, itemsPerPage]);

    useEffect(() => {
        if (totalPages === 0) {
            if (currentPage !== 0) setCurrentPage(0);
            return;
        }
        if (currentPage > totalPages - 1) {
            setCurrentPage(totalPages - 1);
        }
    }, [totalPages, currentPage]);

    // Fetch purchase quotation headers from API
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                setLoadingOrders(true);
                setOrdersError(null);
                const resp = await getpurchaseQuotationHeaders();
                console.log('getpurchaseQuotationHeaders response ->', resp);
                // Normalize response shapes: Data / data / direct array
                const payload = resp?.Data ?? resp?.data ?? resp ?? [];
                // If payload is an object with Records/List, extract the array
                const list = Array.isArray(payload) ? payload : (payload?.Records || payload?.List || []);
                const mapped = (list || []).map((it) => ({
                    id: it?.UUID || it?.Uuid || it?.Id || it?.PurchaseQuotationHeaderId || it?.PurchaseQuotationHeader_UUID || String(Math.random()),
                    // Primary fields from API
                    quotationNumber: it?.QuotationNo || it?.QuotationNumber || it?.Quotation_No || it?.QuotationNo || it?.Quotation || it?.Number || '',
                    quotationTitle: it?.QuotationTitle || it?.Title || it?.Quotation_Title || it?.SalesOrderTitle || '',
                    customerName: resolveVendorName(it),
                    // Purchase Request - API may use different keys; include common fallbacks
                    purchaseRequestNumber: it?.PurchaseRequestNumber || it?.PurchaseRequestNo || it?.PurchaseRequest || it?.PRNumber || it?.InquiryNo || it?.InquiryNumber || it?.ReferenceNumber || it?.SalesInvoiceNumber || it?.salesInvoiceNumber || '',
                    // Backwards-compatible alias
                    salesOrderNumber: it?.QuotationNo || it?.QuotationNumber || it?.Quotation_No || it?.QuotationNo || it?.Number || '',
                    status: it?.Status || it?.ApprovalStatus || it?.Approval || '',
                    deliveryDate: it?.DeliveryDate || it?.RequiredDate || '',
                    dueDate: it?.DueDate || it?.ExpectedDate || '',
                    _raw: it,
                }));
                console.log('Mapped purchase quotation headers ->', mapped);
                if (mounted) setOrders(mapped);
            } catch (err) {
                console.error('getpurchaseQuotationHeaders error ->', err);
                if (mounted) setOrdersError(err);
            } finally {
                if (mounted) setLoadingOrders(false);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // When returning to this screen, always re-fetch the authoritative list
    // so transient/optimistic items are replaced with server data.
    useEffect(() => {
        if (!isFocused) return;
        // avoid double-refresh on initial mount if loading is already happening
        if (!loadingOrders) {
            onRefresh();
        }
    }, [isFocused]);

    // Load vendors once to map UUID -> name for cases where API returns UUID only
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const resp = await getPurchasequotationVendor();
                const raw = resp?.Data ?? resp ?? [];
                const list = Array.isArray(raw) ? raw : (raw?.Records || raw?.List || []);
                const map = {};
                (list || []).forEach(v => {
                    const uuid = v?.UUID || v?.Uuid || v?.Id || v?.VendorUUID || v?.Vendor_Id || v?.VendorId;
                    const name = v?.VendorName || v?.Name || v?.label || v?.CompanyName || v?.Vendor || '';
                    if (uuid) map[String(uuid)] = name || '';
                });
                if (mounted) setVendorMap(map);
            } catch (e) {
                console.warn('Failed to load vendors for mapping ->', e?.message || e);
            }
        })();
        return () => { mounted = false; };
    }, []);

    // If navigated back from AddPurchaseQuotation with a newly added quotation, insert it into the list
    useEffect(() => {
        try {
            const added = route?.params?.addedQuotation;
            if (added) {
                const mapped = {
                    id: added?.UUID || added?.Uuid || added?.Id || String(Math.random()),
                    quotationNumber: added?.QuotationNo || added?.QuotationNumber || added?.Quotation_No || added?.Quotation || '',
                    quotationTitle: added?.QuotationTitle || added?.Title || '',
                    customerName: resolveVendorName(added),
                    purchaseRequestNumber: added?.PurchaseRequestNumber || added?.PurchaseRequestNo || added?.InquiryNo || '',
                    salesOrderNumber: added?.QuotationNo || added?.QuotationNumber || '',
                    status: added?.Status || added?.ApprovalStatus || '',
                    deliveryDate: added?.DeliveryDate || '',
                    dueDate: added?.DueDate || '',
                    _raw: added,
                };

                // If server didn't provide a stable UUID/Id for this added entry,
                // refresh the full list from server to pick up the authoritative record.
                const hasStableId = !!(added?.UUID || added?.Uuid || added?.Id || added?.PurchaseQuotationHeaderId || added?.PurchaseQuotationHeader_UUID);
                if (!hasStableId) {
                    // clear the param then refresh so we don't loop
                    try { navigation.setParams({ addedQuotation: undefined }); } catch (_) {}
                    onRefresh();
                    return;
                }

                setOrders(prev => {
                    // avoid duplicates
                    if (prev.some(p => String(p.id) === String(mapped.id))) return prev;
                    return [mapped, ...(prev || [])];
                });

                // reset page to show the newest entry
                setCurrentPage(0);

                // clear the param so we don't re-add on future focuses
                try { navigation.setParams({ addedQuotation: undefined }); } catch (_) {}
            }
        } catch (e) {
            console.warn('Failed to insert addedQuotation param into list', e);
        }
    }, [route?.params?.addedQuotation]);

            // Subscribe to quick add/update events from AddPurchaseQuotation so list updates in-place
            useEffect(() => {
                const unsubAdd = subscribe('purchaseQuotation.added', (payload) => {
                    try {
                        const mapped = {
                            id: payload?.UUID || payload?.Uuid || payload?.Id || String(Math.random()),
                            quotationNumber: payload?.QuotationNo || payload?.QuotationNumber || '',
                            quotationTitle: payload?.QuotationTitle || payload?.Title || '',
                            customerName: resolveVendorName(payload?._raw || payload),
                            purchaseRequestNumber: payload?.PurchaseRequestNumber || payload?.PurchaseRequestNo || payload?.InquiryNo || '',
                            salesOrderNumber: payload?.QuotationNo || payload?.QuotationNumber || '',
                            status: payload?.Status || payload?.ApprovalStatus || '',
                            deliveryDate: payload?.DeliveryDate || '',
                            dueDate: payload?.DueDate || '',
                            _raw: payload?._raw || payload,
                        };
                        const hasStableId = !!(payload?.UUID || payload?.Uuid || payload?.Id || payload?.PurchaseQuotationHeaderId || payload?.PurchaseQuotationHeader_UUID || (payload?._raw && (payload._raw?.UUID || payload._raw?.Uuid || payload._raw?.Id)));
                        if (!hasStableId) {
                            // if there's no stable id from server, refresh the list to pick up authoritative data
                            onRefresh();
                        } else {
                            setOrders(prev => {
                                if (prev && prev.some(p => String(p.id) === String(mapped.id))) return prev;
                                return [mapped, ...(prev || [])];
                            });
                            setCurrentPage(0);
                        }
                    } catch (e) { console.warn('event added handler error', e); }
                });

                const unsubUpdate = subscribe('purchaseQuotation.updated', (payload) => {
                    try {
                        const mapped = {
                            id: payload?.UUID || payload?.Uuid || payload?.Id || String(Math.random()),
                            quotationNumber: payload?.QuotationNo || payload?.QuotationNumber || '',
                            quotationTitle: payload?.QuotationTitle || payload?.Title || '',
                            customerName: resolveVendorName(payload?._raw || payload),
                            purchaseRequestNumber: payload?.PurchaseRequestNumber || payload?.PurchaseRequestNo || payload?.InquiryNo || '',
                            salesOrderNumber: payload?.QuotationNo || payload?.QuotationNumber || '',
                            status: payload?.Status || payload?.ApprovalStatus || '',
                            deliveryDate: payload?.DeliveryDate || '',
                            dueDate: payload?.DueDate || '',
                            _raw: payload?._raw || payload,
                        };

                        const hasStableId = !!(payload?.UUID || payload?.Uuid || payload?.Id || payload?.PurchaseQuotationHeaderId || payload?.PurchaseQuotationHeader_UUID || (payload?._raw && (payload._raw?.UUID || payload._raw?.Uuid || payload._raw?.Id)));
                        if (!hasStableId) {
                            // if update payload lacks a stable id, refresh from server
                            onRefresh();
                        } else {
                            setOrders(prev => {
                                if (!prev || prev.length === 0) return [mapped];
                                const replaced = prev.map(p => (String(p.id) === String(mapped.id) ? mapped : p));
                                const found = prev.some(p => String(p.id) === String(mapped.id));
                                return found ? replaced : [mapped, ...prev];
                            });
                        }
                    } catch (e) { console.warn('event updated handler error', e); }
                });

                return () => { try { unsubAdd && unsubAdd(); unsubUpdate && unsubUpdate(); } catch(_){} };
            }, []);

    // If navigated back with an updated quotation, replace the matching entry in the list
    useEffect(() => {
        try {
            const updated = route?.params?.updatedQuotation;
            if (!updated) return;

            const mapped = {
                id: updated?.UUID || updated?.Uuid || updated?.Id || String(Math.random()),
                quotationNumber: updated?.QuotationNo || updated?.QuotationNumber || updated?.Quotation_No || updated?.Quotation || '',
                quotationTitle: updated?.QuotationTitle || updated?.Title || '',
                customerName: resolveVendorName(updated),
                purchaseRequestNumber: updated?.PurchaseRequestNumber || updated?.PurchaseRequestNo || updated?.InquiryNo || '',
                salesOrderNumber: updated?.QuotationNo || updated?.QuotationNumber || '',
                status: updated?.Status || updated?.ApprovalStatus || '',
                deliveryDate: updated?.DeliveryDate || '',
                dueDate: updated?.DueDate || '',
                _raw: updated,
            };

            const hasStableId = !!(updated?.UUID || updated?.Uuid || updated?.Id || updated?.PurchaseQuotationHeaderId || updated?.PurchaseQuotationHeader_UUID || (updated?._raw && (updated._raw?.UUID || updated._raw?.Uuid || updated._raw?.Id)));
            if (!hasStableId) {
                try { navigation.setParams({ updatedQuotation: undefined }); } catch (_) {}
                onRefresh();
                return;
            }

            setOrders(prev => {
                if (!prev || prev.length === 0) return [mapped];
                // replace existing matching id, otherwise prepend
                const replaced = prev.map(p => (String(p.id) === String(mapped.id) ? mapped : p));
                const found = prev.some(p => String(p.id) === String(mapped.id));
                return found ? replaced : [mapped, ...prev];
            });

            // clear param to avoid repeated updates
            try { navigation.setParams({ updatedQuotation: undefined }); } catch (_) {}
        } catch (e) {
            console.warn('Failed to apply updatedQuotation param into list', e);
        }
    }, [route?.params?.updatedQuotation]);

    const paginatedOrders = useMemo(() => {
        const start = currentPage * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, currentPage, itemsPerPage]);

    const rangeStart = filteredOrders.length === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = filteredOrders.length === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, filteredOrders.length);

    const handleQuickAction = async (order, actionLabel) => {
        if (actionLabel === 'Delete') {
            Alert.alert(
                'Confirm',
                'Are you sure you want to delete this purchase quotation?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                setLoadingOrders(true);
                                const headerUuid = order._raw?.UUID || order.id || null;
                                if (!headerUuid) throw new Error('Header UUID not found');
                                const resp = await deletePurchaseQuotationHeader({ headerUuid });
                                console.log('deletePurchaseQuotationHeader resp ->', resp);
                                // remove locally from list
                                setOrders(prev => prev.filter(o => o.id !== order.id));
                                Alert.alert('Success', 'Purchase quotation deleted');
                            } catch (err) {
                                console.error('deletePurchaseQuotationHeader error ->', err);
                                try { Alert.alert('Error', getErrorMessage(err, 'Unable to delete purchase quotation')); } catch (_) {}
                            } finally {
                                setLoadingOrders(false);
                            }
                        }
                    }
                ],
                { cancelable: true }
            );
            return;
        }

        if (actionLabel === 'Convert to Order') {
            try {
                setLoadingOrders(true);
                const quotationUUID = order._raw?.UUID || order.id || null;
                if (!quotationUUID) throw new Error('Quotation UUID not found');
                
                console.log('Converting quotation to order with UUID:', quotationUUID);
                const resp = await convertPurchaseQuotationToOrder({ quotationUUID });
                console.log('convertPurchaseQuotationToOrder resp ->', resp);
                
                // Extract header UUID from response for navigation
                const headerUuid = resp?.Data?.HeaderUUID || resp?.HeaderUUID || resp?.UUID || resp?.Data?.UUID || null;
                
                if (headerUuid) {
                    // Show success message from API response
                    const successMessage = resp?.Message || resp?.Data?.Message || 'Quotation converted to purchase order successfully';
                    Alert.alert('Success', successMessage, [
                        {
                            text: 'OK',
                            onPress: () => {
                                // Navigate to ManagePurchaseOrder with prefill data
                                navigation.navigate('ManagePurchaseOrder', {
                                    headerUuid,
                                    prefillHeader: resp?.Data || resp,
                                    fromConversion: true,
                                    sourceType: 'quotation'
                                });
                            }
                        }
                    ]);
                }
            } catch (err) {
                console.error('convertPurchaseQuotationToOrder error ->', err);
                try { Alert.alert('Error', getErrorMessage(err, 'Unable to convert quotation to order')); } catch (_) {}
            } finally {
                setLoadingOrders(false);
            }
            return;
        }

        if (actionLabel === 'Edit') {
            try {
                const headerUuid = order._raw?.UUID || order.id || null;
                navigation.navigate('AddPurchaseQuotation', { headerUuid, headerData: order._raw });
            } catch (err) {
                console.error('navigate to AddPurchaseQuotation error ->', err);
                Alert.alert('Error', 'Unable to open edit screen');
            }
            return;
        }

        Alert.alert('Action Triggered', `${actionLabel} clicked for ${order.salesOrderNumber}`);
    };

    const renderFooterActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', action: 'Delete', bg: '#FFE7E7', border: '#EF4444', color: '#EF4444' },
            // { icon: 'file-download', action: 'Download', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6' },
            { icon: 'logout', action: 'Convert to Order', bg: '#E5E7EB', border: '#6B7280', color: '#6B7280' },
            // { icon: 'visibility', action: 'View', bg: '#E6F9EF', border: '#22C55E', color: '#22C55E' },
            { icon: 'edit', action: 'Edit', bg: '#FFF4E5', border: '#F97316', color: '#F97316'  },
        ];

        return (
            <View style={styles.cardActionRow}>
                {buttons.map((btn) => (
                    <TouchableOpacity
                        key={`${order.id}-${btn.icon}`}
                        activeOpacity={0.85}
                        style={[styles.cardActionBtn , { backgroundColor: btn.bg, borderColor: btn.border }]}
                        onPress={() => handleQuickAction(order, btn.action)}
                    >
                        <Icon name={btn.icon} size={rf(3.8)} color={btn.color} />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const pageItems = useMemo(() => {
        if (totalPages === 0) return [];
        const items = ['prev'];
        const current = currentPage + 1;
        const sequence = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - current) <= 1) {
                sequence.push(i);
            } else if (sequence[sequence.length - 1] !== 'ellipsis') {
                sequence.push('ellipsis');
            }
        }
        sequence.forEach((entry) => items.push(entry === 'ellipsis' ? 'dots' : entry));
        items.push('next');
        return items;
    }, [currentPage, totalPages]);

    const handlePageChange = (pageIndex) => {
        const nextPage = Math.max(0, Math.min(pageIndex, Math.max(totalPages - 1, 0)));
        setCurrentPage(nextPage);
    };

    return (
        <View style={styles.screen}>
                <AppHeader
                title="View Purchase Quotation"
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.navigate('AddPurchaseQuotation')}
                rightButtonLabel="Add Purchase Quotation"
                showRight
            />
            <View style={styles.headerSeparator} />

            <View style={styles.controlsWrapper}>
                <View style={styles.showEntriesRow}>
                    <Text style={styles.showEntriesLabel}>Show</Text>
                    <Dropdown
                        placeholder={String(itemsPerPage)}
                        value={String(itemsPerPage)}
                        options={ITEMS_PER_PAGE_OPTIONS}
                        onSelect={(value) => {
                            const parsed = parseInt(value, 10);
                            if (!Number.isNaN(parsed)) {
                                setItemsPerPage(parsed);
                                setCurrentPage(0);
                            }
                        }}
                        hideSearch
                        inputBoxStyle={styles.dropdownInput}
                        style={styles.dropdownWrapper}
                        renderInModal={true}
                        dropdownListStyle={{ width: wp(18) }}
                    />
                    <Text style={styles.showEntriesLabel}>entries</Text>
                </View>
                <View style={styles.searchInputContainer}>
                    <Icon name="search" size={rf(3.5)} color={COLORS.textLight} />
                    <TextInput
                        placeholder="Search by customer, order no., status..."
                        placeholderTextColor={COLORS.textLight}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setCurrentPage(0);
                        }}
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}>
                {loadingOrders ? (
                    <View style={[styles.emptyState, { paddingVertical: hp(6) }]}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        {ordersError ? <Text style={[styles.emptyStateSubtitle, { marginTop: hp(1) }]}>Error loading quotations</Text> : null}
                    </View>
                ) : (
                    paginatedOrders.map((order) => (
                        <AccordionItem
                                key={order.id}
                                item={{
                                    soleExpenseCode: order.id,
                                    expenseName:  order.quotationNumber || '-',
                                    amount: order.quotationTitle  || '-',
                                    headerTitle: order.customerName || '-',
                                }}
                            isActive={activeOrderId === order.id}
                            onToggle={() => setActiveOrderId((prev) => (prev === order.id ? null : order.id))}
                            customRows={[
                                { label: 'Vendor Name', value: order.customerName },
                                { label: 'Purchase Request Number', value: order.purchaseRequestNumber || order._raw?.PurchaseRequestNumber || order._raw?.PurchaseRequestNo ||  order.quotationNumber || '—' },
                                { label: 'Quotation Title', value: order.quotationTitle || order.salesOrderNumber || 'Title' },
                                // { label: 'Due Date', value: order.dueDate },
                            ]}
                            headerLeftLabel="Quotation No."
                            headerRightLabel="Vendor Name "
                            footerComponent={renderFooterActions(order)}
                            headerRightContainerStyle={styles.headerRightContainer}
                        />
                    ))
                )}

                {(!loadingOrders && paginatedOrders.length === 0) && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No purchase quotations found</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Try adjusting your search keyword or create a new purchase quotation.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {filteredOrders.length > 0 && (
                <View style={styles.paginationContainer}>
                    <Text style={styles.pageInfoText}>
                        Showing {filteredOrders.length === 0 ? 0 : rangeStart} to {rangeEnd} of {filteredOrders.length} entries
                    </Text>
                    <View style={styles.paginationButtons}>
                        {pageItems.map((item, idx) => {
                            if (item === 'prev') {
                                const disabled = currentPage === 0;
                                return (
                                    <TouchableOpacity
                                        key={`prev-${idx}`}
                                        style={[styles.pageButton, disabled && styles.pageButtonDisabled]}
                                        onPress={() => handlePageChange(currentPage - 1)}
                                        disabled={disabled}
                                    >
                                        <Text style={[styles.pageButtonText, disabled && styles.pageButtonTextDisabled]}>Previous</Text>
                                    </TouchableOpacity>
                                );
                            }
                            if (item === 'next') {
                                const disabled = currentPage >= totalPages - 1;
                                return (
                                    <TouchableOpacity
                                        key={`next-${idx}`}
                                        style={[styles.pageButton, disabled && styles.pageButtonDisabled]}
                                        onPress={() => handlePageChange(currentPage + 1)}
                                        disabled={disabled}
                                    >
                                        <Text style={[styles.pageButtonText, disabled && styles.pageButtonTextDisabled]}>Next</Text>
                                    </TouchableOpacity>
                                );
                            }
                            if (item === 'dots') {
                                return (
                                    <View key={`dots-${idx}`} style={styles.pageDots}>
                                        <Text style={styles.pageNumberText}>...</Text>
                                    </View>
                                );
                            }
                            if (typeof item === 'number') {
                                const isActive = item === currentPage + 1;
                                return (
                                    <TouchableOpacity
                                        key={`page-${item}`}
                                        style={[styles.pageNumber, isActive && styles.pageNumberActive]}
                                        onPress={() => handlePageChange(item - 1)}
                                    >
                                        <Text style={[styles.pageNumberText, isActive && styles.pageNumberTextActive]}>{item}</Text>
                                    </TouchableOpacity>
                                );
                            }
                            return null;
                        })}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    headerSeparator: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    controlsWrapper: {
        paddingHorizontal: wp(4),
        // paddingTop: hp(2),
        paddingBottom: hp(1.5),
        backgroundColor: COLORS.bg,
        flexDirection: 'row',
        justifyContent: 'space-between',
        // flexWrap: 'wrap',
        // gap: wp(4),
    },
    showEntriesRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
    },
    showEntriesLabel: {
        fontSize: rf(3.2),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
    },
    dropdownWrapper: {
        width: wp(18),
    },
    dropdownInput: {
        paddingVertical: hp(0.4),
        borderRadius: RADIUS.md,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.lg,
        paddingHorizontal: wp(2.5),
        backgroundColor: '#fff',
        // gap: wp(2),
        width: wp(50),
        height: hp(5.3),
        marginTop: hp(0.9),
    },
    searchInput: {
        flex: 1,
        fontSize: rf(3.4),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
    },
    pageInfoText: {
        fontSize: rf(3.2),
        color: COLORS.textLight,
        marginBottom: hp(0.8),
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
    },
    paginationButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(2),
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    pageButton: {
        paddingVertical: hp(0.8),
        paddingHorizontal: wp(3),
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
    },
    pageButtonDisabled: {
        backgroundColor: COLORS.border,
    },
    pageButtonText: {
        fontSize: rf(3.2),
        color: COLORS.primary,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
    },
    pageButtonTextDisabled: {
        color: COLORS.textLight,
    },
    pageNumber: {
        minWidth: wp(9),
        paddingVertical: hp(0.8),
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    pageNumberActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    pageNumberText: {
        fontSize: rf(3.2),
        color: COLORS.primary,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
    },
    pageNumberTextActive: {
        color: '#fff',
    },
    pageDots: {
        paddingHorizontal: wp(2),
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: wp(8),
    },
    listContent: {
        paddingHorizontal: wp(4),
        paddingBottom: hp(4),
        // paddingTop: hp(1),
    },
    headerRightContainer: {
        maxWidth: '70%',
    },
    cardActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: hp(1.5),
    },
    cardActionBtn: {
        width: wp(10),
        height: wp(10),
        borderRadius: wp(2),
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: hp(0.1) },
        shadowOpacity: 0.08,
        shadowRadius: hp(0.2),
        elevation: 1,
    },
    paginationContainer: {
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.5),
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: '#f8f9fb',
    },
    emptyState: {
        paddingVertical: hp(8),
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateTitle: {
        fontSize: rf(3.6),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        marginBottom: hp(0.5),
    },
    emptyStateSubtitle: {
        fontSize: rf(3),
        color: COLORS.textLight,
        textAlign: 'center',
        paddingHorizontal: wp(5),
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
    },
});

export default ViewPurchaseQuotation;