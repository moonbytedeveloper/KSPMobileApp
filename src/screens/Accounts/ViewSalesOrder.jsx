import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AppHeader from '../../components/common/AppHeader';
import { useNavigation } from '@react-navigation/native';
import AccordionItem from '../../components/common/AccordionItem';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../styles/styles';

const SALES_ORDERS = [
    {
        id: 'KP1524',
        salesOrderNumber: 'KP1524',
        customerName: 'Moonbyte',
        deliveryDate: '15-12-24',
        dueDate: '15-12-24',
        amount: '₹1,25,000',     },
    {
        id: 'KP1525',
        salesOrderNumber: 'KP1525',
        customerName: 'Northwind Retail',
        deliveryDate: '04-01-25',
        dueDate: '15-12-24',
        amount: '₹98,700',
         },
    {
        id: 'KP1526',
        salesOrderNumber: 'KP1526',
        customerName: 'Creative Labs',
        deliveryDate: '22-12-24',
        dueDate: '15-12-24',
        amount: '₹2,10,000',
        },
    {
        id: 'KP1527',
        salesOrderNumber: 'KP1527',
        customerName: 'BlueStone Pvt Ltd',
        deliveryDate: '11-01-25',
        dueDate: '15-12-24',
        amount: '₹75,420',
     },
    {
        id: 'KP1528',
        salesOrderNumber: 'KP1528',
        customerName: 'Aero Technologies',
        deliveryDate: '29-12-24',
        dueDate: '15-12-24', 
     },
    {
        id: 'KP1529',
        salesOrderNumber: 'KP1529',
        customerName: 'UrbanNest Homes',
        deliveryDate: '05-02-25',
        amount: '₹1,85,300',
        dueDate: '15-12-24',
     },
];

const PAGE_SIZE = 4;

const ViewSalesOrder = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(0);

    const filteredOrders = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return SALES_ORDERS;
        return SALES_ORDERS.filter((order) => {
            const haystack = `${order.salesOrderNumber} ${order.customerName} ${order.contactPerson} `.toLowerCase();
            return haystack.includes(query);
        });
    }, [searchQuery]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE)), [filteredOrders.length]);

    useEffect(() => {
        if (currentPage > totalPages - 1) {
            setCurrentPage(totalPages - 1);
        }
    }, [totalPages, currentPage]);

    const paginatedOrders = useMemo(() => {
        const start = currentPage * PAGE_SIZE;
        return filteredOrders.slice(start, start + PAGE_SIZE);
    }, [filteredOrders, currentPage]);

    const rangeStart = filteredOrders.length === 0 ? 0 : currentPage * PAGE_SIZE + 1;
    const rangeEnd = Math.min((currentPage + 1) * PAGE_SIZE, filteredOrders.length);

    const handleQuickAction = (order, action) => {
        Alert.alert('Action Triggered', `${action.toUpperCase()} clicked for ${order.salesOrderNumber}`);
    };

    const renderHeaderActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', action: 'Delete' },
            { icon: 'file-download', action: 'Download' },
            { icon: 'chat-bubble-outline', action: 'Message' },
            { icon: 'visibility', action: 'View' },
            { icon: 'edit', action: 'Edit' },
        ];
        return (
            <View style={styles.headerActions}>
                {buttons.map((btn) => (
                    <TouchableOpacity
                        key={`${order.id}-${btn.icon}`}
                        style={styles.actionIconButton}
                        activeOpacity={0.8}
                        onPress={() => handleQuickAction(order, btn.action)}
                    >
                        <Icon name={btn.icon} size={rf(3.5)} color={COLORS.text} />
                    </TouchableOpacity>
                ))}
            </View>
        );
    };

    const pageNumbers = useMemo(
        () => Array.from({ length: totalPages }, (_, index) => index),
        [totalPages]
    );

    return (
        <View style={styles.screen}>
                <AppHeader
                    title="View Sales Order"
                    onLeftPress={() => {
                        navigation.goBack();
                    }}
                    onRightPress={() => {
                        navigation.navigate('ManageSalesOrder');
                    }}
                    rightButtonLabel="Add Sales Order"
                    showRight={true}
                />
            <View style={styles.headerSeparator} />

            <View style={styles.controlsWrapper}>
                <View style={styles.searchInputContainer}>
                    <Icon name="search" size={rf(3.5)} color={COLORS.textLight} />
                    <TextInput
                        placeholder="Search by customer, order no."
                        placeholderTextColor={COLORS.textLight}
                        style={styles.searchInput}
                        value={searchQuery}
                        onChangeText={(text) => {
                            setSearchQuery(text);
                            setCurrentPage(0);
                        }}
                    />
                </View>
                <View style={styles.paginationMeta}>
                    <Text style={styles.pageInfoText}>
                        Showing {filteredOrders.length === 0 ? 0 : rangeStart} to {rangeEnd} of {filteredOrders.length} entries
                    </Text>
                    <View style={styles.paginationButtons}>
                        <TouchableOpacity
                            style={[styles.pageButton, currentPage === 0 && styles.pageButtonDisabled]}
                            onPress={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
                            disabled={currentPage === 0}
                        >
                            <Text style={[styles.pageButtonText, currentPage === 0 && styles.pageButtonTextDisabled]}>Prev</Text>
                        </TouchableOpacity>
                        {pageNumbers.map((pageIndex) => {
                            const active = pageIndex === currentPage;
                            return (
                                <TouchableOpacity
                                    key={`page-${pageIndex}`}
                                    style={[styles.pageNumber, active && styles.pageNumberActive]}
                                    onPress={() => setCurrentPage(pageIndex)}
                                >
                                    <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{pageIndex + 1}</Text>
                                </TouchableOpacity>
                            );
                        })}
                        <TouchableOpacity
                            style={[
                                styles.pageButton,
                                currentPage >= totalPages - 1 && styles.pageButtonDisabled,
                            ]}
                            onPress={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                            disabled={currentPage >= totalPages - 1}
                        >
                            <Text
                                style={[
                                    styles.pageButtonText,
                                    currentPage >= totalPages - 1 && styles.pageButtonTextDisabled,
                                ]}
                            >
                                Next
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
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
                        headerRightLabel=""
                        headerRightComponent={renderHeaderActions(order)}
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
        paddingTop: hp(2),
        paddingBottom: hp(1),
        backgroundColor: COLORS.bg,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: RADIUS.lg,
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.8),
        backgroundColor: '#fff',
        gap: wp(2),
    },
    searchInput: {
        flex: 1,
        fontSize: rf(3.4),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
    },
    paginationMeta: {
        marginTop: hp(1.5),
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
    listContent: {
        paddingHorizontal: wp(4),
        paddingBottom: hp(4),
        paddingTop: hp(1),
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.5),
    },
    actionIconButton: {
        width: wp(8.5),
        height: wp(8.5),
        borderRadius: wp(2),
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    headerRightContainer: {
        maxWidth: '70%',
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

export default ViewSalesOrder;