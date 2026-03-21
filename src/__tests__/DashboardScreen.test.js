import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import DashboardScreen from '../screens/DashboardScreen';

const mockGetTodayAttendanceSummary = jest.fn();
const mockGetTotalActiveUsers = jest.fn();
const mockGetLowTokenUsers = jest.fn();
const mockGetExpiringSoonUsers = jest.fn();
const mockGetLastAttendanceMarkedInfo = jest.fn();
const mockGetNotMarkedUsers = jest.fn();

jest.mock('../db/database', () => ({
  getTodayAttendanceSummary: (...args) => mockGetTodayAttendanceSummary(...args),
  getTotalActiveUsers: (...args) => mockGetTotalActiveUsers(...args),
  getLowTokenUsers: (...args) => mockGetLowTokenUsers(...args),
  getExpiringSoonUsers: (...args) => mockGetExpiringSoonUsers(...args),
  getLastAttendanceMarkedInfo: (...args) => mockGetLastAttendanceMarkedInfo(...args),
  getNotMarkedUsers: (...args) => mockGetNotMarkedUsers(...args),
}));

jest.mock('@react-navigation/native');

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetTodayAttendanceSummary.mockResolvedValue([{
      presentCount: 0, absentCount: 0, homeCount: 0, markedCount: 0
    }]);
    mockGetTotalActiveUsers.mockResolvedValue([{ total: 0 }]);
    mockGetLowTokenUsers.mockResolvedValue([]);
    mockGetExpiringSoonUsers.mockResolvedValue([]);
    mockGetLastAttendanceMarkedInfo.mockResolvedValue([]);
    mockGetNotMarkedUsers.mockResolvedValue([]);
  });

  test('renders app name', async () => {
    const { getByText } = render(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText("Suparna's Kitchen")).toBeTruthy();
    });
  });

  test('renders app title', async () => {
    const { getByText } = render(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText("Suparna's Kitchen")).toBeTruthy();
    });
  });

  test('renders Mark Attendance button', async () => {
    const { getByText } = render(<DashboardScreen />);
    await waitFor(() => {
      expect(getByText('Mark Today Attendance')).toBeTruthy();
    });
  });
});
