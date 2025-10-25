import React, { useMemo, useState, useCallback, useEffect, useRef  } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, PermissionsAndroid, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { COLORS, formStyles, buttonStyles, TYPOGRAPHY, inputStyles, SPACING } from '../styles/styles';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import Dropdown from '../../components/common/Dropdown';
import AppHeader from '../../components/common/AppHeader';
import BottomSheetConfirm from '../../components/common/BottomSheetConfirm';
import { addLeadProposal, updateLeadProposal, deleteLeadProposal, getEmployees, getLeadProposalsList } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import DatePickerBottomSheet from '../../components/common/CustomDatePicker';
import { pick, types, isCancel } from '@react-native-documents/picker';
import PdfViewer from '../../components/common/FileViewerScreen';
import { useNavigation } from '@react-navigation/native';
import ImageViewerScreen from '../../components/common/ImageViewerScreen.jsx';

const formatUiDate = (date) => {
  const d = new Date(date);
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

// Convert various input formats to yy-mm-dd for API
// Supports: yyyy-mm-dd, dd-mm-yy, dd-mm-yyyy
const toApiDateYY = (value) => {
  try {
    const s = String(value || '').trim();
    if (!s) return '';
    // yyyy-mm-dd -> yy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [yyyy, mm, dd] = s.split('-');
      const yy = yyyy.slice(-2);
      return `${yy}-${mm}-${dd}`;
    }
    // dd-mm-yy -> yy-mm-dd
    if (/^\d{2}-\d{2}-\d{2}$/.test(s)) {
      const [dd, mm, yy] = s.split('-');
      return `${yy}-${mm}-${dd}`;
    }
    // dd-mm-yyyy -> yy-mm-dd
    if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      const [dd, mm, yyyy] = s.split('-');
      const yy = String(yyyy).slice(-2);
      return `${yy}-${mm}-${dd}`;
    }
    // fallback: return as-is
    return s;
  } catch (_e) {
    return String(value || '');
  }
};

// Convert yyyy-mm-dd | dd-mm-yy | dd-mm-yyyy -> ISO string (UTC noon) "YYYY-MM-DDTHH:mm:ss.sssZ"
const toApiDateISO = (value) => {
  try {
    const s = String(value || '').trim();
    if (!s) return '';
    let y, m, d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      // yyyy-mm-dd
      const [yyyy, mm, dd] = s.split('-');
      y = Number(yyyy); m = Number(mm); d = Number(dd);
    } else if (/^\d{2}-\d{2}-\d{2}$/.test(s)) {
      // dd-mm-yy
      const [dd, mm, yy] = s.split('-');
      y = Number(`20${yy}`); m = Number(mm); d = Number(dd);
    } else if (/^\d{2}-\d{2}-\d{4}$/.test(s)) {
      // dd-mm-yyyy
      const [dd, mm, yyyy] = s.split('-');
      y = Number(yyyy); m = Number(mm); d = Number(dd);
    } else if (!isNaN(Date.parse(s))) {
      // already ISO or parseable
      return new Date(s).toISOString();
    } else {
      return s;
    }
    // Use UTC noon to avoid timezone shifting to previous day
    const iso = new Date(Date.UTC(y, (m - 1), d, 12, 0, 0)).toISOString();
    return iso;
  } catch (_e) {
    return String(value || '');
  }
};

const resolveEmployeeName = (emp) => emp?.EmployeeName || emp?.Name || emp?.DisplayName || emp?.FullName || '';
const resolveEmployeeKey = (emp) => emp?.Uuid || emp?.UUID || emp?.EmployeeUUID || emp?.EmpUuid || resolveEmployeeName(emp);

const ManageLeadProposal = ({ navigation, route }) => {
  const [followUpTaker, setFollowUpTaker] = useState(null);
  const [submittedDate, setSubmittedDate] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [amount, setAmount] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [title, setTitle] = useState('');
  const [proposalNumber, setProposalNumber] = useState('');
  const [isFinal, setIsFinal] = useState(false);

  const [openSubmitted, setOpenSubmitted] = useState(false);
  const [openFollow, setOpenFollow] = useState(false);
  const [submittedVal, setSubmittedVal] = useState(new Date());
  const [followVal, setFollowVal] = useState(new Date());
  const [proposalDoc, setProposalDoc] = useState(null);
  const [errors, setErrors] = useState({});
  const [employees, setEmployees] = useState([]);
  const [pendingFollowUpTakerName, setPendingFollowUpTakerName] = useState('');
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [apiError, setApiError] = useState('');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState(null);
  const scrollViewRef = useRef(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoadingEmployees(true);
        const resp = await getEmployees();
        const list = Array.isArray(resp?.Data) ? resp.Data : [];
        setEmployees(list);
        // Pre-fill customer name from route if provided
        const initialCustomer = route?.params?.initialCustomerName;
        if (initialCustomer) {
          setCustomerName((prev) => prev || String(initialCustomer));
        }

        // Default FollowUpTaker: prefer explicit initial taker, then Opportunity Owner (UUID first, then name)
        const initialUuid = route?.params?.initialFollowUpTakerUuid
          || route?.params?.opportunityOwnerUuid
          || route?.params?.OpportunityOwnerFromKSP_UUID
          || route?.params?.ownerUuid
          || route?.params?.OppOwnerUuid
          || route?.params?.OppOwnerUUID
          || '';

        const initialName = route?.params?.initialFollowUpTakerName
          || route?.params?.opportunityOwnerName
          || route?.params?.ownerName
          || route?.params?.OppOwner
          || '';

        if (!followUpTaker && (initialUuid || initialName)) {
          let found = null;
          if (initialUuid) {
            const targetUuid = String(initialUuid).trim().toLowerCase();
            found = list.find((e) => String(resolveEmployeeKey(e)).trim().toLowerCase() === targetUuid) || null;
          }
          if (!found && initialName) {
            const target = String(initialName).trim().toLowerCase();
            found = list.find((e) => {
              const name = String(resolveEmployeeName(e)).trim().toLowerCase();
              if (name === target) return true;
              if (name.includes(target) || target.includes(name)) return true;
              const nf = name.split(' ')[0];
              const tf = target.split(' ')[0];
              return nf && tf && nf === tf;
            }) || null;
          }
          if (found) {
            setFollowUpTaker(found);
            setPendingFollowUpTakerName('');
          } else if (initialName) {
            setPendingFollowUpTakerName(String(initialName));
          }
        }
      } catch (e) {
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };
    load();
  }, []);

  // After employees load or when editing changes, auto-select follow up taker for current proposal
  React.useEffect(() => {
    if (!employees?.length || !isEditMode || !editingProposal) return;
    const uuid = editingProposal.followUpTakerUuid || editingProposal.Followup_Taker_UUID;
    const nameRaw = editingProposal.followUpTakerName || editingProposal.FollowUpTakerName || editingProposal.Followup_Taker_Name || pendingFollowUpTakerName;
    let found = null;
    if (uuid) {
      const targetUuid = String(uuid).trim().toLowerCase();
      found = employees.find((e) => String(resolveEmployeeKey(e)).trim().toLowerCase() === targetUuid) || null;
    }
    if (!found && nameRaw) {
      const target = String(nameRaw).trim().toLowerCase();
      if (target) {
        found = employees.find((e) => {
          const n = String(resolveEmployeeName(e)).trim().toLowerCase();
          if (n === target) return true;
          if (n.includes(target) || target.includes(n)) return true;
          const nf = n.split(' ')[0];
          const tf = target.split(' ')[0];
          return nf && tf && nf === tf;
        }) || null;
      }
    }
    if (found) {
      setFollowUpTaker(found);
      setPendingFollowUpTakerName('');
    }
  }, [employees, isEditMode, editingProposal, pendingFollowUpTakerName]);
  const initialOpportunityTitle = route?.params?.initialOpportunityTitle
  // Non-edit: once employees load, auto-select default Follow Up Taker (initial taker or Opportunity Owner)
  React.useEffect(() => {
    if (!employees?.length) return;
    if (isEditMode) return;
    if (followUpTaker) return;
    const ownerUuid = route?.params?.initialFollowUpTakerUuid
      || route?.params?.opportunityOwnerUuid
      || route?.params?.OpportunityOwnerFromKSP_UUID
      || route?.params?.ownerUuid
      || route?.params?.OppOwnerUuid
      || route?.params?.OppOwnerUUID
      || route?.params?.lead?.opportunityOwnerUuid
      || route?.params?.lead?.OppOwnerUuid
      || route?.params?.lead?.OppOwnerUUID
      || '';

    const ownerName = route?.params?.initialFollowUpTakerName
      || route?.params?.opportunityOwnerName
      || route?.params?.ownerName
      || route?.params?.OppOwner
      || route?.params?.lead?.opportunityOwnerName
      || route?.params?.lead?.OppOwner
      || pendingFollowUpTakerName
      || '';

    let found = null;
    if (ownerUuid) {
      const targetUuid = String(ownerUuid).trim().toLowerCase();
      found = employees.find((e) => String(resolveEmployeeKey(e)).trim().toLowerCase() === targetUuid) || null;
    }
    if (!found && ownerName) {
      const target = String(ownerName).trim().toLowerCase();
      found = employees.find((e) => String(resolveEmployeeName(e)).trim().toLowerCase() === target) || null;
    }
    if (found) {
      setFollowUpTaker(found);
      setPendingFollowUpTakerName('');
    }
  }, [employees, isEditMode, followUpTaker, route?.params, pendingFollowUpTakerName]);

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

  // Cards: proposals list
  const [proposals, setProposals] = useState([]);
  const [loadingProposals, setLoadingProposals] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  // Edit functionality
  const [editingProposal, setEditingProposal] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Store all proposals and paginate on client side
  const [allProposals, setAllProposals] = useState([]);

  // Fetch all proposals from API (no pagination)
  const fetchProposals = useCallback(async () => {
    try {
      setLoadingProposals(true);
      const leadUuid = route?.params?.leadUuid;

      if (!leadUuid) {
        setAllProposals([]);
        setProposals([]);
        setTotalRecords(0);
        return;
      }

      const [cmpUuid, envUuid] = await Promise.all([getCMPUUID(), getENVUUID()]);

      const response = await getLeadProposalsList({
        leadUuid,
        overrides: { cmpUuid, envUuid }
      });

      const proposalsList = Array.isArray(response?.Data) ? response.Data : [];

      const mappedProposals = proposalsList.map((proposal, idx) => {
        return {
          id: String(proposal?.UUID || idx + 1),
          proposalNumber: proposal?.Proposal_Number || '',
          title: proposal?.Title || '',
          customerName: proposal?.Customer_Name || '',
          followUpTakerName: proposal?.FollowUpTakerName || proposal?.Followup_Taker_Name || '',
          followUpTakerUuid: proposal?.Followup_Taker_UUID || proposal?.Followup_Taker_Uuid || proposal?.FollowupTakerUuid || '', // include UUID if provided by API
          amount: Number(proposal?.Amount || 0),
          submittedDate: proposal?.Submitted_Date || '',
          followUpDate: proposal?.Followup_Date || '',
          isFinal: Boolean(proposal?.Final_Proposal),
          status: 'Submitted', // Default status since not in API response
          documentName: proposal?.ProposalDocument || '',
          documentUri: proposal?.ProposalDocument || '',
        };
      });

      setAllProposals(mappedProposals);
      setTotalRecords(mappedProposals.length);
      if (!Array.isArray(proposalsList) || proposalsList.length === 0) {
        const msg = response?.Message || 'No proposals found';
        setApiError(String(msg));
      } else {
        setApiError('');
      }
    } catch (e) {
      setAllProposals([]);
      setProposals([]);
      setTotalRecords(0);
      const msg = (e?.response?.data?.Message) || (e?.response?.data?.message) || (e?.message) || 'Failed to load proposals';
      setApiError(String(msg));
    } finally {
      setLoadingProposals(false);
    }
  }, [route?.params?.leadUuid]);

  // Load proposals when component mounts
  useEffect(() => {
    fetchProposals();
  }, [route?.params?.leadUuid]);

  // Client-side pagination effect
  useEffect(() => {
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedProposals = allProposals.slice(startIndex, endIndex);
    setProposals(paginatedProposals);
  }, [allProposals, currentPage, itemsPerPage]);

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

  const handleDeleteConfirm = (proposal) => {
    setProposalToDelete(proposal);
    setDeleteConfirmVisible(true);
  };

  const handleDeleteConfirmAction = async () => {
    if (!proposalToDelete) return;
    
    try {
      const [userUuid, cmpUuid, envUuid] = await Promise.all([getUUID(), getCMPUUID(), getENVUUID()]);
      await deleteLeadProposal({ 
        leadOppUuid: proposalToDelete.id, 
        overrides: { userUuid, cmpUuid, envUuid } 
      });
      await fetchProposals();
    } catch (e) {
    } finally {
      setDeleteConfirmVisible(false);
      setProposalToDelete(null);
    }
  };

  // Actions
  const validate = () => {
    const next = {};
    if (!followUpTaker) next.followUpTaker = 'Follow up taker is required';
    if (!submittedDate) next.submittedDate = 'Submitted date is required';
    if (!followUpDate) next.followUpDate = 'Follow up date is required';
    if (!amount || isNaN(Number(amount))) next.amount = 'Amount is required';
    if (!customerName) next.customerName = 'Customer name is required';
    if (!title) next.title = 'Title is required';
    if (!proposalNumber) next.proposalNumber = 'Proposal number is required';
    if (!proposalDoc?.name) next.proposalDoc = 'Proposal document is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const addProposal = async () => {
    if (!validate()) return;
    const next = {
      id: `p-${Date.now()}`,
      proposalNumber: proposalNumber || `PR-${Math.floor(Math.random() * 9000) + 1000}`,
      title: title || 'New Proposal',
      customerName: customerName || 'Unknown',
      amount: Number(amount) || 0,
      submittedDate: submittedDate || formatUiDate(new Date()),
      followUpDate: followUpDate || formatUiDate(new Date()),
      isFinal,
      status: 'Submitted',
      documentName: proposalDoc?.name || '',
      documentUri: proposalDoc?.uri || '',
    };
    try {
      setIsAdding(true);
      setApiError('');
      const payload = {
        Proposal_Number: proposalNumber,
        Title: title,
        Customer_Name: customerName,
        // send file object for multipart
        ProposalDocumentFile: proposalDoc ? { uri: proposalDoc?.uri, name: proposalDoc?.name, type: proposalDoc?.type } : undefined,
        Followup_Taker_Name: resolveEmployeeKey(followUpTaker) || '',
        Followup_Date: toApiDateISO(followUpDate),
        Submitted_Date: toApiDateISO(submittedDate),
        Amount: Number(amount),
        FinalProposal: Boolean(isFinal),
      };

      const [userUuid, cmpUuid, envUuid] = await Promise.all([getUUID(), getCMPUUID(), getENVUUID()]);
      const leadUuid = route?.params?.leadUuid || next.id;
      await addLeadProposal({ leadOppUuid: leadUuid, payload, overrides: { userUuid, cmpUuid, envUuid } });
      // Refresh proposals list from API
      await fetchProposals();
      setErrors({});
    } catch (e) {
      const msg = (e?.response?.data?.Message) || (e?.response?.data?.message) || (e?.message) || 'Something went wrong';
      setApiError(String(msg));
    } finally {
      setIsAdding(false);
    }
    await fetchProposals();
    setIsAdding(false);
    setErrors({});
    setProposalDoc(null);
    setFollowUpTaker(null);
    setSubmittedDate('');
    setFollowUpDate('');
    setAmount('');
    setCustomerName('');
    setTitle('');
    setProposalNumber('');
    setIsFinal(false);
  };

  const pickProposalDocument = async () => {
    try {
      const hasPerm = await requestStoragePermissionAndroid();
      if (!hasPerm) {
        Alert.alert('Permission required', 'Storage permission is needed to pick a file.');
        return;
      }

      const [file] = await pick({
        type: [types.pdf, types.images],
        allowMultiSelection: false
      });

      if (file) {
        // Validate file type
        const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
        if (!allowedTypes.includes(file.type)) {
          Alert.alert('Invalid File Type', 'Please select a PDF, PNG, or JPG file.');
          return;
        }

        // Validate file size (10MB = 10 * 1024 * 1024 bytes)
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size && file.size > maxSize) {
          Alert.alert('File Too Large', 'File size must be less than 10MB.');
          return;
        }

        // Set the selected document
        setProposalDoc({
          name: file.name,
          uri: file.uri,
          type: file.type,
          size: file.size,
        });
      }
    } catch (err) {
      if (isCancel && isCancel(err)) {
        return;
      }
      console.warn('Document pick error:', err);
      //  Alert.alert('Document Picker Error', String(err?.message || err));
    }
  };

  const clearProposalDocument = () => {
    setProposalDoc(null);
  };


  const editProposal = (proposal) => {
    setEditingProposal(proposal);
    setIsEditMode(true);

    // Pre-fill form with proposal data
    // Try to bind Follow Up Taker by UUID first (if available), otherwise by name
    const followUpTakerUuid = proposal.followUpTakerUuid || proposal.Followup_Taker_UUID;
    const followUpTakerName = proposal.followUpTakerName || proposal.Followup_Taker_Name || proposal.customerName;


    let foundEmployee = null;
    if (followUpTakerUuid && employees?.length) {
      foundEmployee = employees.find(emp => String(resolveEmployeeKey(emp)).trim() === String(followUpTakerUuid).trim()) || null;
    }
    if (!foundEmployee && followUpTakerName && employees?.length) {
      const targetName = String(followUpTakerName).toLowerCase().trim();
      foundEmployee = employees.find(emp => {
        const empName = String(resolveEmployeeName(emp)).toLowerCase().trim();
        return empName === targetName || empName.includes(targetName) || targetName.includes(empName);
      }) || null;
    }

    if (foundEmployee) {
      setFollowUpTaker(foundEmployee);
    } else {
      // Defer selection until employees are available
      setPendingFollowUpTakerName(followUpTakerName || '');
      setFollowUpTaker(null);
    }

    setSubmittedDate(proposal.submittedDate);
    setFollowUpDate(proposal.followUpDate);
    setAmount(String(proposal.amount));
    setCustomerName(proposal.customerName);
    setTitle(proposal.title);
    setProposalNumber(proposal.proposalNumber);
    setIsFinal(proposal.isFinal);
    setProposalDoc(proposal.documentName ? { name: proposal.documentName } : null);

    // Clear any existing errors
    setErrors({});
    
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
  };

  const updateProposal = async () => {
    if (!validate()) return;

    try {
      setIsUpdating(true);
      setApiError('');
      const payload = {
        Proposal_Number: proposalNumber,
        Title: title,
        Customer_Name: customerName,
        Followup_Taker_Name: resolveEmployeeKey(followUpTaker) || '',
        Followup_Date: toApiDateISO(followUpDate),
        Submitted_Date: toApiDateISO(submittedDate),
        Amount: Number(amount),
        FinalProposal: Boolean(isFinal),
        // Handle document update - if new document is selected, use it; otherwise keep existing
        ProposalDocument: proposalDoc && proposalDoc.uri ? {
          uri: proposalDoc.uri,
          name: proposalDoc.name,
          type: proposalDoc.type
        } : undefined,
      };

      const [userUuid, cmpUuid, envUuid] = await Promise.all([getUUID(), getCMPUUID(), getENVUUID()]);
      const leadUuid = route?.params?.leadUuid;
      await updateLeadProposal({
        proposalUuid: editingProposal.id,
        leadUuid: leadUuid,
        payload,
        overrides: { userUuid, cmpUuid, envUuid }
      });

      // Refresh proposals list from API
      await fetchProposals();
      setIsEditMode(false);
      setEditingProposal(null);

      // Reset form
      setFollowUpTaker(null);
      setSubmittedDate('');
      setFollowUpDate('');
      setAmount('');
      setCustomerName('');
      setTitle('');
      setProposalNumber('');
      setIsFinal(false);
      setProposalDoc(null);
      setErrors({});
    } catch (e) {
      const msg = (e?.response?.data?.Message) || (e?.response?.data?.message) || (e?.message) || 'Something went wrong';
      setApiError(String(msg));
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteProposal = (proposal) => {
    handleDeleteConfirm(proposal);
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditingProposal(null);
    // Reset form
    setFollowUpTaker(null);
    setSubmittedDate('');
    setFollowUpDate('');
    setAmount('');
    setCustomerName('');
    setTitle('');
    setProposalNumber('');
    setIsFinal(false);
    setProposalDoc(null);
    setErrors({});
  };

  return (
    <View style={styles.safeArea}>
      <AppHeader title="Manage Lead Proposal" onLeftPress={() => navigation.goBack()} />

      <ScrollView ref={scrollViewRef} showsVerticalScrollIndicator={false}>
        <View style={formStyles.container}>
          <View style={{ ...styles.field, }} >
          <Dropdown
            placeholder="Follow Up Taker*"
            value={followUpTaker ? resolveEmployeeName(followUpTaker) : (pendingFollowUpTakerName || '')}
            options={employees}
            getLabel={resolveEmployeeName}
            getKey={resolveEmployeeKey}
            hint="Follow Up Taker*"
            onSelect={(v) => {
              setFollowUpTaker(v);
              setPendingFollowUpTakerName(''); // Clear pending name when manually selected
              if (errors.followUpTaker) setErrors((e) => ({ ...e, followUpTaker: null }));
            }}
            inputBoxStyle={[inputStyles.box, errors.followUpTaker && styles.errorBorder]}
            textStyle={{ fontSize: rf(4.2), marginLeft: 0, paddingLeft: 0 }}
            loading={loadingEmployees}
          />
          {errors.followUpTaker ? <Text style={styles.errorText}>{errors.followUpTaker}</Text> : null}
        </View>

        {/* Submitted Date */}
        <View style={{ ...styles.field, marginTop: 15 }} >
          <TouchableOpacity activeOpacity={0.85} style={[inputStyles.box, { marginTop: 0 }, errors.submittedDate && styles.errorBorder]} onPress={() => setOpenSubmitted(true)}>
            <Text style={[inputStyles.input, { fontSize: rf(4.2), marginLeft: SPACING.sm }, !submittedDate && { color: '#9ca3af', fontFamily: TYPOGRAPHY.fontFamilyRegular }]}>{submittedDate || 'Submitted Date*'}</Text>
            <Icon name="calendar-today" size={rf(3.2)} color="#9ca3af" />
          </TouchableOpacity>
          {errors.submittedDate ? <Text style={styles.errorText}>{errors.submittedDate}</Text> : null}
        </View>

        {/* Amount */}
        <View style={[inputStyles.box, styles.field, errors.amount && styles.errorBorder]}>
          <TextInput
            style={[inputStyles.input, { fontSize: rf(4.2) }]}
            placeholder="Amount*"
            placeholderTextColor="#9ca3af"
            value={amount}
            keyboardType="numeric"
            onChangeText={(t) => { setAmount(t); if (errors.amount) setErrors((e) => ({ ...e, amount: null })); }}
          />
        </View>
        {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}

        {/* Follow Up Date */}
        <View style={styles.field}>
          <TouchableOpacity activeOpacity={0.85} style={[inputStyles.box, { marginTop: 0 }, errors.followUpDate && styles.errorBorder]} onPress={() => setOpenFollow(true)}>
            <Text style={[inputStyles.input, { fontSize: rf(4.2), marginLeft: SPACING.sm }, !followUpDate && { color: '#9ca3af', fontFamily: TYPOGRAPHY.fontFamilyRegular }]}>{followUpDate || 'Follow Up Date*'}</Text>
            <Icon name="calendar-today" size={rf(3.2)} color="#9ca3af" />
          </TouchableOpacity>
          {errors.followUpDate ? <Text style={styles.errorText}>{errors.followUpDate}</Text> : null}
        </View>

        {/* Customer Name */}
        <View style={[inputStyles.box, styles.field, errors.customerName && styles.errorBorder]}>
          <TextInput
            style={[inputStyles.input, { fontSize: rf(4.2) }]}
            placeholder="Customer Name*"
            placeholderTextColor="#9ca3af"
            value={customerName}
            onChangeText={(t) => { setCustomerName(t); if (errors.customerName) setErrors((e) => ({ ...e, customerName: null })); }}
          />
        </View>
        {errors.customerName ? <Text style={styles.errorText}>{errors.customerName}</Text> : null}

        {/* Title */}
        <View style={[inputStyles.box, styles.field, errors.title && styles.errorBorder]}>
          <TextInput
            style={[inputStyles.input, { fontSize: rf(4.2) }]}
            placeholder="Title*"
            placeholderTextColor="#9ca3af"
            value={title}
            onChangeText={(t) => { setTitle(t); if (errors.title) setErrors((e) => ({ ...e, title: null })); }}
          />
        </View>
        {errors.title ? <Text style={styles.errorText}>{errors.title}</Text> : null}

        {/* Proposal Number */}
        <View style={[inputStyles.box, styles.field, errors.proposalNumber && styles.errorBorder]}>
          <TextInput
            style={[inputStyles.input, { fontSize: rf(4.2) }]}
            placeholder="Proposal Number*"
            placeholderTextColor="#9ca3af"
            value={proposalNumber}
            onChangeText={(t) => { setProposalNumber(t); if (errors.proposalNumber) setErrors((e) => ({ ...e, proposalNumber: null })); }}
          />
        </View>
        {errors.proposalNumber ? <Text style={styles.errorText}>{errors.proposalNumber}</Text> : null}

        {/* Proposal Document Upload */}
        <View style={[inputStyles.box, styles.field, errors.proposalDoc && styles.errorBorder]}>
          <TextInput
            style={[inputStyles.input, { fontSize: rf(4.2) }]}
            placeholder="Proposal Document*"
            placeholderTextColor="#9ca3af"
            value={proposalDoc?.name || ''}
            editable={false}
          />
          {proposalDoc ? (
            <TouchableOpacity activeOpacity={0.85} onPress={clearProposalDocument}>
              <Icon name="close" size={rf(3.6)} color="#ef4444" style={{ marginRight: SPACING.sm }} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity activeOpacity={0.8} style={[styles.uploadButton, { marginRight: SPACING.sm }]} onPress={pickProposalDocument}>
              <Icon name="cloud-upload" size={rf(4)} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
        {errors.proposalDoc ? <Text style={styles.errorText}>{errors.proposalDoc}</Text> : null}
        <Text style={styles.uploadHint}>Allowed: PDF, PNG, JPG • Max size 10 MB</Text>

        {/* Final Proposal Checkbox */}
        <View style={styles.containerChechbox}>
          <View style={styles.checkboxRow}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.checkbox, isFinal && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}
              onPress={() => setIsFinal((s) => !s)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isFinal }}
            >
              {isFinal ? <Icon name="check" size={rf(4.5)} color="#fff" /> : null}
            </TouchableOpacity>

            <Text style={styles.checkboxLabel}>Is this Final proposal</Text>
          </View>

          {/* Add/Update Button */}
          <View style={{ alignItems: 'flex-end' }}>
            {isEditMode ? (
              <TouchableOpacity activeOpacity={0.9} disabled={isUpdating} style={[formStyles.primaryBtn, styles.btn, isUpdating && { opacity: 0.6 }]} onPress={updateProposal}>
                <Text style={formStyles.primaryBtnText}>{isUpdating ? 'Updating...' : 'Update'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity activeOpacity={0.9} disabled={isAdding} style={[formStyles.primaryBtn, styles.btn, isAdding && { opacity: 0.6 }]} onPress={addProposal}>
                <Text style={formStyles.primaryBtnText}>{isAdding ? 'Adding...' : 'Add'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View> 

        {/* Pagination Controls */}
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
        </View>

        {/* Proposals (collapsible cards) */}
        <View style={{ marginTop: hp(2), flex: 1 }}>
          {loadingProposals ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading proposals...</Text>
            </View>
          ) : proposals.length > 0 ? (
            proposals.map((p) => (
              <ProposalCard opportunityTitle={initialOpportunityTitle} key={p.id} data={p} onEdit={editProposal} onDelete={deleteProposal} />
            ))
          ) : (
            <View style={[styles.emptyContainer, styles.apiErrorWrap]}>
              <Text style={styles.emptyText}>{apiError || 'No proposals found'}</Text>
            </View>
          )}
        </View>

        {/* Bottom Pagination */}
        {totalRecords > 0 && (
          <View style={styles.paginationContainer}>
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

      {/* Date Pickers */}
      <DatePickerBottomSheet
        isVisible={openSubmitted}
        onClose={() => setOpenSubmitted(false)}
        selectedDate={submittedVal}
        onDateSelect={(d) => {
          setSubmittedVal(d);
          setSubmittedDate(formatUiDate(d));
        }}
        title="Select Submitted Date"
        minDate={new Date()}
      />
      <DatePickerBottomSheet
        isVisible={openFollow}
        onClose={() => setOpenFollow(false)}
        selectedDate={followVal}
        onDateSelect={(d) => {
          setFollowVal(d);
          setFollowUpDate(formatUiDate(d));
        }}
        title="Select Follow Up Date"
        minDate={new Date()}
      />

      {/* Delete Confirmation Bottom Sheet */}
      <BottomSheetConfirm
        visible={deleteConfirmVisible}
        onCancel={() => { 
          setDeleteConfirmVisible(false);
          setProposalToDelete(null);
        }}
        onConfirm={() => {
          handleDeleteConfirmAction();
        }}
        title="Delete Proposal"
        message="Are you sure you want to delete this proposal?"
        confirmText="Delete"
        cancelText="Cancel"
      />
    </View>
  );
};

export default ManageLeadProposal;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    // paddingTop: safeAreaTop,
  },
  uploadButton: {
    backgroundColor: COLORS.primary,
    padding: wp(2.2),
    borderRadius: wp(2),
  },
  viewiconcolor: {
    color: 'green'
  },
  containerChechbox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  container: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(3),
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
    width: wp(5),
    height: wp(5),
    borderRadius: wp(1),
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: wp(2),
    backgroundColor: '#fff',
  },
  checkboxLabel: {
    fontSize: rf(3.2),
    color: '#111827',
  },
  addBtn: {
    backgroundColor: '#fb923c',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2),
    marginTop: hp(1.2),
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: rf(3.2),
  },
  // Cards
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: wp(3),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    marginTop: hp(1.2),
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRaised: {
    zIndex: 50,
    elevation: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    flex: 1,
  },
  cardTitle: {
    fontSize: rf(3.6),
    color: '#111827',
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: rf(3),
    color: '#6b7280',
    fontWeight: '600',
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.8),
  },
  cardLabel: {
    fontSize: rf(3.0),
    color: '#6b7280',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: rf(3.2),
    color: '#111827',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(3),
    marginTop: hp(1.2),
  },
  actionBtnOutlinePrimary: { borderWidth: 1.2, borderColor: '#3b82f6', paddingVertical: hp(1.1), paddingHorizontal: wp(10), borderRadius: wp(2) },
  actionBtnOutlinePrimaryText: { color: '#3b82f6', fontWeight: '700' },
  actionBtnOutlineDanger: { borderWidth: 1.2, borderColor: '#ef4444', paddingVertical: hp(1.1), paddingHorizontal: wp(10), borderRadius: wp(2) },
  actionBtnOutlineDangerText: { color: '#ef4444', fontWeight: '700' },
  viewIconBtn: { borderWidth: 1.2, borderColor: 'green', paddingVertical: hp(1.1), paddingHorizontal: wp(10), borderRadius: wp(2) },
  uploadHint: {
    marginTop: hp(0.6),
    color: '#6b7280',
    fontSize: rf(2.8),
    fontStyle: 'italic',
  },
  loadingContainer: {
    paddingVertical: hp(3),
    alignItems: 'center',
  },
  loadingText: {
    fontSize: rf(3.5),
    color: '#6b7280',
    fontStyle: 'italic',
  },
  emptyContainer: {
    paddingVertical: hp(3),
    alignItems: 'center',
  },
  emptyText: {
    fontSize: rf(3.5),
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  apiErrorWrap: {
    flex: 1,
    minHeight: hp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  debugButton: {
    backgroundColor: '#6b7280',
    paddingVertical: hp(1),
    paddingHorizontal: wp(6),
    borderRadius: wp(2),
    marginBottom: hp(1),
  },
  debugButtonText: {
    color: '#fff',
    fontSize: rf(3.2),
    fontWeight: '600',
  },
  cancelBtn: {
    backgroundColor: '#6b7280',
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2),
  },
  cancelBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: rf(3.2),
  },
  apiErrorText: {
    color: '#ef4444',
    fontSize: rf(2.8),
    marginTop: hp(0.8),
  },
  btn: {
    minHeight: hp(5.6),
    paddingVertical: hp(1.1),
    paddingHorizontal: wp(5.2),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // spacing helpers
  detailGroup: {
    marginTop: hp(1),
    paddingTop: hp(0.4),
    paddingBottom: hp(0.4),
    rowGap: hp(0.6),
  },
  cardDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.6),
    zIndex: 50,
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
    zIndex: 1000,
  },
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  paginationLabel: {
    fontSize: rf(3.5),
    color: '#374151',
    marginRight: wp(2),
  },
  paginationDropdown: {
    width: wp(18),
    height: hp(5),
    marginHorizontal: wp(1),
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
  // bottom sheet
  sheetBackdrop: {},
  sheetContainer: {},
  sheetTitle: {},
  sheetButton: {},
  sheetButtonText: {},
});

// Collapsible Proposal Card (default closed)
const statusOptions = ['Won', 'Lost', 'Cancelled', 'On Hold'];

const ProposalCard = ({ data, onEdit, onDelete, opportunityTitle }) => {
  const navigation = useNavigation();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(data);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const handleFileViewer = () => {
    const fileUrl = data.documentUri;
    const isNonEmptyString = typeof fileUrl === 'string' && fileUrl.trim().length > 0;
    if (!isNonEmptyString) {
      Alert.alert('File not available', 'No document found to preview.');
      return;
    }
    const dotIdx = fileUrl.lastIndexOf('.');
    if (dotIdx === -1) {
      Alert.alert('Unsupported file', 'Unable to determine file type.');
      return;
    }
    const extension = fileUrl.slice(dotIdx + 1).toLowerCase();
    if (extension === 'pdf') {
      navigation.navigate('FileViewerScreen', { pdfUrl: fileUrl, opportunityTitle: opportunityTitle });
    } else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
      navigation.navigate('ImageViewerScreen', { imageUrl: fileUrl, opportunityTitle: opportunityTitle });
    } else {
      Alert.alert('Unsupported file type', 'This file type cannot be opened.');
    }
  };

  return (
    <View style={[styles.card, isDropdownOpen && styles.cardRaised]}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => setOpen((s) => !s)}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={{ width: wp(3.5), height: wp(3.5), borderRadius: wp(2), backgroundColor: '#3b82f6' }} />
            <View style={{ marginLeft: wp(2) }}>
              <Text style={styles.cardSubtitle}>Title</Text>
              <Text style={styles.cardTitle} numberOfLines={1}>{data.title || data.proposalNumber}</Text>
            </View>
          </View>
          <Icon name={open ? 'expand-less' : 'expand-more'} size={rf(4.2)} color="#64748B" />
        </View>
      </TouchableOpacity>

      {open && (
        <View style={styles.detailGroup}>
          <View style={styles.cardDetailRow}>
            <Text style={styles.cardLabel}>Customer Name</Text>
            <Text style={styles.cardValue}>{data.customerName}</Text>
          </View>
          <View style={styles.cardDetailRow}>
            <Text style={styles.cardLabel}>Amount</Text>
            <Text style={styles.cardValue}>{`₹ ${data.amount.toLocaleString()}`}</Text>
          </View>
          <View style={styles.cardDetailRow}>
            <Text style={styles.cardLabel}>Submitted Date</Text>
            <Text style={styles.cardValue}>{data.submittedDate}</Text>
          </View>
          <View style={styles.cardDetailRow}>
            <Text style={styles.cardLabel}>Follow Up Date</Text>
            <Text style={styles.cardValue}>{data.followUpDate}</Text>
          </View>
          <View style={styles.cardDetailRow}>
            <Text style={styles.cardLabel}>Is this Final proposal</Text>
            <Text style={styles.cardValue}>{data.isFinal ? 'Yes' : 'No'}</Text>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.viewIconBtn}
              onPress={() => onEdit && onEdit(local)}
            >
              <Icon name="edit" size={rf(3.6)} color={COLORS.edit} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.actionBtnOutlineDanger}
              onPress={() => onDelete && onDelete(local)}
            >
              <Icon name="delete" size={rf(3.6)} color={COLORS.delete} />
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.9} style={styles.actionBtnOutlinePrimary} onPress={handleFileViewer}>
              <Icon name="visibility" size={rf(3.6)} color={COLORS.info} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};


