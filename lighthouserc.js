/**
 * Lighthouse CI configuration for novsmm.shop.
 *
 * P-003: Core Web Vitals monitoring. Run with:
 *   npx @lhci/cli autorun
 *
 * Or manually:
 *   npx lighthouse https://novsmm.shop --view --preset=desktop
 *   npx lighthouse https://novsmm.shop --view --preset=perf
 *
 * Thresholds are set to "good" per Core Web Vitals standards:
 * - LCP < 2.5s (good), < 4s (needs improvement), > 4s (poor)
 * - CLS < 0.1 (good), < 0.25 (needs improvement), > 0.25 (poor)
 * - INP < 200ms (good), < 500ms (needs improvement), > 500ms (poor)
 */
module.exports = {
  ci: {
    collect: {
      url: [
        "https://novsmm.shop/",
        "https://novsmm.shop/pricing",
        "https://novsmm.shop/changelog",
      ],
      numberOfRuns: 3,
      settings: {
        preset: "desktop",
      },
    },
    assert: {
      assertions: {
        // Core Web Vitals
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 600 }],

        // Performance scores
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["warn", { minScore: 0.8 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
