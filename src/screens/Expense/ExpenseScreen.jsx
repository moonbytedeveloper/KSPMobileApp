import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { TabContext } from '../../navigation/BottomTabs/TabContext';
import Dropdown from '../../components/common/Dropdown';
import AccordionItem from '../../components/common/AccordionItem';
import BottomSheetConfirm from '../../components/common/BottomSheetConfirm';
import AppHeader from '../../components/common/AppHeader';
import { useNavigation, DrawerActions, useFocusEffect } from '@react-navigation/native';
import { useUser } from '../../contexts/UserContext';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import Loader from '../../components/common/Loader';
import { fetchExpenses, fetchUserProjects, fetchUserProjectTasks, checkAddExpenseEligibility } from '../../api/authServices';


const sampleProjects = [];

const pageSizes = [10, 25, 50, 100];

const sampleExpenses = [];

const ExpenseScreen = ({ navigation }) => {
  const { setActiveIndex } = useContext(TabContext);
  const { userRole } = useUser();
  const isAdmin = userRole === 'admin';

  const [selectedProject, setSelectedProject] = useState(null); // { id, name }
  const [selectedTask, setSelectedTask] = useState(null); // string
  const [pageSize, setPageSize] = useState(10);
  const [activeCode, setActiveCode] = useState(null); // expanded accordion id
  const [expenses, setExpenses] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [pendingDeleteCode, setPendingDeleteCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [currentPage, setCurrentPage] = useState(0); // zero-based page index
  const [searchValue, setSearchValue] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [eligibilityVisible, setEligibilityVisible] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  // Dropdown open states to avoid overlap
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [isPageSizeDropdownOpen, setIsPageSizeDropdownOpen] = useState(false);
  // Status info bottom sheet
  const [statusSheet, setStatusSheet] = useState({ visible: false, title: '', message: '' });

  const availableTasks = useMemo(() => {
    if (!selectedProject) return [];
    return tasks;
  }, [selectedProject, tasks]);

  const filteredExpenses = useMemo(() => {
    const normalize = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
    const selProj = normalize(selectedProject?.name);
    const selTask = normalize(selectedTask);
    const term = normalize(searchValue);

    return expenses.filter((item) => {
      // Try multiple field names to be robust to backend shape
      const projVal = normalize(item.projectName || item.ProjectName || item.ProjectTitle || item.Project);
      const taskVal = normalize(item.projectTask || item.ProjectTask || item.TaskTitle || item.TaskName || item.Task);

      const projectMatches = selProj ? projVal === selProj : true;
      const taskMatches = selTask ? taskVal === selTask : true;

      if (!projectMatches || !taskMatches) return false;

      // Local text search across common fields
      if (!term) return true;
      const fields = [
        item.soleExpenseCode,
        item.expenseName,
        item.documentFromDate,
        item.documentToDate,
        item.amount,
        item.status,
        item.projectName,
        item.projectTask,
      ]
        .filter(Boolean)
        .map((v) => String(v).toLowerCase());

      return fields.some((f) => f.includes(term));
    });
  }, [expenses, selectedProject, selectedTask, searchValue]);

  // (moved loader return below hooks to avoid hook-order issues)

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedTask(null);
    // fetch tasks for this project
    (async () => {
      try {
        const resp = await fetchUserProjectTasks({ projectUuid: project?.id });
        console.log('[ExpenseScreen] fetchUserProjectTasks response:', resp);
        const raw = Array.isArray(resp?.Data) ? resp.Data : [];
        const taskOptions = raw
          .filter(t => t && t.Task_Title)
          .map((t, i) => String(t.Task_Title));
        setTasks(taskOptions);
      } catch (_e) {
        console.error('[ExpenseScreen] fetchUserProjectTasks error:', _e);
        setTasks([]);
      }
    })();
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
  };


  const handleToggle = (code) => {
    setActiveCode(prev => (prev === code ? null : code));
  };

  const handleView = (item) => {};
  const handleEdit = async (item) => {
    try {
      setLoading(true);
      // Only block editing when approval is applied
      const rd = item?.rawData || {};
      const isApprovalApply = rd?.IsApprovalApply === true || rd?.isApprovalApply === true || rd?.IsApprovalApplied === true || item?.IsApprovalApply === true || item?.isApprovalApply === true;
      const statusStr = String(item?.status || rd?.Status || '').trim().toLowerCase();
      if (isApprovalApply) {
        const isApproved = statusStr === 'approved';
        const isSubmitted = statusStr === 'submitted';
        setStatusSheet({
          visible: true,
          title: isApproved ? 'Already Approved' : 'Not allowed',
          message: isApproved
            ? 'This expense has been approved and cannot be edited.'
            : 'This expense is under approval and cannot be edited.'
        });
        return;
      }
      // Always allow edit if approval is not applied
      navigation.navigate('AddExpense', { 
        editMode: true, 
        expenseData: item,
        headerUuid: item.headerUuid
      });
    } catch (error) {
      console.error('Error navigating to edit expense:', error);
    } finally {
      setLoading(false);
    }
  };
  const handleDelete = (code) => {
    setPendingDeleteCode(code);
    setConfirmVisible(true);
  };

  const handleAddExpensePress = async () => {
    try {
      setLoading(true);
      const resp = await checkAddExpenseEligibility();
      const success = resp?.Success === true || resp?.success === true;
      const message = resp?.Message || resp?.message || 'You are not allowed to add expense.';
      if (success) {
        navigation.navigate('AddExpense');
      } else {
        setEligibilityMessage(String(message));
        setEligibilityVisible(true);
      }
    } catch (e) {
      const msg = e?.response?.data?.Message || e?.message || 'Failed to check eligibility.';
      setEligibilityMessage(String(msg));
      setEligibilityVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = () => {
    if (pendingDeleteCode) {
      setExpenses(prev => prev.filter(e => e.soleExpenseCode !== pendingDeleteCode));
      if (activeCode === pendingDeleteCode) {
        setActiveCode(null);
      }
    }
  };

  const closeConfirm = () => {
    // Defer state updates till after modal fully dismisses to avoid reopen race
    requestAnimationFrame(() => {
      setConfirmVisible(false);
      setPendingDeleteCode(null);
    });
  };

  const loadData = useCallback(async (page = currentPage, size = pageSize, search = searchValue) => {
    setLoading(true);
    setError(null);
    try {
      const start = page * size;
      const [expResp, projResp] = await Promise.all([
        fetchExpenses({ start, length: size, searchValue: search }),
        fetchUserProjects(),
      ]);
      console.log('[ExpenseScreen] fetchExpenses response:', expResp);
      console.log('[ExpenseScreen] fetchUserProjects response:', projResp);
      const projectsRaw = Array.isArray(projResp?.Data?.Projects) ? projResp.Data.Projects : [];
      const projectOptions = projectsRaw
        .filter(p => p && p.Project_Title)
        .map(p => ({ id: p.UUID || p.Uuid || p.id, name: String(p.Project_Title) }));
      setProjects(projectOptions);

      const resp = expResp;
      const rawList = Array.isArray(resp?.Data?.Records)
        ? resp.Data.Records
        : Array.isArray(resp?.Data)
          ? resp.Data
          : (Array.isArray(resp) ? resp : []);
      const mapped = rawList
        .filter(it => it.IsDisplay !== false)
        .map((r, idx) => {
          // Backend fields per sample
          const soleExpenseCode = r.ExpenseCode || r.soleExpenseCode || `EXP-${idx+1}`;
          const expenseName = r.ExpenseName || r.expenseName || 'Expense';
          const documentFromDateRaw = r.DocDateFrom || r.documentFromDate || '';
          const documentToDateRaw = r.DocDateTo || r.documentToDate || '';
          const documentFromDate = typeof documentFromDateRaw === 'string' ? documentFromDateRaw.substring(0, 10) : '';
          const documentToDate = typeof documentToDateRaw === 'string' ? documentToDateRaw.substring(0, 10) : '';
          const amountStr = r.Amount || r.amount || '0.00';
          const amount = amountStr ? `₹ ${String(amountStr)}` : '₹ 0.00';
          const status = r.Status || r.status || 'Unpaid';
          const projectName = r.ProjectName || r.projectName || '';
          const projectTask = r.ProjectTask || r.projectTask || '';
          return { 
            soleExpenseCode, 
            expenseName, 
            documentFromDate, 
            documentToDate, 
            amount, 
            status, 
            projectName, 
            projectTask,
            // Include header UUID for editing
            headerUuid: r.UUID || r.Uuid || r.ERExpenseHeader_UUID || r.ERExpenseHeaderUuid || r.headerUuid,
            // Include all raw data for potential use
            rawData: r
          };
        });
      console.log('[ExpenseScreen] mapped expenses:', mapped);
      console.log('[ExpenseScreen] project options:', projectOptions);
      setExpenses(mapped);
      const totalFromResponse =
        (typeof resp?.Data?.TotalCount === 'number' && resp.Data.TotalCount) ||
        (typeof resp?.Data?.TotalRecords === 'number' && resp.Data.TotalRecords) ||
        (typeof resp?.TotalCount === 'number' && resp.TotalCount) ||
        (typeof resp?.TotalRecords === 'number' && resp.TotalRecords) ||
        mapped.length;
      setTotalRecords(totalFromResponse);
    } catch (e) {
      console.error('[ExpenseScreen] load error:', e);
      setError(e?.message || 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchValue]);

  // Load data when screen is focused
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const totalPages = Math.ceil(totalRecords / pageSize) || 0;
  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    const items = [];
    const current = currentPage + 1; // 1-based
    const last = totalPages;

    items.push('prev');

    // Determine the four numeric pages to display
    let pages = [];
    if (last <= 4) {
      for (let p = 1; p <= last; p++) pages.push(p);
    } else if (current <= 2) {
      pages = [1, 2, 3, last];
    } else if (current >= last - 1) {
      pages = [1, last - 2, last - 1, last];
    } else {
      pages = [1, current - 1, current, last];
    }

    // Dedupe and sort just in case of overlap
    pages = Array.from(new Set(pages)).sort((a, b) => a - b);
    // If fewer than 4 due to overlaps, pad from the left/right to keep 4 where possible
    if (last > 4) {
      while (pages.length < 4) {
        const first = pages[0];
        const lastNum = pages[pages.length - 1];
        if (first > 1) {
          pages.unshift(first - 1);
        } else if (lastNum < last) {
          pages.push(lastNum + 1);
        } else {
          break;
        }
      }
    }

    // Insert only ONE ellipsis: near end → left ellipsis; otherwise → right ellipsis
    const isNearEnd = (pages[1] === last - 2 && pages[2] === last - 1);
    items.push(pages[0]);
    if (isNearEnd) {
      if (pages[1] > pages[0] + 1) items.push('left-ellipsis');
    }
    items.push(pages[1]);
    items.push(pages[2]);
    if (!isNearEnd) {
      if (pages[3] > pages[2] + 1) items.push('right-ellipsis');
    }
    items.push(pages[3]);

    items.push('next');
    return items;
  }, [currentPage, totalPages]);
  const handlePageChange = useCallback((page) => {
    const clamped = Math.max(0, Math.min(page, Math.max(0, totalPages - 1)));
    setCurrentPage(clamped);
    loadData(clamped, pageSize, searchValue);
  }, [loadData, pageSize, searchValue, totalPages]);

  const handleItemsPerPageChange = useCallback((size) => {
    setPageSize(size);
    setCurrentPage(0);
    loadData(0, size, searchValue);
  }, [loadData, searchValue]);

  const handleSearch = useCallback(() => {
    setCurrentPage(0);
    handlePageChange(0);
  }, [handlePageChange]);

  const handleFilter = () => {
    setFilterVisible(prev => !prev); 
  };
  // // Full-screen loader while data is loading
  // if (loading) {
  //   return <Loader />;
  // }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Expense Reimbursement" 
        // onLeftPress={() =>  setActiveIndex(0)}
        onLeftPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack()
            setActiveIndex(0)
          } else {
            setActiveIndex(0) 
            // fallback → for BottomTabs (no goBack)
            // or do nothing
          }
        }}
        onRightPress={() => navigation.navigate('Notification')}
      />

      <View style={styles.content}>
        <View style={styles.sectionHeaderRow}>
          <TouchableOpacity activeOpacity={0.8} style={styles.addButton} onPress={handleAddExpensePress}>
            <Text style={styles.addButtonText}>Add Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity 
          onPress={handleFilter}
          activeOpacity={0.7}
          style={{
            marginLeft: wp(2),
            borderWidth: 1,
            borderColor: 'grey',
            backgroundColor: 'grey',
            borderRadius: wp(2),
            padding: wp(2)
          }}
        >
            <Icon name="filter-list" size={rf(5)} color="#fff" /> 
          </TouchableOpacity>
        </View>
        {filterVisible && (
        <View style={{ gap: wp(3) }}>
          <View style={{ zIndex: isProjectDropdownOpen ? 4 : 1 }}>
            <Dropdown
              placeholder="Project Name"
              value={selectedProject?.name}
              options={projects.length ? projects : sampleProjects}
              getLabel={(p) => p.name}
              getKey={(p) => p.id}
              hint="Project Name"
              onSelect={handleSelectProject}
              isOpen={isProjectDropdownOpen}
              onOpenChange={(next) => {
                setIsProjectDropdownOpen(next);
                if (next) {
                  setIsTaskDropdownOpen(false);
                  setIsPageSizeDropdownOpen(false);
                }
              }} 
            />
          </View>

          <View style={{ zIndex: isTaskDropdownOpen ? 4 : 1 }}>
            <Dropdown
              placeholder="Project Task"
              value={selectedTask}
              options={availableTasks}
              getLabel={(t) => t}
              getKey={(t, i) => `${t}-${i}`}
              hint="Project Task"
              disabled={!selectedProject}
              onSelect={handleSelectTask}
              isOpen={isTaskDropdownOpen}
              onOpenChange={(next) => {
                setIsTaskDropdownOpen(next);
                if (next) {
                  setIsProjectDropdownOpen(false);
                  setIsPageSizeDropdownOpen(false);
                }
              }}
            />
          </View>
        </View>
      )}

        <View style={[styles.searchRow]}>
          <Text style={styles.showText}>Show</Text>
          <View style={{ zIndex: isPageSizeDropdownOpen ? 3 : 0 }}>
            <Dropdown
              placeholder={String(pageSize)}
              value={pageSize}
              options={pageSizes}
              getLabel={(n) => String(n)}
              getKey={(n) => String(n)}
              hideSearch
              style={{ width: wp(22) }}
              inputBoxStyle={{ marginTop: 0, paddingVertical: hp(0.8) }}
              onSelect={handleItemsPerPageChange}
              isOpen={isPageSizeDropdownOpen}
              onOpenChange={(next) => {
                setIsPageSizeDropdownOpen(next);
                if (next) {
                  setIsProjectDropdownOpen(false);
                  setIsTaskDropdownOpen(false);
                }
              }}
            />
          </View>

          <View style={styles.searchInputContainer}>
            <Icon name="search" size={rf(4.2)} color="#8e8e93" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search"
              placeholderTextColor="#8e8e93"
              returnKeyType="search"
              value={searchValue}
              onChangeText={setSearchValue}
              onSubmitEditing={handleSearch}
            />
          </View>

          <TouchableOpacity activeOpacity={0.85} style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Search</Text>
          </TouchableOpacity>
        </View>


        <ScrollView 
          contentContainerStyle={{ paddingVertical: hp(1.5), paddingHorizontal: wp(0.5), }} 
          showsVerticalScrollIndicator={false}
        >
        {filteredExpenses.map((item) => (
            <AccordionItem
              key={item.soleExpenseCode}
              item={item}
              isActive={activeCode === item.soleExpenseCode}
              onToggle={() => handleToggle(item.soleExpenseCode)}
              onView={null}
              onEdit={handleEdit}
              onDelete={null}
              showViewButton={false}
              headerLeftLabel="Expense"
              headerRightLabel="Amount"
              status={item.status}
            />
          ))}
          
        {totalRecords > pageSize && (
          <View style={{}}>
            <Text style={styles.pageInfo}>
              Showing {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRecords)} of {totalRecords} entries
            </Text>
            <View style={styles.pageNavigation}>
              {pageItems.map((it, idx) => {
                if (it === 'prev') {
                  const disabled = currentPage === 0;
                  return (
                    <TouchableOpacity
                      key={`prev-${idx}`}
                      style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]}
                      disabled={disabled}
                      onPress={() => handlePageChange(currentPage - 1)}
                    >
                      <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Previous</Text>
                    </TouchableOpacity>
                  );
                }
                if (it === 'next') {
                  const disabled = currentPage >= totalPages - 1;
                  return (
                    <TouchableOpacity
                      key={`next-${idx}`}
                      style={[styles.pageButtonTextual, disabled && styles.pageButtonDisabled]}
                      disabled={disabled}
                      onPress={() => handlePageChange(currentPage + 1)}
                    >
                      <Text style={[styles.pageText, disabled && styles.pageTextDisabled]}>Next</Text>
                    </TouchableOpacity>
                  );
                }
                if (it === 'left-ellipsis' || it === 'right-ellipsis') {
                  return (
                    <View key={`dots-${idx}`} style={styles.pageDots}><Text style={styles.pageNumberText}>...</Text></View>
                  );
                }
                if (typeof it !== 'number') {
                  return null;
                }
                const pageNum = it;
                const active = pageNum === currentPage + 1;
                return (
                  <TouchableOpacity
                    key={`p-${pageNum}`}
                    style={[styles.pageNumberBtn, active && styles.pageNumberBtnActive]}
                    onPress={() => handlePageChange(pageNum - 1)}
                  >
                    <Text style={[styles.pageNumberText, active && styles.pageNumberTextActive]}>{pageNum}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
        </ScrollView>
        {/* Pagination footer moved to top to avoid overlap with bottom tabs */}
        <BottomSheetConfirm
          visible={confirmVisible}
          title={'Delete Expense?'}
          message={'This action cannot be undone.'}
          confirmText={'Delete'}
          cancelText={'Cancel'}
          onConfirm={confirmDelete}
          onCancel={closeConfirm}
        />
        <BottomSheetConfirm
          visible={eligibilityVisible}
          title={'Can not add Expense'}
          message={eligibilityMessage || 'You are not allowed to add expense.'}
          confirmText={'OK'}
          cancelText={''}
          onConfirm={() => setEligibilityVisible(false)}
          onCancel={() => setEligibilityVisible(false)}
        />
        <BottomSheetConfirm
          visible={statusSheet.visible}
          title={statusSheet.title || 'Information'}
          message={statusSheet.message || ''}
          confirmText={'OK'}
          cancelText={''}
          onConfirm={() => setStatusSheet({ visible: false, title: '', message: '' })}
          onCancel={() => setStatusSheet({ visible: false, title: '', message: '' })}
        />
      </View>

    </View>
  );
};

export default ExpenseScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // paddingTop: safeAreaTop,
  },
  content: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: hp(1.5),
  },
  sectionTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
  },
  addButtonText: {
    color: COLORS.bg,
    fontSize: rf(4),
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(2),
  },
  showText: {
    fontSize: rf(3.2),
    color: COLORS.text,
    marginRight: wp(2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  showSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    backgroundColor: '#fff',
    borderRadius: wp(2),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.8),
  },
  showSelectorText: {
    fontSize: rf(3.2),
    color: '#333',
    marginRight: wp(0.5),
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    marginHorizontal: wp(2),
    //paddingVertical: hp(0.8),
    height: hp(6.2),
  },
  searchInput: {
    flex: 1,
    marginLeft: wp(1.5),
    fontSize: rf(4),
    color: COLORS.text,
    height:hp(6),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  searchButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1),
    paddingHorizontal: wp(3),
    borderRadius: wp(2),
  },
  searchButtonText: {
    color: COLORS.bg,
    fontSize: rf(4),
    fontWeight: '800',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
  },
  pageButtonTextual: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    backgroundColor: COLORS.bg,
  },
  pageButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  pageText: {
    fontSize: rf(3.5),
    color: COLORS.primary,
    fontWeight: '600',
  },
  pageTextDisabled: {
    color: COLORS.textMuted,
  },
  pageDots: {
    paddingHorizontal: wp(1.5),
    minWidth: wp(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(0.8),
  },
  pageNumberBtn: {
    minWidth: wp(8),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2.4),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  pageNumberBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  pageNumberText: {
    fontSize: rf(3.6),
    color: COLORS.primary,
    fontWeight: '700',
  },
  pageNumberTextActive: {
    color: '#fff',
  },
  pageInfo: {
    fontSize: rf(3.5),
    color: COLORS.textLight,
    marginBottom: hp(0.5),
    textAlign: 'center',
  },
});