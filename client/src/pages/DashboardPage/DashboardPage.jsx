import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  CheckCircle2,
  TrendingUp,
  Code2,
  ArrowRight,
  Bookmark,
  History,
  LayoutDashboard,
  Calendar,
  AlertCircle,
  RefreshCw,
  Trash2,
  XCircle,
  Clock,
  Filter
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import { submissionService } from '../../services/submissionService';
import styles from './DashboardPage.module.css';

/**
 * Format ISO date string into readable local timestamp
 */
function formatDateTime(isoString) {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * Custom dark tooltip for Recharts activity chart
 */
function CustomChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const total = payload[0]?.value || 0;
    const accepted = payload[1]?.value || 0;
    return (
      <div
        style={{
          backgroundColor: 'var(--bg-surface, #1e293b)',
          border: '1px solid var(--border-subtle, #334155)',
          borderRadius: 'var(--radius-sm, 6px)',
          padding: '0.5rem 0.75rem',
          fontSize: '0.75rem',
          color: 'var(--text-primary, #f8fafc)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{label}</div>
        <div style={{ color: 'var(--accent-text, #38bdf8)' }}>Total Submissions: {total}</div>
        <div style={{ color: 'var(--color-easy, #22c55e)' }}>Accepted: {accepted}</div>
      </div>
    );
  }
  return null;
}

export function DashboardPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'history' | 'bookmarks'

  // Progress overview data state
  const [progressData, setProgressData] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressError, setProgressError] = useState(null);

  // Submissions history state
  const [historySubmissions, setHistorySubmissions] = useState([]);
  const [historyMeta, setHistoryMeta] = useState({ page: 1, limit: 15, totalItems: 0, totalPages: 1 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFilters, setHistoryFilters] = useState({
    status: '',
    language: '',
    startDate: '',
    endDate: '',
    page: 1
  });

  // Bookmarks state
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksMeta, setBookmarksMeta] = useState({ page: 1, limit: 20, totalItems: 0, totalPages: 1 });
  const [bookmarksLoading, setBookmarksLoading] = useState(false);

  // Fetch aggregate progress data
  const loadProgress = useCallback(async () => {
    setLoadingProgress(true);
    setProgressError(null);
    try {
      const data = await userService.getUserProgress();
      setProgressData(data);
    } catch (err) {
      setProgressError(err.message || 'Failed to load progress metrics');
    } finally {
      setLoadingProgress(false);
    }
  }, []);

  // Fetch paginated submission history with filters
  const loadHistory = useCallback(async (filters = historyFilters) => {
    setHistoryLoading(true);
    try {
      const { submissions, meta } = await submissionService.getMySubmissions({
        status: filters.status || undefined,
        language: filters.language || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        page: filters.page || 1,
        limit: 15
      });
      setHistorySubmissions(submissions);
      setHistoryMeta(meta);
    } catch (err) {
      toast.error(err.message || 'Failed to load submissions history');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyFilters, toast]);

  // Fetch bookmarks
  const loadBookmarks = useCallback(async (page = 1) => {
    setBookmarksLoading(true);
    try {
      const { bookmarks: items, meta } = await userService.getBookmarks({ page, limit: 20 });
      setBookmarks(items);
      setBookmarksMeta(meta);
    } catch (err) {
      toast.error(err.message || 'Failed to load bookmarks');
    } finally {
      setBookmarksLoading(false);
    }
  }, [toast]);

  // Initial progress load
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Tab switch effect
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    } else if (activeTab === 'bookmarks') {
      loadBookmarks();
    }
  }, [activeTab, loadHistory, loadBookmarks]);

  // Handle removing a bookmark
  const handleRemoveBookmark = async (problemId) => {
    try {
      await userService.removeBookmark(problemId);
      setBookmarks((prev) => prev.filter((b) => b.problem._id !== problemId));
      toast.info('Bookmark removed');
      // Refresh count in progress overview if available
      setProgressData((prev) =>
        prev
          ? {
              ...prev,
              overview: {
                ...prev.overview,
                bookmarkedCount: Math.max(0, (prev.overview?.bookmarkedCount || 1) - 1)
              }
            }
          : prev
      );
    } catch (err) {
      toast.error(err.message || 'Failed to remove bookmark');
    }
  };

  const handleFilterChange = (key, value) => {
    const updated = { ...historyFilters, [key]: value, page: 1 };
    setHistoryFilters(updated);
    loadHistory(updated);
  };

  const handleResetHistoryFilters = () => {
    const reset = { status: '', language: '', startDate: '', endDate: '', page: 1 };
    setHistoryFilters(reset);
    loadHistory(reset);
  };

  const overview = progressData?.overview || {
    totalSolved: 0,
    totalProblems: 0,
    solvedPercentage: 0.0,
    difficultyStats: {
      easy: { solved: 0, total: 0 },
      medium: { solved: 0, total: 0 },
      hard: { solved: 0, total: 0 }
    },
    submissions: {
      total: 0,
      accepted: 0,
      acceptanceRate: 0.0,
      formula: '(acceptedSubmissions / totalSubmissions) * 100'
    },
    bookmarkedCount: 0
  };

  const easyStats = overview.difficultyStats?.easy || overview.difficultyBreakdown?.easy || { solved: 0, total: 0 };
  const mediumStats = overview.difficultyStats?.medium || overview.difficultyBreakdown?.medium || { solved: 0, total: 0 };
  const hardStats = overview.difficultyStats?.hard || overview.difficultyBreakdown?.hard || { solved: 0, total: 0 };

  const topicProgress = progressData?.topicProgress || [];
  const activityData = progressData?.activity || [];
  const recentSubmissions = progressData?.recentSubmissions || [];

  return (
    <div className={styles.container}>
      {/* Welcome Card & Profile Summary */}
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeInfo}>
          <h1>Developer Dashboard</h1>
          <p>
            Welcome back, <strong>{user?.name || user?.username || 'Engineer'}</strong> (@{user?.username}).
            Target Role: <strong>{user?.targetRole || 'Software Engineer'}</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link to="/problems">
            <Button variant="primary" icon={<Code2 size={15} />}>
              Solve Problems
            </Button>
          </Link>
          <Link to="/profile">
            <Button variant="outline" size="sm">
              View Profile
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className={styles.tabNav} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'overview'}
          className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <LayoutDashboard size={15} />
          <span>Progress & Analytics</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'history'}
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={15} />
          <span>Submission History</span>
          {overview.submissions.total > 0 && (
            <span className={styles.tabBadge}>{overview.submissions.total}</span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'bookmarks'}
          className={`${styles.tabBtn} ${activeTab === 'bookmarks' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('bookmarks')}
        >
          <Bookmark size={15} />
          <span>Bookmarked Problems</span>
          {overview.bookmarkedCount > 0 && (
            <span className={styles.tabBadge}>{overview.bookmarkedCount}</span>
          )}
        </button>
      </div>

      {/* ============================================================ */}
      {/* TAB 1: OVERVIEW & ANALYTICS                                 */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <>
          {loadingProgress ? (
            <div className={styles.emptyNotice}>
              <RefreshCw size={24} className={styles.spin} />
              <div className={styles.emptyNoticeText}>Loading your live progress metrics...</div>
            </div>
          ) : progressError ? (
            <div
              style={{
                padding: '1.25rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
              role="alert"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>{progressError}</span>
              </div>
              <Button variant="secondary" size="sm" onClick={loadProgress}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              {/* Metric Cards Grid */}
              <div className={styles.metricsGrid}>
                {/* Total Unique Solved */}
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <span>Unique Solved</span>
                    <Target size={14} />
                  </div>
                  <div className={styles.statValue}>
                    {overview.totalSolved}
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                      {' '}
                      / {overview.totalProblems}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${Math.min(100, overview.solvedPercentage)}%`,
                        backgroundColor: 'var(--accent-primary)'
                      }}
                    />
                  </div>
                  <div className={styles.statSubtext}>
                    {overview.solvedPercentage}% of catalogue solved
                  </div>
                </div>

                {/* Easy Questions Solved */}
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <span>Easy Questions</span>
                    <span style={{ color: 'var(--color-easy)' }}>Easy</span>
                  </div>
                  <div className={styles.statValue} style={{ color: 'var(--color-easy)' }}>
                    {easyStats.solved}
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                      {' '}
                      / {easyStats.total}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${
                          easyStats.total > 0
                            ? (easyStats.solved / easyStats.total) * 100
                            : 0
                        }%`,
                        backgroundColor: 'var(--color-easy)'
                      }}
                    />
                  </div>
                  <div className={styles.statSubtext}>
                    {easyStats.total > 0
                      ? Math.round((easyStats.solved / easyStats.total) * 100)
                      : 0}
                    % mastered
                  </div>
                </div>

                {/* Medium Questions Solved */}
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <span>Medium Questions</span>
                    <span style={{ color: 'var(--color-medium)' }}>Medium</span>
                  </div>
                  <div className={styles.statValue} style={{ color: 'var(--color-medium)' }}>
                    {mediumStats.solved}
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                      {' '}
                      / {mediumStats.total}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${
                          mediumStats.total > 0
                            ? (mediumStats.solved / mediumStats.total) * 100
                            : 0
                        }%`,
                        backgroundColor: 'var(--color-medium)'
                      }}
                    />
                  </div>
                  <div className={styles.statSubtext}>
                    {mediumStats.total > 0
                      ? Math.round((mediumStats.solved / mediumStats.total) * 100)
                      : 0}
                    % mastered
                  </div>
                </div>

                {/* Hard Questions Solved */}
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <span>Hard Questions</span>
                    <span style={{ color: 'var(--color-hard)' }}>Hard</span>
                  </div>
                  <div className={styles.statValue} style={{ color: 'var(--color-hard)' }}>
                    {hardStats.solved}
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                      {' '}
                      / {hardStats.total}
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${
                          hardStats.total > 0
                            ? (hardStats.solved / hardStats.total) * 100
                            : 0
                        }%`,
                        backgroundColor: 'var(--color-hard)'
                      }}
                    />
                  </div>
                  <div className={styles.statSubtext}>
                    {hardStats.total > 0
                      ? Math.round((hardStats.solved / hardStats.total) * 100)
                      : 0}
                    % mastered
                  </div>
                </div>

                {/* Acceptance Rate Card */}
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>
                    <span>Acceptance Rate</span>
                    <TrendingUp size={14} />
                  </div>
                  <div className={styles.statValue}>
                    {overview.submissions.acceptanceRate}%
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{
                        width: `${overview.submissions.acceptanceRate}%`,
                        backgroundColor: 'var(--color-easy)'
                      }}
                    />
                  </div>
                  <div className={styles.statSubtext}>
                    {overview.submissions.accepted} accepted of {overview.submissions.total} total
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Formula: (Accepted / Total) × 100
                    </div>
                  </div>
                </div>
              </div>

              {/* Two Column Grid: Activity Chart + Topic Proficiency */}
              <div className={styles.contentGrid}>
                {/* Real Activity Over Time (Recharts) */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>
                    <span>Activity Over Time (Past 90 Days)</span>
                    <Calendar size={16} color="var(--text-muted)" />
                  </div>

                  {activityData.length === 0 ? (
                    <div className={styles.emptyNotice} style={{ padding: '2rem 1rem' }}>
                      <Calendar size={32} color="var(--text-muted)" />
                      <div className={styles.emptyNoticeTitle}>No Submission Activity Yet</div>
                      <div className={styles.emptyNoticeText}>
                        Your submission timeline will dynamically chart here as you solve problems.
                      </div>
                      <Link to="/problems" style={{ marginTop: '0.5rem' }}>
                        <Button variant="primary" size="sm">
                          Browse Catalogue
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className={styles.chartContainer} aria-label="Submission activity timeline chart">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={activityData}
                          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--accent-primary, #38bdf8)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="var(--accent-primary, #38bdf8)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorAccepted" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--color-easy, #22c55e)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="var(--color-easy, #22c55e)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, #334155)" opacity={0.5} />
                          <XAxis
                            dataKey="date"
                            stroke="var(--text-muted, #94a3b8)"
                            fontSize={11}
                            tickLine={false}
                          />
                          <YAxis
                            stroke="var(--text-muted, #94a3b8)"
                            fontSize={11}
                            tickLine={false}
                            allowDecimals={false}
                          />
                          <Tooltip content={<CustomChartTooltip />} />
                          <Area
                            type="monotone"
                            dataKey="count"
                            name="Total Submissions"
                            stroke="var(--accent-primary, #38bdf8)"
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                            strokeWidth={2}
                          />
                          <Area
                            type="monotone"
                            dataKey="accepted"
                            name="Accepted"
                            stroke="var(--color-easy, #22c55e)"
                            fillOpacity={1}
                            fill="url(#colorAccepted)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Topic Breakdown */}
                <div className={styles.panel}>
                  <div className={styles.panelTitle}>
                    <span>Topic Progress</span>
                    <TrendingUp size={16} color="var(--text-muted)" />
                  </div>

                  {topicProgress.length === 0 ? (
                    <div className={styles.emptyNotice} style={{ padding: '2rem 1rem' }}>
                      <TrendingUp size={32} color="var(--text-muted)" />
                      <div className={styles.emptyNoticeTitle}>No Topic Data</div>
                      <div className={styles.emptyNoticeText}>
                        Solve problems across arrays, trees, and dynamic programming to measure topic mastery.
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '280px', overflowY: 'auto' }}>
                      {topicProgress.map((item) => (
                        <div key={item.topic} className={styles.topicRow}>
                          <div className={styles.topicRowHeader}>
                            <span className={styles.topicName}>{item.topic}</span>
                            <span className={styles.topicScore}>
                              {item.solved} / {item.total} ({item.percentage}%)
                            </span>
                          </div>
                          <div className={styles.progressBar}>
                            <div
                              className={styles.progressFill}
                              style={{
                                width: `${item.percentage}%`,
                                backgroundColor:
                                  item.percentage > 70
                                    ? 'var(--color-easy)'
                                    : item.percentage > 30
                                    ? 'var(--color-medium)'
                                    : 'var(--accent-primary)'
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Submissions Feed */}
              <div className={styles.panel}>
                <div className={styles.panelTitle}>
                  <span>Recent Submissions</span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('history')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-text)',
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <span>View all submissions</span>
                    <ArrowRight size={13} />
                  </button>
                </div>

                {recentSubmissions.length === 0 ? (
                  <div className={styles.emptyNotice} style={{ padding: '2rem 1rem' }}>
                    <History size={32} color="var(--text-muted)" />
                    <div className={styles.emptyNoticeTitle}>No Submissions Yet</div>
                    <div className={styles.emptyNoticeText}>
                      When you submit solutions in the workspace, your submission verdicts will appear here.
                    </div>
                  </div>
                ) : (
                  <div className={styles.submissionsList}>
                    {recentSubmissions.map((sub) => {
                      const prob = sub.problemId || {};
                      const isAccepted = sub.status === 'Accepted';

                      return (
                        <div key={sub._id} className={styles.submissionItem}>
                          <div>
                            <Link to={`/problems/${prob.slug || ''}`} className={styles.submissionTitle}>
                              {prob.title || 'Unknown Problem'}
                            </Link>
                            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '2px' }}>
                              {sub.language} · {formatDateTime(sub.createdAt)}
                            </div>
                          </div>

                          <div className={styles.submissionMeta}>
                            {isAccepted ? (
                              <Badge variant="easy" icon={<CheckCircle2 size={12} />}>
                                Accepted
                              </Badge>
                            ) : (
                              <Badge variant="hard" icon={<XCircle size={12} />}>
                                {sub.status}
                              </Badge>
                            )}
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.75rem',
                                color: 'var(--text-muted)'
                              }}
                            >
                              {sub.executionTimeMs != null ? `${sub.executionTimeMs} ms` : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* ============================================================ */}
      {/* TAB 2: SUBMISSION HISTORY                                    */}
      {/* ============================================================ */}
      {activeTab === 'history' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Filter Bar */}
          <div className={styles.filterBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)' }}>
              <Filter size={15} />
              <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Filter:</span>
            </div>

            {/* Status Filter */}
            <select
              className={styles.filterInput}
              value={historyFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              aria-label="Filter by submission status"
            >
              <option value="">All Statuses</option>
              <option value="Accepted">Accepted</option>
              <option value="Wrong Answer">Wrong Answer</option>
              <option value="Time Limit Exceeded">Time Limit Exceeded</option>
              <option value="Memory Limit Exceeded">Memory Limit Exceeded</option>
              <option value="Runtime Error">Runtime Error</option>
              <option value="Compilation Error">Compilation Error</option>
            </select>

            {/* Language Filter */}
            <select
              className={styles.filterInput}
              value={historyFilters.language}
              onChange={(e) => handleFilterChange('language', e.target.value)}
              aria-label="Filter by programming language"
            >
              <option value="">All Languages</option>
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="cpp">C++</option>
              <option value="java">Java</option>
            </select>

            {/* Start Date */}
            <input
              type="date"
              className={styles.filterInput}
              value={historyFilters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              aria-label="Filter by start date"
              title="Start Date"
            />

            {/* End Date */}
            <input
              type="date"
              className={styles.filterInput}
              value={historyFilters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              aria-label="Filter by end date"
              title="End Date"
            />

            {(historyFilters.status ||
              historyFilters.language ||
              historyFilters.startDate ||
              historyFilters.endDate) && (
              <Button variant="ghost" size="sm" onClick={handleResetHistoryFilters}>
                Reset Filters
              </Button>
            )}
          </div>

          {/* Submissions Table */}
          {historyLoading ? (
            <div className={styles.emptyNotice}>
              <RefreshCw size={24} className={styles.spin} />
              <div className={styles.emptyNoticeText}>Loading submissions history...</div>
            </div>
          ) : historySubmissions.length === 0 ? (
            <div className={styles.emptyNotice}>
              <History size={36} color="var(--text-muted)" />
              <div className={styles.emptyNoticeTitle}>No Submissions Match Filters</div>
              <div className={styles.emptyNoticeText}>
                No evaluated submissions match your current filters. Try resetting the filters or submit a solution to view it here.
              </div>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Problem</th>
                      <th>Verdict</th>
                      <th>Language</th>
                      <th>Runtime</th>
                      <th>Memory</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historySubmissions.map((sub) => {
                      const prob = sub.problemId || {};
                      const isAccepted = sub.status === 'Accepted';

                      return (
                        <tr key={sub._id}>
                          <td>
                            <Link to={`/problems/${prob.slug || ''}`} className={styles.submissionTitle}>
                              {prob.title || 'Untitled Problem'}
                            </Link>
                            {prob.difficulty && (
                              <Badge
                                variant={prob.difficulty.toLowerCase()}
                                style={{ marginLeft: '0.5rem', fontSize: '0.6875rem' }}
                              >
                                {prob.difficulty}
                              </Badge>
                            )}
                          </td>
                          <td>
                            {isAccepted ? (
                              <Badge variant="easy" icon={<CheckCircle2 size={12} />}>
                                Accepted
                              </Badge>
                            ) : (
                              <Badge variant="hard" icon={<XCircle size={12} />}>
                                {sub.status}
                              </Badge>
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                            {sub.language}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                            {sub.executionTimeMs != null ? `${sub.executionTimeMs} ms` : '—'}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                            {sub.memoryUsageKb != null ? `${(sub.memoryUsageKb / 1024).toFixed(1)} MB` : '—'}
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                            {formatDateTime(sub.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className={styles.paginationBar}>
                <div>
                  Page {historyMeta.page} of {historyMeta.totalPages} ({historyMeta.totalItems} total submissions)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!historyMeta.hasPrevPage}
                    onClick={() => handleFilterChange('page', historyMeta.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!historyMeta.hasNextPage}
                    onClick={() => handleFilterChange('page', historyMeta.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: BOOKMARKS                                             */}
      {/* ============================================================ */}
      {activeTab === 'bookmarks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {bookmarksLoading ? (
            <div className={styles.emptyNotice}>
              <RefreshCw size={24} className={styles.spin} />
              <div className={styles.emptyNoticeText}>Loading your bookmarked challenges...</div>
            </div>
          ) : bookmarks.length === 0 ? (
            <div className={styles.emptyNotice}>
              <Bookmark size={36} color="var(--text-muted)" />
              <div className={styles.emptyNoticeTitle}>No Bookmarked Problems</div>
              <div className={styles.emptyNoticeText}>
                Bookmark problems from the Problem Catalogue or workspace to build your personalized revision list.
              </div>
              <Link to="/problems" style={{ marginTop: '0.5rem' }}>
                <Button variant="primary" size="sm">
                  Explore Problems
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Problem Title</th>
                    <th>Difficulty</th>
                    <th>Topics</th>
                    <th>Bookmarked At</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookmarks.map((b) => {
                    const prob = b.problem || {};
                    const isSolved = prob.status === 'Solved';

                    return (
                      <tr key={b.bookmarkId || prob._id}>
                        <td style={{ width: 44 }}>
                          {isSolved ? (
                            <CheckCircle2 size={16} color="var(--color-easy)" title="Solved" />
                          ) : (
                            <Clock size={16} color="var(--text-muted)" title="Unsolved" />
                          )}
                        </td>
                        <td>
                          <Link to={`/problems/${prob.slug}`} className={styles.submissionTitle}>
                            {prob.title}
                          </Link>
                        </td>
                        <td>
                          <Badge variant={prob.difficulty?.toLowerCase()}>{prob.difficulty}</Badge>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                            {Array.isArray(prob.topics) &&
                              prob.topics.slice(0, 3).map((t) => (
                                <Badge key={t} variant="tag">
                                  {t}
                                </Badge>
                              ))}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                          {formatDateTime(b.bookmarkedAt)}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                            <Link to={`/problems/${prob.slug}`}>
                              <Button variant="secondary" size="sm">
                                Practice
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              icon={<Trash2 size={13} color="var(--color-danger)" />}
                              onClick={() => handleRemoveBookmark(prob._id)}
                              title="Remove bookmark"
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {bookmarksMeta.totalPages > 1 && (
              <div className={styles.paginationBar}>
                <div>
                  Page {bookmarksMeta.page} of {bookmarksMeta.totalPages} ({bookmarksMeta.totalItems} bookmarks)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!bookmarksMeta.hasPrevPage}
                    onClick={() => loadBookmarks(bookmarksMeta.page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!bookmarksMeta.hasNextPage}
                    onClick={() => loadBookmarks(bookmarksMeta.page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
          )}
        </div>
      )}
    </div>
  );
}
