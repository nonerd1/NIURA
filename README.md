# NIURA Mobile App

A React Native mobile application for NIURA, featuring BLE connectivity, backend API authentication, and real-time data monitoring.

## Features

- Bluetooth Low Energy (BLE) connectivity with ESP32 devices
- Backend API authentication with JWT tokens
- Background BLE service for continuous data monitoring
- Modern UI with dark/light theme support
- Deep linking support
- TypeScript implementation

## Prerequisites

- Node.js (v14 or later)
- Xcode (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)
- React Native CLI

## Installation

1. Clone the repository:
```bash
git clone [repository-url]
cd NIURA
```

2. Install dependencies:
```bash
yarn install
cd ios && pod install && cd ..
```

3. Set up environment variables:
Create a `.env` file in the root directory with:
```
API_BASE_URL=http://127.0.0.1:8000/api
```

4. Run the app:
- iOS: `yarn ios`
- Android: `yarn android`

## Development

- `yarn start`: Start the Metro bundler
- `yarn test`: Run tests
- `yarn lint`: Run ESLint
- `yarn clean`: Clean build folders

## Project Structure

```
src/
├── assets/         # Images, fonts, etc.
├── components/     # Reusable components
├── config/         # Configuration files
├── context/        # React Context providers
├── navigation/     # Navigation setup
├── screens/        # App screens
├── services/       # Business logic and API calls
└── utils/          # Helper functions
```

## API Integration

The app integrates with a backend API for user authentication and data management. The API configuration is located in `src/config/amplify.ts`.

### Authentication Flow

1. **Registration**: Users register with email, password, firstName, and lastName
2. **Login**: Users authenticate with email and password
3. **Token Management**: JWT tokens are automatically handled for authenticated requests
4. **Session Management**: User sessions are maintained across app restarts

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
