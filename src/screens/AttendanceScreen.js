import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../context/ThemeContext';
import {
  getUsersWithMealPlans,
  getAllPlans,
  getAttendanceByDateAndMeal,
  markAttendanceAndDeductToken,
  refundToken
} from '../db/database';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
  });
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  return dateStr.substring(0, 10);
}

function formatDate(date) {
  const dayName = DAYS[date.getDay()];
  return `${dayName}, ${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function isWeekendDate(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6;
}

function getDefaultMealForDate(date) {
  return isWeekendDate(date) ? 'Lunch' : 'Dinner';
}

function UserCard({ user, status, onMark, selectedDate, theme }) {
  const currentStatus = status || null;
  const showTokenDeduction = currentStatus === 'Present' || currentStatus === 'Absent';

  const selectedDateStr = toDateString(selectedDate);
  const planStartDate = normalizeDate(user.startDate);
  const normalizedSelectedDate = selectedDateStr.substring(0, 10);

  const getStatusColor = (s) => {
    if (s === 'Present') return '#4caf50';
    if (s === 'Absent') return '#f44336';
    if (s === 'Home') return '#1976d2';
    return '#9e9e9e';
  };
  const accentColor = getStatusColor(currentStatus);

  if (planStartDate && normalizedSelectedDate < planStartDate) {
    return (
      <View style={[styles.card, { paddingLeft: 12 }]}>
        <View style={[styles.accentBar, { backgroundColor: '#ff9800' }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: theme.avatarBg }]}>
              <Text style={[styles.avatarText, { color: theme.avatarText }]}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={{ 
                fontSize: 11, 
                color: '#ff9800', 
                marginTop: 1 
              }}>
                Plan starts on {formatDisplayDate(new Date(user.startDate))}
              </Text>
            </View>
          </View>
          <View style={{
            backgroundColor: '#FFF8E1',
            borderRadius: 6,
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Ionicons 
              name="information-circle-outline" 
              size={12} 
              color="#ff9800" 
              style={{ marginRight: 6 }}
            />
            <Text style={{ fontSize: 11, color: '#ff9800' }}>
              Cannot mark attendance before plan start date
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const isPlanUnavailable = !user.endDate 
    || user.daysLeft < 0 
    || user.tokensRemaining <= 0;

  if (isPlanUnavailable) {
    const getMessage = () => {
      if (!user.endDate) return 'No meal plan assigned';
      if (user.tokensRemaining <= 0) return 'Tokens exhausted — renewal required';
      return 'Plan expired — renewal required';
    };

    const getGuideText = () => {
      if (!user.endDate) return 'Go to Users tab to assign a plan';
      return 'Go to Users tab to renew this plan';
    };

    return (
      <View style={[styles.card, { paddingLeft: 12 }]}>
        <View style={[styles.accentBar, { backgroundColor: '#f44336' }]} />
        <View style={styles.cardContent}>
          <View style={styles.cardTop}>
            <View style={[styles.avatar, { backgroundColor: theme.avatarBg }]}>
              <Text style={[styles.avatarText, { color: theme.avatarText }]}>
                {user.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={{ 
                fontSize: 11, 
                color: '#f44336', 
                marginTop: 1 
              }}>
                {getMessage()}
              </Text>
            </View>
          </View>
          <View style={{
            backgroundColor: '#fde8e8',
            borderRadius: 6,
            padding: 8,
            flexDirection: 'row',
            alignItems: 'center'
          }}>
            <Ionicons 
              name="alert-circle-outline" 
              size={12} 
              color="#f44336" 
              style={{ marginRight: 6 }}
            />
            <Text style={{ fontSize: 11, color: '#f44336' }}>
              {getGuideText()}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const getButtonStyle = (buttonStatus, fillColor, borderColor) => {
    if (currentStatus === buttonStatus) {
      return { backgroundColor: fillColor, borderWidth: 0 };
    }
    return { backgroundColor: '#fff', borderWidth: 1.5, borderColor };
  };

  const getTextColor = (buttonStatus, activeColor) => {
    return currentStatus === buttonStatus ? '#fff' : activeColor;
  };

  return (
    <View style={[styles.card, { paddingLeft: 12 }]}>
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: theme.avatarBg }]}>
            <Text style={[styles.avatarText, { color: theme.avatarText }]}>{user.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
          </View>
          <View style={[styles.tokenPill, { backgroundColor: theme.buttonBg }]}>
            <Text style={styles.tokenPillText}>
              {user.tokensRemaining}
              {showTokenDeduction && <Text style={styles.tokenDeduction}> (-1)</Text>}
            </Text>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, getButtonStyle('Present', '#4caf50', '#4caf50')]}
            onPress={() => onMark(user.id, 'Present', user.name)}
          >
            <Text style={{ color: getTextColor('Present', '#4caf50'), fontSize: 12, fontWeight: '600' }}>
              Present
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, getButtonStyle('Absent', '#f44336', '#f44336')]}
            onPress={() => onMark(user.id, 'Absent', user.name)}
          >
            <Text style={{ color: getTextColor('Absent', '#f44336'), fontSize: 12, fontWeight: '600' }}>
              Absent
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, getButtonStyle('Home', '#1976d2', '#bdbdbd')]}
            onPress={() => onMark(user.id, 'Home', user.name)}
          >
            <Text style={{ color: getTextColor('Home', '#1976d2'), fontSize: 12, fontWeight: '600' }}>
              Home
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default function AttendanceScreen() {
  const { theme } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [mealType, setMealType] = useState(
    isWeekendDate(new Date()) ? 'Lunch' : 'Dinner'
  );
  const [showLunch, setShowLunch] = useState(false);
  const [users, setUsers] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateStr = toDateString(selectedDate);
  const isWeekendDay = isWeekendDate(selectedDate);
  const isTodaySelected = selectedDate.toDateString() === new Date().toDateString();

  const loadData = useCallback(async (date, meal) => {
    setLoading(true);
    try {
      const dateStr = toDateString(date);
      const [usersData, attendanceData] = await Promise.all([
        getUsersWithMealPlans(),
        getAttendanceByDateAndMeal(dateStr, meal)
      ]);
      setUsers(usersData);
      const map = {};
      attendanceData.forEach(a => { 
        map[a.userId] = a.status; 
      });
      setAttendance(map);
    } catch(e) {
      console.error('loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const currentDate = selectedDate;
      const currentMeal = mealType;
      
      const reload = async () => {
        setLoading(true);
        try {
          const dateStr = toDateString(currentDate);
          const [usersData, attendanceData] = await Promise.all([
            getUsersWithMealPlans(),
            getAttendanceByDateAndMeal(dateStr, currentMeal)
          ]);
          
          const map = {};
          attendanceData.forEach(a => {
            map[a.userId] = a.status;
          });
          
          setUsers(usersData);
          setAttendance(map);
        } catch(e) {
          console.log('Focus reload error:', e);
        } finally {
          setLoading(false);
        }
      };
      
      reload();
      return () => {};
    }, [selectedDate, mealType])
  );

  const changeDate = (delta) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);
    if (newDate > today) return;

    setAttendance({});
    setSelectedDate(newDate);

    const newDateIsWeekend = isWeekendDate(newDate);
    let newMeal = mealType;

    if (!newDateIsWeekend && mealType === 'Lunch') {
      newMeal = 'Dinner';
      setMealType('Dinner');
    } else if (newDateIsWeekend && mealType === 'Dinner') {
      newMeal = 'Lunch';
      setMealType('Lunch');
    }

    loadData(newDate, newMeal);
  };

  const handlePrevDay = () => {
    changeDate(-1);
  };

  const handleNextDay = () => {
    changeDate(1);
  };

  const changeMeal = async (meal) => {
    if (meal === mealType) return;
    setMealType(meal);
    setAttendance({});
    setLoading(true);
    try {
      const dateStr = toDateString(selectedDate);
      const attendanceData = await getAttendanceByDateAndMeal(
        dateStr, meal
      );
      const map = {};
      attendanceData.forEach(a => {
        map[a.userId] = a.status;
      });
      setAttendance(map);
    } catch(e) {
      console.log('changeMeal error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleMark = async (userId, newStatus, userName) => {
    const prevStatus = attendance[userId] || null;
    
    if (prevStatus === newStatus) return;

    const getStatusEmoji = (status) => {
      switch(status) {
        case 'Present': return '✅';
        case 'Absent': return '❌';
        case 'Home': return '🏠';
        default: return '';
      }
    };

    const getTokenMessage = () => {
      const wasDeducting = prevStatus === 'Present' || 
        prevStatus === 'Absent';
      const willDeduct = newStatus === 'Present' || 
        newStatus === 'Absent';
      
      if (!wasDeducting && willDeduct) 
        return '\n\n⚠️ 1 token will be deducted.';
      if (wasDeducting && !willDeduct) 
        return '\n\n♻️ 1 token will be refunded.';
      if (wasDeducting && willDeduct && prevStatus !== newStatus)
        return '\n\nℹ️ No token change (already deducted).';
      return '';
    };

    Alert.alert(
      `${getStatusEmoji(newStatus)} Mark ${newStatus}`,
      `Mark ${userName} as ${newStatus} for ${mealType}?${getTokenMessage()}`,
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Confirm',
          style: 'default',
          onPress: async () => {
            const dateStr = toDateString(selectedDate);

            setAttendance(prev => ({ 
              ...prev, [userId]: newStatus 
            }));

            setUsers(prev => prev.map(u => {
              if (u.id !== userId) return u;
              const wasDeducting = prevStatus === 'Present' || 
                prevStatus === 'Absent';
              const willDeduct = newStatus === 'Present' || 
                newStatus === 'Absent';
              let delta = 0;
              if (!wasDeducting && willDeduct) delta = -1;
              if (wasDeducting && !willDeduct) delta = +1;
              return { 
                ...u, 
                tokensRemaining: Math.max(0, u.tokensRemaining + delta) 
              };
            }));

            try {
              await markAttendanceAndDeductToken(
                userId, dateStr, mealType, newStatus
              );
            } catch(e) {
              console.log('handleMark error:', e);
              Alert.alert(
                'Error', 
                'Failed to save attendance. Please try again.'
              );
              loadData(selectedDate, mealType);
            }
          }
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <View>
          <Text style={styles.headerTitle}>Mark Attendance</Text>
          <Text style={styles.headerSubtitle}>Bulk attendance marking.</Text>
        </View>
      </View>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        gap: 8
      }}>
        <TouchableOpacity 
          onPress={() => changeDate(-1)}
          style={{ padding: 4 }}
        >
          <Ionicons name="chevron-back" size={20} color="#555" />
        </TouchableOpacity>

        <Text style={{ 
          fontSize: 14, 
          fontWeight: '700', 
          color: '#212121',
          flex: 1,
          textAlign: 'center'
        }}>
          {formatDisplayDate(selectedDate)}
        </Text>

        <TouchableOpacity
          onPress={() => changeDate(1)}
          disabled={isTodaySelected}
          style={{ padding: 4, opacity: isTodaySelected ? 0.3 : 1 }}
        >
          <Ionicons name="chevron-forward" size={20} color="#555" />
        </TouchableOpacity>

        <View style={{
          width: 1,
          height: 20,
          backgroundColor: '#e0e0e0'
        }}/>

        {isWeekendDate(selectedDate) ? (
          <View style={{
            flexDirection: 'row',
            backgroundColor: '#f0f0f0',
            borderRadius: 20,
            padding: 3
          }}>
            {['Lunch', 'Dinner'].map(meal => (
              <TouchableOpacity
                key={meal}
                onPress={() => changeMeal(meal)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 17,
                  backgroundColor: mealType === meal 
                    ? theme.primary : 'transparent'
                }}
              >
                <Text style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: mealType === meal ? '#fff' : '#9e9e9e'
                }}>
                  {meal}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={{
            backgroundColor: theme.primaryLight,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 5
          }}>
            <Text style={{
              fontSize: 12,
              fontWeight: '700',
              color: theme.primary
            }}>
              Dinner
            </Text>
          </View>
        )}
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          maximumDate={new Date()}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowDatePicker(Platform.OS === 'ios');
            if (date) {
              const today = new Date();
              today.setHours(23, 59, 59, 999);
              if (date <= today) {
                setSelectedDate(date);
                const newDateIsWeekend = isWeekendDate(date);
                setShowLunch(newDateIsWeekend);
                if (!newDateIsWeekend && mealType === 'Lunch') {
                  setMealType('Dinner');
                } else if (newDateIsWeekend && mealType === 'Dinner') {
                  setMealType('Lunch');
                }
              }
            }
          }}
        />
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : users.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={48} color="#e0e0e0" />
          <Text style={styles.emptyText}>No users to show</Text>
          <Text style={styles.emptySubtext}>Create meal plans and add users first</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <UserCard
              user={item}
              status={attendance[item.id] || null}
              onMark={handleMark}
              selectedDate={selectedDate}
              theme={theme}
            />
          )}
          ListHeaderComponent={
            <View style={{
              paddingHorizontal: 16,
              paddingVertical: 10,
              backgroundColor: '#fafafa'
            }}>
              <Text style={{
                fontSize: 15,
                fontWeight: '800',
                color: '#212121'
              }}>
                Select Attendance ({users.length} users)
              </Text>
            </View>
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingBottom: 16
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
  loadingContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9e9e9e',
    marginTop: 16
  },
  emptySubtext: {
    fontSize: 13,
    color: '#bdbdbd',
    marginTop: 4,
    textAlign: 'center'
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  accentBar: {
    width: 4,
    borderRadius: 2,
    marginRight: 10
  },
  cardContent: {
    flex: 1
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center'
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700'
  },
  userInfo: {
    marginLeft: 10,
    flex: 1
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121'
  },
  tokenPill: {
    backgroundColor: '#009688',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  tokenPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff'
  },
  tokenText: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 1
  },
  tokenDeduction: {
    color: '#fff'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 50,
    alignItems: 'center',
    marginHorizontal: 3
  }
});
