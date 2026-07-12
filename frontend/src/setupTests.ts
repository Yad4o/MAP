import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { taskHandlers } from './mocks/handlers/tasks';
import { apiKeyHandlers } from './mocks/handlers/apiKeys';
import { adminHandlers } from './mocks/handlers/admin';
import { logHandlers } from './mocks/handlers/logs';
import { memoryHandlers } from './mocks/handlers/memory';
import { providerKeyHandlers } from './mocks/handlers/providerKeys';

export const server = setupServer(
  ...taskHandlers,
  ...apiKeyHandlers,
  ...adminHandlers,
  ...logHandlers,
  ...memoryHandlers,
  ...providerKeyHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
