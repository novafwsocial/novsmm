/**
 * NOVSMM — Load Test con k6
 * ─────────────────────────────────────────────────────────────────────────────
 * Pruebas de carga para validar que no haya cuellos de botella.
 *
 * INSTALACIÓN:
 *   sudo apt install k6
 *   # o: brew install k6
 *
 * USO:
 *   # Test 1: Carga normal (100 usuarios, 5 minutos)
 *   k6 run --env BASE_URL=https://novsmm.com scripts/load-test.js
 *
 *   # Test 2: Carga pico (1000 usuarios)
 *   k6 run --env BASE_URL=https://novsmm.com --env VUS=1000 scripts/load-test.js
 *
 *   # Test 3: Stress test de creación de órdenes
 *   k6 run --env BASE_URL=https://novsmm.com --env STRESS=true scripts/load-test.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const VUS = parseInt(__ENV.VUS || '100');
const STRESS = __ENV.STRESS === 'true';

// Métricas custom
const errorRate = new Rate('errors');
const loginLatency = new Trend('login_latency', true);
const dashboardLatency = new Trend('dashboard_latency', true);
const orderLatency = new Trend('order_latency', true);

// Configuración (P2-073: const instead of let — options is never reassigned)
export const options = STRESS ? {
  // Stress test: 50 VUs creando órdenes constantemente
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 50 },
        { duration: '1m', target: 0 },
      ],
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<2000'],
    'errors': ['rate<0.05'],
  },
} : {
  // Carga normal
  vus: VUS,
  duration: '5m',
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'errors': ['rate<0.01'],
  },
};

// Credenciales de prueba — se leen de env vars (P1-070, P1-071)
// Setéalas al ejecutar:
//   k6 run --env BASE_URL=https://novsmm.com \
//     --env TEST_EMAIL=admin@novsmm.io \
//     --env TEST_PASSWORD='tu_password_real' \
//     --env TEST_SERVICE_ID='un_service_id_real' \
//     scripts/load-test.js
//
// NUNCA hardcodees passwords reales en este archivo (se commitea a git).
// Para CI, usa secrets del CI runner (GitHub Actions secrets, etc.).
const TEST_EMAIL = __ENV.TEST_EMAIL || 'admin@novsmm.io';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || '';
const TEST_SERVICE_ID = __ENV.TEST_SERVICE_ID || '';

export default function () {
  const cookies = {};

  group('Login', () => {
    // Get CSRF token
    const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`);
    const csrfToken = csrfRes.json('csrfToken');

    // Login
    const loginRes = http.post(
      `${BASE_URL}/api/auth/callback/credentials`,
      `email=${TEST_EMAIL}&password=${TEST_PASSWORD}&csrfToken=${csrfToken}&callbackUrl=%2F&json=true`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Origin': BASE_URL,
        },
        cookies: csrfRes.cookies,
      }
    );

    loginLatency.add(loginRes.timings.duration);
    const loginOk = check(loginRes, {
      'login status 200': (r) => r.status === 200,
    });
    errorRate.add(!loginOk);

    // Guardar cookies de sesión
    Object.assign(cookies, loginRes.cookies);
  });

  sleep(0.5);

  group('Dashboard', () => {
    const dashRes = http.get(`${BASE_URL}/api/dashboard`, { cookies });
    dashboardLatency.add(dashRes.timings.duration);
    const dashOk = check(dashRes, {
      'dashboard status 200': (r) => r.status === 200,
      'dashboard has orders': (r) => r.json('recentOrders') !== undefined,
    });
    errorRate.add(!dashOk);
  });

  sleep(0.5);

  group('Browse Services', () => {
    const svcRes = http.get(`${BASE_URL}/api/services?page=1&limit=24`, { cookies });
    check(svcRes, {
      'services status 200': (r) => r.status === 200,
      'services has data': (r) => r.json('services') !== undefined,
    });
  });

  sleep(0.5);

  group('Wallet', () => {
    const walletRes = http.get(`${BASE_URL}/api/wallet`, { cookies });
    check(walletRes, {
      'wallet status 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  group('Orders', () => {
    const ordersRes = http.get(`${BASE_URL}/api/orders`, { cookies });
    check(ordersRes, {
      'orders status 200': (r) => r.status === 200,
    });
  });

  sleep(0.5);

  group('Notifications', () => {
    const notifRes = http.get(`${BASE_URL}/api/notifications`, { cookies });
    check(notifRes, {
      'notifications status 200': (r) => r.status === 200,
    });
  });

  sleep(1);

  // Stress test: crear órdenes
  if (STRESS) {
    // P1-071: Skip order creation if TEST_SERVICE_ID not provided (was hardcoded 'test-service-id')
    if (!TEST_SERVICE_ID) {
      console.warn('STRESS=true pero TEST_SERVICE_ID no seteado — saltando creación de órdenes');
    } else {
      group('Create Order (stress)', () => {
        const orderRes = http.post(
          `${BASE_URL}/api/orders`,
          JSON.stringify({
            serviceId: TEST_SERVICE_ID,
            quantity: 1000,
            link: 'https://instagram.com/test',
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              'Origin': BASE_URL,
            },
            cookies,
          }
        );
        orderLatency.add(orderRes.timings.duration);
        check(orderRes, {
          'order creation handled': (r) => r.status === 200 || r.status === 400 || r.status === 402,
        });
      });
      sleep(0.5);
    }
  }

  group('Public Endpoints', () => {
    http.get(`${BASE_URL}/api/health/live`);
    http.get(`${BASE_URL}/api/public/settings`);
    http.get(`${BASE_URL}/api/status`);
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data),
    'load-test-results.json': JSON.stringify(data, null, 2),
  };
}

function textSummary(data) {
  const metrics = data.metrics;
  return `
════════════════════════════════════════════════════════════════
  NOVSMM — Load Test Results
════════════════════════════════════════════════════════════════

Duration: ${data.state.testRunDurationMs / 1000}s
VUs: ${VUS}
Total Requests: ${metrics.http_reqs.values.count}
Error Rate: ${(metrics.errors.values.rate * 100).toFixed(2)}%

Latency:
  p50: ${metrics.http_req_duration.values['p(50)'].toFixed(0)}ms
  p95: ${metrics.http_req_duration.values['p(95)'].toFixed(0)}ms
  p99: ${metrics.http_req_duration.values['p(99)'].toFixed(0)}ms

Login Latency (p95): ${metrics.login_latency ? metrics.login_latency.values['p(95)'].toFixed(0) : 'N/A'}ms
Dashboard Latency (p95): ${metrics.dashboard_latency ? metrics.dashboard_latency.values['p(95)'].toFixed(0) : 'N/A'}ms

Thresholds:
  ${data.thresholds ? Object.entries(data.thresholds).map(([k, v]) => `  ${k}: ${v.ok ? '✅ PASS' : '❌ FAIL'}`).join('\n') : 'N/A'}

════════════════════════════════════════════════════════════════
`;
}
