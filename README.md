# Monitoramento de Temperatura usando BLE e ESP32

Sistema embarcado baseado em **ESP32** que atua como servidor **BLE (Bluetooth Low Energy)**, monitorando temperatura e umidade (sensor DHT22), exibindo informações em um display LCD local e controlando LEDs/LED RGB. Um aplicativo mobile atua como cliente BLE, exibindo os dados em tempo real (com gráficos históricos), controlando os atuadores e realizando o pareamento seguro com o dispositivo via *Passkey*.

**Autor:** Henrique Eduardo Simonato — 2221101008

---

## 🔧 Componentes do projeto

| Componente | Descrição | Local |
|---|---|---|
| Firmware ESP32 | Servidor BLE, leitura do DHT22, controle do LCD, LEDs e LED RGB | [`firmware/teste.ino`](firmware/teste.ino) |
| Aplicativo Mobile | Cliente BLE (React Native) — conexão, monitoramento, controle e sinal | [`app/cod_app.js`](app/cod_app.js) |
| Documentação completa | Diagramas de classes, fluxogramas, tabela GATT e instruções detalhadas | [`docs/DOCUMENTACAO_PROJETO.md`](docs/DOCUMENTACAO_PROJETO.md) |

## 🖥️ Simulação (Wokwi)

🔗 [Ver projeto no Wokwi](https://wokwi.com/projects/465825704071605249)

## 📦 Download do aplicativo (.apk)

🔗 [Baixar última versão (Release v1.0)](../../releases/tag/v1.0)

## 📡 Arquitetura BLE (resumo)

| Serviço | Função |
|---|---|
| Monitoramento Ambiental | Temperatura/umidade atuais (Notify) e gráfico histórico (Read) |
| Controle de Atuadores | LEDs simples (Read/Write/Notify) e LED RGB (Write Without Response) |
| Indicadores de Conexão | RSSI (Read/Notify) e contador de notificações (Read) |

Detalhamento completo das características, UUIDs e propriedades GATT: ver [documentação](docs/DOCUMENTACAO_PROJETO.md#4-tabela-gatt-serviços-e-características).

## 🚀 Como compilar e instalar

Instruções completas (firmware e app) disponíveis em [`docs/DOCUMENTACAO_PROJETO.md`](docs/DOCUMENTACAO_PROJETO.md#7-instruções-de-compilação-e-instalação).

**Resumo rápido:**
1. **Firmware:** abra `firmware/teste.ino` na Arduino IDE com suporte a ESP32, instale as bibliotecas `NimBLE-Arduino`, `LiquidCrystal_I2C` e `DHT sensor library`, e grave no ESP32.
2. **App:** instale o `.apk` em um celular Android 10+, conceda permissões de Bluetooth e Localização, conecte ao dispositivo `HS-ESP32-BLE` e informe o passkey exibido no LCD.

## 📁 Estrutura do repositório

```
.
├── firmware/
│   └── teste.ino
├── app/
│   └── cod_app.js
├── docs/
│   └── DOCUMENTACAO_PROJETO.md
└── README.md
```

## 🏷️ Versão

Entrega correspondente à tag [`v1.0`](../../releases/tag/v1.0).
