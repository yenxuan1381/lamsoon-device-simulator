require('dotenv').config();

const mqtt = require('mqtt');
const Simulator = require('./simulator');

const {
  MQTT_HOST = 'localhost',
  PUBLISH_FREQ = 5,
  TEMP_DEVICE_COUNT = 4,
  TEMP_MAX = 20,
  TEMP_MIN = 15,
  HUMID_MAX = 80,
  HUMID_MIN = 55,
  POWER_DEVICE_COUNT = 2,
  VOLTAGE_MAX = 60,
  VOLTAGE_MIN = 40,
  CURRENT_MAX = 30,
  CURRENT_MIN = 10,
  POWER_MAX = 30,
  POWER_MIN = 10,
  ENERGY_MAX = 5,
  ENERGY_MIN = 2
} = process.env;

const client = mqtt.connect(`mqtt://${MQTT_HOST}`);
let publishTask;

let energy = 0;
const thDevices = [];
const powerDevices = [];

for (let i = 1; i <= TEMP_DEVICE_COUNT; i += 1) {

  let tmp_max = TEMP_MAX;
  let tmp_min = TEMP_MIN;

  if(i <= 2){
    tmp_max = 30;
    tmp_min = 20;
  }

  thDevices.push({
    deviceId: `dummy-temp-${i}`,
    temp: new Simulator((tmp_max + tmp_min) / 2, 1, tmp_min, tmp_max, 2),
    humid: new Simulator((HUMID_MAX + HUMID_MIN) / 2, 5, HUMID_MIN, HUMID_MAX, 2),
  });
}

for (let i = 1; i <= POWER_DEVICE_COUNT; i += 1) {

  powerDevices.push({
    deviceId: `dummy-power-${i}`,
    vol: new Simulator((VOLTAGE_MAX + VOLTAGE_MIN) / 2, 1, VOLTAGE_MIN, VOLTAGE_MAX, 2), // energy, active power
    cur1: new Simulator((CURRENT_MAX + CURRENT_MIN) / 2, 5, CURRENT_MIN, CURRENT_MAX, 2),
    cur2: new Simulator((CURRENT_MAX + CURRENT_MIN) / 2, 5, CURRENT_MIN, CURRENT_MAX, 2),
    cur3: new Simulator((CURRENT_MAX + CURRENT_MIN) / 2, 5, CURRENT_MIN, CURRENT_MAX, 2),
    pow1: new Simulator((POWER_MAX + POWER_MIN) / 2, 5, POWER_MIN, POWER_MAX, 2),
    pow2: new Simulator((POWER_MAX + POWER_MIN) / 2, 5, POWER_MIN, POWER_MAX, 2),
    pow3: new Simulator((POWER_MAX + POWER_MIN) / 2, 5, POWER_MIN, POWER_MAX, 2),
    ener: new Simulator((ENERGY_MAX + ENERGY_MIN) / 2, 5, ENERGY_MIN, ENERGY_MAX, 2),
  });
}

function generateData() {
  // get current epoch timestamp in seconds
  const timestamp = Math.round(Date.now() / 1000);
  thDevices.forEach(({ deviceId, temp, humid }) => {
    const temperature = temp.generate();
    const humidity = humid.generate();

    client.publish(
      `site-a/data/${deviceId}/ambient`,
      JSON.stringify({
        timestamp,
        deviceId,
        temperature,
        humidity,
      }),
    );
  });

  powerDevices.forEach(({ deviceId, vol, cur1, cur2, cur3, pow1, pow2, pow3, ener }) => {
    const voltage = vol.generate();
    const current1 = cur1.generate();
    const current2 = cur2.generate();
    const current3 = cur3.generate();
    const power1 = pow1.generate();
    const power2 = pow2.generate();
    const power3 = pow3.generate();
    const e = ener.generate();
    energy += e;

    client.publish(
      `site-a/data/${deviceId}/power`,
      JSON.stringify({
        timestamp,
        deviceId,
        voltage,
        current1,
        current2,
        current3,
        power1,
        power2,
        power3,
        energy
      }),
    );
  });
}

client.on('connect', () => {
  console.log('MQTT Connected');
  publishTask = setInterval(generateData, PUBLISH_FREQ * 1000);
});

client.on('close', () => {
  console.log('MQTT disconnected');
  if (publishTask) clearInterval(publishTask);
});

console.log('Simulator has started');
