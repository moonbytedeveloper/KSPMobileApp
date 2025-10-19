import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, Keyboard, Platform } from "react-native";
import Svg, { Path, Polyline, Circle, Rect } from "react-native-svg";
import { wp, hp, rf, SCREEN } from "../../utils/responsive";
import { COLORS, TYPOGRAPHY } from "../../screens/styles/styles";
import { useUser } from "../../contexts/UserContext";

// --- Default SVG ICONS (React Native) ---
const HomeIcon = ({ color = "#1f2937", size = 24 }) => (
	<Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
		<Path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
		<Polyline points="9 22 9 12 15 12 15 22" />
	</Svg>
);

const ExpenseIcon = ({ color = "#1f2937", size = 24 }) => (
	<Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
		<Rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
		<Path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
		<Path d="M9 14h6" />
		<Path d="M12 11v6" />
	</Svg>
);

const TimesheetIcon = ({ color = "#1f2937", size = 24 }) => (
	<Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
		<Circle cx="12" cy="12" r="10" />
		<Polyline points="12 6 12 12 16 14" />
	</Svg>
);

const ProfileIcon = ({ color = "#1f2937", size = 24 }) => (
	<Svg width={size} height={size} viewBox="0 0 24 24" stroke={color} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
		<Circle cx="12" cy="8" r="5" />
		<Path d="M20 21a8 8 0 0 0-16 0" />
	</Svg>
);

const defaultTabs = [
	{ name: "Home", icon: HomeIcon },
	{ name: "Expense", icon: ExpenseIcon },
	{ name: "Timesheet", icon: TimesheetIcon },
	{ name: "Profile", icon: ProfileIcon },
];

/**
 * FloatingBottomNav Component
 *
 * Props:
 * - tabs: Array<{ name: string, icon: React.ComponentType<{ color?: string, size?: number }> }>
 * - activeIndex: number
 * - onTabPress: (index: number | string) => void - Can receive either index or route string
 * - colors?: { barBg?: string, accent?: string, label?: string }
 * - userRole?: 'admin' | 'employee' (default: 'employee')
 * - useRouteNavigation?: boolean - If true, passes route string; if false, passes index
 */
const FloatingBottomNav = ({
	tabs = defaultTabs,
	activeIndex = 0,
	onTabPress = () => {},
	colors = { barBg: "#fff7ed", accent: COLORS.primary, label: COLORS.text },
	userRole = 'employee',
	useRouteNavigation = false,
}) => {
	const { userData } = useUser();
	const translateX = useRef(new Animated.Value(0)).current;

	// Rights lookup similar to Drawer
	const rightsSet = useMemo(() => {
		const rights = Array.isArray(userData?.roles?.[0]?.MenuRights) ? userData.roles[0].MenuRights : [];
		return new Set(rights);
	}, [userData]);

	const can = (rightName) => rightsSet.has(rightName);

	// Map tab name -> right key used in drawer
	const tabRightMap = useMemo(() => ({
		Expense: 'Expense',
		Timesheet: 'TimeSheet',
	}), []);

	// Filter tabs based on rights (Home/Profile always visible). Keep original index for mapping
	const visibleTabsWithIndex = useMemo(() => {
		const result = [];
		(tabs || []).forEach((t, originalIndex) => {
			if (!t?.name) {
				result.push({ tab: t, originalIndex });
				return;
			}
			if (t.name === 'Home' || t.name === 'Profile') {
				result.push({ tab: t, originalIndex });
				return;
			}
			const rightKey = tabRightMap[t.name];
			if (!rightKey || can(rightKey)) {
				result.push({ tab: t, originalIndex });
			}
		});
		return result;
	}, [tabs, tabRightMap, rightsSet]);

	const visibleTabs = useMemo(() => visibleTabsWithIndex.map(({ tab }) => tab), [visibleTabsWithIndex]);

	const tabCount = Math.max(1, visibleTabs.length);

	// Responsive measurements
	const screenWidth = SCREEN.width;
	const navHeight = hp(10); // ~10% of screen height
	const barRadius = wp(6);
	const circleSize = wp(16); // diameter of floating circle
	const circleBorderWidth = wp(2.2);
	const circleBottom = navHeight - circleSize / 1.5; // align circle center with bar top
	const innerWidth = circleSize - wp(4);
	const innerHeight = circleSize - wp(4); // slightly shorter for visual balance
	const iconSize = rf(4.2); // scales with width
	const labelFont = rf(3); // ~3% of width
	const navHorizontalPadding = wp(0);

	const tabWidth = useMemo(() => screenWidth / tabCount, [screenWidth, tabCount]);

	// Map external activeIndex (original) to visible index
	const visibleActiveIndex = useMemo(() => {
		const idx = visibleTabsWithIndex.findIndex((x) => x.originalIndex === activeIndex);
		return idx >= 0 ? idx : 0;
	}, [visibleTabsWithIndex, activeIndex]);

	// Clamp to range
	const safeActiveIndex = Math.min(Math.max(0, visibleActiveIndex), tabCount - 1);

	useEffect(() => {
		Animated.spring(translateX, {
			toValue: safeActiveIndex * tabWidth,
			useNativeDriver: true,
			speed: 15,
			bounciness: 8,
		}).start();
	}, [safeActiveIndex, tabWidth, translateX]);

	const ActiveIcon = visibleTabs[safeActiveIndex]?.icon || HomeIcon;

	// Keyboard-aware hide/show
	const translateY = useRef(new Animated.Value(0)).current;
	useEffect(() => {
		const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
		const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

		const onShow = () => {
			Animated.timing(translateY, { toValue: navHeight + hp(5), duration: 180, useNativeDriver: true }).start();
		};
		const onHide = () => {
			Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true }).start();
		};

		const subShow = Keyboard.addListener(showEvent, onShow);
		const subHide = Keyboard.addListener(hideEvent, onHide);
		return () => {
			subShow.remove();
			subHide.remove();
		};
	}, [translateY, navHeight]);

	// Role-based navigation mapping by tab name (more stable than index when tabs are filtered)
	const getNavigationRoute = (tabName) => {
		if (userRole === 'admin') {
			switch (tabName) {
				case 'Home': return 'AdminDashboard';
				case 'Expense': return 'Expense';
				case 'Timesheet': return 'Timesheet';
				case 'Profile': return 'Profile';
				default: return 'AdminDashboard';
			}
		} else {
			switch (tabName) {
				case 'Home': return 'Main';
				case 'Expense': return 'Expense';
				case 'Timesheet': return 'Timesheet';
				case 'Profile': return 'Profile';
				default: return 'Main';
			}
		}
	};

	return (
		<Animated.View style={[styles.navbar, { backgroundColor: colors.barBg, height: navHeight, borderTopLeftRadius: barRadius, borderTopRightRadius: barRadius, transform: [{ translateY }] }]}> 
			{/* Floating Circle */}
			<Animated.View
				style={[
					styles.floatingCircle,
					{ transform: [{ translateX }] },
					{ left: tabWidth / 2 - circleSize / 2 },
					{ bottom: circleBottom, width: circleSize, height: circleSize, borderRadius: circleSize / 2, borderWidth: circleBorderWidth, borderColor: colors.barBg },
				]}
			>
				<View style={[styles.floatingInner, { width: innerWidth, height: innerHeight, borderRadius: innerWidth / 2, backgroundColor: colors.accent }]}>
					<ActiveIcon color="#ffffff" size={iconSize} />
				</View>
			</Animated.View>

			{/* Tabs */}
			<View style={[styles.navButtons, { paddingHorizontal: navHorizontalPadding }]}> 
			{visibleTabs.map((tab, index) => {
				const isFocused = safeActiveIndex === index;
					const Icon = tab.icon;
					return (
						<TouchableOpacity
							key={tab.name}
							style={styles.navButton}
							activeOpacity={0.7}
							onPress={() => {
							if (useRouteNavigation) {
								const route = getNavigationRoute(tab.name);
								onTabPress(route);
							} else {
								const originalIndex = visibleTabsWithIndex[index]?.originalIndex ?? index;
								onTabPress(originalIndex);
							}
							}}
						>
							<Animated.View
								style={[
									styles.iconWrapper,
									{ opacity: isFocused ? 0 : 1 },
									{ transform: [{ translateY: isFocused ? -hp(1.2) : 0 }] },
								]}
							>
								<Icon color={colors.label} size={iconSize} />
							</Animated.View>
							<Text style={[styles.navLabel, { fontSize: labelFont, color: colors.label }, isFocused && { color: colors.accent }]}> {tab.name} </Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</Animated.View>
	);
};

export default FloatingBottomNav;

const styles = StyleSheet.create({
	navbar: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: -3 },
		shadowOpacity: 0.1,
		shadowRadius: 6,
		elevation: 6,
	},
	floatingCircle: {
		position: "absolute",
		backgroundColor: "transparent",
		justifyContent: "center",
		alignItems: "center",
	},
	floatingInner: {
		justifyContent: "center",
		alignItems: "center",
	},
	navButtons: {
		flexDirection: "row",
		width: "100%",
		height: "100%",
		justifyContent: "space-between",
		alignItems: "center",
	},
	navButton: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
	},
	iconWrapper: {
		height: hp(3.6),
		justifyContent: "center",
		alignItems: "center",
	},
	navLabel: {
		fontWeight: "600",
		color: COLORS.text,
		marginTop: hp(0.6),
		marginBottom: Platform.OS === 'ios' ? hp(2) : 0,
		fontFamily: TYPOGRAPHY.fontFamilyMedium,
	},
}); 