# Family Shopping List

A mobile-first, collaborative shopping list application for family event planning. Built with Nuxt 4, Vue 3, and TypeScript.

## Features

- **Google OAuth** - Sign in with your Google account
- **Event-based Lists** - Create shopping lists for birthdays, dinners, Christmas, etc.
- **Event Templates** - Pre-built templates with suggested items for common events
- **Collaborative** - Family members can claim and complete items
- **Progress Tracking** - See progress on each shopping list
- **Mobile-first** - Optimized for phones and tablets with bottom navigation
- **Dark Mode** - Automatic dark mode support

## Tech Stack

- **Framework**: Nuxt 4 with TypeScript
- **UI**: Nuxt UI 4 (Tailwind CSS)
- **State**: Pinia
- **Database**: SQLite with Prisma ORM
- **Auth**: nuxt-auth-utils with Google OAuth
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Google Cloud Console account (for OAuth)

### Installation

1. Clone the repository:
   ```bash
   git clone <repo-url>
   cd shopping-list
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add `http://localhost:3000` to "Authorized JavaScript origins"
   - Add `http://localhost:3000/api/auth/google/callback` to "Authorized redirect URIs"
   - Copy Client ID and Secret to `.env`

5. Generate a session password:
   ```bash
   openssl rand -base64 32
   ```
   Add this to `NUXT_SESSION_PASSWORD` in `.env`

6. Initialize the database:
   ```bash
   npm run db:push
   ```

7. Start the development server:
   ```bash
   npm run dev
   ```

8. Open [http://localhost:3000](http://localhost:3000)

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio GUI |

## Project Structure

```
shopping-list/
├── app/
│   ├── assets/         # CSS and static assets
│   ├── components/     # Vue components
│   ├── layouts/        # Page layouts (default, auth)
│   ├── middleware/     # Route middleware (auth, guest)
│   ├── pages/          # File-based routing
│   │   ├── dashboard.vue
│   │   ├── login.vue
│   │   └── lists/
│   │       ├── index.vue
│   │       ├── new.vue
│   │       └── [id].vue
│   ├── stores/         # Pinia state stores
│   └── types/          # TypeScript definitions
├── server/
│   ├── api/            # API routes
│   │   ├── auth/       # Authentication endpoints
│   │   └── lists/      # Shopping lists & items CRUD
│   └── utils/          # Server utilities (db, auth)
├── prisma/
│   └── schema.prisma   # Database schema
└── public/             # Public static files
```

## API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `POST /api/auth/logout` - Log out
- `GET /api/auth/me` - Get current user

### Shopping Lists
- `GET /api/lists` - Get all lists for current user
- `POST /api/lists` - Create new list
- `GET /api/lists/:id` - Get list with items
- `PUT /api/lists/:id` - Update list
- `DELETE /api/lists/:id` - Delete list

### List Items
- `GET /api/lists/:listId/items` - Get items for a list
- `POST /api/lists/:listId/items` - Add item to list
- `PUT /api/lists/:listId/items/:itemId` - Update item
- `DELETE /api/lists/:listId/items/:itemId` - Delete item
- `POST /api/lists/:listId/items/:itemId/claim` - Claim/unclaim item
- `POST /api/lists/:listId/items/:itemId/purchase` - Mark item as purchased

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLite database path (default: `file:./dev.db`) |
| `NUXT_SESSION_PASSWORD` | Session encryption key (32+ chars) |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret |

## Deployment

### Vercel

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `NUXT_SESSION_PASSWORD`
   - `NUXT_OAUTH_GOOGLE_CLIENT_ID`
   - `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`
   - `DATABASE_URL` (for production, use Vercel Postgres or similar)
3. Update Google OAuth redirect URI to your production URL
4. Deploy automatically on push

### Production Database

For production, switch from SQLite to PostgreSQL:

1. Update `prisma/schema.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Update `DATABASE_URL` to your PostgreSQL connection string

3. Run migrations:
   ```bash
   npm run db:push
   ```

## Usage

### Creating a List

1. Click "New List" on the dashboard
2. Select an event type (Birthday, Dinner, Christmas, or Custom)
3. Optionally enable template items for suggested shopping items
4. Add a title, description, and event date
5. Click "Create List"

### Managing Items

- **Add items**: Click "Add Item" and fill in the details
- **Claim items**: Click "Claim" to assign an item to yourself
- **Mark as purchased**: Click the circle or "Done" button when you've bought the item
- **Delete items**: List owners can delete items using the trash icon

### Sharing Lists

Currently, lists are shared with anyone who has access to the app. Future versions may include:
- Invite links
- Permission management
- Email invitations

## License

MIT
