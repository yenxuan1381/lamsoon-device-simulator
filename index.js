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

for (let i = 0; i < TEMP_DEVICE_COUNT; i += 1) {

  let tmp_max = TEMP_MAX;
  let tmp_min = TEMP_MIN;

  if(i <= 2){
    tmp_max = 30;
    tmp_min = 20;
  }

  thDevices.push({
    deviceId: `S${i}`,
    temp: new Simulator((tmp_max + tmp_min) / 2, 1, tmp_min, tmp_max, 2),
    humid: new Simulator((HUMID_MAX + HUMID_MIN) / 2, 5, HUMID_MIN, HUMID_MAX, 2),
  });
}

for (let i = 1; i <= POWER_DEVICE_COUNT; i += 1) {
  let tmp = '';

  if(i == 1){
    tmp = 'lamsoon-main-server-rack-6-KVM1'
  } else if (i == 2){
    tmp = 'lamsoon-main-server-rack-6-KVM5'
  } else if(i == 3){
    tmp = 'lamsoon-server-ac-C'
  } else if (i == 2){
    tmp = 'lamsoon-server-ac-D'
  }

  powerDevices.push({
    deviceId: `${tmp}`,
    vol1: new Simulator((VOLTAGE_MAX + VOLTAGE_MIN) / 2, 1, VOLTAGE_MIN, VOLTAGE_MAX, 2), // energy, active power
    cur1: new Simulator((CURRENT_MAX + CURRENT_MIN) / 2, 5, CURRENT_MIN, CURRENT_MAX, 2),
    pow1: new Simulator((POWER_MAX + POWER_MIN) / 2, 5, POWER_MIN, POWER_MAX, 2),
    totalPow: new Simulator((POWER_MAX + POWER_MIN) / 2, 5, POWER_MIN, POWER_MAX, 2),
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
      `lamsoon/data/${deviceId}/ambient`,
      JSON.stringify({
        timestamp,
        deviceId,
        temperature,
        humidity,
      }),
    );
  });

  powerDevices.forEach(({ deviceId, vol1, cur1,  pow1, totalPow, ener }) => {
    const voltage = vol1.generate();
    const current1 = cur1.generate();
    const power1 = pow1.generate();
    const totalPower = totalPow.generate();
    const e = ener.generate();
    energy += e;

    client.publish(
      `lamsoon/data/${deviceId}/power`,
      JSON.stringify({
        timestamp,
        deviceId,
        voltage,
        current1,
        power1,
        totalPower,
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
