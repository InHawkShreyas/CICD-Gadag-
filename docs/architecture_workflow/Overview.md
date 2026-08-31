
# Gadag-University — Project Overview

This repository contains the Gadag-University application: a modular, layered system that supports university admission workflows, student data management, and administrative operations. It includes a .NET backend (Web API + domain and application layers), a frontend web app, and automated test suites.

## Goals
- Provide a reliable API for admissions, registrations, student records, and reporting.
- Keep business logic isolated in an application/domain layer for testability and reuse.
- Offer a simple web frontend for user interactions and integrations for payment/OTP providers.
- Maintain automated end-to-end and integration tests for regression prevention.

## High-level architecture

- **API (Presentation)**: `backend/UniversitySystem.Api` — ASP.NET Core Web API exposing endpoints used by the frontend and third-party integrations.
- **Application**: `backend/UniversitySystem.Application` — Use-cases/services coordinating application workflows and DTOs.
- **Domain**: `backend/UniversitySystem.Domain` — Core entities, domain interfaces, and domain-level logic.
- **Infrastructure**: `backend/UniversitySystem.Infrastructure` — Data access, file/asset management, external integrations (SMS, OTP, payment hooks).
- **Frontend**: `frontend/web` — Web application (static assets, SPA or server-rendered UI depending on configuration) that consumes the API.
- **Automation / Tests**: `AutomationTesting` — End-to-end tests (Playwright + .NET test harness), test fixtures and reporting utilities.
- **Docs**: `docs/` — Architecture, workflows, and other project documentation.

Mermaid diagram (simplified):

```mermaid
graph TD
	Browser -->|HTTP / API| WebFrontend[Frontend (web)]
	WebFrontend -->|REST / GraphQL| Api[UniversitySystem.Api]
	Api --> App[UniversitySystem.Application]
	App --> Domain[UniversitySystem.Domain]
	App --> Infra[UniversitySystem.Infrastructure]
	Infra --> DB[(Database)]
	Infra --> External[External Services (OTP, SMS, Payments)]
	AutomationTesting -->|E2E| WebFrontend
	AutomationTesting -->|API Tests| Api
```

## Key directories
- `backend/` — Solution and backend projects (API, Application, Domain, Infrastructure).
- `frontend/web` — Web client source and build artifacts.
- `AutomationTesting/` — Test project, test data, fixtures, and reporting.
- `docs/` — Architecture and workflow documentation.
- `UniversitySystem API/` — API contracts, OpenAPI/YAML definitions and collection artifacts.

## Technology stack
- Backend: C#, ASP.NET Core Web API, layered architecture (Presentation → Application → Domain → Infrastructure).
- Frontend: JavaScript/TypeScript and standard web toolchain (npm/Yarn, build scripts) — see `frontend/web/package.json` for exact stack.
- Testing: Playwright, .NET test runner (NUnit/xUnit as configured in `AutomationTesting`).
- DevOps: Dockerfile and `nginx.conf` for containerization and reverse proxying; CI pipelines are expected to run builds/tests and publish artifacts.

## Running locally (developer quick-start)
1. Backend API

```bash
cd backend/UniversitySystem.Api
dotnet restore
dotnet run
```

The API typically listens on the configured ports (see `appsettings.json` and `appsettings.development.json`).

2. Frontend

```bash
cd frontend/web
npm install
# Run the start or build script defined in package.json, e.g.:
npm start  # or `npm run build` then serve
```

3. Automated tests

```bash
cd AutomationTesting
dotnet test
```

4. Docker (optional)

```bash
docker build -t gadag-university .
```

## Configuration & environment
- Backend configuration lives in `backend/UniversitySystem.Api/appsettings*.json`.
- Secrets, connection strings and environment-specific overrides should be provided via environment variables or secret management in CI/CD.

## Contributing and workflows
- Follow the repository branching and PR conventions (feature branches → pull request → review → merge to `main`).
- Add/update OpenAPI/YAML contract files in `UniversitySystem API/` when API changes are introduced.
- Keep `AutomationTesting` updated with any end-to-end scenarios introduced by new features.

## Notes and next steps
- For precise run commands, versions, and environment variables, consult each project's README or the `package.json` / `.csproj` files.
- If you want, I can add a short `README.md` per subproject with exact commands and common env var names.
