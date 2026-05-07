import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { agentLog } from './debug/log'

// #region agent log (global error hooks)
window.addEventListener('error', (e) => {
  agentLog(
    'src/main.tsx:global',
    'window.error',
    {
      message: (e.error && (e.error as Error).message) || e.message,
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: (e.error && (e.error as Error).stack) || null,
    },
    'run1',
    'H1',
  )
})

window.addEventListener('unhandledrejection', (e) => {
  const reason = (e as PromiseRejectionEvent).reason
  agentLog(
    'src/main.tsx:global',
    'window.unhandledrejection',
    {
      reason: typeof reason === 'string' ? reason : (reason && (reason as Error).message) || 'unknown',
      stack: reason && (reason as Error).stack ? (reason as Error).stack : null,
    },
    'run1',
    'H1',
  )
})
// #endregion agent log (global error hooks)

// 说明：
// React StrictMode 在开发环境会双挂载组件，某些动画/卸载流程（如 AnimatePresence）可能触发 DOM removeChild 的 NotFoundError，
// 从而造成白屏。这里先移除 StrictMode 以保证交互流程稳定。
createRoot(document.getElementById('root')!).render(<App />)
