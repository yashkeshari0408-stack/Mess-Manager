import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getAllPlans,
  createPlan,
  updatePlan,
  deletePlan,
  setDefaultPlan,
  getUsersCountByPlan
} from '../db/database';

export default function SettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planName, setPlanName] = useState('');
  const [tokensCount, setTokensCount] = useState('');
  const [validityDays, setValidityDays] = useState('');
  const [isDefaultChecked, setIsDefaultChecked] = useState(false);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllPlans();
      setPlans(data);
    } catch (error) {
      console.error('Failed to load plans:', error);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlans();
    }, [loadPlans])
  );

  const resetForm = () => {
    setPlanName('');
    setTokensCount('');
    setValidityDays('');
    setIsDefaultChecked(false);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const handleOpenEditModal = (plan) => {
    setEditingPlan(plan);
    setPlanName(plan.name);
    setTokensCount(String(plan.tokensCount));
    setValidityDays(String(plan.validityDays));
    setShowEditModal(true);
  };

  const handleSaveAdd = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Plan name is required');
      return;
    }
    const tokens = parseInt(tokensCount, 10);
    const validity = parseInt(validityDays, 10);
    if (!tokens || tokens <= 0) {
      Alert.alert('Error', 'Valid token count is required');
      return;
    }
    if (!validity || validity <= 0) {
      Alert.alert('Error', 'Valid validity days is required');
      return;
    }
    try {
      await createPlan({ name: planName.trim(), tokensCount: tokens, validityDays: validity, isDefault: isDefaultChecked });
      await loadPlans();
      setShowAddModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to create plan');
    }
  };

  const handleSaveEdit = async () => {
    if (!planName.trim()) {
      Alert.alert('Error', 'Plan name is required');
      return;
    }
    const tokens = parseInt(tokensCount, 10);
    const validity = parseInt(validityDays, 10);
    if (!tokens || tokens <= 0) {
      Alert.alert('Error', 'Valid token count is required');
      return;
    }
    if (!validity || validity <= 0) {
      Alert.alert('Error', 'Valid validity days is required');
      return;
    }
    try {
      await updatePlan(editingPlan.id, { name: planName.trim(), tokensCount: tokens, validityDays: validity });
      await loadPlans();
      setShowEditModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update plan');
    }
  };

  const handleSetDefault = async (planId) => {
    try {
      await setDefaultPlan(planId);
      await loadPlans();
    } catch (error) {
      Alert.alert('Error', 'Failed to set default plan');
    }
  };

  const handleDelete = async (plan) => {
    if (plans.length <= 1) {
      Alert.alert('Error', 'Cannot delete the only plan');
      return;
    }
    try {
      const userCount = await getUsersCountByPlan(plan.id);
      if (userCount > 0) {
        Alert.alert(
          'Cannot Delete Plan',
          `This plan cannot be deleted because ${userCount} user${userCount > 1 ? 's are' : ' is'} assigned to it. Please reassign or remove the user${userCount > 1 ? 's' : ''} first.`
        );
        return;
      }
    } catch (error) {
      console.error('Failed to check user count:', error);
    }
    Alert.alert(
      'Delete Plan',
      `Are you sure you want to delete "${plan.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlan(plan.id);
              await loadPlans();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete plan');
            }
          }
        }
      ]
    );
  };

  const renderPlanCard = (plan) => (
    <View key={plan.id} style={[styles.planCard, plan.isDefault ? styles.planCardDefault : null]}>
      <View style={styles.planCardRow1}>
        <Text style={styles.planName}>{plan.name}</Text>
        {plan.isDefault === 1 && (
          <View style={styles.defaultBadge}>
            <Text style={styles.defaultBadgeText}>Default</Text>
          </View>
        )}
      </View>
      <View style={styles.planCardRow2}>
        <Text style={styles.planStat}>{plan.tokensCount} tokens</Text>
        <Text style={styles.planStat}>{plan.validityDays} days validity</Text>
      </View>
      <View style={styles.planCardRow3}>
        {!plan.isDefault && (
          <TouchableOpacity
            style={styles.setDefaultButton}
            onPress={() => handleSetDefault(plan.id)}
          >
            <Text style={styles.setDefaultText}>Set as Default</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleOpenEditModal(plan)}
        >
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
        {!plan.isDefault && plans.length > 1 && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(plan)}
          >
            <Text style={styles.deleteText}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderModal = (isEdit) => (
    <Modal
      visible={isEdit ? showEditModal : showAddModal}
      transparent
      animationType="fade"
      onRequestClose={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
      testID={isEdit ? 'edit-plan-modal' : 'add-plan-modal'}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{isEdit ? 'Edit Plan' : 'New Meal Plan'}</Text>
          
          <View>
            <Text style={styles.inputLabel}>Plan Name</Text>
            <TextInput
              style={styles.inputField}
              placeholder="e.g. Standard Plan"
              placeholderTextColor="#9e9e9e"
              value={planName}
              onChangeText={setPlanName}
            />
          </View>
          
          <View>
            <Text style={styles.inputLabel}>Tokens per Plan</Text>
            <TextInput
              style={styles.inputField}
              placeholder="38"
              placeholderTextColor="#9e9e9e"
              value={tokensCount}
              onChangeText={setTokensCount}
              keyboardType="numeric"
            />
          </View>
          
          <View>
            <Text style={styles.inputLabel}>Validity (days)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="40"
              placeholderTextColor="#9e9e9e"
              value={validityDays}
              onChangeText={setValidityDays}
              keyboardType="numeric"
            />
          </View>

          {!isEdit && (
            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setIsDefaultChecked(!isDefaultChecked)}
            >
              <View style={[styles.checkbox, isDefaultChecked && styles.checkboxChecked]}>
                {isDefaultChecked && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={styles.checkboxLabel}>Set as default plan</Text>
            </TouchableOpacity>
          )}

          <View style={styles.modalButtonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => isEdit ? setShowEditModal(false) : setShowAddModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={isEdit ? handleSaveEdit : handleSaveAdd}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Manage meal plans & app config</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ec407a" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSubtitle}>Manage meal plans & app config</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Meal Plans</Text>
          <TouchableOpacity onPress={handleOpenAddModal} testID="add-plan-button">
            <Ionicons name="add-circle-outline" size={24} color="#ec407a" />
          </TouchableOpacity>
        </View>

        {plans.map(renderPlanCard)}

        {renderModal(false)}
        {renderModal(true)}

        <View style={{
          marginHorizontal: 16,
          marginTop: 32,
          marginBottom: 8
        }}>
          <Text style={{
            fontSize: 15,
            fontWeight: '700',
            color: '#212121',
            marginBottom: 12
          }}>
            About Developer
          </Text>

          <View style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            borderWidth: 1,
            borderColor: '#f0f0f0',
            padding: 16
          }}>
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16
            }}>
              <View style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: '#E8EAF6',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <Text style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: '#1A237E'
                }}>
                  Y
                </Text>
              </View>
              <View>
                <Text style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: '#212121'
                }}>
                  Yash
                </Text>
                <Text style={{
                  fontSize: 12,
                  color: '#9e9e9e',
                  marginTop: 2
                }}>
                  Developer & Designer
                </Text>
              </View>
            </View>

            <View style={{
              height: 1,
              backgroundColor: '#f5f5f5',
              marginBottom: 12
            }}/>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10
              }}
              onPress={() => Linking.openURL('tel:+918696691357')}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#e8f5e9',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <Ionicons name="call-outline" size={16} color="#4caf50" />
              </View>
              <View>
                <Text style={{ fontSize: 11, color: '#9e9e9e' }}>
                  Phone
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  color: '#212121', 
                  fontWeight: '500' 
                }}>
                  +91 86966 91357
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={16} color="#bdbdbd" />
            </TouchableOpacity>

            <View style={{
              height: 1,
              backgroundColor: '#f5f5f5',
              marginVertical: 2
            }}/>

            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 10
              }}
              onPress={() => Linking.openURL('mailto:yashkeshari0408@gmail.com')}
            >
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#E8EAF6',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <Ionicons name="mail-outline" size={16} color="#e91e63" />
              </View>
              <View>
                <Text style={{ fontSize: 11, color: '#9e9e9e' }}>
                  Email
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  color: '#212121', 
                  fontWeight: '500' 
                }}>
                  yashkeshari0408@gmail.com
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              <Ionicons name="chevron-forward" size={16} color="#bdbdbd" />
            </TouchableOpacity>

            <View style={{
              height: 1,
              backgroundColor: '#f5f5f5',
              marginVertical: 2
            }}/>

            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 10
            }}>
              <View style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: '#e3f2fd',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12
              }}>
                <Ionicons 
                  name="information-circle-outline" 
                  size={16} 
                  color="#1976d2" 
                />
              </View>
              <View>
                <Text style={{ fontSize: 11, color: '#9e9e9e' }}>
                  App Version
                </Text>
                <Text style={{ 
                  fontSize: 14, 
                  color: '#212121', 
                  fontWeight: '500' 
                }}>
                  v1.0.0
                </Text>
              </View>
            </View>

          </View>
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    paddingBottom: 100
  },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121'
  },
  planCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1
  },
  planCardDefault: {
    borderColor: '#1A237E'
  },
  planCardRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#212121'
  },
  defaultBadge: {
    backgroundColor: '#E8EAF6',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  defaultBadgeText: {
    fontSize: 11,
    color: '#1A237E',
    fontWeight: '600'
  },
  planCardRow2: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 16
  },
  planStat: {
    fontSize: 13,
    color: '#9e9e9e'
  },
  planCardRow3: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8
  },
  setDefaultButton: {
    borderWidth: 1,
    borderColor: '#1A237E',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  setDefaultText: {
    fontSize: 12,
    color: '#1A237E'
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  editText: {
    fontSize: 12,
    color: '#757575'
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: '#fde8e8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  deleteText: {
    fontSize: 12,
    color: '#f44336'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 24,
    width: '85%'
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 20
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9e9e9e',
    marginBottom: 6,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#212121',
    backgroundColor: '#fafafa',
    marginBottom: 14
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#bdbdbd'
  },
  checkboxChecked: {
    backgroundColor: '#1A237E',
    borderColor: '#1A237E'
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#212121',
    marginLeft: 8
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bdbdbd',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  cancelButtonText: {
    color: '#757575'
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#1A237E',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600'
  }
});
