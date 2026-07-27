import React, { useEffect, useState, useRef } from 'react';
import { View, Text, SafeAreaView, StatusBar, StyleSheet, Vibration, Alert, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: true }),
});

const API_URL = 'https://tricityphysiohub.in';
const ADMIN_URL = API_URL + '/admin';

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const lastCount = useRef(0);
  const pollTimer = useRef(null);

  useEffect(() => {
    setupNotifications();
    return () => { if (pollTimer.current) clearInterval(pollTimer.current); };
  }, []);

  const setupNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    startPolling();
  };

  const startPolling = () => {
    pollTimer.current = setInterval(async () => {
      try {
        const r = await fetch(API_URL + '/api/appointments');
        const d = await r.json();
        if (d.success && d.appointments) {
          if (lastCount.current > 0 && d.appointments.length > lastCount.current) {
            const newCount = d.appointments.length - lastCount.current;
            const latest = d.appointments[0];
            Vibration.vibrate([0, 200, 100, 200]);
            Notifications.scheduleNotificationAsync({
              content: {
                title: 'New Appointment!',
                body: latest.name + ' - ' + latest.location,
                data: { id: latest.id },
              },
              trigger: null,
            });
          }
          lastCount.current = d.appointments.length;
        }
      } catch (e) {}
    }, 10000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a365d" />
      {!loaded && (
        <View style={styles.loading}>
          <View style={styles.spinner} />
          <Text style={styles.loadingText}>Loading Admin Panel...</Text>
        </View>
      )}
      <WebView
        source={{ uri: ADMIN_URL }}
        style={styles.webview}
        onLoad={() => setLoaded(true)}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        allowsBackForwardNavigationGestures
        sharedCookiesEnabled
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a365d' },
  webview: { flex: 1 },
  loading: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#1a365d', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  spinner: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#d4a853', borderTopColor: 'transparent', marginBottom: 16 },
  loadingText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
