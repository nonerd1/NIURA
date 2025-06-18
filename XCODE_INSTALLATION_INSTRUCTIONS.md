# NIURA iOS App Installation Guide via Xcode


---

## **Prerequisites**

### **Required Software:**
- **macOS** (10.15 or later)
- **Xcode** (14.0 or later) - Download from Mac App Store
- **Node.js** (18+ recommended) - Download from nodejs.org
- **Yarn** (package manager) - Install via `npm install -g yarn`
- **CocoaPods** - Install via `sudo gem install cocoapods`

### **Required Hardware:**
- **iPhone** (iOS 15.1 or later)
- **Lightning/USB-C cable** to connect iPhone to Mac

### **Required Accounts:**
- **Apple ID** (for device registration)

---

## **⚡ Quick Installation Steps**

### **Step 1: Clone and Setup Project**
```bash
# Clone the repository
git clone [REPOSITORY_URL]
cd NIURA

# Install dependencies
yarn install

# Install iOS dependencies
cd ios
pod install
cd ..
```

### **Step 2: Open in Xcode**
1. Navigate to `ios/` folder
2. Open `NIURA.xcworkspace` (NOT .xcodeproj)
3. Wait for Xcode to load and index files

### **Step 3: Configure Device**
1. Connect iPhone to Mac via cable
2. **Trust Computer** when prompted on iPhone
3. In Xcode, select your iPhone from device list (top toolbar)

### **Step 4: Configure Signing**
1. Select **NIURA** project in left sidebar
2. Select **NIURA** target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** (Apple Developer Account)
6. Xcode will automatically create provisioning profile

### **Step 5: Build and Install**
1. Click **Play button** (▶️) or press `Cmd+R`
2. Xcode will build and install the app
3. Wait for installation to complete (5-10 minutes first time)

---

## **🔧 Detailed Setup Instructions**

### **Environment Setup**

#### **1. Install Node.js**
```bash
# Download from https://nodejs.org/
# Or install via Homebrew:
brew install node

# Verify installation
node --version  # Should be 18+
npm --version
```

#### **2. Install Yarn**
```bash
npm install -g yarn
yarn --version
```

#### **3. Install CocoaPods**
```bash
sudo gem install cocoapods
pod --version
```

#### **4. Install Xcode Command Line Tools**
```bash
xcode-select --install
```

### **Project Setup**

#### **1. Clone Repository**
```bash
git clone [REPOSITORY_URL]
cd NIURA
```

#### **2. Install Dependencies**
```bash
# Install JavaScript dependencies
yarn install

# Install iOS native dependencies
cd ios
pod install
cd ..
```

#### **3. Verify Installation**
```bash
# Check if all dependencies are installed
yarn list
```

---

## **📱 Device Configuration**

### **iPhone Setup**
1. **Enable Developer Mode:**
   - Settings → Privacy & Security → Developer Mode
   - Toggle ON and restart device

2. **Trust Computer:**
   - Connect iPhone to Mac
   - Tap "Trust" when prompted on iPhone

3. **Check iOS Version:**
   - Settings → General → About
   - Must be iOS 15.1 or later

### **Xcode Device Registration**
1. **Window → Devices and Simulators**
2. Select your iPhone
3. Click **Use for Development**
4. Enter Apple ID credentials if prompted

---

## **🔑 Code Signing Configuration**

### **Automatic Signing (Recommended)**
1. Open `ios/NIURA.xcworkspace` in Xcode
2. Select **NIURA** project → **NIURA** target
3. **Signing & Capabilities** tab
4. Check ✅ **Automatically manage signing**
5. Select **Team** (your Apple Developer Account)
6. **Bundle Identifier:** `io.niura.app`

### **Manual Signing (Advanced)**
1. Create App ID in Apple Developer Portal
2. Create Development Provisioning Profile
3. Download and install profile
4. Uncheck "Automatically manage signing"
5. Select your profile manually

---

## **⚙️ Build Configuration**

### **Development Build**
```bash
# From project root
npx expo run:ios --device
```

### **Xcode Build**
1. Select **iPhone** device (not simulator)
2. **Product → Build** (Cmd+B)
3. **Product → Run** (Cmd+R)

### **Build Settings**
- **Deployment Target:** iOS 15.1
- **Architecture:** arm64
- **Build Configuration:** Debug (for development)

---

## **🚨 Troubleshooting**

### **Common Issues & Solutions**

#### **"Developer Mode not enabled"**
```
Solution: Settings → Privacy & Security → Developer Mode → ON → Restart iPhone
```

#### **"Untrusted Developer" Error**
```
Solution: Settings → General → VPN & Device Management → Trust [Developer Name]
```

#### **CocoaPods Issues**
```bash
# Clear CocoaPods cache
cd ios
pod deintegrate
pod clean
pod install

# If still issues:
sudo gem uninstall cocoapods
sudo gem install cocoapods
```

#### **Build Errors**
```bash
# Clean Xcode build
# Product → Clean Build Folder (Cmd+Shift+K)

# Reset Metro cache
npx expo start --clear
```

#### **Device Not Recognized**
```bash
# Reset iPhone trust settings
# Settings → General → Transfer or Reset iPhone → Reset → Reset Location & Privacy
```

### **Permission Issues**
The app requires several permissions that will be requested on first launch:
- **Bluetooth** - for device connectivity
- **Location** - required for Bluetooth scanning
- **Background App Refresh** - for continuous monitoring

---

## **🔍 Verification Steps**

### **Post-Installation Checklist**
1. ✅ App icon appears on iPhone home screen
2. ✅ App launches without crashing
3. ✅ Navigation works (bottom tabs)
4. ✅ Login screen appears
5. ✅ Bluetooth permission requested
6. ✅ No critical errors in Xcode console

### **Testing Basic Functionality**
1. **Launch App** - Should show login screen
2. **Test Navigation** - Tap through bottom tabs
3. **Check Bluetooth** - Should request permission
4. **Test Authentication** - Try login flow
5. **Verify UI** - All screens load properly

---

## **📝 Important Notes**

### **For Employers/Recipients:**
- **No Developer Account Required** for device owner
- **Installation is FREE** (only requires Mac + Xcode)
- **App expires after 7 days** without paid developer account
- **Reinstallation needed** after expiration

### **For Developers:**
- **Apple Developer Account** ($99/year) required for signing
- **Device UDIDs** must be registered for distribution
- **Provisioning profiles** must be valid
- **Certificates** must not be expired

### **Security Considerations:**
- App uses **development certificates** (not production)
- **Data is stored locally** on device
- **No automatic updates** available
- **Limited to registered devices** only

---

## **🆘 Support & Contact**

### **If Installation Fails:**
1. Check all prerequisites are installed
2. Verify iPhone meets minimum requirements
3. Ensure Apple Developer Account is active
4. Try cleaning and rebuilding project
5. Contact developer for assistance

### **Technical Requirements Summary:**
- **macOS:** 10.15+
- **Xcode:** 14.0+
- **iPhone:** iOS 15.1+
- **Node.js:** 18+
- **Apple Developer Account:** Required

---

## **📊 Expected Installation Time**
- **First Time:** 30-45 minutes (including setup)
- **Subsequent Builds:** 5-10 minutes
- **Dependency Updates:** 15-20 minutes

---

**✅ Installation Complete!** The NIURA app should now be running on the iPhone and ready for testing/demonstration.

---

*This document was generated for NIURA v1.0.0 - React Native with Expo SDK 52.0.0* 