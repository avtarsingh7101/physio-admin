import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, StyleSheet, Vibration, Animated,
  RefreshControl
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, Timestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

const firebaseConfig = {
  apiKey: 'AIzaSyCofwnjnD-h2OeUO19aD5eF6tpLtAmBW4k',
  authDomain: 'tricityphysiohub.firebaseapp.com',
  databaseURL: 'https://tricityphysiohub-default-rtdb.firebaseio.com',
  projectId: 'tricityphysiohub',
  storageBucket: 'tricityphysiohub.firebasestorage.app',
  messagingSenderId: '1083499442214',
  appId: '1:1083499442214:web:922a9c9cfe923d9c22f6e7',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: true }),
});

const C = {
  primary: '#1a365d', primaryLight: '#2a5298', gold: '#d4a853',
  bg: '#f5f3ee', card: '#ffffff', text: '#1a1a2e', textLight: '#64748b',
  success: '#16a34a', warning: '#d97706', danger: '#dc2626', border: '#e2e8f0',
};

const STATUSES = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];
const STATUS_COLORS = { pending: '#d97706', confirmed: '#16a34a', completed: '#2563eb', cancelled: '#dc2626' };
const STATUS_BGS = { pending: '#fef3c7', confirmed: '#d1fae5', completed: '#dbeafe', cancelled: '#fee2e2' };

function AnimatedCard({ item, onStatus, index }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const timeAgo = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    const diff = Math.floor((Date.now() - d) / 60000);
    if (diff < 1) return 'Now';
    if (diff < 60) return diff + 'm';
    return Math.floor(diff / 60) + 'h';
  };

  return (
    <Animated.View style={[styles.card, !item.read && styles.cardUnread, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardDetail}>{item.phone}</Text>
          <Text style={styles.cardDetail}>{item.location}</Text>
          {item.date ? <Text style={styles.cardDate}>{item.date} {item.time || ''}</Text> : null}
          {item.message ? <Text style={styles.cardMsg}>"{item.message}"</Text> : null}
        </View>
        <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
      </View>
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_BGS[item.status || 'pending'] }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status || 'pending'] }]}>{(item.status || 'pending').toUpperCase()}</Text>
        </View>
        <View style={styles.cardActions}>
          {item.status !== 'confirmed' && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => onStatus(item.id, 'confirmed')}><Text style={styles.actionBtnText}>Confirm</Text></TouchableOpacity>}
          {item.status !== 'completed' && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563eb' }]} onPress={() => onStatus(item.id, 'completed')}><Text style={styles.actionBtnText}>Done</Text></TouchableOpacity>}
          {item.status !== 'cancelled' && <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc2626' }]} onPress={() => onStatus(item.id, 'cancelled')}><Text style={styles.actionBtnText}>X</Text></TouchableOpacity>}
        </View>
      </View>
    </Animated.View>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState('all');
  const [available, setAvailable] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const notifListener = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadAvail();
    setupPushNotifications();
    notifListener.current = Notifications.addNotificationReceivedListener(() => Vibration.vibrate(300));
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    return () => Notifications.removeNotificationSubscription(notifListener.current);
  }, []);

  const setupPushNotifications = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    try {
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: '8e57bbf8-0538-43b0-864b-4fe93bab8d46',
      });
      // Send token to server
      await fetch('https://tricityphysiohub.in/api/register-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.data, platform: Platform.OS }),
      });
    } catch (e) {}
  };

  useEffect(() => {
    if (!loggedIn) return;
    const q = query(collection(db, 'appointments'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      const oldLen = appointments.length;
      setAppointments(items);
      if (oldLen > 0 && items.length > oldLen) {
        Vibration.vibrate([0, 200, 100, 200]);
        Notifications.scheduleNotificationAsync({
          content: { title: 'New Appointment!', body: items[0].name + ' - ' + items[0].location },
          trigger: null,
        });
      }
    });
    return () => unsub();
  }, [loggedIn]);

  const loadAvail = async () => {
    try { const r = await fetch('https://tricityphysiohub.in/api/availability'); const d = await r.json(); if (d.success) setAvailable(d.available); } catch (e) {}
  };

  const toggleAvail = async () => {
    try { await fetch('https://tricityphysiohub.in/api/availability', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available: !available }) }); setAvailable(!available); } catch (e) { Alert.alert('Error', 'Failed'); }
  };

  const updateStatus = async (id, status) => {
    try { await updateDoc(doc(db, 'appointments', id), { status, read: true }); Vibration.vibrate(50); } catch (e) {}
  };

  const handleLogin = () => {
    if (password === '131313') { setLoggedIn(true); setLoginError(''); } else setLoginError('Wrong password');
  };

  const filtered = appointments.filter(a => filter === 'all' || (a.status || 'pending') === filter);
  const counts = {};
  STATUSES.forEach(s => { if (s !== 'all') counts[s] = appointments.filter(a => (a.status || 'pending') === s).length; });
  counts.all = appointments.length;

  if (!loggedIn) return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <Animated.View style={[styles.loginBox, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0,1], outputRange: [40,0] }) }] }]}>
        <View style={styles.loginIcon}><Text style={styles.loginIconText}>P</Text></View>
        <Text style={styles.loginTitle}>PhysioHub Admin</Text>
        <Text style={styles.loginSub}>Dr. Ragib Hussian (PT)</Text>
        <TextInput style={styles.loginInput} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={handleLogin} />
        {loginError ? <Text style={styles.loginError}>{loginError}</Text> : null}
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}><Text style={styles.loginBtnText}>Unlock</Text></TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <View style={styles.header}>
        <View><Text style={styles.headerTitle}>PhysioHub Admin</Text><Text style={styles.headerSub}>Dr. Ragib Hussian (PT)</Text></View>
        <TouchableOpacity style={[styles.availBtn, { backgroundColor: available ? C.success : C.danger }]} onPress={toggleAvail}>
          <Text style={styles.availBtnText}>{available ? 'On Duty' : 'Off Duty'}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        {STATUSES.filter(s => s !== 'all').map(s => (
          <TouchableOpacity key={s} style={[styles.statBox, filter === s && { borderColor: STATUS_COLORS[s], borderWidth: 2 }]} onPress={() => setFilter(s)}>
            <Text style={[styles.statNum, { color: STATUS_COLORS[s] }]}>{counts[s] || 0}</Text>
            <Text style={styles.statLabel}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity style={[styles.statBox, filter === 'all' && { borderColor: C.primary, borderWidth: 2 }]} onPress={() => setFilter('all')}>
          <Text style={[styles.statNum, { color: C.primary }]}>{counts.all}</Text>
          <Text style={styles.statLabel}>All</Text>
        </TouchableOpacity>
      </View>

      <View style={{ paddingHorizontal: 12, paddingBottom: 4 }}>
        <Text style={{ fontSize: 13, color: C.textLight, fontWeight: '600' }}>{filter === 'all' ? 'All Appointments' : filter.charAt(0).toUpperCase() + filter.slice(1)} ({filtered.length})</Text>
      </View>

      <FlatList
        data={filtered} keyExtractor={i => i.id}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadAvail(); setTimeout(() => setRefreshing(false), 1000); }} tintColor={C.primary} />}
        ListEmptyComponent={<View style={{ paddingTop: 60, alignItems: 'center' }}><Text style={{ color: C.textLight }}>No {filter} appointments</Text></View>}
        renderItem={({ item, index }) => <AnimatedCard item={item} index={index} onStatus={updateStatus} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loginContainer: { flex: 1, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loginBox: { backgroundColor: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 380, alignItems: 'center' },
  loginIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loginIconText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  loginTitle: { fontSize: 22, fontWeight: '700', color: C.text },
  loginSub: { fontSize: 13, color: C.textLight, marginBottom: 24 },
  loginInput: { width: '100%', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16, backgroundColor: '#f8fafc' },
  loginError: { color: C.danger, fontSize: 13, marginBottom: 12 },
  loginBtn: { width: '100%', backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  header: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub: { color: '#d4a853', fontSize: 12, marginTop: 2 },
  availBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  availBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statBox: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 10, alignItems: 'center', elevation: 2, borderColor: 'transparent', borderWidth: 0 },
  statNum: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 10, color: C.textLight, marginTop: 1 },
  card: { backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8 },
  cardUnread: { borderLeftWidth: 4, borderLeftColor: C.primary, backgroundColor: '#eef2f7' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardName: { fontSize: 16, fontWeight: '700', color: C.text },
  cardDetail: { fontSize: 13, color: C.textLight, marginTop: 2 },
  cardDate: { fontSize: 12, color: C.primary, marginTop: 4, fontWeight: '600' },
  cardMsg: { fontSize: 12, color: '#475569', marginTop: 4, fontStyle: 'italic' },
  cardTime: { fontSize: 11, color: C.textLight },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
