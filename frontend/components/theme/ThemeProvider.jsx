'use client';

import { createContext, useContext } from 'react';
import ThemeVariables from './ThemeVariables';

const ThemeContext = createContext(null);

export function ThemeProvider({ children, theme }) {
  return (
    <ThemeContext.Provider value={theme}>
      <ThemeVariables theme={theme} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  return context;
}

