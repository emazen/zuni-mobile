#!/bin/bash

echo "🚀 Setting up Zuni Hub Message Board..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🔧 Setting up environment variables..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local file. Please update the NEXTAUTH_SECRET with a secure random string."
else
    echo "✅ .env.local already exists."
fi

echo "🗄️ Setting up database..."
npx prisma generate
npx prisma db push

echo "🎉 Setup complete!"
echo ""
echo "To start the development server, run:"
echo "  npm run dev"
echo ""
echo "Then open http://localhost:3000 in your browser."
echo ""
echo "Note: Make sure to update NEXTAUTH_SECRET in .env.local with a secure random string."
