import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Use environment variable in production, or auto-detect from current origin
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 
      (import.meta.env.DEV ? 'http://localhost:3001' : window.location.origin);
    
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

