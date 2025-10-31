import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import Dropdown from '../../components/common/Dropdown';
import AppHeader from '../../components/common/AppHeader';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, text, layout, SHADOW, buttonStyles } from '../styles/styles';
import { applyLeave, getHRALeaves } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import { Formik } from 'formik';
import Loader from '../../components/common/Loader';
import * as Yup from 'yup';

const ApplyLeaveScreen = ({ navigation }) => {
  const [leaveType, setLeaveType] = useState('');
  const [parameter, setParameter] = useState('');
  const [fromDate, setFromDate] = useState('From Date');
  const [toDate, setToDate] = useState('To Date');
  const [fromDateValue, setFromDateValue] = useState(new Date());
  const [toDateValue, setToDateValue] = useState(new Date());
  const [openFrom, setOpenFrom] = useState(false);
  const [openTo, setOpenTo] = useState(false);
  const [contact, setContact] = useState('');
  const [reason, setReason] = useState('');

  const [leaves, setLeaves] = useState([]);
  const [pageSize, setPageSize] = useState('10');
  const [currentPage, setCurrentPage] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  const leaveTypeOptions = [
    { value: 'c2837a38-a125-40e0-8c4e-c37e8899', label: 'Paid Leave' },
    { value: 'db9d6e71-fcc1-4898-8928-18e8ab9d', label: 'Unpaid Leave' },
    { value: '3d376ba5-74f0-45ad-b3a4-88a55b43', label: 'Casual Leave' },
    { value: 'ef1298dc-7475-4b00-94fc-2d6ab7de', label: 'Perment Leave' }
  ];
  const parameterOptions = ['Full Day', 'Half Day (First Half)', 'Half Day (Second Half)', 'Short Leave'];

  const formatUiDate = (date) => {
    const d = new Date(date);
    const yyyy = String(d.getFullYear());
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // Display formatter: dd-mm-yyyy (accepts common inputs)
  const formatDMY = (value) => {
    if (!value) return '-';
    const s = String(value).trim();
    // Already dd-mm-yyyy
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) return s;
    // yyyy-mm-dd or yyyy/mm/dd
    let m = s.match(/^(\d{4})[-\/](\d{2})[-\/](\d{2})/);
    if (m) {
      return `${m[3]}-${m[2]}-${m[1]}`;
    }
    // dd/mm/yyyy or dd-mm-yyyy variants
    m = s.match(/^(\d{2})[-\/]?(\d{2})[-\/]?(\d{2,4})$/);
    if (m) {
      const yy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${m[1]}-${m[2]}-${yy}`;
    }
    const d = new Date(s);
    if (!isNaN(d)) {
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    }
    return s;
  };

  // Function to check for overlapping leave dates
  const checkForOverlappingLeaves = (fromDate, toDate) => {
    if (!fromDate || !toDate || fromDate === 'From Date' || toDate === 'To Date') {
      return false;
    }

    const newFrom = new Date(fromDate);
    const newTo = new Date(toDate);

    return leaves.some(leave => {
      if (leave.status === 'Pending' || leave.status === 'Approved') {
        const existingFrom = new Date(leave.from);
        const existingTo = new Date(leave.to);

        // Check if dates overlap
        return (newFrom <= existingTo && newTo >= existingFrom);
      }
      return false;
    });
  };

  const ValidationSchema = Yup.object().shape({
    leaveType: Yup.string().trim().required('Leave Type is required'),
    leaveTypeUuid: Yup.string().required('Leave Type is required'),
    parameter: Yup.string().trim().required('Parameter is required'),
    fromDate: Yup.string()
      .test('not-default', 'From Date is required', value => value !== 'From Date')
      .required('From Date is required'),
    toDate: Yup.string()
      .test('not-default', 'To Date is required', value => value !== 'To Date')
      .required('To Date is required'),
    contact: Yup.string()
      .transform(v => (v || '').replace(/\D/g, ''))
      .length(10, 'Contact number must be exactly 10 digits')
      .required('Contact No. is required'),
    reason: Yup.string().trim().min(3, 'Reason must be at least 3 characters').required('Reason is required'),
  });

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setLeavesLoading(true);
        const [userUuid, cmpUuid, envUuid] = await Promise.all([
          getUUID(),
          getCMPUUID(),
          getENVUUID(),
        ]);
        if (!userUuid || !cmpUuid || !envUuid) return;
        const start = currentPage * (parseInt(pageSize, 10) || 10);
        const length = parseInt(pageSize, 10) || 10;
        console.log('🔍 [ApplyLeaveScreen] Search query:', debouncedQuery);
        const resp = await getHRALeaves({ userUuid, cmpUuid, envUuid, start, length, searchValue: debouncedQuery || '' });
        console.log('🔍 [ApplyLeaveScreen] API response:', resp);
        const container = resp?.Data?.Data ?? resp?.Data ?? resp;
        const list = Array.isArray(container?.data)
          ? container.data
          : Array.isArray(container?.Leaves)
            ? container.Leaves
            : Array.isArray(container)
              ? container
              : [];
        const mapped = list.map((it, idx) => ({
          id: it.UUID || String(idx),
          appliedBy: it.AppliedBy || '-',
          applyDate: it.AppliedDate || '-',
          status: it.Status || '-',
          leaveType: it.LeaveType || '-',
          parameter: it.LeaveParameter || '-',
          from: formatDMY(it.LeaveStartDate) || '-',
          to: formatDMY(it.LeaveEndDate) || '-',
          reason: it.Reason || '-',
          contactNo: it.ContactNo ? String(it.ContactNo) : '-',
          actionTakenBy: it.ActionTakenBy || '-',
          remark: it.Remark || '-',
        }));
        if (isMounted) {
          setLeaves(mapped);
          const total = Number(
            (typeof container?.recordsTotal === 'number' && container.recordsTotal) ||
            (typeof container?.recordsFiltered === 'number' && container.recordsFiltered) ||
            (typeof container?.TotalCount === 'number' && container.TotalCount) ||
            mapped.length
          ) || mapped.length;
          setTotalRecords(total);
        }
      } catch (e) {
        // ignore; keep sample on error
      } finally {
        if (isMounted) setLeavesLoading(false);
      }
    })();
    return () => { isMounted = false; };
  }, [currentPage, pageSize, debouncedQuery]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [query]);

  const pageLimit = parseInt(pageSize || '10', 10) || 10;

  // Client-side filtering as fallback if API search doesn't work
  const visibleLeaves = debouncedQuery ? leaves.filter(leave =>
    leave.leaveType?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    leave.status?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    leave.appliedBy?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    leave.reason?.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    leave.from?.includes(debouncedQuery) ||
    leave.to?.includes(debouncedQuery) ||
    leave.applyDate?.includes(debouncedQuery)
  ) : leaves;
  const StatusBadge = ({ label = 'Pending' }) => {
    const palette = {
      Pending: { bg: COLORS.warningBg, color: COLORS.warning, border: COLORS.warning },
      Approved: { bg: COLORS.successBg, color: COLORS.success, border: COLORS.success },
      Rejected: { bg: COLORS.dangerBg, color: COLORS.danger, border: COLORS.danger },
    };
    const theme = palette[label] || palette.Pending;

    return (
      <View style={[styles.badge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
        <Text style={[styles.badgeText, { color: theme.color }]}>{label}</Text>
      </View>
    );
  };

  // Local card component mirroring Timesheet card UX
  const LeaveCard = ({ data, isExpanded, onToggle }) => {
    const isPaid = (data.status || '').toLowerCase() === 'paid';
    const statusColor = isPaid ? '#10B981' : '#3B82F6';
    const statusBg = isPaid ? '#d1fae5' : '#dbeafe';
    return (
      <View style={styles.leaveCard}>
        <TouchableOpacity activeOpacity={0.8} onPress={onToggle}>
          <View style={styles.leaveHeaderRow}>
            <View style={styles.leaveHeaderLeft}>
              <View style={[styles.statusIcon, {
                backgroundColor:
                  data.status === 'Approved'
                    ? COLORS.success
                    : data.status === 'Pending'
                      ? COLORS.warning
                      : COLORS.danger,
              }]} />
              <View style={{ maxWidth: wp(60) }}>
                <Text style={styles.headerLabel}>LEAVE TYPE</Text>
                <Text style={styles.headerTitle} numberOfLines={1}>{data.leaveType || 'Leave'}</Text>
              </View>
            </View>
            <View style={styles.leaveHeaderRightMeta}>
              <Text style={styles.headerLabelRight}>APPLY DATE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: wp(1.2) }}>
                <Text style={styles.headerValueRight}>{data.applyDate}</Text>
                <Icon name={isExpanded ? 'expand-less' : 'expand-more'} size={rf(4.2)} color="#6b7280" />
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.leaveDetailArea}>
            <Text style={[styles.detailLabelMuted, { marginBottom: hp(0.8) }]}>LEAVE INFORMATION</Text>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>APPLIED BY</Text>
              <Text style={styles.detailValueStrong}>{data.appliedBy || '-'}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>APPLIED DATE</Text>
              <Text style={styles.detailValueStrong}>{data.applyDate}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>LEAVE START DATE</Text>
              <Text style={styles.detailValueStrong}>{data.from}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>LEAVE END DATE</Text>
              <Text style={styles.detailValueStrong}>{data.to}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>LEAVE TYPE</Text>
              <Text style={styles.detailValueStrong}>{data.leaveType}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>LEAVE PARAMETER</Text>
              <Text style={styles.detailValueStrong}>{data.parameter}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>REASON</Text>
              <Text style={styles.detailValueStrong}>{data.reason || '-'}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>CONTACT NO</Text>
              <Text style={styles.detailValueStrong}>{data.contactNo || '-'}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>STATUS</Text>
              <StatusBadge label={data.status} />
              {/* <View style={[styles.statusPill, { backgroundColor: statusBg }]}>
                <Text style={[styles.statusPillText, { color: statusColor }]}>{data.status}</Text>
              </View> */}
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>ACTION TAKEN BY</Text>
              <Text style={styles.detailValueStrong}>{data.actionTakenBy || '-'}</Text>
            </View>
            <View style={styles.leaveDetailRow}>
              <Text style={styles.detailLabelMuted}>REMARK</Text>
              <Text style={styles.detailValueStrong}>{data.remark || '-'}</Text>
            </View>
            {/* <View style={styles.detailDivider} />
            <View style={styles.actionButtonsRow}>
              <TouchableOpacity activeOpacity={0.85} style={[styles.actionBtn, styles.actionBtnApprove]}>
                <Icon name="fact-check" size={rf(4)} color="#16a34a" />
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.85} style={[styles.actionBtn, styles.actionBtnDelete]}>
                <Icon name="delete" size={rf(4)} color="#ef4444" />
              </TouchableOpacity>
            </View> */}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Apply Leave"

        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Formik
          initialValues={{
            leaveType: '',
            leaveTypeUuid: '',
            parameter: '',
            fromDate: 'From Date',
            toDate: 'To Date',
            contact: '',
            reason: '',
          }}
          validationSchema={ValidationSchema}
          onSubmit={async (vals, { resetForm, setSubmitting: setFSubmitting, setStatus }) => {
            try {
              setStatus(undefined);
              const from = vals.fromDate === 'From Date' ? formatUiDate(fromDateValue) : vals.fromDate;
              const to = vals.toDate === 'To Date' ? formatUiDate(toDateValue) : vals.toDate;

              // Check for overlapping leave dates
              if (checkForOverlappingLeaves(from, to)) {
                setStatus({ apiError: 'A leave request already exists for the selected date range. Please choose different dates.' });
                return;
              }

              // optimistic UI
              const newLeave = {
                id: `lv-${Date.now()}`,
                appliedBy: 'You',
                applyDate: formatUiDate(new Date()),
                status: 'Pending',
                leaveType: vals.leaveType,
                parameter: vals.parameter,
                from,
                to,
                reason: vals.reason.trim(),
                contactNo: (vals.contact || '').replace(/\D/g, ''),
                actionTakenBy: '',
                remark: '',
              };
              setLeaves((prev) => [newLeave, ...prev]);

              // clear UI
              resetForm();
              setFromDate('From Date');
              setToDate('To Date');
              setFromDateValue(new Date());
              setToDateValue(new Date());

              // call API in background
              const payload = {
                leaveType: vals.leaveTypeUuid,
                parameter: vals.parameter,
                fromDate: from,
                toDate: to,
                reason: vals.reason.trim(),
                contactNo: (vals.contact || '').replace(/\D/g, ''),
              };
              try {
                const resp = await applyLeave(payload);
                console.log('ApplyLeave response:', resp);
              } catch (e) {
                console.log('ApplyLeave API error:', e?.response?.data || e?.message || e);
              }
            } finally {
              setFSubmitting(false);
            }
          }}
        >
          {({ values, errors, touched, setFieldValue, setFieldTouched, handleSubmit, status, setStatus }) => (
            <View>
              {status?.apiError ? (
                <Text style={styles.errorText}>{status.apiError}</Text>
              ) : null}

              <View style={styles.formFieldContainer}>
                <Dropdown
                  placeholder="Leave Type"
                  value={values.leaveType}
                  options={leaveTypeOptions}
                  getLabel={(item) => item.label}
                  getKey={(item) => item.value}
                  onSelect={(item) => {
                    // item is the entire object {value, label}
                    setFieldValue('leaveType', item.label);
                    setFieldValue('leaveTypeUuid', item.value);
                  }}
                  style={{ zIndex: 20 }}
                  inputBoxStyle={[(touched.leaveType && errors.leaveType) && styles.inputError]}
                  hideSearch={true}
                />
                {touched.leaveType && errors.leaveType ? (
                  <Text style={styles.helperError}>{errors.leaveType}</Text>
                ) : null}
              </View>

              <View style={styles.formFieldContainer}>
                <Dropdown
                  placeholder="Select Parameter"
                  value={values.parameter}
                  options={parameterOptions}
                  onSelect={(val) => setFieldValue('parameter', typeof val === 'string' ? val : String(val))}
                  style={{ zIndex: 10 }}
                  inputBoxStyle={[(touched.parameter && errors.parameter) && styles.inputError]}
                  hideSearch={true}
                />
                {touched.parameter && errors.parameter ? (
                  <Text style={styles.helperError}>{errors.parameter}</Text>
                ) : null}
              </View>

              <View style={styles.formFieldContainer}>
                <View style={[styles.row, { marginBottom: (touched.fromDate && errors.fromDate) || (touched.toDate && errors.toDate) ? 0 : hp(1.2) }]}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setOpenFrom(true); }}
                    style={[styles.picker, (touched.fromDate && errors.fromDate) && styles.inputError]}
                  >
                    <Text style={styles.pickerText}>{values.fromDate}</Text>
                    <Icon name="calendar-today" size={rf(3.2)} color="#9ca3af" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => { setOpenTo(true); }}
                    style={[styles.picker, (touched.toDate && errors.toDate) && styles.inputError]}
                  >
                    <Text style={styles.pickerText}>{values.toDate}</Text>
                    <Icon name="calendar-today" size={rf(3.2)} color="#9ca3af" />
                  </TouchableOpacity>
                </View>
                {(touched.fromDate && errors.fromDate) || (touched.toDate && errors.toDate) ? (
                  <Text style={styles.helperErrorWithMargin}>
                    {errors.fromDate || errors.toDate}
                  </Text>
                ) : null}
              </View>

              <View style={[styles.formFieldContainer, { marginBottom: hp(1.2) }]}>
                <View style={[styles.input, (touched.contact && errors.contact) && styles.inputError]}>
                  <TextInput
                    placeholder="Contact No."
                    placeholderTextColor="#9ca3af"
                    keyboardType="phone-pad"
                    value={values.contact}
                    onChangeText={(t) => {
                      // Limit to 10 digits only
                      const digitsOnly = t.replace(/\D/g, '');
                      if (digitsOnly.length <= 10) {
                        setFieldValue('contact', digitsOnly);
                      }
                    }}
                    style={styles.inputField}
                    maxLength={10}
                  />
                </View>
                {touched.contact && errors.contact ? (
                  <Text style={styles.helperErrorNoMargin}>{errors.contact}</Text>
                ) : null}
              </View>

              <View style={styles.formFieldContainer}>
                <View style={[styles.input, { height: hp(16) }, (touched.reason && errors.reason) && styles.inputError]}>
                  <TextInput
                    placeholder="Reason"
                    placeholderTextColor="#9ca3af"
                    multiline
                    value={values.reason}
                    onChangeText={(t) => setFieldValue('reason', t)}
                    style={[styles.inputField, { textAlignVertical: 'top' }]}
                  />
                </View>
                {touched.reason && errors.reason ? (
                  <Text style={styles.helperErrorNoMargin}>{errors.reason}</Text>
                ) : null}
              </View>

              <TouchableOpacity activeOpacity={0.9} style={styles.submitButton} onPress={handleSubmit}>
                <Text style={styles.submitText}>Submit</Text>
              </TouchableOpacity>

              <DatePickerBottomSheet
                isVisible={openFrom}
                onClose={() => setOpenFrom(false)}
                selectedDate={fromDateValue}
                onDateSelect={(date) => {
                  setFromDateValue(date);
                  const d = formatUiDate(date);
                  setFromDate(d);
                  setFieldValue('fromDate', d);
                  // If existing to-date is before new from-date, auto-adjust To Date to From Date
                  const currentTo = values.toDate && values.toDate !== 'To Date' ? new Date(values.toDate) : null;
                  if (currentTo && new Date(d) > currentTo) {
                    setToDateValue(date);
                    const same = formatUiDate(date);
                    setToDate(same);
                    setFieldValue('toDate', same);
                  }
                }}
                title="Select From Date"
                minDate={(function () { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); })()}
              />

              <DatePickerBottomSheet
                isVisible={openTo}
                onClose={() => setOpenTo(false)}
                selectedDate={toDateValue}
                onDateSelect={(date) => {
                  setToDateValue(date);
                  const d = formatUiDate(date);
                  setToDate(d);
                  setFieldValue('toDate', d);
                }}
                title="Select To Date"
                minDate={(function () {
                  const today = new Date();
                  const base = (values.fromDate && values.fromDate !== 'From Date') ? new Date(values.fromDate) : today;
                  const baseStart = new Date(base.getFullYear(), base.getMonth(), base.getDate());
                  return baseStart;
                })()}
              />
            </View>
          )}
        </Formik>

        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionHeading}>View My Leave Data</Text>
          {query && (
            <Text style={styles.searchIndicator}>
              Searching: "{query}"
            </Text>
          )}
        </View>

        <View style={styles.controlsRow}>
          <Text style={styles.showLabel}>Show</Text>
          <Dropdown
            placeholder="10"
            value={pageSize}
            options={["10", "25", "50"]}
            hideSearch
            maxPanelHeightPercent={15}
            onSelect={(val) => { setPageSize(String(val)); setCurrentPage(0); }}
            inputBoxStyle={{ paddingHorizontal: wp(2.2) }}
            style={{ width: wp(20), marginBottom: hp(1.1) }}
          />
          <View style={styles.searchBox}>
            <Icon name="search" size={rf(3.8)} color="#9ca3af" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#9ca3af"
              value={query}
              onChangeText={(t) => { setQuery(t); setCurrentPage(0); }}
            />
          </View>
        </View>

        {leavesLoading ? (
          <View style={styles.emptyTableBox}>
            <Loader />
          </View>
        ) : visibleLeaves.length === 0 ? (
          <View style={styles.emptyTableBox}>
            <Text style={styles.emptyTableText}>No data available</Text>
          </View>
        ) : (
          <View style={{ paddingVertical: hp(0.5) }}>
            {visibleLeaves.map((row) => (
              <LeaveCard
                key={row.id}
                data={row}
                isExpanded={expandedId === row.id}
                onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              />
            ))}
          </View>
        )}

        {/* Pagination footer */}
        <View style={{ alignItems: 'center', paddingVertical: hp(1) }}>
          <Text style={{ color: COLORS.textMuted, marginBottom: hp(0.6) }}>
            Showing {totalRecords === 0 ? 0 : currentPage * pageLimit + 1} to {Math.min((currentPage + 1) * pageLimit, totalRecords)} of {totalRecords} entries
          </Text>
          {/* <View style={{ flexDirection: 'row', gap: wp(2) }}>
            <TouchableOpacity disabled={currentPage === 0} onPress={() => setCurrentPage((p) => Math.max(0, p - 1))}>
              <Text style={{ color: currentPage === 0 ? COLORS.textLight : COLORS.primary }}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity disabled={(currentPage + 1) * pageLimit >= totalRecords} onPress={() => setCurrentPage((p) => p + 1)}>
              <Text style={{ color: (currentPage + 1) * pageLimit >= totalRecords ? COLORS.textLight : COLORS.primary }}>Next</Text>
            </TouchableOpacity>
          </View> */}
        </View>
      </ScrollView>


    </View>
  );
};

export default ApplyLeaveScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // paddingTop: safeAreaTop,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: wp(3),
    height: hp(6.2),
    marginTop: hp(1),
    marginBottom: hp(1.2),
  },
  formFieldContainer: {
    // marginBottom: hp(1.2),
  },
  selectText: {
    color: COLORS.textMuted,
    fontSize: rf(4),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  row: {
    flexDirection: 'row',
    gap: wp(3),
    // marginBottom: hp(1.2),
  },
  picker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: wp(3),
    height: hp(6.2),
    marginTop: hp(1),
  },
  pickerText: {
    color: COLORS.textMuted,
    fontSize: rf(4),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: wp(3),
    height: hp(6.2),
  },
  inputField: {
    fontSize: TYPOGRAPHY.input,
    color: COLORS.text,
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  submitButton: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.3),
    paddingHorizontal: wp(5),
    borderRadius: RADIUS.md,
    marginTop: hp(1),
  },
  submitText: {
    color: COLORS.bg,
    fontWeight: '800',
    fontSize: rf(4),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  inputError: {
    borderColor: '#ef4444',
    borderWidth: 1,
  },
  helperError: {
    color: '#ef4444',
    fontSize: rf(2.8),
    marginTop: hp(0.3),
  },
  helperErrorWithMargin: {
    color: '#ef4444',
    fontSize: rf(2.8),
    marginTop: hp(0.3),
    marginBottom: hp(1.2),
  },
  helperErrorNoMargin: {
    color: '#ef4444',
    fontSize: rf(2.8),
    marginTop: hp(0.3),
  },
  sectionHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  sectionHeading: {
    fontSize: rf(3.6),
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  searchIndicator: {
    fontSize: rf(3),
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    fontStyle: 'italic',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginBottom: hp(1),
  },
  showLabel: {
    fontSize: rf(3.8),
    color: COLORS.text,
    marginRight: wp(1),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: wp(2),
    height: hp(6.2),
    flex: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(1),
    color: COLORS.text,
    fontSize: rf(3.8),
    paddingVertical: 0,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  table: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  tableHeader: {
    backgroundColor: '#f9fafb',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cell: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(2),
    fontSize: rf(3.8),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  cellSn: {
    width: wp(16),
  },
  cellApplyDate: {
    flex: 1,
  },
  cellStatus: {
    width: wp(30),
  },
  emptyTableBox: {
    paddingVertical: hp(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTableText: {
    color: COLORS.textMuted,
    fontSize: rf(3.8),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  badge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '600',
    padding: 1
  },
  // Card styles (expense-like)
  leaveCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: wp(3),
    marginTop: hp(1.2),
  },
  leaveHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leaveHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    flex: 1,
  },
  statusIcon: { width: wp(3.5), height: wp(3.5), borderRadius: wp(2) },
  headerLabel: { fontSize: rf(2.8), color: COLORS.textMuted, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamilyBold, marginBottom: hp(0.3) },
  headerTitle: { fontSize: rf(3.8), color: COLORS.text, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamilyBold },
  leaveHeaderRightMeta: { alignItems: 'flex-end' },
  headerLabelRight: { fontSize: rf(2.8), color: COLORS.textMuted, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamilyBold },
  headerValueRight: { fontSize: rf(3.8), color: COLORS.text, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamilyBold },
  leaveHeaderRight: {
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2.4),
    borderRadius: wp(5),
  },
  statusPillText: {
    fontSize: rf(3.2),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  leaveDetailArea: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: hp(1),
    paddingTop: hp(1),
  },
  leaveDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.6),
  },
  detailLabelMuted: { fontSize: rf(3.2), color: COLORS.textMuted, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamilyMedium },
  detailValueStrong: { fontSize: rf(3.6), color: COLORS.text, fontWeight: '700', fontFamily: TYPOGRAPHY.fontFamilyBold },
  detailDivider: { height: 1, backgroundColor: COLORS.border, marginVertical: hp(1) },
  actionButtonsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: wp(3) },
  actionBtn: { flex: 1, paddingVertical: hp(1.4), borderRadius: wp(3), borderWidth: 1.5, alignItems: 'center' },
  actionBtnApprove: { borderColor: '#16a34a' },
  actionBtnDelete: { borderColor: '#ef4444' },
}); 