import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('ErrorBoundary caught:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Ionicons name="warning-outline" size={64} color="#3949AB" />
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.message}>
            We encountered an error. Please try again.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReload}
          >
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2FF',
    padding: 24
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A237E',
    marginTop: 16
  },
  message: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24
  },
  button: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800'
  }
});
