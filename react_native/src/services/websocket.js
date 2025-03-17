import { io } from 'socket.io-client';
import { Platform } from 'react-native';
import { WEBSOCKET_URL } from '../config/apiConfig';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
    this.baseUrl = WEBSOCKET_URL;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
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
      reconnectionAttempts: this.maxReconnectAttempts,
      path: '/ws/socket.io',  // Updated path to match server
    });

    // Setup event handlers
    this.socket.on('connect', () => {
      console.log('WebSocket: Connected');
      this.connected = true;
      this.reconnectAttempts = 0;
      
      // Notify any listeners of the connection event
      this._notifyListeners('connect', null);
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket: Disconnected due to ${reason}`);
      this.connected = false;
      
      // Notify any listeners of the disconnection event
      this._notifyListeners('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket: Connection error', error);
      this.reconnectAttempts++;
      
      // Notify any listeners of the connection error
      this._notifyListeners('error', error);
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('WebSocket: Max reconnect attempts reached, giving up');
        this.socket.disconnect();
      }
    });

    // Listen for all messages and route them based on event type
    this.socket.on('message', (data) => {
      try {
        // Parse message if it's a string
        const messageData = typeof data === 'string' ? JSON.parse(data) : data;
        const event = messageData.event;
        
        if (event) {
          console.log(`WebSocket: Received event '${event}'`, messageData);
          this._notifyListeners(event, messageData);
          
          // Special handling for status updates
          if (event === 'status_update') {
            this._notifyListeners('status_update', messageData);
          } 
          // Special handling for processing completion
          else if (event === 'processing_complete') {
            this._notifyListeners('processing_complete', messageData);
          } 
          // Special handling for processing errors
          else if (event === 'processing_error') {
            this._notifyListeners('processing_error', messageData);
          }
        } else {
          console.warn('WebSocket: Received message with no event type', messageData);
        }
      } catch (err) {
        console.error('WebSocket: Error processing message', err, data);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('WebSocket: Disconnecting');
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
    }
  }

  // Subscribe to job updates
  subscribeToJob(jobId) {
    if (!this.socket || !this.connected) {
      console.error('WebSocket: Cannot subscribe, not connected');
      return false;
    }

    console.log(`WebSocket: Subscribing to job ${jobId}`);
    this.socket.emit('message', JSON.stringify({
      type: 'subscribe',
      jobId: jobId,
      timestamp: new Date().toISOString()
    }));
    return true;
  }

  // Unsubscribe from job updates
  unsubscribeFromJob(jobId) {
    if (!this.socket || !this.connected) {
      console.error('WebSocket: Cannot unsubscribe, not connected');
      return false;
    }

    console.log(`WebSocket: Unsubscribing from job ${jobId}`);
    this.socket.emit('message', JSON.stringify({
      type: 'unsubscribe',
      jobId: jobId,
      timestamp: new Date().toISOString()
    }));
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