import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import {
  ChevronLeft,
  RotateCcw,
  Play,
  Check,
  FileText,
  History,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Cpu,
  Code2,
  AlertCircle,
  RefreshCw,
  Terminal,
  ShieldAlert,
  Bookmark
} from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Select } from '../../components/common/Select/Select';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { problemService } from '../../services/problemService';
import { submissionService } from '../../services/submissionService';
import { userService } from '../../services/userService';
import styles from './ProblemDetailPage.module.css';

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript (Node.js)' },
  { value: 'python', label: 'Python 3' },
  { value: 'cpp', label: 'C++ (g++)' },
  { value: 'java', label: 'Java (OpenJDK)' }
];

export function ProblemDetailPage() {
  const { slug } = useParams();
  const effectiveSlug = slug || 'two-sum';
  const toast = useToast();
  const { theme } = useTheme();
  const { user } = useAuth();
  const editorContainerRef = useRef(null);

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Active tab in left panel
  const [activeTab, setActiveTab] = useState('description');

  // Editor states
  const [language, setLanguage] = useState('javascript');
  const [customCodes, setCustomCodes] = useState({});

  // Runner & judging states
  const [drawerTab, setDrawerTab] = useState('testcase'); // 'testcase' | 'runResult' | 'submissionResult'
  const [activeSampleCase, setActiveSampleCase] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [judgeConfigError, setJudgeConfigError] = useState(null);

  // Submissions history state
  const [mySubmissions, setMySubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  const fetchProblem = async (problemSlug) => {
    setLoading(true);
    setError(null);
    try {
      const data = await problemService.getProblemBySlug(problemSlug);
      setProblem(data);
      setIsBookmarked(Boolean(data.isBookmarked));
    } catch (err) {
      setError(err.message || 'Failed to load problem');
      setProblem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = async () => {
    if (!user) {
      toast.info('Please sign in to bookmark problems');
      return;
    }
    const problemId = problem?._id || problem?.id;
    if (!problemId) return;

    setIsBookmarked((prev) => !prev);
    try {
      const res = await userService.toggleBookmark(problemId);
      setIsBookmarked(res.bookmarked);
      if (res.bookmarked) {
        toast.success('Problem bookmarked');
      } else {
        toast.info('Bookmark removed');
      }
    } catch {
      setIsBookmarked((prev) => !prev);
      toast.error('Failed to update bookmark');
    }
  };

  const loadSubmissions = useCallback(async () => {
    if (!user || !problem) return;
    setSubmissionsLoading(true);
    try {
      const { submissions } = await submissionService.getMySubmissions({
        problemId: problem._id || problem.id
      });
      setMySubmissions(submissions);
    } catch {
      // Submissions history fetch error handled silently
    } finally {
      setSubmissionsLoading(false);
    }
  }, [user, problem]);

  useEffect(() => {
    fetchProblem(effectiveSlug);
  }, [effectiveSlug]);

  useEffect(() => {
    if (activeTab === 'submissions' && problem && user) {
      loadSubmissions();
    }
  }, [activeTab, problem, user, loadSubmissions]);

  // Derived code
  const codeKey = problem ? `${problem._id || problem.id || problem.slug}_${language}` : '';
  const currentCode = problem
    ? customCodes[codeKey] ?? (problem.starterCode?.[language] || '')
    : '';

  const handleCodeChange = (val) => {
    if (!codeKey) return;
    setCustomCodes((prev) => ({
      ...prev,
      [codeKey]: val || ''
    }));
  };

  const handleResetCode = () => {
    if (!problem || !codeKey) return;
    setCustomCodes((prev) => ({
      ...prev,
      [codeKey]: problem.starterCode?.[language] || ''
    }));
    toast.info('Starter template restored');
  };

  const scrollToWorkspace = () => {
    if (editorContainerRef.current) {
      editorContainerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Sample test cases derived from problem specification
  const sampleTestCases = problem?.examples?.length
    ? problem.examples.map((ex) => ({
        input: ex.input,
        expectedOutput: ex.output
      }))
    : [{ input: 'nums = [2,7,11,15], target = 9', expectedOutput: '[0,1]' }];

  /**
   * Run code against public sample test cases (No permanent submission record created)
   */
  const handleRunCode = async () => {
    if (isRunning || isSubmitting) return;

    if (!user) {
      toast.error('Authentication is required to run solutions. Please sign in.');
      return;
    }

    setIsRunning(true);
    setJudgeConfigError(null);

    try {
      const result = await submissionService.runCode({
        problemId: problem._id || problem.id || problem.slug,
        language,
        sourceCode: currentCode
      });

      setRunResult(result);
      setDrawerTab('runResult');

      if (result.status === 'Accepted') {
        toast.success('Sample test cases passed');
      } else {
        toast.error(`Sample run: ${result.status}`);
      }
    } catch (err) {
      if (err.code === 'JUDGE_SERVICE_NOT_CONFIGURED') {
        setJudgeConfigError(err.message);
        setDrawerTab('runResult');
        toast.error('Judging service is not configured');
      } else {
        toast.error(err.message || 'Run execution failed');
      }
    } finally {
      setIsRunning(false);
    }
  };

  /**
   * Submit code for formal judging against the full test suite (including hidden test cases)
   */
  const handleSubmit = async () => {
    if (isRunning || isSubmitting) return;

    if (!user) {
      toast.error('Authentication is required to submit solutions. Please sign in.');
      return;
    }

    setIsSubmitting(true);
    setJudgeConfigError(null);

    try {
      const result = await submissionService.submitCode({
        problemId: problem._id || problem.id || problem.slug,
        language,
        sourceCode: currentCode
      });

      setSubmissionResult(result);
      setDrawerTab('submissionResult');

      if (result.status === 'Accepted') {
        toast.success(`Verdict: Accepted (${result.executionTimeMs}ms)`);
        // Refresh problem user progress and submission list
        setProblem((prev) => ({
          ...prev,
          userProgress: { solvedAt: new Date() },
          status: 'Solved'
        }));
        loadSubmissions();
      } else {
        toast.error(
          `Verdict: ${result.status} (${result.testCaseCounts.passed}/${result.testCaseCounts.total} passed)`
        );
      }
    } catch (err) {
      if (err.code === 'JUDGE_SERVICE_NOT_CONFIGURED') {
        setJudgeConfigError(err.message);
        setDrawerTab('submissionResult');
        toast.error('Judging service is not configured');
      } else {
        toast.error(err.message || 'Submission failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRef = useRef(handleSubmit);
  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  // Handle Ctrl+Enter (or Cmd+Enter on Mac) keyboard shortcut for submitting
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmitRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleEditorMount = (editor, monaco) => {
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleSubmitRef.current();
    });
  };

  // Loading State
  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.topNav}>
          <div className={styles.titleArea}>
            <Link to="/problems" className={styles.backBtn}>
              <ChevronLeft size={16} />
              <span>Problem List</span>
            </Link>
          </div>
        </div>
        <div className={styles.centerState}>
          <div
            className={styles.skeletonBar}
            style={{ width: '220px', height: '24px', marginBottom: '1rem' }}
          />
          <div
            className={styles.skeletonBar}
            style={{ width: '380px', height: '16px', marginBottom: '0.75rem' }}
          />
          <div
            className={styles.skeletonBar}
            style={{ width: '300px', height: '16px', marginBottom: '2rem' }}
          />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Loading problem specification...
          </p>
        </div>
      </div>
    );
  }

  // Error State / Problem Not Found
  if (error || !problem) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.topNav}>
          <div className={styles.titleArea}>
            <Link to="/problems" className={styles.backBtn}>
              <ChevronLeft size={16} />
              <span>Problem List</span>
            </Link>
          </div>
        </div>
        <div className={styles.centerState}>
          <AlertCircle size={44} color="var(--color-danger)" className={styles.centerIcon} />
          <h2 className={styles.centerTitle}>Problem Not Found</h2>
          <p className={styles.centerText}>
            {error || `Unable to load problem "${slug}". The problem might be unlisted or removed.`}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="outline"
              icon={<RefreshCw size={14} />}
              onClick={() => fetchProblem(slug)}
            >
              Retry
            </Button>
            <Link to="/problems">
              <Button variant="primary">Return to Catalogue</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isSolved = problem.userProgress?.solvedAt || problem.status === 'Solved';

  return (
    <div className={styles.pageContainer}>
      {/* Top Workspace Navigation */}
      <div className={styles.topNav}>
        <div className={styles.titleArea}>
          <Link to="/problems" className={styles.backBtn}>
            <ChevronLeft size={16} />
            <span>Problem List</span>
          </Link>

          <span style={{ color: 'var(--border-muted)' }}>|</span>

          <div className={styles.problemHeading}>
            <h1 style={{ fontSize: 'inherit', fontWeight: 'inherit', margin: 0, display: 'inline', color: 'inherit' }}>
              {problem.title}
            </h1>
            <Badge variant={problem.difficulty.toLowerCase()}>{problem.difficulty}</Badge>
            {isSolved && <Badge variant="easy">Solved</Badge>}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            className={styles.workspaceLinkBtn}
            onClick={handleToggleBookmark}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
            title={isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
            style={{
              color: isBookmarked ? 'var(--accent-primary)' : 'var(--text-secondary)'
            }}
          >
            <Bookmark size={13} fill={isBookmarked ? 'currentColor' : 'none'} />
            <span>{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>

          <button
            type="button"
            className={styles.workspaceLinkBtn}
            onClick={scrollToWorkspace}
            title="Jump to coding workspace"
          >
            <Code2 size={13} />
            <span>Open Coding Workspace</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className={styles.splitWorkspace}>
        {/* Left Pane: Spec & Problem Details */}
        <div className={styles.leftPanel}>
          <div className={styles.tabBar} role="tablist">
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'description' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('description')}
              role="tab"
              aria-selected={activeTab === 'description'}
            >
              <FileText size={14} />
              <span>Description</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'submissions' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('submissions')}
              role="tab"
              aria-selected={activeTab === 'submissions'}
            >
              <History size={14} />
              <span>Submissions {mySubmissions.length > 0 && `(${mySubmissions.length})`}</span>
            </button>

            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === 'hints' ? styles.tabBtnActive : ''}`}
              onClick={() => setActiveTab('hints')}
              role="tab"
              aria-selected={activeTab === 'hints'}
            >
              <Lightbulb size={14} />
              <span>Hints</span>
            </button>
          </div>

          <div className={styles.panelScroll}>
            {activeTab === 'description' && (
              <>
                {/* Topic tags */}
                {problem.topics && problem.topics.length > 0 && (
                  <div className={styles.topicsContainer} aria-label="Problem topics">
                    {problem.topics.map((topic, idx) => (
                      <span key={idx} className={styles.topicTag}>
                        {topic}
                      </span>
                    ))}
                  </div>
                )}

                {/* Problem statement / description */}
                <div className={styles.descriptionText}>{problem.description}</div>

                {/* Examples */}
                {problem.examples && problem.examples.length > 0 && (
                  <>
                    <div className={styles.sectionTitle}>Examples</div>
                    {problem.examples.map((ex, idx) => (
                      <div key={idx} className={styles.exampleCard}>
                        <div className={styles.exampleHeading}>Example {idx + 1}:</div>
                        <div className={styles.exampleRow}>
                          <span className={styles.exampleLabel}>Input: </span>
                          <span className={styles.exampleValue}>{ex.input}</span>
                        </div>
                        <div className={styles.exampleRow}>
                          <span className={styles.exampleLabel}>Output: </span>
                          <span className={styles.exampleValue}>{ex.output}</span>
                        </div>
                        {ex.explanation && (
                          <div
                            className={styles.exampleRow}
                            style={{ marginTop: '0.35rem', color: 'var(--text-secondary)' }}
                          >
                            <span className={styles.exampleLabel}>Explanation: </span>
                            <span>{ex.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {/* Constraints */}
                {problem.constraints && problem.constraints.length > 0 && (
                  <>
                    <div className={styles.sectionTitle}>Constraints</div>
                    <ul className={styles.constraintsList}>
                      {problem.constraints.map((c, i) => (
                        <li key={i}>
                          <code>{c}</code>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}

            {activeTab === 'submissions' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Submission History
                  </h4>
                  {user && (
                    <Button
                      variant="ghost"
                      size="sm"
                      icon={<RefreshCw size={12} />}
                      loading={submissionsLoading}
                      onClick={loadSubmissions}
                    >
                      Refresh
                    </Button>
                  )}
                </div>

                {!user ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    Sign in to view your submission logs and track problem solve history.
                  </p>
                ) : submissionsLoading ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    Loading submission history...
                  </p>
                ) : mySubmissions.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    No submissions recorded yet for this problem. Use the Submit button on the right to test your solution!
                  </p>
                ) : (
                  <div className={styles.submissionsList}>
                    {mySubmissions.map((sub) => {
                      const isAcc = sub.status === 'Accepted';
                      return (
                        <div key={sub._id || sub.id} className={styles.submissionItem}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isAcc ? (
                              <CheckCircle2 size={16} color="var(--color-easy)" />
                            ) : (
                              <XCircle size={16} color="var(--color-hard)" />
                            )}
                            <span
                              style={{
                                fontWeight: 600,
                                color: isAcc ? 'var(--color-easy)' : 'var(--color-hard)'
                              }}
                            >
                              {sub.status}
                            </span>
                          </div>

                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                            {sub.executionTimeMs != null ? `${sub.executionTimeMs} ms` : '—'}
                          </span>

                          <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>
                            {sub.language}
                          </span>

                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                            {new Date(sub.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'hints' && (
              <div>
                <h4 style={{ fontSize: '0.9375rem', marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
                  Problem Hints
                </h4>
                <div
                  style={{
                    padding: '0.875rem',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    color: 'var(--text-secondary)'
                  }}
                >
                  Analyze the problem constraints and identify what edge cases exist. Can you optimize from brute-force using an auxiliary data structure?
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: Monaco Code Workspace & Runner */}
        <div className={styles.rightPanel} ref={editorContainerRef} id="coding-workspace">
          {/* Editor Header Toolbar */}
          <div className={styles.editorHeader}>
            <div className={styles.editorControls}>
              <Select
                options={SUPPORTED_LANGUAGES}
                value={language}
                onChange={(e) => {
                  setLanguage(e.target.value);
                  setRunResult(null);
                  setSubmissionResult(null);
                  setJudgeConfigError(null);
                }}
                style={{ height: '28px', fontSize: '0.8125rem' }}
                aria-label="Select programming language"
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw size={12} />}
              onClick={handleResetCode}
              title="Reset code template"
            >
              Reset
            </Button>
          </div>

          {/* Monaco Editor Canvas */}
          <div className={styles.editorBody}>
            <Editor
              height="100%"
              onMount={handleEditorMount}
              language={
                language === 'cpp'
                  ? 'cpp'
                  : language === 'python'
                  ? 'python'
                  : language === 'java'
                  ? 'java'
                  : 'javascript'
              }
              value={currentCode}
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                cursorBlinking: 'smooth',
                padding: { top: 12, bottom: 12 }
              }}
            />
          </div>

          {/* Bottom Runner Drawer */}
          <div className={styles.runnerDrawer}>
            {/* Top Drawer Tab Bar */}
            <div className={styles.drawerTabList}>
              <button
                type="button"
                className={`${styles.drawerTabItem} ${drawerTab === 'testcase' ? styles.drawerTabItemActive : ''}`}
                onClick={() => setDrawerTab('testcase')}
              >
                Sample Testcases
              </button>
              <button
                type="button"
                className={`${styles.drawerTabItem} ${drawerTab === 'runResult' ? styles.drawerTabItemActive : ''}`}
                onClick={() => setDrawerTab('runResult')}
              >
                Run Result {runResult && `(${runResult.status})`}
              </button>
              <button
                type="button"
                className={`${styles.drawerTabItem} ${drawerTab === 'submissionResult' ? styles.drawerTabItemActive : ''}`}
                onClick={() => setDrawerTab('submissionResult')}
              >
                Submission Result {submissionResult && `(${submissionResult.status})`}
              </button>
            </div>

            {/* Drawer Body */}
            <div className={styles.runnerContent}>
              {/* Unconfigured Judge0 Error Banner */}
              {judgeConfigError && (
                <div className={styles.configErrorBanner} role="alert">
                  <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>External Judging Service Not Configured</strong>
                    <div>{judgeConfigError}</div>
                  </div>
                </div>
              )}

              {/* View 1: Sample Test Cases Input Inspector */}
              {drawerTab === 'testcase' && (
                <div>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    {sampleTestCases.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`${styles.testcaseTabBtn} ${activeSampleCase === i ? styles.testcaseTabBtnActive : ''}`}
                        onClick={() => setActiveSampleCase(i)}
                      >
                        Case {i + 1}
                      </button>
                    ))}
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Input:</div>
                    <div className={styles.codeBox}>
                      {sampleTestCases[activeSampleCase]?.input || ''}
                    </div>

                    <div style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0.25rem' }}>
                      Expected Output:
                    </div>
                    <div className={styles.codeBox}>
                      {sampleTestCases[activeSampleCase]?.expectedOutput || ''}
                    </div>
                  </div>
                </div>
              )}

              {/* View 2: Sample Test Run Results */}
              {drawerTab === 'runResult' && (
                <div>
                  {isRunning ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                      <Terminal size={16} className="animate-spin" />
                      <span>Executing code against sample test cases...</span>
                    </div>
                  ) : !runResult ? (
                    <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>
                      Click "Run Code" to test your solution against visible test cases.
                    </div>
                  ) : (
                    <div className={styles.resultCard}>
                      <div className={styles.verdictHeader}>
                        <div
                          className={`${styles.verdictStatus} ${
                            runResult.status === 'Accepted'
                              ? styles.statusAccepted
                              : styles.statusFailed
                          }`}
                        >
                          {runResult.status === 'Accepted' ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <XCircle size={18} />
                          )}
                          <span>{runResult.status}</span>
                        </div>

                        <div className={styles.metricChips}>
                          <span className={styles.metricChip}>
                            <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            {runResult.executionTimeMs} ms
                          </span>
                          <span className={styles.metricChip}>
                            <Cpu size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            {Math.round((runResult.memoryUsageKb || 0) / 1024)} MB
                          </span>
                        </div>
                      </div>

                      {runResult.compileOutput && (
                        <div>
                          <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                            Compilation Error:
                          </div>
                          <div className={styles.errorBox}>{runResult.compileOutput}</div>
                        </div>
                      )}

                      {runResult.errorDetails && (
                        <div>
                          <div style={{ color: 'var(--color-danger)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                            Runtime Error / stderr:
                          </div>
                          <div className={styles.errorBox}>{runResult.errorDetails}</div>
                        </div>
                      )}

                      {runResult.testCases && runResult.testCases.length > 0 && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                            {runResult.testCases.map((tc, idx) => (
                              <button
                                key={idx}
                                type="button"
                                className={`${styles.testcaseTabBtn} ${activeSampleCase === idx ? styles.testcaseTabBtnActive : ''}`}
                                onClick={() => setActiveSampleCase(idx)}
                              >
                                Case {idx + 1} {tc.passed ? '✓' : '✗'}
                              </button>
                            ))}
                          </div>

                          {runResult.testCases[activeSampleCase] && (
                            <div className={styles.diffGrid}>
                              <div>
                                <div className={styles.diffLabel}>Input:</div>
                                <div className={styles.codeBox}>
                                  {runResult.testCases[activeSampleCase].input}
                                </div>
                              </div>
                              <div>
                                <div className={styles.diffLabel}>Actual Output:</div>
                                <div className={styles.codeBox}>
                                  {runResult.testCases[activeSampleCase].actualOutput}
                                </div>
                              </div>
                              <div>
                                <div className={styles.diffLabel}>Expected Output:</div>
                                <div className={styles.codeBox}>
                                  {runResult.testCases[activeSampleCase].expectedOutput}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* View 3: Final Judged Submission Results */}
              {drawerTab === 'submissionResult' && (
                <div>
                  {isSubmitting ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-muted)', padding: '1rem 0' }}>
                      <Terminal size={16} />
                      <span>Judging solution against full test suite...</span>
                    </div>
                  ) : !submissionResult ? (
                    <div style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>
                      Click "Submit" to judge your solution against all hidden and visible test cases.
                    </div>
                  ) : (
                    <div className={styles.resultCard}>
                      <div className={styles.verdictHeader}>
                        <div
                          className={`${styles.verdictStatus} ${
                            submissionResult.status === 'Accepted'
                              ? styles.statusAccepted
                              : styles.statusFailed
                          }`}
                        >
                          {submissionResult.status === 'Accepted' ? (
                            <CheckCircle2 size={18} />
                          ) : (
                            <XCircle size={18} />
                          )}
                          <span>{submissionResult.status}</span>
                        </div>

                        <div className={styles.metricChips}>
                          <span className={styles.metricChip}>
                            {submissionResult.testCaseCounts.passed} / {submissionResult.testCaseCounts.total} test cases passed
                          </span>
                          <span className={styles.metricChip}>
                            <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            {submissionResult.executionTimeMs} ms
                          </span>
                          <span className={styles.metricChip}>
                            <Cpu size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            {Math.round((submissionResult.memoryUsageKb || 0) / 1024)} MB
                          </span>
                        </div>
                      </div>

                      {submissionResult.safeErrorDetails && (
                        <div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem' }}>
                            Details:
                          </div>
                          <div className={styles.errorBox}>
                            {submissionResult.safeErrorDetails}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Execution Action Buttons */}
            <div className={styles.runnerActions}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Press <strong>Ctrl + Enter</strong> to submit
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Play size={13} />}
                  loading={isRunning}
                  disabled={isRunning || isSubmitting}
                  onClick={handleRunCode}
                >
                  Run Code
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  icon={<Check size={13} />}
                  loading={isSubmitting}
                  disabled={isRunning || isSubmitting}
                  onClick={handleSubmit}
                >
                  Submit
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
