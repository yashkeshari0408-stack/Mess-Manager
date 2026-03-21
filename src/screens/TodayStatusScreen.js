import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getTodayStatusForAllUsers } from '../db/database';

const getTodayString = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function TodayStatusScreen() {
  const navigation = useNavigation();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    try {
      const today = getTodayString();
      const data = await getTodayStatusForAllUsers(today);
      setRows(data);
    } catch (e) {
      console.log('Today status load error', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [])
  );

  const renderIndicator = (label, active) => (
    <View
      style={[
        styles.indicator,
        { backgroundColor: active ? '#2e7d32' : '#e0e0e0' }
      ]}
    >
      <Text style={[styles.indicatorText, { color: active ? '#fff' : '#444' }]}>
        {label}
      </Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => navigation.navigate('TokenList', { userId: item.id })}
    >
      <View style={styles.rowHeader}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.sub}>
          {item.phone || '-'}
        </Text>
      </View>
      <View style={styles.indicatorRow}>
        {renderIndicator('B', item.breakfastActive === 1)}
        {renderIndicator('L', item.lunchActive === 1)}
        {renderIndicator('D', item.dinnerActive === 1)}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading && rows.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : null}
      <FlatList
        data={rows}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadStatus} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              No users yet. Add users first.
            </Text>
          </View>
        }
      />
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => navigation.navigate('UserList')}
        >
          <Text style={styles.bottomButtonText}>Manage Users</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa'
  },
  row: {
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#eee',
    backgroundColor: '#fff'
  },
  rowHeader: {
    marginBottom: 8
  },
  name: {
    fontSize: 16,
    fontWeight: '600'
  },
  sub: {
    marginTop: 2,
    fontSize: 12,
    color: '#555'
  },
  indicatorRow: {
    flexDirection: 'row'
  },
  indicator: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 8
  },
  indicatorText: {
    fontSize: 12,
    fontWeight: '600'
  },
  loadingWrap: {
    padding: 24,
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 8,
    color: '#666'
  },
  empty: {
    padding: 24,
    alignItems: 'center'
  },
  emptyText: {
    color: '#777'
  },
  bottomBar: {
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#ddd'
  },
  bottomButton: {
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#2196f3',
    alignItems: 'center'
  },
  bottomButtonText: {
    color: '#fff',
    fontWeight: '600'
  }
});

