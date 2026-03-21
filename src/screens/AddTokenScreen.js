import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { createToken } from '../db/database';
import DateTimePicker from '@react-native-community/datetimepicker';
import { formatDate } from '../utils/dateUtils';

const MEALS = ['breakfast', 'lunch', 'dinner'];

export default function AddTokenScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const userId = route.params?.userId;

  const [mealType, setMealType] = useState('breakfast');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [picking, setPicking] = useState('start'); // 'start' | 'end'

  const startStr = useMemo(() => formatDate(startDate), [startDate]);
  const endStr = useMemo(() => formatDate(endDate), [endDate]);

  const onSave = async () => {
    if (!userId) {
      Alert.alert('Error', 'Missing user.');
      return;
    }
    if (!mealType) {
      Alert.alert('Validation', 'Meal type is required.');
      return;
    }
    if (endStr < startStr) {
      Alert.alert('Validation', 'End date must be ≥ start date.');
      return;
    }

    try {
      await createToken({ userId, mealType, startDate: startStr, endDate: endStr });
      navigation.goBack();
    } catch (e) {
      console.log('Create token error', e);
      Alert.alert('Error', 'Failed to create token.');
    }
  };

  const openPicker = (which) => {
    setPicking(which);
    setShowPicker(true);
  };

  const onPick = (_, selected) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (!selected) return;
    if (picking === 'start') {
      setStartDate(selected);
      if (formatDate(selected) > endStr) {
        setEndDate(selected);
      }
    } else {
      setEndDate(selected);
    }
  };

  const renderMealButton = (meal) => {
    const selected = mealType === meal;
    return (
      <TouchableOpacity
        key={meal}
        style={[
          styles.mealButton,
          selected && styles.mealButtonSelected
        ]}
        onPress={() => setMealType(meal)}
      >
        <Text
          style={[
            styles.mealButtonText,
            selected && styles.mealButtonTextSelected
          ]}
        >
          {meal.toUpperCase()}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Meal Type</Text>
      <View style={styles.mealRow}>{MEALS.map(renderMealButton)}</View>

      <Text style={styles.label}>Start Date</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('start')}>
        <Text style={styles.dateButtonText}>{startStr}</Text>
      </TouchableOpacity>

      <Text style={styles.label}>End Date</Text>
      <TouchableOpacity style={styles.dateButton} onPress={() => openPicker('end')}>
        <Text style={styles.dateButtonText}>{endStr}</Text>
      </TouchableOpacity>

      {showPicker && (
        <DateTimePicker
          value={picking === 'start' ? startDate : endDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'default'}
          onChange={onPick}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>Save Token</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fafafa'
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    fontSize: 14,
    fontWeight: '500'
  },
  mealRow: {
    flexDirection: 'row'
  },
  mealButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#2196f3',
    borderRadius: 6,
    marginRight: 8,
    alignItems: 'center'
  },
  mealButtonSelected: {
    backgroundColor: '#2196f3'
  },
  mealButtonText: {
    color: '#2196f3',
    fontWeight: '600',
    fontSize: 12
  },
  mealButtonTextSelected: {
    color: '#fff'
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff'
  },
  dateButtonText: {
    fontSize: 14,
    color: '#111'
  },
  button: {
    marginTop: 24,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600'
  }
});

