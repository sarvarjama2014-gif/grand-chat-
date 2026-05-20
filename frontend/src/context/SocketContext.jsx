import { createContext, useContext, useEffect, useState } from 'react'
import io from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export const useSocket = () => useContext(SocketContext)

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setConnected(false)
      }
      return
    }

    const token = localStorage.getItem('token')
    const socketUrl = import.meta.env.VITE_SOCKET_URL || '/'
    const newSocket = io(socketUrl, {
      auth: { token }
    })

    newSocket.on('connect', () => setConnected(true))
    newSocket.on('disconnect', () => setConnected(false))

    setSocket(newSocket)

    return () => {
      newSocket.disconnect()
    }
  }, [user])

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  )
}
