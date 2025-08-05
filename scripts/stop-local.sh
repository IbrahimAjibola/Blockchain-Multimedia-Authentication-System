#!/bin/bash

# Stop Local Services Script for Multimedia Authentication System
# This script stops all services started by start-local.sh

set -e

echo "🛑 Stopping Multimedia Authentication System..."

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

# Stop Hardhat network
stop_hardhat() {
    print_status "Stopping Hardhat network..."
    
    if [ -f ".hardhat.pid" ]; then
        HARDHAT_PID=$(cat .hardhat.pid)
        if kill -0 $HARDHAT_PID 2>/dev/null; then
            kill $HARDHAT_PID
            print_success "Hardhat network stopped (PID: $HARDHAT_PID)"
        else
            print_warning "Hardhat process not found"
        fi
        rm -f .hardhat.pid
    else
        print_warning "No Hardhat PID file found"
    fi
}

# Stop backend services
stop_backend() {
    print_status "Stopping backend services..."
    
    # Stop Docker services if running
    if command -v docker-compose &> /dev/null; then
        if [ -f "docker-compose.yml" ]; then
            docker-compose down 2>/dev/null || true
            print_success "Docker services stopped"
        fi
    fi
    
    # Stop manual backend process
    if [ -f ".backend.pid" ]; then
        BACKEND_PID=$(cat .backend.pid)
        if kill -0 $BACKEND_PID 2>/dev/null; then
            kill $BACKEND_PID
            print_success "Backend server stopped (PID: $BACKEND_PID)"
        else
            print_warning "Backend process not found"
        fi
        rm -f .backend.pid
    else
        print_warning "No backend PID file found"
    fi
}

# Stop frontend
stop_frontend() {
    print_status "Stopping frontend development server..."
    
    if [ -f ".frontend.pid" ]; then
        FRONTEND_PID=$(cat .frontend.pid)
        if kill -0 $FRONTEND_PID 2>/dev/null; then
            kill $FRONTEND_PID
            print_success "Frontend server stopped (PID: $FRONTEND_PID)"
        else
            print_warning "Frontend process not found"
        fi
        rm -f .frontend.pid
    else
        print_warning "No frontend PID file found"
    fi
}

# Stop MongoDB
stop_mongodb() {
    print_status "Stopping MongoDB..."
    
    if [ -f ".mongodb.pid" ]; then
        MONGODB_PID=$(cat .mongodb.pid)
        if kill -0 $MONGODB_PID 2>/dev/null; then
            kill $MONGODB_PID
            print_success "MongoDB stopped (PID: $MONGODB_PID)"
        else
            print_warning "MongoDB process not found"
        fi
        rm -f .mongodb.pid
    else
        print_warning "No MongoDB PID file found"
    fi
    
    # Also try to stop any mongod processes
    if pgrep -x "mongod" > /dev/null; then
        pkill -x "mongod"
        print_success "MongoDB processes stopped"
    fi
}

# Clean up log files
cleanup_logs() {
    print_status "Cleaning up log files..."
    
    # Remove log files
    rm -f hardhat.log backend.log frontend.log mongodb.log
    
    print_success "Log files cleaned up"
}

# Kill any remaining Node.js processes
kill_node_processes() {
    print_status "Checking for remaining Node.js processes..."
    
    # Find Node.js processes related to our project
    NODE_PIDS=$(ps aux | grep -E "(hardhat|vite|nodemon)" | grep -v grep | awk '{print $2}')
    
    if [ ! -z "$NODE_PIDS" ]; then
        echo "$NODE_PIDS" | xargs kill -9 2>/dev/null || true
        print_success "Remaining Node.js processes stopped"
    else
        print_status "No remaining Node.js processes found"
    fi
}

# Check if services are still running
check_services() {
    print_status "Checking if services are still running..."
    
    # Check Hardhat
    if curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        http://127.0.0.1:8545 > /dev/null 2>&1; then
        print_warning "Hardhat network is still running"
    else
        print_success "Hardhat network is stopped"
    fi
    
    # Check backend
    if curl -s http://localhost:5000/health > /dev/null 2>&1; then
        print_warning "Backend is still running"
    else
        print_success "Backend is stopped"
    fi
    
    # Check frontend
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        print_warning "Frontend is still running"
    else
        print_success "Frontend is stopped"
    fi
}

# Main execution
main() {
    print_status "Stopping all local services..."
    
    stop_hardhat
    stop_backend
    stop_frontend
    stop_mongodb
    kill_node_processes
    cleanup_logs
    check_services
    
    print_success "All services stopped successfully!"
    echo ""
    echo "📋 Summary:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "✅ Hardhat network stopped"
    echo "✅ Backend services stopped"
    echo "✅ Frontend development server stopped"
    echo "✅ MongoDB stopped"
    echo "✅ Log files cleaned up"
    echo ""
    echo "🔄 To restart services, run: ./scripts/start-local.sh"
    echo ""
}

# Run main function
main "$@" 