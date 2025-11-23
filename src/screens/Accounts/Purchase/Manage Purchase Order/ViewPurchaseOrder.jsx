import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';

const PURCHASE_ORDERS = [
    {
        id: 'PO001',
        vendorName: 'MoonByte',
        projectName: 'Ksp',
        deliveryDate: '01/01/25',
        item: {
            itemType: 'Furniture',
            name: 'Chair'
        },
        quantity: 10
    },
    {
        id: 'PO002',
        vendorName: 'Northwind Retail',
        projectName: 'ABC Tower',
        deliveryDate: '04/01/25',
        item: {
            itemType: 'Electronics',
            name: 'LED Panel'
        },
        quantity: 25
    }
];


const ITEMS_PER_PAGE_OPTIONS = ['5', '10', '20', '50'];

const ViewPurchaseOrder = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(Number(ITEMS_PER_PAGE_OPTIONS[1]));
    const [currentPage, setCurrentPage] = useState(0);

    const filteredOrders = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return PURCHASE_ORDERS;
        return PURCHASE_ORDERS.filter((order) => {
            const haystack = `${order.purchaseOrderNumber} ${order.vendorName} ${order.projectName} ${order.deliveryDate} ${order.item.itemType} ${order.item.name} ${order.quantity}`.toLowerCase();
            return haystack.includes(query);
        });
    }, [searchQuery]);

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

    const paginatedOrders = useMemo(() => {
        const start = currentPage * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, currentPage, itemsPerPage]);

    const rangeStart = filteredOrders.length === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = filteredOrders.length === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, filteredOrders.length);

    const handleQuickAction = (order, actionLabel) => {
        switch (actionLabel) {
            case 'Edit':
                // Navigate to ManagePurchaseOrder and pass the header UUID for prefill
                navigation.navigate('ManagePurchaseOrder', { headerUuid: order.id, HeaderUUID: order.id, UUID: order.id, origin: 'ViewPurchaseOrder' });
                return;
            case 'View':
                navigation.navigate('ManagePurchaseOrder', { headerUuid: order.id, HeaderUUID: order.id, UUID: order.id, viewOnly: true, origin: 'ViewPurchaseOrder' });
                return;
            case 'Delete':
                Alert.alert('Delete', `Delete clicked for ${order.purchaseOrderNumber}`);
                return;
            case 'Download':
                Alert.alert('Download', `Download clicked for ${order.purchaseOrderNumber}`);
                return;
            case 'Forward':
                Alert.alert('Forward', `Forward clicked for ${order.purchaseOrderNumber}`);
                return;
            default:
                Alert.alert('Action Triggered', `${actionLabel} clicked for ${order.purchaseOrderNumber}`);
        }
    };

    const renderFooterActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', action: 'Delete', bg: '#FFE7E7', border: '#EF4444', color: '#EF4444' },
            { icon: 'file-download', action: 'Download', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6' },
            { icon: 'chat-bubble-outline', action: 'Forward', bg: '#E5E7EB', border: '#6B7280', color: '#6B7280' },
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

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
                {paginatedOrders.map((order) => (
                    <AccordionItem
                        key={order.id}
                        item={{
                            headerTitle: order.vendorName,        // LEFT SIDE
                            headerValue: order.projectName,       // RIGHT SIDE
                        }}

                        isActive={activeOrderId === order.id}
                        onToggle={() => setActiveOrderId(prev => prev === order.id ? null : order.id)}

                        customRows={[
                            { label: "Vendor Name", value: order.vendorName },
                            { label: "Project Name", value: order.projectName },
                            { label: "Delivery Date", value: order.deliveryDate },
                            {
                                label: "Item",
                                value: `Item Type: ${order.item.itemType}\nName: ${order.item.name}`
                            },
                            { label: "Quantity", value: order.quantity }
                        ]}

                        headerLeftLabel="Vendor Name"
                        headerRightLabel="Project Name"
                        footerComponent={renderFooterActions(order)}
                        headerRightContainerStyle={styles.headerRightContainer}
                    />

                ))}

                {paginatedOrders.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No purchase orders found</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Try adjusting your search keyword or create a new sales order.
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

export default ViewPurchaseOrder;