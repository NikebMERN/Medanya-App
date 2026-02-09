import React, { createContext, useContext, useRef, useCallback } from "react";

const HeaderBackContext = createContext(null);

export function HeaderBackProvider({ children }) {
  const backHandlerRef = useRef(null);

  const setBackHandler = useCallback((fn) => {
    backHandlerRef.current = typeof fn === "function" ? fn : null;
  }, []);

  const callBack = useCallback(() => {
    if (backHandlerRef.current) {
      backHandlerRef.current();
    }
  }, []);

  return (
    <HeaderBackContext.Provider value={{ callBack, setBackHandler }}>
      {children}
    </HeaderBackContext.Provider>
  );
}

export function useHeaderBack() {
  const ctx = useContext(HeaderBackContext);
  return ctx;
}
