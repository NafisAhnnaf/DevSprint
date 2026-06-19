# Project Context

This document serves as a comprehensive overview of the DevSprint project. It is intended to provide developers and AI assistants with a full understanding of the architecture, structure, and current state of the project without needing to read the code line-by-line.

## 1. Project Structure

The repository is divided into two main parts:
- `frontend/`: A React application built with Vite.
- `server/`: The backend microservices and infrastructure configuration.

```
DevSprint/
├── frontend/               # React + Vite frontend
│   ├── src/                # Frontend source code
│   ├── package.json        # Frontend dependencies
│   └── Dockerfile          # Frontend container configuration
├── server/                 # Backend infrastructure
│   ├── docker-compose.yml  # Orchestration for the entire stack
│   ├── Gateway/            # API Gateway service
│   ├── Identity/           # Identity & Auth service
│   ├── Inventory/          # Inventory & Order management service
│   ├── Kitchen/            # Kitchen operations service
│   ├── Notification/       # Notifications service (SSE)
│   ├── Prometheus/         # Prometheus configuration
│   ├── Grafana/            # Grafana dashboards and provisioning
│   ├── Tests/              # k6 load testing scripts
│   └── README.md           # API reference docs
└── docs/                   # Documentation
    └── context.md          # You are here
```

## 2. Architecture Overview

The system uses a microservices architecture orchestrated by Docker Compose. 

### Services
1.  **Frontend (`dev-sprint-frontend`)**: React application running on port `5173`. Connects to the API Gateway.
2.  **API Gateway (`gateway`)**: Node.js service running on port `5001` (internal `4001`). Routes traffic to appropriate microservices.
3.  **Identity Service (`identity`)**: Handles authentication, user management, and admin roles. Uses a dedicated PostgreSQL database (`user_db`) and Redis.
4.  **Inventory Service (`inventory`)**: Manages stock and incoming orders. Uses a dedicated PostgreSQL database (`inventory_db`), Redis, and publishes events to RabbitMQ (`order_exchange`).
5.  **Kitchen Service (`kitchen`)**: Handles order fulfillment operations. Connects to PostgreSQL (`kitchen_db`), Redis, and consumes events from RabbitMQ.
6.  **Notification Service (`notification`)**: Manages real-time alerts. Uses Redis and consumes events from RabbitMQ to push Server-Sent Events (SSE) to the client.

### Infrastructure Components
- **Databases**: Three isolated PostgreSQL 16 databases (`user-db-data`, `inventory-db-data`, `kitchen-db-data`) for data sovereignty among microservices.
- **Cache**: Redis 7 for caching and session management.
- **Message Broker**: RabbitMQ 4 for asynchronous communication between Inventory, Kitchen, and Notification services via the `order_exchange`.
- **Monitoring**: Prometheus for metrics collection and Grafana for visualization.
- **Package Management**: The project utilizes `pnpm` across all Dockerfiles. A shared Docker volume (`pnpm-store`) is used to reuse dependencies across containers, making image builds leaner and faster during development.

## 3. Features & Capabilities

- **User Authentication**: JWT-based authentication flow with user and admin roles.
- **Order Lifecycle**: Users can place orders (Inventory), which are queued (RabbitMQ) for processing (Kitchen) and pushed to users in real-time (Notification).
- **Stock Management**: Inventory management by date.
- **Real-Time Updates**: SSE integration for live order streams.
- **Observability**: Built-in metrics gathering via Prometheus and dashboards via Grafana.
- **Load Testing**: Pre-configured k6 scripts for simulating traffic.
- **Slimmer Dev Containers**: Utilizes a shared `pnpm` store volume across all microservices via `docker-compose.yml` to save disk space and drastically improve dependency installation speeds during development.

## 4. API Endpoints

All requests go through the API Gateway (port 5001), which proxies them to the respective services.

### Identity Service (via Gateway)
- `POST /api/identity/auth/register`: Register user (`email`, `password`, `confirmPassword`, `studentId`, `name`)
- `POST /api/identity/auth/login`: Login user (`studentId`, `password`)
- `GET /api/identity/auth/`: Check status
- `GET /api/identity/user/:id`: Get user details
- `POST /api/identity/admin/add/:userId`: Promote user to admin
- `DELETE /api/identity/admin/:id`: Delete admin
- `GET /api/identity/admin/:userId`: Get admin details
- `GET /api/identity/admin/`: List all admins
- `GET /api/identity/admin/me`: Get current admin info

### Inventory Service (via Gateway)
- `POST /api/inventory/order/`: Create an order
- `GET /api/inventory/order/:id`: Get order details
- `DELETE /api/inventory/order/:id`: Delete order
- `GET /api/inventory/stock/`: Get all stock quantities
- `GET /api/inventory/stock/:id`: Get specific stock
- `GET /api/inventory/stock/date/:forDate`: Get stocks for date (`YYYY-MM-DD`)
- `POST /api/inventory/stock/`: Create stock entry (`quantity`, `forDate`)
- `DELETE /api/inventory/stock/:id`: Delete stock
- `DELETE /api/inventory/stock/date/:forDate`: Delete stock by date

### Notification Service (via Gateway)
- `GET /api/notification/orders`: Register SSE stream for live order updates

### Kitchen Service
- Primarily handles backend processing of orders received via RabbitMQ messages. Endpoints are currently minimal or internal.

## 5. Lackings, Tech Debt & Future Considerations

- **Centralized Logging**: Currently lacks an aggregated logging solution (e.g., ELK stack, Datadog, Loki). Logs are isolated within individual Docker containers.
- **Service Discovery**: Hardcoded URLs in `docker-compose.yml` are used for service-to-service communication.
- **Frontend Readiness**: The frontend is largely a basic Vite+React template scaffolding with minimal API integration completed so far.
- **Resilience**: Asynchronous messaging via RabbitMQ lacks explicit Dead-Letter Queues (DLQs) and automated retry mechanisms.
- **Testing**: While k6 is present for load testing, comprehensive unit and integration testing frameworks (like Jest, Mocha, or Cypress) are undocumented or missing.
- **CI/CD Pipeline**: No CI/CD workflows (e.g., GitHub Actions, GitLab CI) are explicitly defined.
