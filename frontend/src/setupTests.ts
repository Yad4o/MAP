import '@testing-library/jest-dom';
import { setupServer } from 'msw/node';
import { taskHandlers } from './mocks/handlers/tasks';

export const server = setupServer(...taskHandlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
