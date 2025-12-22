import React, { useContext, useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, PermissionsAndroid, Platform, RefreshControl, ActivityIndicator } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { wp, hp, rf, safeAreaTop } from '../../utils/responsive';
import { TabContext } from '../../navigation/BottomTabs/TabContext';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../components/common/AppHeader';
import Loader from '../../components/common/Loader';
import { pick, types, isCancel } from '@react-native-documents/picker';
import { COLORS, TYPOGRAPHY } from '../styles/styles';
import { getProfile, updateProfileImage, getProfileImage, deleteProfileImage, uploadFiles } from '../../api/authServices';
import { getProfile as getStoredProfile, getUUID, getRoles, getDesignation, getCMPUUID, getENVUUID } from '../../api/tokenStorage';
const TABS = {
  BASIC: 'Basic Information',
  IDENTITY: 'Identity Proof',
  BANK: 'Bank Information',
};

const ProfileScreen = () => {
  const { setActiveIndex } = useContext(TabContext);
  const [activeTab, setActiveTab] = useState(TABS.BASIC);
  const navigation = useNavigation();
  const [profileImage, setProfileImage] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userUUID, setUserUUID] = useState(null);
  const [userRoles, setUserRoles] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [serverProfileImage, setServerProfileImage] = useState(null);
  const [deletingImage, setDeletingImage] = useState(false);
  
  const bottomSheetRef = useRef(null);
  const messageSheetRef = useRef(null);
  const confirmSheetRef = useRef(null);
  const [messageTitle, setMessageTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [confirmConfig, setConfirmConfig] = useState({ title: '', text: '', onConfirm: null });
  const snapPoints = useMemo(() => [hp(25)], []);
  const msgSnapPoints = useMemo(() => [hp(28)], []);
  const confirmSnapPoints = useMemo(() => [hp(28)], []);

  useEffect(() => {
    fetchProfileData();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      
      // Load stored data first
      const storedProfile = await getStoredProfile();
      const storedUUID = await getUUID();
      const storedRoles = await getRoles();
      
      console.log('Stored profile:', storedProfile);
      console.log('Stored UUID:', storedUUID);
      console.log('Stored roles:', storedRoles);
      
      // Set stored data in state
      if (storedProfile) {
        setProfileData(storedProfile);
      }
      if (storedUUID) {
        setUserUUID(storedUUID);
      }
      if (storedRoles) {
        setUserRoles(storedRoles);
      }
      
      // Fetch fresh data from API
      const response = await getProfile();
      console.log('Profile API response:', response);
      console.log('Profile API response.Data:', response.Data);
      
      if (response.Data) {
        setProfileData(response.Data);
        console.log('Set profileData to:', response.Data);
      }
      
      // Fetch profile image
      await fetchProfileImage();
      
    } catch (error) {
      console.log('Profile fetch error:', error);
      console.log('Error response:', error?.response);
      console.log('Error response data:', error?.response?.data);
      console.log('Error response status:', error?.response?.status);
      
      let errorMessage = 'Failed to load profile data';
      if (error?.response?.data?.Message) {
        errorMessage = error.response.data.Message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      setMessageTitle('Error');
      setMessageText(String(errorMessage));
      messageSheetRef.current?.present();
    } finally {
      setLoading(false);
    }
  };

  const fetchProfileImage = async () => {
    try {
      const response = await getProfileImage();
      console.log('Profile image API response:', response);
      
      if (response?.Data?.ProfileImagePath) {
        setServerProfileImage(response.Data.ProfileImagePath);
        console.log('Set server profile image:', response.Data.ProfileImagePath);
      }
    } catch (error) {
      console.log('Profile image fetch error:', error);
      // Don't show error alert for profile image as it's optional
    }
  };

  const requestStoragePermissionAndroid = async () => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version >= 33) {
      const readImages = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES);
      return readImages === PermissionsAndroid.RESULTS.GRANTED;
    }
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const onRefresh = async () => {
    if (refreshing || loading) return;
    setRefreshing(true);
    try {
      await fetchProfileData();
    } finally {
      setRefreshing(false);
    }
  };

  const handlePickProfileImage = () => {
    bottomSheetRef.current?.present();
  };

  const handleGalleryPress = async () => {
    bottomSheetRef.current?.dismiss();
    try {
      const hasPerm = await requestStoragePermissionAndroid();
      if (!hasPerm) {
        setMessageTitle('Permission required');
        setMessageText('Storage permission is needed to pick a profile image.');
        messageSheetRef.current?.present();
        return;
      }
      const [file] = await pick({ type: [types.images], allowMultiSelection: false });
      setProfileImage(file);
      
      // Upload the image immediately after selection
      await uploadProfileImage(file);
    } catch (err) {
      if (isCancel && isCancel(err)) return;
      // console.warn('Image pick error:', err);
      // setMessageTitle('Picker Error');
      // setMessageText(String(err?.message || err));
      // messageSheetRef.current?.present();
    }
  };

  const handleDeletePress = async () => {
    bottomSheetRef.current?.dismiss();
    
    setConfirmConfig({
      title: 'Delete Profile Image',
      text: 'Are you sure you want to delete your profile image?',
      onConfirm: async () => {
        try {
          setDeletingImage(true);
          await deleteProfileImage();
          setServerProfileImage(null);
          setProfileImage(null);
          setMessageTitle('Success');
          setMessageText('Profile image deleted successfully!');
          messageSheetRef.current?.present();
        } catch (error) {
          console.log('Delete profile image error:', error);
          let errorMessage = 'Failed to delete profile image';
          if (error?.response?.data?.Message) {
            errorMessage = error.response.data.Message;
          } else if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
          } else if (error?.message) {
            errorMessage = error.message;
          }
          setMessageTitle('Delete Error');
          setMessageText(String(errorMessage));
          messageSheetRef.current?.present();
        } finally {
          setDeletingImage(false);
          confirmSheetRef.current?.dismiss();
        }
      },
    });
    confirmSheetRef.current?.present();
  };

  const uploadProfileImage = async (file) => {
    if (!file) return;
    
    try {
      setUploadingImage(true);
      
      // Get required UUIDs from storage
      const [userUuid, cmpUuid, envUuid] = await Promise.all([
        getUUID(),
        getCMPUUID(),
        getENVUUID()
      ]);
      
      console.log('Retrieved UUIDs:', { userUuid, cmpUuid, envUuid });
      
      if (!userUuid || !cmpUuid || !envUuid) {
        setMessageTitle('Error');
        setMessageText('User information is incomplete. Please log in again.');
        messageSheetRef.current?.present();
        return;
      }
      
      // Step 1: Upload file to server first using /api/CompanySetup/upload-file
      console.log('Step 1: Uploading file to server...');
      const fileObj = {
        uri: file.uri,
        name: file.name || `profile_${Date.now()}.jpg`,
        type: file.type || 'image/jpeg'
      };
      
      // Call upload-file API with fixed Filepath value
      const uploadResponse = await uploadFiles(fileObj, { filepath: 'EmployeeProfilePic' });
      console.log('Upload file response:', uploadResponse);
      
      
      
      // Step 2: If file upload successful, call updateProfileImage API with server file path
      console.log('Step 2: Updating profile image with uploaded file path...');

      // Try to extract a server-side file path from upload response (support multiple possible shapes)
      let uploadedPaths = [];
      try {
        // Handle multiple possible response shapes. The backend may return the path under
        // RemoteResponse.path (as in the reported example), Data.FilePath, FilePath, or arrays.
        const data = uploadResponse?.Data ?? uploadResponse;

        // Direct RemoteResponse.path (example provided by user)
        const rrPath = uploadResponse?.RemoteResponse?.path || uploadResponse?.Data?.RemoteResponse?.path || data?.RemoteResponse?.path;
        if (rrPath) uploadedPaths.push(rrPath);

        if (data) {
          if (Array.isArray(data.FilePaths)) uploadedPaths = uploadedPaths.concat(data.FilePaths);
          if (data.FilePath) uploadedPaths.push(data.FilePath);

          if (Array.isArray(data.UploadedFiles)) uploadedPaths = uploadedPaths.concat(data.UploadedFiles.map(f => f?.Path || f?.FilePath || f?.path || f?.filePath).filter(Boolean));
          if (Array.isArray(data.Files)) uploadedPaths = uploadedPaths.concat(data.Files.map(f => f?.Path || f?.FilePath || f?.path || f?.filePath).filter(Boolean));

          // some servers return { path: '...' } directly inside Data
          if (data.path && typeof data.path === 'string') uploadedPaths.push(data.path);
        }

        // top-level fallbacks
        if (Array.isArray(uploadResponse?.FilePaths)) uploadedPaths = uploadedPaths.concat(uploadResponse.FilePaths);
        if (uploadResponse?.FilePath) uploadedPaths.push(uploadResponse.FilePath);
        if (uploadResponse?.path) uploadedPaths.push(uploadResponse.path);

        // If the response itself is a plain string, use it
        if (typeof uploadResponse === 'string') uploadedPaths.push(uploadResponse);

        // Normalize and remove duplicates / falsy
        uploadedPaths = Array.from(new Set((uploadedPaths || []).filter(Boolean)));
      } catch (e) {
        console.warn('Failed to extract uploaded file path', e);
      }

      const firstPath = uploadedPaths && uploadedPaths.length ? uploadedPaths[0] : null;

      // Build payload with the four required fields: UserUuid, CmpUuid, EnvUuid, ProfilePath
      const payload = firstPath
        ? { UserUuid: userUuid, CmpUuid: cmpUuid, EnvUuid: envUuid, ProfilePath: firstPath }
        : { UserUuid: userUuid, CmpUuid: cmpUuid, EnvUuid: envUuid, profileImageFile: fileObj };

      console.log('Calling updateProfileImage with payload:', payload);
      let updateResponse;
      try {
        updateResponse = await updateProfileImage(payload);
        console.log('Profile image update response:', updateResponse);
      } catch (err) {
        console.error('updateProfileImage threw error:', err?.message || err);
        console.error('updateProfileImage error.response.data:', err?.response?.data);
        console.error('updateProfileImage error.response.status:', err?.response?.status);
        throw err;
      }
      
      // Show success message
      setMessageTitle('Success');
      setMessageText('Profile image updated successfully!');
      messageSheetRef.current?.present();
      
      // Refresh profile image from server
      await fetchProfileImage();
      
    } catch (error) {
      console.log('Profile image upload error:', error);
      let errorMessage = 'Failed to upload profile image';
      if (error?.response?.data?.Message) {
        errorMessage = error.response.data.Message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      setMessageTitle('Upload Error');
      setMessageText(String(errorMessage));
      messageSheetRef.current?.present();
    } finally {
      setUploadingImage(false);
    }
  };

  const TabButton = ({ label }) => {
    const isActive = activeTab === label;
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={() => setActiveTab(label)} style={styles.tabButton}>
        <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
        <View style={[styles.tabIndicator, isActive && styles.tabIndicatorActive]} />
      </TouchableOpacity>
    );
  };

  const SectionRow = ({ title, value }) => {
    return (
      <View style={styles.rowItem}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    );
  };


  const basicInfo = useMemo(
    () => {
      console.log('basicInfo useMemo - profileData:', profileData);
      console.log('basicInfo useMemo - profileData.BasicInformation:', profileData?.BasicInformation);
      
      if (!profileData?.BasicInformation) {
        console.log('No BasicInformation found, returning empty array');
        return [];
      }
      
      const basic = profileData.BasicInformation;
      console.log('basic object:', basic);
      
      const result = [
        { title: 'Employee Code', value: basic.EmployeeCode || 'N/A' },
        { title: 'Full Name', value: basic.FullName || 'N/A' },
        { title: 'Mobile Number', value: basic.MobileNo || 'N/A' },
        { title: 'Email Id', value: basic.EmailId || 'N/A' },
        { title: 'Gender', value: basic.Gender || 'N/A' },
        { title: 'Date of Birth', value: basic.DateOfBirth ? new Date(basic.DateOfBirth).toLocaleDateString() : 'N/A' },
        { title: 'Blood Group', value: basic.BloodGroup || 'N/A' },
        { title: 'Nationality', value: basic.Nationality || 'N/A' },
      ];
      
      console.log('basicInfo result:', result);
      return result;
    },
    [profileData]
  );

  const identityInfo = useMemo(
    () => {
      console.log('identityInfo useMemo - profileData.IdentityProof:', profileData?.IdentityProof);
      
      if (!profileData?.IdentityProof) {
        console.log('No IdentityProof found, returning empty array');
        return [];
      }
      
      const identity = profileData.IdentityProof;
      console.log('identity object:', identity);
      
      const result = [
        { title: 'Pan No', value: identity.PanNo || 'N/A' },
        { title: 'Aadhar No', value: identity.AadharNo || 'N/A' },
        { title: 'Passport No', value: identity.PassportNo || 'N/A' },
      ];
      
      console.log('identityInfo result:', result);
      return result;
    },
    [profileData]
  );

  const bankInfo = useMemo(
    () => {
      console.log('bankInfo useMemo - profileData.BankInformation:', profileData?.BankInformation);
      
      if (!profileData?.BankInformation) {
        console.log('No BankInformation found, returning empty array');
        return [];
      }
      
      const bank = profileData.BankInformation;
      console.log('bank object:', bank);
      
      const result = [
        { title: 'Bank Name', value: bank.BankName || 'N/A' },
        { title: 'Account No', value: bank.AccountNo || 'N/A' },
        { title: 'IFSC Code', value: bank.IFSCCode || 'N/A' },
        { title: 'Account Type', value: bank.AccountType || 'N/A' },
      ];
      
      console.log('bankInfo result:', result);
      return result;
    },
    [profileData]
  );

  const renderCard = (title, rows) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        <View style={styles.cardBody}>
          {rows.map((r, idx) => (
            <SectionRow key={`${r.title}-${idx}`} title={`${r.title}:`} value={r.value} />
          ))}
        </View>
      </View>
    );
  };

  const renderActiveTab = () => {
    if (activeTab === TABS.BASIC) return renderCard(TABS.BASIC, basicInfo);
    if (activeTab === TABS.IDENTITY) return renderCard(TABS.IDENTITY, identityInfo);
    return renderCard(TABS.BANK, bankInfo);
  };
  
  if (loading && !profileData) {
    return (
      <View style={styles.container}>
        <AppHeader
          title="Profile"
          onLeftPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
              return; // show back when opened from Drawer
            } else {
              setActiveIndex(0);
            }
          }}
          onRightPress={() => navigation.navigate('Notification')}
        />
        <Loader />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppHeader
        title="Profile"
        onLeftPress={() => {
          if (navigation.canGoBack()) {
            navigation.goBack();
            return // show back when opened from Drawer
          } else {
            setActiveIndex(0) 
            // fallback → for BottomTabs (no goBack)
            // or do nothing
          }
        }}
        onRightPress={() => navigation.navigate('Notification')}
        
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={(<RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />)}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              activeOpacity={0.8} 
              onPress={handlePickProfileImage}
              disabled={uploadingImage}
            >
               <View style={styles.avatarWrap}>
                 {serverProfileImage ? (
                   <Image source={{ uri: serverProfileImage }} style={styles.avatarImage} />
                 ) : profileImage?.uri ? (
                   <Image source={{ uri: profileImage.uri }} style={styles.avatarImage} />
                 ) : (
                   <Icon name="account-circle" size={rf(12)} color="#f26b5b" />
                 )}
                <View style={styles.editBadge}>
                  {(uploadingImage || deletingImage) ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Icon name="edit" size={rf(3.6)} color="#fff" />
                  )}
                </View>
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.nameText}>
                {profileData?.BasicInformation?.FullName || 'Loading...'}
              </Text>
              {/* <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('EditProfile')}>
                <Icon name="edit" size={rf(5.2)} color="#222" />
              </TouchableOpacity> */}
            </View>
            <View style={styles.subRow}>
              <Text style={styles.subTitle}>
                 {profileData?.BasicInformation?.Designation || 'Employee'}
              </Text>
            </View> 
          </View>
        </View>

        <View style={styles.tabsRow}>
          <TabButton label={TABS.BASIC} />
          <TabButton label={TABS.IDENTITY} />
          <TabButton label={TABS.BANK} />
        </View>

        {renderActiveTab()}
      </ScrollView>

      {/* Profile Image Options Bottom Sheet */}
      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableContentPanningGesture={false}
        handleIndicatorStyle={styles.bottomSheetHandle}
        handleStyle={{ backgroundColor: 'transparent' }}
        backgroundStyle={styles.bottomSheetBackground}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
        )}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>Profile Image Options</Text>
          </View>
          
          <View style={styles.bottomSheetOptions}>
            <TouchableOpacity 
              style={styles.bottomSheetOption} 
              onPress={handleGalleryPress}
              activeOpacity={0.7}
            >
              <Icon name="photo-library" size={rf(5)} color={COLORS.primary} />
              <Text style={[styles.bottomSheetOptionText, {marginLeft: wp(3)}]}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            {serverProfileImage && (
              <TouchableOpacity 
                style={[styles.bottomSheetOption, styles.deleteOption]} 
                onPress={handleDeletePress}
                activeOpacity={0.7}
              >
                <Icon name="delete" size={rf(5)} color="#ef4444" />
                <Text style={[styles.bottomSheetOptionText, styles.deleteOptionText, {marginLeft: wp(3)}]}>Delete Image</Text>
              </TouchableOpacity>
            )}
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Message Bottom Sheet */}
      <BottomSheetModal
        ref={messageSheetRef}
        snapPoints={msgSnapPoints}
        enablePanDownToClose
        handleIndicatorStyle={styles.bottomSheetHandle}
        handleStyle={{ backgroundColor: 'transparent' }}
        backgroundStyle={styles.bottomSheetBackground}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
        )}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>{messageTitle || 'Message'}</Text>
          </View>
          <View style={{ paddingHorizontal: wp(2), paddingBottom: hp(1.5) }}>
            <Text style={{ fontSize: rf(3.6), color: COLORS.text, textAlign: 'center' }}>{messageText}</Text>
          </View>
          <View style={{ alignItems: 'center', marginTop: hp(1), }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => messageSheetRef.current?.dismiss()} style={[styles.bottomSheetOptionz, { width: '60%'  }]}>
              <Text style={[styles.bottomSheetOptionText , { textAlign: 'center' }]}>OK</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Confirm Bottom Sheet */}
      <BottomSheetModal
        ref={confirmSheetRef}
        snapPoints={confirmSnapPoints}
        enablePanDownToClose
        handleIndicatorStyle={styles.bottomSheetHandle}
        handleStyle={{ backgroundColor: 'transparent' }}
        backgroundStyle={styles.bottomSheetBackground}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.45} pressBehavior="close" />
        )}
      >
        <BottomSheetView style={styles.bottomSheetContent}>
          <View style={styles.bottomSheetHeader}>
            <Text style={styles.bottomSheetTitle}>{confirmConfig.title || 'Confirm'}</Text>
          </View>
          <View style={{ paddingHorizontal: wp(2), paddingBottom: hp(1.5) }}>
            <Text style={{ fontSize: rf(3.6), color: COLORS.text, textAlign: 'center' }}>{confirmConfig.text || ''}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-evenly', paddingHorizontal: wp(4), marginTop: hp(1) }}>
            <TouchableOpacity activeOpacity={0.8} onPress={() => confirmSheetRef.current?.dismiss()} style={[styles.bottomSheetOptionz, { flex: 1, marginRight: wp(2) }]}>
              <Text style={[styles.bottomSheetOptionText, { textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} onPress={() => confirmConfig.onConfirm && confirmConfig.onConfirm()} style={[styles.bottomSheetOptionz, styles.deleteOption, { flex: 1, marginLeft: wp(2) }]}>
              <Text style={[styles.bottomSheetOptionText, styles.deleteOptionText, { textAlign: 'center' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </BottomSheetView>
      </BottomSheetModal>

    </View>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    // paddingTop: safeAreaTop,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
  scrollContent: {
    paddingHorizontal: wp(4),
    paddingBottom: hp(4),
  },
  profileCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: wp(3),
    padding: wp(3),
    alignItems: 'center',
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: COLORS.divider,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  avatarWrap: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
    backgroundColor: '#fff0ed',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: wp(3),
  },
  avatarImage: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
  },
  editBadge: {
    position: 'absolute',
    right: wp(0.5),
    bottom: wp(0.5),
    width: wp(6.5),
    height: wp(6.5),
    borderRadius: wp(3.25),
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nameText: {
    fontSize: rf(4.6),
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(0.5),
  },
  subTitle: {
    fontSize: rf(3.4),
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    marginRight: wp(1),
  },
  iconBtn: {
    paddingHorizontal: wp(1.5),
    paddingVertical: hp(0.5),
  },
  iconBtnSmall: {
    paddingHorizontal: wp(1),
    paddingVertical: hp(0.3),
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: hp(1),
    marginBottom: hp(1),
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: rf(3.6),
    color: COLORS.textMuted,
    fontWeight: '600',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  tabIndicator: {
    height: 2,
    backgroundColor: 'transparent',
    width: '70%',
    marginTop: hp(0.8),
    marginBottom: -1,
  },
  tabIndicatorActive: {
    backgroundColor: COLORS.primary,
  },
  card: {
    backgroundColor: COLORS.bg,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.divider,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    marginTop: hp(1.5),
  },
  cardHeader: {
    borderBottomWidth: 1,
    borderColor: COLORS.divider,
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
  },
  cardTitle: {
    fontSize: rf(4.2),
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyBold,
  },
  cardBody: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  rowItem: {
    marginBottom: hp(1.2),
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
  },
  rowTitle: {
    fontSize: rf(3.4),
    color: COLORS.text,
    fontWeight: '700',
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    marginBottom: hp(0.4),
    marginRight: wp(1),
  },
  rowValue: {
    fontSize: rf(3.4),
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    flexShrink: 1,
  },
  // Bottom Sheet Styles
  bottomSheetHandle: {
    alignSelf: 'center',
    width: wp(18),
    height: hp(0.7),
    backgroundColor: '#2e2e2e',
    borderRadius: hp(0.6),
    marginTop: hp(1),
    marginBottom: hp(1.5),
  },
  bottomSheetBackground: {
    backgroundColor: COLORS.bg,
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  bottomSheetContent: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: wp(6),
    paddingBottom: hp(2.5),
    borderTopLeftRadius: wp(6),
    borderTopRightRadius: wp(6),
  },
  bottomSheetHeader: {
    alignItems: 'center',
    marginBottom: hp(2),
  },
  bottomSheetTitle: {
    fontSize: rf(4.2),
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  bottomSheetOptions: {
    gap: hp(1.5),
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    backgroundColor: COLORS.bgMuted,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bottomSheetOptionz: { 
    alignItems: 'center',
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    backgroundColor: COLORS.bgMuted,
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  deleteOption: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  bottomSheetOptionText: {
    fontSize: rf(3.8),
    fontWeight: '500',
    color: COLORS.text,
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  deleteOptionText: {
    color: '#ef4444',
  },
});