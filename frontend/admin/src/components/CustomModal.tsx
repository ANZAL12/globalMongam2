import React from 'react';
import { XCircle, CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ModalType = 'alert' | 'confirm';
export type ModalSeverity = 'info' | 'success' | 'warning' | 'error';

interface CustomModalProps {
  isOpen: boolean;
  type: ModalType;
  severity: ModalSeverity;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  type,
  severity,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (severity) {
      case 'success': return <CheckCircle2 className="h-12 w-12 text-emerald-500" />;
      case 'error': return <XCircle className="h-12 w-12 text-rose-500" />;
      case 'warning': return <AlertCircle className="h-12 w-12 text-amber-500" />;
      default: return <AlertCircle className="h-12 w-12 text-indigo-500" />;
    }
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'success': return 'border-emerald-100 bg-emerald-50';
      case 'error': return 'border-rose-100 bg-rose-50';
      case 'warning': return 'border-amber-100 bg-amber-50';
      default: return 'border-indigo-100 bg-indigo-50';
    }
  };

  const getButtonColor = () => {
    switch (severity) {
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100';
      case 'error': return 'bg-rose-600 hover:bg-rose-700 shadow-rose-100';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-100';
      default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-x-hidden overflow-y-auto outline-none focus:outline-none">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onCancel}></div>
      
      <div className="relative w-full max-w-sm mx-auto bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
        <div className={`p-8 flex flex-col items-center text-center ${getSeverityColor()}`}>
          <div className="mb-4">
            {getIcon()}
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm font-medium leading-relaxed">
            {message}
          </p>
        </div>

        <div className="p-6 bg-white flex flex-col sm:flex-row gap-3">
          {type === 'confirm' && (
            <button
              onClick={onCancel}
              className="flex-1 px-6 py-3 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 px-6 py-3 text-white rounded-2xl font-bold text-sm shadow-lg transition-all ${getButtonColor()}`}
          >
            {type === 'confirm' ? 'Confirm' : 'Got it'}
          </button>
        </div>
        
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
