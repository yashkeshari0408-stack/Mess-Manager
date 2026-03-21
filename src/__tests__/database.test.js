import * as db from '../db/database';

const mockDb = () => global.__expoSqliteMockDb;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('initDatabase', () => {
  test('creates all required tables', async () => {
    mockDb().execAsync.mockResolvedValueOnce(true);
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    mockDb().runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });
    await db.initDatabase();
    expect(mockDb().execAsync).toHaveBeenCalled();
    const call = mockDb().execAsync.mock.calls[0][0];
    expect(call).toContain('CREATE TABLE IF NOT EXISTS USERS');
    expect(call).toContain('CREATE TABLE IF NOT EXISTS TOKENS');
    expect(call).toContain('CREATE TABLE IF NOT EXISTS MEAL_PLANS');
    expect(call).toContain('CREATE TABLE IF NOT EXISTS ATTENDANCE');
    expect(call).toContain('CREATE TABLE IF NOT EXISTS PLANS');
  });

  test('seeds default plan if PLANS table is empty', async () => {
    mockDb().execAsync.mockResolvedValueOnce(true);
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    mockDb().runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });
    await db.initDatabase();
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO PLANS'),
      expect.arrayContaining(['Standard Plan', 38, 40, 1])
    );
  });

  test('does not seed default plan if plans already exist', async () => {
    mockDb().execAsync.mockResolvedValueOnce(true);
    mockDb().getAllAsync
      .mockResolvedValueOnce([]) // PRAGMA table_info returns empty (column exists)
      .mockResolvedValueOnce([{ id: 1, name: 'Standard Plan' }]); // SELECT * FROM PLANS returns existing plan
    await db.initDatabase();
    expect(mockDb().runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO PLANS'),
      expect.anything()
    );
  });
});

describe('User CRUD', () => {
  test('createUser inserts user and returns lastInsertRowId', async () => {
    mockDb().runAsync.mockResolvedValueOnce({ lastInsertRowId: 5, changes: 1 });
    const result = await db.createUser({
      name: 'Test User', phone: '9876543210', notes: 'test'
    });
    expect(result.lastInsertRowId).toBe(5);
  });

  test('createUser called with correct fields', async () => {
    mockDb().runAsync.mockResolvedValueOnce({ lastInsertRowId: 1 });
    await db.createUser({
      name: 'Yash', phone: '9876543210', notes: 'notes'
    });
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO USERS'),
      expect.arrayContaining(['Yash', '9876543210', 'notes'])
    );
  });

  test('getAllUsers returns list ordered by createdAt DESC', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 2, name: 'Zara' },
      { id: 1, name: 'Amit' }
    ]);
    const users = await db.getAllUsers();
    expect(users).toHaveLength(2);
    expect(users[0].name).toBe('Zara');
  });

  test('getUserById returns correct user', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([{ id: 1, name: 'Yash' }]);
    const user = await db.getUserById(1);
    expect(user.name).toBe('Yash');
  });

  test('getUserById returns null if user not found', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const user = await db.getUserById(999);
    expect(user).toBeNull();
  });

  test('updateUser updates correct fields', async () => {
    mockDb().runAsync.mockResolvedValueOnce({ changes: 1 });
    await db.updateUser(1, {
      name: 'Updated Name', phone: '9999999999', notes: 'updated'
    });
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE USERS'),
      expect.arrayContaining(['Updated Name', '9999999999', 'updated', 1])
    );
  });

  test('deleteUser removes user and their tokens', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    await db.deleteUser(1);
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM TOKENS'),
      [1]
    );
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM USERS'),
      [1]
    );
  });
});

describe('Token deduction logic', () => {
  test('Present status deducts 1 token', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, userId: 1, tokensRemaining: 38 }
    ]);
    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Present');
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('MAX(0, tokensRemaining - 1)'),
      [1]
    );
  });

  test('Absent status deducts 1 token', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, userId: 1, tokensRemaining: 38 }
    ]);
    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Absent');
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('MAX(0, tokensRemaining - 1)'),
      [1]
    );
  });

  test('Home status does NOT deduct token', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Home');
    expect(mockDb().runAsync).not.toHaveBeenCalledWith(
      expect.stringContaining('tokensRemaining - 1'),
      expect.anything()
    );
  });

  test('token never goes below 0', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, userId: 1, tokensRemaining: 0 }
    ]);
    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Present');
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('MAX(0, tokensRemaining - 1)'),
      [1]
    );
  });

  test('refundToken increases tokensRemaining by 1', async () => {
    mockDb().runAsync.mockResolvedValueOnce({ changes: 1 });
    await db.refundToken(1);
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('tokensRemaining + 1'),
      [1]
    );
  });

  test('new user gets MEAL_PLAN created on first attendance mark', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Present');
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO MEAL_PLANS'),
      expect.anything()
    );
  });

  test('same user marked twice same day does not double deduct', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, userId: 1, tokensRemaining: 38 }
    ]);
    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Present');
    const deductCalls = mockDb().runAsync.mock.calls.filter(
      call => call[0].includes('tokensRemaining - 1')
    );
    expect(deductCalls).toHaveLength(1);
  });
});

describe('Attendance queries', () => {
  test('getAttendanceByDateAndMeal returns records for correct date and meal', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { userId: 1, status: 'Present' },
      { userId: 2, status: 'Absent' },
      { userId: 3, status: 'Home' }
    ]);
    const result = await db.getAttendanceByDateAndMeal('2026-03-20', 'Dinner');
    expect(result).toHaveLength(3);
    expect(result[0].status).toBe('Present');
  });

  test('getTodayAttendanceSummary returns correct counts', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([{
      presentCount: 3,
      absentCount: 1,
      homeCount: 2,
      markedCount: 6
    }]);
    const result = await db.getTodayAttendanceSummary('2026-03-20', 'Dinner');
    expect(result[0].presentCount).toBe(3);
    expect(result[0].absentCount).toBe(1);
    expect(result[0].homeCount).toBe(2);
    expect(result[0].markedCount).toBe(6);
  });

  test('getTodayAttendanceSummary returns zeros when no attendance', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([{
      presentCount: 0,
      absentCount: 0,
      homeCount: 0,
      markedCount: 0
    }]);
    const result = await db.getTodayAttendanceSummary('2026-03-20', 'Dinner');
    expect(result[0].presentCount).toBe(0);
    expect(result[0].markedCount).toBe(0);
  });

  test('getNotMarkedUsers returns users not in attendance for date+meal', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { name: 'Yash' },
      { name: 'Vipul' }
    ]);
    const result = await db.getNotMarkedUsers('2026-03-20', 'Dinner');
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('Yash');
  });

  test('getUserAttendanceExceptions returns only Absent and Home', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { date: '2026-03-19', mealType: 'Dinner', status: 'Absent' },
      { date: '2026-03-18', mealType: 'Dinner', status: 'Home' }
    ]);
    const result = await db.getUserAttendanceExceptions(1);
    expect(result).toHaveLength(2);
    result.forEach(r => {
      expect(['Absent', 'Home']).toContain(r.status);
    });
  });

  test('getUserAttendanceExceptions does not return Present records', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { date: '2026-03-19', mealType: 'Dinner', status: 'Absent' }
    ]);
    const result = await db.getUserAttendanceExceptions(1);
    const hasPresent = result.some(r => r.status === 'Present');
    expect(hasPresent).toBe(false);
  });
});

describe('Plan operations', () => {
  test('getAllPlans returns all plans', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 },
      { id: 2, name: 'Premium Plan', tokensCount: 60, validityDays: 60, isDefault: 0 }
    ]);
    const plans = await db.getAllPlans();
    expect(plans).toHaveLength(2);
  });

  test('getDefaultPlan returns plan with isDefault = 1', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, name: 'Standard Plan', isDefault: 1 }
    ]);
    const plan = await db.getDefaultPlan();
    expect(plan.isDefault).toBe(1);
    expect(plan.name).toBe('Standard Plan');
  });

  test('getDefaultPlan returns null if no plans exist', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const plan = await db.getDefaultPlan();
    expect(plan).toBeNull();
  });

  test('createPlan inserts with correct values', async () => {
    mockDb().runAsync.mockResolvedValueOnce({ lastInsertRowId: 2 });
    await db.createPlan({
      name: 'Premium Plan',
      tokensCount: 60,
      validityDays: 60,
      isDefault: false
    });
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO PLANS'),
      expect.arrayContaining(['Premium Plan', 60, 60, 0])
    );
  });

  test('updatePlan updates correct fields', async () => {
    mockDb().runAsync.mockResolvedValueOnce({ changes: 1 });
    await db.updatePlan(1, {
      name: 'Updated Plan', tokensCount: 45, validityDays: 45
    });
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE PLANS'),
      expect.arrayContaining(['Updated Plan', 45, 45, 1])
    );
  });

  test('setDefaultPlan unsets all others first then sets new default', async () => {
    const mockTxn = {
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      getAllAsync: jest.fn().mockResolvedValue([])
    };
    mockDb().withTransactionAsync.mockImplementationOnce(async (callback) => {
      await callback(mockTxn);
    });
    await db.setDefaultPlan(2);
    expect(mockTxn.runAsync).toHaveBeenCalledTimes(2);
  });

  test('deletePlan removes correct plan', async () => {
    mockDb().runAsync.mockResolvedValueOnce({ changes: 1 });
    await db.deletePlan(2);
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM PLANS'),
      [2]
    );
  });

  test('assignPlanToUser creates MEAL_PLANS entry', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    mockDb().getAllAsync.mockResolvedValue([{ id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 }]);
    await db.assignPlanToUser(1, 1, '2026-03-20');
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('MEAL_PLANS'),
      expect.anything()
    );
  });
});

describe('Alert queries', () => {
  test('getLowTokenUsers returns users with 5 or fewer tokens', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { name: 'Vipul', tokensRemaining: 2 },
      { name: 'Mayank', tokensRemaining: 5 }
    ]);
    const result = await db.getLowTokenUsers();
    expect(result).toHaveLength(2);
    result.forEach(u => {
      expect(u.tokensRemaining).toBeLessThanOrEqual(5);
    });
  });

  test('getLowTokenUsers does not return users with more than 5 tokens', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const result = await db.getLowTokenUsers();
    expect(result).toHaveLength(0);
  });

  test('getExpiringSoonUsers returns users expiring within 7 days', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { name: 'Vipul', daysLeft: 1 },
      { name: 'Mayank', daysLeft: 7 }
    ]);
    const result = await db.getExpiringSoonUsers('2026-03-20');
    expect(result).toHaveLength(2);
    result.forEach(u => {
      expect(u.daysLeft).toBeLessThanOrEqual(7);
    });
  });

  test('getExpiringSoonUsers does not return already expired plans', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const result = await db.getExpiringSoonUsers('2026-03-20');
    expect(result).toHaveLength(0);
  });

  test('getLastAttendanceMarkedInfo returns most recent record', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { date: '2026-03-20', mealType: 'Dinner', createdAt: '2026-03-20T19:00:00' }
    ]);
    const result = await db.getLastAttendanceMarkedInfo();
    expect(result[0].mealType).toBe('Dinner');
  });
});

describe('User with meal plan queries', () => {
  test('getUsersWithMealPlans returns all active users', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, name: 'Yash', tokensRemaining: 30 },
      { id: 2, name: 'Vipul', tokensRemaining: 25 }
    ]);
    const result = await db.getUsersWithMealPlans();
    expect(result).toHaveLength(2);
  });

  test('getUsersWithTokenInfo returns users with plan info', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, name: 'Yash', tokensRemaining: 30, daysLeft: 20, startDate: '2026-02-01', endDate: '2026-04-10' }
    ]);
    const result = await db.getUsersWithTokenInfo();
    expect(result[0].name).toBe('Yash');
  });
});

describe('updateUserMealPlan', () => {
  test('updates user meal plan with new planId', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    mockDb().getAllAsync.mockResolvedValueOnce([
      { userId: 1, startDate: '2026-03-01' }
    ]).mockResolvedValueOnce([{ id: 2, name: 'Premium', tokensCount: 60, validityDays: 60 }]);
    await db.updateUserMealPlan(1, 2, '2026-03-20');
    expect(mockDb().runAsync).toHaveBeenCalled();
  });
});

describe('Database — Error handling', () => {
  test('createUser returns default result if DB fails', async () => {
    mockDb().runAsync.mockRejectedValueOnce(new Error('DB write failed'));
    const result = await db.createUser({ name: 'Test', phone: '9876543210', notes: '' });
    expect(result.lastInsertRowId).toBe(0);
  });

  test('getAllUsers returns empty array when no users', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const result = await db.getAllUsers();
    expect(result).toEqual([]);
  });

  test('getTokensByUser returns empty array when no tokens', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const result = await db.getTokensByUser(999);
    expect(result).toEqual([]);
  });

  test('assignDefaultPlanToUser does nothing if no default plan', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    await db.assignDefaultPlanToUser(1);
    expect(mockDb().runAsync).not.toHaveBeenCalled();
  });

  test('getExpiringSoonUsers returns empty array when none expiring', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const result = await db.getExpiringSoonUsers('2026-03-20');
    expect(result).toEqual([]);
  });

  test('getLowTokenUsers returns empty array when all tokens high', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const result = await db.getLowTokenUsers();
    expect(result).toEqual([]);
  });

  test('getUserAttendanceExceptions returns empty array for new user', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([]);
    const result = await db.getUserAttendanceExceptions(999);
    expect(result).toEqual([]);
  });

  test('getNotMarkedUsers returns all users when none marked', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { name: 'Yash' },
      { name: 'Vipul' },
      { name: 'Mayank' }
    ]);
    const result = await db.getNotMarkedUsers('2026-03-20', 'Dinner');
    expect(result).toHaveLength(3);
  });

  test('markAttendanceAndDeductToken uses INSERT OR REPLACE', async () => {
    mockDb().runAsync.mockResolvedValue({ changes: 1 });
    mockDb().getAllAsync.mockResolvedValueOnce([
      { id: 1, userId: 1, tokensRemaining: 10 }
    ]);
    await db.markAttendanceAndDeductToken(
      1, '2026-03-20', 'Dinner', 'Absent'
    );
    expect(mockDb().runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO ATTENDANCE'),
      expect.anything()
    );
  });

  test('selectQuery returns empty array on error', async () => {
    mockDb().getAllAsync.mockRejectedValueOnce(new Error('DB error'));
    const result = await db.getAllUsers();
    expect(result).toEqual([]);
  });
});

describe('getUserById', () => {
  test('returns user with matching id', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([{ id: 1, name: 'Yash', phone: '9876543210' }]);
    const result = await db.getUserById(1);
    expect(result.name).toBe('Yash');
  });
});

describe('Database — Zero token handling', () => {
  test('isUserPlanExpired returns true when tokens are zero', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([{
      endDate: '2099-12-31',
      tokensRemaining: 0
    }]);
    const result = await db.isUserPlanExpired(1);
    expect(result).toBe(true);
  });

  test('isUserPlanExpired returns true when tokens below zero', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([{
      endDate: '2099-12-31',
      tokensRemaining: -1
    }]);
    const result = await db.isUserPlanExpired(1);
    expect(result).toBe(true);
  });

  test('isUserPlanExpired returns false when tokens > 0 and valid', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([{
      endDate: '2099-12-31',
      tokensRemaining: 10
    }]);
    const result = await db.isUserPlanExpired(1);
    expect(result).toBe(false);
  });

  test('isUserPlanExpired returns true when both expired and zero tokens', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([{
      endDate: '2026-01-01',
      tokensRemaining: 0
    }]);
    const result = await db.isUserPlanExpired(1);
    expect(result).toBe(true);
  });

  test('getExpiredPlanUsers includes zero token users', async () => {
    mockDb().getAllAsync.mockResolvedValueOnce([
      { name: 'Vipul', endDate: '2099-12-31', tokensRemaining: 0 },
      { name: 'Mayank', endDate: '2026-01-01', tokensRemaining: 5 }
    ]);
    const result = await db.getExpiredPlanUsers('2026-03-20');
    expect(result).toHaveLength(2);
  });
});
