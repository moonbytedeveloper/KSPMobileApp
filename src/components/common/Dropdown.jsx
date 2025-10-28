import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf } from '../../utils/responsive';
import { ScrollView } from 'react-native-gesture-handler';
import { TYPOGRAPHY, COLORS } from '../../screens/styles/styles';

const Dropdown = ({
  placeholder,
  value,
  options,
  getLabel = (item) => String(item),
  getKey = (item, index) => String(index),
  hint,
  disabled = false,
  onSelect,
  maxPanelHeightPercent = 20,
  style,
  inputBoxStyle,
  textStyle,
  hideSearch = false,
  onOpenChange,
  isOpen: controlledIsOpen,
}) => {
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  
  // Use controlled state if provided, otherwise use internal state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : uncontrolledIsOpen;

  const filteredOptions = useMemo(() => {
    const source = options || [];
    const q = query.trim().toLowerCase();
    if (!q || hideSearch) return source;
    return source.filter((opt) => getLabel(opt).toLowerCase().includes(q));
  }, [query, options, getLabel, hideSearch]);

  const handleChoose = (item) => {
    onSelect && onSelect(item);
    if (controlledIsOpen === undefined) {
      setUncontrolledIsOpen(false);
    }
    onOpenChange && onOpenChange(false);
    setQuery('');
  };

  const displayValue = value ?? '';

  return (
    <View style={[styles.dropdownWrapper, isOpen && styles.dropdownWrapperOpen, style]}>
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.inputBox, isOpen && styles.inputFocused, disabled && { opacity: 0.6 }, inputBoxStyle]}
        onPress={() => {
          if (disabled) return;
          const next = !isOpen;
          if (controlledIsOpen === undefined) {
            setUncontrolledIsOpen(next);
          }
          onOpenChange && onOpenChange(next);
        }}
        disabled={disabled}
      >
        <Text style={[
          styles.inputPlaceholder,
          displayValue ? styles.inputValue : null,
          { fontSize: TYPOGRAPHY.input, fontFamily: TYPOGRAPHY.fontFamilyRegular },
          textStyle,
        ]}>
          {displayValue || placeholder}
        </Text>
        <Icon name={isOpen ? 'keyboard-arrow-up' : 'keyboard-arrow-down'} size={rf(5)} color="#8e8e93" />
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.dropdownPanel}>
          {!hideSearch && (
            <View style={styles.searchBar}>
              <Icon name="search" size={rf(3.8)} color="#8e8e93" />
              <TextInput
                style={styles.searchBarInput}
                placeholder="Search"
                placeholderTextColor="#8e8e93"
                value={query}
                onChangeText={setQuery}
              />
            </View>
          )}
          <ScrollView
            style={{ maxHeight: hp(maxPanelHeightPercent) }}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            persistentScrollbar
            scrollEnabled
          >
            {hint ? (
              <View style={styles.dropdownHintRow}>
                <Text style={styles.dropdownHintText}>{hint}</Text>
              </View>
            ) : null}
            {filteredOptions.map((item, index) => {
              const label = getLabel(item);
              const key = getKey(item, index);
              const isActive = label === value;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.dropdownItem, isActive && styles.dropdownItemActive]}
                  onPress={() => handleChoose(item)}
                >
                  <Text style={[styles.dropdownItemText, isActive && styles.dropdownItemTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {filteredOptions.length === 0 && (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyStateText}>No results</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

export default Dropdown;

const styles = StyleSheet.create({
  dropdownWrapper: {
    position: 'relative',
    zIndex: 1000,
  },
  dropdownWrapperOpen: {
    zIndex: 4000,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0.8,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2.5),
    paddingHorizontal: wp(4),
    height: hp(5.4),
    marginTop: hp(1.0),
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },
  inputPlaceholder: {
    color: COLORS.textLight,
    fontSize: TYPOGRAPHY.input * 0.9,
  },
  inputValue: {
    color: COLORS.text,
  },
  dropdownPanel: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: hp(0.8),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2.5),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 20,
    zIndex: 1001,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    borderRadius: wp(2),
    paddingHorizontal: wp(3),
    marginHorizontal: wp(3),
    marginTop: hp(1),
    marginBottom: hp(1),
    paddingVertical: hp(0.8),
  },
  searchBarInput: {
    flex: 1,
    marginLeft: wp(1.5),
    fontSize: rf(3.2),
    color: COLORS.text,
    paddingVertical: 0,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  dropdownHintRow: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
  },
  dropdownHintText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  dropdownItem: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3),
  },
  dropdownItemActive: {
    backgroundColor: COLORS.primary,
  },
  dropdownItemText: {
    fontSize: rf(3.0),
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
  dropdownItemTextActive: {
    color: '#fff',
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  emptyStateBox: {
    paddingVertical: hp(3),
    alignItems: 'center',
  },
  emptyStateText: {
    color: COLORS.textLight,
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
  },
}); 