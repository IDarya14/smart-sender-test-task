import { getMe, getWebhooks } from './api.ts'
import { expireSession, resetRotateCount, rotateCount } from './mocks/db.ts'

export function installTestHook() {
  if (!import.meta.env.DEV || !window.Cypress) return

  window.__app = {
    refetchBoth: async () => {
      resetRotateCount()
      expireSession()

      const [webhooks, me] = await Promise.allSettled([getWebhooks(1, ''), getMe()])

      return {
        webhooks: webhooks.status === 'fulfilled' ? 'fulfilled' : 'rejected',
        me: me.status === 'fulfilled' ? 'fulfilled' : 'rejected',
        rotates: rotateCount(),
      }
    },
  }
}

declare global {
  interface Window {
    Cypress?: unknown
    __app?: {
      refetchBoth: () => Promise<{ webhooks: string; me: string; rotates: number }>
    }
  }
}
