import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { TabContext } from '../../navigation/BottomTabs/TabContext';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/common/AppHeader';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import { TYPOGRAPHY, COLORS } from '../styles/styles';

const formatDate = (d) => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const LabeledInput = ({ placeholder, multiline }) => {
  return (
    <View style={[styles.inputWrapper, multiline && styles.inputWrapperMultiline]}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9ca3af"
        style={[styles.input, multiline && styles.inputMultiline]}
        multiline={multiline}
      />
    </View>
  );
};

const Radio = ({ label, selected, onPress }) => {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.radioRow}>
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}> 
        {selected ? <View style={styles.radioInner} /> : null}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

const EditProfileScreen = () => {
  const { setActiveIndex } = useContext(TabContext);
  const [gender, setGender] = useState('Male');
  const navigation = useNavigation();
  const [dobDate, setDobDate] = useState(null);
  const [openDob, setOpenDob] = useState(false);

  return (
    <View style={styles.container}>
      <AppHeader
        title="Edit Profile"
         
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeading}>Basic Information</Text>
        <LabeledInput placeholder="Employee Id*" />
        <LabeledInput placeholder="Full Name" />
        <LabeledInput placeholder="Mobile Number" />
        <LabeledInput placeholder="Email Id" />
        <LabeledInput placeholder="Address" multiline />

        <View style={styles.genderRow}>
          {['Male', 'Female', 'Other'].map(label => (
            <Radio key={label} label={label} selected={gender === label} onPress={() => setGender(label)} />
          ))}
        </View>

        <View style={styles.row2}>
          <View style={[styles.inputWrapper, { flex: 1 }] }>
            <TouchableOpacity activeOpacity={0.85} onPress={() => setOpenDob(true)}>
              <View style={styles.inputRightIconRow}>
                <TextInput
                  placeholder="Date of Birth"
                  placeholderTextColor="#9ca3af"
                  style={[styles.input, { flex: 1 }]}
                  value={formatDate(dobDate)}
                  editable={false}
                  pointerEvents="none"
                />
                <Icon name="calendar-today" size={rf(3.6)} color="#6b7280" />
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ width: wp(3) }} />
          <View style={[styles.inputWrapper, { flex: 1 }] }>
            <TextInput placeholder="Blood Group" placeholderTextColor="#9ca3af" style={styles.input} />
          </View>
        </View>

        <LabeledInput placeholder="Nationality" />

        <Text style={[styles.sectionHeading, { marginTop: hp(2) }]}>Identity Proof</Text>
        <LabeledInput placeholder="Passport No" />
        <LabeledInput placeholder="Aadhar Card No" />
        <LabeledInput placeholder="Pan No" />
        <LabeledInput placeholder="Driving License No" />

        <Text style={[styles.sectionHeading, { marginTop: hp(2) }]}>Bank Information</Text>
        <LabeledInput placeholder="Bank Name" />
        <LabeledInput placeholder="Account No" />
        <LabeledInput placeholder="IFSC Code" />
        <LabeledInput placeholder="Account  Type" />

        <View style={styles.actionsRow}>
          <TouchableOpacity activeOpacity={0.85} style={[styles.btn, styles.btnPrimary]}>
            <Text style={styles.btnPrimaryText}>Submit</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} style={[styles.btn, styles.btnSecondary]} onPress={() => setActiveIndex(3)}>
            <Text style={styles.btnSecondaryText}>Close</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <DatePickerBottomSheet
        isVisible={openDob}
        onClose={() => setOpenDob(false)}
        selectedDate={dobDate || new Date()}
        onDateSelect={(d) => {
          setDobDate(d);
        }}
        title="Select Date of Birth"
      />
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    // paddingTop: safeAreaTop,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(5),
  },
  sectionHeading: {
    fontSize: rf(4.6),
    fontWeight: '700',
    color: '#111827',
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  inputWrapper: {
    borderWidth: 1.2,
    borderColor: '#d1d5db',
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(0),
    height: hp(6.2),
    justifyContent: 'center',
    marginBottom: hp(1.2),
    backgroundColor: '#fff',
  },
  inputWrapperMultiline: {
    paddingVertical: hp(2.2),
    height: 'auto',
  },
  input: {
    fontSize: rf(4.2),
    color: '#111827',
    paddingVertical: 0,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  inputMultiline: {
    minHeight: hp(10),
    textAlignVertical: 'top',
  },
  inputRightIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1.2),
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(4),
  },
  radioOuter: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  radioOuterActive: {
    borderColor: COLORS.primary,
  },
  radioInner: {
    width: wp(2.6),
    height: wp(2.6),
    borderRadius: wp(1.3),
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: rf(3.2),
    color: '#111827',
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(2.5),
  },
  btn: {
    flex: 1,
    paddingVertical: hp(1.8),
    borderRadius: wp(3),
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: COLORS.primary,
    marginRight: wp(3),
  },
  btnSecondary: {
    backgroundColor: '#374151',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: rf(3.4),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  btnSecondaryText: {
    color: '#fff',
    fontSize: rf(3.4),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
}); 