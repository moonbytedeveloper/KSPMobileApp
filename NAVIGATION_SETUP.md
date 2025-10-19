# Navigation Setup

This document describes the navigation structure implemented in the KSP Consultant app.

## Overview

The app uses React Navigation v7 with a Stack Navigator to provide screen-to-screen navigation.

## Navigation Structure

### Main Components

1. **AppNavigator** (`src/navigation/AppNavigator.jsx`)
   - Main navigation container that wraps the entire app
   - Uses `NavigationContainer` from React Navigation

2. **AppStack** (`src/navigation/Stack/AppStack.jsx`)
   - Stack navigator containing all main screens
   - Configured with custom header styling
   - Initial route is set to "Home"

### Screens

The app includes the following screens:

1. **Home** (`src/screens/Home/HomeScreen.jsx`)
   - Main dashboard with navigation cards to other sections
   - Color-coded menu items for easy identification

2. **Business Development** (`src/screens/BusinessDevelopment/BusinessDevelopmentScreen.jsx`)
   - Client management, proposals, opportunities, and reports

3. **Expense Management** (`src/screens/Expense/ExpenseScreen.jsx`)
   - Expense tracking, history, categories, and reimbursements

4. **HRA** (`src/screens/HRA/HRAScreen.jsx`)
   - Health Reimbursement Account management

5. **Timesheet** (`src/screens/Timesheet/TimesheetScreen.jsx`)
   - Time tracking and project management

6. **Profile** (`src/screens/Profile/ProfileScreen.jsx`)
   - User account settings and preferences

## Dependencies

The following packages are required for navigation:

```json
{
  "@react-navigation/native": "^7.1.17",
  "@react-navigation/stack": "^7.4.8",
  "react-native-gesture-handler": "^2.28.0",
  "react-native-reanimated": "^4.1.0",
  "react-native-safe-area-context": "^5.6.1",
  "react-native-screens": "^4.16.0"
}
```

## Usage

### Navigation between screens

```javascript
// Navigate to a screen
navigation.navigate('ScreenName');

// Navigate with parameters
navigation.navigate('ScreenName', { param1: 'value1' });
```

### Screen Options

Each screen in the stack navigator has:
- Custom header styling (blue background, white text)
- Descriptive titles
- Consistent navigation experience

## File Structure

```
src/
├── navigation/
│   ├── AppNavigator.jsx          # Main navigation container
│   ├── Stack/
│   │   └── AppStack.jsx          # Stack navigator configuration
│   └── index.js                  # Navigation exports
└── screens/
    ├── Home/
    │   └── HomeScreen.jsx        # Dashboard with navigation cards
    ├── BusinessDevelopment/
    │   └── BusinessDevelopmentScreen.jsx
    ├── Expense/
    │   └── ExpenseScreen.jsx
    ├── HRA/
    │   └── HRAScreen.jsx
    ├── Profile/
    │   └── ProfileScreen.jsx
    └── Timesheet/
        └── TimesheetScreen.jsx
```

## Next Steps

To extend the navigation:

1. Add new screens to the `AppStack` navigator
2. Create corresponding screen components
3. Update the Home screen menu items if needed
4. Consider adding nested navigators for complex screen hierarchies
