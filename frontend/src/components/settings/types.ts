/**
 * Types for Settings Page
 */

export interface LMSConfig {
  id: string;
  type: 'canvas' | 'moodle' | 'blackboard' | 'brightspace' | 'schoology' | 'google_classroom';
  name: string;
  instanceUrl: string;
  apiKey: string;
  isConfigured: boolean;
  isValid: boolean;
  userInfo?: any;
  lastTested?: string;
}

export interface LMSInfo {
  id: string;
  name: string;
  icon?: string;
  color: string;
  description: string;
  instructions: string[];
  docsUrl: string;
  defaultUrl: string;
}

export interface Message {
  type: 'success' | 'error' | 'info' | 'warning';
  text: string;
}
