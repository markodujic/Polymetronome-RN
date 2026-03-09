# Setup & Build-Anleitung (Windows)

> Zuletzt aktualisiert: März 2026  
> Expo SDK 55 · React Native 0.83 · react-native-audio-api ^0.11 · AsyncStorage installiert

## Voraussetzungen

- [Node.js](https://nodejs.org/) (empfohlen: LTS, **nicht** v25+)
- [Android Studio](https://developer.android.com/studio) (inkl. SDK & Emulator)
- [Git für Windows](https://git-scm.com/) (für `bash` im PATH)

## Erstmaliger Setup

### 1. Abhängigkeiten installieren

```powershell
cd <projektordner>
npm install
```

### 2. Junction für kurze Pfade erstellen

> **Wichtig auf Windows:** Der Projektpfad ist zu lang für das Android NDK/CMake (MAX_PATH 260).
> Erstelle eine Directory Junction an einem kurzen Pfad:

```cmd
mklink /J C:\rn "C:\Users\<User>\Desktop\Polymetronome-RN\Polymetronome-RN"
mklink /J C:\a "C:\Users\<User>\Desktop\Polymetronome-RN\Polymetronome-RN\node_modules\react-native-audio-api"
```

> Danach immer **von `C:\rn` aus** arbeiten.

### 3. Umgebungsvariablen (jede neue Terminal-Session)

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;C:\Program Files\Git\usr\bin;$env:PATH"
```

## App bauen & starten

### Ersten Build + direkt auf Emulator:

```powershell
cd C:\rn
npx expo run:android
```

### Nach erstem Build – nur Metro starten:

```powershell
cd C:\rn
npx expo start --port 8081
```

Dann im Terminal `a` drücken, um die App auf dem verbundenen Android-Gerät/Emulator zu öffnen.

### Emulator manuell starten:

```powershell
Start-Process "$env:LOCALAPPDATA\Android\Sdk\emulator\emulator.exe" -ArgumentList "-avd Medium_Phone_API_36.1"
```

## Bekannte Probleme & Lösungen

### JAVA_HOME nicht gesetzt
**Fehler:** `JAVA_HOME is not set and no 'java' command could be found`  
**Lösung:** Android Studio bringt ein JDK mit:
```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
```

### Gradle-Version inkompatibel
**Fehler:** `Class ... JvmVendorSpec does not have member field IBM_SEMERU`  
**Lösung:** In [android/gradle/wrapper/gradle-wrapper.properties](android/gradle/wrapper/gradle-wrapper.properties) auf Gradle 8.x setzen:
```
distributionUrl=https\://services.gradle.org/distributions/gradle-8.14.2-bin.zip
```

### CMake-Pfad zu lang (ninja mkdir-Fehler)
**Fehler:** `ninja: error: mkdir(...): No such file or directory`  
**Ursache:** Windows MAX_PATH (260 Zeichen) wird vom ninja-Build überschritten.  
**Lösung:**
1. Junctions erstellen (siehe Abschnitt oben)
2. In `node_modules/react-native-audio-api/android/CMakeLists.txt` sind die Pfade bereits auf die Junction `C:/a` umgestellt
3. In `node_modules/react-native-audio-api/android/build.gradle` ist `buildStagingDirectory "C:/cxx/rnaudioapi"` gesetzt

> ⚠️ Diese Änderungen in `node_modules` gehen beim nächsten `npm install` verloren.  
> Dann einfach `npx expo run:android` erneut ausführen – die Fehlerbehebung muss ggf. wiederholt werden.

### bash nicht gefunden
**Fehler:** `A problem occurred starting process 'command 'bash''`  
**Lösung:** Git Bash zum PATH hinzufügen:
```powershell
$env:PATH = "C:\Program Files\Git\usr\bin;$env:PATH"
```

### APK-Signatur inkompatibel
**Fehler:** `INSTALL_FAILED_UPDATE_INCOMPATIBLE: Existing package signatures do not match`  
**Lösung:** Alte App deinstallieren:
```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall com.example.polymetronome
```

### babel-preset-expo fehlt
**Fehler:** `Cannot find module 'babel-preset-expo'`  
**Lösung:**
```powershell
npm install babel-preset-expo
```

## Windows Long Path Support aktivieren

```powershell
# Als Administrator ausführen:
Set-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1
```
Danach Terminal neu starten.
