import Linkage from './linkage.js';

const linkage = new Linkage({
  motorAlpha: 45,
  motorBeta: 9,
  motorZero: 90, //86.17,
  innerLink: 51.265,
  outerLink: 68.735,
});

document.addEventListener('DOMContentLoaded', () => {
  // Get elements
  const pin12Slider = document.getElementById('pin12-slider');
  const pin13Slider = document.getElementById('pin13-slider');
  const pin12Value = document.getElementById('pin12-value');
  const pin13Value = document.getElementById('pin13-value');
  const pin12PW = document.getElementById('pin12-pw');
  const pin13PW = document.getElementById('pin13-pw');
  const statusElement = document.getElementById('status');
  const targetCircle = document.getElementById('target-circle');
  const targetDot = document.getElementById('target-dot');
  const coordinatesDisplay = document.getElementById('coordinates-display');

  // Debounce function to limit API calls
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Calculate pulse width from degrees
  function calculatePulseWidth(degrees) {
    return 1500 + degrees * 10;
  }

  // Update status display
  function updateStatus(message, isError = false) {
    statusElement.textContent = message;
    statusElement.className = `status ${isError ? 'error' : 'success'}`;

    // Clear success status after 3 seconds
    if (!isError) {
      setTimeout(() => {
        statusElement.textContent = 'Ready';
        statusElement.className = 'status';
      }, 3000);
    }
  }

  // Function to control servo
  async function controlServo(pin, angle) {
    try {
      const response = await fetch('/api/servo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin, angle }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to control servo');
      }

      updateStatus(`Servo on pin ${pin} moved to ${angle}°`);
    } catch (error) {
      console.error('Error controlling servo:', error);
      updateStatus(error.message, true);
    }
  }

  // Debounced version of controlServo to avoid too many API calls
  const debouncedControlServo = debounce(controlServo, 100);

  // Event listeners for pin 12 slider
  pin12Slider.addEventListener('input', function () {
    const angle = Number.parseInt(this.value);
    pin12Value.textContent = `${angle}°`;
    const pulseWidth = calculatePulseWidth(angle);
    pin12PW.textContent = pulseWidth;
  });

  pin12Slider.addEventListener('change', function () {
    const angle = Number.parseInt(this.value);
    debouncedControlServo(12, angle);
  });

  // Event listeners for pin 13 slider
  pin13Slider.addEventListener('input', function () {
    const angle = Number.parseInt(this.value);
    pin13Value.textContent = `${angle}°`;
    const pulseWidth = calculatePulseWidth(angle);
    pin13PW.textContent = pulseWidth;
  });

  pin13Slider.addEventListener('change', function () {
    const angle = Number.parseInt(this.value);
    debouncedControlServo(13, angle);
  });

  const fmt = (...args) => {
    const out = [];
    for (let i = 0; i < args[0].length; i++) {
      out.push(args[0][i]);
      out.push(args[i + 1]?.toFixed?.(2) ?? args[i + 1]);
    }
    return out.join('');
  };

  const handlePick = (event) => {
    const rect = targetCircle.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate position relative to center of circle
    const x = event.offsetX - centerX;
    const y = event.offsetY - centerY; // Invert Y for standard Cartesian coordinates

    // Convert to polar coordinates
    const radius = Math.sqrt(x * x + y * y);
    const angle = Math.atan2(x, y) * (180 / Math.PI); // Convert to degrees

    // Only process clicks inside the circle (radius of 200px)
    if (radius <= 200) {
      // Update dot position
      targetDot.style.left = `${event.offsetX}px`;
      targetDot.style.top = `${event.offsetY}px`;
      targetDot.style.display = 'block';

      // Max inclination is 45 degrees
      const inclination = (radius * 45) / 200;
      const azimuth = angle;
      try {
        const [out1, out2] = linkage.ik(inclination, azimuth);
        coordinatesDisplay.textContent = fmt`inclination = ${inclination}°, azimuth = ${azimuth}°, motor_positions: (${out1}, ${out2})`;
        controlServo(12, out1);
        controlServo(13, out2);
      } catch (e) {
        coordinatesDisplay.textContent = fmt`inclination = ${inclination}°, azimuth = ${azimuth}°, error: ${e.message}`;
      }
    }
  };

  // Circle target functionality
  targetCircle.addEventListener('mousedown', handlePick);
  targetCircle.addEventListener('mousemove', (event) => {
    if (event.buttons === 1) handlePick(event);
  });
});
