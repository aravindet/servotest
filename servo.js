import { pigpio } from 'pigpio-client';

class ServoController {
  constructor(host = '192.168.0.173') {
    this.pins = {};
    this.rpi = pigpio({ host });
    this.rpi.on('error', (err) => { console.error('pigpio error:', err); });
    this.rpi.on('disconnected', (reason) => { console.log('pigpio disconnected:', reason); });
    
    process.on('exit', () => {
      console.log('Exiting - resetting pins');
      for (const pinNo in this.pins) {
        const pin = this.pins[pinNo];
        console.log('Resetting pin', pinNo);
        pin.setServoPulsewidth(0);
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

  async moveServo(pinNumber, degrees) {
    // Ensure degrees is within -60 to +60 range
    if (degrees < -60 || degrees > 60) {
      throw new Error(`Angle out of bounds: ${degrees}. Must be between -60 and +60 degrees.`);
    }
    
    // Convert degrees to pulse width (900-2100μs)
    // -60° → 900μs, 0° → 1500μs, +60° → 2100μs
    const pulseWidth = 1500 + (degrees * 10);
    
    // Ensure the pin is set up
    const pin = await this.setupPin(pinNumber);
    console.log(`Moving servo on pin ${pinNumber} to ${degrees}° (PW: ${pulseWidth}μs)`);
    
    // Set the servo pulse width
    return pin.setServoPulsewidth(pulseWidth);
  }
}

export default ServoController;