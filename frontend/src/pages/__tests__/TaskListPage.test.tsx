import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskListPage from '../TaskListPage';
import { server } from '../../setupTests';
import { http, HttpResponse } from 'msw';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('TaskListPage', () => {
  it('renders list of tasks from mock handler', async () => {
    renderWithProviders(<TaskListPage />);

    // Wait for the mock tasks to load
    await waitFor(() => {
      expect(screen.getByText('Design system architecture')).toBeInTheDocument();
    });

    expect(screen.getByText('Implement agent orchestration layer')).toBeInTheDocument();
    expect(screen.getByText('Write E2E test suite')).toBeInTheDocument();
  });

  it('renders empty state when no tasks', async () => {
    // Override the handler to return an empty array
    server.use(
      http.get('*/tasks', () => {
        return HttpResponse.json([]);
      }),
    );

    renderWithProviders(<TaskListPage />);

    await waitFor(() => {
      expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    });
  });

  it('shows the Create Task button', async () => {
    renderWithProviders(<TaskListPage />);

    await waitFor(() => {
      expect(screen.getByText('Design system architecture')).toBeInTheDocument();
    });

    // There should be a "Create Task" link in the header
    const createLinks = screen.getAllByText('Create Task');
    expect(createLinks.length).toBeGreaterThanOrEqual(1);
  });
});
