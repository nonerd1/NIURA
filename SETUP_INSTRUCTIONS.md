# NIURA Setup Instructions

## Prerequisites

1. Install Homebrew (macOS package manager):
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

2. Install Python 3.11:
```bash
brew install python@3.11
```

3. Install Node.js and npm:
```bash
brew install node
```

4. Install Expo CLI:
```bash
npm install -g expo-cli
```

## Setup Steps

1. Extract the NIURA.zip file to your desired location:
```bash
unzip NIURA.zip
cd NIURA
```

2. Set up Python virtual environment:
```bash
python3.11 -m venv venv
source venv/bin/activate
cd niura-backend
pip install -r requirements.txt
cd ..
```

3. Install Node.js dependencies:
```bash
npm install
```

4. Make the startup script executable:
```bash
chmod +x wake-up.sh
```

5. Add the `niura` command to your system:
```bash
echo 'alias niura="$HOME/path/to/NIURA/wake-up.sh"' >> ~/.zshrc
source ~/.zshrc
```
Replace `$HOME/path/to/NIURA` with the actual path where you extracted the files.

## Starting the Servers

To start both the backend and frontend servers:
```bash
niura wake up
```

The script will:
1. Automatically detect your current network IP address
2. Update the API configuration
3. Start the backend server
4. Start the Metro bundler in tunnel mode

## Important Notes

1. The app has already been installed on your iPhone through Xcode by the development team.
2. Each time you run the servers on a new WiFi network, the app will automatically connect through the tunnel.
3. Make sure your iPhone is connected to the internet (any network will work).
4. The backend server runs on port 8001, so ensure this port is not being used by other applications.

## Troubleshooting

If you encounter any issues:

1. Make sure both your laptop and phone have internet connectivity
2. Try force closing the NIURA app and reopening it
3. If the servers don't start, try running `pkill -f "node|uvicorn"` to clean up any existing processes
4. Check that Python 3.11 and Node.js are properly installed:
   ```bash
   python3.11 --version
   node --version
   npm --version
   ```

## Files Included in NIURA.zip

- `wake-up.sh`: Main startup script
- `src/`: Frontend source code
- `niura-backend/`: Backend server code and dependencies
- `requirements.txt`: Python package requirements
- `package.json`: Node.js package requirements
- Other configuration files

## Support

If you encounter any issues, please contact the development team for assistance. 