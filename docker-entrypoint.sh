#!/bin/sh
set -eu

# prisma spawns the seed command as a bare `tsx`, which only resolves when the
# local bin directory is on PATH -- npm adds it for `npm run`, but not here
export PATH="/app/node_modules/.bin:$PATH"

echo "Applying database migrations..."
prisma migrate deploy

echo "Importing hospital master data..."
prisma db seed

echo "Starting web application..."
exec node server.js
