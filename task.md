# Task: Fix Android Build Error

## Status
- [x] Diagnosa error "Unable to load script"
- [x] Buat JS bundle dengan `expo export:embed`
- [x] Build APK release dengan `./gradlew assembleRelease` (sedang berjalan)
- [x] Menganalisa penyebab Force Close (HTTP Cleartext & missing Babel Config)
- [x] Menambah `usesCleartextTraffic="true"` di `AndroidManifest.xml`
- [x] Menambah `babel.config.js` dan dependencies
- [x] Memindahkan `react-native-gesture-handler` ke `index.ts`
- [x] Tambahkan `<GestureHandlerRootView>` di `App.tsx`
- [x] Install `react-native-svg` (wajib untuk Lucide Icons)
- [x] **[ISOLASI]** Hapus `@haroldtran/react-native-thermal-printer` yang memicu Crash
- [x] Build ulang APK Release Clean Build (89MB) - Verifikasi app berjalan dengan benar di device (SUKSES)
- [x] Cari library alternatif modern: `@poriyaalar/react-native-thermal-receipt-printer`
- [x] Integrasi fungsi API & compile native code APK 90MB
- [ ] Test fungsi cetak struk via bluetooth printer

## Perombakan UI Native (Redesign)
- [ ] Tentukan palet warna (Biru/Slate)
- [x] Redesign `LoginScreen`
- [x] Redesign `DashboardScreen` 
- [x] Redesign `CustomerListScreen` & `CustomerDetailScreen`
- [x] Redesign `PaymentFormScreen` & `CustomerFormScreen`
- [x] Redesign `PaymentHistoryScreen`
