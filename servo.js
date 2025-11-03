import { pigpio } from 'pigpio-client';

const isEmpty = (obj) => {
  for (const _ in obj) return false;
  return true;
}

class ServoController {
  constructor(host = '192.168.0.173') {
    this.pins = {};
    this.rpi = pigpio({ host });
    this.rpi.on('error', (err) => { console.error('pigpio error:', err); });
    this.rpi.on('disconnected', (reason) => { console.log('pigpio disconnected:', reason); });

    this.commands = {};

    process.on('exit', () => {
      console.log('Exiting - resetting pins');
      for (const pinNo in this.pins) {
        const pin = this.pins[pinNo];
        console.log('Resetting pin', pinNo);
        pin.hardwarePWM(0, 0);
      }
    });
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.rpi.once('connected', (info) => {
        console.log('Connected to Raspberry Pi:', info);
        resolve(this);
      });

      // Set a timeout in case connection fails
      setTimeout(() => {
        reject(new Error('Connection timeout to Raspberry Pi'));
      }, 5000);
    });
  }

  async setupPin(pinNumber) {
    if (this.pins[pinNumber]) {
      return this.pins[pinNumber];
    }

    const pin = this.rpi.gpio(pinNumber);
    await pin.modeSet('output');
    this.pins[pinNumber] = pin;
    return pin;
  }

  processCommands = async () => {
    if (this.processing) return;
    this.processing = true;

    const commands = this.commands;
    this.commands = {};
    delete this.debounceTimer;

    for (const pinKey in commands) {
      const pinNumber = Number.parseInt(pinKey);
      const { degrees, resolve, reject } = commands[pinKey];

      // Ensure degrees is within -60 to +60 range
      if (degrees < -60 || degrees > 60) {
        throw new Error(`Angle out of bounds: ${degrees}. Must be between -60 and +60 degrees.`);
      }

      // Convert degrees to pulse width (900-2100μs)
      // -60° → 900μs, 0° → 1500μs, +60° → 2100μs
      const pulseWidth = 1500 + (degrees * 10);
     	const frequency = 250; // Hertz
      const dutyCycle = pulseWidth * frequency;
      console.log(`Moving servo on pin ${pinNumber} to ${degrees.toFixed(2)}° (PW: ${pulseWidth.toFixed(2)}μs; DC: ${(dutyCycle / 10000).toFixed(2)}%)`);

      try {
        // Ensure the pin is set up
        const pin = await this.setupPin(pinNumber);
        // Set the servo pulse width
        await pin.hardwarePWM(frequency, dutyCycle);
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        this.processing = false;
        if (!isEmpty(this.commands)) return this.processCommands();
      }
    }
  }

  moveServo(pinNumber, degrees) {
    let command = this.commands[pinNumber];

    if (command) {
      this.commands[pinNumber].resolve();
    } else {
      command = this.commands[pinNumber] = {};
    }

    setTimeout(this.processCommands, 0);

    command.degrees = degrees;
    return new Promise((res, rej) => {
      command.resolve = res;
      command.reject = rej;
    });
  }
}

export default ServoController;
