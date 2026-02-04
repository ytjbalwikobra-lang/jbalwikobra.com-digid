import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';

interface ConfirmationOptions {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  showCancel?: boolean;
}

interface ConfirmationContextType {
  confirm: (options: ConfirmationOptions) => Promise<boolean>;
  showConfirmation: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType>({
  confirm: async () => false,
  showConfirmation: async () => false,
});

export const useConfirmation = () => useContext(ConfirmationContext);

interface ConfirmationState extends ConfirmationOptions {
  isOpen: boolean;
  resolve: (value: boolean) => void;
}

export const ConfirmationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    resolve: (_: boolean) => {
      // Intentionally a no-op until a real resolver is set by confirm();
      // keep side-effect to satisfy no-empty-function rule in dev.
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.debug('ConfirmationProvider resolve called before mount');
      }
    },
  });

  const confirm = useCallback((options: ConfirmationOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        ...options,
        isOpen: true,
        resolve,
      });
    });
  }, []);

  const handleConfirm = async () => {
    try {
      if (state.onConfirm) {
        await state.onConfirm();
      }
      state.resolve(true);
    } catch (error) {
      console.error('Confirmation action failed:', error);
      state.resolve(false);
    }
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (state.onCancel) {
      state.onCancel();
    }
    state.resolve(false);
    setState(prev => ({ ...prev, isOpen: false }));
  };

  const getIcon = () => {
    switch (state.type) {
      case 'warning':
        return <AlertTriangle className="text-yellow-400" size={24} />;
      case 'error':
        return <AlertCircle className="text-red-400" size={24} />;
      case 'success':
        return <CheckCircle className="text-green-400" size={24} />;
      default:
        return <Info className="text-pink-500" size={24} />;
    }
  };

  const getButtonColor = () => {
    switch (state.type) {
      case 'warning':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'error':
        return 'bg-red-600 hover:bg-red-700';
      case 'success':
        return 'bg-green-600 hover:bg-green-700';
      default:
        return 'bg-pink-500 hover:bg-pink-600';
    }
  };

  return (
    <ConfirmationContext.Provider value={{ confirm, showConfirmation: confirm }}>
      {children}
      
      {/* Modal */}
      {state.isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={handleCancel}
          />
          
          {/* Modal Content */}
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <div className="flex items-center space-x-3">
                {getIcon()}
                <h3 className="text-lg font-semibold text-white">
                  {state.title}
                </h3>
              </div>
              
              {state.showCancel !== false && (
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>
            
            {/* Body */}
            <div className="p-6">
              <p className="text-gray-300 leading-relaxed">
                {state.message}
              </p>
            </div>
            
            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-700 bg-gray-800/50">
              {state.showCancel !== false && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-gray-300 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors"
                >
                  {state.cancelText || 'Batal'}
                </button>
              )}
              
              <button
                onClick={handleConfirm}
                className={`px-6 py-2 text-white rounded-xl transition-colors ${getButtonColor()}`}
              >
                {state.confirmText || 'Konfirmasi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmationContext.Provider>
  );
};
