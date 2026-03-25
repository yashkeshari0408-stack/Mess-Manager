import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { getUsersWithTokenInfo, deleteUser, getUserAttendanceHistory } from '../db/database';

function UserCard({ user, onTap, onDelete, theme }) {
  const initial = user.name.charAt(0).toUpperCase();

  const getExpiryColor = (daysLeft, tokensRemaining) => {
    if (tokensRemaining <= 0) return '#f44336';
    if (daysLeft <= 5) return '#f44336';
    if (daysLeft <= 15) return '#ff9800';
    return '#4caf50';
  };

  const getExpiryText = (daysLeft, tokensRemaining) => {
    if (tokensRemaining <= 0) return 'Tokens exhausted';
    if (daysLeft < 0) return 'Plan expired';
    return `Expires in ${daysLeft} days`;
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}? This will also delete their tokens and attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteUser(user.id);
              onDelete();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete user.');
            }
          }
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onTap(user)}
      activeOpacity={0.7}
      testID="user-card"
    >
      <View style={styles.cardContent}>
        <View style={styles.topSection}>
          <View style={[styles.avatar, { backgroundColor: theme.avatarBg }]}>
            <Text style={[styles.avatarText, { color: theme.avatarText }]}>{initial}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            {user.endDate ? (
              <Text style={styles.tokenInfo}>
                {user.tokensRemaining} tokens • <Text style={{ color: getExpiryColor(user.daysLeft, user.tokensRemaining) }}>{getExpiryText(user.daysLeft, user.tokensRemaining)}</Text>
              </Text>
            ) : (
              <Text style={styles.noPlanText}>No plan assigned</Text>
            )}
          </View>
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => onDelete(user)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} testID="delete-button">
              <Ionicons name="trash-outline" size={18} color="#f44336" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward-outline" size={16} color="#bdbdbd" style={styles.chevron} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function UserListScreen() {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [exceptions, setExceptions] = useState([]);
  const [exceptionsLoading, setExceptionsLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getUsersWithTokenInfo();
      setUsers(data);
    } catch (e) {
      console.log('Load users error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  useEffect(() => {
    if (showModal && selectedUser) {
      console.log('Refreshing exceptions for user:', selectedUser.id);
      getUserAttendanceHistory(selectedUser.id)
        .then(data => {
          console.log('Exceptions loaded:', data.length);
          setExceptions(data);
        })
        .catch(e => console.log('exceptions error', e))
        .finally(() => setExceptionsLoading(false));
    }
  }, [showModal, selectedUser?.id]);

  const openUserDetail = async (user) => {
    setSelectedUser(user);
    setShowModal(true);
    setExceptionsLoading(true);
    try {
      const data = await getUserAttendanceHistory(user.id);
      setExceptions(data);
    } catch (e) {
      console.log('exceptions error', e);
    } finally {
      setExceptionsLoading(false);
    }
  };

  const handleDelete = (user) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.name}? This will also delete their tokens and attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting user:', user.id);
              await deleteUser(user.id);
              console.log('User deleted successfully');
              loadUsers();
            } catch (e) {
              console.log('Delete user error:', e);
              Alert.alert('Error', 'Failed to delete user: ' + e.message);
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getExpiryColor = (daysLeft) => {
    if (daysLeft === null || daysLeft === undefined) return '#9e9e9e';
    if (daysLeft < 0) return '#f44336';
    if (daysLeft <= 5) return '#f44336';
    if (daysLeft <= 15) return '#ff9800';
    return '#4caf50';
  };

  const getExpiryText = () => {
    if (!selectedUser?.endDate) return 'No plan assigned';
    const daysLeft = selectedUser.daysLeft;
    if (daysLeft < 0) return 'Plan expired';
    return `Expires in ${daysLeft} days`;
  };

  const getActiveCount = () => {
    const today = new Date().toISOString().split('T')[0];
    return users.filter(u => u.endDate && u.endDate >= today).length;
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase())
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={48} color="#e0e0e0" />
      <Text style={styles.emptyText}>No users yet</Text>
      <Text style={styles.emptySubtext}>Tap + to add your first user</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <UserCard user={item} onTap={openUserDetail} onDelete={handleDelete} theme={theme} />
  );

  const activeCount = users.length > 0 ? getActiveCount() : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <View>
          <Text style={styles.headerTitle}>Users</Text>
          <Text style={styles.headerSubtitle}>
            {search ? `${filteredUsers.length} of ${users.length} members` : (users.length > 0 && activeCount > 0 ? `${activeCount} active members` : `${users.length} members`)}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={() => navigation.navigate('AddEditUser')}>
          <Ionicons name="person-add-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#bdbdbd" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          placeholderTextColor="#bdbdbd"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color="#bdbdbd" />
          </TouchableOpacity>
        )}
      </View>

      {loading && users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : users.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.noResultsContainer}>
              <Text style={styles.noResultsText}>No users found</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={showModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
        testID="user-detail-modal"
      >
        <View style={styles.modalOuter}>
          <TouchableOpacity style={styles.modalBackdrop} onPress={() => setShowModal(false)} activeOpacity={1} />
          <View style={styles.modalCard}>
            <View style={styles.dragHandle} />
            
            <View style={styles.modalHeader}>
              <View style={styles.modalUserInfo}>
                <View style={[styles.modalAvatar, { backgroundColor: theme.avatarBg }]}>
                  <Text style={[styles.modalAvatarText, { color: theme.avatarText }]}>
                    {selectedUser?.name?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.modalUserName}>{selectedUser?.name}</Text>
                  <Text style={[styles.modalTokenInfo, { color: getExpiryColor(selectedUser?.daysLeft) }]}>
                    {getExpiryText()}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowModal(false)} testID="close-modal-button">
                <Ionicons name="close" size={24} color="#9e9e9e" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 16
              }}
            >
              {selectedUser?.planName && (
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Ionicons 
                    name="pricetag-outline" 
                    size={13} 
                    color="#9e9e9e" 
                    style={{ marginRight: 4 }}
                  />
                  <Text style={{ fontSize: 12, color: theme.primary, 
                    fontWeight: '600' }}>
                    {selectedUser.planName}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name="calendar-outline" 
                  size={13} 
                  color="#9e9e9e" 
                  style={{ marginRight: 4 }}
                />
                <Text style={{ fontSize: 12, color: '#9e9e9e' }}>
                  Started: {selectedUser?.startDate 
                    ? formatDate(selectedUser.startDate) 
                    : 'N/A'}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name="time-outline" 
                  size={13} 
                  color="#9e9e9e" 
                  style={{ marginRight: 4 }}
                />
                <Text style={{ fontSize: 12, color: '#9e9e9e' }}>
                  Expires: {selectedUser?.endDate 
                    ? formatDate(selectedUser.endDate) 
                    : 'N/A'}
                </Text>
              </View>
            </ScrollView>

            <View style={styles.exceptionsSection}>
              <Text style={styles.exceptionsLabel}>History</Text>
              
              {exceptionsLoading ? (
                <ActivityIndicator size="small" color={theme.primary} style={styles.exceptionsLoading} />
              ) : exceptions.length === 0 ? (
                <View style={styles.noExceptionsContainer}>
                  <Ionicons name="checkmark-circle-outline" size={32} color="#4caf50" />
                  <Text style={styles.noExceptionsText}>No attendance history yet</Text>
                </View>
              ) : (
                <ScrollView style={styles.exceptionsScroll}>
                  {exceptions.map((item, index) => {
                    const getStatusStyle = (status) => {
                      switch(status) {
                        case 'Present':
                          return { 
                            bg: '#E8F5E9', 
                            color: '#2E7D32' 
                          };
                        case 'Absent':
                          return { 
                            bg: '#FEE2E2', 
                            color: '#DC2626' 
                          };
                        case 'Home':
                          return { 
                            bg: '#DBEAFE', 
                            color: '#1D4ED8' 
                          };
                        default:
                          return { 
                            bg: '#F5F5F5', 
                            color: '#9E9E9E' 
                          };
                      }
                    };
                    const statusStyle = getStatusStyle(item.status);
                    return (
                      <View
                        key={index}
                        style={[
                          styles.exceptionRow,
                          index === exceptions.length - 1 && styles.exceptionRowLast
                        ]}
                      >
                        <View>
                          <Text style={styles.exceptionDate}>{formatShortDate(item.date)}</Text>
                          <Text style={{ 
                            fontSize: 11, 
                            color: '#9e9e9e', 
                            marginTop: 2 
                          }}>
                            {item.mealType}
                          </Text>
                        </View>
                        <View style={{
                          backgroundColor: statusStyle.bg,
                          borderRadius: 20,
                          paddingHorizontal: 14,
                          paddingVertical: 4
                        }}>
                          <Text style={{
                            color: statusStyle.color,
                            fontSize: 12,
                            fontWeight: '700'
                          }}>
                            {item.status}
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </ScrollView>
              )}
            </View>

            <TouchableOpacity
              style={[styles.editButton, { backgroundColor: theme.selectedBg }]}
              onPress={() => {
                setShowModal(false);
                navigation.navigate('AddEditUser', { userId: selectedUser?.id });
              }}
            >
              <Ionicons name="create-outline" size={18} color={theme.primary} />
              <Text style={[styles.editButtonText, { color: theme.primary }]}>Edit User Details</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#fafafa'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#fff',
    marginTop: 2,
    opacity: 0.9
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#212121'
  },
  loadingContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100
  },
  emptyContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyText: {
    fontSize: 16,
    color: '#9e9e9e',
    marginTop: 12
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bdbdbd',
    marginTop: 4
  },
  noResultsContainer: {
    padding: 20,
    alignItems: 'center'
  },
  noResultsText: {
    fontSize: 14,
    color: '#9e9e9e'
  },
  card: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2
  },
  cardContent: {
    padding: 14
  },
  topSection: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700'
  },
  userInfo: {
    marginLeft: 12,
    flex: 1
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121'
  },
  tokenInfo: {
    fontSize: 13,
    color: '#9e9e9e',
    marginTop: 2
  },
  noPlanText: {
    fontSize: 13,
    color: '#9e9e9e',
    marginTop: 2
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  chevron: {
    marginLeft: 12
  },
  modalOuter: {
    flex: 1,
    justifyContent: 'flex-end'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)'
  },
  modalCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: Dimensions.get('window').height * 0.75
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalUserInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  modalAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  modalAvatarText: {
    fontSize: 18,
    fontWeight: '700'
  },
  modalUserName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#212121'
  },
  modalTokenInfo: {
    fontSize: 13,
    marginTop: 2
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4
  },
  modalPlanRow: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  planPill: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  planNameText: {
    fontWeight: '600'
  },
  planPillText: {
    fontSize: 12,
    color: '#9e9e9e',
    marginLeft: 4
  },
  exceptionsSection: {
    paddingHorizontal: 20
  },
  exceptionsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12
  },
  exceptionsLoading: {
    marginVertical: 20
  },
  noExceptionsContainer: {
    alignItems: 'center',
    marginVertical: 20
  },
  noExceptionsText: {
    fontSize: 13,
    color: '#9e9e9e',
    marginTop: 8
  },
  exceptionsScroll: {
    maxHeight: 200
  },
  exceptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderColor: '#f5f5f5'
  },
  exceptionRowLast: {
    borderBottomWidth: 0
  },
  exceptionDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121'
  },
  exceptionMeal: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 2
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4
  },
  statusAbsent: {
    backgroundColor: '#fde8e8'
  },
  statusHome: {
    backgroundColor: '#e3f2fd'
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  statusTextAbsent: {
    color: '#f44336'
  },
  statusTextHome: {
    color: '#1976d2'
  },
  editButton: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  }
});
