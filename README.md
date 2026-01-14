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

- Node.js 20+
- npm 10+
- Docker and Docker Compose (for PostgreSQL)

## Getting Started

### 1. Install Dependencies

```bash
# Install all dependencies for all packages
npm install
```

### 2. Start PostgreSQL Database

```bash
# Start PostgreSQL using Docker Compose
docker-compose up -d

# Verify database is running
docker-compose ps
```

### 3. Set Up Backend

```bash
# Generate Prisma client
npm run db:generate

# Run database migrations
npm run db:migrate

# The migration will create all necessary tables
```

### 4. Start Development Servers

```bash
# Start both frontend and backend concurrently
npm run dev

# Or start them separately:
npm run dev:backend   # Backend on http://localhost:5001
npm run dev:frontend  # Frontend on http://localhost:5173
```

### 5. Open the Application

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

### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# View logs
docker-compose logs postgres
```

### Port Already in Use
```bash
# Backend (port 5000)
lsof -ti:5000 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

### Prisma Issues
```bash
# Regenerate Prisma client
npm run db:generate

# Reset database (⚠️ deletes all data)
cd packages/backend
npx prisma migrate reset
```

## License

MIT

## Credits

- Book data provided by [Project Gutenberg](https://www.gutenberg.org/)
- API powered by [Gutendex](https://gutendex.com/)
