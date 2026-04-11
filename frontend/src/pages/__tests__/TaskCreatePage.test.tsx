import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskCreatePage from '../TaskCreatePage';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
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

describe('TaskCreatePage', () => {
  it('shows error on empty title submission', async () => {
    renderWithProviders(<TaskCreatePage />);
    const user = userEvent.setup();

    const saveButton = screen.getByRole('button', { name: /save task/i });
    await user.click(saveButton);

    expect(await screen.findByText('Title is required')).toBeInTheDocument();
  });

  it('submits form successfully without errors', async () => {
    renderWithProviders(<TaskCreatePage />);
    const user = userEvent.setup();

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'New Test Task');

    const saveButton = screen.getByRole('button', { name: /save task/i });
    await user.click(saveButton);

    // Error banner must never appear on a valid submission
    await waitFor(() => {
      expect(
        screen.queryByText('Failed to create the task. Please try again.'),
      ).not.toBeInTheDocument();
    });
  });

  it('renders all form fields', () => {
    renderWithProviders(<TaskCreatePage />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });
});
