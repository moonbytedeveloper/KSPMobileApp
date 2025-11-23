import React, { useState, useEffect } from 'react';
import { useRoute } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
    PermissionsAndroid,
    Platform,
    Modal,
    TouchableWithoutFeedback,
    ActivityIndicator,
} from 'react-native';
import { wp, hp, rf } from '../../../../utils/responsive';
import Dropdown from '../../../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, inputStyles, SPACING } from '../../../styles/styles';
import AppHeader from '../../../../components/common/AppHeader';
import { useNavigation } from '@react-navigation/native';
import { formStyles } from '../../../styles/styles';
import DatePickerBottomSheet from '../../../../components/common/CustomDatePicker';
import { pick, types, isCancel } from '@react-native-documents/picker';
import { getPaymentTerms, getPaymentMethods, fetchProjects, getAllInquiryNumbers, getCustomers, getCountries, getSalesOrderNumbers, addSalesInvoiceHeader, addSalesInvoiceLine, updateSalesInvoiceHeader, getSalesInvoiceHeaderById, getSalesInvoiceHeaders, getSalesInvoiceLines, updateSalesInvoiceLine, deleteSalesInvoiceLine, getItems } from '../../../../api/authServices';
import { getCMPUUID, getENVUUID, getUUID } from '../../../../api/tokenStorage';

const COL_WIDTHS = {
    ITEM: wp(50), // 35%
    QTY: wp(35), // 30%
    RATE: wp(35), // 30%
    TAX: wp(35), // 30%
    AMOUNT: wp(35), // 30%
    ACTION: wp(35), // 30%
};
const AccordionSection = ({
    id,
    title,
    expanded,
    onToggle,
    children,
    wrapperStyle,
    rightActions,
}) => {
    return (
        <View style={[styles.sectionWrapper, wrapperStyle]}>
            {/* <TouchableOpacity
                activeOpacity={0.8}
                style={styles.sectionHeader}
                onPress={() => {
                  setStatus && setStatus(undefined);
                  setOpenSection1(true);
                  setOpenSection2(false);
                  setOpenSection3(false);
                }}
              >
                <Text style={styles.sectionHeaderText}>Basic Details</Text>
                <Icon name={openSection1 ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.text} />
              </TouchableOpacity> */}
            <TouchableOpacity
                activeOpacity={0.8}
                style={styles.sectionHeader}
                onPress={() => onToggle(id)}
            >
                <Text style={styles.sectionTitle}>{title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {rightActions ? rightActions : null}
                    <Icon
                        name={expanded ? 'expand-less' : 'expand-more'}
                        size={rf(4.2)}
                        color={COLORS.text}
                    />
                </View>
            </TouchableOpacity>
            {expanded && <View style={styles.line} />}
            {expanded && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
};

const AddSalesPerfomaInvoice = () => {
    // Keep header closed by default; only open when user clicks Edit
    const [expandedId, setExpandedId] = useState(null);
    const navigation = useNavigation();
    const route = useRoute();
    React.useEffect(() => {
        try {
            console.log('AddSalesInvoice: route.params ->', route?.params);
        } catch (e) {
            console.warn('AddSalesInvoice: failed to log route.params', e);
        }
    }, [route?.params]);

    // If navigated from ManageSalesInvoice (edit click), restrict UI to header-only
    useEffect(() => {
        try {
            const from = route?.params?.from || route?.params?.fromScreen || route?.params?.source || route?.params?.prevScreen || route?.params?.cameFrom;
            const fromManage = typeof from === 'string' && String(from).toLowerCase().includes('managesalesinvoice');
            const explicitFlag = route?.params?.fromManageSalesInvoice === true || route?.params?.restrictToHeader === true;
            // If caller explicitly asked to restrict, or we detect it came from ManageSalesInvoice, enable restriction
            if (explicitFlag || fromManage) {
                setRestrictToHeader(true);
                // Open header by default so user sees it immediately
                setExpandedId(1);
                // Make header editable so they can submit
                setHeaderEditable(true);
            }
        } catch (e) {
            // ignore
        }
    }, [route?.params]);
    const toggleSection = id => {
        // Prevent opening the header section unless it's in editable mode (user clicked Edit)
        if (id === 1 && !headerEditable) {
            return; // silently ignore open attempts until Edit is clicked
        }

        // If we're restricting the UI to header-only (navigated from ManageSalesInvoice edit),
        // do not allow opening other sections until the header has been submitted.
        if (restrictToHeader && !headerSubmitted && id !== 1) {
            return;
        }

        // If header is submitted, prevent opening other sections
        if (typeof headerSubmitted !== 'undefined' && headerSubmitted && id !== 1) {
            // When header is already submitted, don't allow opening other sections
            // and do not auto-open header — user must click Edit to open header.
            setExpandedId(null);
            return;
        }

        setExpandedId(prev => (prev === id ? null : id));
    };

    // Demo options for dropdowns
    const paymentTerms = ['Monthly'];
    const projects = ['Mobile App',];
    const taxOptions = ['IGST', 'CGST', 'SGST', 'No Tax'];
    const countries = ['India', 'United States', 'United Kingdom'];
    const salesInquiries = ['KSPIN002', 'KSPIN005'];
    const customers = ['Acme Corp', 'Beta Ltd'];
    const state = ['Gujarat', 'Delhi', 'Mumbai'];
    const city = ['vadodara', 'surat',];

    const paymentMethods = [
        'Cash',
        'Bank Transfer',
        'Mobile App Development',

    ];

    // Lookup option state (bound same as ManageSalesOrder)
    const [paymentTermsOptions, setPaymentTermsOptions] = useState([]);
    const [paymentMethodsOptions, setPaymentMethodsOptions] = useState([]);
    const [projectsOptions, setProjectsOptions] = useState([]);
    const [customersOptions, setCustomersOptions] = useState([]);
    const [salesInquiryNosOptions, setSalesInquiryNosOptions] = useState([]);
    const [salesOrderOptions, setSalesOrderOptions] = useState([]);
    const [salesOrderUuid, setSalesOrderUuid] = useState(null);
    const [headerSubmitting, setHeaderSubmitting] = useState(false);
    const [headerUUID, setHeaderUUID] = useState(null);
    const [headerSubmitted, setHeaderSubmitted] = useState(false);
    const [headerEditable, setHeaderEditable] = useState(true);
    const [restrictToHeader, setRestrictToHeader] = useState(false);
    const [paymentTermUuid, setPaymentTermUuid] = useState(null);
    const [paymentMethodUUID, setPaymentMethodUUID] = useState(null);
    const [projectUUID, setProjectUUID] = useState(null);
    const [salesInquiryUuid, setSalesInquiryUuid] = useState(null);

    // Fetch lookups (payment terms, methods, projects, inquiries) similar to ManageSalesOrder
    React.useEffect(() => {
        const extractArray = (resp) => {
            const d = resp?.Data ?? resp;
            if (Array.isArray(d)) return d;
            if (Array.isArray(d?.List)) return d.List;
            if (Array.isArray(d?.Records)) return d.Records;
            if (Array.isArray(d?.Items)) return d.Items;
            return [];
        };

        (async () => {
            try {
                const [custResp, termsResp, methodsResp, projectsResp, inquiriesResp, salesOrdersResp] = await Promise.all([
                    getCustomers(),
                    getPaymentTerms(),
                    getPaymentMethods(),
                    fetchProjects(),
                    getAllInquiryNumbers(),
                    getSalesOrderNumbers(),
                ]);

                const custList = extractArray(custResp);
                const termsList = extractArray(termsResp);
                const methodsList = extractArray(methodsResp);
                const projectsList = extractArray(projectsResp);
                const inquiriesList = extractArray(inquiriesResp);
                const salesOrdersList = extractArray(salesOrdersResp);
                console.log(salesOrdersList, 'salesordernum');

                const normalizedInquiries = (Array.isArray(inquiriesList) ? inquiriesList : []).map((r) => ({
                    UUID: r?.UUID || r?.Uuid || r?.Id || r?.InquiryUUID || r?.SalesInquiryUUID || null,
                    InquiryNo: r?.SalesInqNo || r?.SalesInquiryNo || r?.InquiryNo || r?.Name || r?.Title || String(r),
                    raw: r,
                }));

                setCustomersOptions(custList);
                setPaymentTermsOptions(termsList);
                setPaymentMethodsOptions(methodsList);
                setProjectsOptions(projectsList);
                setSalesInquiryNosOptions(normalizedInquiries);
                const normalizedSalesOrders = (Array.isArray(salesOrdersList) ? salesOrdersList : []).map((r) => {
                    const uuid = r?.UUID || r?.Uuid || r?.Id || r?.SalesOrderUUID || r?.SalesOrderId || null;

                    const extractString = (val) => {
                        if (val === null || val === undefined) return '';
                        if (typeof val === 'string') return val;
                        if (typeof val === 'number' || typeof val === 'boolean') return String(val);
                        if (typeof val === 'object') {
                            // try explicit readable subfields (including 'Names')
                            const sub = val?.Names || val?.Name || val?.Title || val?.OrderNo || val?.SalesOrderNo || val?.SalesOrderNumber || val?.Value || val?.Text || val?.DisplayName;
                            if (typeof sub === 'string' && sub.trim() !== '') return sub;
                            // search for first string property that isn't an id/uuid
                            try {
                                for (const k in val) {
                                    if (!Object.prototype.hasOwnProperty.call(val, k)) continue;
                                    const low = String(k).toLowerCase();
                                    if (/(uuid|^id$|id$|guid)$/.test(low)) continue; // skip id-like keys
                                    const v = val[k];
                                    if (typeof v === 'string' && v.trim() !== '') return v;
                                }
                            } catch (e) { }
                            // fallback to toString if informative
                            try {
                                const s = val?.toString && val.toString();
                                if (s && s !== '[object Object]') return s;
                            } catch (e) { }
                            return JSON.stringify(val);
                        }
                        return String(val);
                    };

                    const rawOrderCandidate = r?.SalesOrderNo ?? r?.SalesOrderNumber ?? r?.OrderNumber ?? r?.OrderNo ?? r?.Name ?? r?.Title ?? r;
                    const orderNoStr = extractString(rawOrderCandidate);
                    return { UUID: uuid, OrderNo: orderNoStr, raw: r };
                });
                setSalesOrderOptions(normalizedSalesOrders);
                console.log(normalizedSalesOrders, 'normalizedSalesOrders');

            } catch (e) {
                console.warn('Lookup fetch error', e?.message || e);
            }
        })();
    }, []);

    // Prefill header if navigated here with `prefillHeader` param
    useEffect(() => {
        const p = route?.params?.prefillHeader;
        if (!p) return;
        setPrefillLoading(true);
        const data = p?.Data || p;
        try {
            // Extract Sales Inquiry UUID first
            const inquiryUuid = data?.SalesInqNoUUID || data?.SalesInquiryUUID || data?.SalesInquiryId || data?.SalesInquiryUuid || null;
            if (inquiryUuid) {
                setSalesInquiryUuid(inquiryUuid);
                // If salesInquiry options already loaded, map uuid -> InquiryNo immediately
                try {
                    const found = (salesInquiryNosOptions || []).find(s =>
                        s?.UUID === inquiryUuid || s?.Uuid === inquiryUuid || s?.Id === inquiryUuid || String(s?.UUID) === String(inquiryUuid)
                    );
                    if (found && found.InquiryNo) setHeaderForm(s => ({ ...s, salesInquiry: found.InquiryNo }));
                } catch (e) { /* ignore */ }
            }

            // If we only have UUID, leave it empty and let the mapping useEffect handle it
            const inquiryNo = data?.SalesInqNo || data?.SalesInquiryNo || data?.InquiryNo || '';
            // Check if inquiryNo is actually a UUID - if so, treat it as salesInquiryUuid
            const isInquiryNoUuid = inquiryNo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inquiryNo);

            // Prefill Sales Invoice number (SalesInvNo) first, then fallback to performa fields
            const salesInvValue = data?.SalesInvNo || data?.SalesInvoiceNo || data?.SalesInv || data?.SalesPerInvNo || data?.PerformaInvoiceNo || data?.PerformaNo || data?.SalesPerformaNo || '';

            // If the API accidentally provided a UUID in place of the readable Sales Invoice number,
            // attempt to resolve it to a human-friendly invoice number before showing it in the input.
            const isSalesInvUuid = salesInvValue && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(salesInvValue);

            // optimistic set: set salesInquiryText to raw value for now, then attempt resolution if it's a UUID
            setHeaderForm(s => ({
                ...s,
                salesInquiryText: salesInvValue || s.salesInquiryText || '',
                // Only set salesInquiry if we have a valid InquiryNo (not a UUID)
                // If we only have UUID, leave it empty - the mapping useEffect will fill it
                salesInquiry: (inquiryNo && !isInquiryNoUuid) ? inquiryNo : '',
                clientName: data?.SalesOrderNo || data?.OrderNo || data?.SalesOrderNumber || s.clientName || '',
                CustomerUUID: data?.CustomerUUID || data?.CustomerId || s.CustomerUUID || null,
                CustomerName: data?.CustomerName || s.CustomerName || '',
            }));

            if (isSalesInvUuid) {
                (async () => {
                    try {
                        const cmp = await getCMPUUID();
                        const env = await getENVUUID();
                        const resp = await getSalesInvoiceHeaderById({ headerUuid: salesInvValue, cmpUuid: cmp, envUuid: env });
                        const resolved = resp?.Data || resp || null;
                        const resolvedNo = resolved?.SalesInvNo || resolved?.SalesInvoiceNo || resolved?.SalesPerInvNo || resolved?.PerformaInvoiceNo || resolved?.PerformaNo || resolved?.SalesPerformaNo || '';
                        if (resolvedNo) {
                            setHeaderForm(s => ({ ...s, salesInquiryText: resolvedNo }));
                        }
                    } catch (e) {
                        console.warn('Failed to resolve Sales Invoice UUID to number', e?.message || e);
                    }
                })();
            }

            // If inquiryNo itself is a UUID (some payloads put UUID in SalesInqNo), set salesInquiryUuid so the mapping effect can resolve display name
            if (isInquiryNoUuid) {
                setSalesInquiryUuid(inquiryNo);
            }
            setInvoiceDate(data?.OrderDate || data?.PerformaDate || '');
            setDueDate(data?.DueDate || '');
            setShippingCharges(String(data?.ShippingCharges ?? data?.ShippingCharge ?? 0));
            setAdjustments(String(data?.AdjustmentPrice ?? data?.Adjustment ?? 0));
            setTerms(data?.TermsConditions || data?.Terms || '');
            setNotes(data?.CustomerNotes || data?.Notes || '');
            const headerUuid = data?.UUID || data?.Id || data?.HeaderUUID || null;
            setHeaderUUID(headerUuid);
            if (data?.FilePath) setFile({ uri: data.FilePath, name: data.FilePath });
            // If headerUUID exists, it's edit mode - make it editable by default
            // Otherwise, it's view mode - make it non-editable
            setHeaderSubmitted(true);
            setHeaderEditable(!!headerUuid); // true if headerUuid exists (edit mode), false otherwise (view mode)
            // Do not auto-open header on prefill; user must click Edit to open
        } catch (e) {
            console.warn('prefill header failed', e);
        } finally {
            setPrefillLoading(false);
        }
    }, [route?.params?.prefillHeader]);

    // Fetch header data by UUID when headerUuid is present in route params (edit mode)
    useEffect(() => {
        const paramHeaderUuid = route?.params?.headerUuid || route?.params?.HeaderUUID || route?.params?.UUID;
        const candidateHeaderUuid = route?.params?.candidateHeaderUuid || route?.params?.candidateHeaderUUID || null;
        const prefill = route?.params?.prefillHeader || null;

        let resolvedHeaderUuid = paramHeaderUuid || null;

        (async () => {
            // if we don't have a usable header UUID from params, attempt to resolve using candidate or search
            try {
                if (!resolvedHeaderUuid && candidateHeaderUuid) {
                    // accept hyphenated or 32-hex
                    const isGuid = typeof candidateHeaderUuid === 'string' && (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidateHeaderUuid) || /^[0-9a-f]{32}$/i.test(candidateHeaderUuid));
                    if (isGuid) {
                        resolvedHeaderUuid = candidateHeaderUuid;
                    }
                }

                const cmpUuid = route?.params?.cmpUuid || route?.params?.cmpUUID || route?.params?.cmp || undefined;
                const envUuid = route?.params?.envUuid || route?.params?.envUUID || route?.params?.env || undefined;

                if (!resolvedHeaderUuid) {
                    // attempt to search by SalesInvNo or SalesInqNo from prefillHeader or candidate string
                    const possibleSearches = [];
                    if (prefill) {
                        const sInv = prefill?.SalesInvNo || prefill?.SalesInvoiceNo || prefill?.SalesInvNo || prefill?.SalesInv || prefill?.SalesInvNo || prefill?.SalesInvNo;
                        const sInq = prefill?.SalesInqNo || prefill?.SalesInquiryNo || prefill?.SalesInqNo || prefill?.SalesInq;
                        if (sInv) possibleSearches.push(String(sInv));
                        if (sInq) possibleSearches.push(String(sInq));
                    }
                    if (candidateHeaderUuid) possibleSearches.push(String(candidateHeaderUuid));

                    for (const term of possibleSearches) {
                        if (!term) continue;
                        try {
                            console.log('Attempting to resolve header UUID by searching with:', term);
                            const listResp = await getSalesInvoiceHeaders({ cmpUuid, envUuid, start: 0, length: 10, searchValue: term });
                            const listData = listResp?.Data || listResp || {};
                            const records = Array.isArray(listData?.Records) ? listData.Records : (Array.isArray(listResp) ? listResp : []);
                            if (records && records.length > 0) {
                                // try to find a record with a full UUID-like value
                                const found = records.find(r => {
                                    const candidate = r?.UUID || r?.Uuid || r?.Id || r?.HeaderUUID || r?.HeaderId || r?.SalesInvoiceUUID || r?.SalesInvoiceId || '';
                                    return typeof candidate === 'string' && (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(candidate) || /^[0-9a-f]{32}$/i.test(candidate));
                                }) || records[0];
                                const candidate = found?.UUID || found?.Uuid || found?.Id || found?.HeaderUUID || found?.HeaderId || found?.SalesInvoiceUUID || found?.SalesInvoiceId || null;
                                if (candidate) {
                                    console.log('Resolved header UUID from search ->', candidate);
                                    resolvedHeaderUuid = candidate;
                                    break;
                                }
                            }
                        } catch (e) {
                            console.warn('Search attempt failed for term', term, e?.message || e);
                        }
                    }
                }

                if (!resolvedHeaderUuid) {
                    // nothing to fetch
                    return;
                }

                // proceed to fetch header details by resolvedHeaderUuid
                setPrefillLoading(true);
                console.log('Fetching header data for UUID:', resolvedHeaderUuid);
                const resp = await getSalesInvoiceHeaderById({ headerUuid: resolvedHeaderUuid, cmpUuid, envUuid });
                console.log('getSalesInvoiceHeaderById response ->', resp);

                const data = resp?.Data || resp || null;
                if (!data) {
                    console.warn('No data returned from getSalesInvoiceHeaderById');
                    return;
                }
                // continue with existing prefill logic
                // Extract Sales Inquiry UUID
                const inquiryUuid = data?.SalesInqNoUUID || data?.SalesInquiryUUID || data?.SalesInquiryId || data?.SalesInquiryUuid || null;
                if (inquiryUuid) {
                    setSalesInquiryUuid(inquiryUuid);
                    // If salesInquiry options already loaded, map uuid -> InquiryNo immediately
                    try {
                        const found = (salesInquiryNosOptions || []).find(s =>
                            s?.UUID === inquiryUuid || s?.Uuid === inquiryUuid || s?.Id === inquiryUuid || String(s?.UUID) === String(inquiryUuid)
                        );
                        if (found && found.InquiryNo) setHeaderForm(s => ({ ...s, salesInquiry: found.InquiryNo }));
                    } catch (e) { /* ignore */ }
                }

                // Extract Project UUID
                const projUuid = data?.ProjectUUID || data?.ProjectId || data?.Project || null;
                if (projUuid) {
                    setProjectUUID(projUuid);
                }

                // Extract Payment Term UUID
                const payTermUuid = data?.PaymentTermUUID || data?.PaymentTermId || data?.PaymentTerm || null;
                if (payTermUuid) {
                    setPaymentTermUuid(payTermUuid);
                }

                // Extract Payment Method UUID
                const payMethodUuid = data?.PaymentMethodUUID || data?.PaymentMethodId || data?.PaymentMethod || null;
                if (payMethodUuid) {
                    setPaymentMethodUUID(payMethodUuid);
                }

                // Extract Sales Order UUID
                const soUuid = data?.SalesOrderUUID || data?.SalesOrderId || data?.SalesOrderNo || null;
                if (soUuid) {
                    setSalesOrderUuid(soUuid);
                }

                // Prefill header form
                const fetchedSalesInv = data?.SalesInvNo || data?.SalesInvoiceNo || data?.SalesInv || data?.SalesPerInvNo || data?.PerformaInvoiceNo || data?.PerformaNo || data?.SalesPerformaNo || '';
                const fetchedInquiryNo = data?.SalesInqNo || data?.SalesInquiryNo || data?.InquiryNo || '';
                const isFetchedInquiryUuid = fetchedInquiryNo && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(fetchedInquiryNo);

                setHeaderForm(s => ({
                    ...s,
                    salesInquiryText: fetchedSalesInv || s.salesInquiryText || '',
                    salesInquiry: (!isFetchedInquiryUuid && fetchedInquiryNo) ? fetchedInquiryNo : s.salesInquiry || '',
                    clientName: data?.SalesOrderNo || data?.OrderNo || data?.SalesOrderNumber || s.clientName || '',
                    CustomerUUID: data?.CustomerUUID || data?.CustomerId || s.CustomerUUID || null,
                    CustomerName: data?.CustomerName || data?.Customer || s.CustomerName || '',
                }));

                if (isFetchedInquiryUuid) setSalesInquiryUuid(fetchedInquiryNo);

                // Prefill other fields
                if (data?.OrderDate) {
                    const orderDate = data.OrderDate;
                    // Convert API date format to UI format if needed
                    if (orderDate.includes('-') && orderDate.length === 10) {
                        // Assume YYYY-MM-DD format, convert to dd-MMM-yyyy
                        const [yyyy, mm, dd] = orderDate.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        setInvoiceDate(`${dd}-${months[parseInt(mm) - 1]}-${yyyy}`);
                    } else {
                        setInvoiceDate(orderDate);
                    }
                }

                if (data?.DueDate) {
                    const dueDate = data.DueDate;
                    if (dueDate.includes('-') && dueDate.length === 10) {
                        const [yyyy, mm, dd] = dueDate.split('-');
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        setDueDate(`${dd}-${months[parseInt(mm) - 1]}-${yyyy}`);
                    } else {
                        setDueDate(dueDate);
                    }
                }

                setShippingCharges(String(data?.ShippingCharges ?? data?.ShippingCharge ?? 0));
                setAdjustments(String(data?.AdjustmentPrice ?? data?.Adjustment ?? 0));
                setTerms(data?.TermsConditions || data?.Terms || '');
                setNotes(data?.CustomerNotes || data?.Notes || '');
                setHeaderUUID(data?.UUID || data?.Id || data?.HeaderUUID || headerUuid);

                // Populate tax and server total if provided by API
                const headerTax = data?.TotalTax ?? data?.TaxAmount ?? data?.HeaderTotalTax ?? 0;
                setTotalTax(String(headerTax));

                const headerTotal = data?.TotalAmount ?? data?.Total ?? data?.HeaderTotalAmount ?? data?.TotalPrice ?? null;
                if (headerTotal !== null && typeof headerTotal !== 'undefined') {
                    setServerTotalAmount(String(headerTotal));
                }

                if (data?.FilePath) {
                    setFile({ uri: data.FilePath, name: data.FilePath });
                }

                // Fetch lines for this performa header and prefill the items table
                try {
                    setLinesLoading(true);
                    const cmp = cmpUuid || (await getCMPUUID());
                    const env = envUuid || (await getENVUUID());
                    const linesResp = await getSalesInvoiceLines({ headerUuid: data?.UUID || headerUuid, cmpUuid: cmp, envUuid: env, start: 0, length: 1000 });
                    const rawLines = linesResp?.Data?.Records || linesResp?.Data || linesResp || [];
                    const list = Array.isArray(rawLines) ? rawLines : [];
                    const normalizedLines = list.map((l, idx) => {
                        const qty = (l?.Quantity ?? l?.Qty ?? l?.quantity ?? 1);
                        const rate = (l?.Rate ?? l?.RateAmount ?? l?.Price ?? 0);
                        const amount = (l?.Amount ?? l?.Total ?? (Number(qty || 0) * Number(rate || 0)));
                        return {
                            id: idx + 1,
                            selectedItem: null,
                            name: l?.ItemName || l?.Name || l?.Item || l?.ItemTitle || String(l?.RawItem || '') || '',
                            sku: l?.ItemCode || l?.SKU || l?.Sku || null,
                            itemUuid: l?.ItemUUID || l?.ItemId || l?.Item || null,
                            rate: String(rate ?? 0),
                            desc: l?.Description || l?.Desc || '',
                            hsn: l?.HSN || l?.HSNCode || '',
                            qty: String(qty ?? 1),
                            tax: l?.TaxType || l?.Tax || 'IGST',
                            amount: String(Number(amount || 0).toFixed(2)),
                            serverLineUuid: l?.UUID || l?.Id || l?.LineUUID || null,
                        };
                    });
                    if (normalizedLines.length > 0) setItems(normalizedLines);
                    console.log('Fetched and normalized performa lines ->', normalizedLines);
                } catch (le) {
                    console.warn('Failed to fetch performa lines', le?.message || le);
                } finally {
                    setLinesLoading(false);
                }

                // Mark as submitted and editable (for edit mode)
                setHeaderSubmitted(true);
                setHeaderEditable(true);
                // Do not auto-open header here; user must click Edit to make changes
            } catch (e) {
                console.error('Error fetching header data:', e);
                Alert.alert('Error', e?.message || 'Unable to load header data');
            } finally {
                setPrefillLoading(false);
            }
        })();
    }, [route?.params?.headerUuid, route?.params?.HeaderUUID, route?.params?.UUID]);

    // Map Sales Inquiry UUID to InquiryNo when options are loaded (for edit mode and prefill mode)
    useEffect(() => {
        if (!salesInquiryUuid || !salesInquiryNosOptions || salesInquiryNosOptions.length === 0 || !headerForm) return;

        const currentInquiry = headerForm?.salesInquiry || '';
        // Check if currentInquiry is a UUID (should be replaced) or empty (needs to be filled)
        const isUuid = currentInquiry && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentInquiry);

        // Update if salesInquiry is empty, is a UUID, or doesn't match the found InquiryNo
        if (!currentInquiry || isUuid) {
            const found = salesInquiryNosOptions.find(s =>
                s?.UUID === salesInquiryUuid ||
                s?.Uuid === salesInquiryUuid ||
                s?.Id === salesInquiryUuid ||
                String(s?.UUID) === String(salesInquiryUuid) ||
                String(s?.Uuid) === String(salesInquiryUuid)
            );
            if (found && found.InquiryNo) {
                // Only update if the current value is different from what we found
                if (currentInquiry !== found.InquiryNo) {
                    setHeaderForm(s => ({ ...s, salesInquiry: found.InquiryNo }));
                }
            }
        }
    }, [salesInquiryUuid, salesInquiryNosOptions, headerForm]);

    // Fallback: if we have a salesInquiryUuid but the options list is not loaded,
    // fetch all inquiry numbers (light-weight endpoint) and map the UUID to InquiryNo.
    useEffect(() => {
        let mounted = true;
        (async () => {
            if (!salesInquiryUuid) return;
            if (salesInquiryNosOptions && salesInquiryNosOptions.length > 0) return; // already handled
            try {
                const cmp = await getCMPUUID();
                const env = await getENVUUID();
                const resp = await getAllInquiryNumbers({ cmpUuid: cmp, envUuid: env });
                const list = resp?.Data || resp || [];
                const records = Array.isArray(list?.Records) ? list.Records : (Array.isArray(list) ? list : []);
                const found = records.find(r =>
                    r?.UUID === salesInquiryUuid || r?.Uuid === salesInquiryUuid || r?.Id === salesInquiryUuid || String(r?.UUID) === String(salesInquiryUuid)
                );
                if (mounted && found) {
                    const inquiryNo = found?.SalesInqNo || found?.SalesInquiryNo || found?.InquiryNo || found?.Name || found?.Title || String(found);
                    if (inquiryNo) setHeaderForm(s => ({ ...s, salesInquiry: inquiryNo }));
                }
            } catch (e) {
                console.warn('Failed to resolve sales inquiry UUID via fallback', e?.message || e);
            }
        })();
        return () => { mounted = false; };
    }, [salesInquiryUuid, salesInquiryNosOptions]);

    // Map Project UUID to Project Name when options are loaded (for edit mode)
    useEffect(() => {
        if (!projectUUID || !projectsOptions || projectsOptions.length === 0) return;
        if (!project) {
            const found = projectsOptions.find(p =>
                p?.Uuid === projectUUID ||
                p?.UUID === projectUUID ||
                p?.Id === projectUUID ||
                String(p?.Uuid) === String(projectUUID) ||
                String(p?.UUID) === String(projectUUID)
            );
            if (found) {
                setProject(found?.ProjectTitle || found?.Name || String(found));
            }
        }
    }, [projectUUID, projectsOptions, project]);

    // Map Payment Term UUID to Payment Term Name when options are loaded (for edit mode)
    useEffect(() => {
        if (!paymentTermUuid || !paymentTermsOptions || paymentTermsOptions.length === 0) return;
        if (!paymentTerm) {
            const found = paymentTermsOptions.find(p =>
                p?.UUID === paymentTermUuid ||
                p?.Uuid === paymentTermUuid ||
                p?.Id === paymentTermUuid ||
                String(p?.UUID) === String(paymentTermUuid)
            );
            if (found) {
                setPaymentTerm(found?.Name || found?.Title || String(found));
            }
        }
    }, [paymentTermUuid, paymentTermsOptions, paymentTerm]);

    // Map Payment Method UUID to Payment Method Name when options are loaded (for edit mode)
    useEffect(() => {
        if (!paymentMethodUUID || !paymentMethodsOptions || paymentMethodsOptions.length === 0) return;
        if (!paymentMethod) {
            const found = paymentMethodsOptions.find(p =>
                p?.UUID === paymentMethodUUID ||
                p?.Uuid === paymentMethodUUID ||
                p?.Id === paymentMethodUUID ||
                String(p?.UUID) === String(paymentMethodUUID)
            );
            if (found) {
                setPaymentMethod(found?.Name || found?.Title || String(found));
            }
        }
    }, [paymentMethodUUID, paymentMethodsOptions, paymentMethod]);

    // Map Customer UUID to Customer Name when options are loaded (for edit mode)
    useEffect(() => {
        if (!headerForm || !headerForm.CustomerUUID || !customersOptions || customersOptions.length === 0) return;
        if (!headerForm.CustomerName) {
            const found = customersOptions.find(c =>
                c?.UUID === headerForm.CustomerUUID ||
                c?.Uuid === headerForm.CustomerUUID ||
                c?.Id === headerForm.CustomerUUID ||
                String(c?.UUID) === String(headerForm.CustomerUUID)
            );
            if (found) {
                setHeaderForm(s => ({
                    ...s,
                    CustomerName: found?.CustomerName || found?.Name || found?.DisplayName || String(found)
                }));
            }
        }
    }, [headerForm, customersOptions]);

    // Master items (loaded from server)
    const [masterItems, setMasterItems] = useState([]);
    const [masterItemsLoading, setMasterItemsLoading] = useState(false);

    // Load master items from API on mount
    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setMasterItemsLoading(true);
                const c = await getCMPUUID();
                const e = await getENVUUID();
                const resp = await getItems({ cmpUuid: c, envUuid: e });
                console.log('getItems raw response ->', JSON.stringify(resp, null, 2));
                const rawList = resp?.Data?.Records || resp?.Data || resp || [];
                console.log('getItems rawList ->', JSON.stringify(rawList && (Array.isArray(rawList) ? rawList.slice(0, 5) : rawList), null, 2));
                const list = Array.isArray(rawList) ? rawList : [];
                const normalized = list.map(it => ({
                    name: it?.Name || it?.name || it?.ItemName || '',
                    sku: it?.SKU || it?.sku || it?.Sku || it?.ItemCode || '',
                    rate: (it?.Rate ?? it?.rate ?? it?.Price) || 0,
                    desc: it?.Description || it?.description || it?.Desc || '',
                    hsn: it?.HSNCode || it?.HSN || it?.hsn || '',
                    uuid: it?.UUID || it?.Uuid || it?.uuid || it?.Id || it?.id || null,
                    raw: it,
                }));
                console.log('getItems normalized sample ->', JSON.stringify(normalized && normalized[0], null, 2));
                if (mounted) setMasterItems(normalized);
            } catch (err) {
                console.warn('getItems failed', err);
                if (mounted) setMasterItems([]);
            } finally {
                if (mounted) setMasterItemsLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, []);

    // Form state
    const [headerForm, setHeaderForm] = useState({
        companyName: '',
        opportunityTitle: '',
        salesInquiryText: '',
        salesInquiry: '',
        clientName: '',
        phone: '',
        email: '',
    });
    const [billingForm, setBillingForm] = useState({
        buildingNo: '',
        street1: '',
        street2: '',
        postalCode: '',
        country: '',
        state: '',
        city: '',
    });
    const [shippingForm, setShippingForm] = useState({
        buildingNo: '',
        street1: '',
        street2: '',
        postalCode: '',
        country: '',
        state: '',
        city: '',
    });
    const [isShippingSame, setIsShippingSame] = useState(false);
    // Start with no items so the items table is hidden until real rows are added or prefetched
    const [items, setItems] = useState([]);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [openDatePicker, setOpenDatePicker] = useState(false);
    const [datePickerField, setDatePickerField] = useState(null); // 'invoice' | 'due'
    const [datePickerSelectedDate, setDatePickerSelectedDate] = useState(
        new Date(),
    );
    // keep initial value empty so Dropdown shows the `placeholder` prop
    const [paymentTerm, setPaymentTerm] = useState('');
    const [notes, setNotes] = useState('');
    // Separate state for Terms & Conditions so it doesn't share the `notes` field
    const [terms, setTerms] = useState('');
    const [project, setProject] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [shippingCharges, setShippingCharges] = useState('0');
    const [adjustments, setAdjustments] = useState('0');
    const [adjustmentLabel, setAdjustmentLabel] = useState('Adjustments');
    const [totalTax, setTotalTax] = useState('0');
    const [serverTotalAmount, setServerTotalAmount] = useState('');
    const [file, setFile] = useState(null);
    const [showShippingTip, setShowShippingTip] = useState(false);
    const [showAdjustmentTip, setShowAdjustmentTip] = useState(false);
    const [prefillLoading, setPrefillLoading] = useState(false);

    // Permission handling for Android
    const requestStoragePermissionAndroid = async () => {
        if (Platform.OS !== 'android') return true;

        const sdkVersion = Platform.constants?.Release
            ? Number(Platform.constants.Release)
            : 0;

        // On Android 13 (API 33+) use READ_MEDIA_*; otherwise use READ_EXTERNAL_STORAGE
        if (Platform.Version >= 33) {
            const readImages = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
            );
            return readImages === PermissionsAndroid.RESULTS.GRANTED;
        }

        const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
    };

    const copyBillingToShipping = () => {
        setShippingForm({ ...billingForm });
        setIsShippingSame(true);
        setExpandedId(3);
    };

    const formatUiDate = date => {
        try {
            const d = new Date(date);
            const months = [
                'Jan',
                'Feb',
                'Mar',
                'Apr',
                'May',
                'Jun',
                'Jul',
                'Aug',
                'Sep',
                'Oct',
                'Nov',
                'Dec',
            ];
            const dd = String(d.getDate()).padStart(2, '0');
            const mmm = months[d.getMonth()];
            const yyyy = String(d.getFullYear());
            return `${dd}-${mmm}-${yyyy}`;
        } catch (e) {
            return '';
        }
    };

    const openDatePickerFor = field => {
        let initial = new Date();
        if (field === 'invoice' && invoiceDate) {
            const parsed = new Date(invoiceDate);
            if (!isNaN(parsed)) initial = parsed;
        }
        if (field === 'due' && dueDate) {
            const parsed = new Date(dueDate);
            if (!isNaN(parsed)) initial = parsed;
        }
        setDatePickerSelectedDate(initial);
        setDatePickerField(field);
        setOpenDatePicker(true);
    };

    const closeDatePicker = () => {
        setOpenDatePicker(false);
        setDatePickerField(null);
    };

    const handleDateSelect = date => {
        const formatted = formatUiDate(date);
        if (datePickerField === 'invoice') setInvoiceDate(formatted);
        if (datePickerField === 'due') setDueDate(formatted);
        setOpenDatePicker(false);
        setDatePickerField(null);
    };

    const computeAmount = (qty, rate) => {
        const q = parseFloat(qty) || 0;
        const r = parseFloat(rate) || 0;
        return (q * r).toFixed(2);
    };

    const computeSubtotal = () => {
        const sum = items.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
        return sum.toFixed(2);
    };

    // Determine whether there is any meaningful row to show in the items table.
    // Treat rows with non-empty name, a serverLineUuid, or a positive amount as meaningful.
    const hasTableData = Array.isArray(items) && items.some(it => {
        const namePresent = it?.name && String(it.name).trim() !== '';
        const hasServerUuid = !!(it?.serverLineUuid || it?.serverUuid || it?.LineUUID);
        const amountNum = Number(it?.amount || 0);
        return namePresent || hasServerUuid || amountNum > 0;
    });

    const addItem = () => {
        setItems(prev => {
            const nextId = prev.length ? prev[prev.length - 1].id + 1 : 1;
            return [
                ...prev,
                {
                    id: nextId,
                    selectedItem: null,
                    name: '',
                    sku: '',
                    rate: '0',
                    desc: '',
                    hsn: '',
                    qty: '1',
                    tax: 'IGST',
                    amount: '0.00',
                },
            ];
        });
    };

    const deleteItem = async id => {
        const it = items.find(r => r.id === id);
        if (!it) return;
        // If this line exists on server, call delete API
        if (it.serverLineUuid) {
            try {
                const cmp = await getCMPUUID();
                const env = await getENVUUID();
                const resp = await deleteSalesInvoiceLine({ lineUuid: it.serverLineUuid, overrides: { cmpUuid: cmp, envUuid: env } });
                console.log('deleteSalesInvoiceLine resp ->', resp);
                // remove locally
                setItems(prev => prev.filter(r => r.id !== id));
                // refresh header totals after delete
                await refreshHeaderTotals(headerUUID || (resp?.Data?.HeaderUUID || resp?.HeaderUUID || null));
                Alert.alert('Success', 'Line deleted');
            } catch (e) {
                console.warn('Delete line error', e);
                Alert.alert('Error', e?.message || 'Unable to delete line');
            }
        } else {
            // local-only line, just remove
            setItems(prev => prev.filter(r => r.id !== id));
            // Clear serverTotalAmount so UI recomputes Total Amount from current items
            setServerTotalAmount('');
        }
    };

    const selectMasterItem = (rowId, item) => {
        setItems(prev =>
            prev.map(r => {
                if (r.id !== rowId) return r;
                const qty = r.qty || '1';
                return {
                    ...r,
                    selectedItem: item,
                    name: item.name,
                    sku: item.sku,
                    itemUuid: item.uuid || null,
                    rate: String(item.rate),
                    desc: item.desc || '',
                    hsn: item.hsn || '',
                    amount: computeAmount(qty, item.rate),
                };
            }),
        );
    };

    const updateItemField = (rowId, key, value) => {
        setItems(prev =>
            prev.map(r => {
                if (r.id !== rowId) return r;
                const updated = { ...r, [key]: value };
                if (key === 'qty' || key === 'rate') {
                    updated.amount = computeAmount(updated.qty, updated.rate);
                }
                return updated;
            }),
        );
        // Clear server total so UI recomputes Total Amount from local items
        setServerTotalAmount('');
    };

    // Refresh header totals from server and populate totalTax/serverTotalAmount
    const refreshHeaderTotals = async (hdrUuid) => {
        try {
            const hid = hdrUuid || headerUUID;
            if (!hid) return;
            const cmp = await getCMPUUID();
            const env = await getENVUUID();
            const hResp = await getSalesInvoiceHeaderById({ headerUuid: hid, cmpUuid: cmp, envUuid: env });
            const hData = hResp?.Data || hResp || null;
            if (!hData) return;
            const headerTax = hData?.TotalTax ?? hData?.TaxAmount ?? hData?.HeaderTotalTax ?? 0;
            setTotalTax(String(headerTax));
            const headerTotal = hData?.TotalAmount ?? hData?.Total ?? hData?.HeaderTotalAmount ?? hData?.TotalPrice ?? null;
            if (headerTotal !== null && typeof headerTotal !== 'undefined') setServerTotalAmount(String(headerTotal));
        } catch (e) {
            console.warn('refreshHeaderTotals error', e?.message || e);
        }
    };

    // State & handlers used by the Item Details form (Section 4)
    const [currentItem, setCurrentItem] = useState({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '1', unit: '', unitUuid: null, desc: '', rate: '' });
    const [editItemId, setEditItemId] = useState(null);
    const [isAddingLine, setIsAddingLine] = useState(false);
    const [linesLoading, setLinesLoading] = useState(false);
    const [pageSize, setPageSize] = useState(10);
    const pageSizes = [5, 10, 25, 50];
    const [tableSearch, setTableSearch] = useState('');
    const [page, setPage] = useState(1);

    // Helper to reset header and form state when leaving the screen
    const resetState = () => {
        setHeaderSubmitting(false);
        setHeaderUUID(null);
        setHeaderSubmitted(false);
        setHeaderEditable(true);
        setHeaderForm({
            companyName: '',
            opportunityTitle: '',
            salesInquiryText: '',
            salesInquiry: '',
            clientName: '',
            phone: '',
            email: '',
        });
        setBillingForm({
            buildingNo: '',
            street1: '',
            street2: '',
            postalCode: '',
            country: '',
            state: '',
            city: '',
        });
        setShippingForm({
            buildingNo: '',
            street1: '',
            street2: '',
            postalCode: '',
            country: '',
            state: '',
            city: '',
        });
        setIsShippingSame(false);
        // reset to empty list (no placeholder row)
        setItems([]);
        setInvoiceDate('');
        setDueDate('');
        setPaymentTerm('');
        setNotes('');
        setTerms('');
        setProject('');
        setPaymentMethod('');
        setShippingCharges('0');
        setAdjustments('0');
        setAdjustmentLabel('Adjustments');
        setFile(null);
        setExpandedId(null);
        setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '1', unit: '', unitUuid: null, desc: '', rate: '' });
        setEditItemId(null);
        setIsAddingLine(false);
        setLinesLoading(false);
        setPageSize(10);
        setTableSearch('');
        setPage(1);
    };

    // Clear state when the screen is blurred (user navigates away)
    useEffect(() => {
        const unsub = navigation.addListener('blur', () => {
            try {
                resetState();
            } catch (e) {
                console.warn('resetState error', e);
            }
        });
        return unsub;
    }, [navigation]);

    const handleAddLineItem = async () => {
        // Basic validation
        if (!currentItem.itemName || String(currentItem.itemName).trim() === '') {
            Alert.alert('Validation', 'Please select an item');
            return;
        }
        // Require header UUID (submit header first)
        if (!headerUUID) {
            Alert.alert('Save header first', 'Please submit the header to obtain Header UUID before adding line items.');
            return;
        }
        setIsAddingLine(true);
        try {
            const qty = Number(currentItem.quantity || '1');
            const rate = Number(currentItem.rate || '0');
            const description = currentItem.desc || '';

            // If editing an existing line
            if (editItemId) {
                const existing = items.find(x => x.id === editItemId);
                if (!existing) {
                    Alert.alert('Error', 'Line to edit not found');
                    return;
                }

                const payload = {
                    UUID: existing.serverLineUuid || '',
                    HeaderUUID: headerUUID,
                    ItemUUID: currentItem.itemNameUuid || null,
                    Quantity: qty,
                    Rate: rate,
                    Description: description,
                };

                // If serverLineUuid exists, call update API, otherwise just update locally
                if (existing.serverLineUuid) {
                    const resp = await updateSalesInvoiceLine(payload, { cmpUuid: await getCMPUUID(), envUuid: await getENVUUID(), userUuid: await getUUID() });
                    console.log('update line resp ->', resp);
                    const updatedLineUuid = resp?.Data?.UUID || resp?.UUID || resp?.Data?.LineUUID || existing.serverLineUuid;
                    setItems(prev => prev.map(it => it.id === editItemId ? ({ ...it, name: currentItem.itemName, sku: currentItem.itemNameUuid || null, itemUuid: currentItem.itemNameUuid || null, rate: String(rate), desc: description || '', qty: String(qty), amount: computeAmount(qty, rate), serverLineUuid: updatedLineUuid }) : it));
                    // refresh header totals from server after update
                    await refreshHeaderTotals(headerUUID);
                } else {
                    // local-only line - update in state
                    setItems(prev => prev.map(it => it.id === editItemId ? ({ ...it, name: currentItem.itemName, sku: currentItem.itemNameUuid || null, itemUuid: currentItem.itemNameUuid || null, rate: String(rate), desc: description || '', qty: String(qty), amount: computeAmount(qty, rate) }) : it));
                    // Clear serverTotalAmount so UI will compute Total Amount from local subtotal
                    setServerTotalAmount('');
                }

                // reset edit state
                setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '1', unit: '', unitUuid: null, desc: '', rate: '' });
                setEditItemId(null);
            } else {
                // Build payload expected by backend
                const payload = {
                    UUID: '', // empty to create new line on server
                    HeaderUUID: headerUUID,
                    ItemUUID: currentItem.itemNameUuid || null,
                    Quantity: qty,
                    Rate: rate,
                    Description: description,
                };

                console.log('Posting line payload ->', payload);
                const resp = await addSalesInvoiceLine(payload, { cmpUuid: await getCMPUUID(), envUuid: await getENVUUID(), userUuid: await getUUID() });
                console.log('add line resp ->', resp);

                // on success, update local items list (assign local id and keep server uuid if returned)
                const nextId = items.length ? (items[items.length - 1].id + 1) : 1;
                const serverLineUuid = resp?.Data?.UUID || resp?.UUID || resp?.Data?.LineUUID || null;
                setItems(prev => ([...prev, { id: nextId, selectedItem: null, name: currentItem.itemName, sku: currentItem.itemNameUuid || null, itemUuid: currentItem.itemNameUuid || null, rate: String(rate), desc: description || '', hsn: '', qty: String(qty), tax: 'IGST', amount: computeAmount(qty, rate), serverLineUuid }]));

                // reset line form
                setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '1', unit: '', unitUuid: null, desc: '', rate: '' });
                // After server add, refresh header totals from server
                await refreshHeaderTotals(headerUUID || (resp?.Data?.HeaderUUID || resp?.HeaderUUID || null));
            }
        } catch (e) {
            console.warn('Add/Update line item error', e);
            Alert.alert('Error', e?.message || 'Unable to add/update line item');
        } finally {
            setIsAddingLine(false);
        }
    };

    const handleEditItem = id => {
        const it = items.find(x => x.id === id);
        if (!it) return;
        setCurrentItem({ itemType: it.itemType || '', itemTypeUuid: it.itemTypeUuid || null, itemName: it.name || '', itemNameUuid: it.itemUuid || it.sku || null, quantity: it.qty || '1', unit: it.unit || '', unitUuid: it.unitUuid || null, desc: it.desc || '', rate: it.rate || '' });
        setEditItemId(id);
    };

    const handleCreateOrder = async () => {
        // Final submit: update the performa header with current values (server expects header update)
        if (!headerUUID) {
            Alert.alert('Save header first', 'Please submit the header to obtain Header UUID before finalizing the order.');
            return;
        }
        setHeaderSubmitting(true);
        try {
            const payload = {
                UUID: headerUUID,
                SalesInvNo: headerForm.salesInquiryText || '',
                SalesInqNoUUID: salesInquiryUuid || headerForm.salesInquiryUUID || '',
                SalesOrderNo: salesOrderUuid || headerForm.clientName || '',
                CustomerUUID: headerForm.CustomerUUID || headerForm.CustomerUUID || '',
                ProjectUUID: projectUUID || project || '',
                PaymentTermUUID: paymentTermUuid || paymentTerm || '',
                PaymentMethodUUID: paymentMethodUUID || paymentMethod || '',
                OrderDate: uiDateToApiDate(invoiceDate),
                DueDate: uiDateToApiDate(dueDate),
                CustomerNotes: notes || '',
                ShippingCharges: parseFloat(shippingCharges) || 0,
                AdjustmentField: adjustmentLabel || '',
                AdjustmentPrice: parseFloat(adjustments) || 0,
                TermsConditions: terms || '',
                SubTotal: parseFloat(computeSubtotal()) || 0,
                TotalTax: parseFloat(totalTax) || 0,
                TotalAmount: (parseFloat(computeSubtotal()) || 0) + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + (parseFloat(totalTax) || 0),
                FilePath: file?.uri || file?.name || '',
                Notes: notes || '',
            };

            console.log('Final submit - update header payload ->', payload);
            const resp = await updateSalesInvoiceHeader(payload, { cmpUuid: await getCMPUUID(), envUuid: await getENVUUID(), userUuid: await getUUID() });
            console.log('UpdateSalesInvoiceHeader resp ->', resp);
            Alert.alert('Success', 'Performa header updated successfully');
            // Refresh header totals from server after update
            await refreshHeaderTotals(headerUUID);
            // Mark as submitted and collapse sections
            setHeaderSubmitted(true);
            setHeaderEditable(false);
            // Collapse sections after final submit
            setExpandedId(null);
        } catch (e) {
            console.error('Final submit error', e);
            Alert.alert('Error', e?.message || 'Unable to update performa header');
        } finally {
            setHeaderSubmitting(false);
        }
    };
    const onCancel = () => { };

    const uiDateToApiDate = uiDateStr => {
        if (!uiDateStr) return '';
        try {
            const parts = uiDateStr.split('-');
            if (parts.length !== 3) return '';
            const [dd, mmm, yyyy] = parts;
            const months = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
            const mm = months[mmm] || '01';
            return `${yyyy}-${mm}-${dd}`;
        } catch (e) {
            return '';
        }
    };

    const submitHeader = async () => {
        setHeaderSubmitting(true);
        try {
            const payload = {
                UUID: headerForm.UUID || '',
                SalesPerInvNo: headerForm.salesInquiryText || '',
                SalesInqNoUUID: salesInquiryUuid || headerForm.salesInquiryUUID || '',
                SalesOrderNo: salesOrderUuid || headerForm.clientName || '',
                CustomerUUID: headerForm.CustomerUUID || headerForm.CustomerUUID || '',
                ProjectUUID: projectUUID || project || '',
                PaymentTermUUID: paymentTermUuid || paymentTerm || '',
                PaymentMethodUUID: paymentMethodUUID || paymentMethod || '',
                OrderDate: uiDateToApiDate(invoiceDate),
                DueDate: uiDateToApiDate(dueDate),
                CustomerNotes: notes || '',
                ShippingCharges: parseFloat(shippingCharges) || 0,
                AdjustmentField: adjustmentLabel || '',
                AdjustmentPrice: parseFloat(adjustments) || 0,
                TermsConditions: terms || '',
                SubTotal: parseFloat(computeSubtotal()) || 0,
                TotalTax: parseFloat(totalTax) || 0,
                TotalAmount: (parseFloat(computeSubtotal()) || 0) + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + (parseFloat(totalTax) || 0),
                FilePath: file?.uri || file?.name || '',
            };

            console.log('submitHeader payload ->', payload);
            const resp = await addSalesInvoiceHeader(payload, { cmpUuid: await getCMPUUID(), envUuid: await getENVUUID(), userUuid: await getUUID() });
            console.log('submitHeader resp ->', resp);
            // Try to extract the returned Header UUID from response
            const gotHeaderUuid = resp?.Data?.UUID || resp?.Data?.HeaderUUID || resp?.UUID || resp?.HeaderUUID || (resp?.Data && (resp.Data.UUID || resp.Data.HeaderUUID)) || null;
            if (gotHeaderUuid) {
                setHeaderUUID(gotHeaderUuid);
                setHeaderSubmitted(true);
                setHeaderEditable(false);
                // after successful header creation, move to Create Order section
                setExpandedId(4);
                console.log('Saved header UUID ->', gotHeaderUuid);
            }
            Alert.alert('Success', 'Header submitted successfully');
        } catch (err) {
            console.error('submitHeader error ->', err);
            Alert.alert('Error', err?.message || 'Unable to submit header');
        } finally {
            setHeaderSubmitting(false);
        }
    };

    const updateHeader = async () => {
        console.log('updateHeader called, headerUUID:', headerUUID);
        // Update existing header - requires headerUUID
        if (!headerUUID) {
            console.log('updateHeader: No headerUUID found');
            Alert.alert('Error', 'No header UUID found to update.');
            return;
        }
        console.log('updateHeader: Setting headerSubmitting to true');
        setHeaderSubmitting(true);
        try {
            console.log('updateHeader: Building payload...');
            const payload = {
                UUID: headerUUID,
                SalesInvNo: headerForm.salesInquiryText || '',
                SalesInqNoUUID: salesInquiryUuid || headerForm.salesInquiryUUID || '',
                SalesOrderNo: salesOrderUuid || headerForm.clientName || '',
                CustomerUUID: headerForm.CustomerUUID || headerForm.CustomerUUID || '',
                ProjectUUID: projectUUID || project || '',
                PaymentTermUUID: paymentTermUuid || paymentTerm || '',
                PaymentMethodUUID: paymentMethodUUID || paymentMethod || '',
                OrderDate: uiDateToApiDate(invoiceDate),
                CustomerNotes: notes || '',
                ShippingCharges: parseFloat(shippingCharges) || 0,
                AdjustmentField: adjustmentLabel || '',
                AdjustmentPrice: parseFloat(adjustments) || 0,
                TermsConditions: terms || '',
                FilePath: file?.uri || file?.name || '',
                SubTotal: parseFloat(computeSubtotal()) || 0,
                TotalTax: parseFloat(totalTax) || 0,
                TotalAmount: (parseFloat(computeSubtotal()) || 0) + (parseFloat(shippingCharges) || 0) + (parseFloat(adjustments) || 0) + (parseFloat(totalTax) || 0),
                Notes: notes || '',
            };
            console.log('updateHeader payload ->', payload);

            const resp = await updateSalesInvoiceHeader(payload, { cmpUuid: await getCMPUUID(), envUuid: await getENVUUID(), userUuid: await getUUID() });
            console.log('updateHeader resp ->', resp);
            Alert.alert('Success', 'Header updated successfully');
            setHeaderEditable(false);
            setHeaderSubmitted(true);
            setExpandedId(4);
        } catch (err) {
            console.error('updateHeader error ->', err);
            Alert.alert('Error', err?.message || 'Unable to update header');
        } finally {
            setHeaderSubmitting(false);
        }
    };

    // File attachment functions
    const pickFile = async () => {
        try {
            const hasPerm = await requestStoragePermissionAndroid();
            if (!hasPerm) {
                Alert.alert(
                    'Permission required',
                    'Storage permission is needed to pick a file.',
                );
                return;
            }

            const [selectedFile] = await pick({
                type: [types.pdf, types.images],
                allowMultiSelection: false,
            });

            if (selectedFile) {
                // Validate file type
                const allowedTypes = [
                    'application/pdf',
                    'image/png',
                    'image/jpeg',
                    'image/jpg',
                ];
                if (!allowedTypes.includes(selectedFile.type)) {
                    Alert.alert(
                        'Invalid File Type',
                        'Please select a PDF, PNG, or JPG file.',
                    );
                    return;
                }

                // Validate file size (10MB = 10 * 1024 * 1024 bytes)
                const maxSize = 10 * 1024 * 1024; // 10MB in bytes
                if (selectedFile.size && selectedFile.size > maxSize) {
                    Alert.alert('File Too Large', 'File size must be less than 10MB.');
                    return;
                }

                // Set the selected file
                setFile({
                    name: selectedFile.name,
                    uri: selectedFile.uri,
                    type: selectedFile.type,
                    size: selectedFile.size,
                });
            }
        } catch (err) {
            if (isCancel && isCancel(err)) {
                return;
            }
            console.warn('Document pick error:', err);
        }
    };

    const removeFile = () => {
        setFile(null);
    };

    if (prefillLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
                <ActivityIndicator size="large" color={COLORS?.primary || '#000'} />
            </View>
        );
    }

    return (
        <>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <AppHeader
                    title="Add Sales Invoice"
                    onLeftPress={() => {
                        navigation.goBack();
                    }}
                />
                <View style={styles.headerSeparator} />
                <ScrollView
                    contentContainerStyle={[styles.container]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Section 1: Header / Basic Details */}
                    <AccordionSection
                        id={1}
                        title="Header"
                        expanded={expandedId === 1}
                        onToggle={headerSubmitted && !headerEditable ? () => { } : toggleSection}
                        rightActions={
                            headerSubmitted && !headerEditable ? (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(2) }}>
                                    <Icon name="check-circle" size={rf(5)} color={COLORS.success || '#28a755'} />
                                    <TouchableOpacity onPress={() => { setHeaderEditable(true); setExpandedId(1); }}>
                                        <Icon name="edit" size={rf(5)} color={COLORS.primary} />
                                    </TouchableOpacity>
                                </View>
                            ) : null
                        }
                    >
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Sales Invoice Number.</Text>

                                <View style={[inputStyles.box]} pointerEvents="box-none">
                                    <TextInput
                                        style={[inputStyles.input, { flex: 1, color: '#000000' }]}
                                        value={headerForm.salesInquiryText}
                                        onChangeText={v => setHeaderForm(s => ({ ...s, salesInquiryText: v }))}
                                        placeholder="eg."
                                        placeholderTextColor={COLORS.textLight}
                                        editable={headerEditable}
                                    />
                                </View>
                            </View>
                            {/* <View style={styles.col}> */}
                            {/* <Text style={inputStyles.label}>Customer Name* </Text> */}

                            {/* <Text style={inputStyles.label}>Customer Name*</Text> */}
                            {/* <Dropdown
                                    placeholder="Customer Name*"
                                    value={headerForm.opportunityTitle}
                                    options={customers}
                                    getLabel={c => c}
                                    getKey={c => c}
                                    onSelect={v =>
                                        setHeaderForm(s => ({ ...s, opportunityTitle: v }))
                                    }
                                    inputBoxStyle={inputStyles.box}
                                    textStyle={inputStyles.input}
                                /> */}
                            {/* </View> */}
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Sales Inquiry No.</Text>

                                {/* <Text style={[inputStyles.label, { fontWeight: '600' }]}>Sales Inquiry No.</Text> */}
                                <Dropdown
                                    placeholder="Sales Inquiry No."
                                    value={headerForm.salesInquiry}
                                    options={salesInquiryNosOptions}
                                    getLabel={s => s?.InquiryNo || String(s)}
                                    getKey={s => s?.UUID || s}
                                    onSelect={v => {
                                        if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                                        if (v && typeof v === 'object') {
                                            setHeaderForm(s => ({ ...s, salesInquiry: v?.InquiryNo || String(v) }));
                                            setSalesInquiryUuid(v?.UUID || null);
                                        } else {
                                            setHeaderForm(s => ({ ...s, salesInquiry: v }));
                                            setSalesInquiryUuid(null);
                                        }
                                    }}
                                    inputBoxStyle={inputStyles.box}
                                    textStyle={inputStyles.input}
                                />
                            </View>
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
                            {/* { (headerSubmitted || route?.params?.prefillHeader) && ( */}
                            <View style={styles.col}>
                                <Text style={[inputStyles.label,]}>Sales Order Number* </Text>

                                <View style={[inputStyles.box, { marginTop: hp(1) }]} pointerEvents="box-none">
                                    <TextInput
                                        style={[inputStyles.input, { flex: 1, color: '#000000' }]}
                                        value={1}
                                        onChangeText={v => setHeaderForm(s => ({ ...s, salesInquiryText: v }))}
                                        placeholder="eg."
                                        placeholderTextColor={COLORS.textLight}
                                        editable={headerEditable}
                                    />
                                </View>
                            </View>
                            {/* )} */}

                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Customer Name* </Text>

                                <View style={{ zIndex: 9998, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="Customer Name*"
                                        value={headerForm.CustomerName || headerForm.opportunityTitle}
                                        options={customersOptions}
                                        getLabel={c => (c?.CustomerName || c?.Name || c?.DisplayName || String(c))}
                                        getKey={c => (c?.UUID || c?.Id || c)}
                                        onSelect={v => {
                                            if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                                            if (v && typeof v === 'object') {
                                                setHeaderForm(s => ({ ...s, CustomerName: v?.CustomerName || v?.Name || v, CustomerUUID: v?.UUID || v?.Id || null }));
                                            } else {
                                                setHeaderForm(s => ({ ...s, CustomerName: v, CustomerUUID: null }));
                                            }
                                        }}
                                        renderInModal={true}
                                        inputBoxStyle={inputStyles.box}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>



                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]}>

                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Project Name* </Text>

                                <View style={{ zIndex: 9999, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="Select Project*"
                                        value={project}
                                        options={projectsOptions}
                                        getLabel={p => (p?.Name || p?.ProjectTitle || String(p))}
                                        getKey={p => (p?.Uuid || p?.Id || p)}
                                        onSelect={v => {
                                            if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                                            setProject(v?.ProjectTitle || v); setProjectUUID(v?.Uuid || v);
                                        }}
                                        renderInModal={true}
                                        inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>

                            <View style={styles.col}>
                                <Text style={inputStyles.label}>payment Tearm* </Text>

                                <View style={{ zIndex: 9999, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="Payment Term*"
                                        value={paymentTerm}
                                        options={paymentTermsOptions}
                                        getLabel={p => p?.Name || p?.Title || String(p)}
                                        getKey={p => p?.UUID || p?.Id || p}
                                        onSelect={v => {
                                            if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                                            if (v && typeof v === 'object') {
                                                setPaymentTerm(v?.Name || v?.Title || String(v));
                                                setPaymentTermUuid(v?.UUID || v?.Id || null);
                                            } else {
                                                setPaymentTerm(v);
                                                setPaymentTermUuid(null);
                                            }
                                        }}
                                        renderInModal={true}
                                        inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>

                        </View>
                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>payment Method* </Text>

                                <View style={{ zIndex: 9998, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="Payment Method"
                                        value={paymentMethod}
                                        options={paymentMethodsOptions}
                                        getLabel={p => p?.Name || p?.Title || String(p)}
                                        getKey={p => p?.UUID || p?.Id || p}
                                        onSelect={v => {
                                            if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; }
                                            if (v && typeof v === 'object') {
                                                setPaymentMethod(v?.Name || v?.Title || String(v));
                                                setPaymentMethodUUID(v?.UUID || v?.Id || null);
                                            } else {
                                                setPaymentMethod(v);
                                                setPaymentMethodUUID(null);
                                            }
                                        }}
                                        renderInModal={true}
                                        inputBoxStyle={[inputStyles.box, { marginTop: -hp(-0.1) }]}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>

                            <View style={styles.col}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => { if (!headerEditable) { Alert.alert('Read only', 'Header is saved. Click edit to modify.'); return; } openDatePickerFor('invoice'); }}
                                    style={{ marginTop: hp(0.8), opacity: headerEditable ? 1 : 0.6 }}
                                    disabled={!headerEditable}
                                >
                                    <Text style={inputStyles.label}>Order Date* </Text>

                                    <View
                                        style={[
                                            inputStyles.box,
                                            styles.innerFieldBox,
                                            styles.datePickerBox,
                                            { alignItems: 'center' },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                inputStyles.input,
                                                styles.datePickerText,
                                                !invoiceDate && {
                                                    color: COLORS.textLight,
                                                    fontFamily: TYPOGRAPHY.fontFamilyRegular,
                                                },
                                                invoiceDate && {
                                                    color: COLORS.text,
                                                    fontFamily: TYPOGRAPHY.fontFamilyMedium,
                                                },
                                            ]}
                                        >
                                            {invoiceDate || 'Order Date*'}
                                        </Text>
                                        <View
                                            style={[
                                                styles.calendarIconContainer,
                                                invoiceDate && styles.calendarIconContainerSelected,
                                            ]}
                                        >
                                            <Icon
                                                name="calendar-today"
                                                size={rf(3.2)}
                                                color={invoiceDate ? COLORS.primary : COLORS.textLight}
                                            />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={{ marginTop: hp(1.5), flexDirection: 'row', justifyContent: 'flex-end' }}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    console.log('Button pressed - headerUUID:', headerUUID, 'headerEditable:', headerEditable);
                                    if (headerUUID && headerEditable) {
                                        console.log('Calling updateHeader');
                                        updateHeader();
                                    } else {
                                        console.log('Calling submitHeader');
                                        submitHeader();
                                    }
                                }}
                                style={{
                                    backgroundColor: COLORS.primary,
                                    paddingVertical: hp(1),
                                    paddingHorizontal: wp(4),
                                    borderRadius: 6,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                }}
                                disabled={headerSubmitting || (headerSubmitted && !headerEditable)}
                            >
                                {headerSubmitting ? (
                                    <ActivityIndicator color="#fff" />
                                ) : (
                                    <Text style={{ color: '#fff', fontFamily: TYPOGRAPHY.fontFamilyMedium, fontSize: rf(3.2) }}>{headerUUID && headerEditable ? 'Update' : 'Submit'}</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                    </AccordionSection>

                    {restrictToHeader && !headerSubmitted ? (
                        <View style={{ padding: hp(2), alignItems: 'center' }}>
                            <Text style={{ color: COLORS.textMuted }}>
                                Please submit the Header to continue to Create Order.
                            </Text>
                        </View>
                    ) : null}

                    {/* Section 4: Create Order */}
                    {headerSubmitted && !headerEditable ? (<AccordionSection
                        id={4}
                        title="Create Order"
                        expanded={expandedId === 4}
                        onToggle={toggleSection}
                        wrapperStyle={{ overflow: 'visible' }}
                    >

                        <View style={{ marginTop: hp(1) }}>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    {
                                        marginBottom: hp(1),
                                        color: COLORS.textMuted,
                                        fontWeight: '700',
                                        fontSize: wp(4.5),
                                    },
                                ]}
                            >
                                Item Details
                            </Text>

                            {/* LINE form: Item | Description | Quantity | Rate | Amount */}
                            <View style={{ marginBottom: hp(1.5) }}>
                                {/* Item dropdown full width */}
                                <View style={{ width: '100%', marginBottom: hp(1) }}>
                                    <Text style={inputStyles.label}>Item*</Text>
                                    <View style={{ zIndex: 9999, elevation: 20 }}>
                                        <Dropdown
                                            placeholder="Select Item"
                                            value={currentItem.itemName}
                                            options={masterItems}
                                            getLabel={it => (it?.name || String(it))}
                                            getKey={it => (it?.uuid || it?.sku || it)}
                                            onSelect={v => {
                                                if (v && typeof v === 'object') {
                                                    setCurrentItem(ci => ({ ...ci, itemName: v?.name || v, itemNameUuid: v?.uuid || v?.UUID || v?.sku || null, rate: String(v?.rate || ci?.rate || ''), desc: v?.desc || ci?.desc || '' }));
                                                } else {
                                                    setCurrentItem(ci => ({ ...ci, itemName: v, itemNameUuid: null }));
                                                }
                                            }}
                                            renderInModal={true}
                                            inputBoxStyle={[inputStyles.box, { width: '100%' }]}
                                            textStyle={inputStyles.input}
                                        />
                                    </View>
                                </View>

                                {/* Description full width */}
                                <View style={{ width: '100%', marginBottom: hp(1) }}>
                                    <Text style={inputStyles.label}>Description</Text>
                                    <TextInput
                                        style={[styles.descInput, { minHeight: hp(10), width: '100%' }]}
                                        value={currentItem.desc || ''}
                                        onChangeText={t => setCurrentItem(ci => ({ ...ci, desc: t }))}
                                        placeholder="Enter description"
                                        placeholderTextColor={COLORS.textLight}
                                        multiline
                                        numberOfLines={3}
                                    />
                                </View>

                                {/* Two fields in one line: Quantity & Rate */}
                                <View style={[styles.row, { justifyContent: 'space-between' }]}>
                                    <View style={{ width: '48%' }}>
                                        <Text style={inputStyles.label}>Quantity*</Text>
                                        <View style={[inputStyles.box, { marginTop: hp(0.5), width: '100%' }]}>
                                            <TextInput
                                                style={[inputStyles.input, { textAlign: 'center' }]}
                                                value={String(currentItem.quantity || '')}
                                                onChangeText={v => setCurrentItem(ci => ({ ...ci, quantity: v }))}
                                                keyboardType="numeric"
                                                placeholder="1"
                                                placeholderTextColor={COLORS.textLight}
                                            />
                                        </View>
                                    </View>

                                    <View style={{ width: '48%' }}>
                                        <Text style={inputStyles.label}>Rate*</Text>
                                        <View style={[inputStyles.box, { marginTop: hp(0.5), width: '100%' }]}>
                                            <TextInput
                                                style={[inputStyles.input, { textAlign: 'center' }]}
                                                value={String(currentItem.rate ?? '')}
                                                onChangeText={v => setCurrentItem(ci => ({ ...ci, rate: v }))}
                                                keyboardType="numeric"
                                                placeholder="0"
                                                placeholderTextColor={COLORS.textLight}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Amount display and action buttons */}
                                <View style={[styles.row, { justifyContent: 'space-between', alignItems: 'center', marginTop: hp(1) }]}>
                                    <View style={{ width: '40%' }}>
                                        <Text style={inputStyles.label}>Amount</Text>
                                        <View style={[inputStyles.box, { marginTop: hp(0.5), width: '60%' }]}>
                                            <Text style={[inputStyles.input, { textAlign: 'center', fontWeight: '600' }]}>₹{computeAmount(currentItem.quantity || 0, currentItem.rate || 0)}</Text>
                                        </View>
                                    </View>

                                    <View style={{ flexDirection: 'row' }}>
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            style={[styles.addBtn, { backgroundColor: COLORS.primary }]}
                                            onPress={handleAddLineItem}
                                            disabled={isAddingLine}
                                        >
                                            {isAddingLine ? (
                                                <ActivityIndicator size="small" color="#fff" />
                                            ) : (
                                                <Text style={[styles.addBtnText, { color: '#fff' }]}>{editItemId ? 'Update' : 'Add'}</Text>
                                            )}
                                        </TouchableOpacity>
                                        {editItemId ? (
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={[styles.addBtn, { backgroundColor: '#6c757d', marginLeft: wp(3) }]}
                                                onPress={() => { setCurrentItem({ itemType: '', itemTypeUuid: null, itemName: '', itemNameUuid: null, quantity: '', unit: '', unitUuid: null, desc: '', rate: '' }); setEditItemId(null); }}
                                            >
                                                <Text style={styles.addBtnText}>Cancel</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>
                                </View>
                            </View>


                        </View>
                        {linesLoading ? (
                            <View style={{ paddingVertical: hp(4), alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={COLORS.primary} />
                            </View>
                        ) : hasTableData && (
                            <View>
                                <View style={styles.tableControlsRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ marginRight: wp(2) }}>Show</Text>
                                        <Dropdown
                                            placeholder={String(pageSize)}
                                            value={String(pageSize)}
                                            options={pageSizes}
                                            getLabel={p => String(p)}
                                            getKey={p => String(p)}
                                            onSelect={v => { setPageSize(Number(v)); setPage(1); }}
                                            inputBoxStyle={{ width: wp(18) }}
                                            textStyle={inputStyles.input}
                                        />
                                        <Text style={{ marginLeft: wp(2) }}>entries</Text>
                                    </View>

                                    <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                        <TextInput
                                            style={[inputStyles.box, { width: wp(40), height: hp(5), paddingHorizontal: wp(2) }]}
                                            placeholder="Search..."
                                            value={tableSearch}
                                            onChangeText={t => { setTableSearch(t); setPage(1); }}
                                            placeholderTextColor={COLORS.textLight}
                                        />
                                    </View>
                                </View>

                                <View style={styles.tableWrapper}>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        nestedScrollEnabled={true}
                                        keyboardShouldPersistTaps="handled"
                                        directionalLockEnabled={true}
                                    >
                                        {(() => {
                                            const q = String(tableSearch || '').trim().toLowerCase();
                                            const filtered = q ? items.filter(it => {
                                                return (
                                                    String(it.name || '').toLowerCase().includes(q) ||
                                                    String(it.itemType || '').toLowerCase().includes(q) ||
                                                    String(it.desc || '').toLowerCase().includes(q)
                                                );
                                            }) : items;
                                            const total = filtered.length;
                                            if (total === 0) return null;
                                            const ps = Number(pageSize) || 10;
                                            const totalPages = Math.max(1, Math.ceil(total / ps));
                                            const currentPage = Math.min(Math.max(1, page), totalPages);
                                            const start = (currentPage - 1) * ps;
                                            const end = Math.min(start + ps, total);
                                            const visible = filtered.slice(start, end);

                                            return (
                                                <View style={styles.table}>
                                                    <View style={styles.thead}>
                                                        <View style={styles.tr}>
                                                            <Text style={[styles.th, { width: wp(10) }]}>Sr.No</Text>
                                                            <Text style={[styles.th, { width: wp(30) }]}>Item Details</Text>
                                                            <Text style={[styles.th, { width: wp(30) }]}>Description</Text>
                                                            <Text style={[styles.th, { width: wp(20) }]}>Quantity</Text>
                                                            <Text style={[styles.th, { width: wp(20) }]}>Rate</Text>
                                                            <Text style={[styles.th, { width: wp(20) }]}>Amount</Text>
                                                            <Text style={[styles.th, { width: wp(40) }]}>Action</Text>
                                                        </View>
                                                    </View>

                                                    <View style={styles.tbody}>
                                                        {visible.map((item, idx) => (
                                                            <View key={item.id} style={styles.tr}>
                                                                <View style={[styles.td, { width: wp(10) }]}>
                                                                    <Text style={styles.tdText}>{start + idx + 1}</Text>
                                                                </View>
                                                                <View style={[styles.td, { width: wp(30), paddingLeft: wp(2) }]}>
                                                                    <Text style={styles.tdText}>{item.name}</Text>
                                                                </View>
                                                                <View style={[styles.td, { width: wp(30) }]}>
                                                                    <Text style={styles.tdText}>{item.desc}</Text>
                                                                </View>
                                                                <View style={[styles.td, { width: wp(20) }]}>
                                                                    <Text style={styles.tdText}>{item.qty}</Text>
                                                                </View>
                                                                <View style={[styles.td, { width: wp(20) }]}>
                                                                    <Text style={styles.tdText}>₹{item.rate}</Text>
                                                                </View>
                                                                <View style={[styles.td, { width: wp(20) }]}>
                                                                    <Text style={[styles.tdText, { fontWeight: '600' }]}>₹{item.amount}</Text>
                                                                </View>
                                                                <View style={[styles.tdAction, { width: wp(40) }, { flexDirection: 'row', paddingLeft: wp(2) }]}>
                                                                    <TouchableOpacity style={styles.actionButton} onPress={() => handleEditItem(item.id)}>
                                                                        <Icon name="edit" size={rf(3.6)} color="#fff" />
                                                                    </TouchableOpacity>
                                                                    <TouchableOpacity style={[styles.actionButton, { marginLeft: wp(2) }]} onPress={() => deleteItem(item.id)}>
                                                                        <Icon name="delete" size={rf(3.6)} color="#fff" />
                                                                    </TouchableOpacity>
                                                                </View>
                                                            </View>
                                                        ))}

                                                        <View style={styles.paginationRow}>
                                                            <Text style={{ color: COLORS.textMuted }}>
                                                                Showing {total === 0 ? 0 : start + 1} to {end} of {total} entries
                                                            </Text>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <TouchableOpacity
                                                                    style={[styles.pageButton, { marginRight: wp(2) }]}
                                                                    disabled={currentPage <= 1}
                                                                    onPress={() => setPage(p => Math.max(1, p - 1))}
                                                                >
                                                                    <Text style={styles.pageButtonText}>Previous</Text>
                                                                </TouchableOpacity>
                                                                <Text style={{ marginHorizontal: wp(2) }}>{currentPage}</Text>
                                                                <TouchableOpacity
                                                                    style={styles.pageButton}
                                                                    disabled={currentPage >= totalPages}
                                                                    onPress={() => setPage(p => Math.min(totalPages, p + 1))}
                                                                >
                                                                    <Text style={styles.pageButtonText}>Next</Text>
                                                                </TouchableOpacity>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            );
                                        })()}
                                    </ScrollView>
                                </View>
                            </View>)}
                        <View style={styles.billContainer}>
                            {/* Subtotal */}
                            <View style={styles.row}>
                                <Text style={styles.labelBold}>Subtotal:</Text>
                                <Text style={styles.valueBold}>₹{computeSubtotal()}</Text>
                            </View>

                            {/* Shipping Charges */}
                            <View style={styles.rowInput}>
                                <Text style={styles.label}>Shipping Charges :</Text>

                                <View style={styles.inputRightGroup}>
                                    <TextInput
                                        value={String(shippingCharges)}
                                        onChangeText={setShippingCharges}
                                        keyboardType="numeric"
                                        style={[styles.inputBox, { color: '#000000' }]}
                                    />

                                    {/* Question Icon with Tooltip */}
                                    <View style={styles.helpIconWrapper}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowShippingTip(!showShippingTip);
                                                setShowAdjustmentTip(false);
                                            }}
                                            style={styles.helpIconContainer}
                                        >
                                            <Text style={styles.helpIcon}>?</Text>
                                        </TouchableOpacity>

                                        {/* Tooltip */}
                                        {showShippingTip && (
                                            <>
                                                <Modal
                                                    transparent
                                                    visible={showShippingTip}
                                                    animationType="none"
                                                    onRequestClose={() => setShowShippingTip(false)}
                                                >
                                                    <TouchableWithoutFeedback
                                                        onPress={() => setShowShippingTip(false)}
                                                    >
                                                        <View style={styles.modalOverlay} />
                                                    </TouchableWithoutFeedback>
                                                </Modal>
                                                <View style={styles.tooltipBox}>
                                                    <Text style={styles.tooltipText}>
                                                        Amount spent on shipping the goods.
                                                    </Text>
                                                    <View style={styles.tooltipArrow} />
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </View>

                                <Text style={styles.value}>
                                    ₹{parseFloat(shippingCharges || 0).toFixed(2)}
                                </Text>
                            </View>

                            {/* Adjustments */}
                            <View style={styles.rowInput}>
                                <TextInput
                                    value={adjustmentLabel}
                                    onChangeText={setAdjustmentLabel}
                                    underlineColorAndroid="transparent"
                                    style={styles.labelInput}
                                />

                                <View style={styles.inputRightGroup}>
                                    <TextInput
                                        value={String(adjustments)}
                                        onChangeText={setAdjustments}
                                        keyboardType="numeric"
                                        style={styles.inputBox}
                                    />
                                    {/* Question Icon with Tooltip */}
                                    <View style={styles.helpIconWrapper}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setShowAdjustmentTip(!showAdjustmentTip);
                                                setShowShippingTip(false);
                                            }}
                                            style={styles.helpIconContainer}
                                        >
                                            <Text style={styles.helpIcon}>?</Text>
                                        </TouchableOpacity>

                                        {/* Tooltip */}
                                        {showAdjustmentTip && (
                                            <>
                                                <Modal
                                                    transparent
                                                    visible={showAdjustmentTip}
                                                    animationType="none"
                                                    onRequestClose={() => setShowAdjustmentTip(false)}
                                                >
                                                    <TouchableWithoutFeedback
                                                        onPress={() => setShowAdjustmentTip(false)}
                                                    >
                                                        <View style={styles.modalOverlay} />
                                                    </TouchableWithoutFeedback>
                                                </Modal>
                                                <View style={styles.tooltipBox}>
                                                    <Text style={styles.tooltipText}>
                                                        Additional charges or discounts applied to the
                                                        order.
                                                    </Text>
                                                    <View style={styles.tooltipArrow} />
                                                </View>
                                            </>
                                        )}
                                    </View>
                                </View>

                                <Text style={styles.value}>
                                    ₹{parseFloat(adjustments || 0).toFixed(2)}
                                </Text>
                            </View>

                            {/* Total Tax */}
                            <View style={styles.row}>
                                <Text style={styles.label}>Total Tax:</Text>
                                <Text style={styles.value}>₹{(parseFloat(totalTax) || 0).toFixed(2)}</Text>
                            </View>

                            {/* Divider */}
                            <View style={styles.divider} />

                            {/* Total Amount */}
                            <View style={styles.row}>
                                <Text style={styles.labelBold}>Total Amount:</Text>
                                <Text style={styles.valueBold}>
                                    ₹
                                    {(() => {
                                        const serverNum = (serverTotalAmount !== null && serverTotalAmount !== undefined && String(serverTotalAmount).trim() !== '') ? parseFloat(serverTotalAmount) : NaN;
                                        const shippingNum = parseFloat(shippingCharges) || 0;
                                        const adjustmentsNum = parseFloat(adjustments) || 0;
                                        const subtotalNum = parseFloat(computeSubtotal()) || 0;
                                        const totalTaxNum = parseFloat(totalTax) || 0;

                                        const computedTotal = subtotalNum + shippingNum + adjustmentsNum + totalTaxNum;

                                        // Use server total only when it appears meaningful:
                                        // - serverNum is not NaN AND (serverNum is non-zero OR it closely matches computed total)
                                        // This avoids showing 0 (or an obviously incorrect value) when the server didn't compute totals.
                                        if (!isNaN(serverNum)) {
                                            const eps = Math.max(0.01, Math.abs(computedTotal) * 0.001);
                                            const epsSmall = 0.01;

                                            // If server total roughly equals subtotal (i.e. server didn't include shipping/adjustments),
                                            // prefer the locally computed total so shipping/adjustments are applied immediately.
                                            if (Math.abs(serverNum - subtotalNum) <= epsSmall) {
                                                return computedTotal.toFixed(2);
                                            }

                                            const serverMatches = Math.abs(serverNum - computedTotal) <= eps;
                                            if (serverNum !== 0 && serverMatches) {
                                                return serverNum.toFixed(2);
                                            }

                                            if (serverNum !== 0 && !serverMatches) {
                                                // If server provided a non-zero total but it doesn't match computed total,
                                                // prefer the server value (assuming authoritative), but ensure tax isn't double-counted.
                                                const delta = serverNum - subtotalNum - shippingNum - adjustmentsNum;
                                                if (!isNaN(delta) && Math.abs(delta - totalTaxNum) <= Math.max(0.01, Math.abs(totalTaxNum) * 0.01)) {
                                                    return serverNum.toFixed(2);
                                                }
                                                return (serverNum + totalTaxNum).toFixed(2);
                                            }

                                            // If serverNum is zero (likely missing calculation) fall through to computedTotal
                                        }

                                        return computedTotal.toFixed(2);
                                    })()}
                                </Text>
                            </View>
                        </View>

                        {/* Notes + Attach file inline */}
                        <View style={styles.notesAttachRow}>
                            <View style={styles.notesCol}>
                                <Text style={inputStyles.label}>Notes</Text>
                                <TextInput
                                    style={styles.noteBox}
                                    multiline
                                    numberOfLines={4}
                                    value={notes}
                                    onChangeText={setNotes}
                                    placeholder="Add any remarks..."
                                    placeholderTextColor={COLORS.textLight}
                                />
                            </View>
                            <View style={styles.notesCol}>
                                <Text style={inputStyles.label}>Terms & Conditions</Text>
                                <TextInput
                                    style={styles.noteBox}
                                    multiline
                                    numberOfLines={4}
                                    value={terms}
                                    onChangeText={setTerms}
                                    placeholder="Terms & Conditions..."
                                    placeholderTextColor={COLORS.textLight}
                                />
                            </View>
                            <View style={styles.attachCol}>
                                <Text style={inputStyles.label}>Attach file</Text>
                                <View
                                    style={[
                                        inputStyles.box,
                                        { justifyContent: 'space-between' },
                                        styles.fileInputBox,
                                    ]}
                                >
                                    <TextInput
                                        style={[inputStyles.input, { fontSize: rf(4.2) }]}
                                        placeholder="Attach file"
                                        placeholderTextColor="#9ca3af"
                                        value={file?.name || ''}
                                        editable={false}
                                    />
                                    {file ? (
                                        <TouchableOpacity
                                            activeOpacity={0.85}
                                            onPress={removeFile}
                                        >
                                            <Icon
                                                name="close"
                                                size={rf(3.6)}
                                                color="#ef4444"
                                                style={{ marginRight: SPACING.sm }}
                                            />
                                        </TouchableOpacity>
                                    ) : (
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            style={[styles.uploadButton]}
                                            onPress={pickFile}
                                        >
                                            <Icon name="cloud-upload" size={rf(4)} color="#fff" />
                                        </TouchableOpacity>
                                    )}
                                </View>
                                <Text style={styles.uploadHint}>
                                    Allowed: PDF, PNG, JPG • Max size 10 MB
                                </Text>
                            </View>
                        </View>
                    </AccordionSection>) : null}


                    {/* Section 5: Notes (full width) */}
                    {/* <AccordionSection id={5} title="Notes" expanded={expandedId === 5} onToggle={toggleSection}>
                            <Text style={inputStyles.label}>Notes</Text>
                            <TextInput style={styles.noteBox} multiline numberOfLines={4} value={notes} onChangeText={setNotes} placeholder="Add any remarks..." placeholderTextColor={COLORS.textLight} />
                        </AccordionSection> */}
                </ScrollView>
                <DatePickerBottomSheet
                    isVisible={openDatePicker}
                    onClose={closeDatePicker}
                    selectedDate={datePickerSelectedDate}
                    onDateSelect={handleDateSelect}
                    title="Select Date"
                />

                <View style={styles.footerBar}>
                    <View
                        style={[
                            formStyles.actionsRow,
                            {
                                justifyContent: 'space-between',
                                paddingHorizontal: wp(3.5),
                                paddingVertical: hp(1),
                            },
                        ]}
                    >
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={[formStyles.primaryBtn, { paddingVertical: hp(1.4) }]}
                            onPress={handleCreateOrder}
                            disabled={false}
                        >
                            <Text style={formStyles.primaryBtnText}>
                                Submit
                                {/* {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save & Send')} */}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={formStyles.cancelBtn}
                            onPress={onCancel}
                        >
                            <Text style={formStyles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                    {/* <View style={styles.centerButtonContainer}>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleCreateOrder}>
                        <Text style={styles.primaryButtonText}>Save & Send</Text>
                    </TouchableOpacity> */}
                </View>
            </View>
        </>
    );
};

export default AddSalesPerfomaInvoice;

const styles = StyleSheet.create({
    container: {
        padding: wp(3.5),
        paddingBottom: hp(6),
        backgroundColor: '#fff',
    },
    line: {
        borderBottomColor: COLORS.border,
        borderBottomWidth: hp(0.2),
        // marginVertical: hp(0.7),
    },
    headerSeparator: {
        height: 1,
        // backgroundColor: COLORS.border,
        width: '100%',
    },
    sectionWrapper: {
        marginBottom: hp(1.8),
        borderRadius: wp(2.5),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.bg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        paddingVertical: hp(1.6),
        backgroundColor: COLORS.bg,
    },
    sectionTitle: {
        fontSize: rf(4),
        // paddingVertical: hp(0.3),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: '700',
    },
    sectionBody: {
        padding: wp(2),
    },
    // Date picker helper styles (matching LeadForm)
    datePickerContainer: {},
    datePickerBox: {},
    datePickerText: {
        flex: 1,
        fontSize: rf(3.6),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
        marginLeft: wp(2),
    },
    calendarIconContainer: {
        padding: wp(1),
        borderRadius: wp(1),
        marginLeft: wp(1),
    },
    calendarIconContainerSelected: {
        backgroundColor: COLORS.primary + '15',
        paddingHorizontal: wp(2),
        paddingVertical: wp(1),
    },
    innerFieldBox: {
        borderColor: '#e5e7eb',
        borderWidth: 0.8,
        height: hp(5.4),
    },
    label: {
        marginTop: hp(1.2),
        color: COLORS.textMuted,
        fontSize: rf(3.0),
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
    },
    // input: {
    //     borderWidth: 0.8,
    //     borderColor: COLORS.border,
    //     borderRadius: wp(2.5),
    //     paddingHorizontal: wp(3.2),
    //     height: hp(5.2),
    //     marginTop: hp(0.8),
    //     fontFamily: TYPOGRAPHY.fontFamilyRegular,
    //     color: COLORS.text
    // },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    col: {
        width: '48%',
    },
    colFull: {
        width: '100%',
    },
    checkboxCol: {
        justifyContent: 'center',
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkboxBox: {
        width: wp(6),
        height: wp(6),
        borderRadius: wp(1.2),
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallInput: {
        width: wp(12),
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(2.5),
        paddingHorizontal: wp(3.2),
        height: hp(5.2),
        marginLeft: wp(2),
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
        color: COLORS.text,
    },
    itemWrapper: {
        marginTop: hp(1.2),
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1),
    },
    amountBox: {
        width: wp(18),
        alignItems: 'flex-end',
    },
    noteBox: {
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(2.5),
        padding: wp(3),
        backgroundColor: '#fff',
        marginTop: hp(1),
    },
    centerButtonContainer: {
        alignItems: 'center',
        marginVertical: hp(1),
        backgroundColor: '#fff',
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkText: {
        color: COLORS.primary,
        marginLeft: wp(2),
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
    },
    summaryLabel: {
        fontSize: rf(3.2),
        color: COLORS.textMuted,
        marginBottom: hp(1),
    },
    previewBox: {
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(2.5),
        padding: wp(3),
        backgroundColor: COLORS.bg,
    },
    previewText: {
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
        marginBottom: hp(0.6),
    },
    itemCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: wp(1.2),
        padding: wp(3),
        marginBottom: hp(1.2),
        backgroundColor: '#fff',
    },
    itemHeader: {
        marginTop: hp(0.6),
        marginBottom: hp(0.6),
    },
    descInput: {
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(1.2),
        padding: wp(2),
        backgroundColor: COLORS.bg,
        minHeight: hp(8),
        textAlignVertical: 'top',
    },
    /* removed duplicate red deleteBtn to avoid extra spacing; keep the final deleteBtn style below */
    primaryButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: hp(1.6),
        borderRadius: wp(2.5),
        marginTop: hp(1.6),
        alignItems: 'center',
    },
    primaryButtonText: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontSize: rf(3.6),
    },
    //  Table Style
    // tableHeaderCell: {
    //     fontSize: rf(1.7),
    //     fontWeight: '600',
    //     width: wp(12),
    //     textAlign: 'center',
    //     paddingVertical: hp(1),
    // },

    // tableHeaderCellWide: {
    //     fontSize: rf(1.7),
    //     fontWeight: '600',
    //     width: wp(50),
    //     textAlign: 'center',
    //     paddingVertical: hp(1),
    // },

    // tableRow: {
    //     flexDirection: 'row',
    //     borderBottomWidth: 1,
    //     borderColor: COLORS.border,
    //     paddingHorizontal: wp(1),
    //     alignItems: 'center',
    // },

    // tableCell: {
    //     width: wp(12),
    //     padding: wp(1),
    //     borderRightWidth: 1,
    //     borderColor: COLORS.border,
    // },

    tableCellWide: {
        width: wp(50),
        padding: wp(1),
        borderRightWidth: 1,
        borderColor: COLORS.border,
    },

    // input: {
    //     textAlign: 'center',
    //     // borderWidth: 1,
    //     // borderColor: COLORS.border,
    //     // borderRadius: wp(1),
    //     paddingHorizontal: wp(2),
    //     paddingVertical: hp(0.8),
    // },

    // deleteBtn: {
    //     backgroundColor: COLORS.primary,
    //     paddingVertical: hp(0.8),
    //     paddingHorizontal: wp(3),
    //     borderRadius: wp(1),
    // },
    // //  end here
    selectedContainer: {
        backgroundColor: '#f3f3f3', // light muted background
        padding: wp(3),
        marginTop: hp(0.8),
        borderBottomLeftRadius: wp(3), // round bottom-left
        borderBottomRightRadius: wp(1), // slight curve
        borderWidth: 1,
        borderColor: '#ddd',
    },

    itemHeader: {
        marginBottom: hp(0.8),
    },

    itemName: {
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        color: COLORS.text,
        fontSize: wp(3.7),
    },

    itemSku: {
        color: COLORS.textLight,
        marginTop: hp(0.4),
        fontSize: wp(3),
    },

    descInput: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        padding: wp(2),
        marginTop: hp(0.8),
        borderRadius: wp(2),
        color: COLORS.text,
    },

    hsnTag: {
        backgroundColor: COLORS.info,
        fontSize: wp(2.2),
        color: '#fff',
        padding: wp(1.2),
        borderRadius: wp(2),
        alignSelf: 'flex-start',
        marginTop: hp(1),
    },
    /* Totals / Notes styles */
    totalsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: hp(1.5),
        padding: wp(3),
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: wp(1.2),
    },
    totalsLeft: {
        width: '55%',
    },
    totalsRight: {
        width: '45%',
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: hp(0.6),
    },
    totalsRowSmall: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        marginBottom: hp(0.3),
    },
    totalsLabel: {
        fontSize: rf(3.2),
        color: COLORS.textMuted,
    },
    totalsValue: {
        fontSize: rf(3.2),
        color: COLORS.text,
    },
    totalsLabelSmall: {
        fontSize: rf(2.8),
        color: COLORS.textMuted,
        marginRight: wp(2),
    },
    totalsDivider: {
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        width: '100%',
        marginVertical: hp(0.8),
    },
    totalsRowTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    totalsLabelBold: {
        fontSize: rf(3.4),
        fontWeight: '700',
        color: COLORS.text,
    },
    totalsValueBold: {
        fontSize: rf(3.4),
        fontWeight: '700',
        color: COLORS.text,
    },
    smallNumericInput: {
        width: wp(24),
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(1.2),
        paddingHorizontal: wp(2),
        height: hp(5),
        backgroundColor: '#fff',
    },
    notesAttachRow: {
        flexDirection: 'column',
        marginTop: hp(1.2),
        alignItems: 'flex-start',
    },
    notesCol: {
        width: wp(90.5),
        flex: 1,
        paddingRight: wp(2),
    },
    attachCol: {
        width: wp(88.5),
        flex: 1,
        alignItems: 'flex-start',
    },
    attachBox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    chooseFileBtn: {
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: wp(3),
        paddingVertical: hp(1),
        borderRadius: wp(1),
    },
    chooseFileText: {
        color: COLORS.text,
    },
    fileNameBox: {
        marginLeft: wp(2),
        paddingHorizontal: wp(2),
        paddingVertical: hp(1.5),
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: wp(1),
        width: wp(60),
        justifyContent: 'center',
    },
    fileNameText: {
        color: COLORS.textLight,
        fontSize: rf(3),
        marginLeft: wp(2),
        flex: 1,
    },
    fileDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: wp(2),
        paddingHorizontal: wp(2),
        paddingVertical: hp(1),
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: wp(1),
        backgroundColor: COLORS.bg,
        flex: 1,
    },
    previewImage: {
        width: wp(8),
        height: wp(8),
        borderRadius: wp(1),
        marginRight: wp(2),
    },
    removeBtn: {
        marginLeft: wp(2),
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.5),
    },
    removeBtnText: {
        color: '#dc3545',
        fontSize: rf(4),
        fontWeight: 'bold',
    },
    noFile: {
        marginLeft: wp(2),
        paddingHorizontal: wp(2),
        paddingVertical: hp(1),
    },
    noFileText: {
        color: COLORS.textLight,
        fontSize: rf(3),
    },
    uploadButton: {
        backgroundColor: COLORS.primary,
        padding: wp(2.2),
        borderRadius: wp(2),
    },
    fileInputBox: {
        marginTop: hp(0.8),
        width: '100%',
    },
    uploadHint: {
        marginTop: hp(0.6),
        color: '#6b7280',
        fontSize: rf(2.8),
        fontStyle: 'italic',
    },
    tableWrapper: {
        borderWidth: 1,
        borderColor: '#CFCFCF',
        borderRadius: wp(1.5),
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    table: { minWidth: wp(170) },

    /* ── COMMON ── */
    thead: {
        backgroundColor: '#f1f1f1',
    },
    tr: {
        flexDirection: 'row',

    },

    /* ── TH (header) ── */
    th: {
        paddingVertical: hp(1.4),
        textAlign: 'center',
        fontWeight: '700',
        fontSize: wp(3),
        borderRightWidth: 1,
        borderRightColor: '#CFCFCF',
    },

    /* ── TD (body) ── */
    td: {
        paddingHorizontal: wp(0.8),
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingVertical: hp(1.2),
    },
    tdText: {
        fontSize: wp(3),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
    },
    actionButton: {
        backgroundColor: '#6c757d',
        paddingVertical: hp(0.5),
        paddingHorizontal: wp(2),
        borderRadius: wp(1),
    },
    addButtonWrapperRow: {
        flexDirection: 'row',
        marginTop: hp(1),
        marginBottom: hp(1),
    },
    addButton: {
        paddingVertical: hp(0.8),
        paddingHorizontal: wp(3),
        borderRadius: wp(1),
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: wp(18),
    },
    addButtonText: {
        color: COLORS.text,
        fontWeight: '700',
        fontSize: wp(3.4),
        textAlign: 'center',
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
    },
    tableControlsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: wp(2),
    },
    paginationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: wp(2),
        width: '100%',
    },
    pageButton: {
        backgroundColor: '#e5e7eb',
        paddingVertical: hp(0.6),
        paddingHorizontal: wp(3),
        borderRadius: wp(0.8),
    },
    pageButtonText: {
        color: COLORS.text,
        fontWeight: '600',
    },
    tdAction: {
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },

    /* ── INPUT ── */
    input: {
        width: '100%',
        textAlign: 'center',
        fontSize: wp(3.2),
        color: COLORS.text,
        paddingVertical: hp(0.6),
        borderWidth: 1,
        borderColor: '#ced4da',
        borderRadius: wp(1),
        backgroundColor: '#fff',
    },

    /* ── ITEM CARD ── */
    // itemCard: {
    //     backgroundColor: '#fff',
    //     padding: wp(2),
    //     borderRadius: wp(1.5),
    //     borderWidth: 1,
    //     borderColor: '#ddd',
    // },
    // itemTitle: { fontWeight: 'bold', fontSize: wp(3.6), color: COLORS.text },
    // itemSku: { fontSize: wp(3), color: COLORS.textLight, marginTop: hp(0.2) },
    // itemDesc: {
    //     marginTop: hp(0.6),
    //     borderWidth: 1,
    //     borderColor: '#ced4da',
    //     borderRadius: wp(1),
    //     padding: wp(1.5),
    //     backgroundColor: '#fff',
    //     minHeight: hp(6),
    //     textAlignVertical: 'top',
    //     fontSize: wp(3.2),
    // },
    // hsnBadge: {
    //     marginTop: hp(0.8),
    //     backgroundColor: '#17a2b8',
    //     color: '#fff',
    //     fontSize: wp(2.8),
    //     paddingHorizontal: wp(2),
    //     paddingVertical: hp(0.4),
    //     borderRadius: wp(2),
    //     alignSelf: 'flex-start',
    // },

    /* ── BUTTONS ── */
    deleteBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: hp(1),
        paddingHorizontal: wp(5),
        borderRadius: wp(1),
    },
    deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: wp(2.8) },

    addBtn: {
        marginTop: hp(1.5),
        borderWidth: 1,
        borderColor: COLORS.primary,
        paddingVertical: hp(0.9),
        paddingHorizontal: wp(4),
        borderRadius: wp(1),
        alignSelf: 'flex-start',
    },
    addBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: wp(3.5) },
    billContainer: {
        paddingVertical: 10,
        width: '100%',
    },

    rowInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },

    label: {
        fontSize: 14,
        color: '#333',
        width: '35%',
    },

    labelBold: {
        fontSize: 15,
        fontWeight: '600',
        color: '#000',
    },

    value: {
        fontSize: 14,
        color: '#333',
        width: '20%',
        textAlign: 'right',
    },

    valueBold: {
        fontSize: 15,
        fontWeight: '700',
        color: '#000',
        textAlign: 'right',
    },

    inputRightGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '35%',
        justifyContent: 'flex-end',
        position: 'relative',
        zIndex: 1,
    },

    inputBox: {
        width: 70,
        height: 35,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        textAlign: 'center',
        marginRight: 8,
        backgroundColor: '#fff',
    },

    labelInput: {
        fontSize: 14,
        color: '#000000',
        width: '35%',
        height: 35,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        paddingHorizontal: 8,
        textAlign: 'left',
        backgroundColor: '#fff',
    },

    helpIconContainer: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    helpIcon: {
        textAlign: 'center',
        textAlignVertical: 'center',
        fontSize: 12,
        color: '#777',
    },

    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 10,
    },

    helpIconWrapper: {
        position: 'relative',
        zIndex: 100,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    tooltipBox: {
        position: 'absolute',
        bottom: hp(5),
        right: -wp(4),
        backgroundColor: '#1e2530',
        padding: 12,
        borderRadius: 8,
        width: 220,
        maxWidth: wp(60),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 10,
        zIndex: 101,
    },

    tooltipText: {
        color: '#fff',
        fontSize: 13,
        lineHeight: 18,
    },

    tooltipArrow: {
        position: 'absolute',
        bottom: -8,
        right: 18,
        width: 0,
        height: 0,
        borderLeftWidth: 7,
        borderRightWidth: 7,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#1e2530',
    },
});
