import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';
const ITEMS_PER_PAGE_OPTIONS = ['5', '10', '20', '50'];
import { getUUID, getCMPUUID, getENVUUID } from '../../../../api/tokenStorage';
import { getSalesPerformaInvoiceHeaders, deleteSalesPerformaInvoiceHeader, getSalesPerformaInvoiceSlip, convertSalesPerformaToInvoice, getSalesProformaRelatedDocuments, getSalesOrderSlip, getSalesInvoiceSlip } from '../../../../api/authServices';

const SalesPerfomaInvoice = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(Number(ITEMS_PER_PAGE_OPTIONS[1]));
    const [currentPage, setCurrentPage] = useState(0);
    const [inquiries, setInquiries] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

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

    const fetchPurchaseInquiries = useCallback(async (page = 0, pageSize = itemsPerPage, q = searchQuery) => {
        try {
            setLoading(true);
            setError(null);
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const start = page * pageSize;
            const resp = await getSalesPerformaInvoiceHeaders({ cmpUuid: cmp, envUuid: env, start, length: pageSize, searchValue: q });
            const data = resp?.Data || resp || {};
            const records = Array.isArray(data?.Records) ? data.Records : (Array.isArray(data) ? data : []);
            // normalize server records into UI items
            const normalized = records.map((r, idx) => ({
                id: r?.UUID || r?.Id || `pi-${start + idx + 1}`,
                // Prefer SalesOrderNo, fallback to SalesInqNo or other order/inquiry identifiers
                inquiryNo: r?.SalesOrderNo || r?.SalesInqNo || r?.OrderNo || r?.InquiryNo || r?.SalesOrder || '',
                // Bind performa/invoice number explicitly from SalesPerInvNo when present
                title: r?.SalesPerInvNo || r?.PerformaInvoiceNo || r?.PerformaNo || r?.SalesPerformaNo || r?.DocumentNo || r?.Title || '',
                // Amount may be present under different keys depending on backend. Try common fallbacks.
                amount: r?.Amount || r?.TotalAmount || r?.NetAmount || r?.Total || r?.AmountPayable || null,
                requestDate: r?.DeliveryDate || r?.OrderDate || r?.RequestDate || r?.PerformaDate || '',
                DueDate: r?.DueDate || '',
                TaxInvoice: r?.TaxInvoice || r?.TaxInvoiceNo || r?.TaxNo || '',
                customerName: r?.CustomerName || r?.Customer || r?.CustomerDisplayName || r?.CustomerNameDisplay || '',
                status: r?.Status || r?.State || 'Draft',
                raw: r,
            }));

            setInquiries(normalized);
            // Prefer Data.TotalCount (used in other screens), then common total keys, fallback to records length
            const total = Number(data?.TotalCount ?? data?.TotalRecords ?? data?.Total ?? resp?.TotalRecords ?? resp?.Total ?? records.length) || records.length;
            console.log('SalesPerfomaInvoice fetch ->', { page, pageSize, start: page * pageSize, recordsReturned: Array.isArray(records) ? records.length : 0, totalReported: total });
            setTotalRecords(total);
        } catch (err) {
            console.warn('getSalesPerformaInvoiceHeaders error', err?.message || err);
            setError('Failed to load performa invoices');
            setInquiries([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    }, [itemsPerPage, searchQuery]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchPurchaseInquiries(currentPage, itemsPerPage, searchQuery);
        } catch (e) {
            console.warn('refresh error', e);
        } finally {
            setRefreshing(false);
        }
    }, [fetchPurchaseInquiries, currentPage, itemsPerPage, searchQuery]);

    const isFocused = useIsFocused();

    // Refresh when screen is focused or when pagination/search changes (matches ManageInquiry behavior)
    useEffect(() => {
        if (isFocused) {
            fetchPurchaseInquiries(currentPage, itemsPerPage, searchQuery);
        }
    }, [isFocused, currentPage, itemsPerPage, searchQuery, fetchPurchaseInquiries]);

    // Static base64 PDF string for demo purposes
    const handleDownloadPerformaPDF = async (order) => {
        try {
            if (!order?.id) {
                Alert.alert('Error', 'Performa invoice not found');
                return;
            }

            setIsGeneratingPDF(true);
            const pdfBase64 = await getSalesPerformaInvoiceSlip({ headerUuid: order.id });

            if (!pdfBase64) {
                Alert.alert('Error', 'Performa invoice PDF is not available right now.');
                return;
            }

            // Navigate to FileViewerScreen with PDF data
            navigation.navigate('FileViewerScreen', {
                pdfBase64,
                fileName: `PerformaInvoice_${order.title || order.inquiryNo || order.id}`,
                opportunityTitle: order.title || order.inquiryNo || 'Performa Invoice',
                companyName: order.customerName || '',
            });
        } catch (error) {
            console.log('handleDownloadPerformaPDF error:', error?.message || error);
            Alert.alert('Error', error?.message || 'Unable to generate PDF. Please try again.');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const rangeStart = totalRecords === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = totalRecords === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, totalRecords);

    const handleQuickAction = async (order, actionLabel) => {
        // Alert.alert('Action Triggered', `${actionLabel} clicked for ${order.inquiryNo}`);
        if (actionLabel == 'Delete') {

            Alert.alert(
                'Delete Performa Invoice',
                'Are you sure you want to delete this performa invoice header?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Delete', style: 'destructive', onPress: async () => {
                            try {
                                setLoading(true);
                                const headerUuid = order?.raw?.UUID || order?.id;
                                if (!headerUuid) throw new Error('Header UUID not found');
                                const resp = await deleteSalesPerformaInvoiceHeader({ headerUuid });
                                console.log('deleteSalesPerformaInvoiceHeader resp ->', resp);
                                // refresh list
                                await fetchPurchaseInquiries(currentPage, itemsPerPage, searchQuery);
                                Alert.alert('Success', 'Performa invoice deleted');
                            } catch (err) {
                                console.error('delete performa header error', err);
                                Alert.alert('Error', err?.message || 'Unable to delete');
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ],
                { cancelable: true }
            );
        }
        if (actionLabel === 'Edit') {
            // Navigate to AddSalesInvoice (invoice screen) with headerUuid for edit mode
            try {
                const headerUuid = order?.raw?.UUID || order?.UUID || order?.id || order?.Id;
                if (headerUuid) {
                    navigation.navigate('AddSalesPerfomaInvoice', { headerUuid });
                } else {
                    // Fallback to prefillHeader if UUID not found (pass raw data)
                    navigation.navigate('AddSalesPerfomaInvoice', { prefillHeader: order.raw || order });
                }
            } catch (e) {
                console.warn('navigate to edit performa invoice failed', e);
            }
        }
        if (actionLabel === 'Download') {
            handleDownloadPerformaPDF(order);
        }
        if (actionLabel === 'Forward') {
            // Convert performa invoice to invoice and navigate to AddSalesInvoice
            try {
                setLoading(true);
                const performaUuid = order?.raw?.UUID || order?.id;
                if (!performaUuid) throw new Error('Performa UUID not found');

                const [envUuid, cmpUuid, userUuid] = await Promise.all([
                    getENVUUID(),
                    getCMPUUID(),
                    getUUID()
                ]);

                const response = await convertSalesPerformaToInvoice({
                    performaUuid,
                    EnvUUID: envUuid,
                    CmpUUID: cmpUuid,
                    UserUUID: userUuid
                });

                console.log('Convert performa to invoice response:', response);

                // Navigate to AddSalesInvoice with headerUuid from response and prefill data
                const headerUuid = response?.Data?.UUID || response?.UUID || response?.headerUuid;
                if (headerUuid) {
                    navigation.navigate('AddSalesInvoice', {
                        headerUuid,
                        prefillHeader: {
                            Data: response?.Data || response,
                            ...order.raw
                        }
                    });
                } else {
                    // Fallback navigation with just prefill data
                    navigation.navigate('AddSalesInvoice', {
                        prefillHeader: {
                            Data: response?.Data || response,
                            ...order.raw
                        }
                    });
                }

                Alert.alert('Success', 'Performa invoice converted to invoice successfully');
            } catch (err) {
                console.error('Convert performa to invoice error:', err);
                // Extract the error message properly - the API error handling already provides user-friendly message
                const errorMessage = err?.message || 'Unable to convert performa invoice to sales invoice. Please try again.';
                console.log('Error message extracted:', errorMessage);
                Alert.alert('Conversion Failed', errorMessage);
            } finally {
                setLoading(false);
            }
        }

        if (actionLabel === 'View') {
            try {
                await openRelatedDocuments(order);
            } catch (e) {
                console.warn('openRelatedDocuments failed', e);
                Alert.alert('Error', 'Unable to open related documents');
            }
        }

    };

    const renderFooterActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', label: 'Delete', bg: '#FFE7E7', border: '#EF4444', color: '#EF4444' },
            { icon: 'file-download', label: 'Download', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6' },
            { icon: 'logout', label: 'Forward', bg: '#E5E7EB', border: '#6B7280', color: '#6B7280' },
            { icon: 'visibility', label: 'View', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6' },
            { icon: 'edit', label: 'Edit', bg: '#E6F9EF', border: '#22C55E', color: '#22C55E' },
        ];

        return (
            <View style={styles.cardActionRow}>
                {buttons.map((btn) => (
                    <TouchableOpacity
                        key={`${order.id}-${btn.icon}`}
                        activeOpacity={0.85}
                        style={[styles.cardActionBtn, { backgroundColor: btn.bg, borderColor: btn.border }]}
                        onPress={() => handleQuickAction(order, btn.label)}
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

    // Related documents bottom sheet state and fetch
    const [relatedDocsModalVisible, setRelatedDocsModalVisible] = useState(false);
    const [relatedDocsLoading, setRelatedDocsLoading] = useState(false);
    const [relatedDocsData, setRelatedDocsData] = useState({ SalesOrders: [], SalesInvoices: [] });

    const openRelatedDocuments = async (order) => {
        try {
            setRelatedDocsData({ SalesOrders: [], SalesInvoices: [] });
            setRelatedDocsLoading(true);
            setRelatedDocsModalVisible(true);
            await fetchRelatedDocuments(order);
        } catch (e) {
            console.warn('openRelatedDocuments error', e);
            setRelatedDocsModalVisible(false);
            Alert.alert('Error', 'Unable to load related documents');
        } finally {
            setRelatedDocsLoading(false);
        }
    };

    const fetchRelatedDocuments = async (order) => {
        try {
            const salesProformaUuid = order?.raw?.UUID || order?.id || '';
            if (!salesProformaUuid) {
                console.warn('fetchRelatedDocuments: no salesProformaUuid');
                setRelatedDocsData({ SalesOrders: [], SalesInvoices: [] });
                return;
            }
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const resp = await getSalesProformaRelatedDocuments({ salesProformaUuid, cmpUuid: cmp, envUuid: env });
            const data = resp?.Data || resp || {};
            setRelatedDocsData({ SalesOrders: Array.isArray(data?.SalesOrders) ? data.SalesOrders : [], SalesInvoices: Array.isArray(data?.SalesInvoices) ? data.SalesInvoices : [] });
        } catch (e) {
            console.warn('fetchRelatedDocuments error', e?.message || e);
            setRelatedDocsData({ SalesOrders: [], SalesInvoices: [] });
        }
    };

    const handleOpenSalesOrderSlip = async (so) => {
        try {
            if (!so) return;
            setIsGeneratingPDF(true);
            const headerUuid = so?.UUID || so?.Uuid || so?.SalesOrderUUID || so?.SalesOrderId || so?.Id || so?.id || '';
            if (!headerUuid) {
                Alert.alert('Error', 'Unable to determine Sales Order identifier');
                return;
            }
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const user = await getUUID();
            const pdfBase64 = await getSalesOrderSlip({ headerUuid, cmpUuid: cmp, envUuid: env, userUuid: user });
            if (!pdfBase64) {
                Alert.alert('Error', 'No PDF returned for Sales Order');
                return;
            }
            const fileName = `SalesOrder_${so?.SalesOrderNo || headerUuid}`;
            navigation.navigate('FileViewerScreen', { pdfBase64, fileName });
        } catch (e) {
            console.warn('open sales order slip error', e);
            Alert.alert('Error', e?.message || 'Unable to open sales order PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleOpenSalesInvoiceSlip = async (inv) => {
        try {
            if (!inv) return;
            setIsGeneratingPDF(true);
            const headerUuid = inv?.UUID || inv?.Uuid || inv?.SalesInvoiceUUID || inv?.SalesInvoiceId || inv?.Id || inv?.id || '';
            if (!headerUuid) {
                Alert.alert('Error', 'Unable to determine Sales Invoice identifier');
                return;
            }
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const user = await getUUID();
            const pdfBase64 = await getSalesInvoiceSlip({ headerUuid, cmpUuid: cmp, envUuid: env, userUuid: user });
            if (!pdfBase64) {
                Alert.alert('Error', 'No PDF returned for Sales Invoice');
                return;
            }
            const fileName = `SalesInvoice_${inv?.SalesInvoiceNo || headerUuid}`;
            navigation.navigate('FileViewerScreen', { pdfBase64, fileName });
        } catch (e) {
            console.warn('open sales invoice slip error', e);
            Alert.alert('Error', e?.message || 'Unable to open sales invoice PDF');
        } finally {
            setIsGeneratingPDF(false);
        }
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
                title="Sales Proforma Invoice"
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.navigate('AddSalesPerfomaInvoice')}
                rightButtonLabel="Add Perfoma In"
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
                            // Dropdown returns the selected option (string). Parse and apply.
                            const parsed = parseInt(String(value), 10);
                            if (!Number.isNaN(parsed)) {
                                setItemsPerPage(parsed);
                                setCurrentPage(0);
                            }
                        }}
                        hideSearch
                        inputBoxStyle={styles.dropdownInput}
                        style={styles.dropdownWrapper}
                        renderInModal
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
            {error && <Text style={styles.errorText}>{error}</Text>}

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
                {inquiries.map((item) => (
                    <AccordionItem
                        key={item.id}

                        item={{
                            soleExpenseCode: item.id,
                            // Show Performa Invoice No in the left header by using `title` here
                            expenseName: item.title,
                            // Show amount on the right header; prefer numeric amount if available
                            // Use a dummy amount '0.00' when the backend doesn't provide one
                            amount: item.amount != null ? item.amount : '0.00',
                            status: item.status,
                        }}

                        isActive={activeOrderId === item.id}
                        onToggle={() => setActiveOrderId(prev => prev === item.id ? null : item.id)}

                        customRows={[
                            { label: "Customer Name", value: item.customerName },
                            { label: "Order Date", value: item.requestDate },
                            { label: "DueDate", value: item.DueDate },
                            { label: "Status", value: item.status, isStatus: true }
                        ]}
                        headerLeftLabel="Performa Invoice No"
                        headerRightLabel="Amount"

                        footerComponent={renderFooterActions(item)}
                        headerRightContainerStyle={styles.headerRightContainer}
                    />



                ))}

                {!loading && inquiries.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No purchase inquiries found</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Try adjusting your search keyword or create a new sales inquiry.
                        </Text>
                    </View>
                )}
                {loading && (
                    <View style={{ paddingVertical: hp(4), alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: hp(1), color: COLORS.textLight }}>Loading inquiries...</Text>
                    </View>
                )}
            </ScrollView>

            {totalRecords > 0 && (
                <View style={styles.paginationContainer}>
                    <Text style={styles.pageInfoText}>
                        Showing {rangeStart} to {rangeEnd} of {totalRecords} entries
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
            {/* Related Documents Modal */}
            <Modal visible={relatedDocsModalVisible} transparent animationType="slide" onRequestClose={() => setRelatedDocsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { fontWeight: '700', marginVertical: hp(1) }]}>Sales Performa Documents</Text>
                            <TouchableOpacity onPress={() => setRelatedDocsModalVisible(false)} style={{ padding: wp(1.2) }}>
                                <Icon name="close" size={rf(3.6)} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.modalBody, { paddingBottom: hp(2) }]}>
                            {relatedDocsLoading && (
                                <View style={{ paddingVertical: hp(2), alignItems: 'center' }}>
                                    <ActivityIndicator />
                                </View>
                            )}

                            {!relatedDocsLoading && (
                                <View>
                                    <Text style={{ fontWeight: '600', color: COLORS.textMuted, marginBottom: hp(1) }}>Sales Orders</Text>
                                    {Array.isArray(relatedDocsData.SalesOrders) && relatedDocsData.SalesOrders.length > 0 ? (
                                        relatedDocsData.SalesOrders.map((o, i) => (
                                            <TouchableOpacity key={`so-${i}`} onPress={() => handleOpenSalesOrderSlip(o)} style={{ paddingVertical: hp(0.6) }}>
                                                <Text style={{ color: COLORS.primary }}>{o.SalesOrderNo} - Date: {o.SalesOrderDate}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={{ color: COLORS.textLight }}>No sales orders found</Text>
                                    )}

                                    <View style={{ height: hp(1) }} />

                                    <Text style={{ fontWeight: '600', color: COLORS.textMuted, marginBottom: hp(1) }}>Sales Invoices</Text>
                                    {Array.isArray(relatedDocsData.SalesInvoices) && relatedDocsData.SalesInvoices.length > 0 ? (
                                        relatedDocsData.SalesInvoices.map((inv, j) => (
                                            <TouchableOpacity key={`si-${j}`} onPress={() => handleOpenSalesInvoiceSlip(inv)} style={{ paddingVertical: hp(0.6) }}>
                                                <Text style={{ color: COLORS.text }}>{inv.SalesInvoiceNo || inv.InvoiceNo || inv.SalesInvNo || '—'}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={{ color: COLORS.textLight }}>No sales invoices found</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
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
    errorText: {
        color: COLORS.danger || '#dc2626',
        fontSize: rf(3),
        paddingHorizontal: wp(4),
        marginBottom: hp(1),
    },
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalBox: {
        backgroundColor: '#fff',
        width: '100%',
        borderTopLeftRadius: wp(4),
        borderTopRightRadius: wp(4),
        paddingHorizontal: wp(4),
        paddingTop: hp(1.2),
        paddingBottom: hp(3),
        maxHeight: hp(70),
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalTitle: {
        fontSize: rf(3.6),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyBold,
    },
    modalBody: {
        marginTop: hp(1),
    },
});

export default SalesPerfomaInvoice;