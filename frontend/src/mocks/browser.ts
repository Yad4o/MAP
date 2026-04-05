import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

// Setup the MSW worker with your request handlers
export const worker = setupWorker(...handlers)