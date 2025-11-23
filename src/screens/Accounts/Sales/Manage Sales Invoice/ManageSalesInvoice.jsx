
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';
import { getCMPUUID, getENVUUID, getUUID } from '../../../../api/tokenStorage';
import api from '../../../../api/axios';
import { getSalesInvoiceHeaders } from '../../../../api/authServices';

// server-backed list state will be used instead of static sample data

const ITEMS_PER_PAGE_OPTIONS = ['5', '10', '20', '50'];

const ManageSalesInvoice = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(Number(ITEMS_PER_PAGE_OPTIONS[1]));
    const [currentPage, setCurrentPage] = useState(0);

    const [invoices, setInvoices] = useState([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    const fetchSalesInvoices = async (page = 0, pageSize = itemsPerPage, q = searchQuery) => {
        try {
            setLoading(true);
            setError(null);
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const start = page * pageSize;
            const resp = await getSalesInvoiceHeaders({ cmpUuid: cmp, envUuid: env, start, length: pageSize, searchValue: q });
            const data = resp?.Data || resp || {};
            const records = Array.isArray(data?.Records) ? data.Records : (Array.isArray(data) ? data : []);
            const normalized = records.map((r, idx) => ({
                id: r?.UUID || r?.Id || `si-${start + idx + 1}`,
                salesInvoiceNumber: r?.SalesInvoiceNo || r?.InvoiceNo || r?.SalesInvNo || r?.SalesPerInvNo || r?.SalesInvoiceNumber || '',
                salesOrderNumber: r?.SalesOrderNo || r?.OrderNo || r?.SalesOrder || '',
                // amount may be missing for now; bind common fallbacks and allow null so UI can show '0.00'
                amount: r?.Amount || r?.TotalAmount || r?.NetAmount || r?.AmountPayable || null,
                customerName: r?.CustomerName || r?.Customer || r?.CustomerDisplayName || '',
                deliveryDate: r?.DeliveryDate || r?.InvoiceDate || r?.OrderDate || '',
                dueDate: r?.DueDate || r?.PaymentDueDate || '',
                contactPerson: r?.ContactPerson || r?.Contact || '',
                status: r?.Status || r?.State || 'Draft',
                raw: r,
            }));

            setInvoices(normalized);
            const total = Number(data?.TotalRecords ?? data?.Total ?? resp?.TotalRecords ?? resp?.Total ?? records.length) || records.length;
            setTotalRecords(total);
        } catch (err) {
            console.warn('getSalesInvoiceHeaders error', err?.message || err);
            setError('Failed to load sales invoices');
            setInvoices([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    };

    // Helper to extract server-side UUID from varied payload shapes
    const extractServerUuid = (raw) => {
        if (!raw) return '';
        const keys = ['UUID','Uuid','uuid','Id','id','HeaderUUID','HeaderId','SalesInvoiceUUID','SalesInvoiceId','InvoiceUUID','InvoiceId','HeaderUuid','SalesInvUUID'];
        for (const k of keys) {
            if (raw[k]) return raw[k];
        }
        try {
            for (const k in raw) {
                const v = raw[k];
                if (typeof v === 'string') {
                    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v) || /^[0-9a-f]{32}$/i.test(v)) return v;
                }
            }
        } catch (e) { /* ignore */ }
        return '';
    };

    useEffect(() => {
        fetchSalesInvoices(currentPage, itemsPerPage, searchQuery);
    }, [currentPage, itemsPerPage, searchQuery]);

    const rangeStart = totalRecords === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = totalRecords === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, totalRecords);

    const handleQuickAction = async (order, actionLabel) => {
        // prefer salesInvoiceNumber for messages
        const idLabel = order?.salesInvoiceNumber || order?.id;
        try {
            if (actionLabel === 'Delete') {
                Alert.alert(
                    'Delete Sales Invoice',
                    'Are you sure you want to delete this sales invoice?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Delete', style: 'destructive', onPress: async () => {
                            try {
                                const headerUuidCandidate = extractServerUuid(order?.raw) || order?.UUID || order?.id || '';
                                if (!headerUuidCandidate) {
                                    Alert.alert('Error', 'Unable to determine sales invoice identifier');
                                    return;
                                }
                                const cmp = await getCMPUUID();
                                const env = await getENVUUID();
                                const user = await getUUID();
                                const params = { uuid: headerUuidCandidate, cmpUuid: cmp, envUuid: env, userUuid: user };
                                const PATH = '/api/Account/DeleteSalesInvoiceHeader';
                                const resp = await api.delete(PATH, { params });
                                console.log('deleteSalesInvoiceHeader resp ->', resp && resp.status, resp?.data);
                                // refresh the list after deletion
                                await fetchSalesInvoices(currentPage, itemsPerPage, searchQuery);
                                Alert.alert('Success', 'Sales invoice deleted');
                            } catch (e) {
                                console.warn('delete sales invoice header error', e);
                                Alert.alert('Error', e?.message || 'Unable to delete sales invoice');
                            }
                        } }
                    ],
                    { cancelable: true }
                );
                return;
            }

            if (actionLabel === 'Edit' || actionLabel === 'Update') {
                try {
                    const headerUuidCandidate = extractServerUuid(order?.raw) || order?.UUID || order?.Uuid || order?.Id || order?.id || '';
                    // Accept both hyphenated GUIDs and 32-hex UUID strings returned by some backends
                    const isGuid = typeof headerUuidCandidate === 'string' && (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(headerUuidCandidate) || (/^[0-9a-f]{32}$/i.test(headerUuidCandidate)));
                    console.log('ManageSalesInvoice: headerUuidCandidate ->', headerUuidCandidate, 'isGuid ->', isGuid);

                    if (isGuid) {
                        // navigate with headerUuid under multiple keys so AddSalesInvoice effect reliably picks it up
                        navigation.navigate('AddSalesInvoice', { headerUuid: headerUuidCandidate, HeaderUUID: headerUuidCandidate, UUID: headerUuidCandidate });
                    } else if (order?.raw) {
                        // Log raw payload for diagnostics when UUID candidate isn't a valid GUID
                        console.log('ManageSalesInvoice: order.raw (non-GUID candidate) ->', order.raw);
                        // pass server payload when available so AddSalesInvoice can prefill without refetch
                        // also pass the candidate under `candidateHeaderUuid` for further debugging/attempted use
                        navigation.navigate('AddSalesInvoice', { prefillHeader: order.raw, candidateHeaderUuid: headerUuidCandidate });
                    } else {
                        // fallback: navigate and pass minimal fields + candidate uuid for debugging
                        navigation.navigate('AddSalesInvoice', { prefillHeader: order, candidateHeaderUuid: headerUuidCandidate });
                    }
                } catch (e) {
                    console.warn('navigate to edit sales invoice failed', e);
                    Alert.alert('Error', 'Unable to open editor');
                }
                return;
            }

            // fallback debug message for other actions
            Alert.alert('Action Triggered', `${actionLabel} clicked for ${idLabel}`);
        } catch (err) {
            console.warn('handleQuickAction error', err);
            Alert.alert('Error', err?.message || 'Action failed');
        }
    };

    const renderFooterActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', action: 'Delete', bg: '#FFE7E7', border: '#EF4444', color: '#EF4444', action: 'Delete' },
            { icon: 'file-download', action: 'Download', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6', action: 'Download' },
            { icon: 'chat-bubble-outline', action: 'Forward', bg: '#E5E7EB', border: '#6B7280', color: '#6B7280', action: 'Forward' },
            { icon: 'visibility', action: 'View', bg: '#E6F9EF', border: '#22C55E', color: '#22C55E', action: 'View' },
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
                title="View Sales Invoice"
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.navigate('AddSalesInvoice')}
                rightButtonLabel="Add sales Invoice"
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

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {invoices.map((order) => (
                    <AccordionItem
                        key={order.id}
                        item={{
                            soleExpenseCode: order.id,
                            // show Sales Invoice No on the left header
                            expenseName: order.salesInvoiceNumber,
                            // show amount on the right header; fall back to '0.00' when missing
                            amount: order.amount != null ? order.amount : '0.00',
                        }}
                        isActive={activeOrderId === order.id}
                        onToggle={() => setActiveOrderId((prev) => (prev === order.id ? null : order.id))}
                        customRows={[
                            { label: 'Sales Order', value: order.salesOrderNumber },
                            { label: 'Customer Name', value: order.customerName },
                            { label: 'Delivery Date', value: order.deliveryDate },
                            { label: 'Status', value: order.status, isStatus: true },
                        ]}
                        headerLeftLabel="Sales Invoice Number"
                        headerRightLabel="Amount"
                        footerComponent={renderFooterActions(order)}
                        headerRightContainerStyle={styles.headerRightContainer}
                    />
                ))}

                {!loading && invoices.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No sales invoices found</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Try adjusting your search keyword or create a new sales invoice.
                        </Text>
                    </View>
                )}
                {loading && (
                    <View style={{ paddingVertical: hp(4), alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                        <Text style={{ marginTop: hp(1), color: COLORS.textLight }}>Loading invoices...</Text>
                    </View>
                )}
            </ScrollView>

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
});

export default ManageSalesInvoice;