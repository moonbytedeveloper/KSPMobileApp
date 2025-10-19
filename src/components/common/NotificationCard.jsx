import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from "../../utils/responsive";
import { COLORS, TYPOGRAPHY } from '../../screens/styles/styles';

const NotificationCard = ({ item, onLongPress, onPress, isSelected, selectionMode }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onLongPress={onLongPress}
      onPress={onPress}
      style={[styles.card, isSelected && styles.cardSelected]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {selectionMode && (
            <Icon
              name={isSelected ? 'check-circle' : 'radio-button-unchecked'}
              size={rf(4.4)}
              color={isSelected ? COLORS.danger : COLORS.textLight}
              style={styles.selectIcon}
            />
          )}
          <Text style={styles.cardTitle}>{item.name}</Text>
        </View>
        <View style={styles.timeRow}>
          <Icon name="access-time" size={rf(3.6)} color={COLORS.textLight} style={styles.clockIcon} />
          <Text style={styles.timeText}>{item.ago}</Text>
        </View>
      </View>
      <Text style={styles.cardMsg}>{item.message}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: wp(2.5),
    padding: hp(1.8),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: COLORS.danger,
    backgroundColor: COLORS.dangerBg,
  },
  cardTitle: {
    fontSize: rf(3.9),
    fontWeight: "700",
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
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
    color: COLORS.textLight,
    fontWeight: "600",
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  cardMsg: {
    marginTop: hp(0.8),
    fontSize: rf(3.2),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  selectIcon: {
    marginRight: wp(2),
  },
});

export default NotificationCard; 