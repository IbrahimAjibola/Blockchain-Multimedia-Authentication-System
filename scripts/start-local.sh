#!/bin/bash

# Local Testing Script for Multimedia Authentication System
# This script starts all services needed for local testing

set -e

echo "🚀 Starting Multimedia Authentication System for Local Testing..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18+"
        exit 1
    fi
    
    # Check pnpm
    if ! command -v pnpm &> /dev/null; then
        print_error "pnpm is not installed. Please install pnpm"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_warning "Docker is not installed. Will use manual setup for backend"
        USE_DOCKER=false
    else
        USE_DOCKER=true
    fi
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        print_error "Please run this script from the project root directory"
        exit 1
    fi
    
    print_success "Prerequisites check completed"
}

# Install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    
    # Install root dependencies
    pnpm install
    
    # Install workspace dependencies
    pnpm install --recursive
    
    print_success "Dependencies installed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment files..."
    
    # Backend environment
    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        print_status "Created backend/.env from template"
    fi
    
    # Frontend environment
    if [ ! -f "frontend/.env" ]; then
        cp frontend/.env.example frontend/.env
        print_status "Created frontend/.env from template"
    fi
    
    # Contracts environment
    if [ ! -f "contracts/.env" ]; then
        cp contracts/.env.example contracts/.env
        print_status "Created contracts/.env from template"
    fi
    
    print_success "Environment files setup completed"
}

# Start Hardhat network
start_hardhat() {
    print_status "Starting Hardhat network..."
    
    cd contracts
    
    # Compile contracts
    npx hardhat compile
    
    # Start Hardhat node in background
    npx hardhat node > ../hardhat.log 2>&1 &
    HARDHAT_PID=$!
    
    # Wait for Hardhat to start
    sleep 5
    
    # Deploy contracts
    npx hardhat run scripts/deploy.js --network localhost
    
    cd ..
    
    print_success "Hardhat network started (PID: $HARDHAT_PID)"
    echo $HARDHAT_PID > .hardhat.pid
}

# Start backend services
start_backend() {
    print_status "Starting backend services..."
    
    if [ "$USE_DOCKER" = true ]; then
        # Start with Docker Compose
        docker-compose up -d
        
        # Wait for services to be ready
        sleep 10
        
        # Check if services are running
        if docker-compose ps | grep -q "Up"; then
            print_success "Backend services started with Docker"
        else
            print_error "Failed to start backend services with Docker"
            exit 1
        fi
    else
        # Manual setup
        print_status "Starting MongoDB manually..."
        if ! pgrep -x "mongod" > /dev/null; then
            mkdir -p data/db
            mongod --dbpath ./data/db > mongodb.log 2>&1 &
            MONGODB_PID=$!
            echo $MONGODB_PID > .mongodb.pid
            sleep 3
        fi
        
        print_status "Starting backend server..."
        cd backend
        pnpm install
        pnpm run dev > ../backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > ../.backend.pid
        cd ..
        
        sleep 5
        print_success "Backend services started manually"
    fi
}

# Start frontend
start_frontend() {
    print_status "Starting frontend development server..."
    
    cd frontend
    pnpm install
    pnpm dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > ../.frontend.pid
    cd ..
    
    sleep 5
    print_success "Frontend started (PID: $FRONTEND_PID)"
}

# Health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Check Hardhat network
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://127.0.0.1:8545 > /dev/null 2>&1; then
        print_success "Hardhat network is running"
    else
        print_error "Hardhat network is not responding"
    fi
    
    # Check backend
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        print_success "Backend is running"
    else
        print_error "Backend is not responding"
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_success "Frontend is running"
    else
        print_error "Frontend is not responding"
    fi
}

# Display service information
show_service_info() {
    echo ""
    echo "🎉 Local testing environment is ready!"
    echo ""
    echo "📋 Service Information:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔗 Frontend:     http://localhost:3000"
    echo "🔗 Backend:      http://localhost:5000"
    echo "🔗 Hardhat:      http://127.0.0.1:8545"
    echo "🔗 Health Check: http://localhost:5000/health"
    echo ""
    echo "📁 Log Files:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📄 Hardhat:      ./hardhat.log"
    echo "📄 Backend:      ./backend.log"
    echo "📄 Frontend:     ./frontend.log"
    echo "📄 MongoDB:      ./mongodb.log"
    echo ""
    echo "🔧 Next Steps:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "1. Open http://localhost:3000 in your browser"
    echo "2. Connect MetaMask to Hardhat network:"
    echo "   - Network Name: Hardhat Local"
    echo "   - RPC URL: http://127.0.0.1:8545"
    echo "   - Chain ID: 31337"
    echo "3. Import a test account from hardhat.log"
    echo "4. Start testing the application!"
    echo ""
    echo "🛑 To stop all services, run: ./scripts/stop-local.sh"
    echo ""
}

# Cleanup function
cleanup() {
    print_status "Cleaning up..."
    
    # Kill background processes
    if [ -f ".hardhat.pid" ]; then
        kill $(cat .hardhat.pid) 2>/dev/null || true
        rm .hardhat.pid
    fi
    
    if [ -f ".backend.pid" ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm .backend.pid
    fi
    
    if [ -f ".frontend.pid" ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm .frontend.pid
    fi
    
    if [ -f ".mongodb.pid" ]; then
        kill $(cat .mongodb.pid) 2>/dev/null || true
        rm .mongodb.pid
    fi
    
    # Stop Docker services
    if [ "$USE_DOCKER" = true ]; then
        docker-compose down 2>/dev/null || true
    fi
    
    print_success "Cleanup completed"
}

# Main execution
main() {
    # Set up cleanup on script exit
    trap cleanup EXIT
    
    print_status "Starting Multimedia Authentication System..."
    
    check_prerequisites
    install_dependencies
    setup_environment
    start_hardhat
    start_backend
    start_frontend
    run_health_checks
    show_service_info
    
    print_success "All services started successfully!"
    
    # Keep script running
    print_status "Press Ctrl+C to stop all services..."
    while true; do
        sleep 1
    done
}

# Run main function
main "$@" 