import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons'; 
import { wp, hp, rf } from '../../../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';
import { getPurchaseHeaderInquiries, deletePurchaseInquiryHeader, convertInquiryToPurchaseOrder } from '../../../../api/authServices'; 

const ITEMS_PER_PAGE_OPTIONS = ['5', '10', '20', '50'];

const ViewPurchaseInquiry = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(Number(ITEMS_PER_PAGE_OPTIONS[1]));
    const [currentPage, setCurrentPage] = useState(0);
    const [inquiries, setInquiries] = useState([]);
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

    const isFocused = useIsFocused();

    async function fetchInquiries() {
        try {
            setLoading(true);
            setError(null);
            const response = await getPurchaseHeaderInquiries({
                start: currentPage * itemsPerPage,
                length: itemsPerPage,
                searchValue: searchQuery.trim(),
            });
            const records = response?.Data?.Records || [];
            const normalized = records.map((record, idx) => {
                // Pick title from multiple possible keys returned by different APIs/backends
                const title = record?.Title || record?.RequestTitle || record?.Request_Title || record?.CustomerName || record?.VendorName || record?.InquiryTitle || record?.Inquiry_Tile || record?.Name || record?.customerName || 'N/A';

                // Pick date from multiple possible keys and format to a compact readable form.
                // We intentionally format as `DD-MMM-YYYY` and insert a zero-width space before the year
                // so the final digit can wrap/appear if the UI container clips horizontally.
                const rawDate = record?.OrderDate || record?.InquiryDate || record?.RequestDate || record?.CreatedOn || record?.CreatedAt || record?.DocDate || record?.DocumentDate || record?.Date || null;
                let inquiryDate = '—';
                if (rawDate) {
                    try {
                        const zwsp = '\u200B'; // zero-width space: invisible but allows wrapping so last digit isn't clipped
                        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

                        // If it's already in the expected short format like "20-Nov-2025", keep it and ensure zwsp before year
                        if (typeof rawDate === 'string' && /^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(rawDate.trim())) {
                            inquiryDate = rawDate.trim().replace(/-(\d{4})$/, `-${zwsp}$1`);
                        } else {
                            const d = new Date(rawDate);
                            if (!isNaN(d.getTime())) {
                                const yyyy = d.getFullYear();
                                const mmStr = monthNames[d.getMonth()] || String(d.getMonth() + 1).padStart(2, '0');
                                const dd = String(d.getDate()).padStart(2, '0');
                                inquiryDate = `${dd}-${mmStr}-${yyyy}`.replace(/-(\d{4})$/, `-${zwsp}$1`);
                            } else if (typeof rawDate === 'string') {
                                // Fallback: try to keep as much of the string as sensible but ensure year visibility
                                const s = rawDate.trim();
                                inquiryDate = s.replace(/-(\d{4})$/, `-${zwsp}$1`).substring(0, 20);
                            }
                        }
                    } catch (_e) {
                        inquiryDate = String(rawDate).trim().replace(/-(\d{4})$/, `-\u200B$1`).substring(0, 20);
                    }
                }

                return {
                    id: record?.UUID || record?.InquiryNo || record?.Id || `row-${idx}`,
                    inquiryNo: record?.InquiryNo || record?.Inquiry_No || record?.InquiryNumber || record?.Number || 'N/A',
                    customerName: title,
                    inquiryDate,
                    status: record?.Status || record?.status || 'Visible',
                    raw: record,
                };
            });
            setInquiries(normalized);
            setTotalRecords(typeof response?.Data?.TotalCount === 'number' ? response.Data.TotalCount : normalized.length);
        } catch (err) {
            console.error('Failed to fetch inquiries', err);
            setError('Failed to fetch inquiries. Please try again.');
            setInquiries([]);
            setTotalRecords(0);
        } finally {
            setLoading(false);
        }
    }

    // Refresh when screen is focused or when pagination/search changes
    useEffect(() => {
        if (isFocused) fetchInquiries();
    }, [isFocused, currentPage, itemsPerPage, searchQuery]);

    const rangeStart = totalRecords === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = totalRecords === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, totalRecords);

    const handleQuickAction = (order, actionLabel) => {
        Alert.alert('Action Triggered', `${actionLabel} clicked for ${order.inquiryNo}`);
    };

    const renderFooterActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', label: 'Delete', bg: '#FFE7E7', border: '#EF4444', color: '#EF4444' },
            { icon: 'logout', label: 'Forward', bg: '#E5E7EB', border: '#6B7280', color: '#6B7280' },
            { icon: 'edit', label: 'Edit', bg: '#E6F9EF', border: '#22C55E', color: '#22C55E' },
        ];

        return (
            <View style={styles.cardActionRow}>
                        {buttons.map((btn) => (
                    <TouchableOpacity
                        key={`${order.id}-${btn.icon}`}
                        activeOpacity={0.85}
                        style={[styles.cardActionBtn, { backgroundColor: btn.bg, borderColor: btn.border }]}
                        onPress={async () => {
                            // Delete action: confirm and call deleteSalesHeader
                            if (btn.label === 'Delete') {
                                const headerUuid = order.raw?.UUID || order.raw?.Id || order.raw?.Data?.UUID || order.raw?.Data?.UUIDString || order.id;
                                Alert.alert(
                                    'Confirm delete',
                                    `Delete purchase inquiry ${order.inquiryNo}?`,
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        { text: 'Delete', style: 'destructive', onPress: async () => {
                                            try {
                                                console.log('ViewPurchaseInquiry -> deleting header ->', headerUuid);
                                                await deletePurchaseInquiryHeader({ headerUuid: headerUuid });
                                                Alert.alert('Deleted', 'Purchase inquiry deleted successfully');
                                                // refresh list
                                                fetchInquiries();
                                            } catch (err) {
                                                console.error('Failed to delete header', err);
                                                Alert.alert('Error', err?.message || 'Failed to delete purchase inquiry');
                                            }
                                        } }
                                    ]
                                );
                                return;
                            }
                            // Convert inquiry to purchase order when Forward is clicked
                            if (btn.label === 'Forward') {
                                const headerUuid = order.raw?.UUID || order.raw?.Id || order.raw?.Data?.UUID || order.raw?.Data?.UUIDString || order.id;
                                try {
                                    console.log('ViewPurchaseInquiry -> converting inquiry to purchase order ->', headerUuid);
                                    const response = await convertInquiryToPurchaseOrder({ inquiryUuid: headerUuid });
                                    
                                    // Show success message from API
                                    const successMessage = response?.Message || response?.message || 'Purchase inquiry converted to order successfully';
                                    Alert.alert('Success', successMessage);
                                    
                                    // Get the new order UUID from response (based on your API response structure)
                                    const newOrderUuid = response?.Data?.headerUUID || response?.Data?.HeaderUUID || response?.Data?.UUID || response?.headerUUID || response?.HeaderUUID || response?.UUID;
                                    console.log('ViewPurchaseInquiry -> New Order UUID from conversion:', newOrderUuid);
                                    
                                    // Navigate to ManagePurchaseOrder with the headerUuid - the screen will automatically call getPurchaseOrderHeaderById
                                    navigation.navigate('ManagePurchaseOrder', { headerUuid: newOrderUuid });
                                    
                                } catch (err) {
                                    console.error('Failed to convert inquiry', err);
                                    Alert.alert('Error', err?.message || 'Failed to convert purchase inquiry to order');
                                }
                                return;
                            }
                            // Navigate to AddSalesInquiry when Edit is clicked, passing header UUID
                            if (btn.label === 'Edit') {
                                const headerUuid = order.raw?.UUID || order.raw?.Id || order.raw?.Data?.UUID || order.raw?.Data?.UUIDString || order.id;
                                console.log('ManageInquiry -> navigating to ManagePurchaseInquiry with headerUuid ->', headerUuid);
                                // Navigate passing only the canonical `headerUuid` param so the target screen
                                // can fetch and autofill the header by UUID.
                                navigation.navigate('ManagePurchaseInquiry', { headerUuid });
                                return;
                            }
                            handleQuickAction(order, btn.label);
                        }}
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
                title="View Purchase Inquiry"
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.push('ManagePurchaseInquiry')}
                rightButtonLabel="Add Purchase Inquiry"
                showRight
            />
            <View style={styles.headerSeparator} />

            <View style={styles.controlsWrapper}>
                <View style={styles.showEntriesRow}>
                    <Text style={styles.showEntriesLabel}>Show</Text>
                    <Dropdown
                        placeholder="Show entries"
                        value={String(itemsPerPage)}
                        options={ITEMS_PER_PAGE_OPTIONS}
                        getLabel={v => v}
                        getKey={v => v}
                        onSelect={(value) => {
                            const parsed = parseInt(value, 10);
                            if (!Number.isNaN(parsed)) {
                                setItemsPerPage(parsed);
                                setCurrentPage(0);
                            }
                        }}
                        hideSearch
                        renderInModal={true}
                        inputBoxStyle={styles.dropdownInput}
                        dropdownListStyle={{ width: wp(18) }}
                        style={styles.dropdownWrapper}
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
            {error && (
                <Text style={styles.errorText}>{error}</Text>
            )}

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {inquiries.map((order) => (
                    <AccordionItem
                        key={order.id}
                        item={{
                            soleExpenseCode: order.id,
                            expenseName: order.inquiryNo,
                            amount: order.customerName,
                            status: order.status,
                        }}
                        isActive={activeOrderId === order.id}
                        onToggle={() => setActiveOrderId(prev => prev === order.id ? null : order.id)}

                        customRows={[
                            { label: "Inquiry No.", value: order.inquiryNo },
                            { label: "Request Title", value: order.customerName },
                            { label: "Request Date", value: order.inquiryDate },
                            { label: "Status", value: order.status, isStatus: true }
                        ]}

                        headerLeftLabel="Inquiry No."
                        headerRightLabel="Request Title"
                        footerComponent={renderFooterActions(order)}
                        headerRightContainerStyle={styles.headerRightContainer}
                    />


                ))}

                {!loading && inquiries.length === 0 && (
                    <View style={styles.emptyState}>
                                <Text style={styles.emptyStateTitle}>No purchase inquiries found</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    Try adjusting your search keyword or create a new purchase inquiry.
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
});

export default ViewPurchaseInquiry;