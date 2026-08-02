#!/bin/bash

echo "==============================="
echo "Deploying Backend"
echo "==============================="

git pull

echo "Installing packages..."
npm install

echo "Building..."
npm run build

echo "Restarting PM2..."
pm2 restart studyflow-api

echo "Saving PM2..."
pm2 save

echo "Deployment Completed"
