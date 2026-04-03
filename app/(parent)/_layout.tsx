import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import { TextStyle, ViewStyle } from 'react-native';

const tabBarStyle: ViewStyle = {
  backgroundColor: '#020b02',
  borderTopWidth: 4,
  borderTopColor: 'rgba(10,106,29,0.30)',
  height: 72,
  paddingBottom: 10,
};

const tabLabelStyle: TextStyle = {
  fontSize: 10,
  fontWeight: '700',
  letterSpacing: 1,
  textTransform: 'uppercase',
};

export default function ParentLayout() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: 'rgba(242,249,234,0.40)',
        tabBarLabelStyle: tabLabelStyle,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Overview',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="logs"
        options={{
          title: 'Logs',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="list" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="appointment"
        options={{
          title: 'Reports',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="event" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Claude',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="chat" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="onboarding"
        options={{ href: null }}
      />
    </Tabs>
  );
}
