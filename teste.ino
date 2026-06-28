// HENRIQUE EDUARDO SIMONATO - 2221101008
// Monitoramento de temperatura usando BLE e ESP32
// LINK WOKWI: https://wokwi.com/projects/465825704071605249

#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <DHT.h>

#include <NimBLEDevice.h>

// ================= PINOS =================

#define DHTPIN 18
#define DHTTYPE DHT22

#define LED_VERMELHO 25
#define LED_VERDE    14

#define BTN1 26
#define BTN2 27

#define SW1 34
#define SW2 35
#define SW3 32
#define SW4 33

#define RGB_R 17   // TX2
#define RGB_G 16   // RX2
#define RGB_B 4

// ================= BLE - NOME E SEGURANÇA =================

#define BLE_DEVICE_NAME   "HS-ESP32-BLE"
#define BLE_PASSKEY       123456   // senha estática de 6 digitos exigida na especificação

// ================= BLE - UUIDs =================
// Serviço 1: Monitoramento Ambiental (UUID padrão Bluetooth SIG - Environmental Sensing)
#define SERVICE_AMBIENTAL_UUID        "0000181A-0000-1000-8000-00805F9B34FB"
#define CHAR_DADOS_ATUAIS_UUID        "0000181B-0000-1000-8000-00805F9B34FB" // custom, dentro do serviço 0x181A
#define CHAR_GRAFICO_HIST_UUID        "0000181C-0000-1000-8000-00805F9B34FB" // custom, dentro do serviço 0x181A

// Serviço 2: Controle de Atuadores (UUID custom 128-bit)
#define SERVICE_ATUADORES_UUID        "5b1d1a00-0001-4a2e-9e2a-111111111111"
#define CHAR_LEDS_SIMPLES_UUID        "5b1d1a00-0002-4a2e-9e2a-111111111111"
#define CHAR_LED_RGB_UUID             "5b1d1a00-0003-4a2e-9e2a-111111111111"

// Serviço 3: Indicadores de Conexão (UUID custom 128-bit)
#define SERVICE_INDICADORES_UUID      "5b1d1a00-0011-4a2e-9e2a-222222222222"
#define CHAR_RSSI_UUID                "5b1d1a00-0012-4a2e-9e2a-222222222222"
#define CHAR_CONTADOR_NOTIF_UUID      "5b1d1a00-0013-4a2e-9e2a-222222222222"

// ================= LCD =================

LiquidCrystal_I2C lcd(0x27, 16, 2);

// ================= DHT =================

DHT dht(DHTPIN, DHTTYPE);

// ================= TELAS =================

enum TelaLCD {
  TELA_CELSIUS = 0,
  TELA_FAHRENHEIT,
  TELA_TEMP_HIST_C,   // histórico em °C
  TELA_TEMP_HIST_F,   // histórico em °F (nova tela)
  TELA_UMID_HIST,
  TELA_BLE
};

TelaLCD telaAtual = TELA_CELSIUS;

// ================= SENSOR =================

float tempAtual = 0;
float umidAtual = 0;

float tempMin = 999;
float tempMax = -999;

float umidMin = 999;
float umidMax = -999;

// ================= HISTÓRICO PARA O GRÁFICO (60 minutos) =================

#define HISTORICO_TAMANHO 60
float historicoTemp[HISTORICO_TAMANHO];
float historicoUmid[HISTORICO_TAMANHO];
int historicoIndice = 0;
int historicoContagem = 0;

unsigned long ultimoMinuto = 0;
const unsigned long INTERVALO_MINUTO = 60000; // 60s

// acumuladores para calcular a media de cada minuto
float somaTempMinuto = 0;
float somaUmidMinuto = 0;
int amostrasMinuto = 0;

// ================= BOTÕES =================

bool estadoBaseBTN1 = HIGH;
bool estadoBaseBTN2 = HIGH;
bool ultimoEstadoBTN1 = false;
bool ultimoEstadoBTN2 = false;

// Controle de clique longo do BTN1
unsigned long inicioPressionamentoBTN1 = 0;
bool BTN1Pressionado = false;
bool cliqueLongoRegistrado = false;
const unsigned long TEMPO_CLIQUE_LONGO = 3000; // 3 segundos

// Modo de exibição do LCD
bool modoAutomatico = false; // false = estático (padrão), true = automático
bool exibirMensagemModo = false;
unsigned long inicioMensagemModo = 0;
const unsigned long TEMPO_MENSAGEM_MODO = 1000;

// ================= LCD =================

unsigned long ultimoLCD = 0;
const unsigned long INTERVALO_LCD = 2500;

// ================= RGB =================

int valorR = 0;
int valorG = 0;
int valorB = 0;

// ================= LEDS SIMPLES =================
// Estado dos LEDs: pode ser controlado pelo APP ou localmente (switches), dependendo do SW1

bool led1Ligado = false; // LED Vermelho
bool led2Ligado = false; // LED Verde

// ================= BLE - ESTADO =================

String estadoBLE = "DESCON"; // DESCON / ANUNC / CONECT
int rssiBLE = 0;

NimBLEServer* pServer = nullptr;
NimBLECharacteristic* pCharDadosAtuais = nullptr;
NimBLECharacteristic* pCharGraficoHist = nullptr;
NimBLECharacteristic* pCharLedsSimples = nullptr;
NimBLECharacteristic* pCharLedRGB = nullptr;
NimBLECharacteristic* pCharRSSI = nullptr;
NimBLECharacteristic* pCharContadorNotif = nullptr;

uint16_t atualConnHandle = BLE_HS_CONN_HANDLE_NONE;
bool dispositivoConectado = false;

// contador de notificações por minuto (Serviço 3)
uint32_t contadorNotifAtual = 0;
uint32_t contadorNotifUltimoMinuto = 0;
unsigned long ultimoResetContador = 0;

unsigned long ultimaNotificacaoDados = 0;
const unsigned long INTERVALO_NOTIFICACAO = 1000; // 1s, conforme especificação

unsigned long ultimaNotificacaoRSSI = 0;
const unsigned long INTERVALO_RSSI = 1000; // 1s

void aplicarParametrosConexao();

// variaveis de sensor declaradas antes dos callbacks para o reset de min/max
extern float tempAtual, umidAtual;
extern float tempMin, tempMax, umidMin, umidMax;

// =====================================================
//                  CALLBACKS BLE
// =====================================================

class ServidorCallbacks : public NimBLEServerCallbacks {

  void onConnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo) override {
    dispositivoConectado = true;
    atualConnHandle = connInfo.getConnHandle();
    estadoBLE = "CONECT";
    Serial.println("Cliente conectado. Iniciando pareamento...");

    // Aplica parametros de conexao customizados (especificacao 4.1)
    aplicarParametrosConexao();

    // Forca pareamento com Passkey assim que o cliente conecta (especificacao 4.2)
    NimBLEDevice::startSecurity(atualConnHandle);
  }

  void onDisconnect(NimBLEServer* pServer, NimBLEConnInfo& connInfo, int reason) override {
    dispositivoConectado = false;
    atualConnHandle = BLE_HS_CONN_HANDLE_NONE;
    estadoBLE = "ANUNC";
    Serial.println("Cliente desconectado. Reiniciando anuncio...");
    NimBLEDevice::startAdvertising();
  }

  // Exibe o passkey no LCD e no Serial quando o celular solicitar
  uint32_t onPassKeyDisplay() override {
    Serial.print("Passkey: ");
    Serial.println(BLE_PASSKEY);

    // Exibe no LCD temporariamente
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("Senha BLE:");
    lcd.setCursor(0, 1);
    lcd.print(BLE_PASSKEY);

    return BLE_PASSKEY;
  }

  void onAuthenticationComplete(NimBLEConnInfo& connInfo) override {
    if (connInfo.isEncrypted()) {
      Serial.println("Autenticacao/pareamento concluido com sucesso.");
    } else {
      Serial.println("Falha na autenticacao (senha incorreta ou pareamento cancelado).");
    }
  }
};

// Callback para a characteristic de LEDs simples (Write do APP)
class LedsSimplesCallback : public NimBLECharacteristicCallbacks {

  void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override {

    bool sw1 = digitalRead(SW1); // SW1 = true -> controle local bloqueia o APP

    if (sw1) {
      // controle local ativo: ignora comando do APP
      Serial.println("Comando do APP ignorado (Switch 1 em modo local).");
      return;
    }

    std::string valor = pChar->getValue();

    if (valor.length() > 0) {
      uint8_t comando = (uint8_t)valor[0];

      // valor 255 = comando especial de reset de min/max (enviado pelo app)
      if (comando == 255) {
        tempMin = tempAtual;
        tempMax = tempAtual;
        umidMin = umidAtual;
        umidMax = umidAtual;
        Serial.println("Reset min/max recebido via APP.");
        return;
      }

      led1Ligado = comando & 0x01;       // bit 0 -> LED 1
      led2Ligado = (comando >> 1) & 0x01; // bit 1 -> LED 2

      Serial.print("LEDs via APP -> LED1: ");
      Serial.print(led1Ligado);
      Serial.print(" LED2: ");
      Serial.println(led2Ligado);
    }
  }
};

// Callback para a characteristic do LED RGB (Write Without Response do APP)
class LedRGBCallback : public NimBLECharacteristicCallbacks {

  void onWrite(NimBLECharacteristic* pChar, NimBLEConnInfo& connInfo) override {

    bool sw1 = digitalRead(SW1);

    if (sw1) {
      return;
    }

    std::string valor = pChar->getValue();

    if (valor.length() >= 3) {
      valorR = (uint8_t)valor[0];
      valorG = (uint8_t)valor[1];
      valorB = (uint8_t)valor[2];

      if (valorR == 0 && valorG == 0 && valorB == 0) {
        Serial.println("RGB desligado via APP.");
      }
    }
  }
};

ServidorCallbacks servidorCallbacks;
LedsSimplesCallback ledsSimplesCallback;
LedRGBCallback ledRGBCallback;

// =====================================================

void atualizarHistorico() {

  if (tempAtual < tempMin) tempMin = tempAtual;
  if (tempAtual > tempMax) tempMax = tempAtual;

  if (umidAtual < umidMin) umidMin = umidAtual;
  if (umidAtual > umidMax) umidMax = umidAtual;

  // acumula para a media do minuto (grafico historico)
  somaTempMinuto += tempAtual;
  somaUmidMinuto += umidAtual;
  amostrasMinuto++;
}


void registrarMediaMinuto() {

  if (amostrasMinuto == 0) return;

  float mediaTemp = somaTempMinuto / amostrasMinuto;
  float mediaUmid = somaUmidMinuto / amostrasMinuto;

  historicoTemp[historicoIndice] = mediaTemp;
  historicoUmid[historicoIndice] = mediaUmid;

  historicoIndice = (historicoIndice + 1) % HISTORICO_TAMANHO;

  if (historicoContagem < HISTORICO_TAMANHO) {
    historicoContagem++;
  }

  somaTempMinuto = 0;
  somaUmidMinuto = 0;
  amostrasMinuto = 0;
}

// =====================================================

void atualizarRGB() {

  bool sw1 = digitalRead(SW1);
  bool sw2 = digitalRead(SW2);
  bool sw3 = digitalRead(SW3);

  // SW1 = modo local

  if (sw1) {

    valorR = sw2 ? 255 : 0;
    valorG = sw3 ? 255 : 0;
    valorB = 0;
  }

  // RGB ANODO COMUM

  analogWrite(RGB_R, 255 - valorR);
  analogWrite(RGB_G, 255 - valorG);
  analogWrite(RGB_B, 255 - valorB);
}

// =====================================================

void atualizarLedsSimples() {

  bool sw1 = digitalRead(SW1);
  bool sw2 = digitalRead(SW2);
  bool sw3 = digitalRead(SW3);

  if (sw1) {
    led1Ligado = sw2;
    led2Ligado = sw3;
  }

  digitalWrite(LED_VERMELHO, led1Ligado);
  digitalWrite(LED_VERDE, led2Ligado);

  if (pCharLedsSimples != nullptr) {
    uint8_t estado = (led1Ligado ? 0x01 : 0x00) | (led2Ligado ? 0x02 : 0x00);
    pCharLedsSimples->setValue(&estado, 1);

    if (dispositivoConectado) {
      pCharLedsSimples->notify();
    }
  }
}

// =====================================================

void mostrarTela() {

  if (exibirMensagemModo && millis() - inicioMensagemModo < TEMPO_MENSAGEM_MODO) {
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print(modoAutomatico ? "Modo: Auto" : "Modo: Manual");
    lcd.setCursor(0, 1);
    lcd.print(modoAutomatico ? "Atualiza 2.5s" : "Clique p/ trocar");
    return;
  }

  exibirMensagemModo = false;
  lcd.clear();

  float tempF = (tempAtual * 9.0 / 5.0) + 32.0;

  switch (telaAtual) {

    case TELA_CELSIUS:

      lcd.setCursor(0,0);
      lcd.print("Temp:");
      lcd.print(tempAtual,1);
      lcd.print((char)223);
      lcd.print("C");

      lcd.setCursor(0,1);
      lcd.print("Umid:");
      lcd.print(umidAtual,1);
      lcd.print("%");

      break;

    case TELA_FAHRENHEIT:

      lcd.setCursor(0,0);
      lcd.print("Temp:");
      lcd.print(tempF,1);
      lcd.print((char)223);
      lcd.print("F");

      lcd.setCursor(0,1);
      lcd.print("Umid:");
      lcd.print(umidAtual,1);
      lcd.print("%");

      break;

    case TELA_TEMP_HIST_C:

      lcd.setCursor(0,0);
      lcd.print("TMin:");
      lcd.print(tempMin,1);
      lcd.print((char)223);
      lcd.print("C");

      lcd.setCursor(0,1);
      lcd.print("TMax:");
      lcd.print(tempMax,1);
      lcd.print((char)223);
      lcd.print("C");

      break;

    case TELA_TEMP_HIST_F:
    {
      float tempMinF = (tempMin * 9.0 / 5.0) + 32.0;
      float tempMaxF = (tempMax * 9.0 / 5.0) + 32.0;

      lcd.setCursor(0,0);
      lcd.print("TMin:");
      lcd.print(tempMinF,1);
      lcd.print((char)223);
      lcd.print("F");

      lcd.setCursor(0,1);
      lcd.print("TMax:");
      lcd.print(tempMaxF,1);
      lcd.print((char)223);
      lcd.print("F");

      break;
    }

    case TELA_UMID_HIST:

      lcd.setCursor(0,0);
      lcd.print("UMin:");
      lcd.print(umidMin,1);
      lcd.print("%");

      lcd.setCursor(0,1);
      lcd.print("UMax:");
      lcd.print(umidMax,1);
      lcd.print("%");

      break;

    case TELA_BLE:

      lcd.setCursor(0,0);
      lcd.print("BLE:");
      lcd.print(estadoBLE);

      lcd.setCursor(0,1);
      lcd.print("RSSI:");

      if (estadoBLE == "CONECT") {
        lcd.print(rssiBLE);
      }
      else {
        lcd.print("----");
      }

      break;
  }
}

void notificarDadosAtuais() {

  if (!dispositivoConectado) return;

  float tempF = (tempAtual * 9.0 / 5.0) + 32.0;

  bool sw4 = digitalRead(SW4);

  char buffer[50];
  snprintf(buffer, sizeof(buffer), "%.1f,%.1f,%.1f,%d",
           tempAtual, tempF, umidAtual, sw4 ? 1 : 0);

  pCharDadosAtuais->setValue((uint8_t*)buffer, strlen(buffer));
  pCharDadosAtuais->notify();

  contadorNotifAtual++;
}

void atualizarGraficoHistoricoChar() {

  String dados = "";

  for (int i = 0; i < historicoContagem; i++) {
    int idx = (historicoIndice - historicoContagem + i + HISTORICO_TAMANHO) % HISTORICO_TAMANHO;

    dados += String(historicoTemp[idx], 1);
    dados += ";";
    dados += String(historicoUmid[idx], 1);

    if (i < historicoContagem - 1) dados += "|";
  }

  pCharGraficoHist->setValue((uint8_t*)dados.c_str(), dados.length());
}

// =====================================================
//          SERVICO 3: RSSI E CONTADOR DE NOTIFICACOES
// =====================================================

void notificarRSSI() {

  if (!dispositivoConectado) return;
  if (atualConnHandle == BLE_HS_CONN_HANDLE_NONE) return;

  int8_t rssiLido = 0;
  int resultado = ble_gap_conn_rssi(atualConnHandle, &rssiLido);

  if (resultado != 0) {
    return;
  }

  int rssi = rssiLido;
  rssiBLE = rssi;

  char buffer[8];
  snprintf(buffer, sizeof(buffer), "%d", rssi);

  pCharRSSI->setValue((uint8_t*)buffer, strlen(buffer));
  pCharRSSI->notify();
}

void atualizarContadorNotificacoes() {

  // a cada 60s, "fecha" a contagem do ultimo minuto e zera para o proximo
  if (millis() - ultimoResetContador >= 60000) {

    contadorNotifUltimoMinuto = contadorNotifAtual;
    contadorNotifAtual = 0;
    ultimoResetContador = millis();

    char buffer[8];
    snprintf(buffer, sizeof(buffer), "%lu", (unsigned long)contadorNotifUltimoMinuto);
    pCharContadorNotif->setValue((uint8_t*)buffer, strlen(buffer));
  }
}

// =====================================================
//                  SETUP DO BLE
// =====================================================

void configurarBLE() {

  Serial.println("[1] Iniciando NimBLEDevice::init...");
  NimBLEDevice::init(BLE_DEVICE_NAME);
  Serial.println("[1] NimBLEDevice::init concluido.");

  Serial.print("[1c] ENDERECO MAC REAL DESTE ESP32: ");
  Serial.println(NimBLEDevice::getAddress().toString().c_str());

  NimBLEDevice::deleteAllBonds();
  Serial.println("[1b] Bonds antigos apagados (deleteAllBonds).");

  NimBLEDevice::setSecurityAuth(true, true, true);
  NimBLEDevice::setSecurityIOCap(BLE_HS_IO_DISPLAY_ONLY);
  NimBLEDevice::setSecurityPasskey(BLE_PASSKEY);
  Serial.println("[BLE] Seguranca configurada (Passkey Entry + MITM).");

  pServer = NimBLEDevice::createServer();

  if (pServer == nullptr) {
    Serial.println("[BLE] ERRO CRITICO: createServer() retornou nullptr!");
    return;
  }

  pServer->setCallbacks(&servidorCallbacks);
  Serial.println("[BLE] Servidor criado.");

  // ---------- Serviço 1: Monitoramento Ambiental ----------
  NimBLEService* pServicoAmbiental = pServer->createService(SERVICE_AMBIENTAL_UUID);

  // Flags _ENC removidas temporariamente (modo teste sem seguranca)
  pCharDadosAtuais = pServicoAmbiental->createCharacteristic(
    CHAR_DADOS_ATUAIS_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );

  pCharGraficoHist = pServicoAmbiental->createCharacteristic(
    CHAR_GRAFICO_HIST_UUID,
    NIMBLE_PROPERTY::READ
  );

  pServicoAmbiental->start();
  Serial.println("[BLE] Servico Ambiental criado e iniciado.");

  // ---------- Serviço 2: Controle de Atuadores ----------
  NimBLEService* pServicoAtuadores = pServer->createService(SERVICE_ATUADORES_UUID);

  pCharLedsSimples = pServicoAtuadores->createCharacteristic(
    CHAR_LEDS_SIMPLES_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::NOTIFY
  );
  pCharLedsSimples->setCallbacks(&ledsSimplesCallback);

  pCharLedRGB = pServicoAtuadores->createCharacteristic(
    CHAR_LED_RGB_UUID,
    NIMBLE_PROPERTY::WRITE_NR // Write Without Response
  );
  pCharLedRGB->setCallbacks(&ledRGBCallback);

  pServicoAtuadores->start();
  Serial.println("[BLE] Servico Atuadores criado e iniciado.");

  // ---------- Serviço 3: Indicadores de Conexão ----------
  NimBLEService* pServicoIndicadores = pServer->createService(SERVICE_INDICADORES_UUID);

  pCharRSSI = pServicoIndicadores->createCharacteristic(
    CHAR_RSSI_UUID,
    NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY
  );

  pCharContadorNotif = pServicoIndicadores->createCharacteristic(
    CHAR_CONTADOR_NOTIF_UUID,
    NIMBLE_PROPERTY::READ
  );

  pServicoIndicadores->start();
  Serial.println("[BLE] Servico Indicadores criado e iniciado.");

  // ---------- Advertising ----------
  NimBLEAdvertising* pAdvertising = NimBLEDevice::getAdvertising();

  if (pAdvertising == nullptr) {
    Serial.println("[BLE] ERRO CRITICO: getAdvertising() retornou nullptr!");
    return;
  }

  NimBLEAdvertisementData advData;
  advData.setName(BLE_DEVICE_NAME);

  std::vector<NimBLEUUID> servicosAnunciados;
  servicosAnunciados.push_back(NimBLEUUID(SERVICE_AMBIENTAL_UUID));
  advData.setCompleteServices16(servicosAnunciados);

  pAdvertising->setAdvertisementData(advData);

  pAdvertising->setMinInterval(640);
  pAdvertising->setMaxInterval(640);

  bool advIniciou = NimBLEDevice::startAdvertising();

  if (advIniciou) {
    Serial.println("[BLE] Advertising INICIADO com sucesso.");
  } else {
    Serial.println("[BLE] ERRO: startAdvertising() retornou FALSE. Advertising NAO iniciou!");
  }

  estadoBLE = "ANUNC";

  Serial.println("[BLE] Configuracao BLE finalizada.");
}

// =====================================================
// Connection parameters customizados (chamado apos conectar)
// Min 50ms, Max 100ms, Latency 0, Timeout 2000ms (especificacao 4.1)
// =====================================================

void aplicarParametrosConexao() {

  if (!dispositivoConectado) return;

  // unidades: intervalos em passos de 1.25ms, timeout em passos de 10ms
  uint16_t minInterval = 40;   // 40 * 1.25ms = 50ms
  uint16_t maxInterval = 80;   // 80 * 1.25ms = 100ms
  uint16_t latency = 0;
  uint16_t timeout = 200;      // 200 * 10ms = 2000ms

  pServer->updateConnParams(atualConnHandle, minInterval, maxInterval, latency, timeout);
}

// =====================================================

void setup() {

  Serial.begin(115200);

  dht.begin();

  lcd.init();
  lcd.backlight();

  pinMode(LED_VERMELHO, OUTPUT);
  pinMode(LED_VERDE, OUTPUT);

  pinMode(BTN1, INPUT_PULLUP);
  pinMode(BTN2, INPUT_PULLUP);

  pinMode(SW1, INPUT);
  pinMode(SW2, INPUT);
  pinMode(SW3, INPUT);
  pinMode(SW4, INPUT);

  pinMode(RGB_R, OUTPUT);
  pinMode(RGB_G, OUTPUT);
  pinMode(RGB_B, OUTPUT);

  estadoBaseBTN1 = digitalRead(BTN1);
  estadoBaseBTN2 = digitalRead(BTN2);
  ultimoEstadoBTN1 = false;
  ultimoEstadoBTN2 = false;

  lcd.setCursor(0,0);
  lcd.print("Inicializando");

  configurarBLE();

  delay(1500);

  lcd.clear();

  ultimoMinuto = millis();
  ultimoResetContador = millis();
}

// =====================================================

void loop() {

  tempAtual = dht.readTemperature();
  umidAtual = dht.readHumidity();

  if (!isnan(tempAtual) && !isnan(umidAtual)) {
    atualizarHistorico();
  }

  // ================= BTN1 =================
  // Clique simples (soltar antes de 3s): avança tela
  // Clique longo (segurar 3s): alterna modo estático/automático IMEDIATAMENTE

  bool estadoBTN1 = (digitalRead(BTN1) != estadoBaseBTN1);
  bool estadoBTN2 = (digitalRead(BTN2) != estadoBaseBTN2);

  if (estadoBTN1 != ultimoEstadoBTN1) {
    if (estadoBTN1) {
      BTN1Pressionado = true;
      cliqueLongoRegistrado = false;
      inicioPressionamentoBTN1 = millis();
    }
    else {
      if (BTN1Pressionado && !cliqueLongoRegistrado) {
        telaAtual = (TelaLCD)((telaAtual + 1) % 6);
        ultimoLCD = millis();
      }

      BTN1Pressionado = false;
    }

    ultimoEstadoBTN1 = estadoBTN1;
  }

  if (BTN1Pressionado && !cliqueLongoRegistrado && estadoBTN1) {
    if (millis() - inicioPressionamentoBTN1 >= TEMPO_CLIQUE_LONGO) {
      cliqueLongoRegistrado = true;
      modoAutomatico = !modoAutomatico;
      ultimoLCD = millis();
      exibirMensagemModo = true;
      inicioMensagemModo = millis();
    }
  }

  // ================= BTN2 =================

  if (estadoBTN2 != ultimoEstadoBTN2) {
    if (ultimoEstadoBTN2 == false && estadoBTN2 == true) {
      tempMin = tempAtual;
      tempMax = tempAtual;

      umidMin = umidAtual;
      umidMax = umidAtual;
    }

    ultimoEstadoBTN2 = estadoBTN2;
  }

  // ================= TROCA AUTOMÁTICA (só no modo automático) =================

  if (modoAutomatico && (millis() - ultimoLCD >= INTERVALO_LCD)) {

    ultimoLCD = millis();

    telaAtual = (TelaLCD)((telaAtual + 1) % 6);
  }

  // ================= SWITCHES / LEDS / RGB =================

  atualizarLedsSimples();
  atualizarRGB();

  // ================= LCD =================

  mostrarTela();

  // ================= BLE: NOTIFICAÇÕES =================

  if (dispositivoConectado) {

    if (millis() - ultimaNotificacaoDados >= INTERVALO_NOTIFICACAO) {
      ultimaNotificacaoDados = millis();
      notificarDadosAtuais();
    }

    if (millis() - ultimaNotificacaoRSSI >= INTERVALO_RSSI) {
      ultimaNotificacaoRSSI = millis();
      notificarRSSI();
    }

    atualizarContadorNotificacoes();
  }

  // histórico (média por minuto) para o gráfico
  if (millis() - ultimoMinuto >= INTERVALO_MINUTO) {
    ultimoMinuto = millis();
    registrarMediaMinuto();
    atualizarGraficoHistoricoChar();
  }

  // ================= SERIAL (debug) =================

  Serial.println("==============");

  Serial.print("Temp C: ");
  Serial.println(tempAtual);

  Serial.print("Temp F: ");
  Serial.println((tempAtual * 9.0 / 5.0) + 32.0);

  Serial.print("Umid: ");
  Serial.println(umidAtual);

  Serial.print("BLE: ");
  Serial.println(estadoBLE);

  Serial.print("[STATUS] Tela: ");
  switch (telaAtual) {
    case TELA_CELSIUS:      Serial.print("Celsius"); break;
    case TELA_FAHRENHEIT:   Serial.print("Fahrenheit"); break;
    case TELA_TEMP_HIST_C:  Serial.print("Temp Hist C"); break;
    case TELA_TEMP_HIST_F:  Serial.print("Temp Hist F"); break;
    case TELA_UMID_HIST:    Serial.print("Umid Hist"); break;
    case TELA_BLE:          Serial.print("BLE"); break;
    default:                Serial.print("Desconhecida"); break;
  }
  Serial.print(" | Modo: ");
  Serial.println(modoAutomatico ? "Automatico" : "Estatico");

  delay(200);
}