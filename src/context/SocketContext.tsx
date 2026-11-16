import React, { createContext, useContext, useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { useAuthSession } from "@/features/auth/auth-session"

interface SocketContextType {
  socket: Socket | null
  isConnected: boolean
}

export const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
})

export const useSocket = () => useContext(SocketContext)

function getSocketUrl(): string {
  const envUrl = import.meta.env.VITE_BACKEND_API_URL?.trim()
  if (envUrl) {
    return envUrl.replace(/\/api\/v1\/?$/, "").replace(/\/+$/, "")
  }
  return window.location.origin
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { session, isAuthenticated } = useAuthSession()
  const token = session?.token
  const userId = session?.user?.user_id
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState<boolean>(false)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!isAuthenticated || !token || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
        setSocket(null)
        setIsConnected(false)
      }
      return
    }

    const socketUrl = getSocketUrl()
    const socketInstance = io(socketUrl, {
      auth: { token },
      transports: ["polling", "websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    })

    socketRef.current = socketInstance

    socketInstance.on("connect", () => {
      setSocket(socketInstance)
      setIsConnected(true)
    })

    socketInstance.on("reconnect", () => {
      setSocket(socketInstance)
      setIsConnected(true)
    })

    socketInstance.on("disconnect", () => {
      setIsConnected(false)
    })

    socketInstance.on("connect_error", (error) => {
      console.warn("Socket connection error:", error.message)
      setIsConnected(false)
    })

    const handleOnline = () => {
      if (socketRef.current && !socketRef.current.connected) {
        socketRef.current.connect()
      }
    }

    window.addEventListener("online", handleOnline)

    return () => {
      window.removeEventListener("online", handleOnline)
      socketInstance.disconnect()
      socketRef.current = null
      setSocket(null)
      setIsConnected(false)
    }
  }, [isAuthenticated, token, userId])

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  )
}
