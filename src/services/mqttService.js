import Paho from 'paho-mqtt';

const MQTT_HOST = 'broker.hivemq.com';
const MQTT_WS_PORT = 8000;
const MQTT_PATH = '/mqtt';

export const SMART_OFFICE_TOPICS = {
  fan: 'smartoffice/control/fan',
  door: 'smartoffice/control/door',
  curtain: 'smartoffice/control/curtain',
  status: 'smartoffice/status',
};

function createClientId() {
  return `pbl5_mobile_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

class SmartOfficeMqttService {
  constructor() {
    this.client = null;
    this.statusHandler = null;
    this.connectionHandler = null;
  }

  isConnected() {
    return Boolean(this.client?.isConnected?.());
  }

  setStatusHandler(handler) {
    this.statusHandler = handler;
  }

  setConnectionHandler(handler) {
    this.connectionHandler = handler;
  }

  notifyConnection(connected) {
    if (this.connectionHandler) {
      this.connectionHandler(connected);
    }
  }

  connect() {
    if (this.isConnected()) {
      this.notifyConnection(true);
      return Promise.resolve();
    }

    this.client = new Paho.Client(MQTT_HOST, MQTT_WS_PORT, MQTT_PATH, createClientId());

    this.client.onConnectionLost = () => {
      this.notifyConnection(false);
    };

    this.client.onMessageArrived = (message) => {
      if (message.destinationName !== SMART_OFFICE_TOPICS.status) {
        return;
      }

      try {
        const payload = JSON.parse(message.payloadString || '{}');
        if (this.statusHandler) {
          this.statusHandler({
            fan: Boolean(payload.fan),
            door: Boolean(payload.door),
            curtain: Boolean(payload.curtain),
          });
        }
      } catch (error) {
        console.warn('[MQTT] Invalid status payload:', error);
      }
    };

    return new Promise((resolve, reject) => {
      this.client.connect({
        useSSL: false,
        timeout: 10,
        reconnect: true,
        onSuccess: () => {
          this.client.subscribe(SMART_OFFICE_TOPICS.status);
          this.notifyConnection(true);
          resolve();
        },
        onFailure: (error) => {
          this.notifyConnection(false);
          reject(error);
        },
      });
    });
  }

  publishDeviceState(deviceKey, state) {
    const topic = SMART_OFFICE_TOPICS[deviceKey];
    if (!topic) {
      throw new Error(`Unknown smart office device: ${deviceKey}`);
    }

    if (!this.isConnected()) {
      throw new Error('MQTT disconnected');
    }

    const message = new Paho.Message(JSON.stringify({ state: Boolean(state) }));
    message.destinationName = topic;
    message.qos = 0;
    message.retained = false;
    this.client.send(message);
  }

  disconnect() {
    if (this.isConnected()) {
      this.client.disconnect();
    }
    this.notifyConnection(false);
  }
}

export const smartOfficeMqttService = new SmartOfficeMqttService();
