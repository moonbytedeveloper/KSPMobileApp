import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
// import HeaderBackButton from '../../components/common/HeaderBackButton';
import AppHeader from '../../components/common/AppHeader';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import { getHolidays } from '../../api/authServices';
import { getUUID, getCMPUUID, getENVUUID } from '../../api/tokenStorage';
import Loader from '../../components/common/Loader';

const HolidayScreen = ({ navigation }) => {
  const [holidays, setHolidays] = useState([]); 
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [searchValue, setSearchValue] = useState('');
  const [hasMore, setHasMore] = useState(true);
  console.log('errorMessage', errorMessage);
  useEffect(() => {
    const load = async (isRefresh) => {
      try {
        setIsLoading(true);
        const [cmpUuid, envUuid, userUuid] = await Promise.all([
          getCMPUUID(),
          getENVUUID(),
          getUUID(),
        ]);
        console.log('compUuid', cmpUuid, envUuid, userUuid);
        const resp = await getHolidays({ cmpUuid, envUuid, userUuid, start: 0, length: PAGE_SIZE, searchValue });
        const container = resp?.Data ?? resp;
        console.log('dataholidays', container);
        const list = Array.isArray(container?.data)
          ? container.data
          : Array.isArray(container?.Holidays)
          ? container.Holidays
          : Array.isArray(container)
          ? container
          : [];
        const total = Number(container?.recordsTotal ?? container?.total ?? list.length) || 0;
        setHolidays(list.map((h, idx) => ({
          id: h?.Id || `HOL-${idx + 1}`,
          name: h?.Name || h?.Holiday_Name || h?.Title || 'Holiday',
          date: h?.Date || h?.Holiday_Date
          || h?.OnDate || '',
        })));
        setHasMore(list.length < total);
        if (isRefresh) setPage(1);
      } catch (e) {
        setHolidays([]);  
        setErrorMessage(e.response.data.Message);
      } finally {
        setIsLoading(false);
      }
    };
    load(false);
    onRefresh.current = async () => {
      setRefreshing(true);
      await load(true);
      setRefreshing(false);
    };
  }, []);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = React.useRef(async () => {});

  const handleLoadMore = async () => {
    if (!hasMore) return;
    try {
      const [cmpUuid, envUuid, userUuid] = await Promise.all([
        getCMPUUID(),
        getENVUUID(),
        getUUID(),
      ]);
      const resp = await getHolidays({ cmpUuid, envUuid, userUuid, start: page * PAGE_SIZE, length: PAGE_SIZE, searchValue });
      const container = resp?.Data ?? resp;
      const list = Array.isArray(container?.data)
        ? container.data
        : Array.isArray(container?.Holidays)
        ? container.Holidays
        : Array.isArray(container)
        ? container
        : [];
      const total = Number(container?.recordsTotal ?? container?.total ?? 0) || 0;
      setHolidays((prev) => {
        const mapped = list.map((h, idx) => ({
          id: h?.Id || `HOL-${prev.length + idx + 1}`,
          name: h?.Name || h?.HolidayName || h?.Title || 'Holiday',
          date: h?.Date || h?.HolidayDate || h?.OnDate || '',
        }));
        const next = [...prev, ...mapped];
        if (next.length >= total || list.length === 0) setHasMore(false);
        return next;
      });
      setPage((p) => p + 1);
    } catch (e) {
      setHasMore(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="View Holiday"
          onLeftPress={() => navigation.goBack()}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="View Holiday"
        onLeftPress={() => navigation.goBack()}
        onRightPress={() => navigation.navigate('Notification')}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh.current} />}
      >
        {holidays.map((h) => (
          <View key={h.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.leftCol}>
                <View style={styles.badge}>
                  <Icon name="event" size={rf(3.6)} color={COLORS.danger} />
                </View>
                <View>
                  <Text style={styles.label}>Holiday</Text>
                  <Text style={styles.value}>{h.name}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.label}>Date</Text>
                <Text style={styles.value}>{h.date}</Text>
              </View>
            </View>
          </View>
        ))}
        {holidays.length === 0 && (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>{errorMessage}</Text>
          </View>
        )}
        {(hasMore && !(holidays.length === 0)) && (
          <TouchableOpacity onPress={handleLoadMore} style={styles.loadMoreButton}>
            <Text style={styles.loadMoreText}>Load more</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

export default HolidayScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // paddingTop: safeAreaTop,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(6),
    // marginBottom: hp(1.5),
  },
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: wp(3),
    marginBottom: hp(1.5),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: hp(0.2) },
    shadowOpacity: 0.1,
    shadowRadius: hp(0.4),
    elevation: 2,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: hp(2),
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  leftCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badge: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(2),
    backgroundColor: COLORS.dangerBg,
  },
  label: {
    fontSize: rf(3),
    fontWeight: '500',
    color: COLORS.textLight,
    textTransform: 'uppercase',
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  value: {
    fontSize: rf(3.5),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  emptyBox: {  
    flex:1,
    paddingVertical: hp(4),
    justifyContent: 'center',
    minHeight: hp(80),
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  loadMoreButton: {
    alignSelf: 'center',
    marginTop: hp(1),
    paddingVertical: hp(1),
    paddingHorizontal: wp(4),
    backgroundColor: '#e34f25',
    borderRadius: wp(2),
  },
  loadMoreText: {
    color: '#ffffff',
    fontSize: rf(4),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
});


