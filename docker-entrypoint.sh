#!/bin/sh
set -eu

echo "Applying database migrations..."
./node_modules/.bin/prisma migrate deploy

echo "Importing hospital master data..."
./node_modules/.bin/prisma db seed

echo "Starting web application..."
exec node server.js
