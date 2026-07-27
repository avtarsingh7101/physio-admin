import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  SafeAreaView, StatusBar, StyleSheet, Vibration, Animated,
  RefreshControl, Linking, Modal, ScrollView, Alert, Platform
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, updateDoc, addDoc, Timestamp } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: false, shouldSetBadge: true }),
});

const firebaseConfig = {
  apiKey: 'AIzaSyCofwnjnD-h2OeUO19aD5eF6tpLtAmBW4k',
  authDomain: 'tricityphysiohub.firebaseapp.com',
  projectId: 'tricityphysiohub',
  storageBucket: 'tricityphysiohub.firebasestorage.app',
  messagingSenderId: '1083499442214',
  appId: '1:1083499442214:web:922a9c9cfe923d9c22f6e7',
};

const appFb = initializeApp(firebaseConfig);
const db = getFirestore(appFb);

const C = { primary: '#1a365d', gold: '#d4a853', bg: '#f5f3ee', card: '#fff', text: '#1a1a2e', textLight: '#64748b', border: '#e2e8f0', success: '#16a34a', danger: '#dc2626' };

// ===== LOGO =====
const Logo = () => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
    <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: '#d4a853', justifyContent: 'center', alignItems: 'center', shadowColor: '#d4a853', shadowOpacity: 0.3, shadowRadius: 6, elevation: 4 }}>
      <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#1a365d', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#d4a853' }} />
      </View>
    </View>
    <View>
      <Text style={{ fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.3 }}>PhysioHub</Text>
      <Text style={{ fontSize: 8, color: '#d4a853', letterSpacing: 1, marginTop: -1 }}>ADMIN PANEL</Text>
    </View>
  </View>
);

// ===== ANIMATED CARD =====
function ApptCard({ item, index, onStatus }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(30)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 350, delay: index * 40, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 350, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, []);

  const timeAgo = (ts) => {
    if (!ts) return '';
    const d = ts?.toDate?.() || new Date(ts);
    const m = Math.floor((Date.now() - d) / 60000);
    return m < 1 ? 'Just now' : m < 60 ? m + 'm ago' : Math.floor(m / 60) + 'h ago';
  };
  const s = item.status || 'pending';
  const cleanPhone = item.phone?.replace(/[^0-9]/g, '') || '';
  const wpMsg = `Hello%20${encodeURIComponent(item.name)}%2C%20This%20is%20Dr.%20Ragib%20Hussian%20(PT).%20I%20have%20received%20your%20appointment%20request%20for%20${encodeURIComponent(item.date || 'home visit')}.%20Your%20request%20is%20currently%20${s}.`;

  return (
    <Animated.View style={[styles.card, !item.read && styles.cardNew, { opacity: fade, transform: [{ translateY: slide }] }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.cardName}>{item.name}</Text>
            <View style={[styles.badge, { backgroundColor: s === 'pending' ? '#fef3c7' : s === 'confirmed' ? '#d1fae5' : s === 'cancelled' ? '#fee2e2' : '#dbeafe' }]}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: s === 'pending' ? '#92400e' : s === 'confirmed' ? '#065f46' : s === 'cancelled' ? '#991b1b' : '#1e40af' }}>{s.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.cardSub}>
            <Text style={{ color: C.primary }}>📞 {item.phone}</Text>  ·  📍 {item.location}
          </Text>
          {item.date ? <Text style={styles.cardDate}>📅 {item.date}{item.time ? ' · ' + item.time : ''}</Text> : null}
          {item.message ? <Text style={styles.cardMsg}>💬 "{item.message}"</Text> : null}
        </View>
        <Text style={styles.cardTime}>{timeAgo(item.timestamp)}</Text>
      </View>

      {/* 4 Action Buttons */}
      <View style={styles.actions}>
        {s !== 'confirmed' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16a34a' }]} onPress={() => onStatus(item.id, 'confirmed')}>
            <Text style={styles.actionBtnText}>✓ Confirm</Text>
          </TouchableOpacity>
        )}
        {s !== 'completed' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#2563eb' }]} onPress={() => onStatus(item.id, 'completed')}>
            <Text style={styles.actionBtnText}>✓ Done</Text>
          </TouchableOpacity>
        )}
        {s !== 'cancelled' && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc2626' }]} onPress={() => onStatus(item.id, 'cancelled')}>
            <Text style={styles.actionBtnText}>✕ Cancel</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#25D366' }]} onPress={() => Linking.openURL(`https://wa.me/91${cleanPhone}?text=${wpMsg}`)}>
          <Text style={styles.actionBtnText}>💬 WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

// ===== BLOG CARD =====
function BlogCard({ blog, onPress, onDelete }) {
  const ago = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const m = Math.floor((Date.now() - d) / 60000);
    return m < 60 ? m + 'm ago' : Math.floor(m / 60) + 'h ago';
  };
  return (
    <View style={styles.blogCard}>
      <View style={styles.blogDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.blogTitle} numberOfLines={1}>{blog.title}</Text>
        <Text style={styles.blogSub} numberOfLines={2}>{blog.content?.substring(0, 80)}</Text>
        <Text style={styles.blogDate}>{ago(blog.createdAt)}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <TouchableOpacity style={[styles.blogAction, { backgroundColor: '#eef2f7' }]} onPress={onPress}><Text style={{ fontSize: 16 }}>👁</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.blogAction, { backgroundColor: '#fee2e2' }]} onPress={onDelete}><Text style={{ fontSize: 16 }}>🗑</Text></TouchableOpacity>
      </View>
    </View>
  );
}

// ===== MAIN =====
export default function App() {
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [tab, setTab] = useState('appointments');
  const [showCreateBlog, setShowCreateBlog] = useState(false);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogContent, setBlogContent] = useState('');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const prevCount = useRef(0);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    // Request notification permission on every app open
    Notifications.requestPermissionsAsync().then(({ status }) => {
      if (status !== 'granted') {
        Alert.alert('Notifications', 'Enable notifications to get alerts for new appointments.');
      }
    });
    loadBlogs();
  }, []);

  useEffect(() => {
    if (!loggedIn) return;
    const q = query(collection(db, 'appointments'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      if (prevCount.current > 0 && items.length > prevCount.current) {
        Vibration.vibrate([0, 200, 100, 200]);
        Notifications.scheduleNotificationAsync({
          content: { title: 'New Appointment!', body: items[0].name + ' booked - ' + items[0].location, data: { id: items[0].id } },
          trigger: null,
        });
      }
      prevCount.current = items.length;
      setAppointments(items);
    });
    return () => unsub();
  }, [loggedIn]);

  const loadBlogs = async () => {
    try { const r = await fetch('https://tricityphysiohub.in/api/blogs'); const d = await r.json(); if (d.success) setBlogs(d.blogs); } catch (e) {}
  };

  const createBlog = async () => {
    if (!blogTitle.trim() || !blogContent.trim()) { Alert.alert('Error', 'Title and content required'); return; }
    try {
      await fetch('https://tricityphysiohub.in/api/blogs', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: blogTitle.trim(), content: blogContent.trim() }),
      });
      setShowCreateBlog(false); setBlogTitle(''); setBlogContent('');
      loadBlogs();
      Alert.alert('Success', 'Blog published');
    } catch (e) { Alert.alert('Error', 'Failed to publish'); }
  };

  const deleteBlog = async (id) => {
    try { await fetch('https://tricityphysiohub.in/api/blogs/' + id, { method: 'DELETE' }); loadBlogs(); }
    catch (e) {}
  };

  const updateStatus = async (id, status) => {
    try { await updateDoc(doc(db, 'appointments', id), { status, read: true }); Vibration.vibrate(30); } catch (e) {}
  };

  const handleLogin = () => {
    if (password === '131313') { setLoggedIn(true); setLoginError(''); }
    else setLoginError('Wrong password');
  };

  // Default: show pending + confirmed, not completed/cancelled
  const filtered = appointments.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'pending') return (a.status || 'pending') === 'pending';
    if (filter === 'active') return (a.status || 'pending') === 'pending' || a.status === 'confirmed';
    return (a.status || 'pending') === filter;
  });
  const statusCounts = {};
  ['pending', 'confirmed', 'completed', 'cancelled'].forEach(s => { statusCounts[s] = appointments.filter(a => (a.status || 'pending') === s).length; });

  if (!loggedIn) return (
    <SafeAreaView style={styles.loginContainer}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <Animated.View style={[styles.loginBox, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: '#d4a853', justifyContent: 'center', alignItems: 'center', marginBottom: 16, shadowColor: '#d4a853', shadowOpacity: 0.4, shadowRadius: 12, elevation: 6 }}>
          <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#d4a853' }} />
          </View>
        </View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: C.text }}>PhysioHub</Text>
        <Text style={{ fontSize: 12, color: C.textLight, marginBottom: 24 }}>Dr. Ragib Hussian (PT)</Text>
        <TextInput style={styles.loginInput} placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={handleLogin} />
        {loginError ? <Text style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{loginError}</Text> : null}
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin}><Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Unlock Dashboard</Text></TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <View style={styles.header}>
        <Logo />
        <TouchableOpacity style={{ paddingHorizontal: 4 }}>
          <Text style={{ color: '#fff', fontSize: 20 }}>👤</Text>
        </TouchableOpacity>
      </View>

      {tab === 'appointments' ? (
        <>
          {/* Stats bar */}
          <View style={styles.statsRow}>
            {[{ k: 'active', l: 'Active' }, { k: 'pending', l: 'Pending' }, { k: 'confirmed', l: 'Confirmed' }, { k: 'completed', l: 'Completed' }].map(({ k, l }) => (
              <TouchableOpacity key={k} style={[styles.statBox, filter === k && { borderColor: C.primary, borderWidth: 2, backgroundColor: '#eef2f7' }]} onPress={() => setFilter(k)}>
                <Text style={[styles.statNum, { color: C.primary }]}>{
                  k === 'active' ? statusCounts.pending + statusCounts.confirmed : statusCounts[k] || 0
                }</Text>
                <Text style={styles.statLabel}>{l}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{ paddingHorizontal: 14, paddingVertical: 6 }}>
            <Text style={{ fontSize: 11, color: C.textLight, fontWeight: '600' }}>
              {filter === 'active' ? 'Active (Pending + Confirmed)' : filter.charAt(0).toUpperCase() + filter.slice(1)} · {filtered.length}
            </Text>
          </View>

          <FlatList
            data={filtered} keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 12, paddingBottom: 90 }}
            refreshControl={<RefreshControl refreshing={false} onRefresh={() => {}} tintColor={C.primary} />}
            ListEmptyComponent={<View style={{ paddingTop: 60, alignItems: 'center' }}><Text style={{ color: C.textLight }}>No {filter} appointments</Text></View>}
            renderItem={({ item, index }) => <ApptCard item={item} index={index} onStatus={updateStatus} />}
          />
        </>
      ) : (
        <>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text }}>Blogs</Text>
            <TouchableOpacity style={{ backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 }} onPress={() => setShowCreateBlog(true)}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ New Post</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={blogs} keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
            ListEmptyComponent={<View style={{ paddingTop: 60, alignItems: 'center' }}><Text style={{ color: C.textLight }}>No articles yet</Text></View>}
            renderItem={({ item }) => (
              <BlogCard
                blog={item}
                onPress={() => {
                  const slug = item.title?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]+/g, '');
                  if (slug) Linking.openURL('https://tricityphysiohub.in/blog/' + slug);
                }}
                onDelete={() => deleteBlog(item.id)}
              />
            )}
          />
        </>
      )}

      {/* Bottom Tab */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabItem, tab === 'appointments' && styles.tabActive]} onPress={() => setTab('appointments')}>
          <Text style={[styles.tabIcon, tab === 'appointments' && { color: C.primary }]}>📋</Text>
          <Text style={[styles.tabLabel, tab === 'appointments' && { color: C.primary, fontWeight: '700' }]}>Appointments</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabItem, tab === 'blogs' && styles.tabActive]} onPress={() => setTab('blogs')}>
          <Text style={[styles.tabIcon, tab === 'blogs' && { color: C.primary }]}>📝</Text>
          <Text style={[styles.tabLabel, tab === 'blogs' && { color: C.primary, fontWeight: '700' }]}>Blogs</Text>
        </TouchableOpacity>
      </View>

      {/* Create Blog Modal */}
      <Modal visible={showCreateBlog} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' }}>
            <View style={{ width: 40, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, marginBottom: 16 }}>New Blog Post</Text>
            <TextInput style={[styles.loginInput, { marginBottom: 12 }]} placeholder="Title" value={blogTitle} onChangeText={setBlogTitle} />
            <TextInput style={[styles.loginInput, { marginBottom: 16, minHeight: 120, textAlignVertical: 'top' }]} placeholder="Content" multiline value={blogContent} onChangeText={setBlogContent} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.loginBtn, { flex: 1, backgroundColor: C.primary }]} onPress={createBlog}><Text style={{ color: '#fff', fontWeight: '700' }}>Publish</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.loginBtn, { flex: 1, backgroundColor: '#e2e8f0' }]} onPress={() => setShowCreateBlog(false)}><Text style={{ color: C.text, fontWeight: '600' }}>Cancel</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loginContainer: { flex: 1, backgroundColor: C.primary, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loginBox: { backgroundColor: '#fff', borderRadius: 20, padding: 32, width: '100%', maxWidth: 380, alignItems: 'center' },
  loginInput: { width: '100%', borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 15, backgroundColor: '#f8fafc' },
  loginBtn: { width: '100%', backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center' },
  header: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statsRow: { flexDirection: 'row', padding: 10, gap: 6 },
  statBox: { flex: 1, backgroundColor: C.card, borderRadius: 10, padding: 8, alignItems: 'center', elevation: 1, borderColor: 'transparent', borderWidth: 0 },
  statNum: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 9, color: C.textLight, marginTop: 1 },
  card: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, elevation: 2 },
  cardNew: { borderLeftWidth: 4, borderLeftColor: C.primary, backgroundColor: '#eef2f7' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardName: { fontSize: 15, fontWeight: '700', color: C.text },
  cardSub: { fontSize: 12, color: C.textLight, marginTop: 3 },
  cardDate: { fontSize: 11, color: C.primary, marginTop: 3, fontWeight: '600' },
  cardMsg: { fontSize: 11, color: '#475569', marginTop: 3, fontStyle: 'italic' },
  cardTime: { fontSize: 10, color: C.textLight },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  actionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  blogCard: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, elevation: 1, alignItems: 'center', gap: 10 },
  blogDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary },
  blogTitle: { fontSize: 14, fontWeight: '700', color: C.text },
  blogSub: { fontSize: 11, color: C.textLight, marginTop: 1 },
  blogDate: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  blogAction: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  tabBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', backgroundColor: '#fff', borderTopWidth: 1, borderColor: C.border, paddingBottom: 10 },
  tabItem: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  tabActive: { borderTopWidth: 2, borderTopColor: C.primary },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
