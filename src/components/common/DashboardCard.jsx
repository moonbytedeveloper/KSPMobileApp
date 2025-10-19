import React from 'react';
import { 
  TouchableOpacity, 
  Text, 
  View, 
  StyleSheet 
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../../screens/styles/styles';

const DashboardCard = ({
  iconName,
  iconColor = COLORS.primary,
  title,
  value,
  backgroundColor = COLORS.bg,
  onPress,
  showArrow = true,
  arrowText = '',
  disabled = false,
}) => {
  const CardComponent = disabled ? View : TouchableOpacity;
  
  return (
    <CardComponent 
      style={[styles.dashboardCard, { backgroundColor }]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.cardIconContainer}>
        <Icon name={iconName} size={rf(5)} color={iconColor} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardValue}>{value}</Text>
      {showArrow && (
        <Text style={styles.cardArrow}>{arrowText}</Text>
      )}
    </CardComponent>
  );
};

const styles = StyleSheet.create({
  dashboardCard: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderRadius: wp(3),
    padding: wp(4),
    marginHorizontal: wp(1),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    minHeight: hp(12),
  },
  cardIconContainer: {
    width: wp(10),
    height: wp(10),
    backgroundColor: COLORS.bg,
    borderRadius: wp(5),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1),
  },
  cardTitle: {
    fontSize: rf(3.5),
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: hp(1),
    lineHeight: rf(4.5),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  cardValue: {
    fontSize: rf(6),
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: hp(1),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  cardArrow: {
    position: 'absolute',
    right: wp(4),
    top: wp(4),
    fontSize: rf(4.5),
    color: COLORS.textLight,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
});

export default DashboardCard;
