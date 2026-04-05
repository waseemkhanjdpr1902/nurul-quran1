import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>⚠️</Text>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>{this.state.error?.message}</Text>
          <TouchableOpacity style={styles.button} onPress={() => this.setState({ hasError: false, error: null })}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0D1117", alignItems: "center", justifyContent: "center", padding: 24 },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { color: "#E6EDF3", fontSize: 20, fontWeight: "bold", marginBottom: 8 },
  message: { color: "#8B949E", fontSize: 14, textAlign: "center", marginBottom: 24 },
  button: { backgroundColor: "#22C55E", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  buttonText: { color: "#0D1117", fontWeight: "bold", fontSize: 15 },
});
