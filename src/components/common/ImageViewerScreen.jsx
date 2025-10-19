import React from 'react';
import Modal from 'react-native-modal';
import ImageViewer from 'react-native-image-zoom-viewer';
import { SafeAreaView, StyleSheet } from 'react-native';
import AppHeader from './AppHeader';
import { useNavigation } from '@react-navigation/native';
const ZoomableImageViewer = ({ route }) => {
  const { pdfUrl, opportunityTitle, companyName } = route.params;
  const navigation = useNavigation();

  if (!imageUrl) return null;

  return (
    <>
        <AppHeader title={`${opportunityTitle ? `${opportunityTitle} Proposal` : companyName ? `${companyName} Proposal` : 'Proposal'}`} onLeftPress={() => navigation.goBack()}/>
        <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
      <ImageViewer
        imageUrls={[{ url: imageUrl }]} // array of images
        enableSwipeDown={true}         // swipe down to close
        onSwipeDown={() => console.log('Swipe down')}
        renderIndicator={() => null}    // hide page indicator
        saveToLocalByLongPress={false} // disable long press save
      />
    </SafeAreaView>
    </>
  );
};

export default ZoomableImageViewer;
