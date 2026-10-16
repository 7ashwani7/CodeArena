import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ThemeProvider } from '../context/ThemeContext';
import { LoginPage } from '../pages/LoginPage/LoginPage';
import { RegisterPage } from '../pages/RegisterPage/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage/DashboardPage';
import { ProfilePage } from '../pages/ProfilePage/ProfilePage';
import { NotFoundPage } from '../pages/NotFoundPage/NotFoundPage';
import { ProblemDetailPage } from '../pages/ProblemDetailPage/ProblemDetailPage';
import { AdminPage } from '../pages/AdminPage/AdminPage';
import { DEMO_USER } from '../context/AuthContext';

vi.mock('../services/problemService', () => ({
  problemService: {
    getProblemBySlug: vi.fn().mockResolvedValue({
      _id: 'p1',
      title: 'Two Sum',
      slug: 'two-sum',
      difficulty: 'Easy',
      topics: ['Arrays & Hashing', 'Hash Table'],
      description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      constraints: ['2 <= nums.length <= 10^4'],
      examples: [
        { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9, return [0, 1].' }
      ],
      starterCode: {
        javascript: 'function twoSum() {}'
      },
      status: 'Solved'
    }),
    getAdminProblems: vi.fn().mockResolvedValue([
      {
        _id: 'p1',
        title: 'Two Sum',
        slug: 'two-sum',
        difficulty: 'Easy',
        topics: ['Arrays & Hashing'],
        publicationStatus: 'published'
      }
    ])
  }
}));

vi.mock('../services/userService', () => ({
  userService: {
    getUserProgress: vi.fn().mockResolvedValue({
      overview: {
        totalSolved: 42,
        totalProblems: 150,
        solvedPercentage: 28.0,
        difficultyStats: {
          easy: { solved: 25, total: 60 },
          medium: { solved: 14, total: 65 },
          hard: { solved: 3, total: 25 }
        },
        submissions: {
          total: 60,
          accepted: 42,
          acceptanceRate: 70.0,
          formula: '(acceptedSubmissions / totalSubmissions) * 100'
        },
        bookmarkedCount: 5
      },
      topicProgress: [{ topic: 'Arrays & Hashing', solved: 10, total: 20, percentage: 50 }],
      activity: [],
      recentSubmissions: [
        {
          _id: 'sub-1',
          problemId: { _id: 'p1', title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy' },
          language: 'javascript',
          status: 'Accepted',
          executionTimeMs: 52,
          createdAt: '2026-10-15T12:00:00.000Z'
        }
      ]
    }),
    getUserProfile: vi.fn().mockResolvedValue({
      _id: 'usr_demo_101',
      username: 'alex_coder',
      name: 'Alex Chen',
      email: 'alex@codearena.dev',
      role: 'user',
      bio: 'Software engineer preparing for full-stack systems and algorithmic interviews.',
      targetRole: 'Full-Stack Software Engineer',
      createdAt: '2026-01-15T10:00:00.000Z'
    }),
    updateUserProfile: vi.fn().mockResolvedValue({
      name: 'Alex Chen',
      bio: 'Software engineer',
      targetRole: 'Full-Stack Software Engineer'
    })
  }
}));

function renderWithProviders(ui, { user = DEMO_USER, autoRestore = false } = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider initialUser={user} autoRestore={autoRestore}>
        <ToastProvider>
          <BrowserRouter>
            {ui}
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('Full Page Test Suites', () => {
  it('renders LoginPage and handles validation & demo sign in', () => {
    renderWithProviders(<LoginPage />, { user: null });

    expect(screen.getByRole('heading', { name: /Sign in to CodeArena/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/developer@example.com/i)).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /^Sign In$/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Email address or username is required/i)).toBeInTheDocument();

    const demoBtn = screen.getByRole('button', { name: /Sign In as User \(Alex Chen\)/i });
    expect(demoBtn).toBeInTheDocument();
  });

  it('renders RegisterPage and checks required validation fields', () => {
    renderWithProviders(<RegisterPage />, { user: null });

    expect(screen.getByRole('heading', { name: /Create your account/i })).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText(/Full name is required/i)).toBeInTheDocument();
  });

  it('renders DashboardPage with metrics and topic proficiency', async () => {
    renderWithProviders(<DashboardPage />);

    expect(await screen.findByRole('heading', { name: /Developer Dashboard/i })).toBeInTheDocument();
    expect(await screen.findByText(/Unique Solved/i)).toBeInTheDocument();
    expect(await screen.findByText(/Arrays & Hashing/i)).toBeInTheDocument();
    expect(await screen.findByText(/Recent Submissions/i)).toBeInTheDocument();
  });

  it('renders ProfilePage and opens edit modal', async () => {
    renderWithProviders(<ProfilePage />);

    expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent(/Alex Chen/i);
    expect(screen.getByText(/Submission Activity Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Solved Challenges/i)).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: /Edit Profile/i });
    fireEvent.click(editBtn);

    expect(screen.getByRole('heading', { name: /Edit Profile Information/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('renders ProblemDetailPage with problem specs, tabs, and testcase drawer', async () => {
    renderWithProviders(<ProblemDetailPage />);

    expect(await screen.findByText(/Two Sum/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Description/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Submissions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Hints/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('renders custom NotFoundPage with navigation buttons', () => {
    renderWithProviders(<NotFoundPage />);

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Page Not Found/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Problem Catalogue/i })).toBeInTheDocument();
  });

  it('renders AdminPage and verifies admin session details', async () => {
    const adminUser = {
      ...DEMO_USER,
      username: 'sysadmin',
      email: 'admin@codearena.dev',
      role: 'admin'
    };
    renderWithProviders(<AdminPage />, { user: adminUser });

    expect(await screen.findByRole('heading', { name: /Administration/i })).toBeInTheDocument();
    expect(screen.getByText('sysadmin')).toBeInTheDocument();
    expect(screen.getByText('admin@codearena.dev')).toBeInTheDocument();
  });
});

