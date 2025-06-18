# 🚀 NIURA Fast Development - Quick Reference

## 📱 Daily Workflow (90% of development)

```bash
./dev_workflow.sh
# Choose option 1: START EXPO DEV CLIENT
```

**Result:** Instant hot reload for all React Native code changes!

---

## 🔨 Initial Setup (One-time only)

1. **Connect iPhone via USB and unlock it**
2. **Run initial build:**
   ```bash
   ./dev_workflow.sh
   # Choose option 2: FULL REBUILD
   ```
3. **Wait 5-10 minutes for first build**
4. **Switch to daily workflow (option 1)**

---

## ⚡ Quick Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `./dev_workflow.sh` | Main workflow menu | Always start here |
| `./fast_build.sh` | Command line build | Skip Xcode entirely |
| `npx expo start --dev-client` | Direct dev client | If you know build exists |

---

## 🎯 What Gets Hot Reload vs Rebuild

### ✅ Hot Reload (Instant)
- React component changes
- JavaScript/TypeScript code
- Business logic
- UI modifications
- Bluetooth/ESP32 logic
- API calls and data processing

### ⚠️ Requires Rebuild
- Adding/removing npm packages
- Native iOS code changes
- Podfile modifications

---

## 🔧 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Device "unavailable" | Connect USB, unlock iPhone, trust computer |
| "No development build" | Run `./dev_workflow.sh` option 2 |
| Changes not reflecting | Use option 1 (Expo dev client) |
| Build errors | Run `./comprehensive_fix.sh` |

---

## ⏱️ Time Savings

- **Before:** 8-23 minutes per session (Xcode indexing + building)
- **After:** Instant hot reload for daily development
- **Savings:** 10-18 minutes per development session

---

## 📋 Files Reference

- `dev_workflow.sh` - Main workflow script
- `fast_build.sh` - Command line build script  
- `fast_dev_setup_log.txt` - Complete documentation
- `FAST_DEV_QUICK_REFERENCE.md` - This quick guide

---

## 🎉 Happy Fast Development!

**Remember:** Build once (option 2), develop forever (option 1)! 