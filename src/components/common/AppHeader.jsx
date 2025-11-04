import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { COLORS } from '../../screens/styles/styles';
import { getENVUUID } from '../../api/tokenStorage';

const AppHeader = ({
  title,
  leftIconName = 'chevron-left',
  onLeftPress,
  showRight = true,
  rightIconName = 'notifications',
  onRightPress,
  rightBadgeCount,
  navigation,
  rightNavigateTo,
  rightParams,
  rightButtonLabel,
}) => {
  const [environmentUUID, setEnvironmentUUID] = useState(null);
  const [isDevelopment, setIsDevelopment] = useState(false);

  // Load environment UUID on component mount
  useEffect(() => {
    const loadEnvironmentUUID = async () => {
      try {
        const envUUID = await getENVUUID();
        setEnvironmentUUID(envUUID);
        setIsDevelopment(envUUID === '9549B2F6-0350-4484-9269-58F85A4FFxx1');
      } catch (error) {
        console.log('Error loading environment UUID:', error);
      }
    };
    
    loadEnvironmentUUID();
  }, []);

  const handleRightPress = () => {
    if (rightNavigateTo && navigation && typeof navigation.navigate === 'function') {
      navigation.navigate(rightNavigateTo, rightParams);
      return;
    }
    if (typeof onRightPress === 'function') {
      onRightPress();
    }
  };

  const shouldShowRight = showRight && (rightButtonLabel || rightNavigateTo || onRightPress);

  return (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.leftButton}
        onPress={onLeftPress}
        activeOpacity={0.7}
      >
        <Icon name={leftIconName} size={rf(7)} color="#333" />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <Text style={styles.title}>{title}</Text>
        {isDevelopment && (
          <View style={styles.developmentBadge}>
            <Text style={styles.developmentText}>DEVELOPMENT</Text>
          </View>
        )}
      </View>

      {shouldShowRight ? (
        <TouchableOpacity
          style={[styles.rightButton, rightButtonLabel && styles.rightButtonTextMode]}
          onPress={handleRightPress}
          activeOpacity={0.7}
        >
          {rightButtonLabel ? (
            <Text style={styles.rightButtonText}>{rightButtonLabel}</Text>
          ) : (
            <>
              <Icon name={rightIconName} size={rf(5)} color="#333" />
              {typeof rightBadgeCount === 'number' && rightBadgeCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.badgeText}>{rightBadgeCount}</Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      ) : (
        <View style={{ width: wp(9) }} />
      )}
    </View>
  );
};

export default AppHeader;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: hp(2),
    paddingTop: safeAreaTop + hp(3),
    paddingHorizontal: wp(4),
    zIndex: 10,
  },
  leftButton: {
    padding: wp(2),
    borderRadius: wp(2),
    backgroundColor: '#f5f5f5',
  },
  rightButton: {
    padding: wp(2),
    borderRadius: wp(2),
    backgroundColor: '#f5f5f5',
    position: 'relative',
  },
  rightButtonTextMode: {
    backgroundColor: COLORS.primary,
    paddingVertical: wp(1.5),
    paddingHorizontal: wp(3),
  },
  rightButtonText: {
    color: '#fff',
    fontSize: rf(3.4),
    fontWeight: '700',
    fontFamily: 'PTSans-Bold',
  },
  titleContainer: {
    flex: 1,
    flexShrink: 1,
    marginLeft: wp(2),
    alignItems: 'flex-start',
  },
  title: {
    fontSize: rf(4.5),
    fontWeight: '600',
    color: '#333',
    fontFamily: 'PTSans-Regular',
    flexWrap: 'wrap',
    textAlign: 'left',
  },
  developmentBadge: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.5),
    borderRadius: wp(1.5),
    marginTop: hp(0.5),
    alignSelf: 'flex-start',
  },
  developmentText: {
    color: '#fff',
    fontSize: rf(2.5),
    fontWeight: 'bold',
    fontFamily: 'PTSans-Bold',
  },
  notificationBadge: {
    position: 'absolute',
    top: -wp(1),
    right: -wp(1),
    backgroundColor: '#FF4444',
    borderRadius: wp(3),
    minWidth: wp(6),
    height: wp(6),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: rf(3),
    fontWeight: 'bold',
  },
}); 
