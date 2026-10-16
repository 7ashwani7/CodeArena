import { Play, Sparkles, Terminal, Activity, ArrowRight } from 'lucide-react';
import styles from './Hero.module.css';

export function Hero() {
  return (
    <section className={styles.hero} id="hero">
      <div className={styles.content}>
        <div className={styles.pill}>
          <Sparkles size={14} />
          <span>Production-Quality LeetCode Clone</span>
        </div>

        <h1 className={styles.title}>
          Master Algorithms & <br />
          <span className={styles.titleHighlight}>Elevate Your Code</span>
        </h1>

        <p className={styles.subtitle}>
          CodeArena delivers an authentic technical interview environment with Monaco Editor, Judge0 real-time test execution, MongoDB problem catalog, and secure cookie authentication.
        </p>

        <div className={styles.actions}>
          <a href="#diagnostics" className={styles.btnPrimary}>
            <Activity size={18} />
            Check Live API Status
          </a>
          <a href="#architecture" className={styles.btnSecondary}>
            View Architecture
            <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <div className={styles.codeWindow}>
        <div className={styles.windowBar}>
          <div className={styles.windowDots}>
            <div className={styles.dotRed} />
            <div className={styles.dotYellow} />
            <div className={styles.dotGreen} />
          </div>
          <span className={styles.windowTitle}>twoSum.js — CodeArena Sandbox</span>
          <Terminal size={14} color="#8b949e" />
        </div>
        <div className={styles.codeBody}>
          <pre>
            <span className={styles.comment}>// Two Sum Problem (LeetCode #1)</span>{'\n'}
            <span className={styles.keyword}>function</span> <span className={styles.func}>twoSum</span>(<span className={styles.variable}>nums</span>, <span className={styles.variable}>target</span>) &#123;{'\n'}
            {'  '}<span className={styles.keyword}>const</span> <span className={styles.variable}>map</span> = <span className={styles.keyword}>new</span> <span className={styles.func}>Map</span>();{'\n'}
            {'  '}<span className={styles.keyword}>for</span> (<span className={styles.keyword}>let</span> <span className={styles.variable}>i</span> = 0; <span className={styles.variable}>i</span> &lt; <span className={styles.variable}>nums</span>.length; <span className={styles.variable}>i</span>++) &#123;{'\n'}
            {'    '}<span className={styles.keyword}>const</span> <span className={styles.variable}>diff</span> = <span className={styles.variable}>target</span> - <span className={styles.variable}>nums</span>[<span className={styles.variable}>i</span>];{'\n'}
            {'    '}<span className={styles.keyword}>if</span> (<span className={styles.variable}>map</span>.<span className={styles.func}>has</span>(<span className={styles.variable}>diff</span>)) &#123;{'\n'}
            {'      '}<span className={styles.keyword}>return</span> [<span className={styles.variable}>map</span>.<span className={styles.func}>get</span>(<span className={styles.variable}>diff</span>), <span className={styles.variable}>i</span>];{'\n'}
            {'    '}&#125;{'\n'}
            {'    '}<span className={styles.variable}>map</span>.<span className={styles.func}>set</span>(<span className={styles.variable}>nums</span>[<span className={styles.variable}>i</span>], <span className={styles.variable}>i</span>);{'\n'}
            {'  '}&#125;{'\n'}
            {'  '}<span className={styles.keyword}>return</span> [];{'\n'}
            &#125;
          </pre>

          <div className={styles.badgeAccepted}>
            <Play size={14} fill="#3fb950" />
            <span>Judge0 Result: Accepted (Runtime: 52ms, Memory: 42.1MB)</span>
          </div>
        </div>
      </div>
    </section>
  );
}
