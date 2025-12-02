#!/bin/bash

# Load environment variables from .env file
set -a
source .env
set +a

# Run the application
./gradlew bootRun
