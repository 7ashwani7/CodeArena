import { Link } from 'react-router-dom';
import { ArrowRight, Activity } from 'lucide-react';
import { Button } from '../../components/common/Button/Button';
import { Badge } from '../../components/common/Badge/Badge';
import { StatusBadge } from '../../components/common/StatusBadge/StatusBadge';
import { SAMPLE_PROBLEMS } from '../../data/sampleProblems';
import styles from './HomePage.module.css';

const TOPIC_COLLECTIONS = [
  {
    name: 'Arrays & Hashing',
    count: '24 Problems',
    description: 'Hash maps, two-pointer techniques, sliding windows, and prefix sums.'
  },
  {
    name: 'Dynamic Programming',
    count: '18 Problems',
    description: 'Memoization, tabulation, knapsack patterns, and optimal substructure.'
  },
  {
    name: 'Trees & Graphs',
    count: '20 Problems',
    description: 'DFS/BFS traversals, lowest common ancestor, topological sorting.'
  },
  {
    name: 'Linked Lists & Stack',
    count: '15 Problems',
    description: 'Pointers, cycles, monotonicity, and recursive data structures.'
  }
];

export function HomePage({ healthState }) {
  const featured = SAMPLE_PROBLEMS[0]; // Two Sum
  const { health, loading } = healthState || {};

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <span className={styles.tagline}>Developer-First Coding Practice</span>
        <h1 className={styles.title}>
          Practice algorithmic problem solving in an authentic workspace.
        </h1>
        <p className={styles.description}>
          CodeArena is an online practice platform designed for software engineers preparing for technical interviews. Solve algorithmic problems, inspect test case executions, and track progress across core computer science topics.
        </p>

        <div className={styles.heroActions}>
          <Link to="/problems">
            <Button variant="primary" size="lg" icon={<ArrowRight size={16} />} iconPosition="right">
              Explore Problem Catalogue
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="outline" size="lg">
              View Developer Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Backend API Health Status Indicator */}
      <section className={styles.diagnosticsBanner}>
        <div className={styles.diagnosticsInfo}>
          <Activity size={18} color="var(--accent-primary)" />
          <div className={styles.diagnosticsText}>
            <strong>API Health Status:</strong> Express REST server running on port 5000 with MongoDB diagnostic inspection.
          </div>
        </div>
        <StatusBadge
          status={loading ? 'loading' : health?.status === 'healthy' ? 'healthy' : 'degraded'}
          label={loading ? 'Connecting...' : health?.status === 'healthy' ? 'API Operational' : 'Degraded (DB Standby)'}
        />
      </section>

      {/* Featured Daily Problem */}
      {featured && (
        <section>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Featured Problem</h2>
              <p className={styles.sectionSubtitle}>Recommended problem to start today's practice session.</p>
            </div>
            <Link to="/problems" className={styles.viewAllLink}>
              <span>All problems</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className={styles.featuredCard}>
            <div className={styles.featuredDetails}>
              <div className={styles.featuredBadgeRow}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  #{featured.number}
                </span>
                <Badge variant={featured.difficulty.toLowerCase()}>{featured.difficulty}</Badge>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {featured.category}
                </span>
              </div>
              <h3 className={styles.featuredTitle}>{featured.title}</h3>
              <p className={styles.featuredSnippet}>
                Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.
              </p>
            </div>

            <Link to={`/problems/${featured.slug}`}>
              <Button variant="primary" size="md">
                Solve Problem
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Topic Collections */}
      <section>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Core Topic Curations</h2>
            <p className={styles.sectionSubtitle}>Focused sets targeting frequently asked data structures & algorithms.</p>
          </div>
        </div>

        <div className={styles.topicGrid}>
          {TOPIC_COLLECTIONS.map((topic) => (
            <Link
              key={topic.name}
              to={`/problems?topic=${encodeURIComponent(topic.name)}`}
              className={styles.topicCard}
            >
              <div className={styles.topicTitle}>
                <span>{topic.name}</span>
                <span className={styles.topicCount}>{topic.count}</span>
              </div>
              <p className={styles.topicDescription}>{topic.description}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
