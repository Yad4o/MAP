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
  it('shows an error on a too-short submission', async () => {
    renderWithProviders(<TaskCreatePage />);
    const user = userEvent.setup();

    const composer = screen.getByPlaceholderText(/message map/i);
    await user.type(composer, 'hi');

    const sendButton = screen.getByRole('button', { name: /create task/i });
    expect(sendButton).toBeDisabled();

    // Send button is disabled for very short input, but Enter still
    // routes through validation so the user gets a helpful message.
    await user.type(composer, '{Enter}');

    expect(await screen.findByText(/tell me a bit more/i)).toBeInTheDocument();
  });

  it('submits successfully once a real instruction is typed', async () => {
    renderWithProviders(<TaskCreatePage />);
    const user = userEvent.setup();

    const composer = screen.getByPlaceholderText(/message map/i);
    await user.type(composer, 'Summarize the Q2 onboarding survey results');

    const sendButton = screen.getByRole('button', { name: /create task/i });
    expect(sendButton).toBeEnabled();
    await user.click(sendButton);

    // Error banner must never appear on a valid submission
    await waitFor(() => {
      expect(
        screen.queryByText('Failed to create the task. Please try again.'),
      ).not.toBeInTheDocument();
    });
  });

  it('renders the composer, priority pills, and quick-start prompts', () => {
    renderWithProviders(<TaskCreatePage />);

    expect(screen.getByPlaceholderText(/message map/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^high$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^medium$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^low$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /summarize documents/i })).toBeInTheDocument();
  });

  it('fills the composer when a quick-start prompt is clicked', async () => {
    renderWithProviders(<TaskCreatePage />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /draft an email/i }));

    const composer = screen.getByPlaceholderText(/message map/i) as HTMLTextAreaElement;
    expect(composer.value).toMatch(/follow-up email/i);
  });
});
