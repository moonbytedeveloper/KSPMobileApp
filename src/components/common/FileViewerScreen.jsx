import React, { useEffect, useState } from 'react';
import { SafeAreaView, ActivityIndicator, StyleSheet, Dimensions, View, Text } from 'react-native';
import Pdf from 'react-native-pdf';
import RNFetchBlob from 'react-native-blob-util';
import Loader from './Loader';
import AppHeader from './AppHeader';
import { useNavigation } from '@react-navigation/native';   

const FileViewerScreen = ({ route }) => {
  const { pdfUrl, opportunityTitle, companyName } = route.params;
  const [localFile, setLocalFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const navigation = useNavigation();
  useEffect(() => {
    const downloadPdf = async () => {
      try {
        const { fs, config } = RNFetchBlob;
        const localPath = `${fs.dirs.DocumentDir}/temp.pdf`;

        // Download the file
        const res = await config({ path: localPath }).fetch('GET', pdfUrl);
        const contentLength = Number(res?.info()?.headers?.['Content-Length'] || res?.info()?.headers?.['content-length'] || 0);
        if (!contentLength) {
          setErrorText('File is empty');
        }

        setLocalFile(`file://${localPath}`);
      } catch (err) {
        console.log('PDF download error:', err);
        setErrorText('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    downloadPdf();
  }, [pdfUrl]);

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Loader />
      </View>
    );
  }

  if (errorText) {
    return (
      <><AppHeader title={`${opportunityTitle ? `${opportunityTitle} Proposal` : companyName ? `${companyName} Proposal` : 'Proposal'}`} onLeftPress={() => navigation.goBack()}/>
      <View style={styles.loader}>
          <Text>{errorText}</Text>
        </View>
      </>
    );
  }

  return (
    <>
        <AppHeader title={`${opportunityTitle ? `${opportunityTitle} Proposal` : companyName ? `${companyName} Proposal` : 'Proposal'}`} onLeftPress={() => navigation.goBack()}/>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000' }}>
        <Pdf
          source={{ uri: localFile }}
          style={styles.pdf}
          onLoadComplete={(pages) => console.log(`PDF Loaded: ${pages} pages`)}
          onError={(error) => {
            console.log('PDF render error:', error);
            const msg = String(error?.message || error);
            if (msg.toLowerCase().includes('empty')) setErrorText('File is empty');
            else setErrorText('Failed to render PDF');
          }}
          onLoadProgress={(percent) => console.log('Loading:', percent)}
        />
      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdf: { flex: 1, width: Dimensions.get('window').width },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default FileViewerScreen;
