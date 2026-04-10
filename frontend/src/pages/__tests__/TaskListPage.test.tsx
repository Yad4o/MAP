import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskListPage from '../TaskListPage';
import { server } from '../../setupTests';
import { http, HttpResponse } from 'msw';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('TaskListPage', () => {
  it('renders list of tasks', async () => {
    renderWithProviders(<TaskListPage />);
    
    // Check loading state
    expect(screen.getByRole('heading', { name: /tasks/i })).toBeInTheDocument();
    
    // Wait for the mock tasks to load
    await waitFor(() => {
      expect(screen.getByText('Learn React')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Build Project')).toBeInTheDocument();
  });

  it('renders empty state when no tasks', async () => {
    // Override the handler to return an empty array
    server.use(
      http.get('*/api/v1/tasks', () => {
        return HttpResponse.json([]);
      })
    );

    renderWithProviders(<TaskListPage />);
    
    await waitFor(() => {
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    });
  });
});
