import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProblemDetailPage } from '../pages/ProblemDetailPage/ProblemDetailPage';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ThemeProvider } from '../context/ThemeContext';
import { problemService } from '../services/problemService';
import { submissionService } from '../services/submissionService';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }) => (
    <textarea
      data-testid="mock-monaco-editor"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}));

vi.mock('../services/problemService', () => ({
  problemService: {
    getProblemBySlug: vi.fn()
  }
}));

vi.mock('../services/submissionService', () => ({
  submissionService: {
    runCode: vi.fn(),
    submitCode: vi.fn(),
    getMySubmissions: vi.fn().mockResolvedValue({ submissions: [], meta: {} })
  }
}));

const MOCK_PROBLEM = {
  _id: 'p1',
  id: 'p1',
  title: 'Two Sum',
  slug: 'two-sum',
  difficulty: 'Easy',
  topics: ['Arrays & Hashing'],
  description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
  constraints: ['2 <= nums.length <= 10^4'],
  examples: [
    { input: '[2,7,11,15]\n9', output: '[0,1]', explanation: 'Because 2 + 7 == 9' }
  ],
  starterCode: {
    javascript: 'function twoSum(nums, target) {\n  return [];\n}',
    python: 'class Solution:\n    def twoSum(self, nums, target):\n        return []'
  }
};

const DEMO_AUTH_USER = {
  id: 'u1',
  username: 'alexchen',
  email: 'alex@codearena.dev',
  role: 'user'
};

function renderWorkspace({ user = DEMO_AUTH_USER } = {}) {
  return render(
    <ThemeProvider>
      <AuthProvider initialUser={user} autoRestore={false}>
        <ToastProvider>
          <MemoryRouter initialEntries={['/problems/two-sum']}>
            <Routes>
              <Route path="/problems/:slug" element={<ProblemDetailPage />} />
            </Routes>
          </MemoryRouter>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

describe('Coding Workspace & Submission Workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    problemService.getProblemBySlug.mockResolvedValue(MOCK_PROBLEM);
  });

  it('renders Monaco editor side by side with problem specification', async () => {
    renderWorkspace();

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();
    expect(screen.getByText(/Given an array of integers nums and an integer target/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-monaco-editor')).toBeInTheDocument();
    expect(screen.getByLabelText(/Select programming language/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Run Code/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Submit/i })).toBeInTheDocument();
  });

  it('switches programming language and updates starter code template', async () => {
    renderWorkspace();

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();
    const editor = screen.getByTestId('mock-monaco-editor');
    expect(editor.value).toContain('function twoSum');

    // Switch to Python 3
    const langSelect = screen.getByLabelText(/Select programming language/i);
    fireEvent.change(langSelect, { target: { value: 'python' } });

    expect(editor.value).toContain('class Solution');
  });

  it('handles Run Code action and displays sample test results separately', async () => {
    submissionService.runCode.mockResolvedValueOnce({
      status: 'Accepted',
      executionTimeMs: 42,
      memoryUsageKb: 41200,
      testCases: [
        {
          testCaseIndex: 1,
          input: '[2,7,11,15]\n9',
          expectedOutput: '[0,1]',
          actualOutput: '[0,1]',
          status: 'Accepted',
          passed: true,
          timeMs: 42
        }
      ]
    });

    renderWorkspace();

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();

    const runBtn = screen.getByRole('button', { name: /Run Code/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(submissionService.runCode).toHaveBeenCalledWith({
        problemId: 'p1',
        language: 'javascript',
        sourceCode: expect.stringContaining('function twoSum')
      });
    });

    // Check Run Result tab view
    expect(await screen.findByText('Run Result (Accepted)')).toBeInTheDocument();
    expect(screen.getByText('42 ms')).toBeInTheDocument();
    expect(screen.getAllByText('[0,1]').length).toBeGreaterThanOrEqual(1);
  });

  it('handles Submit Code action and displays final judged verdict and test case counts', async () => {
    submissionService.submitCode.mockResolvedValueOnce({
      id: 'sub-1',
      problemId: 'p1',
      problemSlug: 'two-sum',
      language: 'javascript',
      status: 'Accepted',
      testCaseCounts: { passed: 4, total: 4 },
      executionTimeMs: 48,
      memoryUsageKb: 42000,
      safeErrorDetails: null,
      createdAt: new Date().toISOString()
    });

    renderWorkspace();

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submissionService.submitCode).toHaveBeenCalledWith({
        problemId: 'p1',
        language: 'javascript',
        sourceCode: expect.stringContaining('function twoSum')
      });
    });

    // Judged result view
    expect(await screen.findByText('Submission Result (Accepted)')).toBeInTheDocument();
    expect(screen.getByText(/4 \/ 4 test cases passed/i)).toBeInTheDocument();
    expect(screen.getByText('48 ms')).toBeInTheDocument();
  });

  it('prevents duplicate submissions while an operation is in progress', async () => {
    let resolveSubmit;
    submissionService.submitCode.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        })
    );

    renderWorkspace();

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Submit/i });
    const runBtn = screen.getByRole('button', { name: /Run Code/i });

    fireEvent.click(submitBtn);

    // Both buttons should be disabled during in-flight submission
    expect(submitBtn).toBeDisabled();
    expect(runBtn).toBeDisabled();

    // Resolve submission
    resolveSubmit({
      id: 'sub-1',
      problemId: 'p1',
      language: 'javascript',
      status: 'Accepted',
      testCaseCounts: { passed: 4, total: 4 },
      executionTimeMs: 40
    });

    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
      expect(runBtn).not.toBeDisabled();
    });
  });

  it('displays clear configuration error when external judging service is unconfigured', async () => {
    const error = new Error('Judging service is not configured.');
    // @ts-ignore
    error.code = 'JUDGE_SERVICE_NOT_CONFIGURED';
    submissionService.runCode.mockRejectedValueOnce(error);

    renderWorkspace();

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();

    const runBtn = screen.getByRole('button', { name: /Run Code/i });
    fireEvent.click(runBtn);

    expect(await screen.findByText(/External Judging Service Not Configured/i)).toBeInTheDocument();
  });

  it('fetches and displays real user submission history in Submissions tab', async () => {
    submissionService.getMySubmissions.mockResolvedValueOnce({
      submissions: [
        {
          _id: 's1',
          status: 'Accepted',
          executionTimeMs: 45,
          language: 'javascript',
          createdAt: new Date().toISOString()
        },
        {
          _id: 's2',
          status: 'Wrong Answer',
          executionTimeMs: 50,
          language: 'python',
          createdAt: new Date().toISOString()
        }
      ],
      meta: { totalItems: 2 }
    });

    renderWorkspace();

    expect(await screen.findByText('Two Sum')).toBeInTheDocument();

    // Click Submissions tab
    const subTab = screen.getByRole('tab', { name: /Submissions/i });
    fireEvent.click(subTab);

    expect(await screen.findByText('Accepted')).toBeInTheDocument();
    expect(screen.getByText('Wrong Answer')).toBeInTheDocument();
    expect(screen.getByText('45 ms')).toBeInTheDocument();
  });
});
