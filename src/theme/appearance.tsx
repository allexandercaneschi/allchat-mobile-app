import React, { createContext, PropsWithChildren, useContext, useLayoutEffect } from 'react';
import { Appearance } from 'react-native';

// The app is dark only. Setting the native scheme keeps system surfaces
// (keyboard, dialogs, pickers) in step with it.
const AppearanceContext = createContext<'light' | 'dark'>('dark');

export const AppearanceProvider = ({ children }: PropsWithChildren) => {
  useLayoutEffect(() => {
    Appearance.setColorScheme('dark');
  }, []);

  return <AppearanceContext.Provider value="dark">{children}</AppearanceContext.Provider>;
};

export const useAppAppearance = () => useContext(AppearanceContext);
