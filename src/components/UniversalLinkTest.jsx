import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { wp, hp, rf } from '../utils/responsive';
import { COLORS, TYPOGRAPHY } from '../screens/styles/styles';
import universalLinkService from '../services/universalLinkService';

const UniversalLinkTest = () => {
  const [testResults, setTestResults] = useState([]);

  const addTestResult = (message) => {
    setTestResults(prev => [...prev, { id: Date.now(), message, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testUniversalLink = (url) => {
    try {
      addTestResult(`Testing URL: ${url}`);
      
      if (universalLinkService.canHandleUrl(url)) {
        addTestResult(`✅ URL can be handled by app`);
        universalLinkService.handleUniversalLink({ url });
        addTestResult(`🚀 Navigation triggered for: ${url}`);
      } else {
        addTestResult(`❌ URL cannot be handled by app`);
      }
    } catch (error) {
      addTestResult(`❌ Error testing URL: ${error.message}`);
    }
  };

  const testNotificationData = () => {
    const notificationData = {
      data: {
        universalLink: 'https://kspapp.com/timesheet',
        screen: 'Timesheet',
        params: { userId: '123', filter: 'pending' }
      }
    };
    
    addTestResult('Testing notification with universal link...');
    // Simulate notification press
    const { data } = notificationData;
    
    if (data?.universalLink) {
      testUniversalLink(data.universalLink);
    } else if (data?.screen) {
      const universalLink = universalLinkService.generateUniversalLink(`/${data.screen}`, data.params || {});
      testUniversalLink(universalLink);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Universal Link Test</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.testButton}
          onPress={() => testUniversalLink('https://kspapp.com/home')}
        >
          <Text style={styles.buttonText}>Test Home Link</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.testButton}
          onPress={() => testUniversalLink('https://kspapp.com/timesheet')}
        >
          <Text style={styles.buttonText}>Test Timesheet Link</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.testButton}
          onPress={() => testUniversalLink('kspapp://profile?userId=123')}
        >
          <Text style={styles.buttonText}>Test Custom Scheme</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.testButton}
          onPress={testNotificationData}
        >
          <Text style={styles.buttonText}>Test Notification Link</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.testButton, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result) => (
          <View key={result.id} style={styles.resultItem}>
            <Text style={styles.resultText}>
              [{result.timestamp}] {result.message}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: wp(4),
    backgroundColor: COLORS.bg,
  },
  title: {
    fontSize: rf(4.5),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: hp(3),
  },
  buttonContainer: {
    marginBottom: hp(3),
  },
  testButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderRadius: wp(2),
    marginBottom: hp(1),
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: COLORS.error || '#ff4444',
  },
  buttonText: {
    color: 'white',
    fontSize: rf(3.2),
    fontFamily: TYPOGRAPHY.fontFamilyMedium,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: COLORS.cardBg || '#f5f5f5',
    borderRadius: wp(2),
    padding: wp(3),
  },
  resultsTitle: {
    fontSize: rf(3.6),
    fontFamily: TYPOGRAPHY.fontFamilyBold,
    color: COLORS.text,
    marginBottom: hp(1),
  },
  resultItem: {
    marginBottom: hp(0.5),
  },
  resultText: {
    fontSize: rf(2.8),
    fontFamily: TYPOGRAPHY.fontFamilyRegular,
    color: COLORS.textMuted,
    lineHeight: rf(3.6),
  },
});

export default UniversalLinkTest;
