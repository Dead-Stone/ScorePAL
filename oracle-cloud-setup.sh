#!/bin/bash

# Oracle Cloud VM Setup Script for ScorePAL
# Run this script on your Oracle Cloud Always Free VM

echo "🚀 Setting up ScorePAL on Oracle Cloud Always Free"
echo "=================================================="

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
echo "🔧 Installing essential packages..."
sudo apt install -y curl wget git unzip htop nano

# Install Docker
echo "🐳 Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
rm get-docker.sh

# Install Docker Compose
echo "🔨 Installing Docker Compose..."
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install Coolify (optional - for easier management)
echo "🎯 Installing Coolify..."
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 8000/tcp  # ScorePAL API
sudo ufw allow 8080/tcp  # Coolify (optional)
sudo ufw --force enable

# Clone your repository (you'll need to update this URL)
echo "📥 Cloning ScorePAL repository..."
# git clone https://github.com/Dead-Stone/ScorePAL.git
# cd ScorePAL

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Clone your ScorePAL repository: git clone https://github.com/Dead-Stone/ScorePAL.git"
echo "2. Navigate to the directory: cd ScorePAL"
echo "3. Build and run: docker-compose up -d"
echo "4. Access your app at: http://$(curl -s ifconfig.me):8000"
echo ""
echo "Optional: Access Coolify at: http://$(curl -s ifconfig.me):8080"
echo ""
echo "🎉 Your ScorePAL deployment with full ML stack is ready!" 