import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppStack from './Stack/AppStack';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { setNavigationRef } from '../api/axios';
import universalLinkService from '../services/universalLinkService';

const AppNavigator = () => {
  useEffect(() => {
    // Set navigation reference for universal link service
    universalLinkService.setNavigationRef(setNavigationRef);
  }, []);

  return (
    <NavigationContainer ref={setNavigationRef}>
      <BottomSheetModalProvider>
        <AppStack />
      </BottomSheetModalProvider>
    </NavigationContainer>
  );
};

export default AppNavigator;
