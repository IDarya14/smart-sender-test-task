import { createContext, useContext } from 'react'

export const LoggedInContext = createContext(false)

let setLoggedInState: (loggedIn: boolean) => void = () => {}

export function bindLoggedIn(setLoggedIn: (loggedIn: boolean) => void) {
  setLoggedInState = setLoggedIn
}

export function useLoggedIn() {
  return useContext(LoggedInContext)
}

export function markLoggedIn() {
  setLoggedInState(true)
}

export function markLoggedOut() {
  setLoggedInState(false)
}
