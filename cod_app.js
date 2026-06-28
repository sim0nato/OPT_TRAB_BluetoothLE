const ComponentFunction = function() {
  // @section:imports @depends:[]
  var React = require('react');
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useContext = React.useContext;
  var useMemo = React.useMemo;
  var useCallback = React.useCallback;
  var useRef = React.useRef;
  var RN = require('react-native');
  var View = RN.View;
  var Text = RN.Text;
  var StyleSheet = RN.StyleSheet;
  var TouchableOpacity = RN.TouchableOpacity;
  var ScrollView = RN.ScrollView;
  var Switch = RN.Switch;
  var Alert = RN.Alert;
  var Platform = RN.Platform;
  var StatusBar = RN.StatusBar;
  var ActivityIndicator = RN.ActivityIndicator;
  var Dimensions = RN.Dimensions;
  var FlatList = RN.FlatList;
  var createBottomTabNavigator = require('@react-navigation/bottom-tabs').createBottomTabNavigator;
  var Ionicons = require('@react-native-vector-icons/ionicons').Ionicons;
  var useSafeAreaInsets = require('react-native-safe-area-context').useSafeAreaInsets;
  var platformHooks = require('platform-hooks');
  var useStorage = platformHooks.useStorage;
  var useBluetooth = platformHooks.useBluetooth;
  // @end:imports

  // @section:theme @depends:[]
  var primaryColor = '#2E86AB';
  var accentColor = '#F18F01';
  var backgroundColor = '#0F1923';
  var cardColor = '#1C2B38';
  var cardColor2 = '#243446';
  var textPrimary = '#E8F4FD';
  var textSecondary = '#7FB3CC';
  var successColor = '#27C96A';
  var errorColor = '#FF4757';
  var warningColor = '#FFA502';
  var TAB_MENU_HEIGHT = Platform.OS === 'web' ? 56 : 49;
  var SCROLL_EXTRA_PADDING = 16;
  var WEB_TAB_MENU_PADDING = 90;
  var FAB_SPACING = 16;
  var screenWidth = Dimensions.get('window').width;
  // @end:theme

  // @section:navigation-setup @depends:[]
  var Tab = createBottomTabNavigator();
  // @end:navigation-setup

  // @section:ble-uuids @depends:[]
  var SVC_ENV = '0000181a-0000-1000-8000-00805f9b34fb';
  var CHAR_DATA = '0000181b-0000-1000-8000-00805f9b34fb';
  var CHAR_HISTORY = '0000181c-0000-1000-8000-00805f9b34fb';
  var SVC_CTRL = '5b1d1a00-0001-4a2e-9e2a-111111111111';
  var CHAR_LEDS = '5b1d1a00-0002-4a2e-9e2a-111111111111';
  var CHAR_RGB = '5b1d1a00-0003-4a2e-9e2a-111111111111';
  var SVC_SIGNAL = '5b1d1a00-0011-4a2e-9e2a-222222222222';
  var CHAR_RSSI = '5b1d1a00-0012-4a2e-9e2a-222222222222';
  var CHAR_NOTIF = '5b1d1a00-0013-4a2e-9e2a-222222222222';
  var TARGET_DEVICE_NAME = 'HS-ESP32-BLE';
  var MAX_GRAPH_POINTS = 60;
  // @end:ble-uuids

  // @section:base64-helpers @depends:[]
  var BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  var base64ToStr = function(b64) {
    if (typeof atob === 'function') {
      try { return atob(b64); } catch (e) { return ''; }
    }
    var str = '';
    var clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
    for (var i = 0; i < clean.length; i += 4) {
      var i0 = BASE64_CHARS.indexOf(clean[i]);
      var i1 = BASE64_CHARS.indexOf(clean[i + 1]);
      var i2 = clean[i + 2] && clean[i + 2] !== '=' ? BASE64_CHARS.indexOf(clean[i + 2]) : -1;
      var i3 = clean[i + 3] && clean[i + 3] !== '=' ? BASE64_CHARS.indexOf(clean[i + 3]) : -1;
      str += String.fromCharCode((i0 << 2) | (i1 >> 4));
      if (i2 !== -1) str += String.fromCharCode(((i1 & 0xF) << 4) | (i2 >> 2));
      if (i3 !== -1) str += String.fromCharCode(((i2 & 0x3) << 6) | i3);
    }
    return str;
  };

  var bytesToBase64 = function(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) { bin += String.fromCharCode(bytes[i]); }
    if (typeof btoa === 'function') { try { return btoa(bin); } catch (e) {} }
    var result = '';
    for (var i = 0; i < bin.length; i += 3) {
      var b0 = bin.charCodeAt(i);
      var b1 = i + 1 < bin.length ? bin.charCodeAt(i + 1) : 0;
      var b2 = i + 2 < bin.length ? bin.charCodeAt(i + 2) : 0;
      result += BASE64_CHARS[b0 >> 2];
      result += BASE64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
      result += i + 1 < bin.length ? BASE64_CHARS[((b1 & 0xF) << 2) | (b2 >> 6)] : '=';
      result += i + 2 < bin.length ? BASE64_CHARS[b2 & 0x3F] : '=';
    }
    return result;
  };
  // @end:base64-helpers

  // @section:minmax-utils @depends:[]
  var calculateHistoricalMinMax = function(tempHist, humHist) {
    var tempHistMin = tempHist.length > 0 ? Math.min.apply(null, tempHist) : null;
    var tempHistMax = tempHist.length > 0 ? Math.max.apply(null, tempHist) : null;
    var humHistMin = humHist.length > 0 ? Math.min.apply(null, humHist) : null;
    var humHistMax = humHist.length > 0 ? Math.max.apply(null, humHist) : null;

    var tempHistMinC = tempHistMin;
    var tempHistMaxC = tempHistMax;
    var tempHistMinF = tempHistMin !== null ? (tempHistMin * 9 / 5) + 32 : null;
    var tempHistMaxF = tempHistMax !== null ? (tempHistMax * 9 / 5) + 32 : null;

    var tempMinCDisplay = tempHistMinC === null ? '—' : tempHistMinC.toFixed(1) + ' °C';
    var tempMaxCDisplay = tempHistMaxC === null ? '—' : tempHistMaxC.toFixed(1) + ' °C';
    var tempMinFDisplay = tempHistMinF === null ? '—' : tempHistMinF.toFixed(1) + ' °F';
    var tempMaxFDisplay = tempHistMaxF === null ? '—' : tempHistMaxF.toFixed(1) + ' °F';
    var umidMinDisplay = humHistMin === null ? '—' : humHistMin.toFixed(1) + ' %';
    var umidMaxDisplay = humHistMax === null ? '—' : humHistMax.toFixed(1) + ' %';

    return {
      tempHistMin: tempHistMin,
      tempHistMax: tempHistMax,
      humHistMin: humHistMin,
      humHistMax: humHistMax,
      tempHistMinC: tempHistMinC,
      tempHistMaxC: tempHistMaxC,
      tempHistMinF: tempHistMinF,
      tempHistMaxF: tempHistMaxF,
      tempMinCDisplay: tempMinCDisplay,
      tempMaxCDisplay: tempMaxCDisplay,
      tempMinFDisplay: tempMinFDisplay,
      tempMaxFDisplay: tempMaxFDisplay,
      umidMinDisplay: umidMinDisplay,
      umidMaxDisplay: umidMaxDisplay
    };
  };
  // @end:minmax-utils

  // @section:BLEContext @depends:[ble-uuids,base64-helpers]
  var BLEContext = React.createContext(null);

  var BLEProvider = function(props) {
    var bleHook = useBluetooth();
    var scan = bleHook.scan;
    var stopScan = bleHook.stopScan;
    var connect = bleHook.connect;
    var disconnect = bleHook.disconnect;
    var write = bleHook.write;
    var startNotifications = bleHook.startNotifications;
    var stopNotifications = bleHook.stopNotifications;
    var read = bleHook.read;
    var onDeviceDisconnected = bleHook.onDeviceDisconnected;
    var discoveredDevices = bleHook.discoveredDevices;
    var isScanning = bleHook.isScanning;

    var settingsStore = useStorage('ble_app_settings', { lastDeviceMac: '', lastDeviceName: '' });
    var savedSettings = settingsStore[0];
    var setSavedSettings = settingsStore[1];

    var ctrlStore = useStorage('ble_ctrl_states', { led1: false, led2: false, rgbRed: 0, rgbGreen: 0, rgbBlue: 0 });
    var ctrlState = ctrlStore[0];
    var setCtrlState = ctrlStore[1];

    var connStatusState = useState('disconnected');
    var connStatus = connStatusState[0];
    var setConnStatus = connStatusState[1];

    var foundDeviceState = useState(null);
    var foundDevice = foundDeviceState[0];
    var setFoundDevice = foundDeviceState[1];

    var connectedIdState = useState(null);
    var connectedId = connectedIdState[0];
    var setConnectedId = connectedIdState[1];

    var tempCState = useState(0);
    var tempC = tempCState[0];
    var setTempC = tempCState[1];

    var tempFState = useState(0);
    var tempF = tempFState[0];
    var setTempF = tempFState[1];

    var humidityState = useState(0);
    var humidity = humidityState[0];
    var setHumidity = humidityState[1];

    var tempHistState = useState([]);
    var tempHist = tempHistState[0];
    var setTempHist = tempHistState[1];

    var humHistState = useState([]);
    var humHist = humHistState[0];
    var setHumHist = humHistState[1];

    var rssiState = useState(null);
    var rssiValue = rssiState[0];
    var setRssiValue = rssiState[1];

    var notifCountState = useState(null);
    var notifCount = notifCountState[0];
    var setNotifCount = notifCountState[1];

    var tempMinCState = useState(999);
    var tempMinC = tempMinCState[0];
    var setTempMinC = tempMinCState[1];

    var tempMaxCState = useState(-999);
    var tempMaxC = tempMaxCState[0];
    var setTempMaxC = tempMaxCState[1];

    var tempMinFState = useState(999);
    var tempMinF = tempMinFState[0];
    var setTempMinF = tempMinFState[1];

    var tempMaxFState = useState(-999);
    var tempMaxF = tempMaxFState[0];
    var setTempMaxF = tempMaxFState[1];

    var umidMinState = useState(999);
    var umidMin = umidMinState[0];
    var setUmidMin = umidMinState[1];

    var umidMaxState = useState(-999);
    var umidMax = umidMaxState[0];
    var setUmidMax = umidMaxState[1];

    var tempScaleState = useState('C');
    var tempScale = tempScaleState[0];
    var setTempScale = tempScaleState[1];

    var updatingByNotifyState = useState(false);
    var updatingByNotify = updatingByNotifyState[0];
    var setUpdatingByNotify = updatingByNotifyState[1];

    var notifTimerRef = useRef(null);
    var connectedIdRef = useRef(null);

    useEffect(function() {
      connectedIdRef.current = connectedId;
    }, [connectedId]);

    var handleDisconnect = useCallback(function() {
      setConnStatus('disconnected');
      setConnectedId(null);
      connectedIdRef.current = null;
      setFoundDevice(null);
      if (notifTimerRef.current) {
        clearInterval(notifTimerRef.current);
        notifTimerRef.current = null;
      }
    }, []);

    useEffect(function() {
      var unsub = onDeviceDisconnected(function(deviceId) {
        handleDisconnect();
      });
      return function() { if (unsub) unsub(); };
    }, [handleDisconnect, onDeviceDisconnected]);

    var handleDataNotify = useCallback(function(base64Val) {
      var str = base64ToStr(base64Val);
      if (!str) return;
      var parts = str.split(',');
      if (parts.length >= 4) {
        var tC = parseFloat(parts[0]);
        var tF = parseFloat(parts[1]);
        var hum = parseFloat(parts[2]);
        var sw4 = parts[3] ? parts[3].trim() : '0';

        if (!isNaN(tC)) setTempC(tC);
        if (!isNaN(tF)) setTempF(tF);
        if (!isNaN(hum)) setHumidity(hum);

        if (!isNaN(tC)) {
          if (tC < tempMinC) setTempMinC(tC);
          if (tC > tempMaxC) setTempMaxC(tC);
        }
        if (!isNaN(tF)) {
          if (tF < tempMinF) setTempMinF(tF);
          if (tF > tempMaxF) setTempMaxF(tF);
        }
        if (!isNaN(hum)) {
          if (hum < umidMin) setUmidMin(hum);
          if (hum > umidMax) setUmidMax(hum);
        }

        var newScale = sw4 === '1' ? 'F' : 'C';
        if (newScale !== tempScale) {
          setTempScale(newScale);
          setTempHist([]);
        }

        var tempToGraph = newScale === 'F' ? tF : tC;
        if (!isNaN(tempToGraph)) {
          setTempHist(function(prev) {
            var next = prev.concat([tempToGraph]);
            if (next.length > MAX_GRAPH_POINTS) next = next.slice(next.length - MAX_GRAPH_POINTS);
            return next;
          });
        }

        if (!isNaN(hum)) {
          setHumHist(function(prev) {
            var next = prev.concat([hum]);
            if (next.length > MAX_GRAPH_POINTS) next = next.slice(next.length - MAX_GRAPH_POINTS);
            return next;
          });
        }
      }
    }, [tempScale, tempMinC, tempMaxC, tempMinF, tempMaxF, umidMin, umidMax]);

    var handleRssiNotify = useCallback(function(base64Val) {
      var str = base64ToStr(base64Val);
      if (!str) return;
      var val = parseInt(str.trim(), 10);
      if (!isNaN(val)) setRssiValue(val);
    }, []);

    var handleLedsNotify = useCallback(function(base64Val) {
      var str = base64ToStr(base64Val);
      if (!str) return;
      var byteVal = parseInt(str.charCodeAt(0), 10);
      if (isNaN(byteVal)) return;
      var l1 = (byteVal & 1) !== 0;
      var l2 = (byteVal & 2) !== 0;
      setUpdatingByNotify(true);
      setCtrlState(function(prev) { return Object.assign({}, prev, { led1: l1, led2: l2 }); });
      setUpdatingByNotify(false);
    }, []);

    var startSubscriptions = useCallback(function(deviceId) {
      startNotifications(deviceId, SVC_ENV, CHAR_DATA, function(v) { handleDataNotify(v); }).then(function(res) {
        if (res && res.error) console.log('Data notify err:', res.error);
      });
      startNotifications(deviceId, SVC_SIGNAL, CHAR_RSSI, function(v) { handleRssiNotify(v); }).then(function(res) {
        if (res && res.error) console.log('RSSI notify err:', res.error);
      });
      startNotifications(deviceId, SVC_CTRL, CHAR_LEDS, function(v) { handleLedsNotify(v); }).then(function(res) {
        if (res && res.error) console.log('LEDs notify err:', res.error);
      });
      if (notifTimerRef.current) clearInterval(notifTimerRef.current);
      notifTimerRef.current = setInterval(function() {
        var id = connectedIdRef.current;
        if (!id) return;
        read(id, SVC_SIGNAL, CHAR_NOTIF).then(function(res) {
          if (res && !res.error && res.value) {
            var str = base64ToStr(res.value);
            var val = parseInt(str.trim(), 10);
            if (!isNaN(val)) setNotifCount(val);
          }
        });
      }, 60000);
    }, [startNotifications, handleDataNotify, handleRssiNotify, handleLedsNotify, read]);

    var doScan = useCallback(function() {
      setConnStatus('scanning');
      setFoundDevice(null);
      scan({ timeout: 15000 }, function(device) {
        var name = device.name || device.localName || '';
        if (name === TARGET_DEVICE_NAME || name.indexOf(TARGET_DEVICE_NAME) !== -1) {
          setFoundDevice(device);
          setConnStatus('found');
          stopScan();
          setSavedSettings(function(prev) { return Object.assign({}, prev, { lastDeviceMac: device.id, lastDeviceName: name }); });
        }
      }).then(function(result) {
        if (result && result.error && result.error.indexOf('9101') === -1) {
          setConnStatus(function(s) { return s === 'scanning' ? 'disconnected' : s; });
        }
      });
    }, [scan, stopScan, setSavedSettings]);

    var doConnect = useCallback(function() {
      if (!foundDevice) return;
      setConnStatus('connecting');
      connect(foundDevice.id).then(function(result) {
        if (result && result.error) {
          if (result.error.indexOf('9101') === -1) {
            setConnStatus('disconnected');
            Platform.OS === 'web' ? window.alert('Erro: ' + result.error) : Alert.alert('Erro de Conexão', result.error);
          }
          return;
        }
        setConnectedId(foundDevice.id);
        connectedIdRef.current = foundDevice.id;
        setConnStatus('connected');
        startSubscriptions(foundDevice.id);
      });
    }, [foundDevice, connect, startSubscriptions]);

    var doDisconnect = useCallback(function() {
      var id = connectedIdRef.current;
      if (id) {
        stopNotifications(id, SVC_ENV, CHAR_DATA);
        stopNotifications(id, SVC_SIGNAL, CHAR_RSSI);
        stopNotifications(id, SVC_CTRL, CHAR_LEDS);
        disconnect(id);
      }
      handleDisconnect();
    }, [disconnect, stopNotifications, handleDisconnect]);

    var writeLeds = useCallback(function(l1, l2) {
      var id = connectedIdRef.current;
      if (!id) return;
      var byteVal = (l1 ? 1 : 0) + (l2 ? 2 : 0);
      write(id, SVC_CTRL, CHAR_LEDS, bytesToBase64([byteVal]), true).then(function(res) {
        if (res && res.error && res.error.indexOf('9101') === -1) console.log('LED write err:', res.error);
      });
    }, [write]);

    var writeRGB = useCallback(function(r, g, b) {
      var id = connectedIdRef.current;
      if (!id) return;
      write(id, SVC_CTRL, CHAR_RGB, bytesToBase64([r, g, b]), false).then(function(res) {
        if (res && res.error && res.error.indexOf('9101') === -1) console.log('RGB write err:', res.error);
      });
    }, [write]);

    var writeReset = useCallback(function() {
      var id = connectedIdRef.current;
      if (!id) return;
      write(id, SVC_CTRL, CHAR_LEDS, bytesToBase64([255]), true).then(function(res) {
        if (res && res.error && res.error.indexOf('9101') === -1) console.log('Reset write err:', res.error);
      });
      setTempMinC(999);
      setTempMaxC(-999);
      setTempMinF(999);
      setTempMaxF(-999);
      setUmidMin(999);
      setUmidMax(-999);
    }, [write]);

    var setLed1 = useCallback(function(val) {
      if (updatingByNotify) return;
      setCtrlState(function(prev) { return Object.assign({}, prev, { led1: val }); });
      writeLeds(val, ctrlState.led2);
    }, [updatingByNotify, setCtrlState, writeLeds, ctrlState]);

    var setLed2 = useCallback(function(val) {
      if (updatingByNotify) return;
      setCtrlState(function(prev) { return Object.assign({}, prev, { led2: val }); });
      writeLeds(ctrlState.led1, val);
    }, [updatingByNotify, setCtrlState, writeLeds, ctrlState]);

    var setRgbRed = useCallback(function(val) {
      setCtrlState(function(prev) { return Object.assign({}, prev, { rgbRed: val }); });
      writeRGB(val, ctrlState.rgbGreen, ctrlState.rgbBlue);
    }, [setCtrlState, writeRGB, ctrlState]);

    var setRgbGreen = useCallback(function(val) {
      setCtrlState(function(prev) { return Object.assign({}, prev, { rgbGreen: val }); });
      writeRGB(ctrlState.rgbRed, val, ctrlState.rgbBlue);
    }, [setCtrlState, writeRGB, ctrlState]);

    var setRgbBlue = useCallback(function(val) {
      setCtrlState(function(prev) { return Object.assign({}, prev, { rgbBlue: val }); });
      writeRGB(ctrlState.rgbRed, ctrlState.rgbGreen, val);
    }, [setCtrlState, writeRGB, ctrlState]);

    var turnOffRGB = useCallback(function() {
      setCtrlState(function(prev) { return Object.assign({}, prev, { rgbRed: 0, rgbGreen: 0, rgbBlue: 0 }); });
      writeRGB(0, 0, 0);
    }, [setCtrlState, writeRGB]);

    var ctxValue = useMemo(function() {
      return {
        connStatus: connStatus,
        foundDevice: foundDevice,
        connectedId: connectedId,
        tempC: tempC,
        tempF: tempF,
        humidity: humidity,
        tempHist: tempHist,
        humHist: humHist,
        rssiValue: rssiValue,
        notifCount: notifCount,
        tempMinC: tempMinC,
        tempMaxC: tempMaxC,
        tempMinF: tempMinF,
        tempMaxF: tempMaxF,
        umidMin: umidMin,
        umidMax: umidMax,
        tempScale: tempScale,
        ctrlState: ctrlState,
        savedSettings: savedSettings,
        doScan: doScan,
        doConnect: doConnect,
        doDisconnect: doDisconnect,
        setLed1: setLed1,
        setLed2: setLed2,
        setRgbRed: setRgbRed,
        setRgbGreen: setRgbGreen,
        setRgbBlue: setRgbBlue,
        writeReset: writeReset,
        turnOffRGB: turnOffRGB,
        isScanning: isScanning
      };
    }, [connStatus, foundDevice, connectedId, tempC, tempF, humidity, tempHist, humHist, rssiValue, notifCount, tempMinC, tempMaxC, tempMinF, tempMaxF, umidMin, umidMax, tempScale, ctrlState, savedSettings, doScan, doConnect, doDisconnect, setLed1, setLed2, setRgbRed, setRgbGreen, setRgbBlue, writeReset, turnOffRGB, isScanning]);

    return React.createElement(BLEContext.Provider, { testID: 'Provider-1', value: ctxValue }, props.children);
  };

  var useBLE = function() { return useContext(BLEContext); };
  // @end:BLEContext

  // @section:ThemeContext @depends:[theme]
  var ThemeContext = React.createContext({ theme: { colors: { primary: primaryColor, accent: accentColor, background: backgroundColor, card: cardColor, textPrimary: textPrimary, textSecondary: textSecondary, border: '#1E3A4A', success: successColor, error: errorColor, warning: warningColor } }, designStyle: 'modern' });

  var ThemeProvider = function(props) {
    var lightTheme = useMemo(function() {
      return {
        colors: {
          primary: primaryColor,
          accent: accentColor,
          background: backgroundColor,
          card: cardColor,
          card2: cardColor2,
          textPrimary: textPrimary,
          textSecondary: textSecondary,
          border: '#1E3A4A',
          success: successColor,
          error: errorColor,
          warning: warningColor
        }
      };
    }, []);
    var value = useMemo(function() {
      return { theme: lightTheme, designStyle: 'modern' };
    }, [lightTheme]);
    return React.createElement(ThemeContext.Provider, { testID: 'Provider-2', value: value }, props.children);
  };

  var useTheme = function() { return useContext(ThemeContext); };
  // @end:ThemeContext

  // @section:LineGraph @depends:[theme]
  var LineGraph = function(props) {
    var data = props.data || [];
    var color = props.color || primaryColor;
    var graphHeight = 130;
    var graphWidth = props.graphWidth || (screenWidth - 48);
    var label = props.label || '';

    if (data.length === 0) {
      return React.createElement(View, { testID: 'View-1', style: { width: graphWidth, height: graphHeight, justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: backgroundColor } },
        React.createElement(Text, { testID: 'Text-1', style: { color: textSecondary, fontSize: 12 } }, 'Aguardando dados...')
      );
    }

    var minVal = Math.min.apply(null, data);
    var maxVal = Math.max.apply(null, data);
    var range = maxVal - minVal;
    if (range < 1) range = 1;
    var padH = 8;
    var padV = 8;
    var plotW = graphWidth - padH * 2;
    var plotH = graphHeight - padV * 2;

    var points = data.map(function(v, i) {
      return {
        x: padH + (i / Math.max(data.length - 1, 1)) * plotW,
        y: padV + plotH - ((v - minVal) / range) * plotH
      };
    });

    var elements = [];

    for (var gi = 0; gi < 3; gi++) {
      var gridY = padV + (gi / 2) * plotH;
      elements.push(React.createElement(View, { testID: 'View-2', key: 'grid' + gi,
        style: { position: 'absolute', left: padH, top: gridY, width: plotW, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' }
      }));
    }

    for (var li = 0; li < points.length - 1; li++) {
      var p = points[li];
      var q = points[li + 1];
      var dx = q.x - p.x;
      var dy = q.y - p.y;
      var len = Math.sqrt(dx * dx + dy * dy);
      var angle = Math.atan2(dy, dx) * (180 / Math.PI);
      var midX = (p.x + q.x) / 2;
      var midY = (p.y + q.y) / 2;
      elements.push(React.createElement(View, { testID: 'View-3', key: 'line' + li,
        style: {
          position: 'absolute',
          left: midX - len / 2,
          top: midY - 1.5,
          width: len,
          height: 3,
          backgroundColor: color,
          opacity: 0.85,
          transform: [{ rotate: angle + 'deg' }]
        }
      }));
    }

    for (var di = 0; di < points.length; di++) {
      var pt = points[di];
      elements.push(React.createElement(View, { testID: 'View-4', key: 'dot' + di,
        style: { position: 'absolute', left: pt.x - 3, top: pt.y - 3, width: 6, height: 6, borderRadius: 3, backgroundColor: color, opacity: 1 }
      }));
    }

    if (data.length > 0) {
      var lastVal = data[data.length - 1];
      var lastPt = points[points.length - 1];
      elements.push(React.createElement(View, { testID: 'View-5', key: 'vallabel',
        style: { position: 'absolute', left: Math.min(lastPt.x - 20, graphWidth - 60), top: Math.max(lastPt.y - 20, 0), backgroundColor: color + 'CC', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }
      },
        React.createElement(Text, { testID: 'Text-2', style: { color: '#FFFFFF', fontSize: 10, fontWeight: 'bold' } }, lastVal.toFixed(1))
      ));
    }

    return React.createElement(View, { testID: 'View-6', style: { width: graphWidth, height: graphHeight, overflow: 'hidden', borderRadius: 8, backgroundColor: '#0A1520', position: 'relative' } },
      elements,
      React.createElement(View, { testID: 'View-7', style: { position: 'absolute', bottom: 4, left: padH } },
        React.createElement(Text, { testID: 'Text-3', style: { color: color, fontSize: 9, opacity: 0.8 } }, label)
      ),
      React.createElement(View, { testID: 'View-8', style: { position: 'absolute', bottom: 4, right: padH } },
        React.createElement(Text, { testID: 'Text-4', style: { color: textSecondary, fontSize: 9 } }, data.length + '/60')
      )
    );
  };
  // @end:LineGraph

  // @section:RGBSlider @depends:[theme]
  var RGBSlider = function(props) {
    var label = props.label || 'R';
    var value = props.value || 0;
    var onValueChange = props.onValueChange;
    var trackColor = props.trackColor || '#FF0000';
    var connected = props.connected || false;
    var sliderWidth = screenWidth - 80;

    var handlePress = function(e) {
      if (!connected) return;
      var locationX = e.nativeEvent.locationX;
      var ratio = Math.max(0, Math.min(1, locationX / sliderWidth));
      var newVal = Math.round(ratio * 255);
      if (onValueChange) onValueChange(newVal);
    };

    var fillWidth = Math.max(0, Math.min(sliderWidth, (value / 255) * sliderWidth));
    var thumbLeft = Math.max(0, Math.min(sliderWidth - 20, (value / 255) * sliderWidth - 10));

    return React.createElement(View, { testID: 'View-9', style: { marginBottom: 16 } },
      React.createElement(View, { testID: 'View-10', style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 } },
        React.createElement(Text, { testID: 'Text-5', style: { color: textPrimary, fontSize: 13, fontWeight: '600' } }, label),
        React.createElement(Text, { testID: 'Text-6', style: { color: trackColor, fontSize: 13, fontWeight: 'bold' } }, String(value))
      ),
      React.createElement(TouchableOpacity, { testID: 'TouchableOpacity-1', onPress: handlePress,
        activeOpacity: 1,
        disabled: !connected,
        style: { height: 36, justifyContent: 'center' },
        componentId: 'slider-' + label.toLowerCase()
      },
        React.createElement(View, { testID: 'View-11', style: { height: 6, backgroundColor: '#1E3A4A', borderRadius: 3, width: sliderWidth, overflow: 'hidden' } },
          React.createElement(View, { testID: 'View-12', style: { height: 6, width: fillWidth, backgroundColor: trackColor, borderRadius: 3 } })
        ),
        React.createElement(View, { testID: 'View-13', style: {
            position: 'absolute',
            left: thumbLeft,
            top: 8,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: trackColor,
            borderWidth: 2,
            borderColor: '#FFFFFF',
            opacity: connected ? 1 : 0.4
          }
        })
      )
    );
  };
  // @end:RGBSlider

  // @section:StatusBadge @depends:[theme]
  var StatusBadge = function(props) {
    var status = props.status || 'disconnected';
    var config = {
      disconnected: { color: errorColor, text: 'Desconectado', icon: 'bluetooth-outline' },
      scanning: { color: warningColor, text: 'Buscando...', icon: 'search' },
      found: { color: accentColor, text: 'Encontrado! Toque em Conectar', icon: 'bluetooth' },
      connecting: { color: primaryColor, text: 'Conectando...', icon: 'sync' },
      connected: { color: successColor, text: 'Conectado', icon: 'bluetooth' }
    };
    var cfg = config[status] || config.disconnected;
    return React.createElement(View, { testID: 'View-14', style: { flexDirection: 'row', alignItems: 'center', backgroundColor: cfg.color + '22', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: cfg.color + '55' },
      componentId: 'status-badge'
    },
      React.createElement(View, { testID: 'View-15', style: { width: 10, height: 10, borderRadius: 5, backgroundColor: cfg.color, marginRight: 10 } }),
      status === 'scanning' || status === 'connecting'
        ? React.createElement(ActivityIndicator, { testID: 'ActivityIndicator-1', size: 'small', color: cfg.color, style: { marginRight: 8 } })
        : null,
      React.createElement(Text, { testID: 'Text-7', style: { color: cfg.color, fontSize: 14, fontWeight: '700' } }, cfg.text)
    );
  };
  // @end:StatusBadge

  // @section:ConnectionScreen @depends:[BLEContext,StatusBadge,styles]
  var ConnectionScreen = function(props) {
    var ble = useBLE();
    var themeCtx = useTheme();
    var theme = themeCtx.theme;
    var insets = useSafeAreaInsets();
    var scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING);

    var isConnected = ble.connStatus === 'connected';
    var isScanning = ble.connStatus === 'scanning';
    var isConnecting = ble.connStatus === 'connecting';
    var canConnect = ble.connStatus === 'found';
    var canScan = !isConnected && !isScanning && !isConnecting;

    var rgbPreview = 'rgb(' + (ble.ctrlState.rgbRed || 0) + ',' + (ble.ctrlState.rgbGreen || 0) + ',' + (ble.ctrlState.rgbBlue || 0) + ')';

    return React.createElement(ScrollView, { testID: 'ScrollView-1', style: { flex: 1, backgroundColor: theme.colors.background },
      contentContainerStyle: { paddingTop: insets.top + 16, paddingBottom: scrollBottomPadding, paddingHorizontal: 20 }
    },
      React.createElement(View, { testID: 'View-16', style: { alignItems: 'center', marginBottom: 28 }, componentId: 'conn-header' },
        React.createElement(View, { testID: 'View-17', style: { width: 80, height: 80, borderRadius: 40, backgroundColor: isConnected ? (successColor + '22') : (primaryColor + '22'), justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, borderColor: isConnected ? successColor : primaryColor } },
          React.createElement(Ionicons, { testID: 'Ionicons-1', name: isConnected ? 'bluetooth' : 'bluetooth-outline', size: 36, color: isConnected ? successColor : primaryColor })
        ),
        React.createElement(Text, { testID: 'Text-8', style: { color: theme.colors.textPrimary, fontSize: 22, fontWeight: 'bold', marginBottom: 4 }, componentId: 'conn-title' }, 'Monitor BLE'),
        React.createElement(Text, { testID: 'Text-9', style: { color: theme.colors.textSecondary, fontSize: 13 } }, 'Dispositivo: ' + TARGET_DEVICE_NAME)
      ),

      React.createElement(View, { testID: 'View-18', style: { alignItems: 'center', marginBottom: 28 }, componentId: 'status-section' },
        React.createElement(StatusBadge, { testID: 'StatusBadge-1', status: ble.connStatus })
      ),

      React.createElement(TouchableOpacity, { testID: 'TouchableOpacity-2', onPress: ble.doScan,
        disabled: !canScan,
        style: [styles.btnPrimary, { opacity: canScan ? 1 : 0.4, marginBottom: 14 }],
        componentId: 'btn-scan'
      },
        React.createElement(Ionicons, { testID: 'Ionicons-2', name: 'search', size: 20, color: '#FFF', style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-10', style: styles.btnPrimaryText }, 'Buscar Dispositivo')
      ),

      React.createElement(TouchableOpacity, { testID: 'TouchableOpacity-3', onPress: ble.doConnect,
        disabled: !canConnect,
        style: [styles.btnAccent, { opacity: canConnect ? 1 : 0.35, marginBottom: 14 }],
        componentId: 'btn-connect'
      },
        React.createElement(Ionicons, { testID: 'Ionicons-3', name: 'link', size: 20, color: '#FFF', style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-11', style: styles.btnPrimaryText }, 'Conectar')
      ),

      isConnected ? React.createElement(TouchableOpacity, { testID: 'TouchableOpacity-4', onPress: ble.doDisconnect,
        style: [styles.btnDanger, { marginBottom: 14 }],
        componentId: 'btn-disconnect'
      },
        React.createElement(Ionicons, { testID: 'Ionicons-4', name: 'close-circle', size: 20, color: '#FFF', style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-12', style: styles.btnPrimaryText }, 'Desconectar')
      ) : null,

      isConnected ? React.createElement(View, { testID: 'View-19', style: [styles.card, { marginTop: 8 }], componentId: 'conn-info-card' },
        React.createElement(Text, { testID: 'Text-13', style: styles.cardTitle }, 'Informações da Conexão'),
        React.createElement(View, { testID: 'View-20', style: styles.infoRow },
          React.createElement(Text, { testID: 'Text-14', style: styles.infoLabel }, 'Dispositivo'),
          React.createElement(Text, { testID: 'Text-15', style: styles.infoValue }, ble.savedSettings.lastDeviceName || TARGET_DEVICE_NAME)
        ),
        React.createElement(View, { testID: 'View-21', style: styles.infoRow },
          React.createElement(Text, { testID: 'Text-16', style: styles.infoLabel }, 'MAC Address'),
          React.createElement(Text, { testID: 'Text-17', style: [styles.infoValue, { fontSize: 11 }] }, ble.savedSettings.lastDeviceMac || '—')
        ),
        React.createElement(View, { testID: 'View-22', style: styles.infoRow },
          React.createElement(Text, { testID: 'Text-18', style: styles.infoLabel }, 'RSSI'),
          React.createElement(Text, { testID: 'Text-19', style: [styles.infoValue, { color: ble.rssiValue && ble.rssiValue > -70 ? successColor : warningColor }] }, ble.rssiValue !== null ? (String(ble.rssiValue) + ' dBm') : '—')
        ),
        React.createElement(View, { testID: 'View-23', style: [styles.infoRow, { borderBottomWidth: 0 }] },
          React.createElement(Text, { testID: 'Text-20', style: styles.infoLabel }, 'Cor RGB'),
          React.createElement(View, { testID: 'View-24', style: { width: 24, height: 24, borderRadius: 12, backgroundColor: rgbPreview, borderWidth: 1, borderColor: '#FFFFFF33' } })
        )
      ) : null,

      ble.savedSettings.lastDeviceMac && !isConnected && !isScanning && !isConnecting ? React.createElement(View, { testID: 'View-25', style: [styles.card, { marginTop: 8 }], componentId: 'last-device-card' },
        React.createElement(Text, { testID: 'Text-21', style: [styles.cardTitle, { fontSize: 12, color: textSecondary }] }, 'Último Dispositivo'),
        React.createElement(Text, { testID: 'Text-22', style: { color: textPrimary, fontSize: 13 } }, ble.savedSettings.lastDeviceName || TARGET_DEVICE_NAME),
        React.createElement(Text, { testID: 'Text-23', style: { color: textSecondary, fontSize: 11, marginTop: 2 } }, ble.savedSettings.lastDeviceMac)
      ) : null
    );
  };
  // @end:ConnectionScreen

  // @section:MonitoringScreen @depends:[BLEContext,LineGraph,minmax-utils,styles]
  var MonitoringScreen = function(props) {
    var ble = useBLE();
    var themeCtx = useTheme();
    var theme = themeCtx.theme;
    var insets = useSafeAreaInsets();
    var scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING);
    var graphWidth = screenWidth - 48;
    var isConnected = ble.connStatus === 'connected';

    var minMaxData = useMemo(function() {
      return calculateHistoricalMinMax(ble.tempHist, ble.humHist);
    }, [ble.tempHist, ble.humHist]);

    var tempGraphLabel = ble.tempScale === 'F' ? 'Temperatura (°F)' : 'Temperatura (°C)';

    return React.createElement(ScrollView, { testID: 'ScrollView-2', style: { flex: 1, backgroundColor: theme.colors.background },
      contentContainerStyle: { paddingTop: insets.top + 12, paddingBottom: scrollBottomPadding, paddingHorizontal: 20 }
    },
      React.createElement(View, { testID: 'View-26', style: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 }, componentId: 'monitor-header' },
        React.createElement(Ionicons, { testID: 'Ionicons-5', name: 'analytics', size: 22, color: primaryColor, style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-24', style: { color: textPrimary, fontSize: 18, fontWeight: 'bold' } }, 'Monitoramento Ambiental')
      ),

      React.createElement(View, { testID: 'View-27', style: styles.metricsRow, componentId: 'metrics-row' },
        React.createElement(View, { testID: 'View-28', style: [styles.metricCard, { borderColor: '#FF4757' + '55' }] },
          React.createElement(Ionicons, { testID: 'Ionicons-6', name: 'thermometer', size: 20, color: '#FF4757', style: { marginBottom: 4 } }),
          React.createElement(Text, { testID: 'Text-25', style: [styles.metricValue, { color: '#FF4757' }] }, isConnected ? ble.tempC.toFixed(1) : '—'),
          React.createElement(Text, { testID: 'Text-26', style: styles.metricUnit }, '°C')
        ),
        React.createElement(View, { testID: 'View-29', style: [styles.metricCard, { borderColor: '#FF6B35' + '55' }] },
          React.createElement(Ionicons, { testID: 'Ionicons-7', name: 'thermometer-outline', size: 20, color: '#FF6B35', style: { marginBottom: 4 } }),
          React.createElement(Text, { testID: 'Text-27', style: [styles.metricValue, { color: '#FF6B35' }] }, isConnected ? ble.tempF.toFixed(1) : '—'),
          React.createElement(Text, { testID: 'Text-28', style: styles.metricUnit }, '°F')
        ),
        React.createElement(View, { testID: 'View-30', style: [styles.metricCard, { borderColor: primaryColor + '55' }] },
          React.createElement(Ionicons, { testID: 'Ionicons-8', name: 'water', size: 20, color: primaryColor, style: { marginBottom: 4 } }),
          React.createElement(Text, { testID: 'Text-29', style: [styles.metricValue, { color: primaryColor }] }, isConnected ? ble.humidity.toFixed(1) : '—'),
          React.createElement(Text, { testID: 'Text-30', style: styles.metricUnit }, '%')
        )
      ),

      React.createElement(View, { testID: 'View-27b', style: [styles.card, { marginBottom: 16 }], componentId: 'minmax-card' },
        React.createElement(Text, { testID: 'Text-24b', style: [styles.cardTitle, { marginBottom: 12 }] }, 'Mín/Máx do Histórico'),
        React.createElement(View, { testID: 'View-27c', style: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 } },
          React.createElement(View, { testID: 'View-27d' },
            React.createElement(Text, { testID: 'Text-24c', style: [styles.infoLabel, { marginBottom: 4 }] }, 'Temperatura °C'),
            React.createElement(Text, { testID: 'Text-24d', style: [styles.infoValue, { color: '#FF4757', fontSize: 12 }] }, 'Mín: ' + minMaxData.tempMinCDisplay),
            React.createElement(Text, { testID: 'Text-24e', style: [styles.infoValue, { color: '#FF4757', fontSize: 12 }] }, 'Máx: ' + minMaxData.tempMaxCDisplay)
          ),
          React.createElement(View, { testID: 'View-27e' },
            React.createElement(Text, { testID: 'Text-24f', style: [styles.infoLabel, { marginBottom: 4 }] }, 'Temperatura °F'),
            React.createElement(Text, { testID: 'Text-24g', style: [styles.infoValue, { color: '#FF6B35', fontSize: 12 }] }, 'Mín: ' + minMaxData.tempMinFDisplay),
            React.createElement(Text, { testID: 'Text-24h', style: [styles.infoValue, { color: '#FF6B35', fontSize: 12 }] }, 'Máx: ' + minMaxData.tempMaxFDisplay)
          ),
          React.createElement(View, { testID: 'View-27f' },
            React.createElement(Text, { testID: 'Text-24i', style: [styles.infoLabel, { marginBottom: 4 }] }, 'Umidade'),
            React.createElement(Text, { testID: 'Text-24j', style: [styles.infoValue, { color: primaryColor, fontSize: 12 }] }, 'Mín: ' + minMaxData.umidMinDisplay),
            React.createElement(Text, { testID: 'Text-24k', style: [styles.infoValue, { color: primaryColor, fontSize: 12 }] }, 'Máx: ' + minMaxData.umidMaxDisplay)
          )
        ),
        React.createElement(TouchableOpacity, { testID: 'TouchableOpacity-reset', onPress: ble.writeReset,
          disabled: !isConnected,
          style: [styles.btnWarning, { marginTop: 12, opacity: isConnected ? 1 : 0.4 }],
          componentId: 'btn-reset'
        },
          React.createElement(Ionicons, { testID: 'Ionicons-reset', name: 'refresh-circle', size: 20, color: '#FFF', style: { marginRight: 8 } }),
          React.createElement(Text, { testID: 'Text-reset', style: styles.btnPrimaryText }, 'Resetar Min/Máx')
        )
      ),

      React.createElement(View, { testID: 'View-31', style: [styles.card, { marginBottom: 16 }], componentId: 'temp-graph-card' },
        React.createElement(View, { testID: 'View-32', style: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 } },
          React.createElement(View, { testID: 'View-33', style: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FF4757', marginRight: 8 } }),
          React.createElement(Text, { testID: 'Text-31', style: styles.cardTitle }, tempGraphLabel)
        ),
        React.createElement(LineGraph, { testID: 'LineGraph-1', data: ble.tempHist, color: '#FF4757', graphWidth: graphWidth, label: 'Temp ' + ble.tempScale })
      ),

      React.createElement(View, { testID: 'View-34', style: [styles.card, { marginBottom: 16 }], componentId: 'hum-graph-card' },
        React.createElement(View, { testID: 'View-35', style: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 } },
          React.createElement(View, { testID: 'View-36', style: { width: 12, height: 12, borderRadius: 6, backgroundColor: primaryColor, marginRight: 8 } }),
          React.createElement(Text, { testID: 'Text-32', style: styles.cardTitle }, 'Umidade (%)')
        ),
        React.createElement(LineGraph, { testID: 'LineGraph-2', data: ble.humHist, color: primaryColor, graphWidth: graphWidth, label: 'Umidade %' })
      ),

      React.createElement(View, { testID: 'View-37', style: [styles.card], componentId: 'history-stats-card' },
        React.createElement(Text, { testID: 'Text-33', style: styles.cardTitle }, 'Estatísticas do Histórico'),
        React.createElement(View, { testID: 'View-38', style: styles.infoRow },
          React.createElement(Text, { testID: 'Text-34', style: styles.infoLabel }, 'Min Temp'),
          React.createElement(Text, { testID: 'Text-35', style: [styles.infoValue, { color: '#FF4757' }] }, minMaxData.tempHistMin !== null ? minMaxData.tempHistMin.toFixed(1) + ' °' + ble.tempScale : '—')
        ),
        React.createElement(View, { testID: 'View-39', style: styles.infoRow },
          React.createElement(Text, { testID: 'Text-36', style: styles.infoLabel }, 'Max Temp'),
          React.createElement(Text, { testID: 'Text-37', style: [styles.infoValue, { color: '#FF4757' }] }, minMaxData.tempHistMax !== null ? minMaxData.tempHistMax.toFixed(1) + ' °' + ble.tempScale : '—')
        ),
        React.createElement(View, { testID: 'View-40', style: styles.infoRow },
          React.createElement(Text, { testID: 'Text-38', style: styles.infoLabel }, 'Min Umidade'),
          React.createElement(Text, { testID: 'Text-39', style: [styles.infoValue, { color: primaryColor }] }, minMaxData.humHistMin !== null ? minMaxData.humHistMin.toFixed(1) + ' %' : '—')
        ),
        React.createElement(View, { testID: 'View-41', style: [styles.infoRow, { borderBottomWidth: 0 }] },
          React.createElement(Text, { testID: 'Text-40', style: styles.infoLabel }, 'Max Umidade'),
          React.createElement(Text, { testID: 'Text-41', style: [styles.infoValue, { color: primaryColor }] }, minMaxData.humHistMax !== null ? minMaxData.humHistMax.toFixed(1) + ' %' : '—')
        )
      ),

      !isConnected ? React.createElement(View, { testID: 'View-42', style: [styles.alertBanner, { marginTop: 12 }], componentId: 'disconnected-banner' },
        React.createElement(Ionicons, { testID: 'Ionicons-9', name: 'warning', size: 16, color: warningColor, style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-42', style: { color: warningColor, fontSize: 12 } }, 'Conecte ao ESP32 para monitorar dados em tempo real')
      ) : null
    );
  };
  // @end:MonitoringScreen

  // @section:ControlScreen @depends:[BLEContext,RGBSlider,styles]
  var ControlScreen = function(props) {
    var ble = useBLE();
    var themeCtx = useTheme();
    var theme = themeCtx.theme;
    var insets = useSafeAreaInsets();
    var scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING);
    var isConnected = ble.connStatus === 'connected';
    var led1 = ble.ctrlState.led1 || false;
    var led2 = ble.ctrlState.led2 || false;
    var rgbRed = ble.ctrlState.rgbRed || 0;
    var rgbGreen = ble.ctrlState.rgbGreen || 0;
    var rgbBlue = ble.ctrlState.rgbBlue || 0;

    var rgbPreviewColor = 'rgb(' + rgbRed + ',' + rgbGreen + ',' + rgbBlue + ')';

    return React.createElement(ScrollView, { testID: 'ScrollView-3', style: { flex: 1, backgroundColor: theme.colors.background },
      contentContainerStyle: { paddingTop: insets.top + 12, paddingBottom: scrollBottomPadding, paddingHorizontal: 20 }
    },
      React.createElement(View, { testID: 'View-43', style: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 }, componentId: 'ctrl-header' },
        React.createElement(Ionicons, { testID: 'Ionicons-10', name: 'options', size: 22, color: primaryColor, style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-43', style: { color: textPrimary, fontSize: 18, fontWeight: 'bold' } }, 'Controle de Atuadores')
      ),

      !isConnected ? React.createElement(View, { testID: 'View-44', style: [styles.alertBanner, { marginBottom: 16 }], componentId: 'ctrl-disconnected-banner' },
        React.createElement(Ionicons, { testID: 'Ionicons-11', name: 'warning', size: 16, color: warningColor, style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-44', style: { color: warningColor, fontSize: 12 } }, 'Conecte ao ESP32 para controlar os atuadores')
      ) : null,

      React.createElement(View, { testID: 'View-45', style: [styles.card, { marginBottom: 16 }], componentId: 'led-card' },
        React.createElement(View, { testID: 'View-46', style: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 } },
          React.createElement(Ionicons, { testID: 'Ionicons-12', name: 'bulb', size: 18, color: accentColor, style: { marginRight: 8 } }),
          React.createElement(Text, { testID: 'Text-45', style: styles.cardTitle }, 'LEDs Simples')
        ),
        React.createElement(View, { testID: 'View-47', style: styles.switchRow, componentId: 'led1-row' },
          React.createElement(View, { testID: 'View-48', style: { flexDirection: 'row', alignItems: 'center' } },
            React.createElement(View, { testID: 'View-49', style: { width: 14, height: 14, borderRadius: 7, backgroundColor: led1 ? '#FF4757' : '#1E3A4A', marginRight: 10, borderWidth: 1, borderColor: '#FF4757' } }),
            React.createElement(Text, { testID: 'Text-46', style: { color: textPrimary, fontSize: 14, fontWeight: '600' } }, 'LED 1 (Vermelho)')
          ),
          React.createElement(Switch, { testID: 'Switch-1', value: led1,
            onValueChange: ble.setLed1,
            disabled: !isConnected,
            trackColor: { false: '#1E3A4A', true: '#FF475788' },
            thumbColor: led1 ? '#FF4757' : '#4A6A7A',
            componentId: 'switch-led1'
          })
        ),
        React.createElement(View, { testID: 'View-50', style: { height: 1, backgroundColor: '#1E3A4A', marginVertical: 10 } }),
        React.createElement(View, { testID: 'View-51', style: styles.switchRow, componentId: 'led2-row' },
          React.createElement(View, { testID: 'View-52', style: { flexDirection: 'row', alignItems: 'center' } },
            React.createElement(View, { testID: 'View-53', style: { width: 14, height: 14, borderRadius: 7, backgroundColor: led2 ? successColor : '#1E3A4A', marginRight: 10, borderWidth: 1, borderColor: successColor } }),
            React.createElement(Text, { testID: 'Text-47', style: { color: textPrimary, fontSize: 14, fontWeight: '600' } }, 'LED 2 (Verde)')
          ),
          React.createElement(Switch, { testID: 'Switch-2', value: led2,
            onValueChange: ble.setLed2,
            disabled: !isConnected,
            trackColor: { false: '#1E3A4A', true: successColor + '88' },
            thumbColor: led2 ? successColor : '#4A6A7A',
            componentId: 'switch-led2'
          })
        )
      ),

      React.createElement(View, { testID: 'View-54', style: [styles.card, { marginBottom: 16 }], componentId: 'rgb-card' },
        React.createElement(View, { testID: 'View-55', style: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 } },
          React.createElement(View, { testID: 'View-56', style: { flexDirection: 'row', alignItems: 'center' } },
            React.createElement(Ionicons, { testID: 'Ionicons-13', name: 'color-palette', size: 18, color: accentColor, style: { marginRight: 8 } }),
            React.createElement(Text, { testID: 'Text-48', style: styles.cardTitle }, 'LED RGB')
          ),
          React.createElement(View, { testID: 'View-57', style: { width: 36, height: 36, borderRadius: 18, backgroundColor: rgbPreviewColor, borderWidth: 2, borderColor: '#FFFFFF22', shadowColor: rgbPreviewColor, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 } })
        ),
        React.createElement(RGBSlider, { testID: 'RGBSlider-1', label: 'Vermelho (R)', value: rgbRed, onValueChange: ble.setRgbRed, trackColor: '#FF4757', connected: isConnected }),
        React.createElement(RGBSlider, { testID: 'RGBSlider-2', label: 'Verde (G)', value: rgbGreen, onValueChange: ble.setRgbGreen, trackColor: '#27C96A', connected: isConnected }),
        React.createElement(RGBSlider, { testID: 'RGBSlider-3', label: 'Azul (B)', value: rgbBlue, onValueChange: ble.setRgbBlue, trackColor: '#2E86AB', connected: isConnected }),
        React.createElement(View, { testID: 'View-58', style: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 12 } },
          React.createElement(Text, { testID: 'Text-49', style: { color: textSecondary, fontSize: 11 } }, 'R:' + rgbRed + '  G:' + rgbGreen + '  B:' + rgbBlue),
          React.createElement(Text, { testID: 'Text-50', style: { color: textSecondary, fontSize: 11 } }, '#' +
            (rgbRed < 16 ? '0' : '') + rgbRed.toString(16).toUpperCase() +
            (rgbGreen < 16 ? '0' : '') + rgbGreen.toString(16).toUpperCase() +
            (rgbBlue < 16 ? '0' : '') + rgbBlue.toString(16).toUpperCase()
          )
        ),
        React.createElement(TouchableOpacity, { testID: 'TouchableOpacity-6', onPress: ble.turnOffRGB,
          disabled: !isConnected,
          style: [styles.btnDanger, { opacity: isConnected ? 1 : 0.4 }],
          componentId: 'btn-turnoff-rgb'
        },
          React.createElement(Ionicons, { testID: 'Ionicons-15', name: 'power', size: 18, color: '#FFF', style: { marginRight: 8 } }),
          React.createElement(Text, { testID: 'Text-52', style: styles.btnPrimaryText }, 'Desligar RGB')
        )
      )
    );
  };
  // @end:ControlScreen

  // @section:SignalScreen @depends:[BLEContext,styles]
  var SignalScreen = function(props) {
    var ble = useBLE();
    var themeCtx = useTheme();
    var theme = themeCtx.theme;
    var insets = useSafeAreaInsets();
    var scrollBottomPadding = Platform.OS === 'web' ? WEB_TAB_MENU_PADDING : (TAB_MENU_HEIGHT + insets.bottom + SCROLL_EXTRA_PADDING);
    var isConnected = ble.connStatus === 'connected';
    var rssi = ble.rssiValue;

    var signalQuality = 'Desconhecido';
    var signalColor = textSecondary;
    var signalBars = 0;
    if (rssi !== null) {
      if (rssi > -60) { signalQuality = 'Excelente'; signalColor = successColor; signalBars = 4; }
      else if (rssi > -70) { signalQuality = 'Bom'; signalColor = '#4CAF50'; signalBars = 3; }
      else if (rssi > -80) { signalQuality = 'Razoável'; signalColor = warningColor; signalBars = 2; }
      else { signalQuality = 'Fraco'; signalColor = errorColor; signalBars = 1; }
    }

    return React.createElement(ScrollView, { testID: 'ScrollView-4', style: { flex: 1, backgroundColor: theme.colors.background },
      contentContainerStyle: { paddingTop: insets.top + 12, paddingBottom: scrollBottomPadding, paddingHorizontal: 20 }
    },
      React.createElement(View, { testID: 'View-59', style: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 }, componentId: 'signal-header' },
        React.createElement(Ionicons, { testID: 'Ionicons-15', name: 'cellular', size: 22, color: primaryColor, style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-52', style: { color: textPrimary, fontSize: 18, fontWeight: 'bold' } }, 'Sinal Bluetooth')
      ),

      React.createElement(View, { testID: 'View-60', style: [styles.card, { alignItems: 'center', paddingVertical: 32, marginBottom: 16 }], componentId: 'rssi-main-card' },
        React.createElement(View, { testID: 'View-61', style: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', height: 60, marginBottom: 20 } },
          [1, 2, 3, 4].map(function(barIndex) {
            var barHeight = barIndex * 14 + 4;
            var isActive = barIndex <= signalBars;
            return React.createElement(View, { testID: 'View-62', key: 'bar' + barIndex,
              style: {
                width: 18,
                height: barHeight,
                borderRadius: 4,
                backgroundColor: isActive ? signalColor : '#1E3A4A',
                marginHorizontal: 4,
                alignSelf: 'flex-end'
              }
            });
          })
        ),

        React.createElement(Text, { testID: 'Text-53', style: { color: rssi !== null ? signalColor : textSecondary, fontSize: 48, fontWeight: 'bold', marginBottom: 4 }, componentId: 'rssi-value' },
          rssi !== null ? String(rssi) : '—'
        ),
        React.createElement(Text, { testID: 'Text-54', style: { color: textSecondary, fontSize: 16, marginBottom: 12 } }, rssi !== null ? 'dBm' : 'Sem dados'),
        React.createElement(View, { testID: 'View-63', style: { backgroundColor: signalColor + '22', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderColor: signalColor + '55' } },
          React.createElement(Text, { testID: 'Text-55', style: { color: signalColor, fontSize: 15, fontWeight: '700' } }, signalQuality)
        )
      ),

      React.createElement(View, { testID: 'View-64', style: [styles.card, { marginBottom: 16 }], componentId: 'rssi-scale-card' },
        React.createElement(Text, { testID: 'Text-56', style: [styles.cardTitle, { marginBottom: 12 }] }, 'Escala de Qualidade de Sinal'),
        [
          { range: '>  -60 dBm', label: 'Excelente', color: successColor },
          { range: '-70 a -60 dBm', label: 'Bom', color: '#4CAF50' },
          { range: '-80 a -70 dBm', label: 'Razoável', color: warningColor },
          { range: '<  -80 dBm', label: 'Fraco', color: errorColor }
        ].map(function(item, idx) {
          return React.createElement(View, { testID: 'View-65', key: 'scale' + idx, style: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: idx < 3 ? 1 : 0, borderBottomColor: '#1E3A4A' } },
            React.createElement(View, { testID: 'View-66', style: { flexDirection: 'row', alignItems: 'center' } },
              React.createElement(View, { testID: 'View-67', style: { width: 10, height: 10, borderRadius: 5, backgroundColor: item.color, marginRight: 10 } }),
              React.createElement(Text, { testID: 'Text-57', style: { color: textSecondary, fontSize: 12 } }, item.range)
            ),
            React.createElement(Text, { testID: 'Text-58', style: { color: item.color, fontWeight: '600', fontSize: 12 } }, item.label)
          );
        })
      ),

      React.createElement(View, { testID: 'View-68', style: [styles.card, { marginBottom: 16 }], componentId: 'notif-card' },
        React.createElement(View, { testID: 'View-69', style: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 } },
          React.createElement(Ionicons, { testID: 'Ionicons-16', name: 'notifications', size: 18, color: primaryColor, style: { marginRight: 8 } }),
          React.createElement(Text, { testID: 'Text-59', style: styles.cardTitle }, 'Notificações')
        ),
        React.createElement(View, { testID: 'View-70', style: styles.infoRow },
          React.createElement(Text, { testID: 'Text-60', style: styles.infoLabel }, 'Contagem (último min.)'),
          React.createElement(Text, { testID: 'Text-61', style: [styles.infoValue, { color: primaryColor, fontSize: 20, fontWeight: 'bold' }] }, ble.notifCount !== null ? String(ble.notifCount) : '—')
        ),
        React.createElement(View, { testID: 'View-71', style: [styles.infoRow, { borderBottomWidth: 0 }] },
          React.createElement(Text, { testID: 'Text-62', style: styles.infoLabel }, 'Status leitura'),
          React.createElement(Text, { testID: 'Text-63', style: { color: isConnected ? successColor : textSecondary, fontSize: 13 } }, isConnected ? 'Ativo (a cada 60s)' : 'Inativo')
        )
      ),

      React.createElement(View, { testID: 'View-72', style: [styles.card], componentId: 'conn-summary-card' },
        React.createElement(Text, { testID: 'Text-64', style: [styles.cardTitle, { marginBottom: 10 }] }, 'Status da Conexão'),
        React.createElement(View, { testID: 'View-73', style: styles.infoRow },
          React.createElement(Text, { testID: 'Text-65', style: styles.infoLabel }, 'Estado'),
          React.createElement(Text, { testID: 'Text-66', style: { color: isConnected ? successColor : errorColor, fontWeight: '700', fontSize: 13 } }, isConnected ? 'Conectado' : 'Desconectado')
        ),
        React.createElement(View, { testID: 'View-74', style: [styles.infoRow, { borderBottomWidth: 0 }] },
          React.createElement(Text, { testID: 'Text-67', style: styles.infoLabel }, 'Dispositivo'),
          React.createElement(Text, { testID: 'Text-68', style: styles.infoValue }, ble.savedSettings.lastDeviceName || TARGET_DEVICE_NAME)
        )
      ),

      !isConnected ? React.createElement(View, { testID: 'View-75', style: [styles.alertBanner, { marginTop: 12 }], componentId: 'signal-disconnected-banner' },
        React.createElement(Ionicons, { testID: 'Ionicons-17', name: 'warning', size: 16, color: warningColor, style: { marginRight: 8 } }),
        React.createElement(Text, { testID: 'Text-69', style: { color: warningColor, fontSize: 12 } }, 'Conecte ao ESP32 para monitorar o sinal')
      ) : null
    );
  };
  // @end:SignalScreen

  // @section:TabNavigator @depends:[ConnectionScreen,MonitoringScreen,ControlScreen,SignalScreen,navigation-setup]
  var TabNavigator = function() {
    var insets = useSafeAreaInsets();
    var ble = useBLE();
    var isConnected = ble.connStatus === 'connected';

    return React.createElement(View, { testID: 'View-76', style: { flex: 1, width: '100%', height: '100%', overflow: 'hidden' } },
      React.createElement(Tab.Navigator, { testID: 'Navigator-1', screenOptions: {
          headerShown: false,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            height: Platform.OS === 'web' ? TAB_MENU_HEIGHT : TAB_MENU_HEIGHT + insets.bottom,
            paddingBottom: 0,
            borderTopWidth: 1,
            borderTopColor: '#1E3A4A',
            backgroundColor: '#0D1E2C'
          },
          tabBarItemStyle: { padding: 0 },
          tabBarActiveTintColor: primaryColor,
          tabBarInactiveTintColor: '#4A6A7A'
        }
      },
        React.createElement(Tab.Screen, { testID: 'Screen-1', name: 'Conexão',
          component: ConnectionScreen,
          options: {
            tabBarIcon: function(p) { return React.createElement(View, { testID: 'View-77' }, React.createElement(Ionicons, { testID: 'Ionicons-18', name: 'bluetooth', size: 22, color: p.color }), isConnected ? React.createElement(View, { testID: 'View-78', style: { position: 'absolute', top: -2, right: -4, width: 8, height: 8, borderRadius: 4, backgroundColor: successColor, borderWidth: 1, borderColor: '#0D1E2C' } }) : null); }
          }
        }),
        React.createElement(Tab.Screen, { testID: 'Screen-2', name: 'Monitor',
          component: MonitoringScreen,
          options: {
            tabBarIcon: function(p) { return React.createElement(Ionicons, { testID: 'Ionicons-19', name: 'analytics', size: 22, color: p.color }); }
          }
        }),
        React.createElement(Tab.Screen, { testID: 'Screen-3', name: 'Controle',
          component: ControlScreen,
          options: {
            tabBarIcon: function(p) { return React.createElement(Ionicons, { testID: 'Ionicons-20', name: 'options', size: 22, color: p.color }); }
          }
        }),
        React.createElement(Tab.Screen, { testID: 'Screen-4', name: 'Sinal',
          component: SignalScreen,
          options: {
            tabBarIcon: function(p) { return React.createElement(Ionicons, { testID: 'Ionicons-21', name: 'cellular', size: 22, color: p.color }); }
          }
        })
      )
    );
  };
  // @end:TabNavigator

  // @section:styles @depends:[theme]
  var styles = StyleSheet.create({
    card: {
      backgroundColor: cardColor,
      borderRadius: 14,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: '#1E3A4A'
    },
    cardTitle: {
      color: textPrimary,
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: 0.5
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#1E3A4A'
    },
    infoLabel: {
      color: textSecondary,
      fontSize: 13
    },
    infoValue: {
      color: textPrimary,
      fontSize: 13,
      fontWeight: '600'
    },
    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16
    },
    metricCard: {
      backgroundColor: cardColor,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      flex: 1,
      marginHorizontal: 4,
      borderWidth: 1
    },
    metricValue: {
      fontSize: 22,
      fontWeight: 'bold',
      marginBottom: 2
    },
    metricUnit: {
      color: textSecondary,
      fontSize: 11
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    btnPrimary: {
      backgroundColor: primaryColor,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    btnAccent: {
      backgroundColor: accentColor,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    btnDanger: {
      backgroundColor: errorColor,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    btnWarning: {
      backgroundColor: warningColor,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center'
    },
    btnPrimaryText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700'
    },
    alertBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: warningColor + '15',
      borderRadius: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: warningColor + '44'
    }
  });
  // @end:styles

  // @section:return @depends:[ThemeProvider,BLEProvider,TabNavigator]
  return React.createElement(ThemeProvider, { testID: 'ThemeProvider-1' },
    React.createElement(BLEProvider, { testID: 'BLEProvider-1' },
      React.createElement(View, { testID: 'View-79', style: { flex: 1, width: '100%', height: '100%', backgroundColor: backgroundColor } },
        React.createElement(StatusBar, { testID: 'StatusBar-1', barStyle: 'light-content', backgroundColor: backgroundColor }),
        React.createElement(TabNavigator)
      )
    )
  );
  // @end:return
};
return ComponentFunction;