import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import UserListScreen from './UserListScreen';

export default function UsersScreen(props) {
  return (
    <SafeAreaView style={styles.container}>
      <UserListScreen {...props} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa'
  }
});
