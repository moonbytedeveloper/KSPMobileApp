import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AppHeader from '../../components/common/AppHeader';
import Dropdown from '../../components/common/Dropdown';
import { wp, hp, rf } from '../../utils/responsive';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import SuccessBottomSheet from '../../components/common/SuccessBottomSheet';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import { getEmployees, getAttendance, submitAttendance } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID, getDisplayName } from '../../api/tokenStorage';

const formatDate = (d) => {
  if (!d) return '';
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const HRAAttendance = ({navigation}) => {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [attendanceType, setAttendanceType] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [employeeStatusMap, setEmployeeStatusMap] = useState({}); // name -> 'Present' | 'Absent'
  const [date, setDate] = useState(null);
  const [openDate, setOpenDate] = useState(false);
  const [dateType, setDateType] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('Absent');
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [bulkDate, setBulkDate] = useState(null);
  const [openBulkDate, setOpenBulkDate] = useState(false);
  const [bulkEmployees, setBulkEmployees] = useState([]);
  const [loadingBulkData, setLoadingBulkData] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [isDateTypeOpen, setIsDateTypeOpen] = useState(false);
  const [currentUserInfo, setCurrentUserInfo] = useState({ uuid: null, displayName: null });
  const [showSuccessSheet, setShowSuccessSheet] = useState(false);

  // Sample data for dropdowns
  const attendanceTypeOptions = ['Single', 'Bulk' ];
  const employeeOptions = employees.map(e => e?.EmployeeName || e?.Name || e?.DisplayName || e?.FullName || '');
  const dateTypeOptions = ['Full Day','First Half','Second Half'];

  const loadEmployees = async () => {
    try {
      setLoadingEmployees(true);
      
      // Load current user information
      const [currentUserUuid, currentUserDisplayName] = await Promise.all([
        getUUID(),
        getDisplayName()
      ]);
      
      setCurrentUserInfo({
        uuid: currentUserUuid,
        displayName: currentUserDisplayName
      });
      
      const resp = await getEmployees();
      const list = Array.isArray(resp?.Data) ? resp.Data : [];
      
      // Filter out current user from employees list
      const filteredList = list.filter(emp => {
        const empUuid = emp?.Uuid || emp?.UUID || emp?.EmployeeUUID || emp?.EmpUuid;
        const empName = emp?.EmployeeName || emp?.Name || emp?.DisplayName || emp?.FullName || '';
        
        // Filter by UUID if available, otherwise by name
        if (currentUserUuid && empUuid) {
          return empUuid !== currentUserUuid;
        } else if (currentUserDisplayName && empName) {
          return empName !== currentUserDisplayName;
        }
        
        // If no current user info available, include all employees
        return true;
      });
      
      setEmployees(filteredList);
    } catch (err) {
      console.log('Failed to load employees', err);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  // Load bulk attendance data for selected date
  const loadBulkAttendanceData = async (selectedDate) => {
    try {
      setLoadingBulkData(true);
      const [cmpUuid, envUuid, userUuid] = await Promise.all([
        getCMPUUID(),
        getENVUUID(),
        getUUID(),
      ]);
      
      const dateString = selectedDate.toISOString().split('T')[0];
      const resp = await getAttendance({ 
        cmpUuid, 
        envUuid, 
        userUuid, 
        date: dateString 
      });
      
      const bulkData = Array.isArray(resp?.Data) ? resp.Data : [];
      
      // Filter out current user from bulk employees list
      const filteredBulkData = bulkData.filter(emp => {
        const empUuid = emp?.RawUuid || emp?.Uuid || emp?.UUID;
        const empName = emp?.Employee || '';
        
        // Filter by UUID if available, otherwise by name
        if (currentUserInfo.uuid && empUuid) {
          return empUuid !== currentUserInfo.uuid;
        } else if (currentUserInfo.displayName && empName) {
          return empName !== currentUserInfo.displayName;
        }
        
        // If no current user info available, include all employees
        return true;
      });
      
      setBulkEmployees(filteredBulkData);
      
      // Auto-populate status map from API response
      const statusMap = {};
      filteredBulkData.forEach(emp => {
        if (emp.Employee) {
          // Map Format field to Present/Absent status
          const status = emp.Format === 'Present' ? 'Present' : 
                        emp.Format === 'Absent' ? 'Absent' : 'Unassigned';
          statusMap[emp.Employee] = status;
        }
      });
      setEmployeeStatusMap(statusMap);
      
    } catch (err) {
      console.log('Failed to load bulk attendance data', err);
      setBulkEmployees([]);
    } finally {
      setLoadingBulkData(false);
    }
  };

  React.useEffect(() => {
    loadEmployees();
  }, []);

  const validateForm = () => {
    const errors = {};

    // Validate attendance type
    if (!attendanceType) {
      errors.attendanceType = 'Attendance type is required';
    }

    // Validate based on attendance type
    if (attendanceType === 'Single') {
      if (!selectedEmployee) {
        errors.selectedEmployee = 'Employee selection is required';
      }
      if (!date) {
        errors.date = 'Date is required';
      }
    } else if (attendanceType === 'Bulk') {
      if (!bulkDate) {
        errors.bulkDate = 'Date is required';
      }
      if (bulkEmployees.length === 0) {
        errors.bulkEmployees = 'No employees found for selected date';
      }
    }

    // Validate day type
    if (!dateType) {
      errors.dateType = 'Day type is required';
    }

    // Validate attendance status
    if (!attendanceStatus) {
      errors.attendanceStatus = 'Attendance status is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    // Validate form first
    if (!validateForm()) {
      return;
    }

    try {
      let payload;
      
      if (attendanceType === 'Single') {
        // Single attendance payload
        const selectedEmp = employees.find(emp => 
          (emp?.EmployeeName || emp?.Name || emp?.DisplayName || emp?.FullName) === selectedEmployee
        );
        
        payload = {
          AttendenceType: "1",
          Employee_UUID: selectedEmp?.Uuid || selectedEmp?.UUID,
          Date: date ? new Date(date).toISOString() : new Date().toISOString(),
          DayType: dateType,
          Format: attendanceStatus,
          AttendanceList: [
            {
              Employee_UUID: selectedEmp?.Uuid || selectedEmp?.UUID,
              Date: date ? new Date(date).toISOString() : new Date().toISOString(),
              DayType: dateType,
              Format: attendanceStatus,
            }
          ]
        };
      } else {
        // Bulk attendance payload
        const attendanceList = bulkEmployees.map(emp => ({
          Employee_UUID: emp.RawUuid,
          Date: bulkDate ? new Date(bulkDate).toISOString() : new Date().toISOString(),
          DayType: emp.DayType || dateType,
          Format: employeeStatusMap[emp.Employee] || attendanceStatus,
        }));

        payload = {
          AttendenceType: "2",
          Employee_UUID: "", // Empty for bulk
          Date: bulkDate ? new Date(bulkDate).toISOString() : new Date().toISOString(),
          DayType: dateType,
          Format: attendanceStatus,
          AttendanceList: attendanceList,
        };
      }

      console.log('Attendance payload:', JSON.stringify(payload, null, 2));
      
      const response = await submitAttendance(payload);
      console.log('Attendance submitted successfully:', response);
      
      // Show success bottom sheet
      setShowSuccessSheet(true);
      
      // Reset form after successful submission
      setAttendanceType('');
      setSelectedEmployee('');
      setSelectedEmployees([]);
      setEmployeeStatusMap({});
      setDate(null);
      setBulkDate(null);
      setDateType('');
      setAttendanceStatus('Absent');
      setBulkEmployees([]);
      setValidationErrors({});
      
    } catch (error) {
      console.error('Error submitting attendance:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.Message || 
                          error.response?.data?.message || 
                          error.message || 
                          'Failed to submit attendance. Please try again.';
      
      alert(`Error: ${errorMessage}`);
    }
  };

  const toggleEmployeeSelection = (name) => {
    setSelectedEmployees((prev) => {
      const exists = prev.includes(name);
      if (exists) {
        return prev.filter((n) => n !== name);
      }
      return [...prev, name];
    });
  };

  const handleChangeAttendanceType = (type) => {
    setAttendanceType(type);
    if (type === 'Single') {
      // Move first of multi into single, or reset
      if (selectedEmployees.length > 0) {
        setSelectedEmployee(selectedEmployees[0]);
      }
      setSelectedEmployees([]);
      setEmployeeStatusMap({});
      setBulkEmployees([]);
      setBulkDate(null);
    } else if (type === 'Bulk') {
      // Reset single selection
      setSelectedEmployee('');
      setSelectedEmployees([]);
      setEmployeeStatusMap({});
      setBulkEmployees([]);
      setBulkDate(null);
    }
  };

  const allSelected = selectedEmployees.length === bulkEmployees.length && bulkEmployees.length > 0;
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(bulkEmployees.map(emp => emp.Employee));
    }
  };
  const markSelectedAs = (status) => {
    if (!selectedEmployees.length) return;
    setEmployeeStatusMap((prev) => {
      const next = { ...prev };
      selectedEmployees.forEach((name) => {
        next[name] = status;
      });
      return next;
    });
    setSelectedEmployees([]);
  };

  const handleCancel = () => {
    // Reset form or navigate back
    navigation.goBack();
  };

  const handleSuccessDismiss = () => {
    setShowSuccessSheet(false);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Attendance" 
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[
          styles.formContainer,
          attendanceType === 'Bulk' && isDateTypeOpen && { paddingBottom: 100 }
        ]}>
          
          {/* Attendance Type */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Attendance Type</Text>
            <Dropdown
              placeholder="- Select Attendance Type -"
              value={attendanceType}
              options={attendanceTypeOptions}
              onSelect={(item) => {
                handleChangeAttendanceType(item);
                // Clear validation error when user selects
                if (validationErrors.attendanceType) {
                  setValidationErrors(prev => ({ ...prev, attendanceType: null }));
                }
                setOpenDropdown(null);
              }}
              hideSearch={true}
              inputBoxStyle={validationErrors.attendanceType ? styles.errorBorder : null}
              style={{ zIndex: 2000, elevation: 5 }}
              isOpen={openDropdown === 'attendanceType'}
              onOpenChange={(open) => {
                setOpenDropdown(open ? 'attendanceType' : null);
              }}
            />
          </View>

          {/* Select Employee - Only show for Single type */}
          {attendanceType === 'Single' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Employee</Text>
              <Dropdown
                placeholder="- Select Employee -"
                value={selectedEmployee}
                options={employees}
                getLabel={(e) => e?.EmployeeName || e?.Name || e?.DisplayName || e?.FullName || ''}
                getKey={(e) => e?.Uuid || e?.UUID || e?.EmployeeUUID || e?.EmpUuid || (e?.EmployeeName || e?.Name || e?.DisplayName || e?.FullName || '')}
                onSelect={(emp) => {
                  setSelectedEmployee(emp?.EmployeeName || emp?.Name || emp?.DisplayName || emp?.FullName || '');
                  // Clear validation error when user selects
                  if (validationErrors.selectedEmployee) {
                    setValidationErrors(prev => ({ ...prev, selectedEmployee: null }));
                  }
                  setOpenDropdown(null);
                }}
                loading={loadingEmployees}
                inputBoxStyle={validationErrors.selectedEmployee ? styles.errorBorder : null}
                style={{ zIndex: 1900, elevation: 5 }}
                isOpen={openDropdown === 'employee'}
                onOpenChange={(open) => setOpenDropdown(open ? 'employee' : null)}
              />
            </View>
          )}

          {/* Bulk Date Picker - Only show for Bulk type */}
          {attendanceType === 'Bulk' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Select Date</Text>
              <TouchableOpacity 
                style={[styles.dateInput, validationErrors.bulkDate && styles.errorBorder]} 
                onPress={() => {
                  setOpenBulkDate(true);
                  // Clear validation error when user opens date picker
                  if (validationErrors.bulkDate) {
                    setValidationErrors(prev => ({ ...prev, bulkDate: null }));
                  }
                }}
              >
                <Text style={[styles.dateText, !bulkDate && styles.placeholderText]}>
                  {formatDate(bulkDate) || 'Select Date'}
                </Text>
                <Icon name="event" size={rf(5)} color="#8e8e93" />
              </TouchableOpacity>
            </View>
          )}

          {/* Bulk Employee List - Only show for Bulk type after date selection */}
          {attendanceType === 'Bulk' && bulkDate && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Employee Attendance</Text>
              {loadingBulkData ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading attendance data...</Text>
                </View>
              ) : (
                <View>
                  {/* Bulk selection toolbar */}
                  <View style={styles.bulkToolbar}>
                    <TouchableOpacity style={styles.bulkSelectAll} onPress={toggleSelectAll} activeOpacity={0.8}>
                      <View style={[styles.checkbox, allSelected && styles.checkboxChecked]}>
                        {allSelected && <Icon name="check" size={rf(3.2)} color="#fff" />}
                      </View>
                      <Text style={styles.bulkSelectAllText}>{allSelected ? 'Unselect All' : 'Select All'}</Text>
                    </TouchableOpacity>

                    <View style={styles.bulkActionsRight}>
                      <TouchableOpacity style={[styles.actionPill, styles.presentPill]} onPress={() => markSelectedAs('Present')} activeOpacity={0.8}>
                        <Text style={styles.actionPillText}>Mark Present</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionPill, styles.absentPill]} onPress={() => markSelectedAs('Absent')} activeOpacity={0.8}>
                        <Text style={styles.actionPillText}>Mark Absent</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.bulkSummaryBox}>
                    <Text style={styles.bulkSummaryText}>
                      {selectedEmployees.length > 0
                        ? `${selectedEmployees.length} selected`
                        : 'Select one or more employees'}
                    </Text>
                  </View>
                  <View style={styles.bulkList}>
                    {bulkEmployees.map((emp) => {
                      const isChecked = selectedEmployees.includes(emp.Employee);
                      const status = employeeStatusMap[emp.Employee];
                      return (
                        <TouchableOpacity
                          key={emp.RawUuid || emp.Employee}
                          style={styles.bulkItem}
                          onPress={() => toggleEmployeeSelection(emp.Employee)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                            {isChecked && <Icon name="check" size={rf(3.2)} color="#fff" />}
                          </View>
                          <Text style={styles.bulkItemLabel}>{emp.Employee}</Text>
                          <View style={styles.spacer} />
                          <View style={[
                            styles.statusBadge,
                            status === 'Present' ? styles.statusPresent : status === 'Absent' ? styles.statusAbsent : styles.statusUnassigned,
                          ]}>
                            <Text style={styles.statusBadgeText}>{status || 'Unassigned'}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Date - Only show for Single type */}
          {attendanceType === 'Single' && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Date</Text>
              <TouchableOpacity 
                style={[styles.dateInput, validationErrors.date && styles.errorBorder]} 
                onPress={() => {
                  setOpenDate(true);
                  // Clear validation error when user opens date picker
                  if (validationErrors.date) {
                    setValidationErrors(prev => ({ ...prev, date: null }));
                  }
                }}
              >
                <Text style={[styles.dateText, !date && styles.placeholderText]}>
                  {formatDate(date) || 'Date'}
                </Text>
                <Icon name="event" size={rf(5)} color="#8e8e93" />
              </TouchableOpacity>
            </View>
          )}

          {/* Date Type */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Day Type</Text>
            <Dropdown
              placeholder="- Select Day Type -"
              value={dateType}
              options={dateTypeOptions}
              onSelect={(item) => {
                setDateType(item);
                setOpenDropdown(null);
                // Clear validation error when user selects
                if (validationErrors.dateType) {
                  setValidationErrors(prev => ({ ...prev, dateType: null }));
                }
              }}
              onOpenChange={(open) => {
                setIsDateTypeOpen(open);
                setOpenDropdown(open ? 'dayType' : null);
              }}
              hideSearch={true}
              inputBoxStyle={validationErrors.dateType ? styles.errorBorder : null}
              style={{ zIndex: 1800, elevation: 4 }}
              isOpen={openDropdown === 'dayType'}
            />
          </View>

          {/* Attendance Status Radio Buttons - Only show for Single type */}
          {attendanceType === 'Single' && (
            <View style={styles.radioContainer}>
              <Text style={styles.label}>Attendance Status</Text>
              <View style={styles.radioGroup}>
                <TouchableOpacity 
                  style={styles.radioOption}
                  onPress={() => setAttendanceStatus('Absent')}
                >
                  <View style={styles.radioButton}>
                    {attendanceStatus === 'Absent' && <View style={styles.radioSelected} />}
                  </View>
                  <Text style={styles.radioLabel}>Absent</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.radioOption}
                  onPress={() => setAttendanceStatus('Present')}
                >
                  <View style={styles.radioButton}>
                    {attendanceStatus === 'Present' && <View style={styles.radioSelected} />}
                  </View>
                  <Text style={styles.radioLabel}>Present</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      <DatePickerBottomSheet
        isVisible={openDate}
        onClose={() => setOpenDate(false)}
        selectedDate={date || new Date()}
        onDateSelect={(d) => {
          setDate(d);
          // Clear validation error when date is selected
          if (validationErrors.date) {
            setValidationErrors(prev => ({ ...prev, date: null }));
          }
        }}
        title="Select Date"
      />

      <DatePickerBottomSheet
        isVisible={openBulkDate}
        onClose={() => setOpenBulkDate(false)}
        selectedDate={bulkDate || new Date()}
        onDateSelect={(d) => {
          setBulkDate(d);
          loadBulkAttendanceData(d);
          // Clear validation error when date is selected
          if (validationErrors.bulkDate) {
            setValidationErrors(prev => ({ ...prev, bulkDate: null }));
          }
        }}
        title="Select Date for Bulk Attendance"
      />

      <SuccessBottomSheet
        visible={showSuccessSheet}
        title="Attendance Submitted!"
        message="Attendance has been submitted successfully."
        buttonText="OK"
        onDismiss={handleSuccessDismiss}
        autoCloseDelay={3000}
      />
    </View>
  );
};

export default HRAAttendance;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  formContainer: {
    paddingTop: hp(2),
  },
  inputContainer: {
    marginBottom: hp(2),
  },
  label: {
    fontSize: rf(3.8),
    fontWeight: '500',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    //marginBottom: hp(1),
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(4),
    height: hp(6.2),
    marginTop: hp(1.2),
  },
  dateText: {
    fontSize: rf(3.5), 
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  placeholderText: {
    color: COLORS.textLight,
  },
  radioContainer: {
    marginBottom: hp(3),
  },
  radioGroup: {
    flexDirection: 'row',
    marginTop: hp(1.2),
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: wp(8),
  },
  radioButton: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
  },
  radioSelected: {
    width: wp(3),
    height: wp(3),
    borderRadius: wp(1.5),
    backgroundColor: COLORS.primary,
  },
  radioLabel: {
    fontSize: rf(3.8),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    paddingBottom: hp(3),
    gap: wp(3),
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: wp(2.5),
    paddingVertical: hp(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: rf(4),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#6B7280',
    borderRadius: wp(2.5),
    paddingVertical: hp(1.8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: rf(4),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  bulkSummaryBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(4),
    height: hp(6.2),
    marginTop: hp(1.2),
    justifyContent: 'center',
  },
  bulkSummaryText: {
    fontSize: rf(3.5),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  bulkList: {
    marginTop: hp(1.2),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2.5),
    overflow: 'hidden',
  },
  bulkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bulkItemLabel: {
    marginLeft: wp(2),
    fontSize: rf(3.6),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  checkbox: {
    width: wp(5),
    height: wp(5),
    borderRadius: wp(1.2),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  bulkToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.8),
  },
  bulkSelectAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bulkSelectAllText: {
    marginLeft: wp(2),
    fontSize: rf(3.6),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  bulkActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  actionPill: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
    borderRadius: wp(2),
  },
  presentPill: {
    backgroundColor: '#10B981',
  },
  absentPill: {
    backgroundColor: '#EF4444',
  },
  actionPillText: {
    color: '#fff',
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  spacer: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.6),
    borderRadius: wp(2),
  },
  statusBadgeText: {
    color: '#fff',
    fontSize: rf(3.0),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  statusPresent: {
    backgroundColor: '#10B981',
  },
  statusAbsent: {
    backgroundColor: '#EF4444',
  },
  statusUnassigned: {
    backgroundColor: '#9CA3AF',
  },
  loadingContainer: {
    paddingVertical: hp(3),
    alignItems: 'center',
  },
  loadingText: {
    fontSize: rf(3.5),
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  errorBorder: {
    borderColor: '#EF4444',
    borderWidth: 2,
  },
});
