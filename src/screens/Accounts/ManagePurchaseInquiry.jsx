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

const AccordionSection = ({ id, title, expanded, onToggle, children, wrapperStyle }) => {
    return (
        <View style={[styles.sectionWrapper, wrapperStyle]}>
            <TouchableOpacity activeOpacity={0.8} style={styles.sectionHeader} onPress={() => onToggle(id)}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Icon name={expanded ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.text} />
            </TouchableOpacity>
            {expanded && <View style={styles.line} />}
            {expanded && <View style={styles.sectionBody}>{children}</View>}
        </View>
    );
};

const ManagePurchaseInquiry = () => {
    const [expandedId, setExpandedId] = useState(1);
    const navigation = useNavigation();
    const toggleSection = (id) => setExpandedId((prev) => (prev === id ? null : id));

    // Demo options for dropdowns
    const currencyTypes = ['- Select Currency -', 'USD', 'INR', 'EUR', 'GBP'];
    const itemTypes = ['- Select Item -', 'Furniture', 'Electronics', 'Office Supplies', 'Equipment'];
    const itemNames = ['- Select Item -', 'Chair', 'Table', 'Desk', 'Cabinet'];
    const units = ['- Select Unit -', 'Pcs', 'Box', 'Set', 'Unit'];

    // Form state
    const [uuid, setUuid] = useState('0e073e1b-3b3f-4ae2-8f77-5');
    const [currencyType, setCurrencyType] = useState('');
    const [requestTitle, setRequestTitle] = useState('');
    const [requestedDate, setRequestedDate] = useState('');
    const [expectedPurchaseDate, setExpectedPurchaseDate] = useState('');
    
    // Line items state
    const [lineItems, setLineItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        itemType: '',
        itemName: '',
        quantity: '',
        unit: ''
    });

    // Date picker state
    const [openDatePicker, setOpenDatePicker] = useState(false);
    const [datePickerField, setDatePickerField] = useState(null);
    const [datePickerSelectedDate, setDatePickerSelectedDate] = useState(new Date());

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
        if (field === 'requested' && requestedDate) {
            const parsed = new Date(requestedDate);
            if (!isNaN(parsed)) initial = parsed;
        }
        if (field === 'expected' && expectedPurchaseDate) {
            const parsed = new Date(expectedPurchaseDate);
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
        if (datePickerField === 'requested') setRequestedDate(formatted);
        if (datePickerField === 'expected') setExpectedPurchaseDate(formatted);
        setOpenDatePicker(false);
        setDatePickerField(null);
    };

    const handleAddItem = () => {
        if (!currentItem.itemType || !currentItem.itemName || !currentItem.quantity || !currentItem.unit) {
            Alert.alert('Validation', 'Please fill all fields');
            return;
        }

        const newItem = {
            id: lineItems.length + 1,
            itemType: currentItem.itemType,
            itemName: currentItem.itemName,
            quantity: currentItem.quantity,
            unit: currentItem.unit
        };

        setLineItems([...lineItems, newItem]);
        setCurrentItem({
            itemType: '',
            itemName: '',
            quantity: '',
            unit: ''
        });
    };

    const handleEditItem = (id) => {
        const item = lineItems.find(i => i.id === id);
        if (item) {
            setCurrentItem({
                itemType: item.itemType,
                itemName: item.itemName,
                quantity: item.quantity,
                unit: item.unit
            });
            handleDeleteItem(id);
        }
    };

    const handleDeleteItem = (id) => {
        setLineItems(lineItems.filter(item => item.id !== id));
    };

    const handleSubmit = () => {
        const payload = {
            uuid,
            currencyType,
            requestTitle,
            requestedDate,
            expectedPurchaseDate,
            lineItems
        };
        console.log('Submit payload:', payload);
        Alert.alert('Success', 'Purchase Inquiry submitted successfully');
    };

    const handleCancel = () => {
        navigation.goBack();
    };

    return (
        <>
            <View style={{ flex: 1, backgroundColor: '#fff' }}>
                <AppHeader
                    title="Manage Purchase Inquiry"
                    onLeftPress={() => {
                        navigation.goBack();
                    }}
                />
                <View style={styles.headerSeparator} />
                <ScrollView contentContainerStyle={[styles.container]} showsVerticalScrollIndicator={false}>
                    {/* Section 1: HEADER */}
                    <AccordionSection id={1} title="HEADER" expanded={expandedId === 1} onToggle={toggleSection}>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>UUID*</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput
                                        style={[inputStyles.input]}
                                        value={uuid}
                                        onChangeText={setUuid}
                                        placeholder="UUID"
                                        placeholderTextColor={COLORS.textLight}
                                        editable={false}
                                    />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Currency Type*</Text>
                                <View style={{ zIndex: 9999, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="- Select Currency -"
                                        value={currencyType}
                                        options={currencyTypes}
                                        getLabel={(c) => c}
                                        getKey={(c) => c}
                                        onSelect={(v) => setCurrencyType(v)}
                                        renderInModal={true}
                                        inputBoxStyle={inputStyles.box}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Request Title*</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput
                                        style={[inputStyles.input]}
                                        value={requestTitle}
                                        onChangeText={setRequestTitle}
                                        placeholder="eg."
                                        placeholderTextColor={COLORS.textLight}
                                    />
                                </View>
                            </View>
                            <View style={styles.col} />
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5) }]}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Requested Date*</Text>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => openDatePickerFor('requested')}
                                    style={{ marginTop: hp(0.8) }}
                                >
                                    <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                        <Text style={[
                                            inputStyles.input,
                                            styles.datePickerText,
                                            !requestedDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                            requestedDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                        ]}>
                                            {requestedDate || 'mm/dd/yyyy'}
                                        </Text>
                                        <View style={[
                                            styles.calendarIconContainer,
                                            requestedDate && styles.calendarIconContainerSelected
                                        ]}>
                                            <Icon
                                                name="calendar-today"
                                                size={rf(3.2)}
                                                color={requestedDate ? COLORS.primary : COLORS.textLight}
                                            />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Expected Purchase Date*</Text>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => openDatePickerFor('expected')}
                                    style={{ marginTop: hp(0.8) }}
                                >
                                    <View style={[inputStyles.box, styles.innerFieldBox, styles.datePickerBox, { alignItems: 'center' }]}>
                                        <Text style={[
                                            inputStyles.input,
                                            styles.datePickerText,
                                            !expectedPurchaseDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                                            expectedPurchaseDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                                        ]}>
                                            {expectedPurchaseDate || 'mm/dd/yyyy'}
                                        </Text>
                                        <View style={[
                                            styles.calendarIconContainer,
                                            expectedPurchaseDate && styles.calendarIconContainerSelected
                                        ]}>
                                            <Icon
                                                name="calendar-today"
                                                size={rf(3.2)}
                                                color={expectedPurchaseDate ? COLORS.primary : COLORS.textLight}
                                            />
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </AccordionSection>

                    {/* Section 2: LINE */}
                    <AccordionSection id={2} title="LINE" expanded={expandedId === 2} onToggle={toggleSection}>
                        <View style={styles.row}>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Item Type*</Text>
                                <View style={{ zIndex: 9998, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="- Select Item -"
                                        value={currentItem.itemType}
                                        options={itemTypes}
                                        getLabel={(it) => it}
                                        getKey={(it) => it}
                                        onSelect={(v) => setCurrentItem({ ...currentItem, itemType: v })}
                                        renderInModal={true}
                                        inputBoxStyle={inputStyles.box}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>
                            <View style={styles.col}>
                                <Text style={inputStyles.label}>Item Name*</Text>
                                <View style={{ zIndex: 9997, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="- Select Item -"
                                        value={currentItem.itemName}
                                        options={itemNames}
                                        getLabel={(item) => item}
                                        getKey={(item) => item}
                                        onSelect={(v) => setCurrentItem({ ...currentItem, itemName: v })}
                                        renderInModal={true}
                                        inputBoxStyle={inputStyles.box}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={[styles.row, { marginTop: hp(1.5), alignItems: 'flex-end' }]}>
                            <View style={styles.colSmall}>
                                <Text style={inputStyles.label}>Quantity*</Text>
                                <View style={[inputStyles.box]}>
                                    <TextInput
                                        style={[inputStyles.input]}
                                        value={currentItem.quantity}
                                        onChangeText={(v) => setCurrentItem({ ...currentItem, quantity: v })}
                                        placeholder="eg. Auto fill"
                                        placeholderTextColor={COLORS.textLight}
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>
                            <View style={styles.colSmall}>
                                <Text style={inputStyles.label}>Unit*</Text>
                                <View style={{ zIndex: 9996, elevation: 20 }}>
                                    <Dropdown
                                        placeholder="- Select Unit -"
                                        value={currentItem.unit}
                                        options={units}
                                        getLabel={(u) => u}
                                        getKey={(u) => u}
                                        onSelect={(v) => setCurrentItem({ ...currentItem, unit: v })}
                                        renderInModal={true}
                                        inputBoxStyle={inputStyles.box}
                                        textStyle={inputStyles.input}
                                    />
                                </View>
                            </View>
                            <View style={styles.addButtonWrapper}>
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={styles.addButton}
                                    onPress={handleAddItem}
                                >
                                    <Text style={styles.addButtonText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </AccordionSection>

                    {/* Line Items Table */}
                    {lineItems.length > 0 && (
                        <View style={styles.tableContainer}>
                            <View style={styles.tableWrapper}>
                                <View style={styles.table}>
                                    {/* Table Header */}
                                    <View style={styles.thead}>
                                        <View style={styles.tr}>
                                            <Text style={[styles.th, { width: wp(15) }]}>Sr.No</Text>
                                            <Text style={[styles.th, { width: wp(50) }]}>Item</Text>
                                            <Text style={[styles.th, { width: wp(20) }]}>Quantity</Text>
                                            <Text style={[styles.th, { width: wp(25) }]}>Action</Text>
                                        </View>
                                    </View>

                                    {/* Table Body */}
                                    <View style={styles.tbody}>
                                        {lineItems.map((item, index) => (
                                            <View key={item.id} style={styles.tr}>
                                                <View style={[styles.td, { width: wp(15) }]}>
                                                    <Text style={styles.tdText}>{index + 1}</Text>
                                                </View>
                                                <View style={[styles.td, { width: wp(50), alignItems: 'flex-start', paddingLeft: wp(2) }]}>
                                                    <Text style={styles.tdText}>• Item Type: {item.itemType}</Text>
                                                    <Text style={styles.tdText}>• Name: {item.itemName}</Text>
                                                </View>
                                                <View style={[styles.td, { width: wp(20) }]}>
                                                    <Text style={styles.tdText}>{item.quantity}</Text>
                                                </View>
                                                <View style={[styles.tdAction, { width: wp(25) }]}>
                                                    <TouchableOpacity
                                                        style={styles.actionButton}
                                                        onPress={() => handleEditItem(item.id)}
                                                    >
                                                        <Text style={styles.actionButtonText}>Edit</Text>
                                                    </TouchableOpacity>
                                                    <TouchableOpacity
                                                        style={[styles.actionButton, { marginLeft: wp(2) }]}
                                                        onPress={() => handleDeleteItem(item.id)}
                                                    >
                                                        <Text style={styles.actionButtonText}>Delete</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </ScrollView>

                <DatePickerBottomSheet
                    isVisible={openDatePicker}
                    onClose={closeDatePicker}
                    selectedDate={datePickerSelectedDate}
                    onDateSelect={handleDateSelect}
                    title="Select Date"
                />

                <View style={styles.footerBar}>
                    <View style={styles.footerButtonsRow}>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            activeOpacity={0.85}
                            style={styles.submitButton}
                            onPress={handleSubmit}
                        >
                            <Text style={styles.submitButtonText}>Submit</Text>
                        </TouchableOpacity>
                    </View>
                </View>
        </View>
        </>
    );
};

export default ManagePurchaseInquiry;

const styles = StyleSheet.create({
    container: {
        padding: wp(3.5),
        paddingBottom: hp(6),
        backgroundColor: '#fff'
    },
    line: {
        borderBottomColor: COLORS.border,
        borderBottomWidth: hp(0.2),
    },
    headerSeparator: {
        height: 1,
        width: '100%'
    },
    sectionWrapper: {
        marginBottom: hp(1.8),
        borderRadius: wp(2.5),
        overflow: 'visible',
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
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyMedium,
        fontWeight: '700',
    },
    sectionBody: {
        padding: wp(2),
    },
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
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    col: {
        width: '48%'
    },
    colSmall: {
        width: '30%'
    },
    addButtonWrapper: {
        flex: 1,
        alignItems: 'flex-end',
        paddingBottom: hp(0.3),
        paddingLeft: wp(2),
    },
    addButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: hp(1.2),
        paddingHorizontal: wp(6),
        borderRadius: wp(1.5),
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: wp(20),
    },
    addButtonText: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontSize: rf(3.6),
        fontWeight: '600',
    },
    tableContainer: {
        marginTop: hp(2),
        marginBottom: hp(2),
    },
    tableWrapper: {
        borderWidth: 1,
        borderColor: '#CFCFCF',
        borderRadius: wp(1.5),
        overflow: 'hidden',
        backgroundColor: '#fff',
    },
    table: {
        width: '100%',
    },
    thead: {
        backgroundColor: '#f1f1f1',
    },
    tbody: {
        backgroundColor: '#fff',
    },
    tr: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    th: {
        paddingVertical: hp(1.4),
        paddingHorizontal: wp(2),
        textAlign: 'center',
        fontWeight: '700',
        fontSize: wp(3),
        borderRightWidth: 1,
        borderRightColor: '#CFCFCF',
        color: COLORS.text,
    },
    td: {
        paddingVertical: hp(1),
        paddingHorizontal: wp(1),
        justifyContent: 'center',
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#E0E0E0',
    },
    tdAction: {
        paddingVertical: hp(1),
        paddingHorizontal: wp(1),
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        borderRightWidth: 0,
    },
    tdText: {
        fontSize: wp(3),
        color: COLORS.text,
        fontFamily: TYPOGRAPHY.fontFamilyRegular,
    },
    actionButton: {
        backgroundColor: '#6c757d',
        paddingVertical: hp(0.6),
        paddingHorizontal: wp(3),
        borderRadius: wp(1),
    },
    actionButtonText: {
        color: '#fff',
        fontSize: wp(2.8),
        fontWeight: '600',
    },
    footerBar: {
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    footerButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: wp(3.5),
        paddingVertical: hp(1),
        gap: wp(3),
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        paddingVertical: hp(1.4),
        paddingHorizontal: wp(6),
        borderRadius: wp(1.5),
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: wp(25),
    },
    cancelButtonText: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontSize: rf(3.6),
        fontWeight: '600',
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: hp(1.4),
        paddingHorizontal: wp(6),
        borderRadius: wp(1.5),
        alignItems: 'center',
        justifyContent: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontFamily: TYPOGRAPHY.fontFamilyBold,
        fontSize: rf(3.6),
        fontWeight: '600',
    },
});
