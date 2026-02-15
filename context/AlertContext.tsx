
import React, { createContext, ReactNode, useCallback, useContext, useState } from 'react';

type AlertType = 'success' | 'error' | 'info';

interface AlertState {
  visible: boolean;
  type: AlertType;
  message: string;
}

interface AlertContextType {
  alert: AlertState;
  showAlert: (type: AlertType, message: string, duration?: number) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    type: 'info',
    message: '',
  });

  const showAlert = useCallback((type: AlertType, message: string, duration = 3000) => {
    setAlert({ visible: true, type, message });
    if (duration > 0) {
      setTimeout(() => {
        setAlert(prev => ({ ...prev, visible: false }));
      }, duration);
    }
  }, []);

  const hideAlert = useCallback(() => {
    setAlert(prev => ({ ...prev, visible: false }));
  }, []);

  return (
    <AlertContext.Provider value={{ alert, showAlert, hideAlert }}>
      {children}
    </AlertContext.Provider>
  );
};
