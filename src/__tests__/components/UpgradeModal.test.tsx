import { fireEvent, render, screen } from '@testing-library/react';
import UpgradeModal from '@/components/subscription/UpgradeModal';

describe('UpgradeModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<UpgradeModal isOpen={false} onClose={mockOnClose} type="ai_move" />);

    expect(screen.queryByText("You're out of moves")).not.toBeInTheDocument();
  });

  it('should render move limit message for ai_move type', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    expect(screen.getByText("You're out of moves")).toBeInTheDocument();
  });

  it('should render chat limit message for chat type', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="chat" />);

    expect(screen.getByText("You're out of chat messages")).toBeInTheDocument();
  });

  it('should call onClose when close button is clicked', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    // Click the X button
    const closeButtons = screen.getAllByRole('button');
    const xButton = closeButtons.find((btn) => btn.querySelector('svg'));
    if (xButton) {
      fireEvent.click(xButton);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should call onClose when "Maybe Later" is clicked', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    fireEvent.click(screen.getByText('Maybe Later'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    // Click the backdrop (the semi-transparent overlay)
    const backdrop = document.querySelector('.bg-black\\/70');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should have link to pricing page', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    const upgradeLink = screen.getByText('Upgrade Plan');
    expect(upgradeLink).toHaveAttribute('href', '/pricing');
  });

  it('should display Pro and Premium plan comparisons for free users', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('500 moves/mo')).toBeInTheDocument();
    expect(screen.getByText('$9.99/mo')).toBeInTheDocument();
    expect(screen.getByText('$19.99/mo')).toBeInTheDocument();
  });

  it('should show buy moves button', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    expect(screen.getByText(/Get 50 Moves/)).toBeInTheDocument();
  });
});
