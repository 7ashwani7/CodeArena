import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Key,
  AlertCircle,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Code2,
  CheckCircle2,
  History,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import { problemService } from '../../services/problemService';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { Select } from '../../components/common/Select/Select';
import { useToast } from '../../context/ToastContext';
import styles from './AdminPage.module.css';

const DIFFICULTY_OPTIONS = [
  { value: 'Easy', label: 'Easy' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Hard', label: 'Hard' }
];

const STATUS_OPTIONS = [
  { value: 'published', label: 'Published' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' }
];

const STARTER_CODE_LANGUAGES = [
  { id: 'javascript', label: 'JavaScript' },
  { id: 'python', label: 'Python 3' },
  { id: 'cpp', label: 'C++' },
  { id: 'java', label: 'Java' }
];

const INITIAL_FORM = {
  title: '',
  slug: '',
  difficulty: 'Easy',
  topics: 'Arrays & Hashing',
  publicationStatus: 'published',
  description: '',
  constraints: '1 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9',
  examples: [
    { input: 'nums = [2,7,11,15], target = 9', output: '[0,1]', explanation: 'Because nums[0] + nums[1] == 9' }
  ],
  starterCode: {
    javascript: 'function solution() {\n  \n}',
    python: 'class Solution:\n    def solution(self):\n        pass',
    cpp: 'class Solution {\npublic:\n    void solution() {\n        \n    }\n};',
    java: 'class Solution {\n    public void solution() {\n        \n    }\n}'
  },
  judgeTestCases: [
    { input: '[2,7,11,15]\n9', expectedOutput: '[0,1]', isHidden: false },
    { input: '[-1,-2,-3,-4]\n-5', expectedOutput: '[1,2]', isHidden: true }
  ]
};

export function AdminPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState('problems'); // 'problems' | 'audit'

  // Server authorization state
  const [adminStatus, setAdminStatus] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // Problems state
  const [problems, setProblems] = useState([]);
  const [problemsLoading, setProblemsLoading] = useState(true);
  const [problemsError, setProblemsError] = useState('');

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 15, totalItems: 0, totalPages: 1 });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');

  // Problem Edit / Create Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblemId, setEditingProblemId] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [activeCodeLang, setActiveCodeLang] = useState('javascript');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Preview Modal state
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewCodeLang, setPreviewCodeLang] = useState('javascript');

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [problemToDelete, setProblemToDelete] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const verifyServerAuthorization = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const authorized = await authService.verifyAdminAccess();
      setAdminStatus(authorized ? 'Server-Verified Administrator' : 'Verification Failed');
    } catch (err) {
      setAuthError(err.message || 'Authorization check failed');
      setAdminStatus(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadAdminProblems = useCallback(async () => {
    setProblemsLoading(true);
    setProblemsError('');
    try {
      const data = await problemService.getAdminProblems();
      setProblems(data);
    } catch (err) {
      setProblemsError(err.message || 'Failed to load problems catalogue');
    } finally {
      setProblemsLoading(false);
    }
  }, []);

  const loadAuditLogs = useCallback(async (page = 1) => {
    setAuditLoading(true);
    setAuditError('');
    try {
      const res = await problemService.getAdminAuditLogs({ page, limit: 15 });
      setAuditLogs(res.items);
      setAuditPagination(res.meta);
    } catch (err) {
      setAuditError(err.message || 'Failed to load audit logs');
    } finally {
      setAuditLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    authService
      .verifyAdminAccess()
      .then((authorized) => {
        if (isMounted) {
          setAdminStatus(authorized ? 'Server-Verified Administrator' : 'Verification Failed');
        }
      })
      .catch((err) => {
        if (isMounted) {
          setAuthError(err.message || 'Authorization check failed');
          setAdminStatus(null);
        }
      });

    loadAdminProblems();

    return () => {
      isMounted = false;
    };
  }, [loadAdminProblems]);

  useEffect(() => {
    if (activeTab === 'audit') {
      loadAuditLogs(1);
    }
  }, [activeTab, loadAuditLogs]);

  // Form input handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === 'title' && !editingProblemId) {
        const autoSlug = value
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');
        updated.slug = autoSlug;
      }
      return updated;
    });
  };

  const handleStarterCodeChange = (lang, value) => {
    setFormData((prev) => ({
      ...prev,
      starterCode: {
        ...prev.starterCode,
        [lang]: value
      }
    }));
  };

  // Example handlers
  const handleExampleChange = (index, field, value) => {
    setFormData((prev) => {
      const updatedExamples = [...prev.examples];
      updatedExamples[index] = { ...updatedExamples[index], [field]: value };
      return { ...prev, examples: updatedExamples };
    });
  };

  const handleAddExample = () => {
    setFormData((prev) => ({
      ...prev,
      examples: [...prev.examples, { input: '', output: '', explanation: '' }]
    }));
  };

  const handleRemoveExample = (index) => {
    if (formData.examples.length <= 1) {
      toast.error('Problem must contain at least one example');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      examples: prev.examples.filter((_, i) => i !== index)
    }));
  };

  // Test cases handlers
  const handleTestCaseChange = (index, field, value) => {
    setFormData((prev) => {
      const updated = [...prev.judgeTestCases];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, judgeTestCases: updated };
    });
  };

  const handleAddTestCase = () => {
    setFormData((prev) => ({
      ...prev,
      judgeTestCases: [
        ...prev.judgeTestCases,
        { input: '', expectedOutput: '', isHidden: true }
      ]
    }));
  };

  const handleRemoveTestCase = (index) => {
    if (formData.judgeTestCases.length <= 1) {
      toast.error('Problem must contain at least one test case');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      judgeTestCases: prev.judgeTestCases.filter((_, i) => i !== index)
    }));
  };

  // Open Create Modal
  const openCreateModal = () => {
    setEditingProblemId(null);
    setFormData(INITIAL_FORM);
    setFormError('');
    setActiveCodeLang('javascript');
    setIsModalOpen(true);
  };

  // Open Edit Modal with full test cases from backend
  const openEditModal = async (problem) => {
    setEditingProblemId(problem._id);
    setFormError('');
    setActiveCodeLang('javascript');

    try {
      // Fetch full details including judgeTestCases
      const fullProblem = await problemService.getAdminProblem(problem._id);

      setFormData({
        title: fullProblem.title || '',
        slug: fullProblem.slug || '',
        difficulty: fullProblem.difficulty || 'Easy',
        topics: (fullProblem.topics || []).join(', '),
        publicationStatus: fullProblem.publicationStatus || 'published',
        description: fullProblem.description || '',
        constraints: (fullProblem.constraints || []).join('\n'),
        examples: fullProblem.examples && fullProblem.examples.length > 0
          ? fullProblem.examples
          : [{ input: '', output: '', explanation: '' }],
        starterCode: {
          javascript: fullProblem.starterCode?.javascript || '',
          python: fullProblem.starterCode?.python || '',
          cpp: fullProblem.starterCode?.cpp || '',
          java: fullProblem.starterCode?.java || ''
        },
        judgeTestCases: fullProblem.judgeTestCases && fullProblem.judgeTestCases.length > 0
          ? fullProblem.judgeTestCases
          : [{ input: '', expectedOutput: '', isHidden: true }]
      });
      setIsModalOpen(true);
    } catch (err) {
      toast.error(err.message || 'Failed to load problem details for editing');
    }
  };

  // Preview Problem (Public view verification)
  const openPreviewModal = (prob) => {
    setPreviewData(prob);
    setPreviewCodeLang('javascript');
    setIsPreviewOpen(true);
  };

  // Toggle Publication
  const handleTogglePublication = async (problem) => {
    const newStatus = problem.publicationStatus === 'published' ? 'draft' : 'published';
    try {
      await problemService.togglePublication(problem._id, newStatus);
      toast.success(`Problem marked as ${newStatus}`);
      setProblems((prev) =>
        prev.map((p) => (p._id === problem._id ? { ...p, publicationStatus: newStatus } : p))
      );
    } catch (err) {
      toast.error(err.message || 'Failed to toggle publication status');
    }
  };

  // Open Delete Confirmation Modal
  const openDeleteModal = (problem) => {
    setProblemToDelete(problem);
    setIsDeleteModalOpen(true);
  };

  // Execute Deletion
  const executeDelete = async (force = false) => {
    if (!problemToDelete) return;
    setDeleteSubmitting(true);
    try {
      await problemService.deleteProblem(problemToDelete._id, force);
      toast.success(`Problem "${problemToDelete.title}" deleted successfully`);
      setProblems((prev) => prev.filter((p) => p._id !== problemToDelete._id));
      setIsDeleteModalOpen(false);
      setProblemToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete problem');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Archive instead of delete
  const executeArchiveInstead = async () => {
    if (!problemToDelete) return;
    setDeleteSubmitting(true);
    try {
      await problemService.togglePublication(problemToDelete._id, 'archived');
      toast.success(`Problem "${problemToDelete.title}" marked as Archived`);
      setProblems((prev) =>
        prev.map((p) => (p._id === problemToDelete._id ? { ...p, publicationStatus: 'archived' } : p))
      );
      setIsDeleteModalOpen(false);
      setProblemToDelete(null);
    } catch (err) {
      toast.error(err.message || 'Failed to archive problem');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  // Validate and Save Problem
  const handleSaveProblem = async (e) => {
    e.preventDefault();
    setFormSubmitting(true);
    setFormError('');

    // Pre-save validation
    if (!formData.title.trim()) {
      setFormError('Title is required');
      setFormSubmitting(false);
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(formData.slug.trim().toLowerCase())) {
      setFormError('Slug must contain only lowercase letters, digits, and single hyphens');
      setFormSubmitting(false);
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Problem statement description is required');
      setFormSubmitting(false);
      return;
    }

    const validExamples = formData.examples.filter((ex) => ex.input.trim() && ex.output.trim());
    if (validExamples.length === 0) {
      setFormError('At least one example with valid input and output is required');
      setFormSubmitting(false);
      return;
    }

    const validTestCases = formData.judgeTestCases.filter(
      (tc) => tc.input !== undefined && tc.input.trim() && tc.expectedOutput !== undefined && tc.expectedOutput.trim()
    );
    if (validTestCases.length === 0) {
      setFormError('At least one judge test case with input and expected output is required');
      setFormSubmitting(false);
      return;
    }

    const topicsArray = formData.topics
      ? formData.topics
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean)
      : [];

    const constraintsArray = formData.constraints
      ? formData.constraints
          .split('\n')
          .map((c) => c.trim())
          .filter(Boolean)
      : [];

    const payload = {
      title: formData.title.trim(),
      slug: formData.slug.trim().toLowerCase(),
      difficulty: formData.difficulty,
      publicationStatus: formData.publicationStatus,
      topics: topicsArray,
      description: formData.description.trim(),
      constraints: constraintsArray,
      examples: validExamples,
      starterCode: formData.starterCode,
      judgeTestCases: validTestCases
    };

    try {
      if (editingProblemId) {
        const updated = await problemService.updateProblem(editingProblemId, payload);
        toast.success('Problem updated successfully');
        setProblems((prev) =>
          prev.map((p) => (p._id === editingProblemId ? { ...p, ...updated } : p))
        );
      } else {
        const created = await problemService.createProblem(payload);
        toast.success('Problem created successfully');
        setProblems((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save problem');
    } finally {
      setFormSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <ShieldCheck size={28} color="var(--accent-primary)" />
          Administration & Content Management
        </h1>
        <p className={styles.subtitle}>
          Restricted control plane verified via server-side role enforcement (HTTP-only cookie JWT).
        </p>
      </div>

      {/* Grid: Server Auth & Session Info */}
      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <Key size={18} />
            Server Authorization Check
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
            Tests <code>GET /api/auth/admin-check</code> to prove server-side role validation without trusting frontend credentials.
          </p>

          <div style={{ marginBottom: '1.25rem' }}>
            {adminStatus && (
              <span className={styles.badge}>
                <ShieldCheck size={14} />
                {adminStatus}
              </span>
            )}
            {authError && (
              <div
                style={{
                  color: 'var(--color-danger)',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <AlertCircle size={15} />
                {authError}
              </div>
            )}
          </div>

          <Button
            variant="secondary"
            loading={authLoading}
            onClick={verifyServerAuthorization}
          >
            Re-test Server Verification
          </Button>
        </div>

        <div className={styles.card}>
          <div className={styles.cardTitle}>
            <Users size={18} />
            Current Session Details
          </div>

          <div className={styles.kvRow}>
            <span className={styles.key}>Username</span>
            <span className={styles.val}>{user?.username}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.key}>Email</span>
            <span className={styles.val}>{user?.email}</span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.key}>Enforced Role</span>
            <span className={styles.val} style={{ color: 'var(--color-success)' }}>
              {user?.role}
            </span>
          </div>
          <div className={styles.kvRow}>
            <span className={styles.key}>Cookie Transport</span>
            <span className={styles.val}>HTTP-Only + SameSite</span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className={styles.tabsNav} role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'problems'}
          className={`${styles.tabBtn} ${activeTab === 'problems' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('problems')}
        >
          <Code2 size={16} />
          Problems Catalogue ({problems.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'audit'}
          className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          <History size={16} />
          Audit & Activity Logs
        </button>
      </div>

      {/* TAB 1: Problem Management Section */}
      {activeTab === 'problems' && (
        <div className={styles.mgmtSection}>
          <div className={styles.mgmtHeader}>
            <div className={styles.mgmtTitleGroup}>
              <h2 className={styles.mgmtTitle}>
                <Code2 size={20} color="var(--accent-primary)" />
                Practice Problems
              </h2>
              <span className={styles.mgmtCount}>({problems.length} records)</span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button
                variant="outline"
                size="sm"
                icon={<RefreshCw size={13} />}
                loading={problemsLoading}
                onClick={loadAdminProblems}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Plus size={14} />}
                onClick={openCreateModal}
              >
                Create Problem
              </Button>
            </div>
          </div>

          {problemsError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <AlertCircle size={16} />
              <span>{problemsError}</span>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable} aria-label="Problems Management Table">
              <thead>
                <tr>
                  <th>Problem</th>
                  <th>Difficulty</th>
                  <th>Topics</th>
                  <th>Submissions</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {problemsLoading && problems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Loading problems...</span>
                    </td>
                  </tr>
                ) : problems.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>
                        No problems found. Click "Create Problem" to add the first one.
                      </span>
                    </td>
                  </tr>
                ) : (
                  problems.map((prob) => {
                    const isPublished = prob.publicationStatus === 'published';
                    return (
                      <tr key={prob._id}>
                        <td>
                          <div className={styles.problemCell}>
                            <Link to={`/problems/${prob.slug}`} className={styles.problemLink}>
                              {prob.title}
                            </Link>
                            <span className={styles.problemSlug}>{prob.slug}</span>
                          </div>
                        </td>
                        <td>
                          <Badge variant={prob.difficulty.toLowerCase()}>{prob.difficulty}</Badge>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                            {(prob.topics || []).slice(0, 3).join(', ') || '—'}
                            {(prob.topics?.length || 0) > 3 && ` +${prob.topics.length - 3}`}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                            {prob.totalSubmissions !== undefined ? prob.totalSubmissions : '—'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`${styles.statusPill} ${
                              isPublished
                                ? styles.statusPublished
                                : prob.publicationStatus === 'draft'
                                ? styles.statusDraft
                                : styles.statusArchived
                            }`}
                          >
                            {prob.publicationStatus || 'published'}
                          </span>
                        </td>
                        <td>
                          <div className={styles.actionsCell} style={{ justifyContent: 'flex-end' }}>
                            {/* Preview Problem Details */}
                            <button
                              type="button"
                              className={styles.iconActionBtn}
                              onClick={() => openPreviewModal(prob)}
                              title="Preview public view"
                              aria-label="Preview problem"
                            >
                              <FileText size={14} />
                            </button>

                            {/* Toggle Publication Button */}
                            <button
                              type="button"
                              className={styles.iconActionBtn}
                              onClick={() => handleTogglePublication(prob)}
                              title={isPublished ? 'Unpublish (set to draft)' : 'Publish problem'}
                              aria-label={isPublished ? 'Unpublish' : 'Publish'}
                            >
                              {isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>

                            {/* Edit Problem Button */}
                            <button
                              type="button"
                              className={styles.iconActionBtn}
                              onClick={() => openEditModal(prob)}
                              title="Edit problem"
                              aria-label="Edit problem"
                            >
                              <Edit2 size={14} />
                            </button>

                            {/* Delete Problem Button */}
                            <button
                              type="button"
                              className={`${styles.iconActionBtn} ${styles.danger}`}
                              onClick={() => openDeleteModal(prob)}
                              title="Delete problem"
                              aria-label="Delete problem"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Audit Logs Section */}
      {activeTab === 'audit' && (
        <div className={styles.mgmtSection}>
          <div className={styles.mgmtHeader}>
            <div className={styles.mgmtTitleGroup}>
              <h2 className={styles.mgmtTitle}>
                <History size={20} color="var(--accent-primary)" />
                Administrative Activity Logs
              </h2>
              <span className={styles.mgmtCount}>({auditPagination.totalItems} entries)</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<RefreshCw size={13} />}
              loading={auditLoading}
              onClick={() => loadAuditLogs(auditPagination.page)}
            >
              Refresh Logs
            </Button>
          </div>

          {auditError && (
            <div
              style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
                marginBottom: '1rem'
              }}
            >
              {auditError}
            </div>
          )}

          <div className={styles.tableWrapper}>
            <table className={styles.adminTable} aria-label="Administrative Audit Logs Table">
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Target Problem / Resource</th>
                  <th>Admin User</th>
                  <th>Details</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading && auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Loading audit logs...</span>
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>No audit log entries recorded yet.</span>
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    let badgeClass = styles.actionUpdate;
                    if (log.action === 'CREATE_PROBLEM') badgeClass = styles.actionCreate;
                    else if (log.action === 'TOGGLE_PUBLICATION') badgeClass = styles.actionToggle;
                    else if (log.action === 'DELETE_PROBLEM') badgeClass = styles.actionDelete;
                    else if (log.action === 'CREATE_ADMIN') badgeClass = styles.actionAdmin;

                    return (
                      <tr key={log._id}>
                        <td>
                          <span className={`${styles.auditActionBadge} ${badgeClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontWeight: 500 }}>{log.targetTitle || '—'}</span>
                        </td>
                        <td>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                            {log.adminUsername}
                          </span>
                        </td>
                        <td>
                          <span className={styles.auditDetail}>
                            {JSON.stringify(log.details || {})}
                          </span>
                        </td>
                        <td>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Audit pagination */}
          {auditPagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={auditPagination.page <= 1 || auditLoading}
                onClick={() => loadAuditLogs(auditPagination.page - 1)}
              >
                Previous
              </Button>
              <span style={{ alignSelf: 'center', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Page {auditPagination.page} of {auditPagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={auditPagination.page >= auditPagination.totalPages || auditLoading}
                onClick={() => loadAuditLogs(auditPagination.page + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: Create or Edit Problem */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProblemId ? 'Edit Problem' : 'Create New Problem'}
        maxWidth="820px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={formSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              form="problem-admin-form"
              loading={formSubmitting}
            >
              {editingProblemId ? 'Update Problem' : 'Save Problem'}
            </Button>
          </div>
        }
      >
        <form id="problem-admin-form" onSubmit={handleSaveProblem} className={styles.formGrid}>
          {formError && (
            <div
              style={{
                padding: '0.6rem 0.8rem',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-danger)',
                fontSize: '0.8125rem'
              }}
            >
              {formError}
            </div>
          )}

          <div className={styles.formRow2}>
            <Input
              label="Title *"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="e.g. Binary Target Search"
              required
            />
            <Input
              label="Unique Slug *"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              placeholder="e.g. binary-target-search"
              helperText="Lowercase alphanumeric with hyphens"
              required
            />
          </div>

          <div className={styles.formRow2}>
            <Select
              label="Difficulty *"
              name="difficulty"
              options={DIFFICULTY_OPTIONS}
              value={formData.difficulty}
              onChange={handleInputChange}
            />
            <Select
              label="Publication Status *"
              name="publicationStatus"
              options={STATUS_OPTIONS}
              value={formData.publicationStatus}
              onChange={handleInputChange}
            />
          </div>

          <Input
            label="Topics / Categories (comma-separated)"
            name="topics"
            value={formData.topics}
            onChange={handleInputChange}
            placeholder="e.g. Binary Search, Arrays & Hashing"
          />

          <div className={styles.formGroup}>
            <label htmlFor="admin-problem-description" className={styles.label}>
              Problem Statement / Description *
            </label>
            <textarea
              id="admin-problem-description"
              name="description"
              className={styles.textarea}
              style={{ minHeight: '110px' }}
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Describe the algorithm challenge, inputs, and expected return value..."
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="admin-problem-constraints" className={styles.label}>
              Constraints (one per line)
            </label>
            <textarea
              id="admin-problem-constraints"
              name="constraints"
              className={`${styles.textarea} ${styles.codeArea}`}
              value={formData.constraints}
              onChange={handleInputChange}
              placeholder="1 <= nums.length <= 10^4&#10;-10^4 <= nums[i] <= 10^4"
            />
            <span className={styles.hint}>Separate each constraint by a new line.</span>
          </div>

          {/* Examples Builder */}
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className={styles.label}>Public Examples (Displayed to users)</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus size={12} />}
                onClick={handleAddExample}
              >
                Add Example
              </Button>
            </div>

            {formData.examples.map((ex, idx) => (
              <div key={idx} className={styles.examplesBox}>
                <div className={styles.exampleHeader}>
                  <span>Example {idx + 1}</span>
                  {formData.examples.length > 1 && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => handleRemoveExample(idx)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div className={styles.formRow2}>
                  <Input
                    label="Input"
                    value={ex.input}
                    onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                    placeholder="nums = [-1,0,3,5,9,12], target = 9"
                    required
                  />
                  <Input
                    label="Expected Output"
                    value={ex.output}
                    onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                    placeholder="4"
                    required
                  />
                </div>
                <Input
                  label="Explanation (optional)"
                  value={ex.explanation}
                  onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                  placeholder="9 exists in nums and its index is 4"
                />
              </div>
            ))}
          </div>

          {/* Starter Code Configuration */}
          <div className={styles.formGroup}>
            <label className={styles.label}>Starter Code Templates</label>
            <div className={styles.codeLangTabs}>
              {STARTER_CODE_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  className={`${styles.codeLangBtn} ${
                    activeCodeLang === lang.id ? styles.codeLangBtnActive : ''
                  }`}
                  onClick={() => setActiveCodeLang(lang.id)}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <textarea
              name={`starter-${activeCodeLang}`}
              className={`${styles.textarea} ${styles.codeArea}`}
              style={{ minHeight: '120px' }}
              value={formData.starterCode[activeCodeLang] || ''}
              onChange={(e) => handleStarterCodeChange(activeCodeLang, e.target.value)}
              placeholder={`Write ${activeCodeLang} starter boilerplate function or class...`}
            />
          </div>

          {/* Judge Test Cases Configuration */}
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <label className={styles.label}>Judge Test Cases</label>
                <div className={styles.hint}>
                  Hidden test cases are strictly verified server-side and never exposed to the public API.
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus size={12} />}
                onClick={handleAddTestCase}
              >
                Add Test Case
              </Button>
            </div>

            {formData.judgeTestCases.map((tc, idx) => (
              <div key={idx} className={styles.testCaseCard}>
                <div className={styles.testCaseHeader}>
                  <div className={styles.testCaseNumber}>
                    <span>Test Case #{idx + 1}</span>
                    <span
                      className={
                        tc.isHidden
                          ? styles.testCaseBadgeHidden
                          : styles.testCaseBadgeSample
                      }
                    >
                      {tc.isHidden ? 'Hidden (Judge Only)' : 'Sample (Public)'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={tc.isHidden}
                        onChange={(e) => handleTestCaseChange(idx, 'isHidden', e.target.checked)}
                      />
                      Hidden from users
                    </label>

                    {formData.judgeTestCases.length > 1 && (
                      <button
                        type="button"
                        className={styles.removeBtn}
                        onClick={() => handleRemoveTestCase(idx)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.formRow2}>
                  <div>
                    <span className={styles.hint} style={{ display: 'block', marginBottom: '0.2rem' }}>
                      Input (standard input format)
                    </span>
                    <textarea
                      className={`${styles.textarea} ${styles.codeArea}`}
                      style={{ minHeight: '60px' }}
                      value={tc.input}
                      onChange={(e) => handleTestCaseChange(idx, 'input', e.target.value)}
                      placeholder="e.g. [-1,0,3,5,9,12]\n9"
                      required
                    />
                  </div>
                  <div>
                    <span className={styles.hint} style={{ display: 'block', marginBottom: '0.2rem' }}>
                      Expected Output
                    </span>
                    <textarea
                      className={`${styles.textarea} ${styles.codeArea}`}
                      style={{ minHeight: '60px' }}
                      value={tc.expectedOutput}
                      onChange={(e) => handleTestCaseChange(idx, 'expectedOutput', e.target.value)}
                      placeholder="e.g. 4"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Public Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Public Problem Preview"
        maxWidth="760px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button variant="secondary" onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
          </div>
        }
      >
        {previewData && (
          <div className={styles.previewContainer}>
            <div className={styles.previewSecurityNotice}>
              <CheckCircle2 size={16} />
              <span>
                Verified Public Security Check: Hidden judge test cases are stripped by design and inaccessible.
              </span>
            </div>

            <div className={styles.previewHeader}>
              <div className={styles.previewTitle}>
                <span>{previewData.title}</span>
                <Badge variant={previewData.difficulty.toLowerCase()}>{previewData.difficulty}</Badge>
              </div>

              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {(previewData.topics || []).map((t, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '0.75rem',
                      background: 'var(--bg-subtle)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-xs)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.previewSection}>
              <div className={styles.previewSectionTitle}>Description</div>
              <div className={styles.previewDescription}>{previewData.description}</div>
            </div>

            {previewData.constraints && previewData.constraints.length > 0 && (
              <div className={styles.previewSection}>
                <div className={styles.previewSectionTitle}>Constraints</div>
                <ul style={{ paddingLeft: '1.25rem', margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {previewData.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewData.examples && previewData.examples.length > 0 && (
              <div className={styles.previewSection}>
                <div className={styles.previewSectionTitle}>Examples</div>
                {previewData.examples.map((ex, i) => (
                  <div key={i} className={styles.previewExampleBox}>
                    <div><strong>Input:</strong> {ex.input}</div>
                    <div><strong>Output:</strong> {ex.output}</div>
                    {ex.explanation && <div><strong>Explanation:</strong> {ex.explanation}</div>}
                  </div>
                ))}
              </div>
            )}

            {previewData.starterCode && (
              <div className={styles.previewSection}>
                <div className={styles.previewSectionTitle}>Starter Code</div>
                <div className={styles.codeLangTabs}>
                  {STARTER_CODE_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      type="button"
                      className={`${styles.codeLangBtn} ${
                        previewCodeLang === lang.id ? styles.codeLangBtnActive : ''
                      }`}
                      onClick={() => setPreviewCodeLang(lang.id)}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
                <pre
                  className={styles.codeArea}
                  style={{
                    background: 'var(--bg-canvas)',
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    overflowX: 'auto',
                    margin: 0
                  }}
                >
                  <code>{previewData.starterCode[previewCodeLang] || '// No starter code configured for this language'}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL 3: Destructive Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Problem Deletion"
        maxWidth="520px"
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', width: '100%' }}>
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={deleteSubmitting}
            >
              Cancel
            </Button>

            {problemToDelete && (problemToDelete.totalSubmissions || 0) > 0 ? (
              <>
                <Button
                  variant="secondary"
                  onClick={executeArchiveInstead}
                  loading={deleteSubmitting}
                >
                  Archive Instead
                </Button>
                <Button
                  variant="danger"
                  onClick={() => executeDelete(true)}
                  loading={deleteSubmitting}
                >
                  Force Delete
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                onClick={() => executeDelete(false)}
                loading={deleteSubmitting}
              >
                Delete Problem
              </Button>
            )}
          </div>
        }
      >
        {problemToDelete && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              Target Problem: <strong>{problemToDelete.title}</strong> (<code>{problemToDelete.slug}</code>)
            </p>

            {(problemToDelete.totalSubmissions || 0) > 0 ? (
              <div className={styles.deleteWarningBox}>
                <div className={styles.deleteWarningTitle}>
                  <AlertTriangle size={18} />
                  <span>Submission History Safeguard Triggered</span>
                </div>
                <div className={styles.deleteWarningText}>
                  This problem has <strong>{problemToDelete.totalSubmissions}</strong> existing user submission records.
                  Deleting it will destroy student submission histories and progress metrics.
                  <br /><br />
                  <strong>Recommended:</strong> Select <strong>"Archive Instead"</strong> to unpublish the problem from the catalogue while keeping submission data intact for audit retention.
                </div>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                This problem has 0 user submissions. Deleting it will permanently remove the problem record and any starter templates. This action cannot be undone.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
