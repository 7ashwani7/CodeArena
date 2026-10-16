import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Briefcase,
  Mail,
  Edit3,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Code2
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
import { Modal } from '../../components/common/Modal/Modal';
import { Input } from '../../components/common/Input/Input';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService } from '../../services/userService';
import styles from './ProfilePage.module.css';

/**
 * Format ISO date string into readable local timestamp
 */
function formatDate(isoString) {
  if (!isoString) return 'Recently';
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
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
        <div style={{ color: 'var(--accent-text, #38bdf8)' }}>Submissions: {total}</div>
        <div style={{ color: 'var(--color-easy, #22c55e)' }}>Accepted: {accepted}</div>
      </div>
    );
  }
  return null;
}

export function ProfilePage() {
  const { user: authUser, updateProfile: updateAuthProfile } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState(authUser);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit profile state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profileData, progressData] = await Promise.all([
        userService.getUserProfile(),
        userService.getUserProgress()
      ]);
      setProfile(profileData);
      setProgress(progressData);
    } catch (err) {
      setError(err.message || 'Failed to load profile details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenEdit = () => {
    setName(profile?.name || '');
    setBio(profile?.bio || '');
    setTargetRole(profile?.targetRole || '');
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await userService.updateUserProfile({
        name,
        bio,
        targetRole
      });
      setProfile(updated);
      updateAuthProfile(updated);
      setIsEditModalOpen(false);
      toast.success('Profile updated successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const activity = progress?.activity || [];
  const overview = progress?.overview || {
    totalSolved: 0,
    totalProblems: 0,
    submissions: { total: 0, accepted: 0, acceptanceRate: 0.0 }
  };
  const recentSubmissions = progress?.recentSubmissions || [];
  const acceptedSubmissions = recentSubmissions.filter((s) => s.status === 'Accepted');

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className={styles.spin} />
          <p style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>Loading user profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div
          style={{
            padding: '1.5rem',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Profile Header */}
      <div className={styles.profileHeader}>
        <div className={styles.userIdent}>
          <div className={styles.avatarLarge}>
            {profile?.name ? profile.name[0].toUpperCase() : profile?.username ? profile.username[0].toUpperCase() : 'U'}
          </div>

          <div className={styles.userNames}>
            <h1>{profile?.name || profile?.username}</h1>
            <div className={styles.usernameHandle}>@{profile?.username}</div>
            <p className={styles.userBio}>
              {profile?.bio || 'No bio provided yet. Click "Edit Profile" to share your background.'}
            </p>

            <div className={styles.userMeta}>
              <span className={styles.metaItem}>
                <Briefcase size={14} />
                <span>{profile?.targetRole || 'Software Engineer'}</span>
              </span>
              <span className={styles.metaItem}>
                <Calendar size={14} />
                <span>Member since {formatDate(profile?.createdAt)}</span>
              </span>
              <span className={styles.metaItem}>
                <Mail size={14} />
                <span>{profile?.email}</span>
              </span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<Edit3 size={13} />}
          onClick={handleOpenEdit}
        >
          Edit Profile
        </Button>
      </div>

      {/* Real Activity Timeline (Recharts) */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>Submission Activity Timeline</h2>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {overview.submissions.total} Submissions Evaluated
          </span>
        </div>

        {activity.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
            <Calendar size={32} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Submission History</div>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
              Practice challenges to view your actual activity chart over time.
            </p>
          </div>
        ) : (
          <div style={{ width: '100%', height: 220 }} aria-label="Profile submission activity chart">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="profileTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent-primary, #38bdf8)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--accent-primary, #38bdf8)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, #334155)" opacity={0.5} />
                <XAxis dataKey="date" stroke="var(--text-muted, #94a3b8)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted, #94a3b8)" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Submissions"
                  stroke="var(--accent-primary, #38bdf8)"
                  fillOpacity={1}
                  fill="url(#profileTotal)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Real Solved Challenges Archive */}
      <div className={styles.sectionCard}>
        <div className={styles.sectionHeading}>
          <h2 className={styles.sectionTitle}>
            Solved Challenges ({overview.totalSolved} unique)
          </h2>
          <Link to="/dashboard" style={{ fontSize: '0.8125rem', color: 'var(--accent-text)' }}>
            View Dashboard
          </Link>
        </div>

        {acceptedSubmissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={32} style={{ marginBottom: '0.5rem', opacity: 0.6 }} />
            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>No Solved Problems Yet</div>
            <p style={{ fontSize: '0.8125rem', marginTop: '0.25rem', color: 'var(--text-secondary)' }}>
              Submit accepted solutions in the coding workspace to build your practice archive.
            </p>
            <Link to="/problems" style={{ marginTop: '0.75rem', display: 'inline-block' }}>
              <Button variant="primary" size="sm" icon={<Code2 size={13} />}>
                Browse Problems
              </Button>
            </Link>
          </div>
        ) : (
          <div className={styles.solvedList}>
            {acceptedSubmissions.map((sub) => {
              const prob = sub.problemId || {};
              return (
                <div key={sub._id} className={styles.solvedRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <CheckCircle2 size={16} color="var(--color-easy)" />
                    <Link to={`/problems/${prob.slug || ''}`} className={styles.solvedTitle}>
                      {prob.title || 'Algorithmic Problem'}
                    </Link>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {sub.language}
                    </span>
                  </div>

                  {prob.difficulty && (
                    <Badge variant={prob.difficulty.toLowerCase()}>{prob.difficulty}</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Profile Information"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={saving}
              onClick={handleSaveProfile}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ada Lovelace"
          />

          <Input
            label="Target Engineering Role"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. Full-Stack Software Engineer"
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Tell others about your engineering interests and target roles..."
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                resize: 'vertical'
              }}
            />
          </div>
        </form>
      </Modal>
    </div>
  );
}
