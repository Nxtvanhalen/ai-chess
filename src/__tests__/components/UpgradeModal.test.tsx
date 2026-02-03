import { fireEvent, render, screen } from '@testing-library/react';
import UpgradeModal from '@/components/subscription/UpgradeModal';

describe('UpgradeModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<UpgradeModal isOpen={false} onClose={mockOnClose} type="ai_move" />);

    expect(screen.queryByText("You've reached your daily move limit")).not.toBeInTheDocument();
  });

  it('should render move limit message for ai_move type', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    expect(screen.getByText("You've reached your daily move limit")).toBeInTheDocument();
    expect(screen.getByText(/500 moves\/day/)).toBeInTheDocument();
  });

  it('should render chat limit message for chat type', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="chat" />);

    expect(screen.getByText("You've reached your daily chat limit")).toBeInTheDocument();
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

  it('should display reset time when provided', () => {
    const resetTime = new Date('2025-01-10T00:00:00Z').toISOString();

    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" resetAt={resetTime} />);

    // Should show formatted time
    expect(screen.getByText(/Your limit resets at/)).toBeInTheDocument();
  });

  it('should have link to pricing page', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    const viewPlansLink = screen.getByText('View Plans');
    expect(viewPlansLink).toHaveAttribute('href', '/pricing');
  });

  it('should display both Pro and Premium plan options', () => {
    render(<UpgradeModal isOpen={true} onClose={mockOnClose} type="ai_move" />);

    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('$9.99')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
  });
});
