import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import UserListScreen from '../screens/UserListScreen';
import * as database from '../db/database';
import { Alert } from 'react-native';

jest.mock('@react-navigation/native');

const mockGetUsersWithTokenInfo = jest.fn();
const mockDeleteUser = jest.fn();
const mockGetUserAttendanceExceptions = jest.fn();

jest.mock('../db/database', () => ({
  getUsersWithTokenInfo: (...args) => mockGetUsersWithTokenInfo(...args),
  deleteUser: (...args) => mockDeleteUser(...args),
  getUserAttendanceExceptions: (...args) => mockGetUserAttendanceExceptions(...args),
}));

describe('UserListScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetUsersWithTokenInfo.mockResolvedValue([
      { id: 1, name: 'Yash', tokensRemaining: 30, daysLeft: 20, endDate: '2026-04-10' }
    ]);
    mockDeleteUser.mockResolvedValue({ changes: 1 });
    mockGetUserAttendanceExceptions.mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('renders header title', async () => {
    const { getByText } = render(<UserListScreen />);
    await waitFor(() => {
      expect(getByText('Users')).toBeTruthy();
    });
  });

  test('renders add user button', async () => {
    const { getByText } = render(<UserListScreen />);
    await waitFor(() => {
      expect(getByText(/members/)).toBeTruthy();
    });
  });

  test('renders search placeholder', async () => {
    const { getByPlaceholderText } = render(<UserListScreen />);
    await waitFor(() => {
      expect(getByPlaceholderText('Search users...')).toBeTruthy();
    });
  });
});

describe('UserListScreen — Delete user', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockGetUsersWithTokenInfo.mockResolvedValue([
      { id: 1, name: 'Yash', tokensRemaining: 30, daysLeft: 20, endDate: '2026-04-10' }
    ]);
    mockDeleteUser.mockResolvedValue({ changes: 1 });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('delete icon exists on each card', async () => {
    const { getAllByTestId } = render(<UserListScreen />);
    await waitFor(() => {
      const deleteButtons = getAllByTestId('delete-button');
      expect(deleteButtons).toHaveLength(1);
    });
  });

  test('pressing delete shows confirmation alert', async () => {
    const { getAllByTestId } = render(<UserListScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByTestId('delete-button')[0]);
    });
    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete User',
      expect.stringContaining('Are you sure'),
      expect.any(Array)
    );
  });

  test('confirming delete calls deleteUser', async () => {
    Alert.alert = jest.fn((title, message, buttons) => {
      const deleteButton = buttons.find(b => b.text === 'Delete');
      if (deleteButton) deleteButton.onPress();
    });
    const { getAllByTestId } = render(<UserListScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByTestId('delete-button')[0]);
    });
    await waitFor(() => {
      expect(mockDeleteUser).toHaveBeenCalled();
    });
  });

  test('cancelling delete does NOT call deleteUser', async () => {
    jest.restoreAllMocks();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((title, message, buttons) => {
      const cancelButton = buttons.find(b => b.text === 'Cancel');
      if (cancelButton && cancelButton.onPress) cancelButton.onPress();
    });
    const { getAllByTestId } = render(<UserListScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByTestId('delete-button')[0]);
    });
    expect(mockDeleteUser).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });
});

describe('UserListScreen — User detail modal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUsersWithTokenInfo.mockResolvedValue([
      { id: 1, name: 'Yash', tokensRemaining: 30, daysLeft: 20, endDate: '2026-04-10' }
    ]);
    mockGetUserAttendanceExceptions.mockResolvedValue([]);
  });

  test('tapping card opens modal', async () => {
    const { getAllByTestId, getByTestId } = render(<UserListScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByTestId('user-card')[0]);
    });
    await waitFor(() => {
      expect(getByTestId('user-detail-modal')).toBeTruthy();
    });
  });

  test('modal shows user name', async () => {
    const { getAllByTestId, getAllByText } = render(<UserListScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByTestId('user-card')[0]);
    });
    await waitFor(() => {
      expect(getAllByText('Yash').length).toBeGreaterThan(0);
    });
  });

  test('modal shows no exceptions message when history is empty', async () => {
    mockGetUserAttendanceExceptions.mockResolvedValue([]);
    const { getAllByTestId, getByText } = render(<UserListScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByTestId('user-card')[0]);
    });
    await waitFor(() => {
      expect(getByText('No absences or home markings')).toBeTruthy();
    });
  });

  test('modal shows absent and home history', async () => {
    mockGetUserAttendanceExceptions.mockResolvedValue([
      { date: '2026-03-19', mealType: 'Dinner', status: 'Absent' },
      { date: '2026-03-18', mealType: 'Dinner', status: 'Home' }
    ]);
    const { getAllByTestId, getByText } = render(<UserListScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByTestId('user-card')[0]);
    });
    await waitFor(() => {
      expect(getByText('Absent')).toBeTruthy();
      expect(getByText('Home')).toBeTruthy();
    });
  });

  test('close button dismisses modal', async () => {
    const { getAllByTestId, getByTestId, queryByTestId } = render(<UserListScreen />);
    await waitFor(() => {
      fireEvent.press(getAllByTestId('user-card')[0]);
    });
    await waitFor(() => {
      fireEvent.press(getByTestId('close-modal-button'));
    });
    await waitFor(() => {
      expect(queryByTestId('user-detail-modal')).toBeNull();
    });
  });
});

describe('UserListScreen — Expiry colors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows expiry info for user with days left', async () => {
    mockGetUsersWithTokenInfo.mockResolvedValue([
      { id: 1, name: 'Yash', tokensRemaining: 30, daysLeft: 20, endDate: '2026-04-10' }
    ]);
    const { getByText } = render(<UserListScreen />);
    await waitFor(() => {
      expect(getByText(/Expires in 20 days/)).toBeTruthy();
    });
  });

  test('shows no plan text when endDate is null', async () => {
    mockGetUsersWithTokenInfo.mockResolvedValue([
      { id: 1, name: 'New User', tokensRemaining: 0, daysLeft: null, endDate: null }
    ]);
    const { getByText } = render(<UserListScreen />);
    await waitFor(() => {
      expect(getByText('No plan assigned')).toBeTruthy();
    });
  });
});
