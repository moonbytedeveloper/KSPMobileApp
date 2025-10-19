import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { TabContext } from '../../navigation/BottomTabs/TabContext';
import LeadForm from './LeadForm';
import AppHeader from '../../components/common/AppHeader';
const ManageLeadScreen = ({ navigation,route}) => {
  const { setActiveIndex } = useContext(TabContext);

  return (
    <View style={styles.container}>
       <AppHeader
          title="Add New Lead"
           
          onLeftPress={() => navigation.goBack()}
          rightButtonLabel="Add New Lead"
         showRight={false}
        /> 
      <LeadForm  route={route} onSubmit={() => navigation.goBack()} onCancel={() => navigation.goBack()} />
    </View>
  );
};

export default ManageLeadScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    // paddingTop: safeAreaTop,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  backButton: {
    padding: wp(1.5),
    borderRadius: wp(2),
  },
  title: {
    fontSize: rf(5),
    fontWeight: '600',
    color: '#333',
  },
});


