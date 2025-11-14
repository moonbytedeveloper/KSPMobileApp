import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { wp, hp, rf } from '../../utils/responsive';
import Dropdown from '../../components/common/Dropdown';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, TYPOGRAPHY, inputStyles } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import { useNavigation } from '@react-navigation/native';
import { formStyles } from '../styles/styles';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
const AccordionSection = ({ id, title, expanded, onToggle, children }) => {

    return (
        <View style={styles.sectionWrapper}>
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

const AccountsScreen = () => {
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

    // Form state
    const [headerForm, setHeaderForm] = useState({ companyName: '', opportunityTitle: '', clientName: '', phone: '', email: '' });
    const [billingForm, setBillingForm] = useState({ buildingNo: '', street1: '', street2: '', postalCode: '', country: '', state: '', city: '' });
    const [shippingForm, setShippingForm] = useState({ buildingNo: '', street1: '', street2: '', postalCode: '', country: '', state: '', city: '' });
    const [isShippingSame, setIsShippingSame] = useState(false);
    const [items, setItems] = useState([{ id: 1, details: '', qty: '1', rate: '0', tax: 'IGST', amount: '0.00' }]);
    const [invoiceDate, setInvoiceDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [openDatePicker, setOpenDatePicker] = useState(false);
    const [datePickerField, setDatePickerField] = useState(null); // 'invoice' | 'due'
    const [datePickerSelectedDate, setDatePickerSelectedDate] = useState(new Date());
    const [paymentTerm, setPaymentTerm] = useState(paymentTerms[0]);
    const [notes, setNotes] = useState('');

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

    const addItem = () => {
        setItems((prev) => [...prev, { id: prev.length + 1, details: '', qty: '1', rate: '0', tax: 'IGST', amount: '0.00' }]);
    };

    const handleCreateOrder = () => {
        const payload = { header: headerForm, billing: billingForm, shipping: shippingForm, items, invoiceDate, dueDate, paymentTerm, notes };
        console.log('Create Order payload:', payload);
        Alert.alert('Create Order', 'Order payload logged to console');
    };
    const onCancel = () => {

    };

    return (
        <>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <AppHeader
                    title="Account"
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
                                <Text style={[inputStyles.label, { fontWeight: '600' }]}>Sales Inquiry No.</Text>
                                <Dropdown
                                    placeholder="-Select-"
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
                                <Text style={inputStyles.label}>Customer Name*</Text>
                                <Dropdown
                                    placeholder="-select-"
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
                                <Text style={[inputStyles.label, { marginBottom: hp(1.5) }]}>Sales Order Number*</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} value={headerForm.clientName} onChangeText={(v) => setHeaderForm((s) => ({ ...s, clientName: v }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={[inputStyles.label, { marginBottom: hp(1.5) }]}>Project Name*</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput style={[inputStyles.input]} keyboardType="phone-pad" maxLength={10} value={headerForm.phone} onChangeText={(v) => setHeaderForm((s) => ({ ...s, phone: v.replace(/\D/g, '') }))} placeholder="eg." placeholderTextColor={COLORS.textLight} />
                                </View>
                            </View>
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Payment Term*</Text>
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
                                <Text style={inputStyles.label}>Payment Method*</Text>
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
                                <Text style={inputStyles.label}>Order Date*</Text>
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
                    <AccordionSection id={4} title="Create Order" expanded={expandedId === 4} onToggle={toggleSection}>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Invoice Date</Text>
                                <TouchableOpacity activeOpacity={0.7} onPress={() => openDatePickerFor('invoice')} style={{ marginTop: hp(0.8) }}>
                                    <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                        <Text style={[
                                            inputStyles.input,
                                            styles.datePickerText,
                                            !invoiceDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                            invoiceDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                        ]}>
                                            {invoiceDate || 'Invoice Date*'}
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
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Due Date</Text>
                                <TouchableOpacity activeOpacity={0.7} onPress={() => openDatePickerFor('due')} style={{ marginTop: hp(0.8) }}>
                                    <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                        <Text style={[
                                            inputStyles.input,
                                            styles.datePickerText,
                                            !dueDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                            dueDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                        ]}>
                                            {dueDate || 'Due Date*'}
                                        </Text>
                                        <View style={[
                                            styles.calendarIconContainer,
                                            dueDate && styles.calendarIconContainerSelected
                                        ]}>
                                            <Icon
                                                name="calendar-today"
                                                size={rf(3.2)}
                                                color={dueDate ? COLORS.primary : COLORS.textLight}
                                            />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Payment Terms</Text>
                                <Dropdown placeholder="Payment Terms" value={paymentTerm} options={paymentTerms} getLabel={(p) => p} getKey={(p) => p} onSelect={setPaymentTerm} style={{ marginBottom: hp(1.6) }} />
                            </View>
                            <View style={styles.col} />
                        </View>

                        <View style={styles.itemWrapper}>
                            <Text style={[styles.sectionTitle, { marginBottom: hp(1) }]}>Item Details</Text>
                            <View style={[styles.itemRow, { borderTopWidth: 1, borderColor: COLORS.border }]}>
                                <View style={[inputStyles.box, { flex: 1 }]}>
                                    <TextInput style={[inputStyles.input]} placeholder="Type or click to select an item" value={items[0]?.details} onChangeText={(v) => setItems((prev) => { const copy = [...prev]; copy[0].details = v; return copy; })} placeholderTextColor={COLORS.textLight} />
                                </View>
                                <View style={[inputStyles.box, styles.smallInput]}>
                                    <TextInput style={[inputStyles.input, { textAlign: 'right' }]} keyboardType="numeric" value={items[0]?.qty} onChangeText={(v) => setItems((prev) => { const copy = [...prev]; copy[0].qty = v; return copy; })} />
                                </View>
                                <View style={[inputStyles.box, styles.smallInput]}>
                                    <TextInput style={[inputStyles.input, { textAlign: 'right' }]} keyboardType="numeric" value={items[0]?.rate} onChangeText={(v) => setItems((prev) => { const copy = [...prev]; copy[0].rate = v; return copy; })} />
                                </View>
                                <Dropdown placeholder="Tax" value={items[0]?.tax} options={taxOptions} getLabel={(t) => t} getKey={(t) => t} onSelect={(t) => setItems((prev) => { const copy = [...prev]; copy[0].tax = t; return copy; })} inputBoxStyle={[inputStyles.box, { width: wp(20) }]} />
                                <View style={[styles.amountBox]}>
                                    <Text style={styles.previewText}>0.00</Text>
                                </View>
                            </View>
                            <TouchableOpacity style={[styles.linkButton]} onPress={addItem}>
                                <Text style={{ color: COLORS.primary }}>+ Add Item</Text>
                            </TouchableOpacity>
                        </View>
                    </AccordionSection>

                    {/* Section 5: Notes (full width) */}
                    <AccordionSection id={5} title="Notes" expanded={expandedId === 5} onToggle={toggleSection}>
                        <Text style={inputStyles.label}>Notes</Text>
                        <TextInput style={styles.noteBox} multiline numberOfLines={4} value={notes} onChangeText={setNotes} placeholder="Add any remarks..." placeholderTextColor={COLORS.textLight} />
                    </AccordionSection>

                </ScrollView>
                <DatePickerBottomSheet
                    isVisible={openDatePicker}
                    onClose={closeDatePicker}
                    selectedDate={datePickerSelectedDate}
                    onDateSelect={handleDateSelect}
                    title="Select Date"
                />

                <View style={styles.footerBar}>
                    <View style={formStyles.actionsRow}>
                        <TouchableOpacity activeOpacity={0.85} style={[formStyles.primaryBtn, { paddingVertical: hp(1.4) }]} onPress={handleCreateOrder} disabled={false}>
                            <Text style={formStyles.primaryBtnText}>
                                Save & Send
                                {/* {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save & Send')} */}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity activeOpacity={0.85} style={formStyles.cancelBtn} onPress={onCancel}>
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

export default AccountsScreen;

const styles = StyleSheet.create({
    container: {
        padding: wp(4),
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
        // backgroundColor: '#fff'
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
    input: {
        borderWidth: 0.8,
        borderColor: COLORS.border,
        borderRadius: wp(2.5),
        paddingHorizontal: wp(3.2),
        height: hp(5.2),
        marginTop: hp(0.8),
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
        color: COLORS.text
    },
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
        marginTop: hp(1.4)
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
    }
});