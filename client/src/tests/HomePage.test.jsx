import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { HomePage } from '../pages/HomePage/HomePage';
import { ProblemsPage } from '../pages/ProblemsPage/ProblemsPage';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

vi.mock('../services/problemService', () => ({
  problemService: {
    getProblems: vi.fn().mockResolvedValue({
      problems: [
        { id: '1', number: 1, title: 'Two Sum', slug: 'two-sum', difficulty: 'Easy', topics: ['Arrays'], acceptanceRate: 52, status: 'Solved' },
        { id: '2', number: 20, title: 'Valid Parentheses', slug: 'valid-parentheses', difficulty: 'Easy', topics: ['Stack'], acceptanceRate: 40, status: 'Solved' }
      ],
      meta: { page: 1, totalPages: 1, totalItems: 2, hasNextPage: false, hasPrevPage: false }
    })
  }
}));

describe('CodeArena Frontend Pages', () => {
  const mockHealthState = {
    health: {
      status: 'healthy',
      service: 'CodeArena API',
      version: '1.0.0',
      uptimeSeconds: 120,
      environment: 'development',
      database: {
        status: 'connected',
        readyState: 1
      }
    },
    loading: false,
    error: null,
    latencyMs: 12,
    lastChecked: new Date('2026-10-16T12:00:00Z'),
    refetch: () => {}
  };

  it('renders the HomePage with concise developer branding and problem catalogue link', () => {
    render(
      <BrowserRouter>
        <HomePage healthState={mockHealthState} />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Practice algorithmic problem solving/i);
    expect(screen.getByText(/Explore Problem Catalogue/i)).toBeInTheDocument();
    expect(screen.getByText(/Featured Problem/i)).toBeInTheDocument();
    expect(screen.getByText(/Two Sum/i)).toBeInTheDocument();
  });

  it('renders the ProblemsPage with filters and problem table', async () => {
    render(
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <ProblemsPage />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    );

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Problem Catalogue/i);
    expect(screen.getByPlaceholderText(/Search problems/i)).toBeInTheDocument();
    expect(await screen.findByText(/Two Sum/i)).toBeInTheDocument();
    expect(await screen.findByText(/Valid Parentheses/i)).toBeInTheDocument();
  });
});
