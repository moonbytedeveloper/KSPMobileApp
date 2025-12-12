import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../../../utils/responsive';
import { getPurchasePerformaInvoiceHeaders, deletePurchasePerformaInvoiceHeader, getPurchasePerformaInvoiceSlip, convertPurchasePerformaToInvoice } from '../../../../api/authServices';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';

const SALES_ORDERS = [
    {
        id: 'KP1524',
        salesOrderNumber: 'KP1524',
        customerName: 'Moonbyte',
        deliveryDate: '15-12-24',
        dueDate: '15-12-24',
        amount: 'KP1524',
        performaInvoiceNumber: 'KSP',
     
    },
    {
        id: 'KP1525',
        salesOrderNumber: 'KP1525',
        customerName: 'Northwind Retail',
        deliveryDate: '04-01-25',
        dueDate: '20-12-24',
        amount: 'KP1524',
        performaInvoiceNumber: 'Moon',
       
    },
    {
        id: 'KP1526',
        salesOrderNumber: 'KP1526',
        customerName: 'Creative Labs',
        deliveryDate: '22-12-24',
        dueDate: '18-12-24',
        amount: 'KP1524',
        performaInvoiceNumber: 'KSP',
        
    },
    {
        id: 'KP1527',
        salesOrderNumber: 'KP1527',
        customerName: 'BlueStone Pvt Ltd',
        deliveryDate: '11-01-25',
        dueDate: '28-12-24',
        amount: 'KP1524',
        performaInvoiceNumber: 'BlueStone',
     
    },
    {
        id: 'KP1528',
        salesOrderNumber: 'KP1528',
        customerName: 'Aero Technologies',
        deliveryDate: '29-12-24',
        dueDate: '24-12-24',
        amount: 'KP1524',
        status: 'Approved',
        performaInvoiceNumber: 'KSP',
       
    },
    {
        id: 'KP1529',
        salesOrderNumber: 'KP1529',
        customerName: 'UrbanNest Homes',
        deliveryDate: '05-02-25',
        dueDate: '12-01-25',
        amount: 'KP1524',
        performaInvoiceNumber: 'UrbanNest',
        
    },
];

const ITEMS_PER_PAGE_OPTIONS = ['5', '10', '20', '50'];

const ViewPerfomaPurchaseInvoice = () => {
    const navigation = useNavigation();
    const [activeOrderId, setActiveOrderId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [itemsPerPage, setItemsPerPage] = useState(Number(ITEMS_PER_PAGE_OPTIONS[1]));
    const [currentPage, setCurrentPage] = useState(0);
    const [orders, setOrders] = useState([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Orders are fetched from API; filtering/search handled server-side via `searchQuery` param
    const filteredOrders = orders || [];

    const totalPages = useMemo(() => {
        if (!totalCount || totalCount === 0) return 0;
        return Math.ceil(totalCount / itemsPerPage);
    }, [totalCount, itemsPerPage]);

    useEffect(() => {
        if (totalPages === 0) {
            if (currentPage !== 0) setCurrentPage(0);
            return;
        }
        if (currentPage > totalPages - 1) {
            setCurrentPage(totalPages - 1);
        }
    }, [totalPages, currentPage]);

    // When using server pagination, `orders` already represents the current page
    const paginatedOrders = filteredOrders;

    const rangeStart = totalCount === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = totalCount === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, totalCount);

    // Fetch orders from server when pagination or search changes
    // Reusable loader so other events (like navigation focus) can request a refresh
    const loadOrders = async () => {
        setLoading(true);
        try {
            const start = currentPage * itemsPerPage;
            const resp = await getPurchasePerformaInvoiceHeaders({ start, length: itemsPerPage, searchValue: searchQuery });
            // Normalise response shapes. API returns an object with `Data` containing `Records` and `TotalCount`.
            const respRoot = resp && (resp.Data || resp.data || resp) || {};
            const dataArray = respRoot.Records || respRoot.Data || respRoot.items || respRoot.Items || respRoot.Result || [];
            const total = respRoot.TotalCount ?? respRoot.RecordsTotal ?? respRoot.RecordsFiltered ?? respRoot.TotalRecords ?? respRoot.Total ?? (Array.isArray(dataArray) ? dataArray.length : 0);
            setOrders(Array.isArray(dataArray) ? dataArray : []);
            setTotalCount(Number(total) || (Array.isArray(dataArray) ? dataArray.length : 0));
            console.log(resp, 'resp');
        } catch (err) {
            console.error('Error fetching purchase performa invoice headers ->', err && (err.message || err));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // initial load and when pagination/search changes
        loadOrders();
    }, [itemsPerPage, currentPage, searchQuery]);

    // Reload when screen gains focus (for example after returning from Add screen)
    useEffect(() => {
        const unsub = navigation.addListener('focus', () => {
            loadOrders();
        });
        return unsub;
    }, [navigation, itemsPerPage, currentPage, searchQuery]);

    const handleQuickAction = (order, actionLabel) => {
        Alert.alert('Action Triggered', `${actionLabel} clicked for ${order.salesOrderNumber}`);
    };

    const handleDownloadPDF = async (order) => {
        try {
            const headerUuid = order.UUID || order.HeaderUUID || order.PerformaInvoiceHeaderUUID || order.id;
            if (!headerUuid) {
                Alert.alert('Error', 'Header UUID not found');
                return;
            }

            setIsGeneratingPDF(true);
            const pdfBase64 = await getPurchasePerformaInvoiceSlip({ headerUuid });
            
            if (pdfBase64) {
                // Navigate to FileViewerScreen with the PDF data
                navigation.navigate('FileViewerScreen', {
                    pdfBase64,
                    fileName: `Purchase_Performa_Invoice_${order.PerformaInvoiceNumber || order.HeaderNumber || headerUuid}.pdf`,
                    opportunityTitle: order.PerformaInvoiceNumber || order.HeaderNumber || 'Purchase Performa Invoice',
                    companyName: order.VendorName || order.SupplierName || order.CustomerName || '',
                });
            } else {
                Alert.alert('Error', 'Failed to generate PDF');
            }
        } catch (error) {
            console.error('PDF generation error:', error);
            Alert.alert('Error', error.message || 'Failed to generate PDF');
        } finally {
            setIsGeneratingPDF(false);
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
                        key={`${order.UUID || order.HeaderUUID || order.id || JSON.stringify(order)}-${btn.icon}`}
                        activeOpacity={0.85}
                        style={[styles.cardActionBtn , { backgroundColor: btn.bg, borderColor: btn.border }]}
                        disabled={btn.action === 'Download' && isGeneratingPDF}
                        onPress={() => {
                            if (btn.action === 'Edit') {
                                try {
                                    const headerUuid = order.UUID || order.HeaderUUID || order.id || null;
                                    navigation.navigate('AddPerfomaPurchaseInvoice', { prefillHeader: order, headerUuid });
                                } catch (e) {
                                    console.warn('Failed to navigate to AddPerfomaPurchaseInvoice', e);
                                    handleQuickAction(order, 'Edit');
                                }
                                return;
                            }

                            if (btn.action === 'Delete') {
                                // Confirm then call API
                                Alert.alert(
                                    'Confirm Delete',
                                    'Are you sure you want to delete this header?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Delete',
                                            style: 'destructive',
                                            onPress: async () => {
                                                try {
                                                    const headerUuid = order.UUID || order.HeaderUUID || order.id || null;
                                                    if (!headerUuid) throw new Error('No header UUID found');
                                                    await deletePurchasePerformaInvoiceHeader({ headerUuid });
                                                    // remove from local list
                                                    setOrders(prev => Array.isArray(prev) ? prev.filter(o => {
                                                        const id = o.HeaderUUID || o.UUID || o.id || o.headerUuid || o.HeaderId || o.Id;
                                                        return id !== (order.HeaderUUID || order.UUID || order.id || order.headerUuid || order.HeaderId || order.Id);
                                                    }) : []);
                                                    setTotalCount(c => Math.max(0, (c || 1) - 1));
                                                    Alert.alert('Deleted', 'Header deleted successfully');
                                                } catch (e) {
                                                    console.error('Delete error ->', e);
                                                    Alert.alert('Error', e?.message || 'Unable to delete header');
                                                }
                                            }
                                        }
                                    ],
                                );
                                return;
                            }

                            if (btn.action === 'Download') {
                                handleDownloadPDF(order);
                                return;
                            }

                            if (btn.action === 'Forward') {
                                // Convert performa to invoice when Forward is clicked
                                const headerUuid = order.UUID || order.HeaderUUID || order.PerformaInvoiceHeaderUUID || order.id;
                                Alert.alert(
                                    'Convert to Invoice',
                                    'Do you want to convert this performa to invoice?',
                                    [
                                        { text: 'Cancel', style: 'cancel' },
                                        {
                                            text: 'Convert',
                                            onPress: async () => {
                                                try {
                                                    console.log('ViewPerfomaPurchaseInvoice -> converting performa to invoice ->', headerUuid);
                                                    const response = await convertPurchasePerformaToInvoice({ performaUuid: headerUuid });
                                                    
                                                    // Show success message from API
                                                    const successMessage = response?.Message || response?.message || 'Performa converted to invoice successfully';
                                                    Alert.alert('Success', successMessage);
                                                    
                                                    // Optionally navigate to invoice screen with new invoice UUID
                                                    const newInvoiceUuid = response?.Data?.headerUUID || response?.Data?.HeaderUUID || response?.Data?.UUID || response?.headerUUID || response?.HeaderUUID || response?.UUID;
                                                    if (newInvoiceUuid) {
                                                        console.log('ViewPerfomaPurchaseInvoice -> New Invoice UUID from conversion:', newInvoiceUuid);
                                                        // Navigate to ManagePurchaseInvoice with the headerUuid
                                                        navigation.navigate('AddPurchaseInvoice', { headerUuid: newInvoiceUuid });
                                                    }
                                                    
                                                } catch (err) {
                                                    console.error('Failed to convert performa', err);
                                                    Alert.alert('Error', err?.message || 'Failed to convert performa to invoice');
                                                }
                                            }
                                        }
                                    ]
                                );
                                return;
                            }

                            handleQuickAction(order, btn.action);
                        }}
                    >
                        {btn.action === 'Download' && isGeneratingPDF ? (
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
                    title="View Perfoma Purchase Invoice"
                onLeftPress={() => navigation.goBack()}
                onRightPress={() => navigation.navigate('AddPerfomaPurchaseInvoice')}
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
                {paginatedOrders.map((order) => {
                    const id = order.HeaderUUID || order.UUID || order.id || order.headerUuid || order.HeaderId || order.Id || (order.PerformaInvoiceHeaderUUID || null);
                    const salesOrderNumber = order.SalesOrderNumber || order.PurchaseOrderNumber || order.HeaderNumber || order.DocumentNo || order.Code || order.salesOrderNumber || '';
                    const customerName = order.VendorName || order.SupplierName || order.CustomerName || order.PartyName || order.customerName || order?.VendorUUID || order.CustomerUUID || '';
                    const deliveryDate = order.DeliveryDate || order.DueDate || order.deliveryDate || '';
                    const performaInvoiceNumber = order.PerformaInvoiceNumber || order.PerformaInvoiceNo || order.PerformaInvoice || order.performaInvoiceNumber || '';
                    const amount = order.GrandTotal || order.Amount || order.Total || order.amount || '';
                    // New fields from API: InvoiceNo and OrderDate
                    const invoiceNo = order.InvoiceNo || order.InvoiceNumber || order.PerformaInvoiceNo || performaInvoiceNumber || '';
                    const PurchaseOrderNo = order.PurchaseOrderNo || order.PurchaseOrderNo || order.PurchaseOrderNo  || '';
                    const orderDate = order.OrderDate || order.Order_On || order.OrderedDate || order.Ordered_On || '';
                    const projectName = order.ProjectName || order.ProjectTitle || order.Project || order.Project_Name || order.ProjectTitleName || '';

                    return (
                        <AccordionItem
                            key={id || JSON.stringify(order)}
                            item={{
                                soleExpenseCode: id,
                                // Show project name in the left header; fallback to purchase order no.
                                expenseName: projectName || PurchaseOrderNo,
                                amount: order.TotalAmount || order.GrandTotal || order.Amount || order.Total || amount || '0',
                            }}
                            isActive={activeOrderId === id}
                            onToggle={() => setActiveOrderId((prev) => (prev === id ? null : id))}
                            customRows={[
                                { label: 'Vendor Name', value: customerName },
                                { label: 'Invoice No', value: invoiceNo },
                                { label: 'Order Date', value: orderDate },
                            ]}
                            headerLeftLabel="Project"
                            headerRightLabel="Amount"
                            footerComponent={renderFooterActions(order)}
                            headerRightContainerStyle={styles.headerRightContainer}
                        />
                    );
                })}

                {paginatedOrders.length === 0 && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>No sales orders found</Text>
                        <Text style={styles.emptyStateSubtitle}>
                            Try adjusting your search keyword or create a new sales order.
                        </Text>
                    </View>
                )}
            </ScrollView>

            {totalCount > 0 && (
                <View style={styles.paginationContainer}>
                    <Text style={styles.pageInfoText}>
                        Showing {totalCount === 0 ? 0 : rangeStart} to {rangeEnd} of {totalCount} entries
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

export default ViewPerfomaPurchaseInvoice;