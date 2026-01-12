/**
 * StudentAIBuddy - Persistent AI Assistant for Students
 * Always visible floating assistant that helps with academic questions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Collapse,
  Fab,
  Chip,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import PersonIcon from '@mui/icons-material/Person';
import apiClient from '@/utils/apiClient';
import { useAuth } from '@/contexts/AuthContext';

const FloatingContainer = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  width: 380,
  maxHeight: '80vh',
  borderRadius: '16px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  transition: 'all 0.3s ease',
  [theme.breakpoints.down('sm')]: {
    width: 'calc(100vw - 40px)',
    right: 20,
    left: 20,
  },
}));

const MinimizedContainer = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 20,
  right: 20,
  zIndex: 1000,
  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  background: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
  borderBottom: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
}));

const ChatMessages = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2),
  overflowY: 'auto',
  backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f7f7f8',
  minHeight: 350,
  maxHeight: 500,
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#d1d1d1',
    borderRadius: '3px',
    '&:hover': {
      background: '#b1b1b1',
    },
  },
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  display: 'flex',
  marginBottom: theme.spacing(1.5),
  justifyContent: isUser ? 'flex-end' : 'flex-start',
  alignItems: 'flex-start',
}));

const MessageContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  maxWidth: '85%',
  padding: theme.spacing(1.25, 1.5),
  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
  backgroundColor: isUser 
    ? (theme.palette.mode === 'dark' ? '#19c37d' : '#1D80C3')
    : (theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff'),
  color: isUser ? 'white' : theme.palette.text.primary,
  wordBreak: 'break-word',
  boxShadow: isUser ? 'none' : '0 1px 2px rgba(0,0,0,0.05)',
  border: !isUser ? `1px solid ${theme.palette.divider}` : 'none',
}));

const ChatInput = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.mode === 'dark' ? '#2d2d2d' : '#ffffff',
  display: 'flex',
  gap: theme.spacing(1),
  alignItems: 'flex-end',
}));

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface StudentAIBuddyProps {
  studentData?: {
    courses?: any[];
    results?: any[];
    stats?: any;
    insights?: any;
  };
}

export const StudentAIBuddy: React.FC<StudentAIBuddyProps> = ({ studentData }) => {
  const { user } = useAuth();
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Initialize with welcome message
    const welcomeMessage: Message = {
      id: '1',
      text: `Hi${user?.first_name ? ` ${user.first_name}` : ''}! 👋 I'm your AI academic assistant. I can help you understand your grades, courses, assignments, and provide study tips. What would you like to know?`,
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
    // Generate conversation ID
    setConversationId(`conv_${user?.id}_${Date.now()}`);
  }, [user]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);

    try {
      // Build context from student data
      const context = buildContext(studentData);
      
      // Call AI endpoint with conversation ID
      const response = await apiClient.post('/api/ai/student-assistant', {
        message: newMessage.trim(),
        context: context,
        userId: user?.id,
        conversationId: conversationId,
      });

      // Update conversation ID if returned
      if (response.data.conversationId) {
        setConversationId(response.data.conversationId);
      }

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response || 'I apologize, but I encountered an error. Please try again.',
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      // Fallback response
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: error.response?.data?.detail || 'I apologize, but I encountered an error. Please try again or check your AI configuration in Settings.',
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);
    } finally {
      setLoading(false);
    }
  };

  const buildContext = (data?: any) => {
    if (!data) return {};
    
    return {
      courses: data.courses?.map((c: any) => ({
        name: c.name,
        code: c.course_code,
        score: c.current_score,
        grade: c.current_grade,
      })) || [],
      stats: data.stats || {},
      insights: data.insights || [],
      resultsCount: data.results?.length || 0,
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (isMinimized) {
    return (
      <MinimizedContainer
        color="primary"
        onClick={() => setIsMinimized(false)}
        aria-label="Open AI Assistant"
      >
        <SmartToyIcon />
      </MinimizedContainer>
    );
  }

  return (
    <FloatingContainer elevation={8}>
      <ChatHeader>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar sx={{ 
            bgcolor: 'primary.main',
            width: 32,
            height: 32,
          }}>
            <SmartToyIcon sx={{ fontSize: 18 }} />
          </Avatar>
          <Typography variant="subtitle2" fontWeight={600}>
            AI Assistant
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={() => setIsMinimized(true)}
          sx={{ color: 'text.secondary' }}
        >
          <MinimizeIcon fontSize="small" />
        </IconButton>
      </ChatHeader>

      <ChatMessages>
        {messages.map((message) => (
          <MessageBubble key={message.id} isUser={message.sender === 'user'}>
            {message.sender === 'ai' && (
              <Avatar sx={{ 
                width: 28, 
                height: 28, 
                mr: 1.5,
                bgcolor: 'primary.main',
              }}>
                <SmartToyIcon sx={{ fontSize: 16 }} />
              </Avatar>
            )}
            <MessageContent isUser={message.sender === 'user'}>
              <Typography 
                variant="body2" 
                sx={{ 
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.6,
                  fontSize: '0.9375rem',
                }}
              >
                {message.text}
              </Typography>
            </MessageContent>
            {message.sender === 'user' && (
              <Avatar sx={{ 
                width: 28, 
                height: 28, 
                ml: 1.5,
                bgcolor: 'primary.main',
              }}>
                {user?.first_name?.[0] || user?.email?.[0] || 'U'}
              </Avatar>
            )}
          </MessageBubble>
        ))}
        
        {loading && (
          <MessageBubble isUser={false}>
            <Avatar sx={{ width: 28, height: 28, mr: 1.5, bgcolor: 'primary.main' }}>
              <SmartToyIcon sx={{ fontSize: 16 }} />
            </Avatar>
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              alignItems: 'center',
              px: 1.5,
              py: 1,
            }}>
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'text.secondary',
                animation: 'pulse 1.4s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 0.4 },
                  '50%': { opacity: 1 },
                },
              }} />
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'text.secondary',
                animation: 'pulse 1.4s ease-in-out 0.2s infinite',
              }} />
              <Box sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: 'text.secondary',
                animation: 'pulse 1.4s ease-in-out 0.4s infinite',
              }} />
            </Box>
          </MessageBubble>
        )}
        
        <div ref={messagesEndRef} />
      </ChatMessages>

      <ChatInput>
        <TextField
          fullWidth
          size="small"
          placeholder="Message AI assistant..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          multiline
          maxRows={4}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '20px',
              backgroundColor: 'background.paper',
              '& fieldset': {
                borderColor: 'divider',
              },
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
              '&.Mui-focused fieldset': {
                borderColor: 'primary.main',
                borderWidth: '1px',
              },
            },
          }}
        />
        <IconButton
          color="primary"
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || loading}
          sx={{
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            '&:disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled',
            },
            width: 36,
            height: 36,
          }}
        >
          <SendIcon fontSize="small" />
        </IconButton>
      </ChatInput>
    </FloatingContainer>
  );
};

