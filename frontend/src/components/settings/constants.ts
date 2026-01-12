/**
 * LMS Constants
 */

import { LMSInfo } from './types';

export const LMS_TYPES: LMSInfo[] = [
  { 
    id: 'canvas', 
    name: 'Canvas LMS', 
    icon: '/canvas-logo.jpg',
    color: '#E74C3C',
    description: 'Instructure Canvas Learning Management System',
    instructions: [
      'Log in to your Canvas instance',
      'Go to Account → Settings',
      'Scroll down to Approved Integrations',
      'Click + New Access Token',
      'Enter a purpose and click Generate Token',
      'Copy the generated token immediately',
    ],
    docsUrl: 'https://canvas.instructure.com/doc/api/file.oauth.html',
    defaultUrl: 'https://canvas.instructure.com',
  },
  { 
    id: 'moodle', 
    name: 'Moodle', 
    icon: '/moodle-logo.png',
    color: '#F98012',
    description: 'Open-source learning platform',
    instructions: [
      'Log in to your Moodle site as admin',
      'Go to Site Administration → Plugins → Web services → Manage tokens',
      'Create a new token for your user',
      'Enable required web services (REST protocol)',
      'Copy the generated token',
    ],
    docsUrl: 'https://docs.moodle.org/en/Web_services',
    defaultUrl: 'https://your-school.moodle.com',
  },
  { 
    id: 'blackboard', 
    name: 'Blackboard Learn', 
    icon: '/blackboard-logo.png',
    color: '#000000',
    description: 'Blackboard Learning Management System',
    instructions: [
      'Log in to Blackboard as administrator',
      'Go to System Admin → Building Blocks → Installed Tools',
      'Enable REST API Integration',
      'Generate API key and secret',
      'Copy credentials',
    ],
    docsUrl: 'https://developer.blackboard.com/portal/displayApi',
    defaultUrl: 'https://your-school.blackboard.com',
  },
  { 
    id: 'brightspace', 
    name: 'Brightspace', 
    icon: '/brightspace-logo.png',
    color: '#0066CC',
    description: 'D2L Brightspace Learning Management System',
    instructions: [
      'Log in to Brightspace as admin',
      'Go to Admin Tools → Manage Extensibility',
      'Create API key',
      'Copy API key and secret',
    ],
    docsUrl: 'https://docs.valence.desire2learn.com/',
    defaultUrl: 'https://your-school.brightspace.com',
  },
  { 
    id: 'schoology', 
    name: 'Schoology', 
    icon: '/schoology-logo.png',
    color: '#8BC34A',
    description: 'Schoology Learning Management System',
    instructions: [
      'Log in to Schoology as admin',
      'Go to School Management → API',
      'Generate API key and secret',
      'Copy credentials',
    ],
    docsUrl: 'https://developers.schoology.com/api',
    defaultUrl: 'https://your-school.schoology.com',
  },
  { 
    id: 'google_classroom', 
    name: 'Google Classroom', 
    icon: '/google-classroom-logo.png',
    color: '#4285F4',
    description: 'Google Classroom Learning Management System',
    instructions: [
      'Go to Google Cloud Console',
      'Create a new project or select existing',
      'Enable Google Classroom API',
      'Create OAuth 2.0 credentials',
      'Copy client ID and secret',
    ],
    docsUrl: 'https://developers.google.com/classroom',
    defaultUrl: 'https://classroom.google.com',
  },
];
