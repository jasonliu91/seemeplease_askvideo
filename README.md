# Project Deployment Guide

This guide explains how to deploy this project to Firebase Functions.

## Prerequisites

- Node.js (v16 or later)
- Firebase CLI installed (`npm install -g firebase-tools`)
- A Firebase project created in the [Firebase Console](https://console.firebase.google.com)

## Setup Steps

1. **Login to Firebase**
   ```bash
   firebase login
   ```

2. **Initialize Firebase in your project** (if not already done)
   ```bash
   firebase init functions
   ```
   - Select your Firebase project
   - Choose JavaScript or TypeScript
   - Say yes to ESLint
   - Choose to install dependencies with npm

3. **Configure Environment Variables** (if needed)
   ```bash
   firebase functions:config:set key1="value1" key2="value2"
   ```

4. **Deploy to Firebase Functions**
   ```bash
   firebase deploy --only functions
   ```

## Project Structure 
