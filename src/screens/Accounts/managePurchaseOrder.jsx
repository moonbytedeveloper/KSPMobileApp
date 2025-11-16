import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, PermissionsAndroid, Platform, Modal, TouchableWithoutFeedback } from 'react-native';
import { wp, hp, rf } from '../../utils/responsive';
import Dropdown from '../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, inputStyles, SPACING } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import { useNavigation } from '@react-navigation/native';
import { formStyles } from '../styles/styles';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import { pick, types, isCancel } from '@react-native-documents/picker';

const COL_WIDTHS = {
    ITEM: wp(50),   // 35%
    QTY: wp(30),   // 30%
    RATE: wp(30),   // 30%
    TAX: wp(30),   // 30%
    AMOUNT: wp(30),   // 30%
    ACTION: wp(30),    // 30%
};
const AccordionSection = ({ id, title, expanded, onToggle, children, wrapperStyle }) => {

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
            <TouchableOpacity activeOpacity={0.8} style={styles.sectionHeader} onPress={() => onToggle(id)}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Icon name={expanded ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.text} />
            </TouchableOpacity>
            {expanded && <View style={styles.line} />}
            {expanded && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
};

const ManagePurchaseOrder = () => {
    const [expandedId, setExpandedId] = useState(1);
    const navigation = useNavigation();
    const toggleSection = (id) => setExpandedId((prev) => (prev === id ? null : id));

    // Demo options for dropdowns
    const paymentTerms = ['Due on Receipt', 'Net 7', 'Net 15', 'Net 30'];
    const taxOptions = ['IGST', 'CGST', 'SGST', 'No Tax'];
    const countries = ['India', 'United States', 'United Kingdom'];
    const salesInquiries = ['- Select Inquiry -', 'SI-1001', 'SI-1002'];
    const customers = ['- Select Customer -', 'Acme Corp', 'Beta Ltd'];
    const paymentMethods = ['- Select Method -', 'Cash', 'Bank Transfer', 'Card'];

    // Master items (would come from API normally)
    const masterItems = [
        { name: 'Sofa', sku: 'Item 1', rate: 865, desc: 'Comfortable sofa set.', hsn: '998700' },
        { name: 'Area Rug', sku: 'Item 2', rate: 3967, desc: 'High quality area rug.', hsn: '816505' },
        { name: 'Dining Table', sku: 'Item 5', rate: 5138, desc: 'Wooden dining table.', hsn: '847522' },
    ];

    // Form state
    const [headerForm, setHeaderForm] = useState({ companyName: '', opportunityTitle: '', clientName: '', phone: '', email: '' });
    const [billingForm, setBillingForm] = useState({ buildingNo: '', street1: '', street2: '', postalCode: '', country: '', state: '', city: '' });
    const [shippingForm, setShippingForm] = useState({ buildingNo: '', street1: '', street2: '', postalCode: '', country: '', state: '', city: '' });
    const [isShippingSame, setIsShippingSame] = useState(false);
    const [items, setItems] = useState([{ id: 1, selectedItem: null, name: '', sku: '', rate: '0', desc: '', hsn: '', qty: '1', tax: 'IGST', amount: '0.00' }]);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [openDatePicker, setOpenDatePicker] = useState(false);
    const [datePickerField, setDatePickerField] = useState(null); // 'invoice' | 'due'
    const [datePickerSelectedDate, setDatePickerSelectedDate] = useState(new Date());
    const [paymentTerm, setPaymentTerm] = useState(paymentTerms[0]);
    const [notes, setNotes] = useState('');
    const [shippingCharges, setShippingCharges] = useState('0');
    const [adjustments, setAdjustments] = useState('0');
    const [file, setFile] = useState(null);
    const [showShippingTip, setShowShippingTip] = useState(false);
    const [showAdjustmentTip, setShowAdjustmentTip] = useState(false);
    const [discount, setDiscount] = useState(false);
   

    // Permission handling for Android
    const requestStoragePermissionAndroid = async () => {
        if (Platform.OS !== 'android') return true;

        const sdkVersion = Platform.constants?.Release ? Number(Platform.constants.Release) : 0;

        // On Android 13 (API 33+) use READ_MEDIA_*; otherwise use READ_EXTERNAL_STORAGE
        if (Platform.Version >= 33) {
            const readImages = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
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

    const formatUiDate = (date) => {
        try {
            const d = new Date(date);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const dd = String(d.getDate()).padStart(2, '0');
            const mmm = months[d.getMonth()];
            const yyyy = String(d.getFullYear());
            return `${dd}-${mmm}-${yyyy}`;
        } catch (e) {
            return '';
        }
    };

    const openDatePickerFor = (field) => {
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

    const handleDateSelect = (date) => {
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

    const addItem = () => {
        setItems((prev) => {
            const nextId = prev.length ? prev[prev.length - 1].id + 1 : 1;
            return [...prev, { id: nextId, selectedItem: null, name: '', sku: '', rate: '0', desc: '', hsn: '', qty: '1', tax: 'IGST', amount: '0.00' }];
        });
    };

    const deleteItem = (id) => {
        setItems((prev) => prev.filter((r) => r.id !== id));
    };

    const selectMasterItem = (rowId, item) => {
        setItems((prev) => prev.map((r) => {
            if (r.id !== rowId) return r;
            const qty = r.qty || '1';
            return {
                ...r,
                selectedItem: item,
                name: item.name,
                sku: item.sku,
                rate: String(item.rate),
                desc: item.desc || '',
                hsn: item.hsn || '',
                amount: computeAmount(qty, item.rate),
            };
        }));
    };

    const updateItemField = (rowId, key, value) => {
        setItems((prev) => prev.map((r) => {
            if (r.id !== rowId) return r;
            const updated = { ...r, [key]: value };
            if (key === 'qty' || key === 'rate') {
                updated.amount = computeAmount(updated.qty, updated.rate);
            }
            return updated;
        }));
    };

    const handleCreateOrder = () => {
        const payload = { header: headerForm, billing: billingForm, shipping: shippingForm, items, invoiceDate, dueDate, paymentTerm, notes };
        console.log('Create Order payload:', payload);
        Alert.alert('Create Order', 'Order payload logged to console');
    };
    const onCancel = () => { };

    // File attachment functions
    const pickFile = async () => {
        try {
            const hasPerm = await requestStoragePermissionAndroid();
            if (!hasPerm) {
                Alert.alert('Permission required', 'Storage permission is needed to pick a file.');
                return;
            }

            const [selectedFile] = await pick({
                type: [types.pdf, types.images],
                allowMultiSelection: false
            });

            if (selectedFile) {
                // Validate file type
                const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
                if (!allowedTypes.includes(selectedFile.type)) {
                    Alert.alert('Invalid File Type', 'Please select a PDF, PNG, or JPG file.');
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

    return (
        <>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <AppHeader
                    title="Manage Purchase Order"
                    onLeftPress={() => {
                        navigation.goBack();
                    }}
                />
                <View style={styles.headerSeparator} />
                <ScrollView contentContainerStyle={[styles.container]} showsVerticalScrollIndicator={false}>
                    {/* Section 1: Header / Basic Details */}
                    <AccordionSection id={1} title="Header" expanded={expandedId === 1} onToggle={toggleSection}>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                {/* <Text style={[inputStyles.label, { fontWeight: '600' }]}>Sales Inquiry No.</Text> */}
                                <Dropdown
                                    placeholder="Sales Inquiry No."
                                    value={headerForm.companyName}
                                    options={salesInquiries}
                                    getLabel={(s) => s}
                                    getKey={(s) => s}
                                    onSelect={(v) => setHeaderForm((s) => ({ ...s, companyName: v }))}
                                    inputBoxStyle={inputStyles.box}
                                    textStyle={inputStyles.input}
                                />
                            </View>
                            <View style={styles.col}>
                                {/* <Text style={inputStyles.label}>Customer Name*</Text> */}
                                <Dropdown
                                    placeholder="Customer Name*"
                                    value={headerForm.opportunityTitle}
                                    options={customers}
                                    getLabel={(c) => c}
                                    getKey={(c) => c}
                                    onSelect={(v) => setHeaderForm((s) => ({ ...s, opportunityTitle: v }))}
                                    inputBoxStyle={inputStyles.box}
                                    textStyle={inputStyles.input}
                                />
                            </View>
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]} >
                            <View style={styles.col}>
                                {/* <Text style={[inputStyles.label, { marginBottom: hp(1.5) }]}>Sales Order Number*</Text> */}
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={headerForm.clientName} onChangeText={(v) => setHeaderForm((s) => ({ ...s, clientName: v }))} placeholder="Sales Order Number*" placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                            <View style={styles.col}>
                                {/* <Text style={[inputStyles.label, { marginBottom: hp(1.5) }]}>Project Name*</Text> */}
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} keyboardType="phone-pad" maxLength={10} value={headerForm.phone} onChangeText={(v) => setHeaderForm((s) => ({ ...s, phone: v.replace(/\D/g, '') }))} placeholder="Project Name*" placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
                            <View style={styles.col}>
                                {/* <Text style={inputStyles.label}>Payment Term*</Text> */}
                                <Dropdown
                                    placeholder="Payment Term"
                                    value={paymentTerm}
                                    options={paymentTerms}
                                    getLabel={(p) => p}
                                    getKey={(p) => p}
                                    onSelect={(v) => setPaymentTerm(v)}
                                    inputBoxStyle={inputStyles.box}
                                    textStyle={inputStyles.input}
                                />
                            </View>
                            <View style={styles.col}>
                                {/* <Text style={inputStyles.label}>Payment Method*</Text> */}
                                <Dropdown
                                    placeholder="Payment Method"
                                    value={headerForm.clientName}
                                    options={paymentMethods}
                                    getLabel={(p) => p}
                                    getKey={(p) => p}
                                    onSelect={(v) => setHeaderForm((s) => ({ ...s, clientName: v }))}
                                    inputBoxStyle={inputStyles.box}
                                    textStyle={inputStyles.input}
                                />
                            </View>
                        </View>
                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
                            <View style={styles.col}>
                                {/* <Text style={inputStyles.label}>Order Date*</Text> */}
                                <TouchableOpacity activeOpacity={0.7} onPress={() => openDatePickerFor('Order Date')} style={{ marginTop: hp(0.8) }}>
                                    <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                        <Text style={[
                                            inputStyles.input,
                                            styles.datePickerText,
                                            !invoiceDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                            invoiceDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                        ]}>
                                            {invoiceDate || 'Order Date*'}
                                        </Text>
                                        <View style={[
                                            styles.calendarIconContainer,
                                            invoiceDate && styles.calendarIconContainerSelected
                                        ]}>
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

                    </AccordionSection>

                    {/* Section 2: Billing Address */}
                    <AccordionSection id={2} title="Billing Address" expanded={expandedId === 2} onToggle={toggleSection}>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Building No.</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={billingForm.buildingNo} onChangeText={(v) => setBillingForm((s) => ({ ...s, buildingNo: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Street 1</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={billingForm.street1} onChangeText={(v) => setBillingForm((s) => ({ ...s, street1: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Street 2</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={billingForm.street2} onChangeText={(v) => setBillingForm((s) => ({ ...s, street2: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Postal Code</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={billingForm.postalCode} onChangeText={(v) => setBillingForm((s) => ({ ...s, postalCode: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Country Name</Text>
                                <Dropdown placeholder="- Select Country -" value={billingForm.country} options={countries} getLabel={(c) => c} getKey={(c) => c} onSelect={(c) => setBillingForm((s) => ({ ...s, country: c }))} inputBoxStyle={inputStyles.box} style={{ marginBottom: hp(1.6) }} />
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>State Name</Text>
                                <Dropdown placeholder="- Select State -" value={billingForm.state} options={['- Select State -']} getLabel={(c) => c} getKey={(c) => c} onSelect={(c) => setBillingForm((s) => ({ ...s, state: c }))} inputBoxStyle={inputStyles.box} style={{ marginBottom: hp(1.6) }} />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>City Name</Text>
                                <Dropdown placeholder="- Select City -" value={billingForm.city} options={['- Select City -']} getLabel={(c) => c} getKey={(c) => c} onSelect={(c) => setBillingForm((s) => ({ ...s, city: c }))} inputBoxStyle={inputStyles.box} style={{ marginBottom: hp(1.6) }} />
                            </View>
                            <View style={[styles.col, styles.checkboxCol]}>
                                <TouchableOpacity activeOpacity={0.8} style={styles.checkboxRow} onPress={() => { copyBillingToShipping(); }}>
                                    <View style={styles.checkboxBox}>
                                        {isShippingSame ? <Icon name="check" size={rf(3)} color="#fff" /> : null}
                                    </View>
                                    <View style={{ width: '80%' }}>
                                        <Text style={[inputStyles.label, { marginLeft: wp(2), marginTop: 0 }]}>Is Shipping Address Same</Text>
                                    </View>

                                </TouchableOpacity>
                            </View>
                        </View>
                    </AccordionSection>

                    {/* Section 3: Shipping Address */}
                    <AccordionSection id={3} title="Shipping Address" expanded={expandedId === 3} onToggle={toggleSection}>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Building No.</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={shippingForm.buildingNo} onChangeText={(v) => setShippingForm((s) => ({ ...s, buildingNo: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Street 1</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={shippingForm.street1} onChangeText={(v) => setShippingForm((s) => ({ ...s, street1: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Street 2</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={shippingForm.street2} onChangeText={(v) => setShippingForm((s) => ({ ...s, street2: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Postal Code</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={shippingForm.postalCode} onChangeText={(v) => setShippingForm((s) => ({ ...s, postalCode: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Country Name</Text>
                                <Dropdown placeholder="- Select Country -" value={shippingForm.country} options={countries} getLabel={(c) => c} getKey={(c) => c} onSelect={(c) => setShippingForm((s) => ({ ...s, country: c }))} inputBoxStyle={inputStyles.box} style={{ marginBottom: hp(1.6) }} />
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>State Name</Text>
                                <Dropdown placeholder="- Select State -" value={shippingForm.state} options={['- Select State -']} getLabel={(c) => c} getKey={(c) => c} onSelect={(c) => setShippingForm((s) => ({ ...s, state: c }))} inputBoxStyle={inputStyles.box} style={{ marginBottom: hp(1.6) }} />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>City Name</Text>
                                <Dropdown placeholder="- Select City -" value={shippingForm.city} options={['- Select City -']} getLabel={(c) => c} getKey={(c) => c} onSelect={(c) => setShippingForm((s) => ({ ...s, city: c }))} inputBoxStyle={inputStyles.box} style={{ marginBottom: hp(1.6) }} />
                            </View>
                            <View style={styles.col} />
                        </View>
                    </AccordionSection>

                    {/* Section 4: Create Order */}
                    <AccordionSection id={4} title="Create Order" expanded={expandedId === 4}
                        onToggle={toggleSection} wrapperStyle={{ overflow: 'visible' }}>

                        <View style={{ marginTop: hp(1) }}>
                            <Text style={[styles.sectionTitle,
                            { marginBottom: hp(1), color: COLORS.textMuted, fontWeight: '700', fontSize: wp(4.5) }]}>
                                Item Details
                            </Text>

                            {/* ── TABLE CONTAINER ── */}
                            <View style={styles.tableWrapper}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={true}
                                    stickyHeaderIndices={[0]}
                                    contentContainerStyle={{ minWidth: wp(180) }}>
                                    <View style={styles.table}>

                                        {/* ── THEAD ── */}
                                        <View style={styles.thead}>
                                            <View style={styles.tr}>
                                                <Text style={[styles.th, { width: COL_WIDTHS.ITEM }]}>ITEM DETAILS</Text>
                                                <Text style={[styles.th, { width: COL_WIDTHS.QTY }]}>QUANTITY</Text>
                                                <Text style={[styles.th, { width: COL_WIDTHS.RATE }]}>RATE</Text>
                                                <Text style={[styles.th, { width: COL_WIDTHS.TAX }]}>TAX</Text>
                                                <Text style={[styles.th, { width: COL_WIDTHS.AMOUNT }]}>AMOUNT</Text>
                                                <Text style={[styles.th, { width: COL_WIDTHS.ACTION }]}>ACTION</Text>
                                            </View>
                                        </View>

                                        {/* ── TBODY ── */}
                                        <View style={styles.tbody}>
                                            {items.map(row => (
                                                <View key={row.id} style={styles.tr}>

                                                    <View
                                                        style={[
                                                            styles.tableCellWide,
                                                            {
                                                                borderRightWidth: 1,
                                                                borderColor: '#E0E0E0'
                                                            }
                                                        ]}
                                                    >
                                                        <View style={{ zIndex: 9999, elevation: 20 }}>
                                                            <Dropdown
                                                                placeholder="Select Item"
                                                                value={row.selectedItem ? row.selectedItem.name : ''}
                                                                options={masterItems}
                                                                getLabel={(it) => `${it.name} | ${it.sku} | ₹${it.rate}`}
                                                                getKey={(it) => it.sku}
                                                                onSelect={(it) => selectMasterItem(row.id, it)}
                                                                renderInModal={true}
                                                                inputBoxStyle={{
                                                                    ...inputStyles.box,
                                                                    height: hp(6),      // bigger height
                                                                    borderWidth: 1,
                                                                    backgroundColor: '#fff',
                                                                    width: wp(48),       // wider dropdown
                                                                }}
                                                                textStyle={[inputStyles.input, { fontSize: wp(3.2) }]}
                                                                dropdownListStyle={{
                                                                    backgroundColor: '#fff',
                                                                    elevation: 10,
                                                                    zIndex: 9999,
                                                                    borderWidth: 1,
                                                                    borderColor: '#ccc',
                                                                    width: wp(55),
                                                                }}
                                                            />
                                                        </View>

                                                        {row.selectedItem ? (
                                                            <View style={styles.selectedContainer}>
                                                                <View style={styles.itemHeader}>
                                                                    <Text style={styles.itemName}>{row.name}</Text>
                                                                    <Text style={styles.itemSku}>SKU: {row.sku}</Text>
                                                                </View>
                                                                <View style={styles.descInput}>
                                                                    <Text style={{ color: COLORS.text }}>{row.desc}</Text>
                                                                </View>
                                                                {row.hsn ? (
                                                                    <Text style={styles.hsnTag}>HSN: {row.hsn}</Text>
                                                                ) : null}
                                                            </View>
                                                        ) : null}
                                                    </View>

                                                    {/* QUANTITY */}
                                                    <View style={[styles.td, { width: COL_WIDTHS.QTY }]}>
                                                        <TextInput
                                                            style={styles.input}
                                                            keyboardType="numeric"
                                                            value={String(row.qty ?? '')}
                                                            onChangeText={v => updateItemField(row.id, 'qty', v)}
                                                        />
                                                    </View>

                                                    {/* RATE */}
                                                    <View style={[styles.td, { width: COL_WIDTHS.RATE }]}>
                                                        <TextInput
                                                            style={styles.input}
                                                            keyboardType="numeric"
                                                            value={String(row.rate ?? '')}
                                                            onChangeText={v => updateItemField(row.id, 'rate', v)}
                                                        />
                                                    </View>

                                                    {/* TAX */}
                                                    <View style={[styles.td, { width: COL_WIDTHS.TAX }]}>
                                                        <Text style={styles.input}>
                                                            {row.tax ?? '- Non Taxable -'}
                                                        </Text>
                                                    </View>

                                                    {/* AMOUNT */}
                                                    <View style={[styles.td, { width: COL_WIDTHS.AMOUNT }]}>
                                                        <Text style={[styles.input, { fontWeight: '600' }]}>
                                                            ₹{row.amount ?? '0.00'}
                                                        </Text>
                                                    </View>

                                                    {/* ACTION */}
                                                    <View style={[styles.tdAction, { width: COL_WIDTHS.ACTION }]}>
                                                        <TouchableOpacity
                                                            style={styles.deleteBtn}
                                                            onPress={() => deleteItem(row.id)}
                                                        >
                                                            <Text style={styles.deleteBtnText}>Delete</Text>
                                                        </TouchableOpacity>
                                                    </View>

                                                </View>
                                            ))}
                                        </View>

                                    </View>
                                </ScrollView>
                            </View>

                            {/* ADD ITEM */}
                            <TouchableOpacity style={styles.addBtn} onPress={addItem}>
                                <Text style={styles.addBtnText}>+ Add Item</Text>
                            </TouchableOpacity>

                            {/* Totals / Summary area */}

                            <View style={styles.billContainer}>

                                {/* Subtotal */}
                                <View style={styles.row}>
                                    <Text style={styles.labelBold}>Subtotal:</Text>
                                    <Text style={styles.valueBold}>₹{computeSubtotal()}</Text>
                                </View>

                                {/* Discount */}
                                <View style={styles.rowInput}>
                                    <Text style={styles.label}>Discount :</Text>

                                    <View style={styles.inputRightGroup}>
                                        <TextInput
                                            value={String(discount)}
                                            onChangeText={setDiscount}
                                            keyboardType="numeric"
                                            style={styles.inputBox}
                                        />
                                    </View>

                                    <Text style={styles.value}>₹{parseFloat(discount || 0).toFixed(2)}</Text>
                                </View>

                                {/* Total Tax */}
                                <View style={styles.row}>
                                    <Text style={styles.label}>Total Tax:</Text>
                                    <Text style={styles.value}>₹0.00</Text>
                                </View>

                                {/* Divider */}
                                <View style={styles.divider} />

                                {/* Total Amount */}
                                <View style={styles.row}>
                                    <Text style={styles.labelBold}>Total Amount:</Text>
                                    <Text style={styles.valueBold}>
                                        ₹{(
                                            parseFloat(computeSubtotal()) -
                                            parseFloat(discount || 0)
                                        ).toFixed(2)}
                                    </Text>
                                </View>

                            </View>


                            {/* Notes + Attach file inline */}
                            <View style={styles.notesAttachRow}>
                                <View style={styles.notesCol}>
                                    <Text style={inputStyles.label}>Notes</Text>
                                    <TextInput style={styles.noteBox} multiline numberOfLines={4} value={notes} onChangeText={setNotes} placeholder="Add any remarks..." placeholderTextColor={COLORS.textLight} />
                                </View>
                                <View style={styles.attachCol}>
                                    <Text style={inputStyles.label}>Attach file</Text>
                                    <View style={[inputStyles.box, { justifyContent: 'space-between' }, styles.fileInputBox]}>
                                        <TextInput
                                            style={[inputStyles.input, { fontSize: rf(4.2) }]}
                                            placeholder="Attach file"
                                            placeholderTextColor="#9ca3af"
                                            value={file?.name || ''}
                                            editable={false}
                                        />
                                        {file ? (
                                            <TouchableOpacity activeOpacity={0.85} onPress={removeFile}>
                                                <Icon name="close" size={rf(3.6)} color="#ef4444" style={{ marginRight: SPACING.sm }} />
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity activeOpacity={0.8} style={[styles.uploadButton]} onPress={pickFile}>
                                                <Icon name="cloud-upload" size={rf(4)} color="#fff" />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={styles.uploadHint}>Allowed: PDF, PNG, JPG • Max size 10 MB</Text>
                                </View>
                            </View>

                        </View>
                    </AccordionSection>


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
                    <View style={[formStyles.actionsRow, { justifyContent: 'space-between', paddingHorizontal: wp(3.5), paddingVertical: hp(1) }]}>
                        <TouchableOpacity activeOpacity={0.85} style={[formStyles.primaryBtn, { paddingVertical: hp(1.4) }]} onPress={handleCreateOrder} disabled={false}>
                            <Text style={formStyles.primaryBtnText}>
                                Save & Send
                                {/* {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save & Send')} */}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.85} style={formStyles.cancelBtn} onPress={onCancel} >
                            <Text style={formStyles.cancelBtnText} >Cancel</Text>
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

export default ManagePurchaseOrder;

const styles = StyleSheet.create({
    container: {
        padding: wp(3.5),
        paddingBottom: hp(6),
        backgroundColor: '#fff'
    },
    line: {
        borderBottomColor: COLORS.border,
        borderBottomWidth: hp(0.2),
        // marginVertical: hp(0.7),
    },
    headerSeparator: {
        height: 1,
        // backgroundColor: COLORS.border,
        width: '100%'
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
        justifyContent: 'space-between'
    },
    col: {
        width: '48%'
    },
    colFull: {
        width: '100%'
    },
    checkboxCol: {
        justifyContent: 'center'
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    checkboxBox: {
        width: wp(6),
        height: wp(6),
        borderRadius: wp(1.2),
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center'
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
        color: COLORS.text
    },
    itemWrapper: {
        marginTop: hp(1.2)
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1)
    },
    amountBox: {
        width: wp(18),
        alignItems: 'flex-end'
    },
    noteBox: {
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(2.5),
        padding: wp(3),
        backgroundColor: '#fff',
        marginTop: hp(1)
    },
    centerButtonContainer: {
        alignItems: 'center',
        marginVertical: hp(1),
        backgroundColor: '#fff'
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    linkText: {
        color: COLORS.primary,
        marginLeft: wp(2),
        fontFamily: TYPOGRAPHY.fontFamilyRegular
    },
    summaryLabel: {
        fontSize: rf(3.2),
        color: COLORS.textMuted,
        marginBottom: hp(1)
    },
    previewBox: {
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(2.5),
        padding: wp(3),
        backgroundColor: COLORS.bg
    },
    previewText: {
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
        marginBottom: hp(0.6)
    },
    itemCard: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: wp(1.2),
        padding: wp(3),
        marginBottom: hp(1.2),
        backgroundColor: '#fff'
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
        textAlignVertical: 'top'
    },
    /* removed duplicate red deleteBtn to avoid extra spacing; keep the final deleteBtn style below */
    primaryButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: hp(1.6),
        borderRadius: wp(2.5),
        marginTop: hp(1.6),
        alignItems: 'center'
    },
    primaryButtonText: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontSize: rf(3.6)
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
        backgroundColor: "#f3f3f3",       // light muted background
        padding: wp(3),
        marginTop: hp(0.8),
        borderBottomLeftRadius: wp(3),    // round bottom-left
        borderBottomRightRadius: wp(1),   // slight curve
        borderWidth: 1,
        borderColor: "#ddd",
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
        backgroundColor: "#fff",
        borderWidth: 1,
        borderColor: "#ccc",
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
        width: '55%'
    },
    totalsRight: {
        width: '45%',
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    totalsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: hp(0.6)
    },
    totalsRowSmall: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        width: '100%',
        marginBottom: hp(0.3)
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
        marginRight: wp(2)
    },
    totalsDivider: {
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        width: '100%',
        marginVertical: hp(0.8)
    },
    totalsRowTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%'
    },
    totalsLabelBold: {
        fontSize: rf(3.4),
        fontWeight: '700',
        color: COLORS.text
    },
    totalsValueBold: {
        fontSize: rf(3.4),
        fontWeight: '700',
        color: COLORS.text
    },
    smallNumericInput: {
        width: wp(24),
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(1.2),
        paddingHorizontal: wp(2),
        height: hp(5),
        backgroundColor: '#fff'
    },
    notesAttachRow: {

        flexDirection: 'column',
        marginTop: hp(1.2),
        alignItems: 'flex-start'
    },
    notesCol: {
        width: wp(90.5),
        flex: 1,
        paddingRight: wp(2)
    },
    attachCol: {
        width: wp(88.5),
        flex: 1,
        alignItems: 'flex-start'
    },
    attachBox: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    chooseFileBtn: {
        backgroundColor: COLORS.bg,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: wp(3),
        paddingVertical: hp(1),
        borderRadius: wp(1)
    },
    chooseFileText: {
        color: COLORS.text
    },
    fileNameBox: {
        marginLeft: wp(2),
        paddingHorizontal: wp(2),
        paddingVertical: hp(1.5),
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: wp(1),
        width: wp(60),
        justifyContent: 'center'
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
    table: { minWidth: wp(180) },

    /* ── COMMON ── */
    thead: { backgroundColor: '#f1f1f1' },
    tr: { flexDirection: 'row' },

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

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        alignItems: 'center',
    },

    rowInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
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
        width: '35%',
        alignItems: 'flex-start',
    },

    inputBox: {
        width: 80,
        height: 36,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        paddingHorizontal: 10,
        backgroundColor: '#fff',
    },

    divider: {
        height: 1,
        backgroundColor: '#ddd',
        marginVertical: 12,
    },

});
