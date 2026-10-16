import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProblemsPage } from '../pages/ProblemsPage/ProblemsPage';
import { ProblemDetailPage } from '../pages/ProblemDetailPage/ProblemDetailPage';
import { AdminPage } from '../pages/AdminPage/AdminPage';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ThemeProvider } from '../context/ThemeContext';
import { problemService } from '../services/problemService';

vi.mock('../services/problemService', () => ({
  problemService: {
    getProblems: vi.fn(),
    getProblemBySlug: vi.fn(),
    getAdminProblems: vi.fn(),
    createProblem: vi.fn(),
    updateProblem: vi.fn(),
    togglePublication: vi.fn(),
    deleteProblem: vi.fn()
  }
}));

vi.mock('../services/authService', () => ({
  authService: {
    verifyAdminAccess: vi.fn().mockResolvedValue(true)
  }
}));

const MOCK_PROBLEMS = [
  {
    _id: 'p1',
    id: 'p1',
    number: 1,
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: 'Easy',
    topics: ['Arrays & Hashing', 'Hash Table'],
    acceptanceRate: 52.4,
    status: 'Solved',
    publicationStatus: 'published',
    description: 'Given an array of integers nums and an integer target...',
    constraints: ['2 <= nums.length <= 10^4'],
    examples: [
      { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because 2 + 7 == 9' }
    ],
    starterCode: {
      javascript: 'function twoSum() {}'
    }
  },
  {
    _id: 'p2',
    id: 'p2',
    number: 2,
    title: 'Trapping Rain Water',
    slug: 'trapping-rain-water',
    difficulty: 'Hard',
    topics: ['Two Pointers', 'Stack'],
    acceptanceRate: 61.2,
    status: 'Unsolved',
    publicationStatus: 'published',
    description: 'Given n non-negative integers representing an elevation map...',
    constraints: ['n == height.length'],
    examples: [
      { input: 'height = [0,1,0,2,1,0,1,3,2,1,2,1]', output: '6' }
    ],
    starterCode: {
      javascript: 'function trap() {}'
    }
  }
];

function renderWithProviders(ui, { initialEntries = ['/'], user = null } = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider initialUser={user} autoRestore={false}>
        <ToastProvider>
          <MemoryRouter initialEntries={initialEntries}>
            {ui}
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('Problem Browsing & Management Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Problem Catalogue (ProblemsPage)', () => {
    it('fetches problems from backend and displays them in catalogue table', async () => {
      problemService.getProblems.mockResolvedValueOnce({
        problems: MOCK_PROBLEMS,
        meta: {
          page: 1,
          limit: 10,
          totalItems: 2,
          totalPages: 1,
          hasNextPage: false,
          hasPrevPage: false
        }
      });

      renderWithProviders(<ProblemsPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Problem Catalogue/i);
      expect(await screen.findByText('Two Sum')).toBeInTheDocument();
      expect(screen.getByText('Trapping Rain Water')).toBeInTheDocument();
      expect(screen.getAllByText('Easy').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Hard').length).toBeGreaterThanOrEqual(1);
    });

    it('shows solved status for authenticated users', async () => {
      problemService.getProblems.mockResolvedValueOnce({
        problems: MOCK_PROBLEMS,
        meta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 }
      });

      const authUser = { id: 'u1', username: 'coder', email: 'coder@test.com', role: 'user' };
      renderWithProviders(<ProblemsPage />, { user: authUser });

      expect(await screen.findByText('Two Sum')).toBeInTheDocument();
      expect(screen.getByTitle('Solved')).toBeInTheDocument();
    });

    it('renders empty state when no problems match search query', async () => {
      problemService.getProblems.mockResolvedValueOnce({
        problems: [],
        meta: { page: 1, limit: 10, totalItems: 0, totalPages: 0 }
      });

      renderWithProviders(<ProblemsPage />);

      expect(await screen.findByText('No problems found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Clear all filters/i })).toBeInTheDocument();
    });

    it('renders error state when backend API fails and allows retry', async () => {
      problemService.getProblems.mockRejectedValueOnce(new Error('Internal Database Error'));

      renderWithProviders(<ProblemsPage />);

      expect(await screen.findByText(/Internal Database Error/i)).toBeInTheDocument();
      const retryBtn = screen.getByRole('button', { name: /Retry/i });
      expect(retryBtn).toBeInTheDocument();

      // Trigger retry
      problemService.getProblems.mockResolvedValueOnce({
        problems: MOCK_PROBLEMS,
        meta: { page: 1, limit: 10, totalItems: 2, totalPages: 1 }
      });
      fireEvent.click(retryBtn);

      expect(await screen.findByText('Two Sum')).toBeInTheDocument();
    });

    it('supports difficulty and category filter selections', async () => {
      problemService.getProblems.mockResolvedValue({
        problems: [MOCK_PROBLEMS[1]],
        meta: { page: 1, limit: 10, totalItems: 1, totalPages: 1 }
      });

      renderWithProviders(<ProblemsPage />);

      const diffSelect = screen.getByLabelText(/Filter by difficulty/i);
      fireEvent.change(diffSelect, { target: { value: 'Hard' } });

      await waitFor(() => {
        expect(problemService.getProblems).toHaveBeenCalledWith(
          expect.objectContaining({ difficulty: 'Hard' })
        );
      });
    });
  });

  describe('Problem Detail Page (ProblemDetailPage)', () => {
    it('displays title, difficulty, topic tags, problem statement, constraints, and workspace button', async () => {
      problemService.getProblemBySlug.mockResolvedValueOnce(MOCK_PROBLEMS[0]);

      renderWithProviders(
        <Routes>
          <Route path="/problems/:slug" element={<ProblemDetailPage />} />
        </Routes>,
        { initialEntries: ['/problems/two-sum'] }
      );

      // Title & difficulty
      expect(await screen.findByText('Two Sum')).toBeInTheDocument();
      expect(screen.getByText('Easy')).toBeInTheDocument();

      // Topic tags
      expect(screen.getByText('Arrays & Hashing')).toBeInTheDocument();
      expect(screen.getByText('Hash Table')).toBeInTheDocument();

      // Problem statement
      expect(screen.getByText(/Given an array of integers nums and an integer target/i)).toBeInTheDocument();

      // Constraints
      expect(screen.getByText('2 <= nums.length <= 10^4')).toBeInTheDocument();

      // Examples
      expect(screen.getAllByText(/nums = \[2,7,11,15\], target = 9/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Because 2 \+ 7 == 9/i)).toBeInTheDocument();

      // Button to open coding workspace
      expect(screen.getByRole('button', { name: /Open Coding Workspace/i })).toBeInTheDocument();

      // Supported languages dropdown
      expect(screen.getByLabelText(/Select programming language/i)).toBeInTheDocument();
    });

    it('displays error state and retry option if problem is not found', async () => {
      problemService.getProblemBySlug.mockRejectedValueOnce(new Error('Problem fetch failed'));

      renderWithProviders(
        <Routes>
          <Route path="/problems/:slug" element={<ProblemDetailPage />} />
        </Routes>,
        { initialEntries: ['/problems/unknown-problem'] }
      );

      expect(await screen.findByRole('heading', { name: /Problem Not Found/i })).toBeInTheDocument();
      expect(screen.getByText('Problem fetch failed')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Return to Catalogue/i })).toBeInTheDocument();
    });
  });

  describe('Admin Problem Management (AdminPage)', () => {
    const adminUser = { id: 'admin1', username: 'admin', email: 'admin@codearena.dev', role: 'admin' };

    it('lists all problems in admin table with publication status', async () => {
      problemService.getAdminProblems.mockResolvedValueOnce([
        {
          _id: 'p1',
          title: 'Two Sum',
          slug: 'two-sum',
          difficulty: 'Easy',
          topics: ['Arrays & Hashing'],
          publicationStatus: 'published'
        },
        {
          _id: 'p2',
          title: 'Draft Problem',
          slug: 'draft-problem',
          difficulty: 'Medium',
          topics: ['Trees'],
          publicationStatus: 'draft'
        }
      ]);

      renderWithProviders(<AdminPage />, { user: adminUser });

      expect(await screen.findByText('Two Sum')).toBeInTheDocument();
      expect(screen.getByText('Draft Problem')).toBeInTheDocument();
      expect(screen.getByText('published')).toBeInTheDocument();
      expect(screen.getByText('draft')).toBeInTheDocument();
    });

    it('toggles problem publication status', async () => {
      const prob = {
        _id: 'p1',
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'Easy',
        topics: ['Arrays & Hashing'],
        publicationStatus: 'published'
      };
      problemService.getAdminProblems.mockResolvedValueOnce([prob]);
      problemService.togglePublication.mockResolvedValueOnce({
        ...prob,
        publicationStatus: 'draft'
      });

      renderWithProviders(<AdminPage />, { user: adminUser });

      expect(await screen.findByText('Two Sum')).toBeInTheDocument();

      const toggleBtn = screen.getByLabelText(/Unpublish/i);
      fireEvent.click(toggleBtn);

      await waitFor(() => {
        expect(problemService.togglePublication).toHaveBeenCalledWith('p1', 'draft');
      });
    });

    it('opens create problem modal and submits new problem', async () => {
      problemService.getAdminProblems.mockResolvedValueOnce([]);
      problemService.createProblem.mockResolvedValueOnce({
        _id: 'p-new',
        title: 'Binary Search',
        slug: 'binary-search',
        difficulty: 'Easy',
        topics: ['Binary Search'],
        publicationStatus: 'published'
      });

      renderWithProviders(<AdminPage />, { user: adminUser });

      const createBtn = await screen.findByRole('button', { name: /Create Problem/i });
      fireEvent.click(createBtn);

      expect(screen.getByRole('heading', { name: /Create New Problem/i })).toBeInTheDocument();

      // Fill in required fields
      const titleInput = screen.getByLabelText(/Title \*/i);
      fireEvent.change(titleInput, { target: { value: 'Binary Search' } });

      const descInput = screen.getByLabelText(/Problem Statement \/ Description \*/i);
      fireEvent.change(descInput, { target: { value: 'Given a sorted array of integers nums...' } });

      const saveBtn = screen.getByRole('button', { name: /Save Problem/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(problemService.createProblem).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Binary Search',
            slug: 'binary-search',
            difficulty: 'Easy',
            description: 'Given a sorted array of integers nums...'
          })
        );
      });
    });
  });
});
