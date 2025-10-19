import { Dimensions, PixelRatio, Platform } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ✅ Dynamic scale based on screen width/height (not a fixed base device)
export const wp = (percentage) => {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * percentage) / 100);
};

export const hp = (percentage) => {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * percentage) / 100);
};

// ✅ Responsive font size (scales text based on width & pixel density)
export const rf = (percentage) => {
  const size = (SCREEN_WIDTH * percentage) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(size));
};

// ✅ Responsive image with width% & height%
export const responsiveImage = (widthPercent, heightPercent) => ({
  width: wp(widthPercent),
  height: hp(heightPercent),
  resizeMode: "contain",
});

// ✅ Safe area spacing for iOS notch & Android status bar
export const safeAreaTop = Platform.OS === "ios" ? hp(4) : hp(0);

export const SCREEN = {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
};




// How to Use
// ✅ Width & Height (relative to screen size)
// import { wp, hp } from "../utils/responsive";

// <View style={{ width: wp(90), height: hp(20), backgroundColor: "#ddd" }} />


// ➡️ Always 90% of screen width and 20% of screen height — regardless of device.

// ✅ Fonts
// import { rf } from "../utils/responsive";

// <Text style={{ fontSize: rf(4) }}>Responsive Text</Text>


// ➡️ rf(4) = 4% of screen width → text scales across devices.

// ✅ Images
// import { responsiveImage } from "../utils/responsive";

// <Image
//   source={require("../assets/logo.png")}
//   style={responsiveImage(50, 20)} // 50% width, 20% height
// />

// ✅ Safe Area
// import { safeAreaTop } from "../utils/responsive";

// <View style={{ paddingTop: safeAreaTop }}>
//   <Text>Below notch</Text>
// </View>