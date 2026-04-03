import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'

(async () => {
  if (import.meta.env.DEV) {
    const { worker } = await import('./mocks/browser')
    await worker.start({ onUnhandledRequest: 'warn' })
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
        staleTime: 30000,
      },
    },
  })

  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Root element #root not found in DOM')
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </React.StrictMode>
  )
})()