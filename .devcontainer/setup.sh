#!/bin/bash

echo "🚀 Setting up SportsContentMagnet development environment..."

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📋 Creating .env file from template..."
    cp .env.example .env
    
    # Generate a session secret
    SESSION_SECRET=$(openssl rand -base64 32)
    sed -i "s/your_session_secret_here/$SESSION_SECRET/g" .env
    
    echo "⚠️  Please update .env with your actual API keys and configuration"
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migrations
echo "🗄️  Setting up database..."
npm run db:push

# Initialize subscription plans
echo "💳 Initializing subscription plans..."
npm run init:plans || echo "Subscription plans may already exist"

# Create necessary directories
echo "📁 Creating required directories..."
mkdir -p public/screenshots
mkdir -p public/uploads
mkdir -p public/uploads/logos
mkdir -p public/uploads/audio
mkdir -p public/uploads/pdfs
mkdir -p attached_assets

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update .env with your API keys (SendGrid, Stripe, OpenAI, etc.)"
echo "2. Run 'npm run dev' to start the development server"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📝 Admin setup:"
echo "- Add your user ID to ADMIN_USER_IDS in .env"
echo "- Add your email to ADMIN_EMAILS in .env"