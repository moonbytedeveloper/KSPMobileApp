import React, { useEffect, useState, useCallback } from 'react';
import { SafeAreaView, ActivityIndicator, StyleSheet, Dimensions, View, Text, Platform, TouchableOpacity, Alert } from 'react-native';
import Pdf from 'react-native-pdf';
import RNFetchBlob from 'react-native-blob-util';
import Loader from './Loader';
import AppHeader from './AppHeader';
import BottomSheetConfirm from './BottomSheetConfirm';
import { useNavigation } from '@react-navigation/native';   
import RNPrint from 'react-native-print';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Share from 'react-native-share';

const FileViewerScreen = ({ route }) => {
  const { pdfUrl, pdfBase64, opportunityTitle, companyName, fileName } = route.params || {};
  const [localFile, setLocalFile] = useState(null);
  const [localPath, setLocalPath] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorText, setErrorText] = useState('');
  const navigation = useNavigation();
  const [sheetState, setSheetState] = useState({
    visible: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: '',
  });
  useEffect(() => {
    const preparePdf = async () => {
      try {
        const { fs, config } = RNFetchBlob;
        const targetName = (fileName || 'temp').replace(/[^a-zA-Z0-9_\-]/g, '_');
        const localPath = `${fs.dirs.DocumentDir}/${targetName}.pdf`;

        if (pdfBase64) {
          const sanitized = pdfBase64.includes('base64,')
            ? pdfBase64.split('base64,')[1]
            : pdfBase64;
          await fs.writeFile(localPath, sanitized, 'base64');
          setLocalFile(`file://${localPath}`);
          setLocalPath(localPath);
        } else if (pdfUrl) {
          // Download the file
          const res = await config({ path: localPath }).fetch('GET', pdfUrl);
          const contentLength = Number(res?.info()?.headers?.['Content-Length'] || res?.info()?.headers?.['content-length'] || 0);
          if (!contentLength) {
            setErrorText('File is empty');
          }
          setLocalFile(`file://${localPath}`);
          setLocalPath(localPath);
        } else {
          setErrorText('No PDF source provided');
        }
      } catch (err) {
        console.log('PDF download error:', err);
        setErrorText('Failed to load PDF');
      } finally {
        setLoading(false);
      }
    };

    preparePdf();
  }, [pdfUrl, pdfBase64, fileName]);

  const handlePrint = useCallback(async () => {
    try {
      if (!localPath) {
        throw new Error('No local PDF to print');
      }
      const hasRNPrint = !!(RNPrint && typeof RNPrint.print === 'function');
      console.log('[FileViewerScreen] RNPrint available:', hasRNPrint);
      if (hasRNPrint) {
        await RNPrint.print({ filePath: localPath });
        return;
      }
      console.log('[FileViewerScreen] RNPrint not available. Aborting print inside app.');
      Alert.alert('Printing unavailable', 'Printing module not linked. Rebuild the app after installing react-native-print.');
    } catch (e) {
      console.log('[FileViewerScreen] Print failed:', e?.message || e);
    }
  }, [localPath]);

  // Download to public folder without relying on http/https (fix: DM requires http/https)
  const handleDownloadDM = useCallback(async () => {
    try {
      const baseName = (fileName || 'document').replace(/[^a-zA-Z0-9_\-]/g, '_') + '.pdf';
      const { fs } = RNFetchBlob;
      const ensuredPath = localPath || `${fs.dirs.DocumentDir}/${baseName}`;
      if (!localPath) {
        // Build file from base64 if needed
        if (pdfBase64 && typeof pdfBase64 === 'string' && pdfBase64.trim().length > 0) {
          const raw = pdfBase64.includes('base64,') ? pdfBase64.split('base64,')[1] : pdfBase64;
          await fs.writeFile(ensuredPath, raw, 'base64');
          setLocalFile(`file://${ensuredPath}`);
          setLocalPath(ensuredPath);
        } else {
          throw new Error('No PDF data available to save.');
        }
      }

      // Save into Documents for both platforms
      const docTarget = `${fs.dirs.DocumentDir}/${baseName}`;
      if (docTarget !== ensuredPath) {
        try {
          await fs.cp(ensuredPath, docTarget);
        } catch (_cpErr) {
          const b64 = await fs.readFile(ensuredPath, 'base64');
          await fs.writeFile(docTarget, b64, 'base64');
        }
      }
      setSheetState({
        visible: true,
        title: 'Downloaded',
        message: `Saved to:\n${docTarget}`,
        confirmText: 'OK',
        cancelText: '',
      });
    } catch (e) {
      console.log('[FileViewerScreen] Download failed:', e?.message || e);
      setSheetState({
        visible: true,
        title: 'Save failed',
        message: String(e?.message || 'Could not save the file.'),
        confirmText: 'OK',
        cancelText: '',
      });
    }
  }, [fileName, localPath, pdfBase64]);

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
      <><AppHeader
        title={`${opportunityTitle ? `${opportunityTitle} Proposal` : companyName ? `${companyName} Proposal` : fileName ? fileName : 'Document'}`}
        onLeftPress={() => navigation.goBack()}
        showRight={false}
      />
      <View style={styles.toolbar}>
        {/* <TouchableOpacity style={styles.toolButton} onPress={handleDownloadDM} activeOpacity={0.85}>
          <Icon name="download" size={18} color="#111" />
          <Text style={styles.toolText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={async () => {
            try {
              const { fs } = RNFetchBlob;
              const baseName = (fileName || 'document').replace(/[^a-zA-Z0-9_\-]/g, '_') + '.pdf';
              const appDocPath = `${fs.dirs.DocumentDir}/${baseName}`;
              // Prefer sharing base64 to avoid Android file URI issues
              if (pdfBase64 && typeof pdfBase64 === 'string') {
                const sanitized = pdfBase64.includes('base64,') ? pdfBase64 : `data:application/pdf;base64,${pdfBase64}`;
                await Share.open({
                  url: sanitized,
                  type: 'application/pdf',
                  failOnCancel: false,
                  showAppsToView: true,
                  filename: baseName,
                  title: 'Save As',
                  subject: baseName,
                });
              } else {
                // Fallback to local file
                if (appDocPath !== localPath) {
                  await fs.cp(localPath, appDocPath);
                }
                await Share.open({
                  url: `file://${appDocPath}`,
                  type: 'application/pdf',
                  failOnCancel: false,
                  showAppsToView: true,
                  filename: baseName,
                  title: 'Save As',
                  subject: baseName,
                });
              }
            } catch (e) {
              console.log('[FileViewerScreen] Save As failed:', e?.message || e);
              setSheetState({
                visible: true,
                title: 'Save As failed',
                message: 'Could not open system Save dialog.',
                confirmText: 'OK',
                cancelText: '',
              });
            }
          }}
          activeOpacity={0.85}
        >
          <Icon name="save" size={18} color="#111" />
          <Text style={styles.toolText}>Save As</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.toolButton} onPress={handlePrint} activeOpacity={0.85}>
          <Icon name="print" size={18} color="#111" />
          <Text style={styles.toolText}>Print</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.loader}>
          <Text>{errorText}</Text>
        </View>
      </>
    );
  }

  return (
    <>
        <AppHeader
          title={`${opportunityTitle ? `${opportunityTitle} Proposal` : companyName ? `${companyName} Proposal` : fileName ? fileName : 'Document'}`}
          onLeftPress={() => navigation.goBack()}
          showRight={false}
        />
      <View style={styles.toolbar}>
        {/* <TouchableOpacity
          style={styles.toolButton}
          onPress={handleDownloadDM}
          activeOpacity={0.85}
        >
          <Icon name="download" size={18} color="#111" />
          <Text style={styles.toolText}>Download</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.toolButton}
          onPress={async () => {
            try {
              const { fs } = RNFetchBlob;
              const baseName = (fileName || 'document').replace(/[^a-zA-Z0-9_\-]/g, '_') + '.pdf';
              const appDocPath = `${fs.dirs.DocumentDir}/${baseName}`;
              if (appDocPath !== localPath) {
                await fs.cp(localPath, appDocPath);
              }
              await Share.open({
                url: `file://${appDocPath}`,
                type: 'application/pdf',
                failOnCancel: false,
                showAppsToView: true,
                filename: baseName,
                title: 'Save As',
                subject: baseName,
              });
            } catch (e) {
              console.log('[FileViewerScreen] Save As failed:', e?.message || e);
              setSheetState({
                visible: true,
                title: 'Save As failed',
                message: 'Could not open system Save dialog.',
                confirmText: 'OK',
                cancelText: '',
              });
            }
          }}
          activeOpacity={0.85}
        >
          <Icon name="save" size={18} color="#111" />
          <Text style={styles.toolText}>Save As</Text>
        </TouchableOpacity> */}
        <TouchableOpacity style={styles.toolButton} onPress={handlePrint} activeOpacity={0.85}>
          <Icon name="print" size={18} color="#111" />
          <Text style={styles.toolText}>Print</Text>
        </TouchableOpacity>
      </View>
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
      <BottomSheetConfirm
        visible={sheetState.visible}
        title={sheetState.title}
        message={sheetState.message}
        confirmText={sheetState.confirmText}
        cancelText={sheetState.cancelText}
        onConfirm={() => setSheetState(s => ({ ...s, visible: false }))}
        onCancel={() => setSheetState(s => ({ ...s, visible: false }))}
        autoCloseOnConfirm
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  pdf: { flex: 1, width: Dimensions.get('window').width },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f8f8f8',
  },
  toolButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 8,
  },
  toolText: {
    color: '#111',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default FileViewerScreen;
