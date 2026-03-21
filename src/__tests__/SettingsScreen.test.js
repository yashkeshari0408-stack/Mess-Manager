import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import SettingsScreen from '../screens/SettingsScreen';
import * as database from '../db/database';
import { Alert } from 'react-native';

jest.mock('@react-navigation/native');

const mockGetAllPlans = jest.fn();
const mockCreatePlan = jest.fn();
const mockUpdatePlan = jest.fn();
const mockDeletePlan = jest.fn();
const mockSetDefaultPlan = jest.fn();

jest.mock('../db/database', () => ({
  getAllPlans: (...args) => mockGetAllPlans(...args),
  createPlan: (...args) => mockCreatePlan(...args),
  updatePlan: (...args) => mockUpdatePlan(...args),
  deletePlan: (...args) => mockDeletePlan(...args),
  setDefaultPlan: (...args) => mockSetDefaultPlan(...args),
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetAllPlans.mockResolvedValue([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 }
    ]);
    mockCreatePlan.mockResolvedValue({ lastInsertRowId: 2 });
    mockUpdatePlan.mockResolvedValue({ changes: 1 });
    mockDeletePlan.mockResolvedValue({ changes: 1 });
    mockSetDefaultPlan.mockResolvedValue({ changes: 1 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders header title', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Settings')).toBeTruthy();
    });
  });

  test('renders section title', async () => {
    const { getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      expect(getByText('Meal Plans')).toBeTruthy();
    });
  });
});

describe('SettingsScreen — Add plan modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetAllPlans.mockResolvedValue([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 }
    ]);
    mockCreatePlan.mockResolvedValue({ lastInsertRowId: 2 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('pressing + button opens add plan modal', async () => {
    const { getByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      fireEvent.press(getByTestId('add-plan-button'));
    });
    await waitFor(() => {
      expect(getByTestId('add-plan-modal')).toBeTruthy();
    });
  });

  test('add plan validates empty name', async () => {
    const { getByTestId, getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      fireEvent.press(getByTestId('add-plan-button'));
    });
    await waitFor(() => {
      fireEvent.press(getByText('Save'));
    });
    expect(mockCreatePlan).not.toHaveBeenCalled();
  });

  test('successfully creates plan with valid data', async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(<SettingsScreen />);
    await waitFor(() => {
      fireEvent.press(getByTestId('add-plan-button'));
    });
    await waitFor(() => {
      fireEvent.changeText(
        getByPlaceholderText('e.g. Standard Plan'), 'New Plan'
      );
      fireEvent.changeText(getByPlaceholderText('38'), '50');
      fireEvent.changeText(getByPlaceholderText('40'), '45');
      fireEvent.press(getByText('Save'));
    });
    await waitFor(() => {
      expect(mockCreatePlan).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Plan',
          tokensCount: 50,
          validityDays: 45
        })
      );
    });
  });

  test('cancel button closes modal without saving', async () => {
    const { getByTestId, getByText, queryByTestId } = render(<SettingsScreen />);
    await waitFor(() => {
      fireEvent.press(getByTestId('add-plan-button'));
    });
    await waitFor(() => {
      fireEvent.press(getByText('Cancel'));
    });
    await waitFor(() => {
      expect(queryByTestId('add-plan-modal')).toBeNull();
      expect(mockCreatePlan).not.toHaveBeenCalled();
    });
  });
});

describe('SettingsScreen — Edit plan modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 },
      { id: 2, name: 'Premium Plan', tokensCount: 60, validityDays: 60, isDefault: 0 }
    ]);
    mockUpdatePlan.mockResolvedValue({ changes: 1 });
  });

  test('pressing Edit opens edit modal with prefilled data', async () => {
    const { getAllByText, getByDisplayValue } = render(<SettingsScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByText('Edit')[0]);
    });
    await waitFor(() => {
      expect(getByDisplayValue('Standard Plan')).toBeTruthy();
    });
  });

  test('editing plan calls updatePlan with new values', async () => {
    const { getAllByText, getByDisplayValue, getByText } = render(<SettingsScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByText('Edit')[0]);
    });
    await waitFor(() => {
      fireEvent.changeText(
        getByDisplayValue('Standard Plan'), 'Updated Plan'
      );
      fireEvent.press(getByText('Save'));
    });
    await waitFor(() => {
      expect(mockUpdatePlan).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ name: 'Updated Plan' })
      );
    });
  });
});

describe('SettingsScreen — Delete plan', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetAllPlans.mockResolvedValue([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 },
      { id: 2, name: 'Premium Plan', tokensCount: 60, validityDays: 60, isDefault: 0 }
    ]);
    mockDeletePlan.mockResolvedValue({ changes: 1 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('delete plan shows confirmation alert', async () => {
    const { getAllByText } = render(<SettingsScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByText('Delete')[0]);
    });
    expect(Alert.alert).toHaveBeenCalled();
  });

  test('confirming delete calls deletePlan', async () => {
    Alert.alert = jest.fn((title, message, buttons) => {
      const deleteButton = buttons.find(b => b.text === 'Delete');
      if (deleteButton) deleteButton.onPress();
    });
    const { getAllByText } = render(<SettingsScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByText('Delete')[0]);
    });
    await waitFor(() => {
      expect(mockDeletePlan).toHaveBeenCalledWith(2);
    });
  });
});
