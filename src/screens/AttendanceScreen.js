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
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date) {
  return date.toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric' 
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

  if (planStartDate && normalizedSelectedDate < planStartDate) {
    return (
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: theme.avatarBg }]}>
            <Text style={[styles.avatarText, { color: theme.avatarText }]}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={{ 
              fontSize: 12, 
              color: '#ff9800', 
              marginTop: 2 
            }}>
              Plan starts on {formatDisplayDate(new Date(user.startDate))}
            </Text>
          </View>
        </View>
        <View style={{
          backgroundColor: '#FFF8E1',
          borderRadius: 8,
          padding: 10,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Ionicons 
            name="information-circle-outline" 
            size={14} 
            color="#ff9800" 
            style={{ marginRight: 6 }}
          />
          <Text style={{ fontSize: 12, color: '#ff9800' }}>
            Cannot mark attendance before plan start date
          </Text>
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
      <View style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: theme.avatarBg }]}>
            <Text style={[styles.avatarText, { color: theme.avatarText }]}>
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={{ 
              fontSize: 12, 
              color: '#f44336', 
              marginTop: 2 
            }}>
              {getMessage()}
            </Text>
          </View>
        </View>
        <View style={{
          backgroundColor: '#fde8e8',
          borderRadius: 8,
          padding: 10,
          flexDirection: 'row',
          alignItems: 'center'
        }}>
          <Ionicons 
            name="alert-circle-outline" 
            size={14} 
            color="#f44336" 
            style={{ marginRight: 6 }}
          />
          <Text style={{ fontSize: 12, color: '#f44336' }}>
            {getGuideText()}
          </Text>
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
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={[styles.avatar, { backgroundColor: theme.avatarBg }]}>
          <Text style={[styles.avatarText, { color: theme.avatarText }]}>{user.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.tokenText}>
            {user.tokensRemaining} tokens
            {showTokenDeduction && <Text style={styles.tokenDeduction}> (-1)</Text>}
          </Text>
        </View>
      </View>
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.button, getButtonStyle('Present', '#4caf50', '#4caf50')]}
          onPress={() => onMark(user.id, 'Present')}
        >
          <Text style={{ color: getTextColor('Present', '#4caf50'), fontSize: 13, fontWeight: '600' }}>
            Present
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, getButtonStyle('Absent', '#f44336', '#f44336')]}
          onPress={() => onMark(user.id, 'Absent')}
        >
          <Text style={{ color: getTextColor('Absent', '#f44336'), fontSize: 13, fontWeight: '600' }}>
            Absent
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, getButtonStyle('Home', '#1976d2', '#bdbdbd')]}
          onPress={() => onMark(user.id, 'Home')}
        >
          <Text style={{ color: getTextColor('Home', '#1976d2'), fontSize: 13, fontWeight: '600' }}>
            Home
          </Text>
        </TouchableOpacity>
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
      const [plansData, usersData, attendanceData] = await Promise.all([
        getAllPlans(),
        getUsersWithMealPlans(),
        getAttendanceByDateAndMeal(dateStr, meal)
      ]);
      const hasMealPlans = plansData && plansData.length > 0;
      setUsers(hasMealPlans ? usersData : []);
      const map = {};
      attendanceData.forEach(a => { 
        map[a.userId] = a.status; 
      });
      setAttendance(map);
      console.log('Loaded attendance map:', map);
    } catch(e) {
      console.log('loadData error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData(selectedDate, mealType);
    }, [selectedDate, mealType, loadData])
  );

  const changeDate = (delta) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    newDate.setHours(0, 0, 0, 0);
    if (newDate > today) return;

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

    setShowLunch(newDateIsWeekend);
    loadData(newDate, newMeal);
  };

  const handlePrevDay = () => {
    changeDate(-1);
  };

  const handleNextDay = () => {
    changeDate(1);
  };

  const changeMeal = (meal) => {
    setMealType(meal);
  };

  const handleMark = async (userId, newStatus) => {
    const prevStatus = attendance[userId] || null;
    
    if (prevStatus === newStatus) return;

    setAttendance(prev => ({ ...prev, [userId]: newStatus }));

    setUsers(prev => prev.map(u => {
      if (u.id !== userId) return u;
      const wasDeducting = prevStatus === 'Present' || prevStatus === 'Absent';
      const willDeduct = newStatus === 'Present' || newStatus === 'Absent';
      let delta = 0;
      if (!wasDeducting && willDeduct) delta = -1;
      if (wasDeducting && !willDeduct) delta = +1;
      return { ...u, tokensRemaining: Math.max(0, u.tokensRemaining + delta) };
    }));

    try {
      if ((prevStatus === 'Present' || prevStatus === 'Absent') 
          && newStatus === 'Home') {
        await refundToken(userId);
      }
      await markAttendanceAndDeductToken(userId, dateStr, mealType, newStatus);
    } catch(e) {
      console.log('handleMark error:', e);
      Alert.alert('Error', 'Failed to save attendance. Please try again.');
      loadData(selectedDate, mealType);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.headerBg }]}>
        <Text style={styles.headerTitle}>Mark Attendance</Text>
        <Text style={styles.headerSubtitle}>Bulk attendance marking.</Text>
      </View>

      <View style={styles.dateSection}>
        <Text style={styles.label}>Date</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity onPress={handlePrevDay} style={styles.dateArrow} testID="back-date-arrow">
            <Ionicons name="chevron-back" size={24} color="#9e9e9e" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateDisplay}>
            <Ionicons name="calendar-outline" size={18} color="#757575" />
            <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNextDay} style={styles.dateArrow} disabled={isTodaySelected} testID="forward-date-arrow">
            <Ionicons name="chevron-forward" size={24} color="#9e9e9e" style={isTodaySelected ? { opacity: 0.3 } : {}} />
          </TouchableOpacity>
        </View>
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

      <View style={styles.mealSection}>
        <Text style={styles.label}>Meal Type</Text>
        {isWeekendDate(selectedDate) ? (
          <View style={styles.mealToggle}>
            <TouchableOpacity
              style={[styles.mealPill, mealType === 'Lunch' && { backgroundColor: theme.buttonBg, borderColor: theme.buttonBg }]}
              onPress={() => changeMeal('Lunch')}
            >
              <Text style={[styles.mealPillText, mealType === 'Lunch' && { color: '#fff' }]}>
                Lunch
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.mealPill, mealType === 'Dinner' && { backgroundColor: theme.buttonBg, borderColor: theme.buttonBg }]}
              onPress={() => changeMeal('Dinner')}
            >
              <Text style={[styles.mealPillText, mealType === 'Dinner' && { color: '#fff' }]}>
                Dinner
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.mealToggle}>
            <View style={[styles.mealPill, { backgroundColor: theme.buttonBg, borderColor: theme.buttonBg }]}>
              <Text style={[styles.mealPillText, { color: '#fff' }]}>
                Dinner
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionHeaderText}>Select Attendance ({users.length} users)</Text>
      </View>

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
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  dateSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8
  },
  label: {
    fontSize: 13,
    color: '#9e9e9e',
    marginBottom: 8
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  dateArrow: {
    padding: 8
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  dateText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#212121',
    marginLeft: 8
  },
  mealSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8
  },
  mealToggle: {
    flexDirection: 'row'
  },
  mealPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0e0e0',
    marginRight: 8
  },
  mealPillActive: {
    backgroundColor: '#1A237E',
    borderColor: '#1A237E'
  },
  mealPillText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500'
  },
  mealPillTextActive: {
    color: '#fff'
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#424242'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  emptyContainer: {
    flex: 1,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
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
  tokenText: {
    fontSize: 13,
    color: '#9e9e9e',
    marginTop: 2
  },
  tokenDeduction: {
    color: '#f44336'
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  button: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4
  }
});
