# Zuni Hub - Educational Message Board

A secure message board application exclusively for users with educational email addresses. Built with Next.js, TypeScript, and Prisma.

## Features

- 🔐 **Educational Email Validation**: Only users with .edu, .ac.uk, and other educational domains can sign up
- 📝 **Message Board**: Create and view posts with a clean, modern interface
- 💬 **Comments System**: Engage in discussions with threaded comments
- 👤 **User Management**: Secure authentication with NextAuth.js
- 🎨 **Modern UI**: Beautiful, responsive design with Tailwind CSS
- 🗄️ **Database**: SQLite database with Prisma ORM

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
- **Database**: SQLite with Prisma
- **Validation**: Zod
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd zuni-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and update the following:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key-here-change-this-in-production"
   ```

4. **Set up the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### Sign Up
1. Click "Sign up here" on the sign-in page
2. Enter your full name and educational email address
3. Create a password (minimum 6 characters)
4. Only educational domains are accepted (.edu, .ac.uk, etc.)

### Creating Posts
1. Sign in with your educational account
2. Click "New Post" in the header
3. Enter a title and content for your post
4. Click "Create Post"

### Commenting
1. Click on any post to view it
2. Scroll down to the comments section
3. Write your comment and click the send button

### Managing Posts
- Authors can delete their own posts
- All users can view and comment on posts

## Educational Email Domains

The application accepts the following educational email domains:
- .edu (US universities)
- .ac.uk (UK universities)
- .ac.jp (Japanese universities)
- .ac.kr (Korean universities)
- .ac.in (Indian universities)
- .ac.za (South African universities)
- .ac.nz (New Zealand universities)
- .ac.au (Australian universities)
- .ac.ca (Canadian universities)
- And many more international educational domains

## Project Structure

```
zuni-hub/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── posts/             # Post pages
│   └── globals.css        # Global styles
├── components/            # React components
├── lib/                   # Utility functions
│   ├── auth.ts           # NextAuth configuration
│   ├── prisma.ts         # Prisma client
│   └── utils.ts          # Helper functions
├── prisma/               # Database schema
└── public/               # Static assets
```

## API Endpoints

- `GET /api/posts` - Get all posts
- `POST /api/posts` - Create a new post
- `GET /api/posts/[id]` - Get a specific post with comments
- `DELETE /api/posts/[id]` - Delete a post (author only)
- `POST /api/posts/[id]/comments` - Add a comment to a post

## Database Schema

- **Users**: Store user information and authentication data
- **Posts**: Store message board posts
- **Comments**: Store comments on posts
- **Accounts/Sessions**: NextAuth.js authentication data

## Security Features

- Educational email validation
- Secure password handling
- Session-based authentication
- CSRF protection via NextAuth.js
- Input validation and sanitization

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy!

### Other Platforms

1. Build the application: `npm run build`
2. Set up a database (PostgreSQL recommended for production)
3. Update environment variables
4. Deploy the built application

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.
