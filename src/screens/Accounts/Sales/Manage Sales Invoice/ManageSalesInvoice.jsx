
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Modal, RefreshControl } from 'react-native';
import DatePickerBottomSheet from '../../../../components/common/CustomDatePicker';
import { pick, types, isCancel } from '@react-native-documents/picker';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AccordionItem from '../../../../components/common/AccordionItem';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../../../utils/responsive';
import { COLORS, TYPOGRAPHY, RADIUS } from '../../../styles/styles';
import { getCMPUUID, getENVUUID, getUUID } from '../../../../api/tokenStorage';
import api from '../../../../api/axios';
import { getSalesInvoiceHeaders, getSalesInvoiceSlip, getSalesInvoicePaymentHistory, getSalesInvoiceRelatedDocuments, getSalesOrderSlip, getSalesPerformaInvoiceSlip, updateSalesInvoicePayment, uploadFiles } from '../../../../api/authServices';
import { Linking } from 'react-native';

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
    const serverPagingModeRef = useRef(null); // 'offset' | 'pageIndex' | null

    const fetchSalesInvoices = async (page = 0, pageSize = itemsPerPage, q = searchQuery) => {
        try {
            setLoading(true);
            setError(null);
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const usePageIndex = serverPagingModeRef.current === 'pageIndex';
            const start = usePageIndex ? page : page * pageSize;
            console.log('fetchSalesInvoices ->', { page, pageSize, start, usePageIndex, serverPagingMode: serverPagingModeRef.current });
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
            // Prefer Data.TotalCount, then common total keys
            const total = Number(data?.TotalCount ?? data?.TotalRecords ?? data?.Total ?? resp?.TotalRecords ?? resp?.Total ?? records.length) || records.length;
            console.log('fetchSalesInvoices resp ->', { recordsReturned: Array.isArray(records) ? records.length : 0, totalReported: total });

            // If server reports total > 0 but returned zero records for this page, probe alternate paging mode
            if (total > 0 && Array.isArray(records) && records.length === 0 && page > 0) {
                if (!serverPagingModeRef.current) {
                    try {
                        const altStart = page; // treat start as page index
                        const altResp = await getSalesInvoiceHeaders({ cmpUuid: cmp, envUuid: env, start: altStart, length: pageSize, searchValue: q });
                        const altData = altResp?.Data || altResp || {};
                        const altRecords = Array.isArray(altData?.Records) ? altData.Records : (Array.isArray(altData) ? altData : []);
                        const altTotal = Number(altData?.TotalCount ?? altData?.TotalRecords ?? altData?.Total ?? altResp?.TotalRecords ?? altResp?.Total ?? altRecords.length) || altRecords.length;
                        console.log('fetchSalesInvoices altProbe ->', { altStart, altRecordsReturned: Array.isArray(altRecords) ? altRecords.length : 0, altTotalReported: altTotal });
                        if (Array.isArray(altRecords) && altRecords.length > 0) {
                            serverPagingModeRef.current = 'pageIndex';
                            const altNormalized = altRecords.map((r, idx) => ({
                                id: r?.UUID || r?.Id || `si-${altStart + idx + 1}`,
                                salesInvoiceNumber: r?.SalesInvoiceNo || r?.InvoiceNo || r?.SalesInvNo || r?.SalesPerInvNo || r?.SalesInvoiceNumber || '',
                                salesOrderNumber: r?.SalesOrderNo || r?.OrderNo || r?.SalesOrder || '',
                                amount: r?.Amount || r?.TotalAmount || r?.NetAmount || r?.AmountPayable || null,
                                customerName: r?.CustomerName || r?.Customer || r?.CustomerDisplayName || '',
                                deliveryDate: r?.DeliveryDate || r?.InvoiceDate || r?.OrderDate || '',
                                dueDate: r?.DueDate || r?.PaymentDueDate || '',
                                contactPerson: r?.ContactPerson || r?.Contact || '',
                                status: r?.Status || r?.State || 'Draft',
                                raw: r,
                            }));
                            setInvoices(altNormalized);
                            setTotalRecords(altTotal);
                            return;
                        }
                    } catch (e) {
                        console.warn('alternate paging probe failed', e);
                    }
                }

                // fallback to last page to avoid blank screens
                const lastPage = Math.max(0, Math.floor((total - 1) / pageSize));
                console.log('fetchSalesInvoices fallback to lastPage', { lastPage });
                if (page !== lastPage) {
                    setCurrentPage(lastPage);
                    return;
                }
            }


            setInvoices(normalized);
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
        const keys = ['UUID', 'Uuid', 'uuid', 'Id', 'id', 'HeaderUUID', 'HeaderId', 'SalesInvoiceUUID', 'SalesInvoiceId', 'InvoiceUUID', 'InvoiceId', 'HeaderUuid', 'SalesInvUUID'];
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

    // Helper to prefer server-provided error/success messages from various response shapes
    const extractApiMessage = (obj) => {
        if (!obj) return '';
        // axios error wrapper
        if (obj.response && obj.response.data) {
            const d = obj.response.data;
            return d.Message || d.message || (d.Data && (d.Data.Message || d.Data.message)) || '';
        }
        // axios success response
        if (obj.data) {
            const d = obj.data;
            return d.Message || d.message || (d.Data && (d.Data.Message || d.Data.message)) || '';
        }
        // raw object returned by some APIs
        if (typeof obj === 'object') {
            return obj.Message || obj.message || (obj.Data && (obj.Data.Message || obj.Data.message)) || (obj.data && (obj.data.Message || obj.data.message)) || '';
        }
        if (typeof obj === 'string') return obj;
        return '';
    };

    useEffect(() => {
        fetchSalesInvoices(currentPage, itemsPerPage, searchQuery);
    }, [currentPage, itemsPerPage, searchQuery]);

    // Refetch when screen comes into focus to reflect changes made on other screens
    useFocusEffect(
        useCallback(() => {
            try {
                fetchSalesInvoices(currentPage, itemsPerPage, (searchQuery || '').trim());
            } catch (e) {
                console.warn('useFocusEffect fetchSalesInvoices error', e);
            }
        }, [currentPage, itemsPerPage, searchQuery])
    );
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await fetchSalesInvoices(currentPage, itemsPerPage, searchQuery);
        } catch (e) {
            console.warn('refresh error', e);
        } finally {
            setRefreshing(false);
        }
    }, [currentPage, itemsPerPage, searchQuery]);

    const rangeStart = totalRecords === 0 ? 0 : currentPage * itemsPerPage + 1;
    const rangeEnd = totalRecords === 0 ? 0 : Math.min((currentPage + 1) * itemsPerPage, totalRecords);

    const handleDownloadInvoicePDF = async (order) => {
        try {
            setIsGeneratingPDF(true);
            const headerUuidCandidate = extractServerUuid(order?.raw) || order?.UUID || order?.id || '';
            console.log('🔍 [PDF Debug] headerUuidCandidate:', headerUuidCandidate);
            console.log('🔍 [PDF Debug] order.raw:', order?.raw);

            if (!headerUuidCandidate) {
                Alert.alert('Error', 'Unable to determine sales invoice identifier');
                return;
            }

            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const user = await getUUID();

            console.log('🔍 [PDF Debug] API params:', { headerUuid: headerUuidCandidate, cmpUuid: cmp, envUuid: env, userUuid: user });

            const pdfBase64 = await getSalesInvoiceSlip({
                headerUuid: headerUuidCandidate,
                cmpUuid: cmp,
                envUuid: env,
                userUuid: user,
            });

            console.log('🔍 [PDF Debug] pdfBase64 length:', pdfBase64?.length || 0);
            console.log('🔍 [PDF Debug] pdfBase64 first 100 chars:', pdfBase64?.substring(0, 100));

            if (!pdfBase64 || pdfBase64.length === 0) {
                Alert.alert('Error', 'No PDF data received from server');
                return;
            }

            const invoiceNumber = order?.salesInvoiceNumber || 'Unknown';
            console.log('🔍 [PDF Debug] Navigating to FileViewerScreen with:', {
                pdfBase64Length: pdfBase64.length,
                fileName: `SalesInvoice_${invoiceNumber}`,
            });

            navigation.navigate('FileViewerScreen', {
                pdfBase64: pdfBase64,
                fileName: `SalesInvoice_${invoiceNumber}`,
            });
        } catch (error) {
            console.warn('Download PDF error:', error);
            const pdfErrMsg = extractApiMessage(error) || error?.message || 'Failed to generate PDF';
            Alert.alert('Error', pdfErrMsg);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleQuickAction = async (order, actionLabel) => {
        // prefer salesInvoiceNumber for messages
        const idLabel = order?.salesInvoiceNumber || order?.id;
        try {
            if (actionLabel === 'Download') {
                await handleDownloadInvoicePDF(order);
                return;
            }

            if (actionLabel === 'Delete') {
                Alert.alert(
                    'Delete Sales Invoice',
                    'Are you sure you want to delete this sales invoice?',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Delete', style: 'destructive', onPress: async () => {
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
                                    const delMsg = extractApiMessage(resp) || 'Sales invoice deleted';
                                    Alert.alert('Success', delMsg);
                                } catch (e) {
                                    console.warn('delete sales invoice header error', e);
                                    const delErr = extractApiMessage(e) || e?.message || 'Unable to delete sales invoice';
                                    Alert.alert('Error', delErr);
                                }
                            }
                        }
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

            // Open Payment History when user clicks payment
            if (actionLabel === 'payment') {
                await openPaymentHistory(order);
                return;
            }

            // Open Forward bottom sheet when user clicks Forward
            if (actionLabel === 'Forward') {
                // prefill simple values
                setForwardForm({
                    customerName: order?.customerName || '',
                    paymentDate: '',
                    tdsAmount: '',
                    amountAfterTds: '',
                    remark: '',
                    transactionDetails: '',
                    fileName: '',
                });
                setForwardFile(null);
                setForwardTarget(order || null);
                setForwardModalVisible(true);
                // fetch payment summary for this invoice
                fetchSalesInvoicePayment(order);
                return;
            }

            // Open Related Documents when user clicks View
            if (actionLabel === 'View') {
                try {
                    setInvoiceRelatedData({ SalesOrders: [], SalesProformas: [] });
                    setInvoiceRelatedLoading(true);
                    setInvoiceRelatedModalVisible(true);
                    await fetchSalesInvoiceRelatedDocuments(order);
                } catch (e) {
                    console.warn('openSalesInvoiceRelatedDocuments error', e);
                    setInvoiceRelatedModalVisible(false);
                    Alert.alert('Error', 'Unable to load related documents');
                } finally {
                    setInvoiceRelatedLoading(false);
                }
                return;
            }

            // fallback debug message for other actions
            Alert.alert('Action Triggered', `${actionLabel} clicked for ${idLabel}`);
        } catch (err) {
            console.warn('handleQuickAction error', err);
            const actErr = extractApiMessage(err) || err?.message || 'Action failed';
            Alert.alert('Error', actErr);
        }
    };

    const renderFooterActions = (order) => {
        const buttons = [
            { icon: 'delete-outline', label: 'Delete', bg: '#FFE7E7', border: '#EF4444', color: '#EF4444' },
            { icon: 'file-download', label: 'Download', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6' },
            { icon: 'chat-bubble-outline', label: 'Forward', bg: '#E5E7EB', border: '#6B7280', color: '#6B7280' },
            { icon: 'visibility', label: 'View', bg: '#E6F9EF', border: '#22C55E', color: '#22C55E' },
            { icon: 'edit', label: 'Edit', bg: '#FFF4E5', border: '#F97316', color: '#F97316' },
            { icon: 'payment', label: 'payment', bg: '#E5F0FF', border: '#3B82F6', color: '#3B82F6' },
        ];

        return (
            <View style={styles.cardActionRow}>
                {buttons.map((btn) => {
                    const isDownloadButton = btn.label === 'Download';
                    const isDisabled = isDownloadButton && isGeneratingPDF;

                    return (
                        <TouchableOpacity
                            key={`${order.id}-${btn.icon}`}
                            activeOpacity={0.85}
                            style={[
                                styles.cardActionBtn,
                                {
                                    backgroundColor: btn.bg,
                                    borderColor: btn.border,
                                    opacity: isDisabled ? 0.6 : 1
                                }
                            ]}
                            onPress={() => handleQuickAction(order, btn.label)}
                            disabled={isDisabled}
                        >
                            {isDownloadButton && isGeneratingPDF ? (
                                <ActivityIndicator size="small" color={btn.color} />
                            ) : (
                                <Icon name={btn.icon} size={rf(3.8)} color={btn.color} />
                            )}
                        </TouchableOpacity>
                    );
                })}
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

    // Forward (chat) bottom sheet state
    const [forwardModalVisible, setForwardModalVisible] = useState(false);
    const [forwardTarget, setForwardTarget] = useState(null);
    const [forwardForm, setForwardForm] = useState({ customerName: '', paymentDate: '', tdsAmount: '', amountAfterTds: '', remark: '', transactionDetails: '', fileName: '' });
    const [forwardFile, setForwardFile] = useState(null);
    const [forwardUploadedFiles, setForwardUploadedFiles] = useState([]);
    // store only server-returned path strings (RemoteResponse.path)
    const [forwardUploadedFilePaths, setForwardUploadedFilePaths] = useState([]);
    const [forwardPaymentSummary, setForwardPaymentSummary] = useState({ totalAmount: '0', amountPaid: '0', remaining: '0' });
    const [forwardOpenDatePicker, setForwardOpenDatePicker] = useState(false);
    const [forwardDatePickerSelectedDate, setForwardDatePickerSelectedDate] = useState(new Date());

    const formatUiDate = (date) => {
        if (!date) return '';
        try {
            const d = (date instanceof Date) ? date : new Date(date);
            if (isNaN(d)) return '';
            const dd = String(d.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const mmm = months[d.getMonth()];
            const yyyy = String(d.getFullYear());
            return `${dd}-${mmm}-${yyyy}`;
        } catch (e) { return ''; }
    };

    const openForwardDatePicker = () => {
        let initial = new Date();
        const cur = forwardForm.paymentDate;
        if (cur) {
            const parsed = new Date(cur);
            if (!isNaN(parsed)) initial = parsed;
        }
        setForwardDatePickerSelectedDate(initial);
        // hide the parent modal so the bottom sheet can present on top
        setForwardModalVisible(false);
        // small delay to ensure modal is dismissed before presenting sheet
        setTimeout(() => setForwardOpenDatePicker(true), 120);
    };

    const closeForwardDatePicker = () => {
        setForwardOpenDatePicker(false);
    };

    const handleForwardDateSelect = (date) => {
        const formatted = formatUiDate(date);
        setForwardForm(f => ({ ...f, paymentDate: formatted }));
        // close picker then reopen the forward modal after a short delay
        setForwardOpenDatePicker(false);
        setTimeout(() => setForwardModalVisible(true), 160);
    };

    const closeForwardModal = () => {
        setForwardModalVisible(false);
        setForwardTarget(null);
    };

    const [forwardSubmitting, setForwardSubmitting] = useState(false);

    // Payment history bottom sheet/modal state
    const [paymentHistoryModalVisible, setPaymentHistoryModalVisible] = useState(false);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [paymentHistoryLoading, setPaymentHistoryLoading] = useState(false);

    // Related documents for Sales Invoice (View action)
    const [invoiceRelatedModalVisible, setInvoiceRelatedModalVisible] = useState(false);
    const [invoiceRelatedLoading, setInvoiceRelatedLoading] = useState(false);
    const [invoiceRelatedData, setInvoiceRelatedData] = useState({ SalesOrders: [], SalesProformas: [] });

    const uiDateToIsoDatetime = (uiDateStr) => {
        if (!uiDateStr) return '';
        try {
            const parts = uiDateStr.split('-');
            if (parts.length !== 3) return '';
            const [dd, mmm, yyyy] = parts;
            const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const mm = months[mmm] || '01';
            // return ISO datetime at start of day UTC
            return `${yyyy}-${mm}-${dd}T00:00:00Z`;
        } catch (e) { return ''; }
    };

    const handleForwardSubmit = async () => {
        // basic validation
        if (!forwardForm.customerName) {
            Alert.alert('Validation', 'Please enter Customer Name');
            return;
        }
        if (!forwardForm.paymentDate) {
            Alert.alert('Validation', 'Please enter Payment Date');
            return;
        }
        if (!forwardForm.amountAfterTds) {
            Alert.alert('Validation', 'Please enter Amount After TDS');
            return;
        }

        setForwardSubmitting(true);
        try {
            const invoiceUuid = extractServerUuid(forwardTarget?.raw) || forwardTarget?.id || forwardTarget?.UUID || '';

            // Build payload and POST via authServices wrapper using provided UUIDs
            const payload = {
                InvoiceUUID: invoiceUuid,
                PaymentDate: uiDateToIsoDatetime(forwardForm.paymentDate),
                TDSAmount: Number(forwardForm.tdsAmount) || 0,
                TransactionDetails: forwardForm.transactionDetails || '',
                Remark: forwardForm.remark || '',
                AmountPaid: Number(forwardForm.amountAfterTds) || 0,
            };
            console.log('UpdateSalesInvoicePayment payload ->', payload);

            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const user = await getUUID();
            console.log('updateSalesInvoicePayment params ->', { cmp, env, user });

            // If user previously uploaded file(s) on pick, attach those path(s) here as `FilePath`
            if (Array.isArray(forwardUploadedFilePaths) && forwardUploadedFilePaths.length > 0) {
                payload.FilePath = forwardUploadedFilePaths.length === 1 ? forwardUploadedFilePaths[0] : forwardUploadedFilePaths;
                try { console.log('Attaching FilePath to payload ->', JSON.stringify(payload.FilePath, null, 2)); } catch (_) { console.log('Attaching FilePath to payload ->', payload.FilePath); }
            }

            const resp = await updateSalesInvoicePayment(payload, { cmpUuid: cmp, envUuid: env, userUuid: user });
            console.log('updateSalesInvoicePayment resp ->', resp);
            console.log('updateSalesInvoicePayment resp12 ->', );
            const Msg = resp?.Data?.message;
            const payMsg = extractApiMessage(Msg) ;
            console.log(payMsg,'8888');
            
            Alert.alert('Success', payMsg?.Data?.message || payMsg);
            // refresh summary
            fetchSalesInvoicePayment(forwardTarget);
            closeForwardModal();
        } catch (e) {
            console.warn('handleForwardSubmit error', e);
            const fErr = extractApiMessage(e) || e?.message || 'Unable to prepare payload';
            Alert.alert('Error', fErr);
        } finally {
            setForwardSubmitting(false);
        }
    };

    const openFilePicker = async () => {
        try {
            const res = await pick({ allowMultiSelection: false, types: [types.pdf, types.images, types.zip, types.plainText] });
            // pick may return array or single
            const file = Array.isArray(res) ? res[0] : res;
            if (!file) return;
            const fileObj = { uri: file.uri || file.fileUri || file.uriString, name: file.name || file.fileName || 'attachment', type: file.type || file.mime || 'application/octet-stream' };
            setForwardFile(fileObj);
            setForwardForm(f => ({ ...f, fileName: fileObj.name }));
            // Immediately upload the picked file and store returned references
            try {
                console.log('Uploading picked file ->', fileObj);
                const uploadResp = await uploadFiles(fileObj, { filepath: 'InvoicePaymentUpdateDoc' });
                const upData = uploadResp?.Data || uploadResp || {};
                const uploadedFiles = upData?.Files || upData?.files || upData?.UploadedFiles || upData?.FilePaths || upData;
                const finalRefs = Array.isArray(uploadedFiles) ? uploadedFiles : (uploadedFiles ? [uploadedFiles] : []);
                setForwardUploadedFiles(finalRefs);
                // extract RemoteResponse.path (or path) into a simple array of strings
                const paths = finalRefs.map(r => {
                    try { return r?.RemoteResponse?.path || r?.path || (typeof r === 'string' ? r : null); } catch (_) { return null; }
                }).filter(Boolean);
                setForwardUploadedFilePaths(paths);
                try { console.log('uploadFiles returned (on pick) ->', JSON.stringify(finalRefs, null, 2)); } catch (_) { console.log('uploadFiles returned (on pick) ->', finalRefs); }
            } catch (uErr) {
                console.warn('Immediate upload failed', uErr);
                Alert.alert('Upload Error', 'Unable to upload the selected file. Please try again.');
                // clear selection on failure
                setForwardFile(null);
                setForwardForm(f => ({ ...f, fileName: '' }));
                setForwardUploadedFiles([]);
            }
        } catch (err) {
            if (isCancel(err)) {
                // user cancelled
                return;
            }
            console.warn('openFilePicker error', err);
            Alert.alert('Error', 'Unable to pick file');
        }
    };

    const openPaymentHistory = async (order) => {
        try {
            setPaymentHistory([]);
            setPaymentHistoryLoading(true);
            setPaymentHistoryModalVisible(true);
            await fetchSalesInvoicePaymentHistory(order);
        } catch (e) {
            console.warn('openPaymentHistory error', e);
            setPaymentHistoryModalVisible(false);
            Alert.alert('Error', 'Unable to load payment history');
        } finally {
            setPaymentHistoryLoading(false);
        }
    };

    const fetchSalesInvoicePaymentHistory = async (order) => {
        try {
            const invoiceUuid = extractServerUuid(order?.raw) || order?.id || order?.UUID || '';
            if (!invoiceUuid) {
                console.warn('fetchSalesInvoicePaymentHistory: no invoice UUID');
                setPaymentHistory([]);
                return;
            }
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const resp = await getSalesInvoicePaymentHistory({ invoiceUUID: invoiceUuid, cmpUuid: cmp, envUuid: env });
            const data = resp?.Data || resp || [];
            // ensure array
            const arr = Array.isArray(data) ? data : (Array.isArray(data?.Data) ? data.Data : (data?.Payments || []));
            setPaymentHistory(arr);
        } catch (e) {
            console.warn('fetchSalesInvoicePaymentHistory error', e?.message || e);
            setPaymentHistory([]);
        }
    };

    const fetchSalesInvoiceRelatedDocuments = async (order) => {
        try {
            const invoiceUuid = extractServerUuid(order?.raw) || order?.id || order?.UUID || '';
            if (!invoiceUuid) {
                console.warn('fetchSalesInvoiceRelatedDocuments: no invoice UUID');
                setInvoiceRelatedData({ SalesOrders: [], SalesProformas: [] });
                return;
            }
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const resp = await getSalesInvoiceRelatedDocuments({ salesInvoiceUuid: invoiceUuid, cmpUuid: cmp, envUuid: env });
            const data = resp?.Data || resp || {};
            setInvoiceRelatedData({ SalesOrders: Array.isArray(data?.SalesOrders) ? data.SalesOrders : [], SalesProformas: Array.isArray(data?.SalesProformas) ? data.SalesProformas : [] });
        } catch (e) {
            console.warn('fetchSalesInvoiceRelatedDocuments error', e?.message || e);
            setInvoiceRelatedData({ SalesOrders: [], SalesProformas: [] });
        }
    };

    const handleOpenSalesOrderSlip = async (so) => {
        try {
            setIsGeneratingPDF(true);
            const headerUuid = extractServerUuid(so) || so?.UUID || so?.Uuid || so?.SalesOrderUUID || so?.SalesOrderId || '';
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
            const fileName = `SalesOrder_${so?.SalesOrderNo || so?.SalesOrderNo || headerUuid}`;
            navigation.navigate('FileViewerScreen', { pdfBase64, fileName });
        } catch (e) {
            console.warn('open sales order slip error', e);
            const soErr = extractApiMessage(e) || e?.message || 'Unable to open sales order PDF';
            Alert.alert('Error', soErr);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleOpenSalesPerformaSlip = async (pf) => {
        try {
            setIsGeneratingPDF(true);
            const headerUuid = extractServerUuid(pf) || pf?.UUID || pf?.Uuid || pf?.SalesPerInvoiceUUID || pf?.SalesPerInvUUID || '';
            if (!headerUuid) {
                Alert.alert('Error', 'Unable to determine Performa identifier');
                return;
            }
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const user = await getUUID();
            const pdfBase64 = await getSalesPerformaInvoiceSlip({ headerUuid, cmpUuid: cmp, envUuid: env, userUuid: user });
            if (!pdfBase64) {
                Alert.alert('Error', 'No PDF returned for Performa Invoice');
                return;
            }
            const fileName = `SalesPerforma_${pf?.SalesPerInvNo || pf?.SalesPerformaNo || headerUuid}`;
            navigation.navigate('FileViewerScreen', { pdfBase64, fileName });
        } catch (e) {
            console.warn('open sales performa slip error', e);
            const pfErr = extractApiMessage(e) || e?.message || 'Unable to open performa PDF';
            Alert.alert('Error', pfErr);
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const fetchSalesInvoicePayment = async (order) => {
        try {
            const invoiceUuid = extractServerUuid(order?.raw) || order?.id || order?.UUID || '';
            if (!invoiceUuid) {
                console.warn('fetchSalesInvoicePayment: no invoice UUID');
                setForwardPaymentSummary({ totalAmount: '0', amountPaid: '0', remaining: '0' });
                return;
            }
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const resp = await api.get('/api/Account/GetSalesInvoicePayment', { params: { invoiceUUID: invoiceUuid, cmpUuid: cmp, envUuid: env } });
            console.log(resp, '99999');

            const data = resp?.data?.Data || resp || {};
            const total = data?.TotalAmount ?? data?.Total ?? data?.InvoiceTotal ?? 0;
            const paid = data?.TotalPaid ?? data?.Paid ?? data?.AmountPaidTillNow ?? 0;
            const remaining = data?.RemainingPayment ?? data?.Remaining ?? (Number(total || 0) - Number(paid || 0));
            setForwardPaymentSummary({ totalAmount: String(total || 0), amountPaid: String(paid || 0), remaining: String(remaining || 0) });
        } catch (e) {
            console.warn('fetchSalesInvoicePayment error', e?.message || e);
            setForwardPaymentSummary({ totalAmount: '0', amountPaid: '0', remaining: '0' });
        }
    };

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

            <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
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
                            { label: 'Order Date', value: order.deliveryDate },
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
            {/* Forward / Chat Bottom Sheet Modal */}
            <Modal visible={forwardModalVisible} transparent animationType="slide" onRequestClose={closeForwardModal}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { marginVertical: hp(1) }]}>Update Payment Status</Text>
                            <TouchableOpacity onPress={closeForwardModal}>
                                <Text style={{ color: COLORS.primary }}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalBody}>
                            <View style={{ marginBottom: hp(1.2) }}>
                                <Text style={{ fontWeight: '700', color: COLORS.text }}>Total Amount: {forwardPaymentSummary.totalAmount}</Text>
                                <Text style={{ fontWeight: '700', color: COLORS.text, marginTop: hp(0.4) }}>Amount Paid: {forwardPaymentSummary.amountPaid}</Text>
                                <Text style={{ fontWeight: '700', color: COLORS.text, marginTop: hp(0.4) }}>Remaining Payment: {forwardPaymentSummary.remaining}</Text>
                            </View>
                            <View style={styles.twoColRow}>
                                <View style={styles.colLeft}>
                                    <Text style={[styles.inputLabel, { fontWeight: '600' }]}>Customer Name*</Text>
                                    <TextInput style={styles.modalInput} value={forwardForm.customerName} onChangeText={v => setForwardForm(f => ({ ...f, customerName: v }))} placeholder="Customer" />
                                </View>
                                <View style={styles.colRight}>
                                    <Text style={[styles.inputLabel, { fontWeight: '600' }]}>Payment Date*</Text>
                                    <TouchableOpacity style={[styles.modalInput, { justifyContent: 'center' }]} onPress={openForwardDatePicker}>
                                        <Text style={{ color: forwardForm.paymentDate ? COLORS.text : COLORS.textLight }}>{forwardForm.paymentDate || 'eg.'}</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={[styles.twoColRow, { marginTop: hp(1) }]}>
                                <View style={styles.colLeft}>
                                    <Text style={[styles.inputLabel, { fontWeight: '600' }]}>TDS Amount*</Text>
                                    <TextInput style={styles.modalInput} value={forwardForm.tdsAmount} onChangeText={v => setForwardForm(f => ({ ...f, tdsAmount: v }))} placeholderTextColor="#000000" placeholder="eg." keyboardType="numeric" />
                                </View>
                                <View style={styles.colRight}>
                                    <Text style={[styles.inputLabel, { fontWeight: '600' }]}>Amount After TDS*</Text>
                                    <TextInput style={styles.modalInput} value={forwardForm.amountAfterTds} onChangeText={v => setForwardForm(f => ({ ...f, amountAfterTds: v }))} placeholderTextColor="#000000" placeholder="eg." keyboardType="numeric" />
                                </View>
                            </View>

                            <View style={{ marginTop: hp(1) }}>
                                <Text style={[styles.inputLabel, { fontWeight: '600' }]}>Attachment</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(2) }}>
                                    <TouchableOpacity style={styles.fileButton} onPress={openFilePicker}>
                                        <Text style={{ color: COLORS.text }}>{forwardForm.fileName || (forwardFile && forwardFile.name) || 'Upload file'}</Text>
                                    </TouchableOpacity>
                                    {forwardFile ? (
                                        <TouchableOpacity onPress={() => { setForwardFile(null); setForwardForm(f => ({ ...f, fileName: '' })); setForwardUploadedFiles([]); setForwardUploadedFilePaths([]); }}>
                                            <Text style={{ color: '#ef4444' }}>Remove</Text>
                                        </TouchableOpacity>
                                    ) : null}
                                </View>
                                <Text style={{ color: COLORS.textLight, marginTop: hp(0.6), fontSize: rf(2.8) }}>Allowed: PDF, images, zip (max size depends on server)</Text>
                            </View>

                            <View style={{ marginTop: hp(1) }}>
                                <Text style={[styles.inputLabel, { fontWeight: '600' }]}>Remark</Text>
                                <TextInput style={[styles.modalInput, { height: hp(10), textAlignVertical: 'top' }]} value={forwardForm.remark} placeholderTextColor="#000000" onChangeText={v => setForwardForm(f => ({ ...f, remark: v }))} multiline placeholder="eg." />
                            </View>

                            <View style={{ marginTop: hp(1) }}>
                                <Text style={[styles.inputLabel, { fontWeight: '600' }]}>Transaction Details</Text>
                                <TextInput style={[styles.modalInput, { height: hp(10), textAlignVertical: 'top' }]} value={forwardForm.transactionDetails} placeholderTextColor="#000000" onChangeText={v => setForwardForm(f => ({ ...f, transactionDetails: v }))} multiline placeholder="eg." />
                            </View>
                        </View>

                        <View style={styles.modalFooterRow}>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#e5e7eb' }]} onPress={closeForwardModal}>
                                <Text>Close</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: COLORS.primary }]} onPress={handleForwardSubmit}>
                                <Text style={{ color: '#fff' }}>Submit</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Sales Invoice - Related Documents Modal */}
            <Modal visible={invoiceRelatedModalVisible} transparent animationType="slide" onRequestClose={() => setInvoiceRelatedModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { marginVertical: hp(1) }]}>Related Documents</Text>
                            <TouchableOpacity onPress={() => setInvoiceRelatedModalVisible(false)} style={{ padding: wp(1.2) }}>
                                <Icon name="close" size={rf(3.6)} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.modalBody, { paddingBottom: hp(2) }]}>
                            {invoiceRelatedLoading && (
                                <View style={{ paddingVertical: hp(2), alignItems: 'center' }}>
                                    <ActivityIndicator />
                                </View>
                            )}

                            {!invoiceRelatedLoading && (
                                <View>
                                    <Text style={{ fontWeight: '700', color: COLORS.text, marginBottom: hp(1) }}>Sales Orders</Text>
                                    {Array.isArray(invoiceRelatedData.SalesOrders) && invoiceRelatedData.SalesOrders.length > 0 ? (
                                        invoiceRelatedData.SalesOrders.map((o, i) => (
                                            <TouchableOpacity key={`so-${i}`} onPress={() => handleOpenSalesOrderSlip(o)} style={{ paddingVertical: hp(0.6) }}>
                                                <Text style={{ color: COLORS.primary }}>{o.SalesOrderNo} - Date: {o.SalesOrderDate}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={{ color: COLORS.textLight }}>No sales orders found</Text>
                                    )}

                                    <View style={{ height: hp(1) }} />

                                    <Text style={{ fontWeight: '700', color: COLORS.text, marginBottom: hp(1) }}>Sales Proformas</Text>
                                    {Array.isArray(invoiceRelatedData.SalesProformas) && invoiceRelatedData.SalesProformas.length > 0 ? (
                                        invoiceRelatedData.SalesProformas.map((pf, j) => (
                                            <TouchableOpacity key={`pf-${j}`} onPress={() => handleOpenSalesPerformaSlip(pf)} style={{ paddingVertical: hp(0.6) }}>
                                                <Text style={{ color: COLORS.text }}>{pf.SalesPerInvNo || pf.PerformaInvoiceNo || pf.SalesPerformaNo || pf.SalesProformaNo || '—'}</Text>
                                            </TouchableOpacity>
                                        ))
                                    ) : (
                                        <Text style={{ color: COLORS.textLight }}>No sales proformas found</Text>
                                    )}
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Payment History Bottom Sheet Modal */}
            <Modal visible={paymentHistoryModalVisible} transparent animationType="slide" onRequestClose={() => setPaymentHistoryModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={[styles.modalTitle, { marginVertical: hp(1) }]}>Payment History</Text>
                            <TouchableOpacity onPress={() => setPaymentHistoryModalVisible(false)} style={{ padding: wp(1.2) }}>
                                <Icon name="close" size={rf(3.6)} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.modalBody, { paddingBottom: hp(2) }]}>
                            {paymentHistoryLoading && (
                                <View style={{ paddingVertical: hp(2), alignItems: 'center' }}>
                                    <ActivityIndicator />
                                </View>
                            )}

                            {!paymentHistoryLoading && Array.isArray(paymentHistory) && paymentHistory.length === 0 && (
                                <View style={{ paddingVertical: hp(2) }}>
                                    <Text style={{ color: COLORS.textLight }}>No payment records found.</Text>
                                </View>
                            )}

                            {!paymentHistoryLoading && Array.isArray(paymentHistory) && paymentHistory.map((p, idx) => (
                                <View key={`ph-${idx}`} style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingVertical: hp(1.2) }}>
                                    {/* Row: Payment Date (label left, value right) */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Payment Date</Text>
                                        <Text style={{ color: COLORS.text }}>{p.PaymentDate || p.paymentDate || ''}</Text>
                                    </View>

                                    {/* Row: Amount heading on right (show After TDS as main) */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: hp(0.6) }}>
                                        <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Amount</Text>
                                    </View>

                                    {/* TDS and After TDS rows (label left, value right) */}
                                    <View style={{ marginTop: hp(0.6) }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: rf(3.2)  }}>TDS Amount</Text>
                                            <Text style={{ color: COLORS.text }}>{p.TdsAmount ?? p.TDSAmount ?? p.tdsAmount ?? '0'}</Text>
                                        </View>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: hp(0.4) }}>
                                            <Text style={{ color: COLORS.textMuted, fontWeight: '400', fontSize: rf(3.2) }}>After TDS</Text>
                                            <Text style={{ color: COLORS.text }}>{p.AfterTdsAmount ?? p.AfterTDSAmount ?? p.afterTdsAmount ?? '0'}</Text>
                                        </View>
                                    </View>

                                    {/* Transaction Details */}
                                    <View style={{ marginTop: hp(0.6), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Transaction Details</Text>
                                        <Text style={{ color: COLORS.text }}>{p.TransactionDetails || p.transactionDetails || ''}</Text>
                                    </View>

                                    {/* Remark row */}
                                    <View style={{ marginTop: hp(0.6) }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Remark</Text>
                                            <Text style={{ color: COLORS.text }}>{p.Remark || p.remark || ''}</Text>
                                        </View>
                                        {/* Attachment row */}
                                        <View style={{ marginTop: hp(0.6), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={{ color: COLORS.textMuted, fontWeight: '600' }}>Attachment</Text>
                                            {p.AttachmentUrl || p.attachmentUrl ? (
                                                <TouchableOpacity onPress={() => {
                                                    try { Linking.openURL(p.AttachmentUrl || p.attachmentUrl); } catch (e) { Alert.alert('Error', 'Unable to open attachment'); }
                                                }} style={{ paddingVertical: hp(0.6), paddingHorizontal: wp(3), backgroundColor: '#f3f4f6', borderRadius: wp(1) }}>
                                                    <Text style={{ color: COLORS.primary }}>View</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <Text style={{ color: COLORS.textLight }}>No Attachment</Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                </View>
            </Modal>
            <DatePickerBottomSheet
                isVisible={forwardOpenDatePicker}
                onClose={closeForwardDatePicker}
                selectedDate={forwardDatePickerSelectedDate}
                onDateSelect={handleForwardDateSelect}
                title="Select Payment Date"
            />
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalBox: {
        backgroundColor: '#fff',
        borderTopLeftRadius: wp(3),
        borderTopRightRadius: wp(3),
        padding: wp(4),
        maxHeight: hp(85),
    },
    modalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: { fontSize: rf(3.6), fontWeight: '700', color: COLORS.text },
    modalBody: { marginTop: hp(1) },
    twoColRow: { flexDirection: 'row', justifyContent: 'space-between' },
    colLeft: { width: '48%' },
    colRight: { width: '48%' },
    inputLabel: { color: COLORS.textMuted, marginBottom: hp(0.6) },
    modalInput: { color: '#000', borderWidth: 1, borderColor: COLORS.border, borderRadius: wp(1.2), padding: wp(2), backgroundColor: '#fff' },
    fileButton: { backgroundColor: '#f3f4f6', paddingVertical: hp(0.8), paddingHorizontal: wp(3), borderRadius: wp(1) },
    modalFooterRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: hp(1.5), gap: wp(2) },
    modalBtn: { paddingVertical: hp(1), paddingHorizontal: wp(4), borderRadius: wp(1) },
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