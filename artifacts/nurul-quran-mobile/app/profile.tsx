import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useAuth } from "@/context/AuthContext";

function MenuItem({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: danger ? "#fee2e2" : colors.tealLight || "#e6f4f1" },
        ]}
      >
        <Feather
          name={icon as any}
          size={18}
          color={danger ? "#dc2626" : colors.teal || "#1a7c6e"}
        />
      </View>
      <Text
        style={[
          styles.menuLabel,
          { color: danger ? "#dc2626" : colors.foreground, flex: 1 },
        ]}
      >
        {label}
      </Text>
      {value ? (
        <Text style={[styles.menuValue, { color: colors.mutedForeground }]}>
          {value}
        </Text>
      ) : null}
      {!danger && (
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout, isAuthenticated } = useAuth();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  };

  const planLabel =
    (user as any)?.isPremium === true
      ? (user as any)?.subscriptionPlan === "yearly"
        ? "Premium Annual"
        : "Premium Monthly"
      : "Free Plan";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.teal || "#1a7c6e",
            paddingTop: insets.top + 16,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={[styles.avatarSection, { backgroundColor: colors.teal || "#1a7c6e" }]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {isAuthenticated && user?.name
              ? user.name.charAt(0).toUpperCase()
              : "G"}
          </Text>
        </View>
        <Text style={styles.userName}>
          {isAuthenticated ? user?.name || "User" : "Guest"}
        </Text>
        <Text style={styles.userEmail}>
          {isAuthenticated ? user?.email || "" : "Not signed in"}
        </Text>
        <View
          style={[
            styles.planBadge,
            {
              backgroundColor:
                (user as any)?.isPremium ? colors.gold || "#f59e0b" : "rgba(255,255,255,0.25)",
            },
          ]}
        >
          <Feather
            name={(user as any)?.isPremium ? "star" : "user"}
            size={12}
            color="#fff"
          />
          <Text style={styles.planText}>{planLabel}</Text>
        </View>
      </View>

      <View style={{ padding: 16, gap: 8 }}>
        {isAuthenticated ? (
          <>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>
              ACCOUNT
            </Text>

            <MenuItem
              icon="user"
              label="Name"
              value={user?.name || "—"}
            />
            <MenuItem
              icon="mail"
              label="Email"
              value={user?.email || "—"}
            />
            <MenuItem
              icon="star"
              label="Subscription"
              value={planLabel}
              onPress={() => router.push("/(tabs)/support")}
            />
            {(user as any)?.subscriptionEnd ? (
              <MenuItem
                icon="calendar"
                label="Renews On"
                value={new Date((user as any).subscriptionEnd).toLocaleDateString()}
              />
            ) : null}

            <Text
              style={[styles.section, { color: colors.mutedForeground, marginTop: 8 }]}
            >
              CONTENT
            </Text>
            <MenuItem
              icon="bookmark"
              label="Saved Lectures"
              onPress={() => router.push("/(tabs)/library")}
            />
            <MenuItem
              icon="book-open"
              label="Quran Reader"
              onPress={() => router.push("/(tabs)/quran")}
            />
            <MenuItem
              icon="trending-up"
              label="Halal Stocks"
              onPress={() => router.push("/stocks")}
            />

            <Text
              style={[styles.section, { color: colors.mutedForeground, marginTop: 8 }]}
            >
              SETTINGS
            </Text>
            <MenuItem
              icon="bell"
              label="Prayer Notifications"
              onPress={() => Alert.alert("Coming Soon", "Prayer time notifications will be available in the next update.")}
            />
            <MenuItem
              icon="moon"
              label="Dark Mode"
              onPress={() => Alert.alert("Coming Soon", "Theme settings coming soon.")}
            />

            <View style={{ marginTop: 16 }}>
              <MenuItem
                icon="log-out"
                label="Logout"
                onPress={handleLogout}
                danger
              />
            </View>
          </>
        ) : (
          <>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>
              ACCOUNT
            </Text>
            <Pressable
              onPress={() => router.push("/auth/login")}
              style={[
                styles.loginBtn,
                { backgroundColor: colors.teal || "#1a7c6e" },
              ]}
            >
              <Feather name="log-in" size={18} color="#fff" />
              <Text style={styles.loginBtnText}>Sign In / Register</Text>
            </Pressable>

            <Text style={[styles.guestNote, { color: colors.mutedForeground }]}>
              Sign in to access your subscription, bookmarks, and progress tracking.
            </Text>

            <Text
              style={[styles.section, { color: colors.mutedForeground, marginTop: 8 }]}
            >
              EXPLORE
            </Text>
            <MenuItem
              icon="book-open"
              label="Quran Reader"
              onPress={() => router.push("/(tabs)/quran")}
            />
            <MenuItem
              icon="trending-up"
              label="Halal Stocks"
              onPress={() => router.push("/stocks")}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  backBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 32,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  userName: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
  },
  userEmail: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
  },
  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 10,
  },
  planText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  section: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
    marginBottom: 4,
    marginLeft: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    marginBottom: 2,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  menuValue: {
    fontSize: 13,
    marginRight: 6,
  },
  loginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    padding: 14,
  },
  loginBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  guestNote: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 4,
  },
});
