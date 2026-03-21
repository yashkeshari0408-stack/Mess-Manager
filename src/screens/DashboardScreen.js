import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  getTodayAttendanceSummary,
  getTotalActiveUsers,
  getLowTokenUsers,
  getExpiringSoonUsers,
  getLastAttendanceMarkedInfo,
  getNotMarkedUsers,
  getExpiredPlanUsers
} from '../db/database';

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

const toDateString = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const isToday = (date) => {
  return toDateString(date) === toDateString(new Date());
};

const getTodayMealType = () => {
  const day = new Date().getDay();
  return (day === 0 || day === 6) ? 'Lunch' : 'Dinner';
};

const formatDisplayDate = (date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'long', month: 'long', day: 'numeric' 
  });
};

const formatLastMarkedTime = (createdAt) => {
  if (!createdAt) return null;
  const d = new Date(createdAt);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  const [viewDateStr, setViewDateStr] = useState(getTodayString());
  const [presentCount, setPresentCount] = useState(0);
  const [absentCount, setAbsentCount] = useState(0);
  const [homeCount, setHomeCount] = useState(0);
  const [markedCount, setMarkedCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [lowTokenUsers, setLowTokenUsers] = useState([]);
  const [expiringSoonUsers, setExpiringSoonUsers] = useState([]);
  const [expiredPlanUsers, setExpiredPlanUsers] = useState([]);
  const [lastMarkedInfo, setLastMarkedInfo] = useState(null);
  const [notMarkedUsers, setNotMarkedUsers] = useState([]);

  const loadAllData = useCallback(async (dateStr, meal) => {
    setLoading(true);
    try {
      const [summary, total, lowTokens, expiring, lastMarked, notMarked, expired] = 
        await Promise.all([
          getTodayAttendanceSummary(dateStr, meal),
          getTotalActiveUsers(),
          getLowTokenUsers(),
          getExpiringSoonUsers(dateStr),
          getLastAttendanceMarkedInfo(),
          getNotMarkedUsers(dateStr, meal),
          getExpiredPlanUsers(dateStr)
        ]);
      
      const s = summary[0] || {};
      setPresentCount(s.presentCount || 0);
      setAbsentCount(s.absentCount || 0);
      setHomeCount(s.homeCount || 0);
      setMarkedCount(s.markedCount || 0);
      setTotalUsers(total[0]?.total || 0);
      setLowTokenUsers(lowTokens);
      setExpiringSoonUsers(expiring);
      setExpiredPlanUsers(expired);
      setLastMarkedInfo(lastMarked[0] || null);
      setNotMarkedUsers(notMarked);
      console.log('Dashboard loaded:', dateStr, meal, s);
    } catch(e) {
      console.log('Dashboard loadAllData error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      setViewDate(today);
      loadAllData(toDateString(today), getTodayMealType());
    }, [])
  );

  const handlePrevDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() - 1);
    setViewDate(newDate);
    const dateStr = newDate.toISOString().split('T')[0];
    setViewDateStr(dateStr);
    const meal = getTodayMealType();
    loadAllData(dateStr, meal);
  };

  const handleNextDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(newDate);
    checkDate.setHours(0, 0, 0, 0);
    if (checkDate > today) return;
    setViewDate(newDate);
    const dateStr = newDate.toISOString().split('T')[0];
    setViewDateStr(dateStr);
    const meal = getTodayMealType();
    loadAllData(dateStr, meal);
  };

  const isTodayViewed = isToday(viewDate);

  const getMealContext = () => {
    const day = viewDate.getDay();
    const isWeekend = day === 0 || day === 6;
    return isWeekend ? 'Lunch & Dinner Attendance' : 'Dinner Attendance';
  };

  const getMealBadgeText = () => {
    const day = viewDate.getDay();
    return (day === 0 || day === 6) ? 'Lunch & Dinner' : 'Dinner';
  };

  const notMarkedCount = Math.max(0, totalUsers - markedCount);

  const renderAlertsSection = () => {
    const hasLowTokens = lowTokenUsers.length > 0;
    const hasExpiringSoon = expiringSoonUsers.length > 0;
    const hasExpiredPlans = expiredPlanUsers.length > 0;
    const totalAlerts = lowTokenUsers.length + expiringSoonUsers.length + expiredPlanUsers.length;

    return (
      <View style={styles.alertsSection}>
        <View style={styles.alertsHeader}>
          <Ionicons name="warning-outline" size={18} color="#ff9800" />
          <Text style={styles.alertsHeaderText}>Alerts</Text>
          <View style={styles.alertsSpacer} />
          {totalAlerts > 0 && (
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{totalAlerts}</Text>
            </View>
          )}
        </View>

        {hasLowTokens && (
          <View style={styles.alertCard}>
            <View style={styles.alertTitleRow}>
              <Ionicons name="alert-circle-outline" size={15} color="#f44336" />
              <Text style={styles.alertCardTitle}>Low Tokens</Text>
            </View>
            {lowTokenUsers.map((user, index) => (
              <View
                key={index}
                style={[
                  styles.alertRow,
                  index === lowTokenUsers.length - 1 && styles.alertRowLast
                ]}
              >
                <Text style={styles.alertName}>{user.name}</Text>
                <Text style={styles.alertValue}>{user.tokensRemaining} tokens left</Text>
              </View>
            ))}
          </View>
        )}

        {hasExpiringSoon && (
          <View style={[styles.alertCard, styles.expiringCard]}>
            <View style={styles.alertTitleRow}>
              <Ionicons name="time-outline" size={15} color="#ff9800" />
              <Text style={[styles.alertCardTitle, { color: '#ff9800' }]}>Expiring Soon</Text>
            </View>
            {expiringSoonUsers.map((user, index) => (
              <View
                key={index}
                style={[
                  styles.alertRow,
                  index === expiringSoonUsers.length - 1 && styles.expiringRowLast
                ]}
              >
                <Text style={styles.alertName}>{user.name}</Text>
                <Text style={styles.alertExpiry}>Expires in {user.daysLeft} days</Text>
              </View>
            ))}
          </View>
        )}

        {hasExpiredPlans && (
          <View style={[styles.alertCard, styles.expiredCard]}>
            <View style={styles.alertTitleRow}>
              <Ionicons name="close-circle-outline" size={15} color="#f44336" />
              <Text style={[styles.alertCardTitle, { color: '#f44336' }]}>Expired Plans</Text>
            </View>
            {expiredPlanUsers.map((user, index) => (
              <View key={index} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 8,
                borderBottomWidth: index < expiredPlanUsers.length - 1 
                  ? 0.5 : 0,
                borderColor: '#fde8e8'
              }}>
                <Text style={{ 
                  fontSize: 14, 
                  color: '#212121', 
                  fontWeight: '500' 
                }}>
                  {user.name}
                </Text>
                <Text style={{ fontSize: 13, color: '#f44336' }}>
                  {user.tokensRemaining <= 0 
                    ? 'Tokens exhausted' 
                    : 'Plan expired'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!hasLowTokens && !hasExpiringSoon && !hasExpiredPlans && notMarkedUsers.length === 0 && (
          <View style={styles.allClear}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#4caf50" />
            <Text style={styles.allClearText}> All clear for today!</Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Image source={require('../../assets/icon.png')} style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Suparna's Kitchen</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00897B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../../assets/icon.png')} style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Suparna's Kitchen</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: '#fff',
          borderBottomWidth: 1,
          borderColor: '#f0f0f0'
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(viewDate);
                newDate.setDate(newDate.getDate() - 1);
                setViewDate(newDate);
                loadAllData(toDateString(newDate), getTodayMealType());
              }}
              style={{ padding: 4, marginRight: 8 }}
            >
              <Ionicons name="chevron-back" size={18} color="#555" />
            </TouchableOpacity>

            <Text style={{ fontSize: 13, fontWeight: '600', color: '#212121' }}>
              {isTodayViewed 
                ? 'Today — ' + formatDisplayDate(viewDate)
                : formatDisplayDate(viewDate)
              }
            </Text>

            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(viewDate);
                newDate.setDate(newDate.getDate() + 1);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                newDate.setHours(0, 0, 0, 0);
                if (newDate > today) return;
                setViewDate(newDate);
                loadAllData(toDateString(newDate), getTodayMealType());
              }}
              style={{ 
                padding: 4, 
                marginLeft: 8,
                opacity: isTodayViewed ? 0.3 : 1 
              }}
              disabled={isTodayViewed}
            >
              <Ionicons name="chevron-forward" size={18} color="#555" />
            </TouchableOpacity>
          </View>

          <View style={{
            backgroundColor: '#E8EAF6',
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: 20
          }}>
            <Text style={{ fontSize: 12, color: '#1A237E', fontWeight: '600' }}>
              {getTodayMealType()}
            </Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>{isTodayViewed ? `${getTodayMealType()} Attendance` : `${getTodayMealType()} Attendance — ${formatDisplayDate(viewDate)}`}</Text>
          <View style={styles.statsCard}>
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Present</Text>
                <Text style={[styles.statNumber, { color: '#4caf50' }]}>
                  {presentCount}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Absent</Text>
                <Text style={[styles.statNumber, { color: '#f44336' }]}>
                  {absentCount}
                </Text>
              </View>
            </View>
            <View style={styles.statsDivider} />
            <View style={styles.statsRow}>
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Home</Text>
                <Text style={[styles.statNumber, { color: '#1976d2' }]}>
                  {homeCount}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCell}>
                <Text style={styles.statLabel}>Not Marked</Text>
                <Text style={[styles.statNumber, { color: '#ff9800' }]}>
                  {notMarkedCount}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {lastMarkedInfo && (
          <View style={styles.lastMarkedInfo}>
            <Ionicons name="checkmark-circle-outline" size={14} color="#4caf50" />
            <Text style={styles.lastMarkedText}>
              Last marked: {lastMarkedInfo.mealType}, today at {formatLastMarkedTime(lastMarkedInfo.createdAt)}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.markButton, notMarkedCount === 0 && totalUsers > 0 && styles.markButtonComplete]}
          onPress={() => navigation.navigate('Attendance')}
          testID="mark-attendance-button"
        >
          <Ionicons 
            name={notMarkedCount === 0 && totalUsers > 0 ? "checkmark-circle" : "calendar-outline"} 
            size={20} 
            color="#fff" 
          />
          <Text style={styles.markButtonText}>
            {notMarkedCount === 0 && totalUsers > 0 ? 'All Attendance Marked' : 'Mark Today Attendance'}
          </Text>
        </TouchableOpacity>

        {notMarkedUsers.length > 0 && (
          <View style={styles.notMarkedSection}>
            <View style={styles.notMarkedCard}>
              <View style={styles.notMarkedTitleRow}>
                <Ionicons name="person-outline" size={15} color="#ff9800" />
                <Text style={styles.notMarkedTitle}>Not Marked Yet</Text>
                <View style={styles.notMarkedSpacer} />
                <View style={styles.notMarkedBadge}>
                  <Text style={styles.notMarkedBadgeText}>{notMarkedUsers.length} users</Text>
                </View>
              </View>
              {notMarkedUsers.map((user, index) => (
                <View key={index} style={styles.notMarkedRow}>
                  <Ionicons name="ellipse" size={6} color="#ff9800" />
                  <Text style={styles.notMarkedName}>{user.name}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {renderAlertsSection()}

        <View style={{
          alignItems: 'center',
          paddingVertical: 24,
          paddingBottom: 8
        }}>
          <Text style={{
            fontSize: 12,
            color: '#bdbdbd',
            letterSpacing: 0.5
          }}>
            Made with ♥ by Yash
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa'
  },
  header: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
    flexDirection: 'row',
    alignItems: 'center'
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 12
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    paddingBottom: 100
  },
  contextBar: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  dateArrow: {
    padding: 8
  },
  dateCenter: {
    alignItems: 'center'
  },
  contextDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121'
  },
  todayLabel: {
    fontSize: 10,
    color: '#4caf50',
    fontWeight: '600',
    marginTop: 2
  },
  mealBadgeRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#f0f0f0'
  },
  mealBadge: {
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'center'
  },
  mealBadgeText: {
    fontSize: 12,
    color: '#ec407a',
    fontWeight: '600'
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12
  },
  statsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2
  },
  statsRow: {
    flexDirection: 'row'
  },
  statsDivider: {
    height: 1,
    backgroundColor: '#f5f5f5'
  },
  statCell: {
    flex: 1,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center'
  },
  statDivider: {
    width: 1,
    backgroundColor: '#f5f5f5'
  },
  statLabel: {
    fontSize: 12,
    color: '#9e9e9e',
    marginBottom: 6,
    fontWeight: '500'
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700'
  },
  lastMarkedInfo: {
    marginHorizontal: 16,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center'
  },
  lastMarkedText: {
    fontSize: 12,
    color: '#9e9e9e',
    marginLeft: 4
  },
  markButton: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#1A237E',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  markButtonComplete: {
    backgroundColor: '#4caf50'
  },
  markButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8
  },
  notMarkedSection: {
    marginHorizontal: 16,
    marginTop: 20
  },
  notMarkedCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fff3e0',
    padding: 12
  },
  notMarkedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  notMarkedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ff9800',
    marginLeft: 4
  },
  notMarkedSpacer: {
    flex: 1
  },
  notMarkedBadge: {
    backgroundColor: '#fff3e0',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  notMarkedBadgeText: {
    fontSize: 11,
    color: '#ff9800',
    fontWeight: '600'
  },
  notMarkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6
  },
  notMarkedName: {
    fontSize: 14,
    color: '#212121',
    marginLeft: 8
  },
  alertsSection: {
    marginHorizontal: 16,
    marginTop: 16
  },
  alertsHeader: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  alertsHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121',
    marginLeft: 6
  },
  alertsSpacer: {
    flex: 1
  },
  alertBadge: {
    backgroundColor: '#fde8e8',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  alertBadgeText: {
    fontSize: 11,
    color: '#f44336',
    fontWeight: '600'
  },
  alertCard: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde8e8',
    padding: 12
  },
  expiringCard: {
    borderColor: '#fff3e0'
  },
  expiredCard: {
    borderColor: '#fde8e8'
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  alertCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#f44336',
    marginLeft: 4
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderColor: '#fde8e8'
  },
  alertRowLast: {
    borderBottomWidth: 0
  },
  expiringRowLast: {
    borderColor: '#fff3e0'
  },
  alertName: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500'
  },
  alertValue: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600'
  },
  alertExpiry: {
    fontSize: 13,
    color: '#ff9800'
  },
  allClear: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center'
  },
  allClearText: {
    fontSize: 13,
    color: '#9e9e9e'
  }
});
