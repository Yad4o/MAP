import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import SettingsPage from '../SettingsPage';
import { server } from '../../setupTests';
import { resetMockProviderKeys } from '../../mocks/handlers/providerKeys';

const ASYNC_TIMEOUT = { timeout: 3000 };

beforeEach(() => {
  resetMockProviderKeys();
});

const renderSettings = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const openProvidersTab = async () => {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: /ai providers/i }));
  return user;
};

describe('SettingsPage — AI Providers tab', () => {
  it('shows the mock-configured Claude key, masked', async () => {
    renderSettings();
    await openProvidersTab();

    expect(await screen.findByText('******a1b2', {}, ASYNC_TIMEOUT)).toBeInTheDocument();
  });

  it('shows the empty state when no keys are configured', async () => {
    server.use(http.get('http://localhost:8000/api/v1/provider-keys', () => HttpResponse.json([])));
    renderSettings();
    await openProvidersTab();

    expect(await screen.findByText(/no personal keys added/i, {}, ASYNC_TIMEOUT)).toBeInTheDocument();
  });

  it('never renders the raw key the user types, before or after saving', async () => {
    renderSettings();
    const user = await openProvidersTab();

    const input = screen.getByPlaceholderText('sk-ant-...');
    await user.type(input, 'sk-ant-super-secret-value-123');

    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Only the masked version the mock server echoes back should ever appear.
    expect(await screen.findByText('******-123', {}, ASYNC_TIMEOUT)).toBeInTheDocument();
    expect(screen.queryByText('sk-ant-super-secret-value-123')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('sk-ant-super-secret-value-123')).not.toBeInTheDocument();
  });

  it('save button stays disabled for a too-short key', async () => {
    renderSettings();
    const user = await openProvidersTab();

    const input = screen.getByPlaceholderText('sk-ant-...');
    await user.type(input, 'short');

    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  it('the show/hide toggle switches the input between password and text type', async () => {
    renderSettings();
    const user = await openProvidersTab();

    const input = screen.getByPlaceholderText('sk-ant-...') as HTMLInputElement;
    expect(input.type).toBe('password');

    await user.click(screen.getByRole('button', { name: /show key/i }));

    expect(input.type).toBe('text');
  });

  it('removing a key clears it from the list after confirmation', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderSettings();
    const user = await openProvidersTab();

    // Wait on the masked key, not the provider label — the label also
    // appears in the (always-rendered) dropdown option and resolves
    // before the table's actual fetch completes.
    expect(await screen.findByText('******a1b2', {}, ASYNC_TIMEOUT)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove claude \(anthropic\) key/i }));

    await waitFor(() => {
      expect(screen.getByText(/no personal keys added/i)).toBeInTheDocument();
    }, ASYNC_TIMEOUT);
    confirmSpy.mockRestore();
  });

  it('declining the confirm dialog keeps the key', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderSettings();
    const user = await openProvidersTab();

    expect(await screen.findByText('******a1b2', {}, ASYNC_TIMEOUT)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /remove claude \(anthropic\) key/i }));

    // Give any (incorrect) removal a moment to happen, then confirm it didn't.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.getByText('******a1b2')).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('switching provider clears whatever was typed for the previous one', async () => {
    renderSettings();
    const user = await openProvidersTab();

    const input = screen.getByPlaceholderText('sk-ant-...');
    await user.type(input, 'sk-ant-partial-key');

    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 'OpenAI');

    const newInput = screen.getByPlaceholderText('sk-...');
    expect(newInput).toHaveValue('');
  });
});
