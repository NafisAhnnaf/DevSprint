# Project Upgrades & Changes walkthrough

This document summarizes the architectural and code changes implemented to make the DevSprint cafeteria application a production-grade, fault-tolerant, and observable system.

---

## 🛠️ Architectural Upgrades

### 1. Nginx Reverse Proxy & Unified Gateway (Port 80)
- **Problem:** Frontend and backend components were mapped to separate ports (5173, 5001, etc.), causing CORS challenges, routing issues, and security vulnerabilities.
- **Solution:** Configured Nginx as a reverse proxy listening on port `80`.
  - **Frontend:** Requests to `/` proxy to `dev-sprint-frontend:5173`.
  - **API Routing:** Requests to `/api/` proxy to `gateway:4001`.
  - **Real-time SSE:** Configured dedicated SSE buffering and proxy timeout exclusions for `/api/notification/orders` to ensure real-time queue notifications flow instantly.
- **Config file:** [server/nginx/nginx.conf](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/nginx/nginx.conf)

### 2. Centralized Log Aggregation (PLG Stack)
- **Problem:** Microservice logs were scattered across separate terminal sessions and container outputs, making debugging difficult.
- **Solution:** Added **Grafana Loki** and **Promtail** to the system.
  - Promtail scrapes standard container logs from `/var/lib/docker/containers` and forwards them to Loki.
  - Automatically provisioned Loki inside Grafana's datasources so log viewing is ready right out of the box.
- **Config files:**
  - [server/Promtail/promtail-config.yml](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Promtail/promtail-config.yml)
  - [server/Grafana/provisioning/datasources/datasource.yml](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Grafana/provisioning/datasources/datasource.yml)

### 3. Database Connection Pooling & Resilience
- **Problem:** Scaling microservices to multiple replicas could easily exhaust PostgreSQL's max connection limit (100) and crash databases.
- **Solution:** Configured connection limits in Prisma database URLs.
  - Appended `connection_limit=3` to the PostgreSQL connection strings in `docker-compose.yml` for `identity`, `inventory`, and `kitchen`.
  - This ensures that even with 10+ scaled instances, PostgreSQL connections remain far below limits, effectively simulating a PgBouncer setup at the application layer.

### 4. Container Scaling & Infrastructure Chaos
- **Problem:** Microservice containers were running in single instances with hardcoded container names, preventing scalability and container load testing.
- **Solution:** 
  - Scaled the `gateway`, `identity`, `inventory`, `kitchen`, and `notification` services to **2 replicas** each.
  - Removed `container_name` fields from scaled services (allowing Docker Compose to create unique IDs).
  - Configured **Pumba** (Docker-native chaos injector) as a docker-compose service under the `chaos` profile to automatically test microservice resilience.

---

## 💻 Code Level Upgrades

### 1. Unified Dynamic API Base URL (Frontend)
- **Problem:** API URLs were hardcoded to port `8005` in frontend page components, making the app fail in production/containerized environments.
- **Solution:**
  - Standardized all client components to use relative paths (e.g., `api.post('/api/identity/auth/login')`).
  - Updated `api.js` to dynamically detect environment: uses `window.location.origin` in production (proxying via Nginx) and falls back to localhost in dev.
  - Resolved Grafana dashboard iframe hosts dynamically to prevent broken charts when running the application on external monitors or devices.
- **Updated Files:**
  - [frontend/src/services/api.js](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/frontend/src/services/api.js)
  - [frontend/src/pages/Login.jsx](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/frontend/src/pages/Login.jsx)
  - [frontend/src/pages/Signup.jsx](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/frontend/src/pages/Signup.jsx)
  - [frontend/src/pages/StudentUI.jsx](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/frontend/src/pages/StudentUI.jsx)
  - [frontend/src/pages/AdminUI.jsx](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/frontend/src/pages/AdminUI.jsx)

### 2. RabbitMQ Dead-Letter Queues (DLQ) & Retry Pacing
- **Problem:** Unhandled errors dropped messages immediately, risking order loss during transient database issues or network drops.
- **Solution:** Upgraded the shared `RabbitMQ` client library across all microservices:
  - Configured native DLX (`dlx_exchange`) and DLQ (`*_dlq`) queues.
  - Introduced a 3-attempt retry loop with 2-second delays for failed messages.
  - If a message fails 3 times, it is natively nacked and routed to the corresponding service DLQ for inspection.
- **Updated Files:**
  - [server/Inventory/src/lib/rabbitmq.ts](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Inventory/src/lib/rabbitmq.ts)
  - [server/Kitchen/src/lib/rabbitmq.ts](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Kitchen/src/lib/rabbitmq.ts)
  - [server/Notification/src/lib/rabbitmq.ts](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Notification/src/lib/rabbitmq.ts)

### 3. Kitchen Background Job Startup Recovery
- **Problem:** If the Kitchen container crashed mid-preparation, the order preparation `setTimeout` was lost, and the order remained stuck in queue forever.
- **Solution:** Added a startup recovery scan in `kitchen.consumer.ts`.
  - When the Kitchen service boots, it queries the database for any jobs stuck in the `ACCEPTED` state.
  - It automatically spawns new cooking timers to complete these orders, ensuring 100% order completion despite infrastructure crashes.
- **Updated Files:**
  - [server/Kitchen/src/services/kitchen.service.ts](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Kitchen/src/services/kitchen.service.ts)
  - [server/Kitchen/src/consumers/kitchen.consumer.ts](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Kitchen/src/consumers/kitchen.consumer.ts)

### 4. Admin Chaos Dashboard Integration
- **Problem:** The admin panel chaos buttons were non-functional. The Express body parser in the Gateway was mounted *after* the chaos routes, making `req.body` undefined. Additionally, the `/api/chaos/load-test` endpoint didn't exist.
- **Solution:**
  - Repositioned `express.json()` to the top of the Gateway's middleware stack.
  - Enhanced Gateway `/chaos/kill` to proxy the kill command to the appropriate microservice container.
  - Implemented `/api/chaos/load-test` inside the Gateway to spawn a background request loop (simulating client orders/stock hits), lighting up the Grafana charts in real time.
- **Updated Files:**
  - [server/Gateway/src/index.ts](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Gateway/src/index.ts)
  - [server/Gateway/src/middlewares/chaos.middleware.ts](file:///Users/tabib/Documents/WEB%20DEVELOPMENT/devsprint1/DevSprint/server/Gateway/src/middlewares/chaos.middleware.ts)

---

## 🚀 How to Run and Test

1. **Verify Docker and Network:**
   Ensure no process is occupying port `80` or `3000`.

2. **Boot up the stack:**
   ```bash
   docker compose up --build -d
   ```
   *This starts Postgres databases, Redis, RabbitMQ, 2 replicas of each microservice, Nginx, Prometheus, Grafana, Loki, and Promtail.*

3. **Boot up with Chaos Injection (Optional):**
   ```bash
   docker compose --profile chaos up --build -d
   ```
   *This also starts **Pumba**, which will randomly kill kitchen service containers every 45 seconds to demonstrate the Kitchen background job startup recovery.*

4. **Verify services:**
   - **Frontend UI & API Entry:** `http://localhost`
   - **Grafana Dashboard:** `http://localhost:3000` (Access metrics, throughput, and system logs directly)
   - **RabbitMQ Dashboard:** `http://localhost:15672` (Inspect queues, exchanges, and DLQs)
