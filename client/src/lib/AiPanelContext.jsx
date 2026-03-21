import { createContext, useContext, useCallback, useRef } from 'react';

const AiPanelContext = createContext(null);

export const useAiPanel = () => useContext(AiPanelContext);

export function AiPanelProvider({ children, onOpenPanel }) {
  const sendRef = useRef(null);

  const registerSendMessage = useCallback((fn) => {
    sendRef.current = fn;
  }, []);

  const sendMessage = useCallback(
    (question) => {
      if (onOpenPanel) onOpenPanel();
      if (sendRef.current) {
        sendRef.current(question);
      }
    },
    [onOpenPanel]
  );

  return (
    <AiPanelContext.Provider value={{ sendMessage, registerSendMessage }}>
      {children}
    </AiPanelContext.Provider>
  );
}
