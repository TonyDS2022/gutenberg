# Gutenberg Reader

A modern web application for reading public domain literature from Project Gutenberg with annotations, bookmarks, and reading statistics.

## Features

- **Search & Browse**: Search through 70,000+ public domain books from Project Gutenberg
- **Customizable Reader**: Adjust font family, size, line height, and choose from light/dark/sepia themes
- **Text Annotations**: Highlight text with color-coding and add personal notes
- **Bookmarks**: Save your reading position and mark favorite books
- **Reading Statistics**: Track time spent reading, view session history, and see reading streaks
- **Auto Session Tracking**: Automatic session tracking with Page Visibility API (pauses when tab is inactive)
- **Personal Library**: Manage your saved books and continue where you left off
- **User Authentication**: Secure JWT-based authentication with bcrypt password hashing

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Zustand (state management)
- React Router
- Axios

### Backend
- Node.js + Express + TypeScript
- PostgreSQL + Prisma ORM
- JWT authentication
- Gutendex API integration

## Prerequisites

- **Option 1 (Docker - Recommended)**: Docker and Docker Compose
- **Option 2 (Local)**: Node.js 20+, npm 10+, and Docker Compose (for PostgreSQL only)

## Getting Started

### Option 1: Docker Development Environment (Recommended)

The easiest way to get started is using Docker, which containerizes the entire development environment with all dependencies and environment variables pre-configured.

#### 1. Start the Application

```bash
# Start all services (frontend, backend, and database)
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

#### 2. Access the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api
- Health Check: http://localhost:5001/health
- Database: localhost:5432

#### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

#### 4. Stop the Application

```bash
# Stop services
docker-compose down

# Stop and remove volumes (resets database)
docker-compose down -v
```

#### Environment Configuration

All environment variables are defined in the root `.env` file:

```bash
# Environment
NODE_ENV=development

# Database Configuration
POSTGRES_USER=gutenberg
POSTGRES_PASSWORD=gutenberg_dev_password
POSTGRES_DB=gutenberg

# Backend Server Configuration
BACKEND_PORT=5001

# Frontend Configuration
FRONTEND_PORT=5173

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-minimum-32-characters
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=http://localhost:5173

# Gutendex API
GUTENDEX_API_URL=https://gutendex.com

# API URL for frontend
VITE_API_URL=http://localhost:5001/api
```

You can modify these values in `.env` to customize your development environment without changing docker-compose.yml.

---

### Option 2: Local Development (Without Docker App Container)

If you prefer to run the application locally outside of Docker (useful for debugging):

#### 1. Install Dependencies

```bash
# Install all dependencies for all packages
npm install
```

#### 2. Start PostgreSQL Database

```bash
# Start PostgreSQL using Docker Compose
docker-compose up -d postgres

# Verify database is running
docker-compose ps
```

#### 3. Set Up Backend

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# The migration will create all necessary tables
```

#### 4. Configure Environment Variables

Copy the example environment files and update them:

```bash
# Backend
cp packages/backend/.env.example packages/backend/.env

# Frontend
cp packages/frontend/.env.example packages/frontend/.env
```

#### 5. Start Development Servers

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start them separately:
npm run dev:backend   # Backend on http://localhost:5001
npm run dev:frontend  # Frontend on http://localhost:5173
```

#### 6. Open the Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:5001/api
- Health Check: http://localhost:5001/health

## Project Structure

```
gutenberg/
├── packages/
│   ├── shared/           # Shared types and schemas
│   ├── backend/          # Express API server
│   │   ├── prisma/       # Database schema and migrations
│   │   └── src/
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── routes/
│   │       ├── middleware/
│   │       └── utils/
│   └── frontend/         # React application
│       └── src/
│           ├── components/
│           ├── pages/
│           ├── stores/
│           ├── hooks/
│           └── api/
└── docker-compose.yml    # PostgreSQL configuration
```

## Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build all packages
- `npm run test` - Run tests for all packages
- `npm run db:migrate` - Run Prisma migrations
- `npm run db:generate` - Generate Prisma client
- `npm run db:studio` - Open Prisma Studio (database GUI)

### Backend
- `npm run dev --workspace=backend` - Start backend dev server
- `npm run build --workspace=backend` - Build backend

### Frontend
- `npm run dev --workspace=frontend` - Start frontend dev server
- `npm run build --workspace=frontend` - Build frontend

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current user info

### Books
- `GET /api/books` - Search books (query params: search, languages, topic, page)
- `GET /api/books/:id` - Get book metadata
- `GET /api/books/:id/content` - Get book content (query params: format=text|html)

### Annotations
- `GET /api/annotations?bookId=:id` - Get annotations for a book
- `POST /api/annotations` - Create annotation
- `PUT /api/annotations/:id` - Update annotation
- `DELETE /api/annotations/:id` - Delete annotation

### Bookmarks
- `GET /api/bookmarks` - Get user bookmarks
- `POST /api/bookmarks` - Create bookmark
- `PUT /api/books/:bookId/bookmark` - Toggle favorite
- `DELETE /api/bookmarks/:id` - Delete bookmark

### Sessions
- `POST /api/sessions` - Start reading session
- `PUT /api/sessions/:id/end` - End reading session
- `PUT /api/sessions/:id/progress` - Update progress
- `GET /api/sessions/active/:bookId` - Get active session
- `GET /api/sessions` - Get user sessions

### Statistics
- `GET /api/stats/summary` - Get reading statistics summary
- `GET /api/stats/time?period=week` - Get time-based stats
- `GET /api/stats/books?limit=10` - Get per-book statistics

## Security Features

- **JWT Authentication**: Secure token-based authentication stored in httpOnly cookies
- **Password Hashing**: Bcrypt with 10 rounds for password security
- **SQL Injection Prevention**: Prisma ORM provides safe parameterized queries
- **XSS Protection**: Helmet middleware for HTTP security headers
- **CORS Configuration**: Restricted to known origins
- **Rate Limiting**: Multiple tiers of rate limiting to prevent abuse:
  - General API: 100 requests per 15 minutes
  - Authentication: 5 attempts per 15 minutes (stricter for security)
  - Search: 50 requests per 10 minutes
  - Sessions: 200 requests per 15 minutes (higher for frequent updates)
- **Error Boundaries**: React error boundaries to catch and handle UI errors gracefully
- **Idempotent Operations**: Session end operations are idempotent to prevent duplicate errors

## Environment Variables

### Backend (.env)
```
NODE_ENV=development
PORT=5001
DATABASE_URL=postgresql://gutenberg:gutenberg_dev_password@localhost:5432/gutenberg
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
GUTENDEX_API_URL=https://gutendex.com
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:5001/api
```

## Development Workflow

### Phase 1: Foundation ✅ Completed
- ✅ Project setup with monorepo
- ✅ Database schema and migrations
- ✅ Authentication system (JWT with bcrypt)
- ✅ Book search API integration (Gutendex proxy)
- ✅ Basic UI components (shadcn/ui)

### Phase 2: Reader Core ✅ Completed
- ✅ Reader view with text rendering
- ✅ Theme system (dark/light/sepia)
- ✅ Font customization (family, size, line height)
- ✅ Reading position tracking
- ✅ Bookmark functionality

### Phase 3: Annotations ✅ Completed
- ✅ Text selection and highlighting
- ✅ Note-taking interface
- ✅ Annotation management (CRUD operations)
- ✅ Color-coded highlights
- ✅ Annotation sidebar

### Phase 4: Statistics ✅ Completed
- ✅ Reading session auto-tracking
- ✅ Page Visibility API integration
- ✅ Statistics dashboard with charts
- ✅ Reading streaks calculation
- ✅ Per-book statistics

### Phase 5: Polish 🚧 In Progress
- ✅ Error boundaries
- ✅ Loading states
- ✅ Rate limiting (express-rate-limit)
- ✅ Session error handling (idempotent operations)
- ⏳ Input validation
- ⏳ Responsive design testing
- ⏳ Unit and E2E tests
- ⏳ Performance optimization

## Troubleshooting

### Docker Issues

#### Container Won't Start
```bash
# View container logs
docker-compose logs app

# Rebuild containers from scratch
docker-compose down
docker-compose up --build

# Remove all volumes and start fresh
docker-compose down -v
docker-compose up --build
```

#### Can't Access Frontend
```bash
# Ensure Vite is binding to 0.0.0.0 (not just localhost)
# Check vite.config.ts has: server: { host: '0.0.0.0' }

# Restart the app container
docker-compose restart app
```

#### Port Already in Use
```bash
# Check what's using the ports
lsof -ti:5001 | xargs kill -9  # Backend
lsof -ti:5173 | xargs kill -9  # Frontend
lsof -ti:5432 | xargs kill -9  # PostgreSQL

# Or stop all Docker containers
docker-compose down
```

### Database Connection Issues

#### Docker Environment
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# View logs
docker-compose logs postgres
```

#### Local Environment
```bash
# Check if PostgreSQL container is running
docker-compose ps postgres

# Restart PostgreSQL
docker-compose restart postgres

# Verify connection string in packages/backend/.env
# Should be: postgresql://gutenberg:gutenberg_dev_password@localhost:5432/gutenberg
```

### Prisma Issues

#### In Docker
```bash
# Regenerate Prisma client
docker-compose exec app npm run db:generate

# Run migrations
docker-compose exec app npm run db:migrate

# Reset database (⚠️ deletes all data)
docker-compose down -v
docker-compose up --build
```

#### Local Development
```bash
# Regenerate Prisma client
npm run db:generate

# Reset database (⚠️ deletes all data)
cd packages/backend
npx prisma migrate reset
```

### OpenSSL/Prisma Engine Issues in Docker
If you see Prisma OpenSSL warnings in the logs, the Dockerfile already includes the necessary OpenSSL libraries. If issues persist:

```bash
# Rebuild with no cache
docker-compose build --no-cache app
docker-compose up
```

## License

MIT

## Credits

- Book data provided by [Project Gutenberg](https://www.gutenberg.org/)
- API powered by [Gutendex](https://gutendex.com/)
