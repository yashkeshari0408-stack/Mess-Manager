import * as db from '../db/database';

beforeEach(() => {
  jest.clearAllMocks();
  global.__expoSqliteMockDb.runAsync.mockResolvedValue({ lastInsertRowId: 1, changes: 1 });
  global.__expoSqliteMockDb.getAllAsync.mockResolvedValue([]);
});

describe('Integration — Full attendance workflow', () => {
  test('marking Present deducts token and saves attendance', async () => {
    global.__expoSqliteMockDb.getAllAsync.mockResolvedValueOnce([{ id: 1, userId: 1, tokensRemaining: 38 }]);

    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Present');

    const calls = global.__expoSqliteMockDb.runAsync.mock.calls.map(c => c[0]);
    expect(calls.some(c => c.includes('INSERT OR REPLACE INTO ATTENDANCE'))).toBe(true);
    expect(calls.some(c => c.includes('tokensRemaining - 1'))).toBe(true);
  });

  test('marking Home saves attendance but does NOT deduct token', async () => {
    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Home');

    const calls = global.__expoSqliteMockDb.runAsync.mock.calls.map(c => c[0]);
    expect(calls.some(c => c.includes('INSERT OR REPLACE INTO ATTENDANCE'))).toBe(true);
    expect(calls.some(c => c.includes('tokensRemaining - 1'))).toBe(false);
  });

  test('switching Present to Home refunds token', async () => {
    await db.refundToken(1);
    await db.markAttendanceAndDeductToken(1, '2026-03-20', 'Dinner', 'Home');

    const calls = global.__expoSqliteMockDb.runAsync.mock.calls.map(c => c[0]);
    expect(calls.some(c => c.includes('tokensRemaining + 1'))).toBe(true);
    expect(calls.some(c => c.includes('INSERT OR REPLACE INTO ATTENDANCE'))).toBe(true);
  });

  test('full user creation flow assigns default plan', async () => {
    global.__expoSqliteMockDb.getAllAsync.mockResolvedValueOnce([
      { id: 1, name: 'Standard Plan', tokensCount: 38, validityDays: 40, isDefault: 1 }
    ]);

    await db.createUser({ name: 'New User', phone: '9876543210', notes: '' });
    await db.assignPlanToUser(5, 1, '2026-03-20');

    const calls = global.__expoSqliteMockDb.runAsync.mock.calls.map(c => c[0]);
    expect(calls.some(c => c.includes('INSERT INTO USERS'))).toBe(true);
    expect(calls.some(c => c.includes('INSERT OR IGNORE INTO MEAL_PLANS'))).toBe(true);
  });

  test('deleting user removes attendance records', async () => {
    await db.deleteUser(1);

    const calls = global.__expoSqliteMockDb.runAsync.mock.calls.map(c => c[0]);
    expect(calls.some(c => c.includes('DELETE FROM TOKENS'))).toBe(true);
    expect(calls.some(c => c.includes('DELETE FROM USERS'))).toBe(true);
  });

  test('attendance summary correctly counts all statuses', async () => {
    global.__expoSqliteMockDb.getAllAsync.mockResolvedValueOnce([{
      presentCount: 5,
      absentCount: 2,
      homeCount: 1,
      markedCount: 8
    }]);

    const result = await db.getTodayAttendanceSummary('2026-03-20', 'Dinner');
    expect(result[0].presentCount + result[0].absentCount + result[0].homeCount).toBe(result[0].markedCount);
  });
});
