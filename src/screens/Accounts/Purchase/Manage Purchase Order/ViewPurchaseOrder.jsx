import React, { useEffect, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal } from 'react-native';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';
import { getPurchaseOrderHeaders, deletePurchaseOrderHeader, convertPurchaseOrderToInvoice, getPurchaseOrderSlip, getPurchaseOrderRelatedDocuments, getPurchaseInvoiceSlip, getPurchasePerformaInvoiceSlip } from '../../../../api/authServices';
import { getErrorMessage } from '../../../../utils/errorMessage';

// Will be loaded from server


const ITEMS_PER_PAGE_OPTIONS = ['5', '10', '20', '50'];

const ViewPurchaseOrder = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(Number(ITEMS_PER_PAGE_OPTIONS[1]));
    const [currentPage, setCurrentPage] = useState(0);
    const [orders, setOrders] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [orderRelatedModalVisible, setOrderRelatedModalVisible] = useState(false);
    const [orderRelatedLoading, setOrderRelatedLoading] = useState(false);
    const [orderRelatedData, setOrderRelatedData] = useState({ PurchaseInvoices: [], ProformaInvoices: [] });
    const [refreshing, setRefreshing] = useState(false);

    // Server-backed paging: fetch whenever page, pageSize or search changes
    const totalPages = useMemo(() => {
        if (!totalRecords) return 0;
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

    const paginatedOrders = orders;
    const rangeStart = totalRecords === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = totalRecords === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, totalRecords);

    // Load purchase orders from server
    const loadPurchaseOrders = async () => {
        try {
            setLoading(true);
            const start = currentPage * itemsPerPage;
            const resp = await getPurchaseOrderHeaders({ start, length: itemsPerPage, searchValue: searchQuery });
            console.log(resp,'response');
            
            const data = resp?.Data || resp || {};
            const rawList = data?.Records || data?.List || data?.Items || data || [];
            const list = Array.isArray(rawList) ? rawList : [];
            console.log(list,'list11');
            
            const normalized = list.map(it => ({
                id: it?.UUID || it?.Id || it?.PurchaseOrderUUID || it?.PurchaseOrderId || it?.PurchaseOrderNo || String(Math.random()),
                purchaseOrderNumber: it?.PurchaseOrderNo || it?.PurchaseOrderNumber || it?.PurchaseOrder || it?.PurchaseOrderId || '',
                vendorName: it?.VendorName || it?.Vendor || it?.CustomerName || it?.Customer || '',
                projectName: it?.ProjectTitle || it?.ProjectName || it?.Project || '',
                deliveryDate: it?.DeliveryDate || it?.DeliveryDateUTC || it?.OrderDate || '',
                // amount may be returned under different keys depending on API
                amount: it?.Amount || it?.TotalAmount || it?.NetAmount || it?.OrderAmount || '',
                item: { itemType: '', name: '' },
                quantity: it?.LineCount || it?.TotalLines || 0,
                raw: it,
            }));
            setOrders(normalized);
            const total = data?.TotalRecords ?? data?.total ?? data?.Total ?? list.length;
            setTotalRecords(Number(total) || normalized.length);
        } catch (err) {
            console.warn('getPurchaseOrderHeaders failed', err?.message || err);
            setOrders([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        try {
            setRefreshing(true);
            await loadPurchaseOrders();
        } catch (err) {
            console.warn('Refresh failed', err);
        } finally {
            setRefreshing(false);
        }
    };

    // Reload data when page, pageSize or search changes and also when screen gains focus
    useEffect(() => {
        loadPurchaseOrders();
    }, [currentPage, itemsPerPage, searchQuery]);

    // Also refresh when screen comes into focus (e.g. after add/edit on another screen)
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadPurchaseOrders();
        });
        return unsubscribe;
    }, [navigation]);

    const handleDownloadPDF = async (order) => {
        try {
            if (!order?.id) {
                Alert.alert('Error', 'Purchase order not found');
                return;
            }

            setIsGeneratingPDF(true);
            const pdfBase64 = await getPurchaseOrderSlip({ headerUuid: order.id });
            
            if (!pdfBase64) {
                Alert.alert('Error', 'Purchase order PDF is not available right now.');
                return;
            }

            // Navigate to FileViewerScreen with PDF data
            navigation.navigate('FileViewerScreen', {
                pdfBase64,
                fileName: `PurchaseOrder_${order.purchaseOrderNumber || order.id}`,
                opportunityTitle: order.purchaseOrderNumber || 'Purchase Order',
                companyName: order.vendorName || '',
            });
        } catch (error) {
            console.log('handleDownloadPDF error:', error?.message || error);
            const errorMessage = error?.message || 'Unable to generate PDF. Please try again.';
            Alert.alert('PDF Generation Failed', errorMessage);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleQuickAction = async (order, actionLabel) => {
        switch (actionLabel) {
            case 'Edit':
                // Navigate to ManagePurchaseOrder and pass the header UUID for prefill
                navigation.navigate('ManagePurchaseOrder', { headerUuid: order.id, HeaderUUID: order.id, UUID: order.id, origin: 'ViewPurchaseOrder' });
                return;
            case 'View':
                // Open related documents bottom-sheet (purchase invoices / performa)
                setOrderRelatedModalVisible(true);
                try {
                    await fetchPurchaseOrderRelatedDocuments(order);
                } catch (err) {
                    console.warn('fetchPurchaseOrderRelatedDocuments error ->', err?.message || err);
                    setOrderRelatedModalVisible(false);
                    Alert.alert('Error', getErrorMessage(err, 'Unable to fetch related documents'));
                }
                return;
            case 'Delete':
                Alert.alert(
                    'Confirm Delete',
                    `Are you sure you want to delete ${order.purchaseOrderNumber || 'this purchase order'}?`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: async () => {
                                try {
                                    setLoading(true);
                                    const resp = await deletePurchaseOrderHeader({ headerUuid: order.id });
                                    console.log('deletePurchaseOrderHeader resp ->', resp);
                                    // remove from local list
                                    setOrders(prev => prev.filter(o => o.id !== order.id));
                                    setTotalRecords(prev => Math.max(0, (Number(prev) || 0) - 1));
                                    Alert.alert('Deleted', 'Purchase order deleted successfully');
                                } catch (err) {
                                    console.warn('deletePurchaseOrderHeader failed', err && (err.message || err));
                                    Alert.alert('Error', getErrorMessage(err, 'Unable to delete purchase order'));
                                } finally {
                                    setLoading(false);
                                }
                            }
                        }
                    ],
                );
                return;
            case 'Download':
                handleDownloadPDF(order);
                return;
            case 'Forward':
                // Convert Purchase Order to Invoice
                (async () => {
                    try {
                        setLoading(true);
                        console.log('🔄 [ViewPurchaseOrder] Converting purchase order to invoice:', order.id);
                        
                        const conversionResponse = await convertPurchaseOrderToInvoice({ 
                            purchaseOrderUuid: order.id 
                        });
                        
                        console.log('✅ [ViewPurchaseOrder] Conversion response:', conversionResponse);
                        
                        // Navigate to AddPurchaseInvoice with headerUuid for prefill
                        if (conversionResponse) {
                            // Extract headerUuid from the response structure
                            const headerUuid = conversionResponse?.Data?.HeaderUUID || 
                                             conversionResponse?.headerUuid?.Data?.HeaderUUID || 
                                             conversionResponse?.headerUuid?.HeaderUUID || 
                                             conversionResponse?.HeaderUUID ||
                                             conversionResponse?.headerUuid;
                            
                            console.log('🔄 [ViewPurchaseOrder] Navigating to AddPurchaseInvoice with headerUuid:', headerUuid);
                            console.log('🔄 [ViewPurchaseOrder] Full conversion response:', conversionResponse);
                            
                            navigation.navigate('AddPurchaseInvoice', { 
                                headerUuid: headerUuid,
                                origin: 'ViewPurchaseOrder'
                            });
                        } else {
                            console.log('⚠️ [ViewPurchaseOrder] No headerUuid in conversion response, navigating without prefill');
                            navigation.navigate('AddPurchaseInvoice', { 
                                origin: 'ViewPurchaseOrder'
                            });
                        }
                        
                    } catch (err) {
                        console.warn('deletePurchaseOrderHeader failed', err && (err.message || err));
                        Alert.alert('Error', getErrorMessage(err, 'Unable to delete purchase order'));
                    } finally {
                        setLoading(false);
                    }
                })();
                return;
            default:
                Alert.alert('Action Triggered', `${actionLabel} clicked for ${order.purchaseOrderNumber}`);
        }
    };

    const fetchPurchaseOrderRelatedDocuments = async (order) => {
        try {
            setOrderRelatedLoading(true);
            const purchaseOrderUuid = order?.raw?.UUID || order?.raw?.PurchaseOrderUUID || order?.id;
            if (!purchaseOrderUuid) throw new Error('Purchase Order UUID not found');
            const resp = await getPurchaseOrderRelatedDocuments({ purchaseOrderUuid });
            const data = resp?.Data || resp || {};
            // purchase invoices may be under multiple keys depending on backend
            const purchaseInvoices = data?.PurchaseInvoices || data?.PurchaseInvoice || data?.Invoices || data?.PurchaseInvoiceList || [];
            // some APIs use "PerformaInvoices" (typo) while others use "ProformaInvoices"
            const proformas = data?.ProformaInvoices || data?.PerformaInvoices || data?.PurchaseProformas || data?.SalesProformas || [];
            setOrderRelatedData({ PurchaseInvoices: purchaseInvoices, ProformaInvoices: proformas });
        } catch (err) {
            console.log('getPurchaseOrderRelatedDocuments error ->', err?.message || err);
            setOrderRelatedData({ PurchaseInvoices: [], ProformaInvoices: [] });
            throw err;
        } finally {
            setOrderRelatedLoading(false);
        }
    };

    const handleOpenPurchaseInvoiceSlip = async (invoice) => {
        try {
            const uuid = invoice?.UUID || invoice?.InvoiceUUID || invoice?.id;
            if (!uuid) {
                Alert.alert('Error', 'Invoice identifier not found');
                return;
            }
            const pdfBase64 = await getPurchaseInvoiceSlip({ headerUuid: uuid });
            if (!pdfBase64) {
                Alert.alert('Error', 'Invoice PDF not available');
                return;
            }
            setOrderRelatedModalVisible(false);
            navigation.navigate('FileViewerScreen', { pdfBase64, fileName: invoice?.DocumentNumber || `Invoice_${uuid}`, opportunityTitle: invoice?.DocumentNumber || 'Invoice', companyName: '' });
        } catch (err) {
            console.log('handleOpenPurchaseInvoiceSlip error ->', err?.message || err);
            Alert.alert('Error', getErrorMessage(err, 'Unable to open invoice PDF'));
        }
    };

    const handleOpenPurchasePerformaSlip = async (pf) => {
        try {
            const uuid = pf?.UUID || pf?.ProformaUUID || pf?.id;
            if (!uuid) {
                Alert.alert('Error', 'Performa identifier not found');
                return;
            }
            const pdfBase64 = await getPurchasePerformaInvoiceSlip({ headerUuid: uuid });
            if (!pdfBase64) {
                Alert.alert('Error', 'Performa PDF not available');
                return;
            }
            setOrderRelatedModalVisible(false);
            navigation.navigate('FileViewerScreen', { pdfBase64, fileName: pf?.DocumentNumber || `Performa_${uuid}`, opportunityTitle: pf?.DocumentNumber || 'Performa Invoice', companyName: '' });
        } catch (err) {
            console.log('handleOpenPurchasePerformaSlip error ->', err?.message || err);
            Alert.alert('Error', getErrorMessage(err, 'Unable to open performa PDF'));
        }
    };

    const renderFooterActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', action: 'Delete', bg: '#FFE7E7', border: '#EF4444', color: '#EF4444' },
            { icon: 'file-download', action: 'Download', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6' },
            { icon: 'logout', action: 'Forward', bg: '#E5E7EB', border: '#6B7280', color: '#6B7280' },
            { icon: 'visibility', action: 'View', bg: '#E6F9EF', border: '#22C55E', color: '#22C55E' },
            { icon: 'edit', action: 'Edit', bg: '#FFF4E5', border: '#F97316', color: '#F97316' },
        ];

        return (
            <View style={styles.cardActionRow}>
                {buttons.map((btn) => (
                    <TouchableOpacity
                        key={`${order.id}-${btn.icon}`}
                        activeOpacity={0.85}
                        style={[styles.cardActionBtn, { backgroundColor: btn.bg, borderColor: btn.border }]}
                        onPress={() => handleQuickAction(order, btn.action)}
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
                title="View Purchase Order"
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.navigate('ManagePurchaseOrder')}
                rightButtonLabel="Add Purchase Order"
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
                {paginatedOrders.map((order) => (
                    <AccordionItem
                        key={order.id}
                        item={{
                            headerTitle: order.purchaseOrderNumber || order.vendorName || order.raw?.PurchaseOrderNo || '',
                            headerValue: order.amount || order.quantity || '',
                            // keep raw for downstream actions
                            ...order,
                        }}

                        isActive={activeOrderId === order.id}
                        onToggle={() => setActiveOrderId(prev => prev === order.id ? null : order.id)}

                        customRows={[
                            { label: "Vendor Name", value: order.vendorName || order.raw?.VendorName || '-' },
                            { label: "Project Name", value: order.projectName || order.raw?.ProjectTitle || '-' },
                            { label: "Delivery Date", value: order.deliveryDate || '-' },
                            { label: "Total Amount", value: order.amount || '-' }
                        ]}

                        headerLeftLabel="Purchase Order No"
                        headerRightLabel="Total Amount"
                        footerComponent={renderFooterActions(order)}
                        headerRightContainerStyle={styles.headerRightContainer}
                    />

                ))}

                {paginatedOrders.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No purchase orders found</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Try adjusting your search keyword or create a new purchase order.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {/* Related Documents bottom-sheet modal for Purchase Order */}
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
                                    <View style={{ marginBottom: hp(1.5) }}>
                                        <Text style={{ fontFamily: TYPOGRAPHY.fontFamilyBold, color: COLORS.text, marginBottom: hp(0.6) }}>Purchase Invoices</Text>
                                        {Array.isArray(orderRelatedData?.PurchaseInvoices) && orderRelatedData.PurchaseInvoices.length > 0 ? (
                                            orderRelatedData.PurchaseInvoices.map((inv) => (
                                                <TouchableOpacity key={inv?.UUID || inv?.id} style={{ paddingVertical: hp(1), borderBottomWidth: 1, borderBottomColor: COLORS.border }} onPress={() => handleOpenPurchaseInvoiceSlip(inv)}>
                                                    <Text style={{ color: COLORS.primary, fontWeight: '400' }}>{inv?.DocumentNumber || inv?.ProformaNo || inv?.InvoiceNo || inv?.DocumentNo}</Text>
                                                    {(inv?.DocumentDate || inv?.InvoiceDate) ? <Text style={{ color: COLORS.textLight, fontSize: rf(2.8) }}>{inv.DocumentDate || inv.InvoiceDate}</Text> : null}
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <Text style={{ fontSize: rf(3), color: COLORS.textLight }}>No purchase invoice records found.</Text>
                                        )}
                                    </View>

                                    <View>
                                        <Text style={{ fontFamily: TYPOGRAPHY.fontFamilyBold, color: COLORS.text, marginBottom: hp(0.6) }}>Proforma Invoices</Text>
                                        {Array.isArray(orderRelatedData?.ProformaInvoices) && orderRelatedData.ProformaInvoices.length > 0 ? (
                                            orderRelatedData.ProformaInvoices.map((pf) => (
                                                <TouchableOpacity key={pf?.UUID || pf?.id} style={{ paddingVertical: hp(1), borderBottomWidth: 1, borderBottomColor: COLORS.border }} onPress={() => handleOpenPurchasePerformaSlip(pf)}>
                                                    <Text style={{ color: COLORS.primary, fontWeight: '400' }}>{pf?.DocumentNumber || pf?.ProformaNo || pf?.InvoiceNo || pf?.DocumentNo}</Text>
                                                    {(pf?.DocumentDate || pf?.InvoiceDate) ? <Text style={{ color: COLORS.textLight, fontSize: rf(2.8) }}>{pf.DocumentDate || pf.InvoiceDate}</Text> : null}
                                                </TouchableOpacity>
                                            ))
                                        ) : (
                                            <Text style={{fontSize: rf(3), color: COLORS.textLight }}>No proforma invoice records found.</Text>
                                        )}
                                    </View>

                                    {(!orderRelatedData?.PurchaseInvoices?.length && !orderRelatedData?.ProformaInvoices?.length) && (
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

            {totalRecords > 0 && (
                <View style={styles.paginationContainer}>
                    <Text style={styles.pageInfoText}>
                        Showing {totalRecords === 0 ? 0 : rangeStart} to {rangeEnd} of {totalRecords} entries
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

export default ViewPurchaseOrder;