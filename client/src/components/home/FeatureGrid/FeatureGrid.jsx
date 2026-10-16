import { Code2, Cpu, ShieldCheck, Database, Layers, GitBranch } from 'lucide-react';
import styles from './FeatureGrid.module.css';

const FEATURES = [
  {
    icon: Code2,
    title: 'Monaco Code Editor',
    description: 'The exact battle-tested editor that powers VS Code. Featuring multi-language syntax highlighting, auto-completion, line numbers, and dark theme.',
    stage: 'Phase 3'
  },
  {
    icon: Cpu,
    title: 'Judge0 Sandbox Engine',
    description: 'Sandboxed code execution against isolated test cases with strict CPU time limits, memory caps, and standardized return verdicts.',
    stage: 'Phase 4'
  },
  {
    icon: Database,
    title: 'MongoDB Problem Arena',
    description: 'Rich problem bank organized by difficulty (Easy, Medium, Hard), topic tags (DP, Graphs, Arrays), test suites, and starter code stubs.',
    stage: 'Phase 3'
  },
  {
    icon: ShieldCheck,
    title: 'Secure HTTP-Only Auth',
    description: 'JWT credentials sealed in HTTP-only, SameSite cookies. Safeguards user tokens against cross-site scripting (XSS) and token theft.',
    stage: 'Phase 2'
  },
  {
    icon: Layers,
    title: 'Layered Backend Architecture',
    description: 'Clean separation of Express routers, controllers, services, models, middleware, and validators for production enterprise reliability.',
    stage: 'Phase 1 Ready'
  },
  {
    icon: GitBranch,
    title: 'CI Automated Workflows',
    description: 'GitHub Actions matrix CI pipeline executing linting, Supertest API checks, Vitest client suites, and production bundle builds.',
    stage: 'Phase 1 Ready'
  }
];

export function FeatureGrid() {
  return (
    <section className={styles.section} id="features">
      <div className={styles.header}>
        <div className={styles.pill}>
          <span>Modular Full-Stack Blueprint</span>
        </div>
        <h2 className={styles.title}>Engineered for Full-Stack Mastery</h2>
        <p className={styles.subtitle}>
          Each layer of CodeArena is built to professional production standards with clean code separation, robust error boundaries, and full test coverage.
        </p>
      </div>

      <div className={styles.grid}>
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className={styles.card}>
              <div className={styles.iconWrapper}>
                <Icon size={22} />
              </div>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardDescription}>{feature.description}</p>
              <span className={styles.badgeRoadmap}>{feature.stage}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
