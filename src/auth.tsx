import { useEffect, useState, type ReactNode } from 'react'
import { bindLoggedIn, LoggedInContext } from './authState.ts'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    bindLoggedIn(setLoggedIn)
  }, [])

  return <LoggedInContext.Provider value={loggedIn}>{children}</LoggedInContext.Provider>
}
