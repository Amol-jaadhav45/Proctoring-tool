#!/usr/bin/env fish

# Navigate to script directory
cd (dirname (status -f))

# Check if venv exists, if not create it
if not test -d venv
    echo "Creating virtual environment..."
    python3 -m venv venv
end

# Activate venv
echo "Activating virtual environment..."
source venv/bin/activate.fish

# Install dependencies if needed (check for ultralytics)
if not pip show ultralytics > /dev/null
    echo "Installing/Updating dependencies..."
    pip install -r requirements.txt
end

# Set mode to INFERENCE
set -x AI_WORKER_MODE inference

# Run the worker
echo "Starting AI Worker in INFERENCE mode..."
python worker.py
