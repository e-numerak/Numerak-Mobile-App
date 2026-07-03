import 'react-native-gesture-handler';
import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../src/store/authStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 1000 * 60 },
  },
});

export default function RootLayout() {
  const loadStoredAuth = useAuthStore((s) => s.loadStoredAuth);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <KeyboardProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <StatusBar style="auto" />
        </KeyboardProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}