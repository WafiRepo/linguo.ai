const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativewind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const RTC_VIEW_NATIVE = path.resolve(__dirname, "shims/RTCView.native.js");
const RTC_VIEW_WEB = path.resolve(__dirname, "shims/RTCView.web.js");

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const origin = context.originModulePath ?? "";

  if (
    origin.includes(`${path.sep}@stream-io${path.sep}react-native-webrtc${path.sep}`) &&
    (moduleName === "./RTCView" || moduleName.endsWith(`${path.sep}RTCView`))
  ) {
    return {
      type: "sourceFile",
      filePath: platform === "web" ? RTC_VIEW_WEB : RTC_VIEW_NATIVE,
    };
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativewind(config, { input: "./global.css" });
