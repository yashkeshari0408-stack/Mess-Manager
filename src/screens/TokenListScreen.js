import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  SafeAreaView, ActivityIndicator, TouchableOpacity
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getTokensByUser, getUserById } from '../db/database';

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
};

const isTokenActive = (endDate) => {
  if (!endDate) return false;
  const today = new Date().toISOString().split('T')[0];
  return endDate >= today;
};

const getMealTypeStyle = (mealType, theme) => {
  switch(mealType?.toLowerCase()) {
    case 'breakfast':
      return { bg: '#fff3e0', color: '#ff9800' };
    case 'lunch':
      return { bg: '#e8f5e9', color: '#4caf50' };
    case 'dinner':
      return { bg: theme.primaryLight, color: theme.primary };
    default:
      return { bg: '#f5f5f5', color: '#9e9e9e' };
  }
};

export default function TokenListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const userId = route.params?.userId;

  const [user, setUser] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userData, tokenData] = await Promise.all([
        getUserById(userId),
        getTokensByUser(userId)
      ]);
      setUser(userData);
      setTokens(tokenData);
    } catch(e) {
      console.log('TokenListScreen load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderToken = ({ item, index }) => {
    const mealStyle = getMealTypeStyle(item.mealType, theme);
    const active = isTokenActive(item.endDate);

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={[styles.mealBadge, 
            { backgroundColor: mealStyle.bg }]}>
            <Text style={[styles.mealText, 
              { color: mealStyle.color }]}>
              {item.mealType || 'Unknown'}
            </Text>
          </View>

          <View style={styles.dateRange}>
            <Text style={styles.dateText}>
              {formatDate(item.startDate)}
            </Text>
            <Ionicons 
              name="arrow-forward" 
              size={12} 
              color="#bdbdbd" 
              style={{ marginHorizontal: 6 }}
            />
            <Text style={styles.dateText}>
              {formatDate(item.endDate)}
            </Text>
          </View>

          <View style={[styles.statusBadge, {
            backgroundColor: active ? '#e8f5e9' : '#fde8e8'
          }]}>
            <Text style={[styles.statusText, {
              color: active ? '#4caf50' : '#f44336'
            }]}>
              {active ? 'Active' : 'Expired'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>Token History</Text>
          {user && (
            <Text style={[styles.headerSubtitle, { color: '#fff' }]}>{user.name}</Text>
          )}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator 
          style={{ marginTop: 40 }} 
          color={theme.primary}
          size="large"
        />
      ) : (
        <FlatList
          data={tokens}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderToken}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons 
                name="receipt-outline" 
                size={48} 
                color="#e0e0e0" 
              />
              <Text style={styles.emptyText}>
                No token records found
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16
  },
  backButton: { marginRight: 12 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700'
  },
  headerSubtitle: {
    fontSize: 13,
    opacity: 0.8,
    marginTop: 2
  },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0'
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  mealBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    minWidth: 70,
    alignItems: 'center'
  },
  mealText: { fontSize: 12, fontWeight: '600' },
  dateRange: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  },
  dateText: { fontSize: 12, color: '#757575' },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    marginTop: 80
  },
  emptyText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 12
  }
});
