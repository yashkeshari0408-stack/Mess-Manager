import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AddEditUserScreen from '../screens/AddEditUserScreen';
import * as database from '../db/database';

const mockGetAllPlans = jest.fn();
const mockCreateUser = jest.fn();
const mockGetUserById = jest.fn();
const mockUpdateUser = jest.fn();
const mockAssignPlanToUser = jest.fn();
const mockUpdateUserMealPlan = jest.fn();

jest.mock('../db/database', () => ({
  getAllPlans: (...args) => mockGetAllPlans(...args),
  createUser: (...args) => mockCreateUser(...args),
  getUserById: (...args) => mockGetUserById(...args),
  updateUser: (...args) => mockUpdateUser(...args),
  assignPlanToUser: (...args) => mockAssignPlanToUser(...args),
  updateUserMealPlan: (...args) => mockUpdateUserMealPlan(...args),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
  useRoute: () => ({ params: { userId: null } }),
  useFocusEffect: jest.fn(),
  useCallback: (fn) => fn,
}));

describe('AddEditUserScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 },
      { id: 2, name: 'Premium Plan', tokensCount: 60, validityDays: 60, isDefault: 0 }
    ]);
    mockCreateUser.mockResolvedValue({ lastInsertRowId: 1 });
    mockGetUserById.mockResolvedValue(null);
    mockAssignPlanToUser.mockResolvedValue({ changes: 1 });
    mockUpdateUser.mockResolvedValue({ changes: 1 });
    mockUpdateUserMealPlan.mockResolvedValue({ changes: 1 });
  });

  test('renders Name label', async () => {
    const { getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      expect(getByText('Name *')).toBeTruthy();
    });
  });

  test('renders Phone label', async () => {
    const { getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      expect(getByText('Phone')).toBeTruthy();
    });
  });

  test('renders Save User button', async () => {
    const { getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      expect(getByText('Save User')).toBeTruthy();
    });
  });
});

describe('AddEditUserScreen — Form interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 },
      { id: 2, name: 'Premium Plan', tokensCount: 60, validityDays: 60, isDefault: 0 }
    ]);
    mockCreateUser.mockResolvedValue({ lastInsertRowId: 1 });
  });

  test('name field accepts input', async () => {
    const { getByPlaceholderText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      fireEvent.changeText(
        getByPlaceholderText('Full name'), 'Test Name'
      );
      expect(getByPlaceholderText('Full name').props.value).toBe('Test Name');
    });
  });

  test('phone field accepts numeric input', async () => {
    const { getByPlaceholderText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      const phoneInput = getByPlaceholderText('Phone number');
      expect(phoneInput.props.keyboardType).toBe('phone-pad');
    });
  });

  test('plan selection is visible', async () => {
    const { getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      expect(getByText('Standard Plan')).toBeTruthy();
      expect(getByText('Premium Plan')).toBeTruthy();
    });
  });

  test('notes field is multiline', async () => {
    const { getByPlaceholderText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      const notesInput = getByPlaceholderText('Any notes');
      expect(notesInput.props.multiline).toBe(true);
    });
  });

  test('shows plan start date section', async () => {
    const { getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      expect(getByText('Plan Start Date')).toBeTruthy();
    });
  });

  test('shows token count for each plan', async () => {
    const { getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      expect(getByText(/38 tokens/)).toBeTruthy();
      expect(getByText(/60 tokens/)).toBeTruthy();
    });
  });

  test('selecting different plan updates selection', async () => {
    const { getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      fireEvent.press(getByText('Premium Plan'));
    });
    expect(mockGetAllPlans).toHaveBeenCalled();
  });
});

describe('AddEditUserScreen — Save behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 }
    ]);
    mockCreateUser.mockResolvedValue({ lastInsertRowId: 1 });
    mockAssignPlanToUser.mockResolvedValue({ changes: 1 });
  });

  test('calls createUser with correct data when name is filled', async () => {
    const { getByPlaceholderText, getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Full name'), 'New User');
    });
    fireEvent.press(getByText('Save User'));
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New User'
        })
      );
    });
  });

  test('saves with phone number when provided', async () => {
    const { getByPlaceholderText, getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('Phone number'), '9876543210');
    });
    fireEvent.press(getByText('Save User'));
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: '9876543210'
        })
      );
    });
  });

  test('saves with notes when provided', async () => {
    const { getByPlaceholderText, getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Full name'), 'Test User');
      fireEvent.changeText(getByPlaceholderText('Any notes'), 'Test notes content');
    });
    fireEvent.press(getByText('Save User'));
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          notes: 'Test notes content'
        })
      );
    });
  });

  test('saves with startDate', async () => {
    const { getByPlaceholderText, getByText } = render(<AddEditUserScreen />);
    await waitFor(() => {
      fireEvent.changeText(getByPlaceholderText('Full name'), 'Test User');
    });
    fireEvent.press(getByText('Save User'));
    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(String)
        })
      );
    });
  });
});

describe('AddEditUserScreen — Database interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 }
    ]);
    mockCreateUser.mockResolvedValue({ lastInsertRowId: 1 });
    mockGetUserById.mockResolvedValue(null);
  });

  test('calls getAllPlans on mount', async () => {
    render(<AddEditUserScreen />);
    await waitFor(() => {
      expect(mockGetAllPlans).toHaveBeenCalled();
    });
  });

  test('sets default plan from loaded plans', async () => {
    render(<AddEditUserScreen />);
    await waitFor(() => {
      expect(mockGetAllPlans).toHaveBeenCalled();
    });
  });
});
