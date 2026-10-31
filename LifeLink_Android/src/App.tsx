// src/App.tsx
import React, { useEffect } from 'react';
import { registerRootComponent } from 'expo';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, TouchableOpacity, LogBox } from 'react-native';
import * as Notifications from 'expo-notifications';

LogBox.ignoreLogs([
  'expo-notifications: Android Push notifications',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'Android Push notifications (remote notifications) functionality provided by expo-notifications was removed',
]);
import { useAuthStore } from './store/authStore';
import { useSocketStore } from './store/socketStore';

// Screens
import HomeScreen from './screens/HomeScreen';
import MapScreen from './screens/MapScreen';
import EmergencyScreen from './screens/EmergencyScreen';
import RequestsScreen from './screens/RequestsScreen';
import ProfileScreen from './screens/ProfileScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import RequestDetailScreen from './screens/RequestDetailScreen';
import ChatScreen from './screens/ChatScreen';
import DonationHistoryScreen from './screens/DonationHistoryScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import HospitalScreen from './screens/HospitalScreen';
import DiscountsScreen from './screens/DiscountsScreen';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Tab Icon Component ───────────────────────────────────

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '🏠', Hospital: '🏥', Map: '🗺', Emergency: '🚨', Requests: '🩸', Profile: '👤',
  };
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>{icons[name] || '•'}</Text>
      {focused && (
        <View style={{
          width: 4, height: 4, borderRadius: 2,
          backgroundColor: '#ef4444', marginTop: 2,
        }} />
      )}
    </View>
  );
}

// ─── Emergency FAB ────────────────────────────────────────
function EmergencyFAB({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: '#dc2626',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        shadowColor: '#dc2626',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 12,
        elevation: 10,
        borderWidth: 3,
        borderColor: 'rgba(239,68,68,0.4)',
      }}
    >
      <Text style={{ fontSize: 28 }}>🚨</Text>
    </TouchableOpacity>
  );
}

// ─── Bottom Tab Navigator ─────────────────────────────────
function MainTabs({ navigation }: any) {
  const { user } = useAuthStore();
  const isHospital = user?.role === 'hospital';

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#111118',
          borderTopColor: 'rgba(255,255,255,0.06)',
          borderTopWidth: 1,
          height: 70,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#ef4444',
        tabBarInactiveTintColor: '#64748b',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tab.Screen
        name="Home"
        component={isHospital ? HospitalScreen : HomeScreen}
        options={{
          tabBarLabel: isHospital ? 'Inventory' : 'Home',
          tabBarIcon: ({ focused }) => <TabIcon name={isHospital ? 'Hospital' : 'Home'} focused={focused} />
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Map" focused={focused} /> }}
      />
      <Tab.Screen
        name="Emergency"
        component={EmergencyScreen}
        options={{
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <EmergencyFAB onPress={() => navigation.navigate('EmergencyModal')} />
          ),
        }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Requests" focused={focused} /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="Profile" focused={focused} /> }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ─────────────────────────────────
function RootNavigator() {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen
        name="EmergencyModal"
        component={EmergencyScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="RequestDetail" component={RequestDetailScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="DonationHistory" component={DonationHistoryScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Discounts" component={DiscountsScreen} />
    </Stack.Navigator>
  );
}

// ─── App Root ────────────────────────────────────────────
export default function App() {
  const { token } = useAuthStore();
  const { connect, disconnect } = useSocketStore();

  useEffect(() => {
    connect(token || undefined);
    return () => disconnect();
  }, [token]);

  // Request notification permissions (local notifications only — remote push not supported in Expo Go)
  useEffect(() => {
    const setup = async () => {
      try {
        // Only request if running on a real device (not Expo Go simulator issue)
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        // Remote push token registration is skipped in Expo Go (removed in SDK 53+)
        // Local notifications (scheduleNotificationAsync) still work fine
      } catch {
        // Silently ignore — Expo Go will show a warning but won't crash
      }
    };
    setup();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0a0a0f" />
        <NavigationContainer
          theme={{
            ...DarkTheme,
            colors: {
              ...DarkTheme.colors,
              primary: '#ef4444',
              background: '#0a0a0f',
              card: '#111118',
              text: '#f8fafc',
              border: 'rgba(255,255,255,0.08)',
              notification: '#ef4444',
            },
          }}
        >
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(App);
