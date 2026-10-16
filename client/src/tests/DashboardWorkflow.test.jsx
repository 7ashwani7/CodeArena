import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage/ProfilePage';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { userService } from '../services/userService';
import { submissionService } from '../services/submissionService';

vi.mock('../services/userService');
vi.mock('../services/submissionService');

// Mock Recharts ResponsiveContainer to render children directly in jsdom
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>
  };
});

const mockUser = {
  _id: 'usr-12345',
  username: 'test_coder',
  name: 'Test Coder',
  email: 'coder@example.com',
  role: 'user',
  targetRole: 'Full-Stack Software Engineer',
  bio: 'Building systems with Node.js and React',
  createdAt: '2026-01-15T10:00:00.000Z'
};

const mockProgressWithData = {
  overview: {
    totalSolved: 3,
    totalProblems: 10,
    solvedPercentage: 30.0,
    difficultyStats: {
      easy: { solved: 2, total: 4 },
      medium: { solved: 1, total: 4 },
      hard: { solved: 0, total: 2 }
    },
    submissions: {
      total: 6,
      accepted: 3,
      acceptanceRate: 50.0,
      formula: '(acceptedSubmissions / totalSubmissions) * 100'
    },
    bookmarkedCount: 2
  },
  topicProgress: [
    { topic: 'Arrays', solved: 2, total: 4, percentage: 50 },
    { topic: 'Linked Lists', solved: 1, total: 3, percentage: 33 }
  ],
  activity: [
    { date: '2026-03-01', count: 2, accepted: 1 },
    { date: '2026-03-02', count: 4, accepted: 2 }
  ],
  recentSubmissions: [
    {
      _id: 'sub-01',
      problemId: { _id: 'prob-01', title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' },
      language: 'javascript',
      status: 'Accepted',
      executionTimeMs: 42,
      memoryUsageKb: 14200,
      createdAt: '2026-03-02T12:00:00.000Z'
    }
  ]
};

const mockEmptyProgress = {
  overview: {
    totalSolved: 0,
    totalProblems: 10,
    solvedPercentage: 0.0,
    difficultyStats: {
      easy: { solved: 0, total: 4 },
      medium: { solved: 0, total: 4 },
      hard: { solved: 0, total: 2 }
    },
    submissions: {
      total: 0,
      accepted: 0,
      acceptanceRate: 0.0,
      formula: '(acceptedSubmissions / totalSubmissions) * 100'
    },
    bookmarkedCount: 0
  },
  topicProgress: [],
  activity: [],
  recentSubmissions: []
};

function renderWithProviders(ui) {
  return render(
    <AuthProvider initialUser={mockUser} autoRestore={false}>
      <ToastProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </ToastProvider>
    </AuthProvider>
  );
}

describe('Dashboard & Progress Tracking Features', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders live progress overview metrics, topic progress, and recent submissions', async () => {
    userService.getUserProgress.mockResolvedValueOnce(mockProgressWithData);

    renderWithProviders(<DashboardPage />);

    // Wait for progress to resolve
    await waitFor(() => {
      expect(screen.getByText('Developer Dashboard')).toBeInTheDocument();
    });

    // Check unique solved metric
    expect(screen.getByText('Unique Solved')).toBeInTheDocument();
    expect(screen.getByText(/30% of catalogue solved/i)).toBeInTheDocument();

    // Check acceptance rate & formula
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText(/Formula: \(Accepted \/ Total\) × 100/i)).toBeInTheDocument();
    expect(screen.getByText(/3 accepted of 6 total/i)).toBeInTheDocument();

    // Check topic progress
    expect(screen.getByText('Arrays')).toBeInTheDocument();
    expect(screen.getByText(/2 \/ 4 \(50%\)/i)).toBeInTheDocument();

    // Check recent submission
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText(/42 ms/i)).toBeInTheDocument();
  });

  it('displays clean empty states for new user with zero submissions', async () => {
    userService.getUserProgress.mockResolvedValueOnce(mockEmptyProgress);

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('0% of catalogue solved')).toBeInTheDocument();
    });

    // Verify empty state banners
    expect(screen.getByText('No Submission Activity Yet')).toBeInTheDocument();
    expect(screen.getByText('No Submissions Yet')).toBeInTheDocument();
  });

  it('switches to Submission History tab, renders filters, and fetches paginated submissions', async () => {
    userService.getUserProgress.mockResolvedValueOnce(mockProgressWithData);
    submissionService.getMySubmissions.mockResolvedValueOnce({
      submissions: mockProgressWithData.recentSubmissions,
      meta: { page: 1, limit: 15, totalItems: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false }
    });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Submission History')).toBeInTheDocument();
    });

    // Click Submission History tab
    fireEvent.click(screen.getByText('Submission History'));

    await waitFor(() => {
      expect(submissionService.getMySubmissions).toHaveBeenCalled();
    });

    // Verify filter elements exist
    expect(screen.getByLabelText('Filter by submission status')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by programming language')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by start date')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter by end date')).toBeInTheDocument();

    // Verify submissions table row rendered
    expect(screen.getByText('Two Sum')).toBeInTheDocument();
  });

  it('switches to Bookmarked Problems tab and handles removing a bookmark', async () => {
    userService.getUserProgress.mockResolvedValueOnce(mockProgressWithData);
    userService.getBookmarks.mockResolvedValueOnce({
      bookmarks: [
        {
          bookmarkId: 'bm-01',
          bookmarkedAt: '2026-03-01T10:00:00.000Z',
          problem: {
            _id: 'prob-01',
            title: 'Two Sum',
            slug: 'two-sum',
            difficulty: 'Easy',
            topics: ['Arrays', 'Hash Table'],
            status: 'Solved'
          }
        }
      ],
      meta: { page: 1, limit: 20, totalItems: 1, totalPages: 1 }
    });
    userService.removeBookmark.mockResolvedValueOnce({ bookmarked: false, problemId: 'prob-01' });

    renderWithProviders(<DashboardPage />);

    await waitFor(() => {
      expect(screen.getByText('Bookmarked Problems')).toBeInTheDocument();
    });

    // Click Bookmarked Problems tab
    fireEvent.click(screen.getByText('Bookmarked Problems'));

    await waitFor(() => {
      expect(userService.getBookmarks).toHaveBeenCalled();
      expect(screen.getByText('Two Sum')).toBeInTheDocument();
    });

    // Click remove bookmark
    const removeBtn = screen.getByTitle('Remove bookmark');
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(userService.removeBookmark).toHaveBeenCalledWith('prob-01');
    });
  });

  it('renders ProfilePage with real account info and updates profile details via modal', async () => {
    userService.getUserProfile.mockResolvedValueOnce(mockUser);
    userService.getUserProgress.mockResolvedValueOnce(mockProgressWithData);
    userService.updateUserProfile.mockResolvedValueOnce({
      ...mockUser,
      name: 'Test Coder Updated',
      targetRole: 'Senior Platform Engineer'
    });

    renderWithProviders(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Test Coder')).toBeInTheDocument();
      expect(screen.getByText('@test_coder')).toBeInTheDocument();
      expect(screen.getByText('coder@example.com')).toBeInTheDocument();
    });

    // Open Edit Profile modal
    fireEvent.click(screen.getByRole('button', { name: /Edit Profile/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    const nameInput = screen.getByLabelText('Full Name');
    fireEvent.change(nameInput, { target: { value: 'Test Coder Updated' } });

    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(userService.updateUserProfile).toHaveBeenCalledWith({
        name: 'Test Coder Updated',
        bio: mockUser.bio,
        targetRole: mockUser.targetRole
      });
      expect(screen.getByText('Test Coder Updated')).toBeInTheDocument();
    });
  });
});
