# DevSprint

This is a microservices-based application consisting of a React frontend and multiple Node.js backend services. The entire stack is containerized and orchestrated using Docker Compose.

## Prerequisites

- Docker
- Docker Compose

## Getting Started

This application can be run seamlessly on Linux, Mac, and Windows using Docker.

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd DevSprint
```

### 2. Start the Application

Run the following command from the `server` directory to build and start all services:

```bash
cd server
docker-compose up --build
```
*(Note: On newer versions of Docker, you can use `docker compose up --build`)*

This command will:
- Build the React frontend and all Node.js backend microservices using `pnpm`.
- Set up a shared `pnpm-store` volume for dependency reuse, ensuring fast installs and slim containers.
- Provision Postgres databases, Redis, and RabbitMQ.
- Provision the Prometheus and Grafana monitoring stack.

### 3. Accessing the Application
- **Frontend (React)**: http://localhost:5173
- **API Gateway**: http://localhost:5001
- **Grafana (Monitoring)**: http://localhost:3000 (User: `admin`, Pass: `dhongorsho123`)
- **RabbitMQ Management UI**: http://localhost:15672 (User: `IUT_Dhongorsho`, Pass: `Dhongorsho123`)

For more detailed information on architecture, capabilities, and API endpoints, please refer to the detailed documentation in the `docs/` folder.
