import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Modal, ActivityIndicator, RefreshControl } from 'react-native';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';
import { getSalesOrderHeaders, getSalesHeader, deleteSalesOrderHeader, getSalesOrderSlip, convertSalesOrderToInvoice, getSalesOrderRelatedDocuments, getSalesInvoiceSlip, getSalesPerformaInvoiceSlip } from '../../../../api/authServices';

// sales orders will be fetched from API

const ITEMS_PER_PAGE_OPTIONS = ['5', '10', '20', '50'];

const ViewSalesOrder = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(Number(ITEMS_PER_PAGE_OPTIONS[1]));
    const [currentPage, setCurrentPage] = useState(0);
    const [orders, setOrders] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [isFetchingHeader, setIsFetchingHeader] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [orderRelatedModalVisible, setOrderRelatedModalVisible] = useState(false);
    const [orderRelatedLoading, setOrderRelatedLoading] = useState(false);
    const [orderRelatedData, setOrderRelatedData] = useState({ SalesInvoices: [], ProformaInvoices: [] });

    const filteredOrders = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return orders;
        return orders.filter((order) => {
            const haystack = `${order.SalesOrderNo || order.salesOrderNumber || ''} ${order.CustomerName || order.customerName || ''} ${order.ContactPerson || ''} ${order.Status || order.status || ''}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [searchQuery, orders]);

    const totalPages = useMemo(() => {
        if (totalRecords === 0) return 0;
        return Math.ceil(totalRecords / itemsPerPage);
    }, [totalRecords, itemsPerPage]);

    useEffect(() => {
        if (totalPages === 0) {
            if (currentPage !== 0) setCurrentPage(0);
            return;
        }
        if (currentPage > totalPages - 1) {
            setCurrentPage(totalPages - 1);
        }
    }, [totalPages, currentPage]);

    const paginatedOrders = useMemo(() => {
        const start = currentPage * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, currentPage, itemsPerPage]);

    const rangeStart = totalRecords === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = totalRecords === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, totalRecords);

    const handleQuickAction = async (order, actionLabel) => {
        if (actionLabel === 'Forward') {
            try {
                const salesOrderUuid = order?.raw?.UUID || order?.raw?.SalesOrderUUID || order?.id;
                if (!salesOrderUuid) {
                    Alert.alert('Error', 'Sales Order UUID not found');
                    return;
                }
                
                console.log('Converting Sales Order to Invoice:', salesOrderUuid);
                const result = await convertSalesOrderToInvoice({ salesOrderUuid });
                console.log('Convert result:', result);
                const HeaderUUID = result?.Data?.HeaderUUID;
                if (!HeaderUUID) {
                    Alert.alert('Error', 'Failed to retrieve Invoice UUID after conversion');
                    return;
                }
                console.log(HeaderUUID,'here is the header uuid');
                
                
                Alert.alert(
                    'Success', 
                    'Sales Order converted to Invoice successfully',
                    [
                        { text: 'OK', onPress: () => { 
                            // Pass both headerUuid (lowercase) and HeaderUUID (uppercase)
                            // and include the API response as prefillHeader so AddSalesInvoice can prefill immediately
                            navigation.navigate('AddSalesInvoice', { headerUuid: HeaderUUID, HeaderUUID: HeaderUUID, prefillHeader: result, from: 'ViewSalesOrder' }); 
                            fetchOrders(); 
                        } }
                    ]
                );
            } catch (error) {
                console.log('Convert error:', error?.message || error);
                const errorMessage = error?.message || 'Unable to convert sales order to invoice. Please try again.';
                Alert.alert('Conversion Failed', errorMessage);
            }
        } else if (actionLabel === 'View') {
            try {
                // open related documents bottom-sheet
                setOrderRelatedModalVisible(true);
                await fetchSalesOrderRelatedDocuments(order);
            } catch (err) {
                console.log('fetchSalesOrderRelatedDocuments error ->', err?.message || err);
                Alert.alert('Error', 'Unable to fetch related documents');
                setOrderRelatedModalVisible(false);
            }
        } else {
            Alert.alert('Action Triggered', `${actionLabel} clicked for ${order.salesOrderNumber}`);
        }
    };

    const fetchSalesOrderRelatedDocuments = async (order) => {
        try {
            setOrderRelatedLoading(true);
            const salesOrderUuid = order?.raw?.UUID || order?.raw?.SalesOrderUUID || order?.id;
            if (!salesOrderUuid) throw new Error('Sales Order UUID not found');
            const resp = await getSalesOrderRelatedDocuments({ salesOrderUuid });
            // Server returns { Success, Message, Data }
            const data = resp?.Data || resp || {};
            const salesInvoices = data?.SalesInvoices || data?.SalesInvoice || [];
            const proformas = data?.ProformaInvoices || data?.SalesProformas || [];
            setOrderRelatedData({ SalesInvoices: salesInvoices, ProformaInvoices: proformas });
        } catch (err) {
            console.log('getSalesOrderRelatedDocuments error ->', err?.message || err);
            setOrderRelatedData({ SalesInvoices: [], ProformaInvoices: [] });
            throw err;
        } finally {
            setOrderRelatedLoading(false);
        }
    };

    const handleOpenSalesInvoiceSlip = async (invoice) => {
        try {
            const uuid = invoice?.UUID || invoice?.InvoiceUUID || invoice?.id;
            if (!uuid) {
                Alert.alert('Error', 'Invoice identifier not found');
                return;
            }
            const pdfBase64 = await getSalesInvoiceSlip({ headerUuid: uuid });
            if (!pdfBase64) {
                Alert.alert('Error', 'Invoice PDF not available');
                return;
            }
            setOrderRelatedModalVisible(false);
            navigation.navigate('FileViewerScreen', { pdfBase64, fileName: invoice?.DocumentNumber || `Invoice_${uuid}`, opportunityTitle: invoice?.DocumentNumber || 'Invoice', companyName: '' });
        } catch (err) {
            console.log('handleOpenSalesInvoiceSlip error ->', err?.message || err);
            Alert.alert('Error', err?.message || 'Unable to open invoice PDF');
        }
    };

    const handleOpenSalesPerformaSlip = async (pf) => {
        try {
            const uuid = pf?.UUID || pf?.ProformaUUID || pf?.id;
            if (!uuid) {
                Alert.alert('Error', 'Performa identifier not found');
                return;
            }
            const pdfBase64 = await getSalesPerformaInvoiceSlip({ headerUuid: uuid });
            if (!pdfBase64) {
                Alert.alert('Error', 'Performa PDF not available');
                return;
            }
            setOrderRelatedModalVisible(false);
            navigation.navigate('FileViewerScreen', { pdfBase64, fileName: pf?.DocumentNumber || `Performa_${uuid}`, opportunityTitle: pf?.DocumentNumber || 'Performa Invoice', companyName: '' });
        } catch (err) {
            console.log('handleOpenSalesPerformaSlip error ->', err?.message || err);
            Alert.alert('Error', err?.message || 'Unable to open performa PDF');
        }
    };

    const fetchOrders = async ({ start = 0, length = itemsPerPage, searchValue = '' } = {}) => {
        try {
            setLoading(true);
            const resp = await getSalesOrderHeaders({ start, length, searchValue });
            console.log('getSalesOrderHeaders ->', resp);
            const records = resp?.Data?.Records || resp?.Data || resp || [];
            // Normalize records to expected UI fields
            const normalized = (records || []).map((r, idx) => ({
                id: r?.UUID || r?.SalesOrderUUID || r?.SalesOrderNo || `so-${idx}`,
                salesOrderNumber: r?.SalesOrderNo || r?.SalesOrderNumber || r?.SalesOrderNumber || r?.SalesOrderNo || '',
                customerName: r?.CustomerName || r?.Customer || r?.CustomerDisplayName || '',
                // API may return OrderDate as in example; prefer DeliveryDate, then OrderDate, then ExpectedDeliveryDate
                deliveryDate: r?.DeliveryDate || r?.OrderDate || r?.ExpectedDeliveryDate || '',
                dueDate: r?.DueDate || r?.PaymentDueDate || '',
                amount: r?.Amount || r?.TotalAmount || r?.NetAmount || '',
                raw: r,
            }));
            setOrders(normalized);
            const total = typeof resp?.Data?.TotalCount === 'number' ? resp.Data.TotalCount : normalized.length;
            setTotalRecords(total);
        } catch (e) {
            console.log('getSalesOrderHeaders error ->', e?.message || e);
            setOrders([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders({ start: currentPage * itemsPerPage, length: itemsPerPage, searchValue: searchQuery.trim() });
    }, [currentPage, itemsPerPage]);

    const onRefresh = async () => {
        try {
            setRefreshing(true);
            await fetchOrders({ start: currentPage * itemsPerPage, length: itemsPerPage, searchValue: searchQuery.trim() });
        } catch (err) {
            console.warn('Refresh failed', err);
        } finally {
            setRefreshing(false);
        }
    };

    const handleEditOrder = async (order) => {
        setIsFetchingHeader(true);
        try {
            // navigate to ManageSalesOrder with headerUuid so that screen fetches and prefills itself
            navigation.navigate('ManageSalesOrder', { headerUuid: order.id });
        } catch (e) {
            console.log('getSalesHeader error ->', e?.message || e);
            Alert.alert('Error', 'Unable to fetch order details for editing.');
        } finally {
            setIsFetchingHeader(false);
        }
    };

    const handleDeleteOrder = (order) => {
        Alert.alert(
            'Confirm Delete',
            `Are you sure you want to delete ${order.salesOrderNumber || 'this order'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setLoading(true);
                            await deleteSalesOrderHeader({ headerUuid: order.id });
                            Alert.alert('Deleted', 'Sales order deleted successfully');
                            // refresh list
                            fetchOrders({ start: currentPage * itemsPerPage, length: itemsPerPage, searchValue: searchQuery.trim() });
                        } catch (e) {
                            console.error('deleteSalesOrderHeader error ->', e?.message || e);
                            Alert.alert('Error', e?.message || 'Unable to delete sales order');
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleDownloadPDF = async (order) => {
        try {
            if (!order?.id) {
                Alert.alert('Error', 'Sales order not found');
                return;
            }

            setIsGeneratingPDF(true);
            const pdfBase64 = await getSalesOrderSlip({ headerUuid: order.id });
            
            if (!pdfBase64) {
                Alert.alert('Error', 'Sales order PDF is not available right now.');
                return;
            }

            // Navigate to FileViewerScreen with PDF data
            navigation.navigate('FileViewerScreen', {
                pdfBase64,
                fileName: `SalesOrder_${order.salesOrderNumber || order.id}`,
                opportunityTitle: order.salesOrderNumber || 'Sales Order',
                companyName: order.customerName || '',
            });
        } catch (error) {
            console.log('handleDownloadPDF error:', error?.message || error);
            Alert.alert('Error', error?.message || 'Unable to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const renderFooterActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', action: 'Delete', bg: '#FFE7E7', border: '#EF4444', color: '#EF4444', action: 'Delete' },
            { icon: 'file-download', action: 'Download', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6', action: 'Download' },
            { icon: 'logout', action: 'Forward', bg: '#E5E7EB', border: '#6B7280', color: '#6B7280', action: 'Forward' },
            { icon: 'visibility', action: 'View', bg: '#E6F9EF', border: '#22C55E', color: '#22C55E', action: 'View' },
            { icon: 'edit', action: 'Edit', bg: '#FFF4E5', border: '#F97316', color: '#F97316', action: 'Update Status'  },
        ];

        return (
            <View style={styles.cardActionRow}>
                {buttons.map((btn) => (
                    <TouchableOpacity
                        key={`${order.id}-${btn.icon}`}
                        activeOpacity={0.85}
                        style={[styles.cardActionBtn , { backgroundColor: btn.bg, borderColor: btn.border }]}
                        onPress={() => {
                            if (btn.icon === 'edit') {
                                handleEditOrder(order);
                            } else if (btn.icon === 'delete-outline') {
                                handleDeleteOrder(order);
                            } else if (btn.icon === 'file-download') {
                                handleDownloadPDF(order);
                            } else {
                                handleQuickAction(order, btn.action);
                            }
                        }}
                        disabled={btn.icon === 'file-download' && isGeneratingPDF}
                    >
                        {btn.icon === 'file-download' && isGeneratingPDF ? (
                            <ActivityIndicator size="small" color={btn.color} />
                        ) : (
                            <Icon name={btn.icon} size={rf(3.8)} color={btn.color} />
                        )}
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
                    title="View Sales Order"
                    onLeftPress={() => {
                        // Prevent GO_BACK action when there's no previous screen in the navigator
                        if (navigation && typeof navigation.canGoBack === 'function' && navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            // Fallback: navigate to a safe root screen. Change 'Dashboard' to your app's main screen name if needed.
                            try { navigation.replace('Main'); } catch (e) { try { navigation.navigate('Main'); } catch (_) { /* ignore */ } }
                        }
                    }}
                    onRightPress={() => navigation.navigate('ManageSalesOrder', { mode: 'add' })}
                    rightButtonLabel="Add Sales Order"
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
                {loading && (
                    <View style={{ paddingVertical: hp(4), alignItems: 'center' }}>
                        <Text style={{ color: COLORS.textLight }}>Loading sales orders...</Text>
                    </View>
                )}
                {paginatedOrders.map((order) => (
                        <AccordionItem
                            key={order.id}
                            item={{
                                soleExpenseCode: order.id,
                                expenseName: order.salesOrderNumber,
                                amount: order.amount,
                            }}
                            isActive={activeOrderId === order.id}
                            onToggle={() => setActiveOrderId((prev) => (prev === order.id ? null : order.id))}
                        customRows={[
                            { label: 'Customer Name', value: order.customerName },
                            { label: 'Amount', value: order.amount },
                            { label: 'Delivery Date', value: order.deliveryDate },
                            { label: 'Due Date', value: order.dueDate },
                        ]} 
                            headerLeftLabel="Sales Order Number"
                        headerRightLabel="Amount"
                            footerComponent={renderFooterActions(order)}
                            headerRightContainerStyle={styles.headerRightContainer}
                        />
                ))}

                {paginatedOrders.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No sales orders found</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Try adjusting your search keyword or create a new sales order.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Related Documents bottom-sheet modal for Sales Order */}
            <Modal transparent visible={orderRelatedModalVisible} animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.modalTitle}>Related Documents</Text>
                            <TouchableOpacity onPress={() => setOrderRelatedModalVisible(false)}>
                                <Icon name="close" size={rf(3.6)} color={COLORS.textLight} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.modalBody}>
                            {orderRelatedLoading ? (
                                <View style={{ paddingVertical: hp(4), alignItems: 'center' }}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                </View>
                            ) : (
                                <View>
                                    {Array.isArray(orderRelatedData?.SalesInvoices) && orderRelatedData.SalesInvoices.length > 0 && (
                                        <View style={{ marginBottom: hp(1.5) }}>
                                            <Text style={{ fontFamily: TYPOGRAPHY.fontFamilyBold, color: COLORS.text, marginBottom: hp(0.6) }}>Sales Invoices</Text>
                                            {orderRelatedData.SalesInvoices.map((inv) => (
                                                <TouchableOpacity key={inv?.UUID || inv?.id} style={{ paddingVertical: hp(1), borderBottomWidth: 1, borderBottomColor: COLORS.border }} onPress={() => handleOpenSalesInvoiceSlip(inv)}>
                                                    <Text style={{ color: COLORS.primary, fontWeight: '400' }}>{inv?.DocumentNumber || inv?.InvoiceNo || inv?.DocumentNo}</Text>
                                                    {inv?.DocumentDate ? <Text style={{ color: COLORS.textLight, fontSize: rf(2.8) }}>{inv.DocumentDate}</Text> : null}
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    <View>
                                        <Text style={{ fontFamily: TYPOGRAPHY.fontFamilyBold, color: COLORS.text, marginBottom: hp(0.6) }}>Proforma Invoices</Text>
                                        {Array.isArray(orderRelatedData?.ProformaInvoices) && orderRelatedData.ProformaInvoices.length > 0 ? (
                                            orderRelatedData.ProformaInvoices.map((pf) => (
                                                <TouchableOpacity key={pf?.UUID || pf?.id} style={{ paddingVertical: hp(1), borderBottomWidth: 1, borderBottomColor: COLORS.border }} onPress={() => handleOpenSalesPerformaSlip(pf)}>
                                                    <Text style={{ color: COLORS.primary, fontWeight: '400' }}>{pf?.DocumentNumber || pf?.ProformaNo || pf?.DocumentNo}</Text>
                                                    {pf?.DocumentDate ? <Text style={{ color: COLORS.textLight, fontSize: rf(2.8) }}>{pf.DocumentDate}</Text> : null}
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <Text style={{fontSize: rf(3), color: COLORS.textLight }}>No proforma invoice records found.</Text>
                                        )}
                                    </View>

                                    {(!orderRelatedData?.SalesInvoices?.length && !orderRelatedData?.ProformaInvoices?.length) && (
                                        <View style={{ paddingVertical: hp(4), alignItems: 'center' }}>
                                            <Text style={{ color: COLORS.textLight }}>No related documents found.</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Loading modal while fetching header for edit */}
            <Modal transparent visible={isFetchingHeader} animationType="none">
                <View style={{ flex: 1, backgroundColor: '#00000055', alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ padding: wp(4), backgroundColor: '#fff', borderRadius: 8, alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: hp(1), fontSize: rf(3.2), color: COLORS.text }}>Loading order details...</Text>
                    </View>
                </View>
            </Modal>

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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        backgroundColor: '#fff',
        borderTopLeftRadius: wp(3),
        borderTopRightRadius: wp(3),
        padding: wp(5),
        maxHeight: hp(85),
        width: '100%'
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: { fontSize: rf(3.6), fontWeight: '700', color: COLORS.text },
    modalBody: { marginTop: hp(1) },
});

export default ViewSalesOrder;