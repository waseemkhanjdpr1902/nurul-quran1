import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AudioPlayerBar } from "@/components/AudioPlayerBar";
import { useColors } from "@/hooks/useColors";

export default function TabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === "dark";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  // Tab bar height to position AudioPlayerBar above it
  const tabBarHeight = isWeb ? 84 : isIOS ? 49 + insets.bottom : 56 + insets.bottom;

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          headerShown: false,
          tabBarStyle: {
            position: "absolute",
            backgroundColor: isIOS ? "transparent" : colors.background,
            borderTopWidth: isWeb ? 1 : 0,
            borderTopColor: colors.border,
            elevation: 0,
            ...(isWeb ? { height: 84 } : {}),
          },
          tabBarBackground: () =>
            isIOS ? (
              <BlurView
                intensity={100}
                tint={isDark ? "dark" : "light"}
                style={StyleSheet.absoluteFill}
              />
            ) : isWeb ? (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  { backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.border },
                ]}
              />
            ) : null,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color }) => <Feather name="home" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="quran"
          options={{
            title: "Quran",
            tabBarIcon: ({ color }) => <Feather name="book-open" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="library"
          options={{
            title: "Library",
            tabBarIcon: ({ color }) => <Feather name="play-circle" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="courses"
          options={{
            title: "Courses",
            tabBarIcon: ({ color }) => <Feather name="layers" size={22} color={color} />,
          }}
        />
        <Tabs.Screen
          name="support"
          options={{
            title: "Premium",
            tabBarIcon: ({ color }) => <Feather name="star" size={22} color={color} />,
          }}
        />
      </Tabs>

      {/* Global AudioPlayerBar sits above the tab bar */}
      <View
        style={{
          position: "absolute",
          bottom: tabBarHeight,
          left: 0,
          right: 0,
          zIndex: 100,
        }}
        pointerEvents="box-none"
      >
        <AudioPlayerBar />
      </View>
    </View>
  );
}
