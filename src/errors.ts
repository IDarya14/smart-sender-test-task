import axios from 'axios'
import type { ApiErrorBody } from './types.ts'

export function readFieldErrors(error: unknown) {
  if (!axios.isAxiosError(error)) return null

  const body = error.response?.data as ApiErrorBody | undefined
  const fieldErrors = body?.error?.payload

  if (!fieldErrors) return null
  return fieldErrors
}
