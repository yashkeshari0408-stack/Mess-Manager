import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const THEMES = {
  green: {
    primary: '#00897B',
    primaryDark: '#00695C',
    primaryLight: '#E0F2F1',
    headerBg: '#00897B',
    tabActive: '#00897B',
    avatarBg: '#E0F2F1',
    avatarText: '#00897B',
    selectedBorder: '#00897B',
    selectedBg: '#E0F2F1',
    buttonBg: '#00897B',
    name: 'green'
  },
  pink: {
    primary: '#FF8DA1',
    primaryDark: '#FF6B85',
    primaryLight: '#FFEEF1',
    headerBg: '#FF8DA1',
    tabActive: '#FF8DA1',
    avatarBg: '#FFEEF1',
    avatarText: '#FF6B85',
    selectedBorder: '#FF8DA1',
    selectedBg: '#FFEEF1',
    buttonBg: '#FF8DA1',
    name: 'pink'
  }
};

const ThemeContext = createContext({
  theme: THEMES.green,
  switchTheme: () => {}
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(THEMES.green);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem('appTheme');
      if (saved && THEMES[saved]) {
        setTheme(THEMES[saved]);
      }
    } catch(e) {
      console.log('Load theme error:', e);
    }
  };

  const switchTheme = async (themeName) => {
    try {
      const newTheme = THEMES[themeName] || THEMES.green;
      setTheme(newTheme);
      await AsyncStorage.setItem('appTheme', themeName);
    } catch(e) {
      console.log('Save theme error:', e);
    }
  };

  React.useEffect(() => {
    loadTheme();
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, switchTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
