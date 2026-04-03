import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { Redirect, Tabs } from 'expo-router';
import { TextStyle, ViewStyle } from 'react-native';
import { PinGate } from '@/lib/auth/PinGate';

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

export default function ChildLayout() {
  const { isSignedIn } = useAuth();

  if (!isSignedIn) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <PinGate>
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
          name="home"
          options={{
            title: 'Quests',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="map" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="store"
          options={{
            title: 'Store',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="store" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="plan"
          options={{
            title: 'Health',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="favorite" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="log"
          options={{
            title: 'Log',
            tabBarIcon: ({ color, size }) => (
              <MaterialIcons name="article" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="emergency"
          options={{
            href: null,
            tabBarStyle: { display: 'none' },
          }}
        />
      </Tabs>
    </PinGate>
  );
}
