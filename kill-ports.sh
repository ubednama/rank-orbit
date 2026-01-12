#!/bin/bash
# Ports to kill:
# 3333: API Gateway
# 5000: Client
# 3001: Crawler Service
# 8000: AI Service

PORTS="3333 5000 3001 8000"

echo "Killing processes on ports: $PORTS"

for PORT in $PORTS; do
  PID=$(lsof -ti :$PORT)
  if [ -n "$PID" ]; then
    echo "Killing process on port $PORT (PID: $PID)"
    kill -9 $PID
  else
    echo "No process found on port $PORT"
  fi
done

echo "Done."
