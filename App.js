import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

import { initDatabase } from './src/db/database';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

import TodayStatusScreen from './src/screens/TodayStatusScreen';
import UserListScreen from './src/screens/UserListScreen';
import AddEditUserScreen from './src/screens/AddEditUserScreen';
import TokenListScreen from './src/screens/TokenListScreen';
import AddTokenScreen from './src/screens/AddTokenScreen';

import DashboardScreen from './src/screens/DashboardScreen';
import UsersScreen from './src/screens/UsersScreen';
import AttendanceScreen from './src/screens/AttendanceScreen';
import SettingsScreen from './src/screens/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  const { theme } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          let IconComponent = MaterialIcons;
          if (route.name === 'Dashboard') {
            iconName = 'dashboard';
          } else if (route.name === 'Users') {
            iconName = 'people';
          } else if (route.name === 'Attendance') {
            iconName = 'event-note';
          } else if (route.name === 'Settings') {
            iconName = 'settings-outline';
            IconComponent = Ionicons;
          }
          return <IconComponent name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.tabActive,
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0,
          shadowColor: theme.primary,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
          height: 64,
          paddingBottom: 10,
          paddingTop: 6
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700'
        },
        headerShown: false,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen
        name="Users"
        component={UsersScreen}
        options={{ title: 'Users' }}
      />
      <Tab.Screen
        name="Attendance"
        component={AttendanceScreen}
        options={{ title: 'Attendance' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    initDatabase()
      .then(() => setDbReady(true))
      .catch((err) => {
        console.log('DB init error', err);
      });
  }, []);

  if (!dbReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="MainTabs"
          screenOptions={{
            headerTitleAlign: 'center'
          }}
        >
          <Stack.Screen
            name="MainTabs"
            component={TabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TodayStatus"
            component={TodayStatusScreen}
            options={{ title: 'Today Status' }}
          />
          <Stack.Screen
            name="UserList"
            component={UserListScreen}
            options={{ title: 'Users' }}
          />
          <Stack.Screen
            name="AddEditUser"
            component={AddEditUserScreen}
            options={{ title: 'User Details' }}
          />
          <Stack.Screen
            name="TokenList"
            component={TokenListScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="AddToken"
            component={AddTokenScreen}
            options={{ title: 'Add Token' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
