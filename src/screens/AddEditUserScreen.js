import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { createUser, getUserById, updateUser, updateUserMealPlan, getAllPlans } from '../db/database';

const formatDisplayDate = (date) => {
  return date.toLocaleDateString('en-US', { 
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' 
  });
};

export default function AddEditUserScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const editingUserId = route.params?.userId ?? null;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [plans, setPlans] = useState([]);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [startDate, setStartDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    getAllPlans().then((data) => {
      setPlans(data);
      const defaultPlan = data.find(p => p.isDefault === 1);
      if (defaultPlan && !selectedPlanId) {
        setSelectedPlanId(defaultPlan.id);
      }
    });
  }, []);

  useEffect(() => {
    if (editingUserId) {
      getUserById(editingUserId).then((user) => {
        if (user) {
          setName(user.name || '');
          setPhone(user.phone || '');
          setNotes(user.notes || '');
          setSelectedPlanId(user.planId || null);
          if (user.startDate) {
            setStartDate(new Date(user.startDate));
          }
        }
      });
    }
  }, [editingUserId]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const onSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation', 'Name is required.');
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      notes: notes.trim(),
      planId: selectedPlanId,
      startDate: startDate.toISOString().split('T')[0]
    };

    try {
      if (editingUserId) {
        await updateUser(editingUserId, payload);
        await updateUserMealPlan(editingUserId, selectedPlanId);
      } else {
        await createUser(payload);
      }
      navigation.goBack();
    } catch (e) {
      console.log('Save user error', e);
      Alert.alert('Error', 'Failed to save user.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Full name"
      />

      <Text style={styles.label}>Phone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone number"
        keyboardType="phone-pad"
      />

      <Text style={styles.label}>Meal Plan</Text>
      {plans.map((plan) => (
        <TouchableOpacity 
          key={plan.id} 
          onPress={() => setSelectedPlanId(plan.id)}
          style={styles.radioRow}
        >
          <View style={[
            styles.radio, 
            selectedPlanId === plan.id && styles.radioSelected
          ]}>
            {selectedPlanId === plan.id && <View style={styles.radioDot} />}
          </View>
          <View>
            <Text style={styles.radioLabel}>{plan.name}</Text>
            <Text style={styles.radioSubLabel}>{plan.tokensCount} tokens • {plan.validityDays} days</Text>
          </View>
        </TouchableOpacity>
      ))}

      {!editingUserId && (
        <>
          <Text style={styles.label}>Plan Start Date</Text>
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#9e9e9e" />
            <Text style={styles.dateText}>{formatDisplayDate(startDate)}</Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </>
      )}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any notes"
        multiline
        numberOfLines={3}
      />

      <TouchableOpacity style={styles.button} onPress={onSave}>
        <Text style={styles.buttonText}>
          {editingUserId ? 'Update User' : 'Save User'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
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
    fontWeight: '500',
    color: '#212121'
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#fff'
  },
  multiline: {
    textAlignVertical: 'top',
    minHeight: 80
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#bdbdbd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center'
  },
  radioSelected: {
    borderColor: '#1A237E'
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1A237E'
  },
  radioLabel: {
    fontSize: 14,
    color: '#212121',
    fontWeight: '500'
  },
  radioSubLabel: {
    fontSize: 12,
    color: '#9e9e9e',
    marginTop: 2
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    marginTop: 8
  },
  dateText: {
    fontSize: 14,
    color: '#212121',
    marginLeft: 10
  },
  button: {
    marginTop: 24,
    backgroundColor: '#1A237E',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 40
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700'
  }
});
