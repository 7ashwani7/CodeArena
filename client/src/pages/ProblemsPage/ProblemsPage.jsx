import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  CheckCircle2,
  Clock,
  Circle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  AlertCircle,
  Bookmark
} from 'lucide-react';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { EmptyState } from '../../components/common/EmptyState/EmptyState';
import { ProblemTableSkeleton } from '../../components/common/Skeleton/Skeleton';
import { problemService } from '../../services/problemService';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import { PROBLEM_CATEGORIES } from '../../data/sampleProblems';
import styles from './ProblemsPage.module.css';

export function ProblemsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read initial states from URL query parameters
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [selectedTopic, setSelectedTopic] = useState(() => searchParams.get('topic') || 'All');
  const [selectedDifficulty, setSelectedDifficulty] = useState(
    () => searchParams.get('difficulty') || 'All'
  );
  const [currentPage, setCurrentPage] = useState(() => {
    const p = Number.parseInt(searchParams.get('page'), 10);
    return Number.isInteger(p) && p > 0 ? p : 1;
  });

  // Debounce search input by 300ms to avoid rapid API requests
  const debouncedSearch = useDebounce(search, 300);

  // Data fetching states
  const [problems, setProblems] = useState([]);
  const [meta, setMeta] = useState({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync state to URL search parameters
  const updateUrlParams = useCallback((newSearch, newTopic, newDifficulty, newPage) => {
    const params = new URLSearchParams();
    if (newSearch && newSearch.trim()) params.set('search', newSearch.trim());
    if (newTopic && newTopic !== 'All') params.set('topic', newTopic);
    if (newDifficulty && newDifficulty !== 'All') params.set('difficulty', newDifficulty);
    if (newPage > 1) params.set('page', newPage.toString());
    setSearchParams(params, { replace: true });
  }, [setSearchParams]);

  // Fetch problems from real backend API
  const fetchProblems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await problemService.getProblems({
        search: debouncedSearch,
        topic: selectedTopic,
        difficulty: selectedDifficulty,
        page: currentPage,
        limit: 10
      });

      setProblems(result.problems || []);
      setMeta(result.meta || {
        page: currentPage,
        limit: 10,
        totalItems: result.problems?.length || 0,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false
      });
    } catch (err) {
      setError(err.message || 'Failed to load practice problems from server');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedTopic, selectedDifficulty, currentPage]);

  // Fetch when debounced parameters change
  useEffect(() => {
    fetchProblems();
  }, [fetchProblems]);

  // Sync URL when filter values change
  useEffect(() => {
    updateUrlParams(debouncedSearch, selectedTopic, selectedDifficulty, currentPage);
  }, [debouncedSearch, selectedTopic, selectedDifficulty, currentPage, updateUrlParams]);

  const handleResetFilters = () => {
    setSearch('');
    setSelectedTopic('All');
    setSelectedDifficulty('All');
    setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };

  const handleToggleBookmark = async (problemId) => {
    if (!user) {
      toast.info('Please sign in to bookmark problems');
      return;
    }
    setProblems((prev) =>
      prev.map((p) => (p._id === problemId ? { ...p, isBookmarked: !p.isBookmarked } : p))
    );
    try {
      const res = await userService.toggleBookmark(problemId);
      setProblems((prev) =>
        prev.map((p) => (p._id === problemId ? { ...p, isBookmarked: res.bookmarked } : p))
      );
      if (res.bookmarked) {
        toast.success('Problem bookmarked');
      } else {
        toast.info('Bookmark removed');
      }
    } catch {
      setProblems((prev) =>
        prev.map((p) => (p._id === problemId ? { ...p, isBookmarked: !p.isBookmarked } : p))
      );
      toast.error('Failed to update bookmark');
    }
  };

  const hasActiveFilters = Boolean(
    search || selectedTopic !== 'All' || selectedDifficulty !== 'All'
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Problem Catalogue</h1>
        <p className={styles.subtitle}>
          Browse and practice algorithmic challenges across foundational data structures and patterns.
        </p>
      </div>

      {/* Filter and Search Controls */}
      <div className={styles.filterBar}>
        <div className={styles.filterRow}>
          <div className={styles.searchBox}>
            <Input
              placeholder="Search problems by title or topic..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              clearable
              onClear={() => {
                setSearch('');
                setCurrentPage(1);
              }}
              icon={<Search size={14} />}
            />
          </div>

          <div className={styles.filterSelects}>
            <Select
              options={['All', 'Easy', 'Medium', 'Hard']}
              value={selectedDifficulty}
              onChange={(e) => {
                setSelectedDifficulty(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter by difficulty"
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                icon={<RotateCcw size={13} />}
                onClick={handleResetFilters}
                title="Reset filters"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* Category Topic Tabs */}
        <div className={styles.categoryPills} role="tablist" aria-label="Topic categories">
          {PROBLEM_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`${styles.categoryBtn} ${
                selectedTopic === cat ? styles.categoryBtnActive : ''
              }`}
              onClick={() => {
                setSelectedTopic(cat);
                setCurrentPage(1);
              }}
              role="tab"
              aria-selected={selectedTopic === cat}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Meta Count & Page Indicator */}
      <div className={styles.metaRow}>
        <span>
          Showing <strong>{problems.length}</strong> of <strong>{meta.totalItems}</strong> problems
        </span>
        <span>
          Page {meta.page} of {meta.totalPages}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '1.25rem',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem'
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={fetchProblems}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <ProblemTableSkeleton rows={8} />
      ) : error ? null : problems.length === 0 ? (
        /* Empty State */
        <EmptyState
          title="No problems found"
          description="No questions match your current filter parameters. Try clearing your filters or searching for another term."
          actionLabel="Clear all filters"
          onAction={handleResetFilters}
        />
      ) : (
        /* Real Problems Table */
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.statusCell}>Status</th>
                <th>Title</th>
                <th>Topic / Tags</th>
                <th>Acceptance</th>
                <th>Difficulty</th>
                <th style={{ width: 44, textAlign: 'center' }}>Save</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((problem, index) => {
                const problemIndex = (meta.page - 1) * meta.limit + index + 1;
                const topicsList = Array.isArray(problem.topics) ? problem.topics : [];

                return (
                  <tr key={problem._id || problem.slug}>
                    <td className={styles.statusCell}>
                      {problem.status === 'Solved' ? (
                        <CheckCircle2 size={16} color="var(--color-easy, #22c55e)" title="Solved" />
                      ) : problem.status === 'Attempted' ? (
                        <Clock size={16} color="var(--color-medium, #f59e0b)" title="Attempted" />
                      ) : (
                        <Circle size={14} color="var(--text-muted)" title="Unsolved" />
                      )}
                    </td>
                    <td className={styles.problemTitleCell}>
                      <Link to={`/problems/${problem.slug}`} className={styles.problemLink}>
                        <span
                          style={{
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.8125rem'
                          }}
                        >
                          {problemIndex}.
                        </span>
                        <span>{problem.title}</span>
                      </Link>
                    </td>
                    <td>
                      <div className={styles.tagsCell}>
                        {topicsList.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="tag">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                        {problem.acceptanceRate ? `${problem.acceptanceRate}%` : '50.0%'}
                      </span>
                    </td>
                    <td>
                      <Badge variant={problem.difficulty.toLowerCase()}>{problem.difficulty}</Badge>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        aria-label={
                          problem.isBookmarked
                            ? `Remove bookmark for ${problem.title}`
                            : `Bookmark ${problem.title}`
                        }
                        title={problem.isBookmarked ? 'Remove bookmark' : 'Bookmark problem'}
                        onClick={() => handleToggleBookmark(problem._id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: problem.isBookmarked
                            ? 'var(--accent-primary)'
                            : 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Bookmark
                          size={15}
                          fill={problem.isBookmarked ? 'currentColor' : 'none'}
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {meta.totalPages > 1 && (
        <div className={styles.paginationBar}>
          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronLeft size={14} />}
            disabled={!meta.hasPrevPage || loading}
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          >
            Previous
          </Button>

          <div className={styles.pageNumbers}>
            {Array.from({ length: meta.totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                className={`${styles.pageBtn} ${
                  currentPage === pageNum ? styles.pageBtnActive : ''
                }`}
                onClick={() => setCurrentPage(pageNum)}
                disabled={loading}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={<ChevronRight size={14} />}
            disabled={!meta.hasNextPage || loading}
            onClick={() => setCurrentPage((p) => Math.min(p + 1, meta.totalPages))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
