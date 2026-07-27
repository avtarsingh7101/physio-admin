import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, StyleSheet, Vibration, Animated,
  RefreshControl, Linking, ScrollView, Image
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: true }),
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

const appFb = initializeApp(firebaseConfig);
const db = getFirestore(appFb);

const C = {
  primary: '#1a365d', gold: '#d4a853', bg: '#f5f3ee',
  card: '#fff', text: '#1a1a2e', textLight: '#64748b',
  border: '#e2e8f0', success: '#16a34a', danger: '#dc2626',
};

// Logo SVG
const Logo = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    <svg width="32" height="32" viewBox="0 0 100 100">
      <path d="M 50 8 A 42 42 0 1 0 92 50" fill="none" stroke="#d4a853" stroke-width="7" stroke-linecap="round" />
      <circle cx="50" cy="28" r="7" fill="#d4a853" />
      <path d="M 50 35 C 55 35 60 45 62 55 L 68 78 C 60 80 52 70 50 55 C 48 70 40 80 32 78 L 38 55 C 40 45 45 35 50 35 Z" fill="#d4a853" />
      <path d="M 45 44 C 35 38 25 40 18 45 C 22 50 30 48 38 44" fill="#d4a853" />
      <path d="M 55 44 C 65 38 75 40 82 45 C 78 50 70 48 62 44" fill="#d4a853" />
    </svg>
    <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>PhysioHub</Text>
  </View>
);

// ===== CARD WITH ANIMATION =====
function Card({ item, onStatus, index }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 400, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 400, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const ago = (ts) => {
    if (!ts) return '';
    const d = typeof ts?.toDate === 'function' ? ts.toDate() : new Date(ts);
    const m = Math.floor((Date.now() - d) / 60000);
    return m < 1 ? 'Now' : m < 60 ? m + 'm' : Math.floor(m / 60) + 'h';
  };
  const s = item.status || 'pending';

  return (
    <Animated.View style={[st.card, !item.read && st.cardNew, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={st.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={st.cardName}>{item.name}</Text>
          <Text style={st.cardSub}>{item.phone} · {item.location}</Text>
          {item.date ? <Text style={st.cardDate}>{item.date} {item.time || ''}</Text> : null}
          {item.message ? <Text style={st.cardMsg}>"{item.message}"</Text> : null}
        </View>
        <Text style={st.cardTime}>{ago(item.timestamp)}</Text>
      </View>
      <View style={st.cardBottom}>
        <View style={[st.badge, { backgroundColor: s === 'pending' ? '#fef3c7' : s === 'confirmed' ? '#d1fae5' : s === 'cancelled' ? '#fee2e2' : '#dbeafe' }]}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: s === 'pending' ? '#92400e' : s === 'confirmed' ? '#065f46' : s === 'cancelled' ? '#991b1b' : '#1e40af' }}>{s.toUpperCase()}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {s !== 'confirmed' && s !== 'cancelled' ? (
            <>
              <TouchableOpacity style={[st.btn, { backgroundColor: '#16a34a' }]} onPress={() => onStatus(item.id, 'confirmed')}>
                <Text style={st.btnText}>Confirm</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.btn, { backgroundColor: '#dc2626' }]} onPress={() => onStatus(item.id, 'cancelled')}>
                <Text style={st.btnText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : s !== 'completed' ? (
            <TouchableOpacity style={[st.btn, { backgroundColor: '#2563eb' }]} onPress={() => onStatus(item.id, 'completed')}>
              <Text style={st.btnText}>Done</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

// ===== BLOG ROW =====
function BlogRow({ blog, onPress }) {
  const ago = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const m = Math.floor((Date.now() - d) / 60000);
    return m < 60 ? m + 'm ago' : Math.floor(m / 60) + 'h ago';
  };
  return (
    <TouchableOpacity style={st.blogCard} onPress={onPress}>
      <View style={st.blogImg}>
        <Text style={{ fontSize: 24 }}>📄</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={st.blogTitle} numberOfLines={2}>{blog.title}</Text>
        <Text style={st.blogSub} numberOfLines={2}>{blog.content?.substring(0, 100)}</Text>
        <Text style={st.blogDate}>{ago(blog.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ===== MAIN APP =====
export default function App() {
  const [tab, setTab] = useState('appointments');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [available, setAvailable] = useState(true);
  const [filter, setFilter] = useState('all');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Notifications.requestPermissionsAsync();
    loadAvail();
    loadBlogs();
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const q = query(collection(db, 'appointments'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      const oldLen = appointments.length;
      setAppointments(items);
      if (oldLen > 0 && items.length > oldLen) {
        Vibration.vibrate([0, 200]);
        Notifications.scheduleNotificationAsync({
          content: { title: 'New Appointment!', body: items[0].name + ' - ' + items[0].location },
          trigger: null,
        });
      }
    });
    return () => unsub();
  }, [loggedIn]);

  const loadAvail = async () => {
    try {
      const r = await fetch('https://tricityphysiohub.in/api/availability');
      const d = await r.json();
      if (d.success) setAvailable(d.available);
    } catch (e) {}
  };

  const loadBlogs = async () => {
    try {
      const r = await fetch('https://tricityphysiohub.in/api/blogs');
      const d = await r.json();
      if (d.success) setBlogs(d.blogs);
    } catch (e) {}
  };

  const updateStatus = async (id, status) => {
    try { await updateDoc(doc(db, 'appointments', id), { status, read: true }); Vibration.vibrate(30); }
    catch (e) {}
  };

  const toggleAvail = async () => {
    try {
      await fetch('https://tricityphysiohub.in/api/availability', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !available }),
      });
      setAvailable(!available);
    } catch (e) {}
  };

  const handleLogin = () => {
    if (password === '131313') { setLoggedIn(true); setLoginError(''); }
    else setLoginError('Wrong password');
  };

  const filtered = appointments.filter(a => filter === 'all' || (a.status || 'pending') === filter);
  const counts = { all: appointments.length, pending: appointments.filter(a => (a.status || 'pending') === 'pending').length };
  const statusCounts = {};
  ['pending', 'confirmed', 'completed', 'cancelled'].forEach(s => { statusCounts[s] = appointments.filter(a => (a.status || 'pending') === s).length; });

  if (!loggedIn) {
    return (
      <SafeAreaView style={st.loginContainer}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <Animated.View style={[st.loginBox, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
          <View style={st.loginIcon}><Text style={{ color: '#d4a853', fontSize: 32, fontWeight: '800' }}>P</Text></View>
          <Text style={st.loginTitle}>PhysioHub Admin</Text>
          <Text style={st.loginSub}>Dr. Ragib Hussian (PT)</Text>
          <TextInput style={st.loginInput} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={handleLogin} />
          {loginError ? <Text style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{loginError}</Text> : null}
          <TouchableOpacity style={st.loginBtn} onPress={handleLogin}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Unlock</Text></TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      {/* Header */}
      <View style={st.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#fff' }}>PhysioHub</Text>
          <Text style={{ fontSize: 11, color: C.gold }}>Admin</Text>
        </View>
        <TouchableOpacity style={[st.availBtn, { backgroundColor: available ? '#16a34a' : '#dc2626' }]} onPress={toggleAvail}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{available ? 'On Duty' : 'Off'}</Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'appointments' ? (
        <>
          {/* Stats */}
          <View style={st.statsRow}>
            {['pending', 'confirmed', 'completed', 'cancelled'].map(s => (
              <TouchableOpacity key={s} style={[st.statBox, filter === s && { borderColor: C.primary, borderWidth: 2 }]} onPress={() => setFilter(s)}>
                <Text style={[st.statNum, { color: '#1a365d' }]}>{statusCounts[s] || 0}</Text>
                <Text style={st.statLabel}>{s.charAt(0).toUpperCase() + s.slice(1)}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[st.statBox, filter === 'all' && { borderColor: C.primary, borderWidth: 2 }]} onPress={() => setFilter('all')}>
              <Text style={[st.statNum, { color: C.primary }]}>{counts.all}</Text>
              <Text style={st.statLabel}>All</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={filtered} keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 80 }}
            ListEmptyComponent={<View style={{ paddingTop: 60, alignItems: 'center' }}><Text style={{ color: C.textLight }}>No appointments</Text></View>}
            renderItem={({ item, index }) => <Card item={item} index={index} onStatus={updateStatus} />}
          />
        </>
      ) : (
        <FlatList
          data={blogs} keyExtractor={i => i.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
          ListHeaderComponent={
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 16 }}>Health Blogs</Text>
          }
          ListEmptyComponent={<View style={{ paddingTop: 60, alignItems: 'center' }}><Text style={{ color: C.textLight }}>No articles yet</Text></View>}
          renderItem={({ item }) => (
            <BlogRow blog={item} onPress={() => {
              const slug = item.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
              if (slug) Linking.openURL('https://tricityphysiohub.in/blog/' + slug);
            }} />
          )}
        />
      )}

      {/* Bottom Tab Bar */}
      <View style={st.tabBar}>
        <TouchableOpacity style={[st.tabItem, tab === 'appointments' && st.tabActive]} onPress={() => setTab('appointments')}>
          <Text style={[st.tabIcon, tab === 'appointments' && { color: C.primary }]}>📋</Text>
          <Text style={[st.tabLabel, tab === 'appointments' && { color: C.primary, fontWeight: '700' }]}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tabItem, tab === 'blogs' && st.tabActive]} onPress={() => setTab('blogs')}>
          <Text style={[st.tabIcon, tab === 'blogs' && { color: C.primary }]}>📝</Text>
          <Text style={[st.tabLabel, tab === 'blogs' && { color: C.primary, fontWeight: '700' }]}>Blogs</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loginContainer: { flex: 1, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loginBox: { backgroundColor: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 380, alignItems: 'center' },
  loginIcon: { width: 64, height: 64, borderRadius: 16, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  loginTitle: { fontSize: 22, fontWeight: '700', color: C.text },
  loginSub: { fontSize: 12, color: C.textLight, marginBottom: 20 },
  loginInput: { width: '100%', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: '#f8fafc' },
  loginBtn: { width: '100%', backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  header: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  statsRow: { flexDirection: 'row', padding: 10, gap: 6 },
  statBox: { flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 8, alignItems: 'center', elevation: 1, borderColor: 'transparent', borderWidth: 0 },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, color: C.textLight, marginTop: 1 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, elevation: 2 },
  cardNew: { borderLeftWidth: 4, borderLeftColor: C.primary, backgroundColor: '#eef2f7' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardName: { fontSize: 15, fontWeight: '700', color: C.text },
  cardSub: { fontSize: 12, color: C.textLight, marginTop: 2 },
  cardDate: { fontSize: 11, color: C.primary, marginTop: 3, fontWeight: '600' },
  cardMsg: { fontSize: 11, color: '#475569', marginTop: 3, fontStyle: 'italic' },
  cardTime: { fontSize: 10, color: C.textLight },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  btn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  blogCard: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1, gap: 12, alignItems: 'center' },
  blogImg: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#eef2f7', justifyContent: 'center', alignItems: 'center' },
  blogTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  blogSub: { fontSize: 11, color: C.textLight, marginTop: 2 },
  blogDate: { fontSize: 10, color: '#94a3b8', marginTop: 3 },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: C.border, paddingBottom: 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabActive: { borderTopWidth: 2, borderTopColor: C.primary },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
