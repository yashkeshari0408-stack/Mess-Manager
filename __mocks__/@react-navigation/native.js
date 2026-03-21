const React = require('react');

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  addListener: jest.fn(),
};

module.exports = {
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: {} }),
  useFocusEffect: (callback) => {
    React.useEffect(() => {
      const unsubscribe = callback();
      return () => {
        if (typeof unsubscribe === 'function') unsubscribe();
      };
    }, []);
  },
  useCallback: (fn) => fn,
};
