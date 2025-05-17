import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import ServoController from './servo.js';

// ES module specific way to get __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize servo controller
const servoController = new ServoController();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.json());

// API endpoint to control servo
app.post('/api/servo', async (req, res) => {
  try {
    const { pin, angle } = req.body;
    
    if (!pin || angle === undefined) {
      return res.status(400).json({ error: 'Pin and angle are required' });
    }
    
    if (typeof pin !== 'number' || typeof angle !== 'number') {
      return res.status(400).json({ error: 'Pin and angle must be numbers' });
    }
    
    // Validate angle range
    if (angle < -60 || angle > 60) {
      return res.status(400).json({ error: 'Angle must be between -60 and +60 degrees' });
    }
    
    await servoController.moveServo(pin, angle);
    res.json({ success: true, pin, angle });
  } catch (error) {
    console.error('Error controlling servo:', error);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
async function startServer() {
  try {
    // Connect to Raspberry Pi
    await servoController.connect();
    
    // Start Express server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// This is required so that process.on('exit') handlers are triggered.
process.on('SIGINT', () => process.exit());

startServer();