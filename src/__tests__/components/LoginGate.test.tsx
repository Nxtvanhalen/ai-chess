import { render, screen } from '@testing-library/react';
import LoginGate from '@/components/auth/LoginGate';

// Mock useAuth
const mockUseAuth = jest.fn();
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock useRouter
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('LoginGate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading state while checking auth', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <LoginGate>
        <div>Game Content</div>
      </LoginGate>,
    );

    expect(screen.getByText('Loading Chester AI Chess...')).toBeInTheDocument();
    expect(screen.queryByText('Game Content')).not.toBeInTheDocument();
  });

  it('should redirect to login when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <LoginGate>
        <div>Game Content</div>
      </LoginGate>,
    );

    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(screen.getByText('Redirecting to login...')).toBeInTheDocument();
  });

  it('should render children when authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-123', email: 'test@example.com' },
      loading: false,
    });

    render(
      <LoginGate>
        <div>Game Content</div>
      </LoginGate>,
    );

    expect(screen.getByText('Game Content')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('should not redirect while still loading', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <LoginGate>
        <div>Game Content</div>
      </LoginGate>,
    );

    expect(mockPush).not.toHaveBeenCalled();
  });
});
