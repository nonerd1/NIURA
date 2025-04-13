#!/bin/bash

echo "Creating NIURA distribution package..."

# Create a temporary directory
TEMP_DIR="NIURA_temp"
mkdir -p $TEMP_DIR

# Copy frontend files and directories
cp -r src/ $TEMP_DIR/
cp -r assets/ $TEMP_DIR/
cp -r components/ $TEMP_DIR/
cp -r constants/ $TEMP_DIR/
cp -r hooks/ $TEMP_DIR/
cp -r app/ $TEMP_DIR/

# Copy frontend configuration files
cp package.json $TEMP_DIR/
cp package-lock.json $TEMP_DIR/
cp app.json $TEMP_DIR/
cp babel.config.js $TEMP_DIR/
cp metro.config.js $TEMP_DIR/
cp tsconfig.json $TEMP_DIR/
cp index.js $TEMP_DIR/

# Create backend directory and copy files
mkdir -p $TEMP_DIR/niura-backend
cp -r niura-backend/app $TEMP_DIR/niura-backend/
cp niura-backend/requirements.txt $TEMP_DIR/niura-backend/
cp niura-backend/setup_db.py $TEMP_DIR/niura-backend/
cp niura-backend/README.md $TEMP_DIR/niura-backend/

# Copy main scripts
cp wake-up.sh $TEMP_DIR/
cp SETUP_INSTRUCTIONS.md $TEMP_DIR/README.md

# Create the zip file
zip -r NIURA.zip $TEMP_DIR/*

# Clean up
rm -rf $TEMP_DIR

echo "Package created successfully as NIURA.zip"
echo "Please share this file with your boss along with the installed iPhone app." 