#!/bin/bash

# Function to kill all background processes on exit
trap 'kill $(jobs -p)' EXIT

echo "Starting all services..."

# Start AI Service (Python)
echo "Starting AI Service on port 8000..."
(cd apps/ai-service && source venv/bin/activate && python -m uvicorn app.main:app --reload --port 8000) &
PID_AI=$!

# Start Nx Services
echo "Starting Client (dev) and Services (serve)..."
npx nx dev client &
npx nx run-many --target=serve --projects=api-gateway,crawler-service --parallel=2 &
PID_NX=$!

# Wait for processes
wait $PID_AI $PID_NX
