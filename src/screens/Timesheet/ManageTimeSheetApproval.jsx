import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Dropdown from '../../components/common/Dropdown';
import AppHeader from '../../components/common/AppHeader';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, text, layout, SHADOW, buttonStyles } from '../styles/styles';
import { getTimesheetsForApproval, approveTimesheet, rejectTimesheet } from '../../api/authServices';
import Loader from '../../components/common/Loader';

const TimesheetCard = ({ timesheet, onActionPress, getStatusColor, getStatusBgColor, expanded, onToggle }) => {
  const isControlled = typeof expanded === 'boolean';
  const [expandedUncontrolled, setExpandedUncontrolled] = useState(false);
  const expandedState = isControlled ? expanded : expandedUncontrolled;
  const toggle = () => {
    if (isControlled) {
      onToggle && onToggle();
    } else {
      setExpandedUncontrolled((s) => !s);
    }
  };

  const statusColor = getStatusColor(timesheet.status);
  const statusBg = getStatusBgColor(timesheet.status);

  // Get flag color from API response
  const getFlagColor = (flagColor) => {
    switch (flagColor?.toLowerCase()) {
      case 'green':
        return '#10B981';
      case 'red':
        return '#EF4444';
      case 'yellow':
        return '#F59E0B';
      case 'blue':
        return '#3B82F6';
      case 'orange':
        return '#FB923C';
      default:
        return COLORS.primary; // fallback to primary color
    }
  };

  return (
    <View style={styles.tsCard}>
      <TouchableOpacity activeOpacity={0.8} onPress={toggle}>
        <View style={styles.tsRowHeader}>
          <View style={styles.tsHeaderLeft}>
            <View style={[styles.tsDot, { backgroundColor: getFlagColor(timesheet.flagColor) }]} />
            <View style={styles.tsHeaderLeftContent}>
              <Text style={[text.caption, styles.tsCaption]}>Employee Name</Text>
              <Text style={[text.title, styles.tsTitle]} numberOfLines={1}>{timesheet.employeeName || `Timesheet #${timesheet.srNo}`}</Text>
            </View>
          </View>
          <View style={styles.tsHeaderRight}>
            <View>
              <Text style={[text.caption, styles.tsCaption, { textAlign: 'right' }]}>Total Hours</Text>
              <Text style={[text.title, styles.tsHours]}>{timesheet.totalHoursWorked}</Text>
            </View>
            <Icon name={expandedState ? 'expand-less' : 'expand-more'} size={rf(4.2)} color={COLORS.textMuted} />
          </View>
        </View>
      </TouchableOpacity>

      {expandedState && (
        <View style={styles.tsDetailArea}>
          <View style={styles.detailRow}>
            <Text style={[text.caption, styles.detailLabel]}>Sr No</Text>
            <Text style={[text.body, styles.detailValue]}>{timesheet.srNo}</Text>
          </View>
          {/* <View style={styles.detailRow}>
            <Text style={[text.caption, styles.detailLabel]}>Eligibility</Text>
            <Text style={[text.body, styles.detailValue]}>{timesheet.eligibility}</Text>
          </View> */}
          <View style={styles.detailRow}>
            <Text style={[text.caption, styles.detailLabel]}>Period</Text>
            <Text style={[text.body, styles.periodValue]} numberOfLines={1}>{timesheet.applyFromDate} - {timesheet.applyToDate}</Text>
          </View>

          <View style={styles.tsActionsRowPrimary}>
            <TouchableOpacity onPress={() => onActionPress(timesheet, 'approve')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.editBtn]}>
              <Icon name="check-circle" size={rf(5)} style={buttonStyles.iconEdit} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onActionPress(timesheet, 'reject')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.deleteBtn]}>
              <Icon name="cancel" size={rf(5)} style={buttonStyles.iconDelete} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onActionPress(timesheet, 'view')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.viewBtn]}>
              <Icon name="description" size={rf(5)} style={buttonStyles.iconView} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onActionPress(timesheet, 'approvalDetails')} activeOpacity={0.85} style={[buttonStyles.buttonNeutralFill, buttonStyles.scheduleBtn]}>
              <Icon name="person" size={rf(5)} style={buttonStyles.iconSchedule} />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const ManageTimeSheetApproval = ({ navigation }) => {
  const [selectedTimesheet, setSelectedTimesheet] = useState(null);
  const [selectedAction, setSelectedAction] = useState('');
  const [remark, setRemark] = useState('');
  const [reason, setReason] = useState('');
  const [approveMode, setApproveMode] = useState('form'); // 'form' | 'success'
  const [timesheetData, setTimesheetData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [approving, setApproving] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [expandedCardId, setExpandedCardId] = useState(null);
  
  const approveSheetRef = useRef(null);
  const rejectSheetRef = useRef(null);
  const viewSheetRef = useRef(null);
  const approvalDetailsSheetRef = useRef(null);
  
  const snapPoints = useMemo(() => [hp(60), hp(90)], []);

  // Fetch timesheets for approval
  useEffect(() => {
    fetchTimesheetsForApproval();
  }, []);

  const fetchTimesheetsForApproval = async (page = currentPage, size = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      const start = page * size;
      const response = await getTimesheetsForApproval({ start, length: size });
      
      console.log('Full API Response:', JSON.stringify(response, null, 2));
      
      // The data is nested under response.Data.data
      const apiData = response?.Data?.data || [];
      
      // Map API response to component format
      const mappedData = apiData.map((item, index) => ({
        id: item.HeaderUuid || index + 1,
        srNo: item.SrNo?.toString() || (index + 1).toString().padStart(3, '0'),
        eligibility: 'Full Time', // Default value since not in API response
        employeeName: item.EmployeeName || 'Unknown Employee',
        applyFromDate: item.DateRange?.split(' To ')[0] || 'N/A',
        applyToDate: item.DateRange?.split(' To ')[1] || 'N/A',
        totalHoursWorked: item.TotalHours || '00:00',
        status: 'Pending', // Default status for approval screen
        flagColor: item.FlagColor || 'green',
        headerUuid: item.HeaderUuid,
        employeeCode: item.EmployeeCode,
        submittedDate: item.SubmittedDate,
        timesheetLines: item.TimesheetLines || [],
        approvalDetails: item.ApprovalDetails || [],
        projectDetails: item.TimesheetLines?.[0] || {
          projectTitle: 'N/A',
          projectTask: 'N/A',
          date: 'N/A',
          hour: '00:00',
          description: 'N/A'
        }
      }));
      
      console.log('Mapped Data:', JSON.stringify(mappedData, null, 2));
      setTimesheetData(mappedData);
      
      // Set total records from response
      const totalFromResponse = response?.Data?.recordsTotal || response?.Data?.recordsFiltered || mappedData.length;
      setTotalRecords(totalFromResponse);
    } catch (err) {
      console.error('Error fetching timesheets for approval:', err);
      setError('Failed to load timesheets. Please try again.');
      Alert.alert('Error', 'Failed to load timesheets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'rejected':
        return '#EF4444';
      default:
        return '#6B7280';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return '#d1fae5';
      case 'pending':
        return '#fef3c7';
      case 'rejected':
        return '#fee2e2';
      default:
        return '#f3f4f6';
    }
  };

  const handleActionPress = (timesheet, action) => {
    setSelectedTimesheet(timesheet);
    setSelectedAction(action);
    setRemark('');
    setReason('');
    if (action === 'approve') {
      setApproveMode('form');
    }
    
    switch (action) {
      case 'approve':
        approveSheetRef.current?.present();
        break;
      case 'reject':
        rejectSheetRef.current?.present();
        break;
      case 'view':
        viewSheetRef.current?.present();
        break;
      case 'approvalDetails':
        approvalDetailsSheetRef.current?.present();
        break;
    }
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      console.log('Approving timesheet:', selectedTimesheet.headerUuid);
      
      // Call the approve API
      await approveTimesheet({
        headerUuid: selectedTimesheet.headerUuid
      });
      
      console.log('Timesheet approved successfully');
      
      // After successful approval, show success state
      setApproveMode('success');
      
      // Refresh the timesheet list to reflect the changes
      setTimeout(() => {
        fetchTimesheetsForApproval(currentPage, pageSize);
      }, 2000); // Refresh after 2 seconds to allow user to see success message
      
    } catch (error) {
      console.error('Error approving timesheet:', error);
      Alert.alert('Error', 'Failed to approve timesheet. Please try again.');
      
      // Close the modal on error
      closeSheet(approveSheetRef);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    try {
      setApproving(true);
      console.log('Rejecting timesheet:', selectedTimesheet.headerUuid, 'Reason:', reason);
      
      // Call the reject API
      await rejectTimesheet({
        headerUuid: selectedTimesheet.headerUuid,
        remark: reason
      });
      
      console.log('Timesheet rejected successfully');
      
      // Close the modal
      rejectSheetRef.current?.dismiss();
      
      // Refresh the timesheet list to reflect the changes
      setTimeout(() => {
        fetchTimesheetsForApproval(currentPage, pageSize);
      }, 1000);
      
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      Alert.alert('Error', 'Failed to reject timesheet. Please try again.');
    } finally {
      setApproving(false);
    }
  };

  const handleView = () => {
    console.log('Viewing timesheet:', selectedTimesheet.id);
    // Handle view logic here
    viewSheetRef.current?.dismiss();
  };

  const handleApprovalDetails = () => {
    console.log('Viewing approval details for timesheet:', selectedTimesheet.id);
    // Handle approval details logic here
    approvalDetailsSheetRef.current?.dismiss();
  };

  const closeSheet = (sheetRef) => {
    sheetRef.current?.dismiss();
    setSelectedTimesheet(null);
    setSelectedAction('');
    setRemark('');
    setReason('');
    setApproveMode('form');
    setApproving(false);
  };

  // Pagination logic
  const totalPages = Math.ceil(totalRecords / pageSize) || 0;
  const pageSizes = [10, 25, 50, 100];

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
    fetchTimesheetsForApproval(clamped, pageSize);
  }, [pageSize, totalPages]);

  const handleItemsPerPageChange = useCallback((size) => {
    setPageSize(size);
    setCurrentPage(0);
    fetchTimesheetsForApproval(0, size);
  }, []);

  // Full-screen loader while first load is in progress
  if (loading && timesheetData.length === 0) {
    return (
      <View style={styles.safeArea}>
        <AppHeader
          title="Timesheet"
          onLeftPress={() => navigation.goBack()}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <AppHeader
          title="Timesheet"
          onLeftPress={() => navigation.goBack()}
          onRightPress={() => navigation.navigate('Notification')}
        />
      <View style={styles.container}>
        {/* Pagination Controls (top) */}
        <View style={styles.paginationContainerTop}>
          <View style={styles.itemsPerPageContainer}>
            <Text style={styles.paginationLabel}>Show</Text>
            <Dropdown
              placeholder={String(pageSize)}
              value={pageSize}
              options={pageSizes}
              onSelect={handleItemsPerPageChange}
              hideSearch
              maxPanelHeightPercent={15}
              inputBoxStyle={{ paddingHorizontal: wp(3.2) }}
              style={{ width: wp(14), marginEnd: hp(1.1) }}
            />
            <Text style={styles.paginationLabel}>entries</Text>
          </View>
        </View>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchTimesheetsForApproval}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {timesheetData.map(timesheet => (
                <TimesheetCard
                  key={timesheet.id}
                  timesheet={timesheet}
                  onActionPress={handleActionPress}
                  getStatusColor={getStatusColor}
                  getStatusBgColor={getStatusBgColor}
                  expanded={expandedCardId === timesheet.id}
                  onToggle={() => {
                    setExpandedCardId(expandedCardId === timesheet.id ? null : timesheet.id);
                  }}
                />
              ))}

              {timesheetData.length === 0 && (
                <View style={styles.emptyBox}>
                  <Text style={styles.emptyText}>No timesheet records found for approval.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Inline overlay loader while fetching data (e.g., on Next/Prev) */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <Loader size="small" style={{ backgroundColor: 'transparent' }} />
          </View>
        )}

        {/* Pagination Controls - Bottom */}
        {totalRecords > pageSize && (
          <View style={styles.paginationContainerBottom}>
           <Text style={styles.pageInfo}>
              Show {currentPage * pageSize + 1} to {Math.min((currentPage + 1) * pageSize, totalRecords)} of {totalRecords} entries
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

        {/* Approve Bottom Sheet */}
        <BottomSheetModal
          ref={approveSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(approveSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={[styles.sheetContent, { paddingBottom: hp(1) }]}>
            {approveMode === 'form' ? (
              <>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Approve Timesheet</Text>
                  <TouchableOpacity onPress={() => closeSheet(approveSheetRef)} style={styles.closeButton}>
                    <Icon name="close" size={rf(5)} color={COLORS.text} />
                  </TouchableOpacity>
                </View>

                {selectedTimesheet && (
                  <View style={styles.timesheetDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Employee:</Text>
                      <Text style={styles.detailValue}>{selectedTimesheet.employeeName}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Period:</Text>
                      <Text style={styles.detailValue}>{selectedTimesheet.applyFromDate} - {selectedTimesheet.applyToDate}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Total Hours:</Text>
                      <Text style={styles.detailValue}>{selectedTimesheet.totalHoursWorked}</Text>
                    </View>

                    {/* <View style={styles.remarkSection}>
                      <Text style={styles.remarkLabel}>Remark</Text>
                      <TextInput
                        style={styles.remarkInput}
                        placeholder="Enter your remark here..."
                        placeholderTextColor="#9ca3af"
                        value={remark}
                        onChangeText={setRemark}
                        multiline
                        numberOfLines={3}
                      />
                    </View> */}

                    <TouchableOpacity 
                      style={[styles.approveButton, approving && styles.approveButtonDisabled]} 
                      onPress={handleApprove}
                      disabled={approving}
                    >
                      <Text style={styles.approveButtonText}>
                        {approving ? 'Approving...' : 'Approve'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.iconCircle}>
                  <Text style={styles.iconCircleMark}>✓</Text>
                </View>
                <Text style={styles.successDone}>Done</Text>
                <Text style={styles.successMessage}>Timesheet has been Approved!</Text>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.primaryBtn}
                  onPress={() => closeSheet(approveSheetRef)}
                >
                  <Text style={styles.primaryBtnText}>Ok</Text>
                </TouchableOpacity>
              </>
            )}
          </BottomSheetView>
        </BottomSheetModal>

        {/* Reject Bottom Sheet */}
        <BottomSheetModal
          ref={rejectSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(rejectSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={[styles.sheetContent, { paddingBottom: hp(1) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reason</Text>
              <TouchableOpacity onPress={() => closeSheet(rejectSheetRef)} style={styles.closeButton}>
                <Icon name="close" size={rf(5)} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.reasonSection}>
              <TextInput
                style={styles.reasonInput}
                placeholder="eg."
                placeholderTextColor="#9ca3af"
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
              />
            </View>

            <TouchableOpacity style={styles.rejectButton} onPress={handleReject}>
              <Text style={styles.rejectButtonText}>Reject</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheetModal>

        {/* View Details Bottom Sheet */}
        <BottomSheetModal
          ref={viewSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(viewSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={[styles.sheetContent, { paddingBottom: hp(1) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Timesheet</Text>
              <TouchableOpacity onPress={() => closeSheet(viewSheetRef)} style={styles.closeButton}>
                <Icon name="close" size={rf(5)} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.timesheetList} showsVerticalScrollIndicator={false}>
              {selectedTimesheet?.timesheetLines?.map((line, index) => (
                <View key={index} style={styles.timesheetItem}>
                  <Text style={styles.timesheetTitle}>Timesheet Line #{index + 1}</Text>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Project Title:</Text>
                    <Text style={styles.detailValue}>{line.ProjectTitle || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Task Title:</Text>
                    <Text style={styles.detailValue}>{line.TaskTitle || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Date:</Text>
                    <Text style={styles.detailValue}>{line.Date || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hours:</Text>
                    <Text style={styles.detailValue}>{line.Hours || '00:00'}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Remark:</Text>
                    <Text style={styles.detailValue}>{line.Remark || 'N/A'}</Text>
                  </View>
                  
                  <View style={styles.itemDivider} />
                </View>
              )) || (
                <View style={styles.timesheetItem}>
                  <Text style={styles.timesheetTitle}>No timesheet lines found</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.closeButtonStyle} onPress={handleView}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheetModal>

        {/* Approval Details Bottom Sheet */}
        <BottomSheetModal
          ref={approvalDetailsSheetRef}
          snapPoints={snapPoints}
          enablePanDownToClose
          enableContentPanningGesture={false}
          onDismiss={() => closeSheet(approvalDetailsSheetRef)}
          handleIndicatorStyle={styles.handle}
          handleStyle={{ backgroundColor: 'transparent' }}
          backgroundStyle={styles.sheetBackground}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
          )}
        >
          <BottomSheetView style={[styles.sheetContent, { paddingBottom: hp(1) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Approval Details</Text>
              <TouchableOpacity onPress={() => closeSheet(approvalDetailsSheetRef)} style={styles.closeButton}>
                <Icon name="close" size={rf(5)} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {selectedTimesheet && (
              <View style={styles.approvalDetails}>
                {selectedTimesheet.approvalDetails?.map((detail, index) => (
                  <View key={index}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Action Date:</Text>
                      <Text style={styles.detailValue}>{detail.actiondate || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Entered By:</Text>
                      <Text style={styles.detailValue}>{detail.enteredby || 'N/A'}</Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Status:</Text>
                      <Text style={[styles.statusBadge, { 
                        color: '#fff',
                        backgroundColor: detail.status === 'Approved' ? '#10B981' : '#F59E0B'
                      }]}>
                        {detail.status || 'Pending'}
                      </Text>
                    </View>
                    
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Action Taken By:</Text>
                      <Text style={styles.detailValue}>{detail.actiontakenby || 'N/A'}</Text>
                    </View>
                    
                    {index < selectedTimesheet.approvalDetails.length - 1 && <View style={styles.itemDivider} />}
                  </View>
                )) || (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>No approval details available</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.closeButtonStyle} onPress={handleApprovalDetails}>
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>
            )}
          </BottomSheetView>
        </BottomSheetModal>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
    //paddingTop: safeAreaTop,
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  listContent: {
    paddingBottom: hp(4),
  },
  // Timesheet card UI matching Opportunity card
  tsCard: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: hp(1.6),
    ...SHADOW.elevation2,
      
  },
  tsRowHeader: {
    ...layout.rowSpaceBetween,
  },
  tsHeaderLeft: {
    ...layout.rowCenter,
    gap: SPACING.sm,
    flex: 1,
  },
  tsHeaderLeftContent: {
    maxWidth: wp(60),
  },
  tsDot: {
    width: wp(3.5),
    height: wp(3.5),
    borderRadius: RADIUS.md,
  },
  tsCaption: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textLight,
    fontWeight: '700',
    marginBottom: hp(0.3),
  },
  tsTitle: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
    maxWidth: wp(50),
  },
  tsHeaderRight: {
    ...layout.rowCenter,
    gap: SPACING.sm,
  },
  tsHours: {
    fontSize: TYPOGRAPHY.h3,
    color: COLORS.text,
    fontWeight: '700',
  },
  tsDetailArea: {
    marginTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: hp(1.2),
    
  },
  tsBadge: {
    borderWidth: 1,
    paddingVertical: hp(0.2),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  tsBadgeText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: '800', 
  },
  tsActionsRowPrimary: {
    ...layout.rowCenter,
    justifyContent: 'space-between',
    gap: wp(8),
    marginTop: hp(0.8),
  },
  timesheetCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: wp(3),
    paddingTop: wp(4),
    paddingHorizontal: wp(4),
    paddingBottom: wp(6),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  sectionTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(2),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(1.2),
  },
  fieldLabel: {
    fontSize: rf(3.6),
    color: COLORS.textMuted,
    fontWeight: '500',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  fieldValue: {
    fontSize: rf(3.8),
    color: COLORS.text,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: hp(2),
    paddingTop: hp(1),
    paddingBottom: hp(1),
  },
  actionButton: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(2),
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  approveButton: {
    backgroundColor: '#ef4444',
  },
  rejectButton: {
    backgroundColor: '#10b981',
  },
  viewButton: {
    backgroundColor: '#6b7280',
  },
  approvalDetailsButton: {
    backgroundColor: '#6b7280',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: hp(4),
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  // Bottom Sheet Styles
  handle: {
    alignSelf: 'center',
    width: wp(18),
    height: hp(0.7),
    backgroundColor: '#2e2e2e',
    borderRadius: hp(0.6),
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  sheetContent: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(6),
    paddingTop: hp(1),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  sheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  modalTitle: {
    fontSize: rf(4.2),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  // Success state styles (match Opportunity success)
  iconCircle: {
    alignSelf: 'center',
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    borderWidth: 2,
    borderColor: COLORS.success + '33',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.5),
  },
  iconCircleMark: {
    fontSize: TYPOGRAPHY.h1,
    color: COLORS.success,
    fontWeight: '800',
  },
  successDone: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.textLight,
    marginTop: hp(0.6),
    marginBottom: hp(0.6),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  successMessage: {
    textAlign: 'center',
    color: COLORS.text,
    fontSize: TYPOGRAPHY.subtitle,
    marginBottom: hp(1.6),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  primaryBtn: {
    backgroundColor: COLORS.ButtonColor,
    paddingVertical: hp(1.2),
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignSelf: 'center',
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontWeight: '700',
    fontSize: TYPOGRAPHY.subtitle,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  closeButton: {
    padding: wp(1),
  },
  timesheetDetails: {
    marginBottom: hp(2),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  detailLabel: {
    fontSize: rf(3.4),
    fontWeight: '500',
    color: COLORS.textMuted,
    flex: 1,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  detailValue: {
    fontSize: rf(3.4),
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  periodValue: {
    fontSize: rf(3.0),
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
    flexShrink: 1,
  },
  remarkSection: {
    marginTop: hp(2),
    marginBottom: hp(2),
  },
  remarkLabel: {
    fontSize: rf(3.4),
    fontWeight: '500',
    color: COLORS.textMuted,
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  remarkInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    //paddingVertical: hp(1.5),
    height: hp(15),
    fontSize: rf(3.2),
    color: COLORS.text,
    backgroundColor: COLORS.bgMuted,
    textAlignVertical: 'top',
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  reasonSection: {
    marginBottom: hp(2),
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.5),
    fontSize: rf(3.2),
    color: COLORS.text,
    backgroundColor: COLORS.bgMuted,
    textAlignVertical: 'top',
    minHeight: hp(25),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  approveButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
  },
  approveButtonDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.6,
  },
  approveButtonText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  rejectButton: {
    backgroundColor: '#6b7280',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  closeButtonStyle: {
    backgroundColor: '#6b7280',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
    marginTop: hp(2),
  },
  closeButtonText: {
    color: '#fff',
    fontSize: rf(3.6),
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  approvalDetails: {
    marginBottom: hp(2),
  },
  statusBadge: {
    paddingVertical: hp(0.5),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(5),
    fontSize: rf(3),
    fontWeight: '600',
  },
  timesheetList: {
    maxHeight: hp(35),
    marginBottom: hp(2),
  },
  timesheetItem: {
    marginBottom: hp(2),
    paddingBottom: hp(1),
  },
  timesheetTitle: {
    fontSize: rf(3.8),
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginTop: hp(1),
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: hp(4),
    paddingHorizontal: wp(4),
  },
  errorText: {
    color: COLORS.error || '#EF4444',
    fontSize: rf(3.4),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    textAlign: 'center',
    marginBottom: hp(2),
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: rf(3.4),
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  // Pagination styles
  paginationContainerBottom: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: hp(1.5),
  },
  paginationContainerTop: {
    backgroundColor: '#ffffff',
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderTopColor: '#e5e7eb',
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    position: 'relative',
    zIndex: 1000, 
    marginHorizontal: wp(-3.4),
    elevation: 2,
    marginBottom: hp(1.5)
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
    width: wp(16),
    height: hp(4),
    marginHorizontal: wp(1),
    zIndex: 1000,
    position: 'relative',
  },
  pageInfo: {
    fontSize: rf(3.5),
    color: COLORS.textLight,
    marginBottom: hp(0.5),
    textAlign: 'center',
  },
  pageNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2.5),
    marginVertical: hp(0.8),
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
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
});

export default ManageTimeSheetApproval;
