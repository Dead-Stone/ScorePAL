import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  IconButton,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import HomeIcon from '@mui/icons-material/Home';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import SchoolIcon from '@mui/icons-material/School';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import ListAltIcon from '@mui/icons-material/ListAlt';

const navItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/' },
  { text: 'Agentic Grading', icon: <AutoFixHighIcon />, path: '/agentic-grading' },
  { text: 'Batch Upload', icon: <UploadFileIcon />, path: '/batch-upload' },
  { text: 'Canvas Grading', icon: <SchoolIcon />, path: '/canvas-grading' },
  { text: 'Canvas Processor', icon: <ListAltIcon />, path: '/canvas-processor' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  { text: 'Help', icon: <HelpIcon />, path: '/help' },
]; 