import { React, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import OpportunityCard from './OpportunityCard';
import { TabContext } from '../../navigation/BottomTabs/TabContext';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import AppHeader from '../../components/common/AppHeader';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { getWonLeads, deleteLead } from '../../api/authServices';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, text, layout } from '../styles/styles';
import { getCMPUUID, getENVUUID, getUUID } from '../../api/tokenStorage'
import Dropdown from '../../components/common/Dropdown';
const BusinessDevelopmentScreen = () => {
  const { setActiveIndex } = useContext(TabContext);
  const navigation = useNavigation();

  const [expandedId, setExpandedId] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchValue, setSearchValue] = useState('');
  const [apiError, setApiError] = useState('');

  const mapRows = (rows) => {
    return rows.map((row, idx) => ({
      id: String(idx + 1),
      uuid: row?.Uuid ?? '',
      OpportunityTitle: row?.OpportunityTitle ?? '',
      company: {
        name: row?.CompanyName ?? '',
        email: row?.Email ?? '',
        phone: row?.Phone ?? '',
        client: row?.ClientName ?? '',
      },
      nextAction: row?.NextAction ?? '',
      actionDueDate: row?.ActionDueDate ?? '',
      OppOwner: row?.OppOwner ?? '',
      status: row?.Status ?? '',
      proposalDocument: row?.ProposalDocument ?? null,
      OpportunityBrief: row?.OpportunityBrief ?? '',
      address: row?.Address ?? '',
      country: row?.Country ?? '',
      state: row?.State ?? '',
      city: row?.City ?? '',
      // Add UUID fields for location data 
    }));
  };

  const fetchWonLeads = async (page = currentPage, pageSize = itemsPerPage, search = searchValue) => {
    try {
      setLoading(true);
      const [cmpUuid, envUuid, userUuid] = await Promise.all([
        getCMPUUID(),
        getENVUUID(),
        getUUID(),
      ]);
      console.log('compUuid', cmpUuid, envUuid, userUuid);
      const start = page * pageSize;
      const resp = await getWonLeads({
        cmpUuid,
        envUuid,
        userUuid,
        start,
        length: pageSize,
        searchValue: search
      });
      const rows = Array.isArray(resp?.Data?.Records) ? resp.Data.Records : [];
      setData(mapRows(rows));
      if (!Array.isArray(rows) || rows.length === 0) {
        const msg = resp?.Data?.Message || resp?.Message || 'No leads found';
        setApiError(String(msg));
      } else {
        setApiError('');
      }
      // Some responses return TotalCount instead of TotalRecords
      const totalFromResponse =
        (typeof resp?.Data?.TotalCount === 'number' && resp.Data.TotalCount) ||
        (typeof resp?.Data?.TotalRecords === 'number' && resp.Data.TotalRecords) ||
        (typeof resp?.TotalCount === 'number' && resp.TotalCount) ||
        (typeof resp?.TotalRecords === 'number' && resp.TotalRecords) ||
        rows.length;
      setTotalRecords(totalFromResponse);
    } catch (e) {
      console.log('Failed to load won leads', e);
      setData([]);
      setTotalRecords(0);
      const msg = (e?.response?.data?.Message) || (e?.response?.data?.message) || (e?.message) || 'Failed to load leads';
      setApiError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWonLeads();
  }, []);

  const toggleRow = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchWonLeads(page, itemsPerPage, searchValue);
  };

  const handleItemsPerPageChange = (newItemsPerPage) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(0); // Reset to first page
    fetchWonLeads(0, newItemsPerPage, searchValue);
  };

  const totalPages = Math.ceil(totalRecords / itemsPerPage);
  const itemsPerPageOptions = [10, 20, 50, 100];

  // Build numbered pagination list like: Prev 1 2 3 [4] 5 ... 10 Next
  const pageItems = useMemo(() => {
    if (totalPages <= 1) return [];
    const items = [];
    const add = (val) => items.push(val);
    const current = currentPage + 1; // 1-based for display
    const last = totalPages;

    add('prev');
    // Always show first two pages
    for (let p = 1; p <= Math.min(2, last); p++) add(p);
    // Left ellipsis
    if (current > 4 && last > 5) add('left-ellipsis');
    // Middle window (current -1, current, current +1)
    const startWin = Math.max(3, current - 1);
    const endWin = Math.min(last - 2, current + 1);
    for (let p = startWin; p <= endWin; p++) add(p);
    // Right ellipsis
    if (current < last - 3 && last > 5) add('right-ellipsis');
    // Always show last two pages
    for (let p = Math.max(last - 1, 3); p <= last; p++) add(p);
    add('next');

    // Deduplicate sequential integers (avoid duplicates when overlaps)
    const seen = new Set();
    const dedup = [];
    for (const it of items) {
      const key = String(it);
      if (seen.has(key)) continue;
      seen.add(key);
      dedup.push(it);
    }
    return dedup;
  }, [currentPage, totalPages]);

  // const renderHeader = () => (
  //   <View style={styles.tableHeaderRow}>
  //     <View style={[styles.cell, styles.colUuid]}><Text style={[text.subtitle, styles.headerText]}>UUID</Text></View>
  //     <View style={[styles.cell, styles.colDetail]}><Text style={[text.subtitle, styles.headerText]}>Company Detail</Text></View>
  //     <View style={[styles.cell, styles.colMeta]}><Text style={[text.subtitle, styles.headerText]}>Next Action</Text></View>
  //     <View style={[styles.cell, styles.colMeta]}><Text style={[text.subtitle, styles.headerText]}>Action Due Date</Text></View>
  //     <View style={[styles.cell, styles.colMeta]}><Text style={[text.subtitle, styles.headerText]}>Opportunity Owner</Text></View>
  //     <View style={[styles.cell, styles.colMeta]}><Text style={[text.subtitle, styles.headerText]}>Status</Text></View>
  //     <View style={[styles.cell, styles.colAction]}><Text style={[text.subtitle, styles.headerText]}>Action</Text></View>
  //   </View>
  // );

  // const renderItem = ({ item, index }) => {
  //   const isExpanded = expandedId === item.id;
  //   return (
  //     <View style={styles.rowWrapper}>
  //       <TouchableOpacity activeOpacity={0.8} onPress={() => toggleRow(item.id)}>
  //         {/* <View style={styles.tableRow}>
  //           <View style={[styles.cell, styles.colSn]}>
  //             <Text style={[text.body, styles.cellText]}>{index + 1}.</Text>
  //           </View>
  //           <View style={[styles.cell, styles.colUuid]}>
  //             <Text style={[text.body, styles.linkText]}>{item.uuid}</Text>
  //           </View>
  //           <View style={[styles.cell, styles.colDetail]}>
  //             <Text style={[text.body, styles.bullet]}>• Company: {item.company.name}</Text>
  //             {isExpanded && (
  //               <>
  //                 <Text style={[text.body, styles.bullet]}>• Email: {item.company.email}</Text>
  //                 <Text style={[text.body, styles.bullet]}>• Phone: {item.company.phone}</Text>
  //                 <Text style={[text.body, styles.bullet]}>• Client: {item.company.client}</Text>
  //               </>
  //             )}
  //           </View>
  //           <View style={[styles.cell, styles.colMeta]}>
  //             <Text style={[text.body, styles.cellText]}>{item.nextAction}</Text>
  //           </View>
  //           <View style={[styles.cell, styles.colMeta]}>
  //             <Text style={[text.body, styles.cellText]}>{item.actionDueDate}</Text>
  //           </View>
  //           <View style={[styles.cell, styles.colMeta]}>
  //             <Text style={[text.body, styles.cellText]}>{item.owner}</Text>
  //           </View>
  //           <View style={[styles.cell, styles.colMeta]}>
  //             <Text style={[text.small, styles.statusBadge, styles.statusOpen]}>{item.status}</Text>
  //           </View>
  //           <View style={[styles.cell, styles.colAction]}>
  //             <View style={styles.actionRow}>
  //               <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
  //                 <Icon name="visibility" size={rf(3.8)} color={COLORS.textMuted} />
  //               </TouchableOpacity>
  //               <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
  //                 <Icon name="edit" size={rf(3.8)} color={COLORS.textMuted} />
  //               </TouchableOpacity>
  //             </View>
  //           </View>
  //         </View> */}
  //       </TouchableOpacity>
  //     </View>
  //   );
  // };

  return (
    <BottomSheetModalProvider>
      <View style={styles.container}>
        {/* Header */}
        <AppHeader
          title="Sales Opportunity"

          onLeftPress={() => {
            navigation.goBack();
            setActiveIndex(0);
          }}
          rightButtonLabel="Add New Lead"
          onRightPress={() => navigation.navigate('ManageLead', { isEditMode: false })}
        />
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
        {/* Cards (scrollable) */}
        <View style={{ paddingHorizontal: SPACING.lg, flex: 1 }}>

          <FlatList
            data={data}
            keyExtractor={(it) => it.id}
            renderItem={({ item, index }) => (
              <OpportunityCard
                color={index % 2 === 0 ? '#F59E0B' : '#10B981'}
                srNo={index + 1}
                uuid={item.uuid}
                companyDetail={item.company}
                nextAction={item.nextAction}
                OpportunityTitle={item.OpportunityTitle}
                actionDueDate={item.actionDueDate}
                OppOwner={item.OppOwner}
                status={item.status}
                expanded={expandedId === item.id}
                onToggle={() => toggleRow(item.id)}
                onView={() => navigation.navigate('ManageLeadProposal', { initialFollowUpTakerName: item.OppOwner, leadUuid: item.uuid, initialCustomerName: item.company?.client, initialOpportunityTitle: item.OpportunityTitle })}
                onEdit={() => navigation.navigate('ManageLeadFollowUp',{initialFollowUpTakerName: item.OppOwner, leadUuid: item.uuid, initialCustomerName: item.company?.client})}
                onEditLead={() => navigation.navigate('ManageLead', { 
                  isEditMode: true, // This will show "Update" button and call PUT API
                  initialLead: item.company,
                  initialLeadUuid: item.uuid,
                  initialLeadName: item.OpportunityTitle,
                  initialLeadOwner: item.OppOwner,
                  initialLeadStatus: item.status,
                  initialLeadNextAction: item.nextAction,
                  initialLeadActionDueDate: item.actionDueDate,
                  initialLeadCompanyName: item.company?.name,
                  initialLeadClientName: item.company?.client,
                  initialLeadPhone: item.company?.phone,
                  initialLeadEmail: item.company?.email,
                  initialLeadBrief: item.OpportunityBrief,
                  initialLeadAddress: item.address,
                  initialLeadCountry: item.country,
                  initialLeadState: item.state,
                  initialLeadCity: item.city,
                  initialLeadOpportunityTitle: item.OpportunityTitle,
                  initialLeadOpportunityOwner: item.OppOwner,
                  initialLeadOpportunityStatus: item.status,
                  initialLeadOpportunityNextAction: item.nextAction,
                  initialLeadOpportunityActionDueDate: item.actionDueDate,
                  address: item.address,
                  country: item.country,
                  state: item.state,
                  city: item.city,
                  // Pass UUIDs for proper auto-fill
                  countryUuid: item.countryUuid,
                  stateUuid: item.stateUuid,
                  cityUuid: item.cityUuid
                })}
                onDelete={async () => {
                  try {
                    const [cmpUuid, envUuid, userUuid] = await Promise.all([
                      getCMPUUID(),
                      getENVUUID(),
                      getUUID(),
                    ]);
                    await deleteLead({ uuid: item.uuid, overrides: { userUuid, cmpUuid, envUuid } });
                    await fetchWonLeads(currentPage, itemsPerPage, searchValue);
                  } catch (e) {
                    console.log('Delete lead failed', e?.response?.data || e?.message || e);
                  }
                }}
              />
            )}
            contentContainerStyle={{ paddingVertical: hp(1.5) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ItemSeparatorComponent={() => <View style={{ height: hp(0.5) }} />}
            refreshing={loading}
            onRefresh={() => fetchWonLeads(currentPage, itemsPerPage, searchValue)}
          />
            {(!loading && data.length === 0 && !!apiError) ? (
              <View style={styles.apiErrorWrap}><Text style={styles.apiErrorText}>{apiError}</Text></View>
            ) : null}
        </View>

        {/* Pagination Controls */}
        <View style={styles.paginationContainer}>
          {/* Items per page dropdown */}


          {/* Page info */}
          <Text style={styles.pageInfo}>
            Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, totalRecords)} of {totalRecords} entries
          </Text>

          {/* Page navigation - numbered with ellipses */}
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
              // Numeric page
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
      </View>
    </BottomSheetModalProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // paddingTop: safeAreaTop,
  },
  header: {
    ...layout.rowSpaceBetween,
    paddingHorizontal: SPACING.lg,
    paddingVertical: hp(2),
  },
  backButton: {
    padding: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  title: {
    ...text.title,
    fontSize: TYPOGRAPHY.h1,
  },
  primaryCta: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1),
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  primaryCtaText: {
    color: COLORS.bg,
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '700',
  },
  table: {
    backgroundColor: COLORS.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgMuted,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
  },
  rowWrapper: {
    backgroundColor: COLORS.bg,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  cell: {
    paddingVertical: hp(1.2),
    paddingHorizontal: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: 'center',
  },
  colSn: { width: wp(12) },
  colUuid: { width: wp(60) },
  colDetail: { width: wp(70) },
  colMeta: { width: wp(45) },
  colAction: { width: wp(30), borderRightWidth: 0 },
  headerText: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: '700',
    color: COLORS.text,
  },
  cellText: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.text,
  },
  linkText: {
    fontSize: TYPOGRAPHY.subtitle,
    color: COLORS.info,
  },
  bullet: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
    marginBottom: hp(0.5),
  },
  statusBadge: {
    paddingVertical: hp(0.4),
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  statusOpen: {
    backgroundColor: COLORS.warningBg,
    color: COLORS.warning,
  },
  actionRow: {
    ...layout.rowCenter,
    gap: SPACING.xs,
  },
  actionBtn: {
    padding: SPACING.xs,
    borderRadius: RADIUS.md,
  },
  paginationContainer: {
    backgroundColor: COLORS.bg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: hp(1.5),
  },
  itemsPerPageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
    paddingLeft: SPACING.xl,
    justifyContent: 'flex-start',
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border, 
    paddingVertical: hp(1.2),
    paddingHorizontal: SPACING.lg,
    zIndex: 100,
    elevation: 3,
  },
  paginationLabel: {
    fontSize: rf(3.5),
    color: COLORS.text,
    marginRight: wp(2),
  },
  paginationDropdown: {
    width: wp(18),
    height: hp(5),
    marginHorizontal: wp(1),
  },
  pageInfo: {
    fontSize: rf(3.5),
    color: COLORS.textLight,
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
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bg,
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
    paddingHorizontal: wp(2),
  },
  apiErrorWrap: {
    minHeight: hp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiErrorText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
  },
  pageButton: {
    padding: wp(2),
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.bgMuted,
  },
  pageButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  pageNumberBtn: {
    minWidth: wp(8),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(2.4),
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
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

});
export default BusinessDevelopmentScreen;
