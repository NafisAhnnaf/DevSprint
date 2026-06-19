import http from "k6/http";
import { check, sleep } from "k6";
import { SharedArray } from "k6/data";
import { randomString } from "https://jslib.k6.io/k6-utils/1.2.0/index.js";

// Test configuration
export const options = {
  stages: [
    { duration: "2m", target: 100 }, // Ramp up to 100 users
    { duration: "5m", target: 200 }, // Ramp to 200 users
    { duration: "8m", target: 500 }, // Ramp to 500 users
    { duration: "5m", target: 500 }, // Stay at 500 users
    { duration: "2m", target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ["p(95)<2000"], // 95% of requests < 2s
    http_req_failed: ["rate<0.05"], // <5% failure rate
  },
};

// Generate 500 test users (run once, shared across VUs)
const testUsers = new SharedArray("users", function () {
  const users = [];
  for (let i = 1; i <= 500; i++) {
    users.push({
      email: `testuser${i}@iut.edu`,
      password: "password123",
      studentId: `2024${String(i).padStart(3, "0")}`,
      name: `Test User ${i}`,
    });
  }
  return users;
});

// Base URL - adjust based on your environment
const BASE_URL = __ENV.API_URL || "http://gateway:4001";

export default function () {
  // Each VU gets a unique user index
  const userIndex = (__VU - 1) % testUsers.length;
  const user = testUsers[userIndex];

  let token = null;
  const today = new Date().toISOString().split("T")[0];

  // Step 1: Register user (only if not already registered)
  const registerPayload = JSON.stringify({
    email: user.email,
    password: user.password,
    confirmPassword: user.password,
    studentId: user.studentId,
    name: user.name,
  });

  let registerRes = http.post(
    `${BASE_URL}/api/identity/auth/register`,
    registerPayload,
    { headers: { "Content-Type": "application/json" } },
  );

  // If registration fails (user might already exist), try login
  if (registerRes.status !== 201) {
    console.log(`User ${user.studentId} may already exist, trying login...`);
  }

  // Step 2: Login to get token
  const loginPayload = JSON.stringify({
    studentId: user.studentId,
    password: user.password,
  });

  const loginRes = http.post(
    `${BASE_URL}/api/identity/auth/login`,
    loginPayload,
    { headers: { "Content-Type": "application/json", "x-load-test": "true" } },
  );

  const loginSuccess = check(loginRes, {
    "login successful": (r) => r.status === 200,
    "token received": (r) => r.json("payload.token") !== undefined,
  });

  if (!loginSuccess) {
    console.error(
      `Login failed for user ${user.studentId}: ${loginRes.status}`,
    );
    sleep(1);
    return;
  }

  token = loginRes.json("payload.token");

  // Step 3: Check available stock for today
  const stockRes = http.get(`${BASE_URL}/api/inventory/stock/date/${today}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  check(stockRes, {
    "stock check successful": (r) => r.status === 200,
  });

  if (stockRes.status !== 200) {
    console.log(`Stock check failed for ${today}`);
    sleep(1);
    return;
  }

  // Handle wrapped response
  const stockData = stockRes.json();
  let stocks = [];

  if (stockData.payload && Array.isArray(stockData.payload.stocks)) {
    stocks = stockData.payload.stocks;
  } else if (Array.isArray(stockData)) {
    stocks = stockData;
  }

  // Find available stock
  const availableStock = stocks.find((s) => s.status === "AVAILABLE");

  if (!availableStock) {
    console.log(`No available stock for ${today}`);
    sleep(1);
    return;
  }

  // Step 4: Place order (only once per user)
  const orderRes = http.post(
    `${BASE_URL}/api/inventory/order`,
    null, // Body not needed as userId comes from token
    { headers: { Authorization: `Bearer ${token}` } },
  );

  const orderSuccess = check(orderRes, {
    "order placed successfully": (r) => r.status === 201 || r.status === 200,
    "order confirmation received": (r) =>
      r.json("payload.order.id") !== undefined,
  });

  if (orderSuccess) {
    console.log(`✓ User ${user.studentId} placed order successfully`);
  } else {
    // Check if user already ordered today
    if (orderRes.status === 409 || orderRes.status === 400) {
      console.log(`User ${user.studentId} may have already ordered today`);
    } else {
      console.error(
        `Order failed for user ${user.studentId}: ${orderRes.status}`,
      );
    }
  }

  // Step 5: Verify order via notification stream? (optional)
  // This would require SSE connection which k6 doesn't support well

  // Random think time between requests (1-3 seconds)
  sleep(Math.random() * 2 + 1);
}

// Setup function - runs once before test
export function setup() {
  console.log("=== Starting Iftar Rush Load Test ===");
  console.log(`Target: ${BASE_URL}`);
  console.log(`Users: 500, Stocks: 500, Duration: 22 minutes`);

  // Create a single admin user for stock creation
  const adminUser = {
    email: "admin@iut.edu",
    password: "admin123",
    confirmPassword: "admin123",
    studentId: "ADMIN001",
    name: "Admin User",
  };

  // Try to register admin (ignore if already exists)
  const registerPayload = JSON.stringify(adminUser);
  http.post(`${BASE_URL}/api/identity/auth/register`, registerPayload, {
    headers: { "Content-Type": "application/json" },
  });

  // Login to get token
  const loginPayload = JSON.stringify({
    studentId: adminUser.studentId,
    password: adminUser.password,
  });

  const loginRes = http.post(
    `${BASE_URL}/api/identity/auth/login`,
    loginPayload,
    { headers: { "Content-Type": "application/json" } },
  );

  // Check if login succeeded
  if (loginRes.status !== 200) {
    console.error(`Failed to login admin: ${loginRes.status}`);
    return { startTime: new Date().toISOString(), error: "No admin token" };
  }

  // Extract token from payload.token
  const token = loginRes.json("payload.token");
  console.log(`✓ Admin token obtained`);

  // Create stock for today
  const today = new Date().toISOString().split("T")[0];
  const stockPayload = JSON.stringify({
    quantity: 500,
    forDate: today,
  });

  const stockRes = http.post(`${BASE_URL}/api/inventory/stock`, stockPayload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (stockRes.status === 201 || stockRes.status === 200) {
    console.log(`✓ Created 500 stocks for ${today}`);

    // Verify stock was created
    const verifyRes = http.get(
      `${BASE_URL}/api/inventory/stock/date/${today}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );

    if (verifyRes.status === 200) {
      const data = verifyRes.json();
      const stockCount = data.payload?.stocks?.length || 0;
      console.log(`📊 Verified ${stockCount} stocks in database`);
    }
  } else {
    console.log(`⚠ Stock creation returned: ${stockRes.status}`);
  }

  return {
    startTime: new Date().toISOString(),
    adminToken: token, // Return token in case needed
  };
}

// Teardown function - runs once after test
export function teardown(data) {
  console.log("=== Load Test Completed ===");
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  if (data.error) {
    console.log(`Error: ${data.error}`);
  }
}
