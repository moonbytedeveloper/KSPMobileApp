import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import Dropdown from '../../components/common/Dropdown';
import { wp, hp, rf } from '../../utils/responsive';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, text, inputStyles, layout, formStyles } from '../styles/styles';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { saveManageLeadOpportunity, updateManageLeadOpportunity, getCountries, getStates, getCities, getEmployees } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';

const Input = ({ label, required, multiline, value, onChangeText, rightAccessory, style, inputBoxStyle, keyboardType = 'default', }) => {
  return (
    <View style={[inputStyles.container, style]}>
      <View style={[inputStyles.box, styles.innerFieldBox, inputBoxStyle]}>
        <TextInput
          style={[
            inputStyles.input,
            styles.leadInputText,
            multiline && { textAlignVertical: 'top' }
          ]}
          placeholder={label + (required ? '*' : '')}
          placeholderTextColor={COLORS.textLight}
          multiline={multiline}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
        />
        {rightAccessory}
      </View>
    </View>
  );
};
const LeadForm = ({ route, navigation, onSubmit, onCancel }) => {
  const {
    initialLead,
    initialLeadUuid,
    initialLeadName,
    initialLeadOwner,
    initialLeadStatus,
    initialLeadNextAction,
    initialLeadActionDueDate,
    initialLeadCompanyName,
    initialLeadClientName,
    initialLeadPhone,
    initialLeadEmail,
    initialLeadBrief,
    initialLeadAddress,
    address,
    country,
    state,
    city,
    countryUuid,
    stateUuid,
    cityUuid,
    initialLeadOpportunityTitle,
    initialLeadOpportunityOwner,
    initialLeadOpportunityStatus,
    initialLeadOpportunityNextAction,
    initialLeadOpportunityActionDueDate,
    isEditMode = false, // Parameter to determine if we're editing existing lead
  } = route.params || {}; // 👈 important


  const [form, setForm] = useState({
    companyName: initialLeadCompanyName || '',
    opportunityTitle: initialLeadOpportunityTitle || '',
    clientName: initialLeadClientName || '',
    phone: initialLeadPhone || '',
    email: initialLeadEmail || '',
    brief: initialLeadBrief || '',
    nextAction: initialLeadNextAction || '',
    actionDueDate: initialLeadActionDueDate || '',
    ownerFromKsp: initialLeadOwner || '',
    address: address || '',
    country: country || '',
    state: state || '',
    city: city || '',
  });


  const update = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedOwner, setSelectedOwner] = useState(null);
  const [openActionDate, setOpenActionDate] = useState(false);
  const [actionDateValue, setActionDateValue] = useState(new Date());

  // Dropdown data states
  const [countries, setCountries] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  // Accordion open states
  const [openSection1, setOpenSection1] = useState(true);
  const [openSection2, setOpenSection2] = useState(false);
  const [openSection3, setOpenSection3] = useState(false);

  // Employees for Opportunity Owner dropdown
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);


  const handleSelectProject = (project) => {
    setSelectedProject(project);
  };

  const formatUiDate = (date) => {
    const d = new Date(date);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dd = String(d.getDate()).padStart(2, '0');
    const mmm = months[d.getMonth()];
    const yyyy = String(d.getFullYear());
    return `${dd}-${mmm}-${yyyy}`;
  };

  const formatDateForAPI = (date) => {
    // Return in dd-MMM-yyyy format, e.g., 01-Feb-2025
    return formatUiDate(date);
  };

  // Load countries on component mount
  const loadCountries = async () => {
    try {
      setLoadingCountries(true);
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const response = await getCountries({ cmpUuid, envUuid });
      if (response?.Data) {
        setCountries(response.Data);
      }
    } catch (error) {
      console.error('Error loading countries:', error);
    } finally {
      setLoadingCountries(false);
    }
  };

  // Load employees for owner dropdown
  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const response = await getEmployees({ cmpUuid, envUuid });
      const list = Array.isArray(response?.Data) ? response.Data : [];
      setEmployees(list);
    } catch (error) {
      console.error('Error loading employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Load states when country is selected
  const loadStates = async (countryUuid) => {
    try {
      setLoadingStates(true);
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const response = await getStates({ cmpUuid, countryUuid, envUuid });
      if (response?.Data) {
        setStates(response.Data);
      }
    } catch (error) {
      console.error('Error loading states:', error);
    } finally {
      setLoadingStates(false);
    }
  };

  // Load cities when state is selected
  const loadCities = async (stateUuid) => {
    try {
      setLoadingCities(true);
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const response = await getCities({ stateUuid, cmpUuid, envUuid });
      if (response?.Data) {
        setCities(response.Data);
      }
    } catch (error) {
      console.error('Error loading cities:', error);
    } finally {
      setLoadingCities(false);
    }
  };

  // Handle country selection
  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
    setSelectedState(null);
    setSelectedCity(null);
    setStates([]);
    setCities([]);
    if (country?.Uuid) {
      loadStates(country.Uuid);
    }
  };

  // Handle state selection
  const handleStateSelect = (state) => {
    setSelectedState(state);
    setSelectedCity(null);
    setCities([]);
    if (state?.Uuid) {
      loadCities(state.Uuid);
    }
  };

  // Handle city selection
  const handleCitySelect = (city) => {
    setSelectedCity(city);
  };
  // Prefill dropdowns (Country, State, City) - using names only
  React.useEffect(() => {

    if (country) {
      setSelectedCountry({
        CountryName: country,
        Uuid: '', // Will be filled when we find the matching country in the list
      });
    }
    if (state) {
      setSelectedState({
        StateName: state,
        Uuid: '', // Will be filled when we find the matching state in the list
      });
    }
    if (city) {
      setSelectedCity({
        CityName: city,
        Uuid: '', // Will be filled when we find the matching city in the list
      });
    }
  }, [country, state, city]);

  // Prefill Opportunity Owner when in edit mode
  React.useEffect(() => {
    if (initialLeadOwner && employees.length > 0) {
      const foundOwner = employees.find(emp =>
        emp?.EmployeeName === initialLeadOwner ||
        emp?.Name === initialLeadOwner ||
        emp?.DisplayName === initialLeadOwner ||
        emp?.FullName === initialLeadOwner
      );
      if (foundOwner) {
        setSelectedOwner(foundOwner);
        setForm(prev => ({ ...prev, ownerFromKsp: foundOwner?.EmployeeName || foundOwner?.Name || foundOwner?.DisplayName || foundOwner?.FullName || initialLeadOwner }));
      }
    }
  }, [initialLeadOwner, employees]);

  // Load master data
  React.useEffect(() => {
    loadCountries();
    loadEmployees();
  }, []);

  // Match pre-filled country with loaded countries list
  React.useEffect(() => {
    if (countries.length > 0 && country && selectedCountry?.CountryName === country && !selectedCountry?.Uuid) {
      const foundCountry = countries.find(c =>
        c.CountryName === country ||
        c.CountryName?.toLowerCase() === country?.toLowerCase()
      );
      if (foundCountry) {
        setSelectedCountry(foundCountry);

        // If we have state data, load states for this country
        if (state && foundCountry.Uuid) {
          loadStates(foundCountry.Uuid);
        }
      }
    }
  }, [countries, country, selectedCountry]);

  // Match pre-filled state with loaded states list
  React.useEffect(() => {
    if (states.length > 0 && state && selectedState?.StateName === state && !selectedState?.Uuid) {
      const foundState = states.find(s =>
        s.StateName === state ||
        s.StateName?.toLowerCase() === state?.toLowerCase()
      );
      if (foundState) {
        setSelectedState(foundState);

        // If we have city data, load cities for this state
        if (city && foundState.Uuid) {
          loadCities(foundState.Uuid);
        }
      }
    }
  }, [states, state, selectedState]);

  // Match pre-filled city with loaded cities list
  React.useEffect(() => {
    if (cities.length > 0 && city && selectedCity?.CityName === city && !selectedCity?.Uuid) {
      const foundCity = cities.find(c =>
        c.CityName === city ||
        c.CityName?.toLowerCase() === city?.toLowerCase()
      );
      if (foundCity) {
        setSelectedCity(foundCity);
      }
    }
  }, [cities, city, selectedCity]);

  const openDatePicker = () => setOpenActionDate(true);

  const closeDatePicker = () => setOpenActionDate(false);

  const handleDateSelect = (date) => {
    setActionDateValue(date);
    update('actionDueDate')(formatUiDate(date));
    closeDatePicker();
  };
  const ValidationSchema = Yup.object().shape({
    companyName: Yup.string().trim().required('Company Name is required'),
    opportunityTitle: Yup.string().trim().required('Opportunity Title is required'),
    clientName: Yup.string().trim().required('Client Name is required'),

    // Optional fields but validated if touched or filled
    phone: Yup.string()
      .trim().min(10, 'Phone number must be 10 digits only').max(12, 'Phone number must be 12 digits only')
      .matches(/^[0-9]{0,12}$/, 'Phone number must be digits only and max 12 digits'),
    email: Yup.string()
      .trim()
      .email('Enter a valid email')
      .nullable(),

    brief: Yup.string().trim().required('Opportunity Brief is required'),
    nextAction: Yup.string().trim().required('Next Action is required'),
    actionDueDate: Yup.string().trim().required('Action Due Date is required'),
    ownerFromKsp: Yup.string().trim().required('Owner From KSP is required'),
    address: Yup.string().trim().nullable(),
    country: Yup.string().trim().required('Country is required'),
    state: Yup.string().trim().required('State is required'),
    city: Yup.string().trim().required('City is required'),
  });


  return (
    <Formik
      initialValues={form}
      validationSchema={ValidationSchema}
      onSubmit={async (values, { setSubmitting, setStatus, setFieldTouched }) => {
        try {
          setStatus(undefined);

          // Validate dropdown selections
          if (!selectedCountry) {
            setFieldTouched('country', true);
            setStatus({ apiError: 'Please select a country' });
            // open address accordion so user sees the error
            setOpenSection1(false);
            setOpenSection2(false);
            setOpenSection3(true);
            return;
          }
          if (!selectedState) {
            setFieldTouched('state', true);
            setStatus({ apiError: 'Please select a state' });
            setOpenSection1(false);
            setOpenSection2(false);
            setOpenSection3(true);
            return;
          }
          if (!selectedCity) {
            setFieldTouched('city', true);
            setStatus({ apiError: 'Please select a city' });
            setOpenSection1(false);
            setOpenSection2(false);
            setOpenSection3(true);
            return;
          }

          const payload = {
            NextAction: values.nextAction,
            Opportunity_Tittle: values.opportunityTitle,
            OpportunityOwnerFromKSP: selectedOwner?.Uuid || selectedOwner?.UUID || selectedOwner?.EmployeeUUID || selectedOwner?.EmpUuid || '',
            Address: values.address,
            City_UUID: selectedCity?.Uuid || selectedCity?.UUID || '',
            Country_UUID: selectedCountry?.Uuid || selectedCountry?.UUID || '',
            State_UUID: selectedState?.Uuid || selectedState?.UUID || '',
            CompanyName: values.companyName,
            ActionDueDate: formatDateForAPI(actionDateValue),
            PhoneNumber: values.phone,
            ClientName: values.clientName,
            Email: values.email,
            OpportunityBrief: values.brief,
          };

          // Add uuid to payload if in edit mode
          if (isEditMode && initialLeadUuid) {
            payload.uuid = initialLeadUuid;
          }

          const [userUuid, cmpUuid, envUuid] = await Promise.all([
            getUUID(),
            getCMPUUID(),
            getENVUUID(),
          ]);

          let resp;
          if (isEditMode) {
            resp = await updateManageLeadOpportunity(payload, { userUuid, cmpUuid, envUuid });
          } else {
            resp = await saveManageLeadOpportunity(payload, { userUuid, cmpUuid, envUuid });
          }

          // Call onSubmit with success flag to trigger page refresh
          onSubmit && onSubmit(values, resp, true); // true indicates success
        } catch (e) {
          const errorMessage = isEditMode ? 'Failed to update lead' : 'Failed to save lead';
          setStatus({ apiError: e?.response?.data?.Message || e?.message || errorMessage });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ values, errors, touched, setFieldValue, setFieldTouched, setStatus, validateForm, handleSubmit, status, isSubmitting }) => {
        // onSave wrapper to validate entire form and show global error / open first error accordion
        const onSave = async () => {
          const formErrors = await validateForm();

          if (Object.keys(formErrors).length > 0) {
            // set touched for fields so inline errors show
            Object.keys(formErrors).forEach((key) => {
              try {
                setFieldTouched(key, true, false);
              } catch (e) {
                // ignore if field not registered
              }
            });

            // set global message
            setStatus && setStatus({ apiError: '⚠️ Please fix the highlighted errors before submitting the form.' });

            // open first accordion that has an error
            const firstErrorKey = Object.keys(formErrors)[0];
            const section1Keys = ['companyName', 'opportunityTitle', 'clientName'];
            const section2Keys = ['brief', 'nextAction', 'actionDueDate', 'ownerFromKsp'];
            const section3Keys = ['address', 'country', 'state', 'city'];

            if (section1Keys.includes(firstErrorKey)) {
              setOpenSection1(true);
              setOpenSection2(false);
              setOpenSection3(false);
            } else if (section2Keys.includes(firstErrorKey)) {
              setOpenSection1(false);
              setOpenSection2(true);
              setOpenSection3(false);
            } else if (section3Keys.includes(firstErrorKey)) {
              setOpenSection1(false);
              setOpenSection2(false);
              setOpenSection3(true);
            } else {
              // default: open first section
              setOpenSection1(true);
              setOpenSection2(false);
              setOpenSection3(false);
            }

            return;
          }

          // no validation errors -> clear global status and proceed to submit
          setStatus && setStatus(undefined);
          handleSubmit(); // calls Formik onSubmit
        };

        return (
          <View style={styles.screen}>
            <ScrollView contentContainerStyle={[formStyles.container, { paddingBottom: hp(10) }]} showsVerticalScrollIndicator={false}>

              {/* Section 1: Basic Details */}
              <TouchableOpacity
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
              </TouchableOpacity>
              {openSection1 && (
                <View style={styles.sectionBody}>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Input label="Company Name" required style={formStyles.input} inputBoxStyle={(touched.companyName && errors.companyName) ? styles.inputError : null} value={values.companyName} onChangeText={(v) => { setStatus && setStatus(undefined); setFieldValue('companyName', v); }} />
                      {touched.companyName && errors.companyName && (
                        <Text style={styles.fieldError}>{errors.companyName}</Text>
                      )}
                    </View>
                    <View style={styles.col}>
                      <Input label="Opportunity Title" required style={formStyles.input} inputBoxStyle={(touched.opportunityTitle && errors.opportunityTitle) ? styles.inputError : null} value={values.opportunityTitle} onChangeText={(v) => { setStatus && setStatus(undefined); setFieldValue('opportunityTitle', v); }} />
                      {touched.opportunityTitle && errors.opportunityTitle && (
                        <Text style={styles.fieldError}>{errors.opportunityTitle}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Input label="Client name" required style={formStyles.input} inputBoxStyle={(touched.clientName && errors.clientName) ? styles.inputError : null} value={values.clientName} onChangeText={(v) => { setStatus && setStatus(undefined); setFieldValue('clientName', v); }} />
                      {touched.clientName && errors.clientName && (
                        <Text style={styles.fieldError}>{errors.clientName}</Text>
                      )}
                    </View>
                    <View style={styles.col}>
                      <Input keyboardType="phone-pad" maxLength={10} label="Phone Number" style={formStyles.input} value={values.phone} onChangeText={(v) => {
                        const numeric = v.replace(/\D/g, ''); // only digits
                        if (numeric.length <= 10){ setFieldValue('phone', numeric);}
                      
                      }} />
                      {touched.phone && errors.phone && (
                        <Text style={styles.fieldError}>{errors.phone}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.colFull}>
                      <Input label="Email" style={formStyles.input} value={values.email} onChangeText={(v) => { setStatus && setStatus(undefined); setFieldValue('email', v); }} />
                      {touched.email && errors.email && (
                        <Text style={styles.fieldError}>{errors.email}</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Section 2: Opportunity Details */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.sectionHeader}
                onPress={async () => {
                  const section1Required = ['companyName', 'opportunityTitle', 'clientName'];
                  const formErrors = await validateForm();
                  const missingOrInvalid = section1Required.filter((key) => !values[key] || formErrors[key]);
                  if (missingOrInvalid.length > 0) {
                    section1Required.forEach((key) => setFieldTouched(key, true, false));
                    setStatus && setStatus({ apiError: 'Please complete Basic Details first!' });
                    setOpenSection1(true);
                    setOpenSection2(false);
                    setOpenSection3(false);
                    return;
                  }
                  setStatus && setStatus(undefined);
                  setOpenSection1(false);
                  setOpenSection2(true);
                  setOpenSection3(false);
                }}
              >
                <Text style={styles.sectionHeaderText}>Opportunity Details</Text>
                <Icon name={openSection2 ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.text} />
              </TouchableOpacity>
              {openSection2 && (
                <View style={styles.sectionBody}>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Input label="Opportunity Brief" required style={formStyles.input} inputBoxStyle={(touched.brief && errors.brief) ? styles.inputError : null} value={values.brief} onChangeText={(v) => { setStatus && setStatus(undefined); setFieldValue('brief', v); }} />
                      {touched.brief && errors.brief && (
                        <Text style={styles.fieldError}>{errors.brief}</Text>
                      )}
                    </View>
                    <View style={styles.col}>
                      <Input label="Next Action" required style={formStyles.input} inputBoxStyle={(touched.nextAction && errors.nextAction) ? styles.inputError : null} value={values.nextAction} onChangeText={(v) => { setStatus && setStatus(undefined); setFieldValue('nextAction', v); }} />
                      {touched.nextAction && errors.nextAction && (
                        <Text style={styles.fieldError}>{errors.nextAction}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={openDatePicker}
                        style={[styles.datePickerContainer, { marginTop: hp(1) }]}
                      >
                        <View style={[inputStyles.box, { marginBottom: hp(1.6) }, styles.innerFieldBox, styles.datePickerBox, (touched.actionDueDate && errors.actionDueDate) ? styles.inputError : null, { alignItems: 'center' }]}>
                          <Text style={[
                            inputStyles.input,
                            styles.datePickerText,
                            !values.actionDueDate && { color: COLORS.textLight, fontFamily: TYPOGRAPHY.fontFamilyRegular },
                            values.actionDueDate && { color: COLORS.text, fontFamily: TYPOGRAPHY.fontFamilyMedium }
                          ]}>
                            {values.actionDueDate || 'Action Due Date*'}
                          </Text>
                          <View style={[
                            styles.calendarIconContainer,
                            values.actionDueDate && styles.calendarIconContainerSelected
                          ]}>
                            <Icon
                              name="calendar-today"
                              size={rf(3.2)}
                              color={values.actionDueDate ? COLORS.primary : COLORS.textLight}
                            />
                          </View>
                        </View>
                      </TouchableOpacity>
                      {touched.actionDueDate && errors.actionDueDate && (
                        <Text style={styles.fieldError}>{errors.actionDueDate}</Text>
                      )}
                    </View>
                    <View style={styles.col}>
                      <Dropdown
                        placeholder="Opportunity Owner From KSP"
                        value={values.ownerFromKsp}
                        options={employees}
                        getLabel={(emp) => emp?.EmployeeName || emp?.Name || emp?.DisplayName || emp?.FullName || ''}
                        getKey={(emp) => emp?.Uuid || emp?.UUID || emp?.EmployeeUUID || emp?.EmpUuid || emp?.Id || String(emp?.EmployeeName || emp?.Name || emp?.DisplayName || emp?.FullName)}
                        hint="Opportunity Owner From KSP*"
                        onSelect={(emp) => {
                          setStatus && setStatus(undefined);
                          setSelectedOwner(emp);
                          setFieldValue('ownerFromKsp', emp?.EmployeeName || emp?.Name || emp?.DisplayName || emp?.FullName || '');
                        }}
                        textStyle={{ fontSize: rf(3.6), }}
                        inputBoxStyle={{
                          ...inputStyles.box,
                          ...styles.innerFieldBox,
                          ...(touched.ownerFromKsp && errors.ownerFromKsp ? { borderColor: '#ef4444', borderWidth: 1 } : null),
                        }}
                        loading={loadingEmployees}
                        style={{ marginBottom: hp(1.6), zIndex: 1100, elevation: 4 }}
                      />
                      {touched.ownerFromKsp && errors.ownerFromKsp && (
                        <Text style={styles.fieldError}>{errors.ownerFromKsp}</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Section 3: Address & Location */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={styles.sectionHeader}
                onPress={async () => {
                  // Require section 1 + section 2 to be valid before opening section 3
                  const section1Required = ['companyName', 'opportunityTitle', 'clientName'];
                  const section2Required = ['brief', 'nextAction', 'actionDueDate', 'ownerFromKsp'];
                  const formErrors = await validateForm();
                  const s1Missing = section1Required.filter((key) => !values[key] || formErrors[key]);
                  const s2Missing = section2Required.filter((key) => !values[key] || formErrors[key]);
                  if (s1Missing.length > 0) {
                    section1Required.forEach((key) => setFieldTouched(key, true, false));
                    setStatus && setStatus({ apiError: 'Please complete Basic Details first!' });
                    setOpenSection1(true);
                    setOpenSection2(false);
                    setOpenSection3(false);
                    return;
                  }
                  if (s2Missing.length > 0) {
                    section2Required.forEach((key) => setFieldTouched(key, true, false));
                    setStatus && setStatus({ apiError: 'Please complete Opportunity Details first!' });
                    setOpenSection1(false);
                    setOpenSection2(true);
                    setOpenSection3(false);
                    return;
                  }
                  setStatus && setStatus(undefined);
                  setOpenSection1(false);
                  setOpenSection2(false);
                  setOpenSection3(true);
                }}
              >
                <Text style={styles.sectionHeaderText}>Address & Location</Text>
                <Icon name={openSection3 ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.text} />
              </TouchableOpacity>
              {openSection3 && (
                <View style={styles.sectionBody}>
                  <View style={styles.row}>
                    <View style={styles.colFull}>
                      <Input label="Address" style={formStyles.input} value={values.address} onChangeText={(v) => setFieldValue('address', v)} />
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Dropdown
                        placeholder="Select Country"
                        value={selectedCountry?.CountryName || ''}
                        options={countries}
                        getLabel={(country) => country.CountryName}
                        getKey={(country) => country.Uuid}
                        hint="Country*"
                        onSelect={(country) => {
                          setStatus && setStatus(undefined);
                          handleCountrySelect(country);
                          setFieldValue('country', country?.CountryName || '');
                        }}
                        textStyle={{ fontSize: rf(3.6), marginLeft: SPACING.sm }}
                        inputBoxStyle={{
                          ...inputStyles.box,
                          ...styles.innerFieldBox,
                          ...(!selectedCountry && touched.country ? { borderColor: '#ef4444', borderWidth: 1 } : null),
                        }}
                        style={{ marginBottom: hp(1.6) }}
                        loading={loadingCountries}
                      />
                      {touched.country && errors.country && (
                        <Text style={styles.fieldError}>{errors.country}</Text>
                      )}
                    </View>
                    <View style={styles.col}>
                      <Dropdown
                        placeholder="Select State"
                        value={selectedState?.StateName || ''}
                        options={states}
                        getLabel={(state) => state.StateName}
                        getKey={(state) => state.Uuid}
                        hint="State*"
                        onSelect={(state) => {
                          setStatus && setStatus(undefined);
                          handleStateSelect(state);
                          setFieldValue('state', state?.StateName || '');
                        }}
                        textStyle={{ fontSize: rf(3.6), marginLeft: SPACING.sm }}
                        inputBoxStyle={{
                          ...inputStyles.box,
                          ...styles.innerFieldBox,
                          ...(!selectedState && touched.state ? { borderColor: '#ef4444', borderWidth: 1 } : null),
                        }}
                        style={{ marginBottom: hp(1.6) }}
                        loading={loadingStates}
                        disabled={!selectedCountry}
                      />
                      {touched.state && errors.state && (
                        <Text style={styles.fieldError}>{errors.state}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.row}>
                    <View style={styles.col}>
                      <Dropdown
                        placeholder="Select City"
                        value={selectedCity?.CityName || ''}
                        options={cities}
                        getLabel={(city) => city.CityName}
                        getKey={(city) => city.Uuid}
                        hint="City*"
                        onSelect={(city) => {
                          setStatus && setStatus(undefined);
                          handleCitySelect(city);
                          setFieldValue('city', city?.CityName || '');
                        }}
                        textStyle={{ fontSize: rf(3.6), marginLeft: SPACING.sm }}
                        inputBoxStyle={{
                          ...inputStyles.box,
                          ...styles.innerFieldBox,
                          ...(!selectedCity && touched.city ? { borderColor: '#ef4444', borderWidth: 1 } : null),
                        }}
                        style={{ marginBottom: hp(1.6) }}
                        loading={loadingCities}
                        disabled={!selectedState}
                      />
                      {touched.city && errors.city && (
                        <Text style={styles.fieldError}>{errors.city}</Text>
                      )}
                    </View>
                    <View style={styles.col} />
                  </View>
                </View>
              )}

            </ScrollView>

            {/* ---------- GLOBAL ERROR (below accordions) ---------- */}
            {status?.apiError ? (<Text style={styles.globalError}>{status.apiError}</Text>) : null}

            {/* Date Picker Bottom Sheet */}
            <DatePickerBottomSheet
              isVisible={openActionDate}
              onClose={closeDatePicker}
              selectedDate={actionDateValue}
              onDateSelect={(date) => { setActionDateValue(date); setFieldValue('actionDueDate', formatUiDate(date)); closeDatePicker(); }}
              title="Select Date"
              minDate={new Date()}
            />
            <View style={styles.footerBar}>
              <View style={formStyles.actionsRow}>
                <TouchableOpacity activeOpacity={0.85} style={formStyles.primaryBtn} onPress={onSave} disabled={isSubmitting}>
                  <Text style={formStyles.primaryBtnText}>
                    {isSubmitting ? (isEditMode ? 'Updating...' : 'Saving...') : (isEditMode ? 'Update' : 'Save')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.85} style={formStyles.cancelBtn} onPress={onCancel}>
                  <Text style={formStyles.cancelBtnText} >Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      }}
    </Formik>
  );
};

export default LeadForm;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  fieldError: {
    color: '#ef4444',
    fontSize: rf(2.8),
    marginTop: hp(0.2),
    marginLeft: wp(1),
  },

  globalError: {
    color: '#ef4444',
    fontSize: rf(3),
    textAlign: 'center',
    marginVertical: hp(1),
    paddingHorizontal: wp(3),
  },

  // Date Picker Input Styles
  datePickerContainer: {
    // Container for the entire date picker touchable area
  },
  datePickerBox: {
  },
  datePickerText: {
    flex: 1,
    fontSize: rf(3.6),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    marginLeft: SPACING.sm,
  },
  leadInputText: {
    fontSize: rf(3.6),
  },
  calendarIconContainer: {
    padding: SPACING.xs,
    borderRadius: RADIUS.sm,
    marginLeft: SPACING.xs,
  },
  calendarIconContainerSelected: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  innerFieldBox: {
    borderColor: '#e5e7eb',
    borderWidth: 0.8,
    height: hp(5.4),
  },

  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },

  errorAbove: {
    color: '#ef4444',
    marginBottom: hp(0.2),
    textAlign: 'right',
  },

  // Accordion styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.0),
    paddingHorizontal: wp(2),
    marginTop: hp(1.2),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderTopLeftRadius: RADIUS.md,
    borderTopRightRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    zIndex: -1,
    elevation: -1,
  },
  sectionHeaderText: {
    fontSize: rf(4),
    paddingVertical: hp(0.6),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontWeight: '700',
  },
  sectionBody: {
    paddingHorizontal: wp(2),
    paddingTop: hp(1),
    paddingBottom: hp(1.2),
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: RADIUS.md,
    borderBottomRightRadius: RADIUS.md,
    backgroundColor: COLORS.bg,
    marginBottom: hp(1.2),
  },
  row: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(1),
  },
  col: {
    flex: 1,
  },
  colFull: {
    flex: 1,
  },
  footerBar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(2),
    paddingBottom: hp(2.2),
  },
});
