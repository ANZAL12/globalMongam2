import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { CustomModal } from '../components/CustomModal';
import type { ModalType, ModalSeverity } from '../components/CustomModal';

interface ModalOptions {
  title: string;
  message: string;
  severity?: ModalSeverity;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface ModalContextType {
  showAlert: (options: ModalOptions) => void;
  showConfirm: (options: ModalOptions) => Promise<boolean>;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<ModalType>('alert');
  const [severity, setSeverity] = useState<ModalSeverity>('info');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null);
  const [cancelCallback, setCancelCallback] = useState<(() => void) | null>(null);

  const showAlert = useCallback(({ title, message, severity = 'info', onConfirm }: ModalOptions) => {
    setTitle(title);
    setMessage(message);
    setSeverity(severity);
    setType('alert');
    setConfirmCallback(() => () => {
      setIsOpen(false);
      onConfirm?.();
    });
    setCancelCallback(() => () => setIsOpen(false));
    setIsOpen(true);
  }, []);

  const showConfirm = useCallback(({ title, message, severity = 'warning' }: ModalOptions) => {
    setTitle(title);
    setMessage(message);
    setSeverity(severity);
    setType('confirm');
    setIsOpen(true);

    return new Promise<boolean>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (confirmCallback) confirmCallback();
    if (resolvePromise) resolvePromise(true);
    setResolvePromise(null);
    setConfirmCallback(null);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (cancelCallback) cancelCallback();
    if (resolvePromise) resolvePromise(false);
    setResolvePromise(null);
    setCancelCallback(null);
  };

  return (
    <ModalContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <CustomModal
        isOpen={isOpen}
        type={type}
        severity={severity}
        title={title}
        message={message}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </ModalContext.Provider>
  );
};
