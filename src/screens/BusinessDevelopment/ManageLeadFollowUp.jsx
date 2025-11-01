import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, inputStyles, SPACING } from '../styles/styles';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { TYPOGRAPHY } from '../styles/styles';
import AppHeader from '../../components/common/AppHeader';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import BottomSheetConfirm from '../../components/common/BottomSheetConfirm';
import { addLeadFollowUp, updateLeadFollowUp, deleteLeadFollowUp, getEmployees, getFollowUpsByLead } from '../../api/authServices';
import Dropdown from '../../components/common/Dropdown';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';

const people = [
  { id: 'u1', name: 'Kalpesh Patel' },
  { id: 'u2', name: 'Manan Jadav' },
  { id: 'u3', name: 'Abhinav Kumar' },
];

const followTypes = ['Call', 'Email', 'Meeting', 'Demo'];

const formatUiDate = (date) => {
  const d = new Date(date);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
// For showing in inputs: dd-MM-yy
const formatDisplayDate = (ui) => {
  const s = String(ui || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s; // if not ui-date, show as-is
  const [y, m, d] = s.split('-');
  const yy = y.slice(-2);
  return `${d}-${m}-${yy}`;
};
// Convert API date (ISO or other) to UI yyyy-mm-dd without timezone shifts
const toUiDate = (value) => {
  const s = String(value || '').trim();
  if (!s) return '';
  // already UI format
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // ISO like 2025-10-03T...
  const tIdx = s.indexOf('T');
  if (tIdx > 0 && /^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, tIdx);
  // Handle slash formats: dd/MM/yyyy or MM/dd/yyyy
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [a, b, yStr] = s.split('/');
    const dayFirst = Number(a) > 12; // if first part >12 => dd/MM/yyyy
    const dd = dayFirst ? Number(a) : Number(b);
    const mm = dayFirst ? Number(b) : Number(a);
    const yyyy = Number(yStr);
    if (yyyy && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${String(yyyy)}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }
  // Handle hyphen formats: dd-MM-yyyy or MM-dd-yyyy
  if (/^\d{1,2}-\d{1,2}-\d{2,4}$/.test(s)) {
    const [a, b, yStrRaw] = s.split('-');
    const yStr = yStrRaw.length === 2 ? `20${yStrRaw}` : yStrRaw; // normalize yy -> 20yy
    const dayFirst = Number(a) > 12; // if first part >12 => dd-MM-yyyy
    const dd = dayFirst ? Number(a) : Number(b);
    const mm = dayFirst ? Number(b) : Number(a);
    const yyyy = Number(yStr);
    if (yyyy && mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31) {
      return `${String(yyyy)}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
  }
  // Fallback to Date parsing
  const d = new Date(s);
  if (!isNaN(d)) return formatUiDate(d);
  return '';
};
// Build JS Date from yyyy-mm-dd for picker value
const fromUiToDate = (ui) => {
  if (!ui || !/^\d{4}-\d{2}-\d{2}$/.test(ui)) return new Date();
  const [y, m, d] = ui.split('-').map((n) => Number(n));
  return new Date(y, m - 1, d);
};

// Safe ISO (UTC noon) to avoid previous-day shift across timezones
const uiDateToNoonISO = (ui) => {
  if (!ui || !/^\d{4}-\d{2}-\d{2}$/.test(ui)) return new Date().toISOString();
  const [y, m, d] = ui.split('-').map((n) => Number(n));
  const dt = new Date(Date.UTC(y, (m - 1), d, 12, 0, 0)); // UTC noon
  return dt.toISOString();
};

const resolveEmployeeName = (emp) => emp?.EmployeeName || emp?.Name || emp?.DisplayName || emp?.FullName || '';
const resolveEmployeeKey = (emp) => emp?.Uuid || emp?.UUID || emp?.EmployeeUUID || emp?.EmpUuid || resolveEmployeeName(emp);

const ManageLeadFollowUp = ({ navigation, route }) => {
  const [taker, setTaker] = useState('');
  const [takerUuid, setTakerUuid] = useState('');
  const [takerEmp, setTakerEmp] = useState(null);
  const [date, setDate] = useState('');
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [isRequired, setIsRequired] = useState(false);
  const [openPicker, setOpenPicker] = useState(false);
  const [pickerVal, setPickerVal] = useState(new Date());
  // Next follow-up date (conditional)
  const [nextDate, setNextDate] = useState('');
  const [openNextPicker, setOpenNextPicker] = useState(false);
  const [nextPickerVal, setNextPickerVal] = useState(new Date());
  // Validation errors
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [apiError, setApiError] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [followUpToDelete, setFollowUpToDelete] = useState(null);
  const scrollViewRef = useRef(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoadingEmployees(true);
        const resp = await getEmployees();
        const list = Array.isArray(resp?.Data) ? resp.Data : [];
        setEmployees(list);
      } catch (e) {
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    load();
  }, []);
  const inputRef = useRef(null);
  // Auto-fill taker from route params (prefer UUID, then name; supports opportunity owner keys)
  React.useEffect(() => {
    if (!employees?.length) return;
    // Prefer explicit FollowUpTaker defaults, then owner-related keys
    const initialUuid = route?.params?.initialFollowUpTakerUuid
      || route?.params?.opportunityOwnerUuid
      || route?.params?.OpportunityOwnerFromKSP_UUID
      || route?.params?.ownerUuid
      || '';

    const initialNameRaw = route?.params?.initialFollowUpTakerName
      || route?.params?.opportunityOwnerName
      || route?.params?.ownerName
      || route?.params?.OppOwner
      || '';

    let found = null;
    if (initialUuid) {
      const targetUuid = String(initialUuid).trim().toLowerCase();
      found = employees.find((e) => String(resolveEmployeeKey(e)).trim().toLowerCase() === targetUuid) || null;
    }
    if (!found && initialNameRaw) {
      const target = String(initialNameRaw).trim().toLowerCase();
      const normalize = (s) => String(s || '').trim().toLowerCase();
      found = employees.find((e) => {
        const name = normalize(resolveEmployeeName(e));
        if (name === target) return true;
        if (name.includes(target) || target.includes(name)) return true;
        const nf = name.split(' ')[0];
        const tf = target.split(' ')[0];
        return nf && tf && nf === tf;
      }) || null;
    }
    if (found) {
      const name = resolveEmployeeName(found);
      const uuid = found?.UUID || found?.Uuid || found?.EmployeeUUID || found?.EmpUuid || '';
      setTaker(name);
      setTakerEmp(found);
      if (uuid) setTakerUuid(String(uuid));
    }
  }, [employees, route?.params]);

  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [editingFollowup, setEditingFollowup] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Track which follow-up card is currently open (only one at a time)
  const [openCardId, setOpenCardId] = useState(null);

  // Load existing follow-ups from API (shared)
  const fetchFollowUps = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const leadUuid = route?.params?.leadUuid || '';
      if (!leadUuid) return;
      const data = await getFollowUpsByLead({ leadUuid });
      const list = Array.isArray(data?.Data) ? data.Data : [];
      const mapped = list.map((r, idx) => {
        // Find employee name by UUID
        const takerUuid = r?.FollowUpTaker || '';

        const foundEmployee = employees.find((emp) => {
          const empUuid = emp?.UUID || emp?.Uuid || emp?.EmployeeUUID || emp?.EmpUuid || '';
          const match = String(empUuid).trim().toLowerCase() === String(takerUuid).trim().toLowerCase();
          return match;
        });
        const takerName = foundEmployee ? resolveEmployeeName(foundEmployee) : takerUuid;


        return {
          id: String(r?.uuid || r?.Uuid || r?.UUID || idx + 1),
          uuid: String(r?.uuid || r?.Uuid || r?.UUID || ''),
          taker: takerName, // Display name instead of UUID
          takerUuid: takerUuid, // Keep UUID for reference
          displayDate: r?.FollowUpDate || '',
          uiDate: toUiDate(r?.FollowUpDate),
          type: r?.FollowUpType || '',
          raw: r,
        };
      });
      setAllRows(mapped);
      setTotalRecords(mapped.length);
      if (!Array.isArray(list) || list.length === 0) {
        const msg = data?.Message || 'No follow ups found for the specified lead';
        setApiError(String(msg));
      } else {
        setApiError('');
      }
    } catch (e) {
      const msg = (e?.response?.data?.Message) || (e?.response?.data?.message) || (e?.message) || 'Failed to load follow ups';
      setApiError(String(msg));
      setAllRows([]);
      setTotalRecords(0);
    } finally { setIsRefreshing(false); }
  }, [route?.params?.leadUuid, employees]);

  useEffect(() => {
    // Only fetch follow-ups after employees are loaded
    if (employees.length > 0) {
      fetchFollowUps();
    }
  }, [fetchFollowUps, employees]);

  // Client-side pagination effect
  useEffect(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedRows = allRows.slice(startIndex, endIndex);
    setRows(paginatedRows);
  }, [allRows, currentPage, itemsPerPage]);

  const itemsPerPageOptions = [5, 10, 20, 50];
  const totalPages = Math.max(1, Math.ceil(totalRecords / (itemsPerPage || 1)));
  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    const items = [];
    const current = currentPage + 1;
    const last = totalPages;
    items.push('prev');
    for (let p = 1; p <= Math.min(2, last); p++) items.push(p);
    if (current > 4 && last > 5) items.push('left-ellipsis');
    const startWin = Math.max(3, current - 1);
    const endWin = Math.min(last - 2, current + 1);
    for (let p = startWin; p <= endWin; p++) items.push(p);
    if (current < last - 3 && last > 5) items.push('right-ellipsis');
    for (let p = Math.max(last - 1, 3); p <= last; p++) items.push(p);
    items.push('next');
    // dedupe
    const seen = new Set();
    const dedup = [];
    for (const it of items) { const k = String(it); if (seen.has(k)) continue; seen.add(k); dedup.push(it); }
    return dedup;
  }, [currentPage, totalPages]);

  const handlePageChange = (page) => {
    if (page < 0 || page > totalPages - 1) return;
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(0);
  };

  // Handle card toggle - close previously open card if another is opened
  const handleCardToggle = (cardId) => {
    setOpenCardId((prevId) => (prevId === cardId ? null : cardId));
  };

  const handleDeleteConfirm = (followUp) => {
    setFollowUpToDelete(followUp);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteConfirmAction = async () => {
    if (!followUpToDelete) return;

    try {
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      await deleteLeadFollowUp({
        followupUuid: followUpToDelete.uuid,
        overrides: {
          userUuid: takerUuid || (await getUUID()),
          cmpUuid,
          envUuid
        }
      });
      // Refresh from API instead of local state update
      await fetchFollowUps();
    } catch (e) {
    } finally {
      setDeleteConfirmVisible(false);
      setFollowUpToDelete(null);
    }
  };

  const addRow = async () => {
    const nextErrors = {};
    // Fix: Check takerEmp instead of takerUuid for validation
    if (!takerEmp) nextErrors.taker = 'Follow up taker is required';
    if (!date) nextErrors.date = 'Follow up date is required';
    if (!type) nextErrors.type = 'Follow up type is required';
    if (!desc) nextErrors.desc = 'Description is required';
    if (isRequired && !nextDate) nextErrors.nextDate = 'Next follow-up date is required';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Call API (POST add or PUT update)
    try {
      if (editingFollowup?.uuid) { setIsUpdating(true); } else { setIsAdding(true); }
      const payload = {
        FollowUpTaker: takerUuid, // Send UUID instead of name
        FollowUpDate: uiDateToNoonISO(date),
        FollowUpType: type,
        Description: desc,
        Next_FollowUp_Date: isRequired && nextDate ? uiDateToNoonISO(nextDate) : null,
        Is_Next_FollowUp_Req: Boolean(isRequired),
      };
      // Use selected follow-up taker UUID as userUuid for API (per requirement)
      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);
      const leadUuid = route?.params?.leadUuid || '';
      if (editingFollowup?.uuid) {
        await updateLeadFollowUp({ followupUuid: editingFollowup.uuid, payload, overrides: { userUuid: takerUuid, cmpUuid, envUuid } });
      } else {
        await addLeadFollowUp({ leadOppUuid: leadUuid, payload, overrides: { userUuid: takerUuid, cmpUuid, envUuid } });
      }
      await fetchFollowUps();
    } catch (e) {
    }
    // refresh from API to show real data
    await fetchFollowUps();
    // Clear all form fields including employee selection
    setTaker('');
    setTakerUuid('');
    setTakerEmp(null); // Clear the selected employee object
    setDate('');
    setType('');
    setDesc('');
    setIsRequired(false);
    setNextDate('');
    setErrors({});
    setEditingFollowup(null);
    setIsAdding(false);
    setIsUpdating(false);
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader title="Add Follow up" onLeftPress={() => navigation.goBack()} />

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.field}>
            <Dropdown
              placeholder="Follow Up Taker*"
              value={resolveEmployeeName(takerEmp)}
              options={employees}
              getLabel={resolveEmployeeName}
              getKey={resolveEmployeeKey}
              hint="Follow Up Taker*"
              onSelect={(emp) => {
                setTakerEmp(emp);
                setTaker(resolveEmployeeName(emp));
                const empUuid = emp?.UUID || emp?.Uuid || emp?.EmployeeUUID || emp?.EmpUuid || '';
                setTakerUuid(String(empUuid || ''));
                if (errors.taker) setErrors((e) => ({ ...e, taker: null }));
              }}
              inputBoxStyle={[inputStyles.box, errors.taker && styles.errorBorder]}
              textStyle={{ fontSize: rf(4.2), marginLeft: 5 }}
              loading={loadingEmployees}
            />
            {errors.taker ? <Text style={styles.errorText}>{errors.taker}</Text> : null}
          </View>
          {errors.taker ? <Text style={styles.errorText}>{errors.taker}</Text> : null}

          <View style={{ ...styles.field, marginTop: 15.5 }}>
            <TouchableOpacity activeOpacity={0.85} style={[inputStyles.box, { marginTop: 0 }, errors.date && styles.errorBorder]} onPress={() => setOpenPicker(true)}>
              <Text style={[inputStyles.input, { fontSize: rf(4.2) }, !date && { color: '#9ca3af', fontFamily: TYPOGRAPHY.fontFamilyRegular }]}>{date ? formatDisplayDate(date) : 'Follow Up Date*'}</Text>
              <Icon name="calendar-today" size={rf(3.2)} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          {errors.date ? <Text style={styles.errorText}>{errors.date}</Text> : null}

          <View style={[inputStyles.box, styles.field, errors.type && styles.errorBorder]}>
            <TextInput
              style={[inputStyles.input, { fontSize: rf(4.2) }, { marginLeft: 0 }]}
              placeholder="Follow Up Type*"
              placeholderTextColor="#9ca3af"
              value={type}
              onChangeText={(v) => { setType(v); if (errors.type) setErrors((e) => ({ ...e, type: null })); }}
            />
          </View>
          {errors.type ? <Text style={styles.errorText}>{errors.type}</Text> : null}

          <TouchableOpacity
            activeOpacity={1}
            onPress={() => inputRef.current?.focus()}
            style={[
              inputStyles.box,
              { minHeight: hp(14), alignItems: 'flex-start', paddingVertical: hp(1.2) },
              styles.field,
              errors.desc && styles.errorBorder,
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[
                inputStyles.input,
                { textAlignVertical: 'top', fontSize: rf(4.2), marginLeft: 0, },
              ]}
              placeholder="Description *"
              placeholderTextColor="#9ca3af"
              value={desc}
              onChangeText={(v) => {
                setDesc(v);
                if (errors.desc) setErrors((e) => ({ ...e, desc: null }));
              }}
              multiline
            />
          </TouchableOpacity>
          {errors.desc ? <Text style={styles.errorText}>{errors.desc}</Text> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>

            <View style={styles.checkboxRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.checkbox, isRequired && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
                onPress={() => { setIsRequired((s) => { const next = !s; if (!next) { setNextDate(''); setErrors((e) => ({ ...e, nextDate: null })); } return next; }); }}
              >
                {isRequired ? <Icon name="check" size={rf(4.5)} color="#fff" /> : null}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Is Next Follow up is Required ?</Text>
            </View>
            {/* Conditional Next Follow-up Date will render below this row */}

            <View style={{ alignItems: 'flex-end' }}>
              <TouchableOpacity activeOpacity={0.9} style={[styles.addBtn, (isAdding || isUpdating) && { opacity: 0.6 }]} onPress={addRow} disabled={isAdding || isUpdating}>
                <Text style={styles.addBtnText}>{editingFollowup ? (isUpdating ? 'Updating...' : 'Update') : (isAdding ? 'Adding...' : 'Add')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isRequired && (
            <View style={{ marginTop: hp(0.6) }}>
              <Text style={styles.inputLabel}>Next Follow-Up Date</Text>
              <TouchableOpacity
                activeOpacity={0.85}
                style={[inputStyles.box, { marginTop: 0 }, errors.nextDate && styles.errorBorder]}
                onPress={() => setOpenNextPicker(true)}
              >
                <Text style={[inputStyles.input, { fontSize: rf(4.2), marginLeft: SPACING.sm }, !nextDate && { color: '#9ca3af', fontFamily: TYPOGRAPHY.fontFamilyRegular }]}>
                  {nextDate ? formatDisplayDate(nextDate) : 'Select Next Follow-Up Date*'}
                </Text>
                <Icon name="calendar-today" size={rf(3.2)} color="#9ca3af" />
              </TouchableOpacity>
              {errors.nextDate ? <Text style={styles.errorText}>{errors.nextDate}</Text> : null}
            </View>
          )}

          {/* Pagination Controls */}
          {!(rows.length === 0) &&
            <View style={styles.paginationContainer}>
              <View style={styles.itemsPerPageContainer}>
                <Text style={styles.paginationLabel}>Show:</Text>
                <Dropdown
                  placeholder="10"
                  value={itemsPerPage}
                  options={itemsPerPageOptions}
                  onSelect={handleItemsPerPageChange}
                  hideSearch={true}
                  inputBoxStyle={styles.paginationDropdown}
                />
                <Text style={styles.paginationLabel}>entries</Text>
              </View>
            </View>}

          {/* Follow-up Cards (collapsible like ManageLeadProposal) */}
          <View style={{ flex: 1, marginTop: hp(2) }}>
            {rows.length === 0 && !!apiError ? (
              <View style={styles.apiErrorWrap}>
                <Text style={styles.apiErrorText}>{apiError}</Text>
              </View>
            ) : null}
            {rows.map((r) => (
              <FollowUpCard
                key={r.id}
                data={r}
                isOpen={openCardId === r.id}
                onToggle={() => handleCardToggle(r.id)}
                onEdit={() => {
                  setEditingFollowup(r);
                  setTaker(r.taker);
                  setType(r.type);
                  const ui = r.uiDate || toUiDate(r.displayDate);
                  setDate(ui);
                  setPickerVal(fromUiToDate(ui));
                  // description from API
                  const apiDesc = r?.raw?.Description || r?.raw?.description || '';
                  setDesc(String(apiDesc));
                  // try to resolve employee by UUID (preferred) or by name (fallback)
                  let found = null;
                  if (r.takerUuid) {
                    // First try to find by UUID
                    found = employees.find((e) => {
                      const empUuid = e?.UUID || e?.Uuid || e?.EmployeeUUID || e?.EmpUuid || '';
                      return String(empUuid).trim().toLowerCase() === String(r.takerUuid).trim().toLowerCase();
                    });
                  }
                  if (!found) {
                    // Fallback to finding by name
                    found = employees.find((e) => (e?.EmployeeName || e?.Name || e?.DisplayName || e?.FullName || '').trim().toLowerCase() === String(r.taker || '').trim().toLowerCase());
                  }
                  if (found) {
                    setTakerEmp(found);
                    const empUuid = found?.UUID || found?.Uuid || found?.EmployeeUUID || found?.EmpUuid || '';
                    setTakerUuid(String(empUuid || ''));
                  }
                  // next follow-up fields if present in raw
                  const nextApi = r?.raw?.Next_FollowUp_Date;
                  const isNextReq = Boolean(r?.raw?.Is_Next_FollowUp_Req);
                  setIsRequired(isNextReq);
                  if (isNextReq && nextApi) {
                    const nextUi = toUiDate(nextApi);
                    setNextDate(nextUi);
                    setNextPickerVal(fromUiToDate(nextUi));
                  } else {
                    setNextDate('');
                  }
                  // Scroll to top when editing
                  setTimeout(() => {
                    if (scrollViewRef.current) {
                      try {
                        scrollViewRef.current.scrollTo({ y: 0, animated: true });
                      } catch (e) {
                        try {
                          scrollViewRef.current.scrollToOffset({ y: 0, animated: true });
                        } catch (e2) {
                        }
                      }
                    } else {
                    }
                  }, 100);
                }}
                onDelete={() => handleDeleteConfirm(r)}
              />
            ))}
          </View>

          {/* Bottom Pagination */}
          {totalRecords > 0 && (
            <View style={[styles.paginationContainer, { marginTop: hp(1) }]}>
              <Text style={styles.pageInfo}>
                Showing {totalRecords === 0 ? 0 : currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalRecords)} of {totalRecords} entries
              </Text>

              <View style={styles.pageNavigation}>
                {pageItems.map((it, idx) => {
                  if (it === 'prev') {
                    const disabled = currentPage === 0;
                    return (
                      <TouchableOpacity key={`prev-${idx}`} style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]} disabled={disabled} onPress={() => handlePageChange(currentPage - 1)}>
                        <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Previous</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (it === 'next') {
                    const disabled = currentPage >= totalPages - 1;
                    return (
                      <TouchableOpacity key={`next-${idx}`} style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]} disabled={disabled} onPress={() => handlePageChange(currentPage + 1)}>
                        <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Next</Text>
                      </TouchableOpacity>
                    );
                  }
                  if (it === 'left-ellipsis' || it === 'right-ellipsis') {
                    return (
                      <View key={`dots-${idx}`} style={styles.pageDots}><Text style={styles.pageText}>...</Text></View>
                    );
                  }
                  const pageNum = it;
                  const active = pageNum === currentPage + 1;
                  return (
                    <TouchableOpacity key={`p-${pageNum}`} style={[styles.pageNumberBtn, active && styles.pageNumberBtnActive]} onPress={() => handlePageChange(pageNum - 1)}>
                      <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{pageNum}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <DatePickerBottomSheet
        isVisible={openPicker}
        onClose={() => setOpenPicker(false)}
        selectedDate={pickerVal}
        onDateSelect={(d) => {
          setPickerVal(d);
          setDate(formatUiDate(d));
          if (errors.date) setErrors((e) => ({ ...e, date: null }));
        }}
        title="Select Follow Up Date"
        minDate={new Date()}
      />
      <DatePickerBottomSheet
        isVisible={openNextPicker}
        onClose={() => setOpenNextPicker(false)}
        selectedDate={nextPickerVal}
        onDateSelect={(d) => {
          setNextPickerVal(d);
          setNextDate(formatUiDate(d));
          if (errors.nextDate) setErrors((e) => ({ ...e, nextDate: null }));
        }}
        title="Select Next Follow Up Date"
        minDate={pickerVal ? new Date(pickerVal.getTime() + 24 * 60 * 60 * 1000) : new Date()}
      />

      {/* Delete Confirmation Bottom Sheet */}
      <BottomSheetConfirm
        visible={deleteConfirmVisible}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setFollowUpToDelete(null);
        }}
        onConfirm={handleDeleteConfirmAction}
        title="Delete Follow-up"
        message="Are you sure you want to delete this follow-up?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </View>
  );
};

export default ManageLeadFollowUp;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    // paddingTop: safeAreaTop,
  },
  container: {
    paddingHorizontal: wp(4),
    paddingBottom: wp(1),
  },
  field: {
    marginTop: hp(1.2),
  },
  inputLabel: {
    fontSize: rf(3.2),
    color: '#111827',
    fontWeight: '600',
    marginTop: hp(1.2),
    marginBottom: hp(0.6),
  },
  inputBox: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.8),
    minHeight: hp(6.5),
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorBorder: {
    borderColor: '#ef4444',
    borderWidth: 1.2,
  },
  errorText: {
    color: '#ef4444',
    marginTop: hp(0.4),
    fontSize: rf(3),
  },
  textInput: {
    flex: 1,
    fontSize: rf(3.2),
    color: '#111827',
    paddingVertical: 0,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(1.2),
    marginBottom: hp(1),
  },
  checkbox: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(1.8),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: wp(2),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxLabel: {
    fontSize: rf(3.2),
    color: '#111827',
  },
  addBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2),
    marginTop: hp(1),
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: rf(3.2),
  },
  table: {
    marginTop: hp(1.5),
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: wp(2),
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  thCell: { width: '33.33%', paddingVertical: hp(1), paddingHorizontal: wp(2) },
  thText: { fontSize: rf(3.2), fontWeight: '700', color: '#1F2937' },
  trRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tdCell: { width: '33.33%', paddingVertical: hp(1), paddingHorizontal: wp(2) },
  tdText: { fontSize: rf(3.2), color: '#374151' },
  cancelBtn: {
    backgroundColor: '#111827',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2),
  },
  cancelBtnText: { color: '#fff', fontWeight: '700', fontSize: rf(3.2) },
  apiErrorWrap: {
    flex: 1,
    minHeight: hp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiErrorText: {
    color: 'gray',
    fontSize: rf(2.8),
    marginTop: hp(0.6),
    textAlign: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Pagination styles
  paginationContainer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: '#e5e7eb',
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    position: 'relative',
    zIndex: 1000,
    elevation: 2,
    marginHorizontal: wp(-3.4),
  },
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
    position: 'relative',
    zIndex: 1000,
  },
  paginationLabel: {
    fontSize: rf(3.5),
    color: '#111827',
    marginRight: wp(2),
  },
  paginationDropdown: {
    width: wp(18),
    height: hp(5),
    marginHorizontal: wp(1),
    zIndex: 1000,
    position: 'relative',
    elevation: 4,
  },
  pageInfo: {
    fontSize: rf(3.5),
    color: '#6b7280',
    marginBottom: hp(1),
    textAlign: 'center',
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  pageButtonTextual: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    backgroundColor: '#ffffff',
  },
  pageText: {
    fontSize: rf(3.5),
    color: '#e34f25',
    fontWeight: '600',
  },
  pageTextDisabled: {
    color: '#9ca3af',
  },
  pageDots: {
    paddingHorizontal: wp(2),
  },
  pageButtonDisabled: {
    opacity: 0.5,
  },
  pageNumberBtn: {
    minWidth: wp(8),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2.4),
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  pageNumberBtnActive: {
    backgroundColor: '#e34f25',
    borderColor: '#e34f25',
  },
  pageNumberText: {
    fontSize: rf(3.6),
    color: '#e34f25',
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
});

// Collapsible FollowUpCard copied in spirit from proposal card
const FollowUpCard = ({ data, onEdit, onDelete, isOpen = false, onToggle }) => {
  return (
    <View style={cardStyles.card}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => onToggle && onToggle()}>
        <View style={cardStyles.header}>
          <View style={cardStyles.headerLeft}>
            <View style={{ width: wp(3.5), height: wp(3.5), borderRadius: wp(2), backgroundColor: '#3b82f6' }} />
            <View style={{ marginLeft: wp(2) }}>
              <Text style={cardStyles.subtitle}>FOLLOW UP</Text>
              <Text style={cardStyles.title} numberOfLines={1}>{data.taker}</Text>
            </View>
          </View>
          <Icon name={isOpen ? 'expand-less' : 'expand-more'} size={rf(4.2)} color="#64748B" />
        </View>
      </TouchableOpacity>
      {isOpen && (
        <View style={cardStyles.body}>
          <View style={cardStyles.row}><Text style={cardStyles.label}>Follow Up Taker</Text><Text style={cardStyles.value}>{data.taker}</Text></View>
          <View style={cardStyles.row}><Text style={cardStyles.label}>Follow Date</Text><Text style={cardStyles.value}>{data.displayDate}</Text></View>
          <View style={cardStyles.row}><Text style={cardStyles.label}>Follow Up Type</Text><Text style={cardStyles.value}>{data.type}</Text></View>
          <View style={cardStyles.actions}>
            <TouchableOpacity activeOpacity={0.9} style={cardStyles.btnOutlineSuccess} onPress={onEdit}>
              <Icon name="edit" size={rf(3.6)} color={COLORS.edit} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} style={cardStyles.btnOutlineDanger} onPress={() => onDelete && onDelete()}>
              <Icon name="delete" size={rf(3.6)} color={COLORS.delete} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const cardStyles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: wp(2), borderWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: wp(3), paddingVertical: hp(1.5), marginTop: hp(1.2) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: wp(2), flex: 1 },
  title: { fontSize: rf(3.6), color: '#111827', fontWeight: '700' },
  subtitle: { fontSize: rf(3.0), color: '#6b7280', fontWeight: '600' },
  body: { marginTop: hp(0.6) },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: hp(0.6) },
  label: { fontSize: rf(3.0), color: '#6b7280', fontWeight: '500' },
  value: { fontSize: rf(3.2), color: '#111827', fontWeight: '600' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: wp(3), marginTop: hp(0.8) },
  btnOutlineSuccess: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: '#16a34a', paddingVertical: hp(1.1), paddingHorizontal: wp(6), borderRadius: wp(2) },
  btnOutlineSuccessText: { color: '#16a34a', fontWeight: '700' },
  btnOutlineDanger: { flex: 1, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2, borderColor: '#ef4444', paddingVertical: hp(1.1), paddingHorizontal: wp(6), borderRadius: wp(2) },
  btnOutlineDangerText: { color: '#ef4444', fontWeight: '700' },
});


