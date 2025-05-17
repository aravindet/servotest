/*
	K-power M0170 2.5KG Micro Metal Gear Analog Servo

	Parameter:
	Model Type:Analog Servo M0170
	Motor Type:Brushed
	Case material:Plastic Case
	Gear material:Metal
	Bearing Type: Top BB
	Weight: 21g /0.7oz
	Dimension:28*13*27mm / 1.1*0.5*1.1in
	Operation Voltage:4.8-6V
	Torque:2.4kg-cm/4.8V; 2.6kg-cm/6.0V ; 33oz-in/4.8V; 36oz-in/6.0V
	
	Speed:0.11sec/60°/4.8V; 0.09sec/60°/6.0V
	Pulse Width:900-2100μs
	Dead band width:4μs
	Interface Type:JR
	Operating Temperature:-10 to 60 centigrade
	Splining:25T
*/


import { pigpio } from 'pigpio-client';

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

const moveTo = (pin, deg) => {
	if (deg < -60 || deg > 60) throw Error('out-of-bounds');
	// -60° → 1500 - 600 =  900
	// +60° → 1500 + 600 = 2100
	const pw = 1500 + deg * 10;
	console.log('M', deg, pw);
	return pin.setServoPulsewidth(pw);
}

const pins = [];

const init = async (info) => {
	console.log(info);

	const xpin = rpi.gpio(12);
	pins.push(xpin);
	
	await xpin.modeSet('output');

	let deg = 0;
	let delta = 10;
	const min = -60;
	const max = 60;

	let steps = 100;

	do {
		await moveTo(xpin, deg);
		await wait(500);
		deg += delta;
		if (deg < min || deg > max) {
			delta = -delta;
			deg += 2*delta;
		}
		steps--
	} while (steps > 0);

	await moveTo(xpin, 0);

	process.exit(0);
};

const rpi = pigpio({ host: '192.168.0.173' });
rpi.once('connected', init);
rpi.on('error', (err) => { console.error(err); });
rpi.on('disconnected', (reason) => { console.log('pigpio:disconnected', reason); });

process.on('exit', () => {
	console.log('Exiting');
	for (const pin of pins) {
		pin.write(0);
	}
});
