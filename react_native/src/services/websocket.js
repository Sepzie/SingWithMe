import { io } from 'socket.io-client';
import { WEBSOCKET_URL } from '../config/apiConfig';
import { Platform } from 'react-native';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
    this.baseUrl = WEBSOCKET_URL;
    this.connected = false;
  }

  connect() {
    if (this.socket) {
      console.log('WebSocket: Already connected or connecting');
      return;
    }

    console.log(`WebSocket: Connecting to ${this.baseUrl}`);
    
    this.socket = io(this.baseUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
    });

    // Setup event handlers
    this.socket.on('connect', () => {
      console.log('WebSocket: Connected');
      this.connected = true;
      this._notifyListeners('connect', null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket: Disconnected due to ${reason}`);
      this.connected = false;
      this._notifyListeners('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket: Connection error', error);
      this._notifyListeners('error', error);
    });

    // Listen for all incoming messages
    this.socket.on('message', (data) => {
      this._handleMessage(data);
    });

    // Listen for specific event types
    this.socket.on('status_update', (data) => {
      console.log('WebSocket: Status update received', data);
      this._notifyListeners('status_update', data);
    });

    this.socket.on('processing_complete', (data) => {
      console.log('WebSocket: Processing complete received', data);
      this._notifyListeners('processing_complete', data);
    });

    this.socket.on('processing_error', (data) => {
      console.log('WebSocket: Processing error received', data);
      this._notifyListeners('processing_error', data);
    });
  }

  _handleMessage(data) {
    try {
      // Parse message if it's a string
      const messageData = typeof data === 'string' ? JSON.parse(data) : data;
      const eventType = messageData.event || messageData.type;
      
      if (eventType) {
        console.log(`WebSocket: Received event '${eventType}'`, messageData);
        this._notifyListeners(eventType, messageData);
      }
    } catch (err) {
      console.error('WebSocket: Error processing message', err, data);
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('WebSocket: Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      // Clear all listeners when disconnecting
      this.listeners = {};
    }
  }

  // Subscribe to job updates
  subscribeToJob(jobId) {
    if (!this.socket || !this.connected) {
      console.error('WebSocket: Cannot subscribe, not connected');
      return false;
    }

    console.log(`WebSocket: Subscribing to job ${jobId}`);
    this.socket.emit('subscribe', { jobId });
    return true;
  }

  // Add event listener
  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    
    return () => this.removeEventListener(event, callback);
  }

  // Remove event listener
  removeEventListener(event, callback) {
    if (!this.listeners[event]) return;
    
    this.listeners[event] = this.listeners[event].filter(
      listener => listener !== callback
    );
  }

  // Notify all listeners of an event
  _notifyListeners(event, data) {
    if (!this.listeners[event]) return;
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (err) {
        console.error(`WebSocket: Error in ${event} listener`, err);
      }
    });
  }

  // Check if connected
  isConnected() {
    return this.connected;
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();

export default webSocketService; 