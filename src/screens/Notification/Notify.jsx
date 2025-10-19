import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, Alert } from "react-native";
import { wp, hp, rf, safeAreaTop } from "../../utils/responsive";
import Icon from 'react-native-vector-icons/MaterialIcons';
import NotificationCard from "../../components/common/NotificationCard";
import AppHeader from "../../components/common/AppHeader";
import Loader from "../../components/common/Loader";
import { notificationServices } from "../../api/notificationServices";
import { getUUID } from "../../api/tokenStorage";

const TABS = [
  { key: "All", label: "All" },
  { key: "BD", label: "B.D" },
  { key: "Expense", label: "Expense" },
  { key: "HR", label: "HR" },
  { key: "Profile", label: "Project" },
];

// Helper function to format time ago
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const notificationDate = new Date(dateString);
  const diffInMinutes = Math.floor((now - notificationDate) / (1000 * 60));
  
  if (diffInMinutes < 1) return "JUST NOW";
  if (diffInMinutes < 60) return `${diffInMinutes} MIN AGO`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} HRS AGO`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} DAYS AGO`;
  
  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} WEEKS AGO`;
};

// Helper function to map API category to UI category
const mapCategory = (apiCategory) => {
  const categoryMap = {
    'BusinessDevelopment': 'BD',
    'Expense': 'Expense',
    'HR': 'HR',
    'Project': 'Profile'
  };
  return categoryMap[apiCategory] || 'All';
};

const NotificationScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("All");
  const [list, setList] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const isSelectionMode = selectedIds.size > 0;

  // Fetch notifications from API
  const fetchNotifications = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Get user ID from token storage
      const userId = await getUUID();
      console.log('📱 [NOTIFY_SCREEN] User ID:', userId);
      
      if (!userId) {
        throw new Error('User ID not found. Please login again.');
      }

      const response = await notificationServices.getNotifications(userId);
      
      // Log the raw API response
      console.log('📱 [NOTIFY_SCREEN] Raw API response:', JSON.stringify(response, null, 2));
      
      // Transform API data to match component structure
      const transformedNotifications = response.Data?.map(notification => {
        const transformed = {
          id: notification.UUID, // Use UUID as the ID
          name: notification.Title || 'KSP Consulting', // Use Title as the name/sender
          message: notification.Message || '',
          ago: formatTimeAgo(notification.CreatedAt),
          category: 'All', // Default to 'All' since no category in API response
          isRead: false, // Default to unread since no read status in API response
          originalData: notification // Keep original data for API calls
        };
        
        // Log each transformed notification
        console.log('📱 [NOTIFY_SCREEN] Transformed notification:', JSON.stringify(transformed, null, 2));
        return transformed;
      }) || [];

      console.log('📱 [NOTIFY_SCREEN] Total transformed notifications:', transformedNotifications.length);
      setList(transformedNotifications);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      Alert.alert('Error', 'Failed to load notifications. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  const filtered = useMemo(() => {
    if (activeTab === "All") return list;
    return list.filter((n) => n.category === activeTab);
  }, [activeTab, list]);

  const filteredIds = useMemo(() => filtered.map((n) => n.id), [filtered]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleLongPress = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handlePressItem = (id) => {
    if (isSelectionMode) {
      toggleSelect(id);
    }
  };

  const deleteSelected = async () => {
    try {
      const selectedIdsArray = Array.from(selectedIds);
      
      if (selectedIdsArray.length === 1) {
        // Delete single notification
        await notificationServices.deleteNotification(selectedIdsArray[0]);
      } else {
        // Delete multiple notifications
        await notificationServices.deleteMultipleNotifications(selectedIdsArray);
      }
      
      // Update local state
      setList((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Error deleting notifications:', err);
      Alert.alert('Error', 'Failed to delete notifications. Please try again.');
    }
  };

  const exitSelectionMode = () => setSelectedIds(new Set());

  const allFilteredSelected = useMemo(() => (
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id))
  ), [filteredIds, selectedIds]);

  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const allSelected = filteredIds.length > 0 && filteredIds.every((id) => next.has(id));
      if (allSelected) {
        filteredIds.forEach((id) => next.delete(id));
      } else {
        filteredIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const renderTab = (tab) => {
    const isActive = tab.key === activeTab;
    return (
      <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={styles.tabBtn}>
        <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab.label}</Text>
        <View style={[styles.tabIndicator, !isActive && styles.tabIndicatorInactive]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.safe}>
      <AppHeader
          title={isSelectionMode ? `${selectedIds.size} selected` : 'Notification'}
          leftIconName={isSelectionMode ? 'close' : 'chevron-left'}
          onLeftPress={() => {
            if (isSelectionMode) {
              exitSelectionMode();
            } else {
              navigation.goBack();
            }
          }}
          showRight={isSelectionMode}
          rightButtonLabel={undefined}
          onRightPress={undefined}
          navigation={navigation}
          rightNavigateTo={undefined}
          rightParams={undefined}
        />
      <View style={styles.container}>
        
        {isSelectionMode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', paddingHorizontal: wp(2), marginTop: -hp(1) }}>
            <TouchableOpacity
              onPress={toggleSelectAll}
              hitSlop={{ top: hp(1.2), bottom: hp(1.2), left: wp(2), right: wp(2) }}
              style={{ padding: wp(2), marginRight: wp(1) }}
            >
              <Icon name="select-all" size={rf(5)} color={allFilteredSelected ? '#ef4444' : '#333'} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={deleteSelected}
              hitSlop={{ top: hp(1.2), bottom: hp(1.2), left: wp(2), right: wp(2) }}
              style={{ padding: wp(2) }}
            >
              <Icon name="delete" size={rf(5)} color="#ef4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabsRow}>{TABS.map(renderTab)}</View>

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Loader />
            <Text style={styles.loadingText}>Loading notifications...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Icon name="error-outline" size={rf(8)} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton} 
              onPress={() => fetchNotifications()}
            >
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            showsVerticalScrollIndicator={false}
            keyExtractor={(it) => it.id}
            contentContainerStyle={{ paddingBottom: hp(2) }}
            refreshing={refreshing}
            onRefresh={() => fetchNotifications(true)}
            renderItem={({ item }) => (
              <NotificationCard
                item={item}
                onLongPress={() => handleLongPress(item.id)}
                onPress={() => handlePressItem(item.id)}
                isSelected={selectedIds.has(item.id)}
                selectionMode={isSelectionMode}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Icon name="notifications-none" size={rf(8)} color="#9ca3af" />
                <Text style={styles.emptyText}>No notifications</Text>
                <Text style={styles.emptySubText}>Pull down to refresh</Text>
              </View>
            }
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    paddingHorizontal: wp(4),
  },
  // New header styles to match ExpenseScreen
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(2),
  },
  backButton: {
    padding: wp(1.5),
    borderRadius: wp(2),
  },
  title: {
    textAlign: 'left',
    fontSize: rf(5),
    fontWeight: '600',
    color: '#333',
  },
  // Existing (unused) header styles retained
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: hp(1),
  },
  backArrow: {
    fontSize: rf(6),
    color: "#111827",
    width: wp(8),
    textAlign: "left",
  },
  headerTitle: {
    flex: 1,
    textAlign: "left",
    marginLeft: wp(1),
    fontSize: rf(4.6),
    fontWeight: "700",
    color: "#111827",
  },
  clearBtn: {
    backgroundColor: "#f97316",
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(4),
    borderRadius: wp(2.5),
  },
  clearText: {
    color: "#fff",
    fontSize: rf(3.2),
    fontWeight: "700",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: wp(9),
   
    margin:hp(1.5),
  },
  tabBtn: {
    alignItems: "center",
  },
  tabText: {
    fontSize: rf(3.5),
    color: "#9ca3af",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#ef4444",
  },
  tabIndicator: {
    marginTop: hp(0.8),
    height: hp(0.5),
    width: wp(8),
    backgroundColor: "#ef4444",
    borderRadius: wp(2),
  },
  tabIndicatorInactive: {
    backgroundColor: "#d1d5db", // gray-300
  },
  cardTitle: {
    fontSize: rf(3.9),
    fontWeight: "700",
    color: "#111827",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  clockIcon: {
    fontSize: rf(3.6),
    marginRight: wp(1.2),
  },
  timeText: {
    fontSize: rf(2.6),
    color: "#9ca3af",
    fontWeight: "600",
  },
  cardMsg: {
    marginTop: hp(0.8),
    fontSize: rf(3.2),
    color: "#374151",
  },
  selectIcon: {
    marginRight: wp(2),
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: hp(8),
  },
  emptyText: {
    fontSize: rf(3.5),
    color: "#9ca3af",
    marginTop: hp(1),
  },
  emptySubText: {
    fontSize: rf(2.8),
    color: "#9ca3af",
    marginTop: hp(0.5),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: hp(8),
  },
  loadingText: {
    fontSize: rf(3.2),
    color: "#6b7280",
    marginTop: hp(2),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: hp(8),
    paddingHorizontal: wp(4),
  },
  errorText: {
    fontSize: rf(3.2),
    color: "#ef4444",
    textAlign: "center",
    marginTop: hp(2),
    marginBottom: hp(3),
  },
  retryButton: {
    backgroundColor: "#ef4444",
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(6),
    borderRadius: wp(2.5),
  },
  retryText: {
    color: "#fff",
    fontSize: rf(3.2),
    fontWeight: "600",
  },
});

export default NotificationScreen;


