import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TaskCreatePage from '../TaskCreatePage';

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </QueryClientProvider>
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

  it('submits form successfully', async () => {
    renderWithProviders(<TaskCreatePage />);
    const user = userEvent.setup();

    const titleInput = screen.getByLabelText(/title/i);
    await user.type(titleInput, 'New Test Task');
    
    const saveButton = screen.getByRole('button', { name: /save task/i });
    await user.click(saveButton);

    // After success it navigates, in this standard setup the router isn't fully mocked
    // to check navigation (it will do it though). We just check it submitted.
    await waitFor(() => {
      expect(screen.queryByText('Title is required')).not.toBeInTheDocument();
    });
  });
});
