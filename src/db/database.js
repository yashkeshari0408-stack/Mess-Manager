import * as SQLite from 'expo-sqlite';

let dbPromise = null;

const getDb = async () => {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync('mess.db');
  }
  return dbPromise;
};

export const initDatabase = async () => {
  try {
    const db = await getDb();
    console.log('Database opened successfully');
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS USERS (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        phone TEXT,
        notes TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS TOKENS (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        mealType TEXT,
        startDate TEXT,
        endDate TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS MEAL_PLANS (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER UNIQUE,
        tokensRemaining INTEGER DEFAULT 38,
        startDate TEXT,
        endDate TEXT,
        createdAt TEXT
      );
      CREATE TABLE IF NOT EXISTS ATTENDANCE (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER,
        date TEXT,
        mealType TEXT,
        status TEXT,
        createdAt TEXT,
        UNIQUE(userId, date, mealType)
      );
      CREATE TABLE IF NOT EXISTS PLANS (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        tokensCount INTEGER NOT NULL DEFAULT 38,
        validityDays INTEGER NOT NULL DEFAULT 40,
        isDefault INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT
      );
    `);
    console.log('Tables created successfully');

    const tableInfo = await db.getAllAsync('PRAGMA table_info(MEAL_PLANS);');
    const hasPlanIdColumn = tableInfo.some(col => col.name === 'planId');
    if (!hasPlanIdColumn) {
      await db.runAsync('ALTER TABLE MEAL_PLANS ADD COLUMN planId INTEGER;');
      console.log('Added planId column');
    } else {
      console.log('planId column already exists');
    }

    const existingPlans = await db.getAllAsync('SELECT * FROM PLANS;');
    if (!existingPlans || existingPlans.length === 0) {
      await db.runAsync(
        `INSERT INTO PLANS (name, tokensCount, validityDays, isDefault, createdAt)
         VALUES (?, ?, ?, ?, ?);`,
        ['Standard Plan', 38, 40, 1, new Date().toISOString()]
      );
      console.log('Default plan created');
    }
    console.log('Database initialization complete');
  } catch (e) {
    console.log('Database init error:', e);
    throw e;
  }
};

const selectQuery = async (sql, params = []) => {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not initialized');
    const result = await db.getAllAsync(sql, params);
    console.log('Query executed, rows:', result?.length || 0);
    return result;
  } catch (e) {
    console.log('selectQuery error:', e.message, sql.substring(0, 50));
    return [];
  }
};

const executeQuery = async (sql, params = []) => {
  try {
    const db = await getDb();
    if (!db) throw new Error('Database not initialized');
    const result = await db.runAsync(sql, params);
    console.log('Execute completed, lastId:', result?.lastInsertRowId);
    return result;
  } catch (e) {
    console.log('executeQuery error:', e.message, sql.substring(0, 50));
    return { lastInsertRowId: 0 };
  }
};

export const getAllUsers = () => {
  return selectQuery(
    'SELECT * FROM USERS ORDER BY createdAt DESC, id DESC;'
  );
};

export const getUserById = (id) => {
  return selectQuery(`
    SELECT u.*, mp.planId
    FROM USERS u
    LEFT JOIN MEAL_PLANS mp ON mp.userId = u.id
    WHERE u.id = ?;
  `, [id]).then(rows => rows[0] || null);
};

export const isUserPlanExpired = async (userId) => {
  const db = await getDb();
  const rows = await db.getAllAsync(
    `SELECT endDate, tokensRemaining 
     FROM MEAL_PLANS WHERE userId = ?;`,
    [userId]
  );
  if (!rows.length) return true;
  const today = new Date().toISOString().split('T')[0];
  const validityExpired = rows[0].endDate < today;
  const tokensExhausted = rows[0].tokensRemaining <= 0;
  return validityExpired || tokensExhausted;
};

export const createUser = async ({ name, phone, notes, planId, startDate }) => {
  const createdAt = new Date().toISOString();
  const result = await executeQuery(
    `INSERT INTO USERS (name, phone, notes, createdAt)
     VALUES (?, ?, ?, ?);`,
    [name, phone, notes, createdAt]
  );
  const lastId = result.lastInsertRowId;
  await assignPlanToUser(lastId, planId, startDate);
  return result;
};

export const updateUser = (id, { name, phone, notes }) => {
  return executeQuery(
    `UPDATE USERS
     SET name = ?, phone = ?, notes = ?
     WHERE id = ?;`,
    [name, phone, notes, id]
  );
};

export const updateUserMealPlan = async (userId, planId, startDate = null) => {
  try {
    const db = await getDb();
    const existing = await db.getAllAsync(
      'SELECT * FROM MEAL_PLANS WHERE userId = ?;', [userId]
    );
    
    if (existing.length > 0) {
      let plan = null;
      if (planId) {
        const plans = await selectQuery('SELECT * FROM PLANS WHERE id = ?;', [planId]);
        plan = plans[0];
      }
      if (!plan) {
        plan = await getDefaultPlan();
      }
      if (!plan) return;
      
      const start = startDate || existing[0].startDate;
      const end = new Date(start);
      end.setDate(end.getDate() + plan.validityDays);
      const endDate = end.toISOString().split('T')[0];
      
      await executeQuery(
        `UPDATE MEAL_PLANS 
         SET planId = ?, tokensRemaining = ?, startDate = ?, endDate = ?
         WHERE userId = ?;`,
        [plan.id, plan.tokensCount, start, endDate, userId]
      );
    } else {
      await assignPlanToUser(userId, planId, startDate);
    }
  } catch (e) {
    console.log('updateUserMealPlan error:', e);
  }
};

export const deleteUser = async (id) => {
  const db = await getDb();
  await db.runAsync('DELETE FROM ATTENDANCE WHERE userId = ?;', [id]);
  await db.runAsync('DELETE FROM MEAL_PLANS WHERE userId = ?;', [id]);
  await db.runAsync('DELETE FROM TOKENS WHERE userId = ?;', [id]);
  await db.runAsync('DELETE FROM USERS WHERE id = ?;', [id]);
};

export const getTokensByUser = (userId) => {
  return selectQuery(
    `SELECT * FROM TOKENS
     WHERE userId = ?
     ORDER BY createdAt DESC, id DESC;`,
    [userId]
  );
};

export const createToken = ({ userId, mealType, startDate, endDate }) => {
  const createdAt = new Date().toISOString();
  return executeQuery(
    `INSERT INTO TOKENS (userId, mealType, startDate, endDate, createdAt)
     VALUES (?, ?, ?, ?, ?);`,
    [userId, mealType, startDate, endDate, createdAt]
  );
};

export const deleteToken = (id) => {
  return executeQuery('DELETE FROM TOKENS WHERE id = ?;', [id]);
};

export const getTodayStatusForAllUsers = (todayStr) => {
  const sql = `
    SELECT
      u.id,
      u.name,
      u.phone,
      u.notes,
      MAX(CASE WHEN t.mealType = 'breakfast' AND ? BETWEEN t.startDate AND t.endDate THEN 1 ELSE 0 END) AS breakfastActive,
      MAX(CASE WHEN t.mealType = 'lunch' AND ? BETWEEN t.startDate AND t.endDate THEN 1 ELSE 0 END) AS lunchActive,
      MAX(CASE WHEN t.mealType = 'dinner' AND ? BETWEEN t.startDate AND t.endDate THEN 1 ELSE 0 END) AS dinnerActive
    FROM USERS u
    LEFT JOIN TOKENS t ON t.userId = u.id
    GROUP BY u.id, u.name, u.phone, u.notes
    ORDER BY u.name ASC;
  `;
  return selectQuery(sql, [todayStr, todayStr, todayStr]);
};

export const getUsersWithMealPlans = () => {
  return selectQuery(`
    SELECT u.id, u.name, u.phone,
      COALESCE(mp.tokensRemaining, 0) as tokensRemaining,
      mp.startDate, mp.endDate,
      CAST((julianday(mp.endDate) - julianday('now')) 
        AS INTEGER) as daysLeft
    FROM USERS u
    LEFT JOIN MEAL_PLANS mp ON mp.userId = u.id
    ORDER BY u.name ASC;
  `);
};

export const getUsersWithTokenInfo = () => {
  return selectQuery(`
    SELECT 
      u.id, u.name, u.phone, u.notes,
      COALESCE(mp.tokensRemaining, 0) as tokensRemaining,
      mp.startDate, mp.endDate,
      mp.planId,
      p.name as planName,
      38 as maxTokens,
      CAST((julianday(mp.endDate) - julianday('now')) AS INTEGER) as daysLeft
    FROM USERS u
    LEFT JOIN MEAL_PLANS mp ON mp.userId = u.id
    LEFT JOIN PLANS p ON p.id = mp.planId
    ORDER BY u.name ASC;
  `);
};

export const getAttendanceByDateAndMeal = (date, mealType) => {
  return selectQuery(
    `SELECT userId, status FROM ATTENDANCE 
     WHERE date = ? AND mealType = ?;`,
    [date, mealType]
  );
};

export const markAttendanceAndDeductToken = async (userId, date, mealType, status) => {
  const db = await getDb();
  
  try {
    const prevAttendance = await db.getAllAsync(
      'SELECT * FROM ATTENDANCE WHERE userId = ? AND date = ? AND mealType = ?;',
      [userId, date, mealType]
    );
    const prevStatus = prevAttendance.length > 0 ? prevAttendance[0].status : null;
    const prevWasDeducting = prevStatus === 'Present' || prevStatus === 'Absent';
    const willDeduct = status === 'Present' || status === 'Absent';

    let tokenDelta = 0;
    if (!prevWasDeducting && willDeduct) tokenDelta = -1;
    else if (prevWasDeducting && !willDeduct) tokenDelta = +1;
    else if (prevWasDeducting && willDeduct && prevStatus !== status) tokenDelta = 0;

    await db.runAsync(
      `INSERT OR REPLACE INTO ATTENDANCE (userId, date, mealType, status, createdAt)
       VALUES (?, ?, ?, ?, ?);`,
      [userId, date, mealType, status, new Date().toISOString()]
    );

    if (tokenDelta !== 0) {
      const existing = await db.getAllAsync(
        'SELECT * FROM MEAL_PLANS WHERE userId = ?;', 
        [userId]
      );
      
      if (existing.length === 0 && tokenDelta < 0) {
        const end = new Date(date);
        end.setDate(end.getDate() + 40);
        const endDate = end.toISOString().split('T')[0];
        await db.runAsync(
          `INSERT INTO MEAL_PLANS 
           (userId, tokensRemaining, startDate, endDate, createdAt)
           VALUES (?, 37, ?, ?, ?);`,
          [userId, date, endDate, new Date().toISOString()]
        );
      } else if (existing.length > 0) {
        if (tokenDelta < 0) {
          await db.runAsync(
            `UPDATE MEAL_PLANS 
             SET tokensRemaining = MAX(0, tokensRemaining - 1)
             WHERE userId = ?;`,
            [userId]
          );
        } else if (tokenDelta > 0) {
          await db.runAsync(
            `UPDATE MEAL_PLANS 
             SET tokensRemaining = MIN(
               COALESCE(
                 (SELECT tokensCount FROM PLANS WHERE id = MEAL_PLANS.planId),
                 38
               ),
               tokensRemaining + 1
             )
             WHERE userId = ?;`,
            [userId]
          );
        }
      }
    }
    
    console.log('Attendance marked successfully:', userId, date, mealType, status, 'tokenDelta:', tokenDelta);
  } catch(e) {
    console.log('markAttendanceAndDeductToken error:', e);
    throw e;
  }
};

export const refundToken = async (userId) => {
  const db = await getDb();
  try {
    await db.runAsync(`
      UPDATE MEAL_PLANS 
      SET tokensRemaining = MIN(
        COALESCE(
          (SELECT tokensCount FROM PLANS WHERE id = MEAL_PLANS.planId),
          38
        ),
        tokensRemaining + 1
      )
      WHERE userId = ?;
    `, [userId]);
    console.log('Token refunded for user:', userId);
  } catch(e) {
    console.log('refundToken error:', e);
    throw e;
  }
};

export const getTodayAttendanceSummary = (dateStr, mealType) => {
  return selectQuery(`
    SELECT 
      COALESCE(SUM(CASE WHEN status = 'Present' 
        THEN 1 ELSE 0 END), 0) as presentCount,
      COALESCE(SUM(CASE WHEN status = 'Absent' 
        THEN 1 ELSE 0 END), 0) as absentCount,
      COALESCE(SUM(CASE WHEN status = 'Home' 
        THEN 1 ELSE 0 END), 0) as homeCount,
      COUNT(*) as markedCount
    FROM ATTENDANCE
    WHERE date = ? AND mealType = ?;
  `, [dateStr, mealType]);
};

export const getTotalActiveUsers = (dateStr) => {
  if (!dateStr) {
    return selectQuery('SELECT COUNT(*) as total FROM USERS;');
  }
  return selectQuery(`
    SELECT COUNT(*) as total 
    FROM USERS u
    INNER JOIN MEAL_PLANS mp ON mp.userId = u.id
    WHERE date(mp.startDate) <= date(?)
    AND date(mp.endDate) >= date(?);
  `, [dateStr, dateStr]);
};

export const getLowTokenUsers = () => {
  return selectQuery(`
    SELECT u.name, mp.tokensRemaining
    FROM USERS u
    JOIN MEAL_PLANS mp ON mp.userId = u.id
    WHERE mp.tokensRemaining <= 5
    ORDER BY mp.tokensRemaining ASC;
  `);
};

export const getExpiringSoonUsers = (todayStr) => {
  return selectQuery(`
    SELECT u.name, mp.endDate,
      CAST((julianday(mp.endDate) - julianday(?)) AS INTEGER) as daysLeft
    FROM USERS u
    JOIN MEAL_PLANS mp ON mp.userId = u.id
    WHERE daysLeft >= 0 AND daysLeft <= 7
    ORDER BY daysLeft ASC;
  `, [todayStr]);
};

export const getExpiredPlanUsers = (todayStr) => {
  return selectQuery(`
    SELECT u.name, mp.endDate, mp.tokensRemaining
    FROM USERS u
    JOIN MEAL_PLANS mp ON mp.userId = u.id
    WHERE mp.endDate < ? OR mp.tokensRemaining <= 0
    ORDER BY mp.endDate ASC;
  `, [todayStr]);
};

export const getLastAttendanceMarkedInfo = () => {
  return selectQuery(`
    SELECT date, mealType, createdAt
    FROM ATTENDANCE
    ORDER BY createdAt DESC
    LIMIT 1;
  `);
};

export const getNotMarkedUsers = (dateStr, mealType) => {
  return selectQuery(`
    SELECT u.name
    FROM USERS u
    INNER JOIN MEAL_PLANS mp ON mp.userId = u.id
    WHERE date(mp.startDate) <= date(?)
    AND date(mp.endDate) >= date(?)
    AND u.id NOT IN (
      SELECT userId FROM ATTENDANCE 
      WHERE date = ? AND mealType = ?
    )
    ORDER BY u.name ASC;
  `, [dateStr, dateStr, dateStr, mealType]);
};

export const getAllPlans = () => {
  return selectQuery('SELECT * FROM PLANS ORDER BY createdAt ASC;');
};

export const getDefaultPlan = () => {
  return selectQuery(
    'SELECT * FROM PLANS WHERE isDefault = 1 LIMIT 1;'
  ).then(rows => rows[0] || null);
};

export const getUsersCountByPlan = (planId) => {
  return selectQuery(
    'SELECT COUNT(*) as count FROM MEAL_PLANS WHERE planId = ?;',
    [planId]
  );
};

export const createPlan = ({ name, tokensCount, validityDays, isDefault }) => {
  const createdAt = new Date().toISOString();
  return executeQuery(
    `INSERT INTO PLANS (name, tokensCount, validityDays, isDefault, createdAt)
     VALUES (?, ?, ?, ?, ?);`,
    [name, tokensCount, validityDays, isDefault ? 1 : 0, createdAt]
  );
};

export const updatePlan = (id, { name, tokensCount, validityDays }) => {
  return executeQuery(
    `UPDATE PLANS SET name = ?, tokensCount = ?, validityDays = ?
     WHERE id = ?;`,
    [name, tokensCount, validityDays, id]
  );
};

export const deletePlan = (id) => {
  return executeQuery('DELETE FROM PLANS WHERE id = ?;', [id]);
};

export const setDefaultPlan = async (id) => {
  const db = await getDb();
  await db.withTransactionAsync(async (txn) => {
    await txn.runAsync('UPDATE PLANS SET isDefault = 0;');
    await txn.runAsync('UPDATE PLANS SET isDefault = 1 WHERE id = ?;', [id]);
  });
};

export const assignPlanToUser = async (userId, planId, startDate = null) => {
  try {
    let plan = null;
    if (planId) {
      const plans = await selectQuery('SELECT * FROM PLANS WHERE id = ?;', [planId]);
      plan = plans[0];
    }
    if (!plan) {
      plan = await getDefaultPlan();
    }
    if (!plan) {
      return;
    }
    const start = startDate || new Date().toISOString().split('T')[0];
    const end = new Date(start);
    end.setDate(end.getDate() + plan.validityDays);
    const endDate = end.toISOString().split('T')[0];
    const createdAt = new Date().toISOString();
    await executeQuery(
      `INSERT OR IGNORE INTO MEAL_PLANS 
       (userId, planId, tokensRemaining, startDate, endDate, createdAt)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [userId, plan.id, plan.tokensCount, 
       start, endDate, createdAt]
    );
  } catch (e) {
    console.error('assignPlanToUser error:', e);
  }
};

export const assignDefaultPlanToUser = async (userId) => {
  await assignPlanToUser(userId, null);
};

export const getUserAttendanceHistory = (userId) => {
  return selectQuery(`
    SELECT date, mealType, status
    FROM ATTENDANCE
    WHERE userId = ?
    ORDER BY date DESC, mealType ASC;
  `, [userId]);
};

