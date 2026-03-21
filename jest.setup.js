const mockDb = {
  execAsync: jest.fn().mockResolvedValue(true),
  runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1, changes: 1 }),
  getAllAsync: jest.fn().mockResolvedValue([]),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  withTransactionAsync: jest.fn().mockImplementation(async (callback) => {
    const txn = {
      runAsync: jest.fn().mockResolvedValue({ changes: 1 }),
      getAllAsync: jest.fn().mockResolvedValue([]),
    };
    return callback(txn);
  }),
};

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn().mockResolvedValue(mockDb),
}));

global.__expoSqliteMockDb = mockDb;

jest.mock('@react-navigation/native');

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    Ionicons: ({ name, size, color, ...props }) => 
      React.createElement(Text, { testID: `icon-${name}`, ...props }, name),
  };
});

global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};
