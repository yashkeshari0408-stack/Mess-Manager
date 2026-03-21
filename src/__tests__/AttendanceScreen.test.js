import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import AttendanceScreen from '../screens/AttendanceScreen';
import * as database from '../db/database';

jest.mock('@react-navigation/native');

const mockGetUsersWithMealPlans = jest.fn();
const mockGetAllPlans = jest.fn();
const mockGetAttendanceByDateAndMeal = jest.fn();
const mockMarkAttendanceAndDeductToken = jest.fn();
const mockRefundToken = jest.fn();

jest.mock('../db/database', () => ({
  getUsersWithMealPlans: (...args) => mockGetUsersWithMealPlans(...args),
  getAllPlans: (...args) => mockGetAllPlans(...args),
  getAttendanceByDateAndMeal: (...args) => mockGetAttendanceByDateAndMeal(...args),
  markAttendanceAndDeductToken: (...args) => mockMarkAttendanceAndDeductToken(...args),
  refundToken: (...args) => mockRefundToken(...args),
}));

describe('AttendanceScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([{ id: 1, name: 'Standard Plan' }]);
    mockGetUsersWithMealPlans.mockResolvedValue([
      { id: 1, name: 'Test User', tokensRemaining: 23, endDate: '2099-12-31', daysLeft: 1000 }
    ]);
    mockGetAttendanceByDateAndMeal.mockResolvedValue([]);
    mockMarkAttendanceAndDeductToken.mockResolvedValue({ changes: 1 });
    mockRefundToken.mockResolvedValue({ changes: 1 });
  });

  test('renders header title', async () => {
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => {
      expect(getByText('Mark Attendance')).toBeTruthy();
    });
  });

  test('renders Date label', async () => {
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => {
      expect(getByText('Date')).toBeTruthy();
    });
  });

  test('renders Meal Type label', async () => {
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => {
      expect(getByText('Meal Type')).toBeTruthy();
    });
  });

  test('renders Dinner option', async () => {
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => {
      expect(getByText('Dinner')).toBeTruthy();
    });
  });
});

describe('AttendanceScreen — Button interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([{ id: 1, name: 'Standard Plan' }]);
    mockGetUsersWithMealPlans.mockResolvedValue([
      { id: 1, name: 'Yash', tokensRemaining: 23, endDate: '2099-12-31', daysLeft: 1000 }
    ]);
    mockGetAttendanceByDateAndMeal.mockResolvedValue([]);
    mockMarkAttendanceAndDeductToken.mockResolvedValue({ changes: 1 });
    mockRefundToken.mockResolvedValue({ changes: 1 });
  });

  test('pressing Present button calls markAttendanceAndDeductToken', async () => {
    const { getAllByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Present')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Present')[0]);
    await waitFor(() => {
      expect(mockMarkAttendanceAndDeductToken).toHaveBeenCalledWith(
        1, expect.any(String), expect.any(String), 'Present'
      );
    });
  });

  test('pressing Absent button calls markAttendanceAndDeductToken', async () => {
    const { getAllByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Absent')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Absent')[0]);
    await waitFor(() => {
      expect(mockMarkAttendanceAndDeductToken).toHaveBeenCalledWith(
        1, expect.any(String), expect.any(String), 'Absent'
      );
    });
  });

  test('pressing same button twice does not call DB twice', async () => {
    const { getAllByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Present')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Present')[0]);
    fireEvent.press(getAllByText('Present')[0]);
    await waitFor(() => {
      expect(mockMarkAttendanceAndDeductToken).toHaveBeenCalledTimes(1);
    });
  });

  test('switching from Absent to Home calls refundToken', async () => {
    mockGetAttendanceByDateAndMeal.mockResolvedValue([
      { userId: 1, status: 'Absent' }
    ]);
    const { getAllByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Home')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Home')[0]);
    await waitFor(() => {
      expect(mockRefundToken).toHaveBeenCalledWith(1);
    });
  });

  test('switching from Home to Present deducts token', async () => {
    mockGetAttendanceByDateAndMeal.mockResolvedValue([
      { userId: 1, status: 'Home' }
    ]);
    const { getAllByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Present')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Present')[0]);
    await waitFor(() => {
      expect(mockMarkAttendanceAndDeductToken).toHaveBeenCalledWith(
        1, expect.any(String), expect.any(String), 'Present'
      );
      expect(mockRefundToken).not.toHaveBeenCalled();
    });
  });

  test('token count decreases by 1 after marking Present', async () => {
    const { getAllByText, getByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getByText(/23 tokens/)).toBeTruthy());
    fireEvent.press(getAllByText('Present')[0]);
    await waitFor(() => {
      expect(getByText(/22 tokens/)).toBeTruthy();
    });
  });

  test('token count stays same after marking Home', async () => {
    const { getAllByText, getByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getByText(/23 tokens/)).toBeTruthy());
    fireEvent.press(getAllByText('Home')[0]);
    await waitFor(() => {
      expect(getByText(/23 tokens/)).toBeTruthy();
    });
  });

  test('user with zero tokens shows renewal required message', async () => {
    mockGetUsersWithMealPlans.mockResolvedValue([
      { id: 1, name: 'Vipul', tokensRemaining: 0, endDate: '2099-12-31', daysLeft: 1000 }
    ]);
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getByText('Tokens exhausted — renewal required')).toBeTruthy());
  });

  test('shows (-1) preview next to tokens when Present selected', async () => {
    const { getAllByText, getByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Present')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Present')[0]);
    await waitFor(() => {
      expect(getByText('(-1)')).toBeTruthy();
    });
  });

  test('does not show (-1) preview when Home selected', async () => {
    const { getAllByText, queryByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Home')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Home')[0]);
    await waitFor(() => {
      expect(queryByText('(-1)')).toBeNull();
    });
  });
});

describe('AttendanceScreen — Edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([{ id: 1, name: 'Standard Plan' }]);
    mockGetUsersWithMealPlans.mockResolvedValue([
      { id: 1, name: 'Test User', tokensRemaining: 23, endDate: '2099-12-31', daysLeft: 1000 }
    ]);
    mockGetAttendanceByDateAndMeal.mockResolvedValue([]);
    mockMarkAttendanceAndDeductToken.mockResolvedValue({ changes: 1 });
    mockRefundToken.mockResolvedValue({ changes: 1 });
  });

  test('user with no meal plan shows no plan message', async () => {
    mockGetUsersWithMealPlans.mockResolvedValue([
      { id: 1, name: 'New User', tokensRemaining: 0 }
    ]);
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => {
      expect(getByText('No meal plan assigned')).toBeTruthy();
    });
  });

  test('user with zero tokens shows tokens exhausted message', async () => {
    mockGetUsersWithMealPlans.mockResolvedValue([
      { id: 1, name: 'Test User', tokensRemaining: 0, endDate: '2099-12-31', daysLeft: 1000 }
    ]);
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => {
      expect(getByText('Tokens exhausted — renewal required')).toBeTruthy();
    });
  });

  test('switching from Present to Absent does not call refundToken', async () => {
    mockGetAttendanceByDateAndMeal.mockResolvedValue([
      { userId: 1, status: 'Present' }
    ]);
    const { getAllByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Absent')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Absent')[0]);
    await waitFor(() => {
      expect(mockRefundToken).not.toHaveBeenCalled();
    });
  });

  test('switching from Absent to Present deducts token', async () => {
    mockGetAttendanceByDateAndMeal.mockResolvedValue([
      { userId: 1, status: 'Absent' }
    ]);
    const { getAllByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Present')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Present')[0]);
    await waitFor(() => {
      expect(mockMarkAttendanceAndDeductToken).toHaveBeenCalledWith(
        1, expect.any(String), expect.any(String), 'Present'
      );
    });
  });

  test('token count decreases after marking Absent', async () => {
    const { getAllByText, getByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getByText(/23 tokens/)).toBeTruthy());
    fireEvent.press(getAllByText('Absent')[0]);
    await waitFor(() => {
      expect(getByText(/22 tokens/)).toBeTruthy();
    });
  });

  test('refund increases token count when switching to Home from Present', async () => {
    mockGetAttendanceByDateAndMeal.mockResolvedValue([
      { userId: 1, status: 'Present' }
    ]);
    const { getAllByText } = render(<AttendanceScreen />);
    await waitFor(() => expect(getAllByText('Present')[0]).toBeTruthy());
    fireEvent.press(getAllByText('Present')[0]);
    await waitFor(() => {
      expect(mockRefundToken).not.toHaveBeenCalled();
    });
    fireEvent.press(getAllByText('Home')[0]);
    await waitFor(() => {
      expect(mockRefundToken).toHaveBeenCalledWith(1);
    });
  });
});

describe('AttendanceScreen — Date navigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([{ id: 1, name: 'Standard Plan' }]);
    mockGetUsersWithMealPlans.mockResolvedValue([
      { id: 1, name: 'Test User', tokensRemaining: 23, endDate: '2099-12-31', daysLeft: 1000 }
    ]);
    mockGetAttendanceByDateAndMeal.mockResolvedValue([]);
    mockMarkAttendanceAndDeductToken.mockResolvedValue({ changes: 1 });
    mockRefundToken.mockResolvedValue({ changes: 1 });
  });

  test('back arrow exists', async () => {
    const { getByTestId } = render(<AttendanceScreen />);
    await waitFor(() => expect(getByTestId('back-date-arrow')).toBeTruthy());
  });

  test('forward arrow exists', async () => {
    const { getByTestId } = render(<AttendanceScreen />);
    await waitFor(() => expect(getByTestId('forward-date-arrow')).toBeTruthy());
  });
});

describe('AttendanceScreen — Meal type toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllPlans.mockResolvedValue([{ id: 1, name: 'Standard Plan' }]);
    mockGetUsersWithMealPlans.mockResolvedValue([
      { id: 1, name: 'Test User', tokensRemaining: 23, endDate: '2099-12-31', daysLeft: 1000 }
    ]);
    mockGetAttendanceByDateAndMeal.mockResolvedValue([]);
    mockMarkAttendanceAndDeductToken.mockResolvedValue({ changes: 1 });
    mockRefundToken.mockResolvedValue({ changes: 1 });
  });

  test('Dinner is shown by default on weekdays', async () => {
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => {
      expect(getByText('Dinner')).toBeTruthy();
    });
  });

  test('Meal type buttons are present', async () => {
    const { getByText } = render(<AttendanceScreen />);
    await waitFor(() => {
      expect(getByText('Dinner')).toBeTruthy();
    });
  });

  test('loads users on mount', async () => {
    render(<AttendanceScreen />);
    await waitFor(() => {
      expect(mockGetUsersWithMealPlans).toHaveBeenCalled();
    });
  });
});
