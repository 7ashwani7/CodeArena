import { Layers, Terminal, FolderTree } from 'lucide-react';
import styles from './ArchitectureSection.module.css';

export function ArchitectureSection() {
  return (
    <section className={styles.section} id="architecture">
      <div className={styles.card}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            <Layers size={22} color="var(--accent-primary)" />
            Monorepo Architecture & Startup Workflow
          </h3>
          <p className={styles.subtitle}>
            A clean, decoupled npm workspaces structure designed for enterprise scalability and full-stack software engineer interviews.
          </p>
        </div>

        <div className={styles.twoCol}>
          <div className={styles.col}>
            <h4>
              <FolderTree size={18} />
              Monorepo Directory Layout
            </h4>
            <pre className={styles.codeBlock}>
              {`CodeArena/
├── client/              # React 19 + Vite SPA
│   ├── src/components/  # Modular UI components
│   ├── src/hooks/       # Custom hooks (e.g., useHealthCheck)
│   ├── src/services/    # API HTTP wrappers
│   └── src/pages/       # Route-level pages
├── server/              # Node.js + Express REST API
│   ├── src/config/      # DB connection & env loader
│   ├── src/controllers/ # Request handlers
│   ├── src/services/    # Core business logic
│   ├── src/routes/      # Endpoint routing
│   └── tests/           # Supertest API tests
├── docs/                # Architecture & API documentation
├── .github/workflows/   # CI matrix test pipeline
└── package.json         # Workspaces root orchestrator`}
            </pre>
          </div>

          <div className={styles.col}>
            <h4>
              <Terminal size={18} />
              Quick Developer Commands
            </h4>
            <div className={styles.stepsList}>
              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <h5>Start Both Client & Server Concurrently</h5>
                  <p>
                    Run <code className={styles.inlineCode}>npm run dev</code> from project root. Starts Express on port 5000 and Vite on 5173 with automatic live reloading.
                  </p>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <h5>Run Integration & Unit Test Suites</h5>
                  <p>
                    Run <code className={styles.inlineCode}>npm run test</code> to execute all Supertest API tests and React Testing Library suites across all workspaces.
                  </p>
                </div>
              </div>

              <div className={styles.stepItem}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <h5>Configure MongoDB Connection</h5>
                  <p>
                    Copy <code className={styles.inlineCode}>server/.env.example</code> to <code className={styles.inlineCode}>server/.env</code> and supply your MongoDB Atlas connection URI string.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
