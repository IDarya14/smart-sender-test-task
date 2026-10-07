import '@ant-design/v5-patch-for-react-19'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import App from './App.tsx'
import { AuthProvider } from './auth.tsx'
import { worker } from './mocks/browser.ts'
import { installTestHook } from './testHook.ts'
import './index.css'

async function boot() {
  await worker.start({ onUnhandledRequest: 'bypass' })
  installTestHook()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </StrictMode>,
  )
}

void boot()
