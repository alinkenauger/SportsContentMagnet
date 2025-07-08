# GitHub Codespaces Configuration

This directory contains the configuration for running SportsContentMagnet in GitHub Codespaces.

## What's Included

- **PostgreSQL Database**: Automatically configured and running
- **Node.js 20**: With TypeScript support
- **VS Code Extensions**: ESLint, Prettier, Tailwind CSS IntelliSense, and more
- **Automatic Setup**: Dependencies installed, database initialized, directories created

## Getting Started

1. **Create a Codespace**:
   - Go to your repository on GitHub
   - Click the green "Code" button
   - Select "Codespaces" tab
   - Click "Create codespace on main"

2. **Wait for Setup** (3-5 minutes):
   - Container will build
   - Dependencies will install
   - Database will be initialized

3. **Configure Environment**:
   - Open `.env` file
   - Add your API keys:
     - `SENDGRID_API_KEY`
     - `STRIPE_SECRET_KEY`
     - `OPENAI_API_KEY`
     - `ADMIN_USER_IDS` (your user ID)
     - `ADMIN_EMAILS` (your email)

4. **Start Development**:
   ```bash
   npm run dev
   ```

5. **Access the App**:
   - The app will be available at the forwarded port (usually https://[codespace-name]-3000.app.github.dev)
   - VS Code will prompt you to open in browser

## Database Access

PostgreSQL is running in the container:
- Host: `db`
- Port: `5432`
- Database: `sportscontent`
- User: `postgres`
- Password: `postgres`

To access the database:
```bash
psql postgresql://postgres:postgres@db:5432/sportscontent
```

## Useful Commands

- `npm run dev` - Start development server
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio (database GUI)
- `npm run build` - Build for production
- `npm run lint` - Run linter

## Troubleshooting

### Port Already in Use
If you get a "port already in use" error, the ports are being forwarded. Check the Ports tab in VS Code.

### Database Connection Issues
The database might take a moment to start. Wait a few seconds and try again.

### Missing Dependencies
Run `npm install` to ensure all dependencies are installed.

## Customization

To add more VS Code extensions or change settings, edit `devcontainer.json`.