import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Avatar,
  CircularProgress,
  Divider,
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

const ChatContainer = styled(Paper)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  borderRadius: '12px',
  overflow: 'hidden',
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
}));

const ChatMessages = styled(Box)(({ theme }) => ({
  flexGrow: 1,
  padding: theme.spacing(2),
  overflow: 'auto',
  backgroundColor: theme.palette.grey[50],
}));

const MessageBubble = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  display: 'flex',
  marginBottom: theme.spacing(2),
  justifyContent: isUser ? 'flex-end' : 'flex-start',
}));

const MessageContent = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isUser'
})<{ isUser: boolean }>(({ theme, isUser }) => ({
  maxWidth: '80%',
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(2),
  backgroundColor: isUser ? theme.palette.primary.light : theme.palette.grey[200],
  color: isUser ? theme.palette.primary.contrastText : theme.palette.text.primary,
  wordBreak: 'break-word',
}));

const ChatInput = styled(Box)(({ theme }) => ({
  display: 'flex',
  padding: theme.spacing(2),
  borderTop: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.paper,
}));

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface ChatInterfaceProps {
  assignmentId?: string;
  submissionId?: string;
  studentName?: string;
  questionText?: string;
  submissionText?: string;
  gradingFeedback?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  assignmentId,
  submissionId,
  studentName,
  questionText,
  submissionText,
  gradingFeedback,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with a welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: '1',
      text: `Hello! I'm your AI assistant for this assignment. You can ask me questions about your submission, grading, or how to improve your work.`,
      sender: 'ai' as const,
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage('');
    setLoading(true);
    
    try {
      // Prepare context information
      const context = {
        assignmentId,
        submissionId,
        studentName,
        questionText: questionText || "Not available",
        submissionText: submissionText || "Not available", 
        gradingFeedback: gradingFeedback || "Not available"
      };
      
      // Make API call to get AI response
      const response = await axios.post('/api/chat', {
        message: newMessage,
        context: context,
        messageHistory: messages.map(m => ({
          role: m.sender === 'user' ? 'user' : 'assistant',
          content: m.text
        }))
      });
      
      // Add AI response
      if (response.data && response.data.reply) {
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: response.data.reply,
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      } else {
        // Fallback response if API fails but returns a 200
        const aiMessage: Message = {
          id: Date.now().toString(),
          text: "I'm sorry, I couldn't process your request. Please try again later.",
          sender: 'ai',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Add error message
      const errorMessage: Message = {
        id: Date.now().toString(),
        text: "I'm sorry, there was an error processing your request. Please try again later.",
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // If API is not available, simulate responses
  const simulateResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('grade') || lowerMessage.includes('score')) {
      return "Based on the rubric, your submission received points for clear organization and good content understanding. You could improve by providing more specific examples and strengthening your analysis.";
    } else if (lowerMessage.includes('improve') || lowerMessage.includes('better')) {
      return "To improve your submission, I recommend: 1) Adding more specific examples to support your arguments, 2) Connecting concepts more explicitly to the assignment question, and 3) Proofreading for clarity and grammar.";
    } else if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
      return "Hello! How can I help you with your assignment today?";
    } else if (lowerMessage.includes('thank')) {
      return "You're welcome! Feel free to ask if you have any other questions.";
    } else {
      return "That's a good question. Based on your submission, I'd suggest focusing on strengthening your main arguments with more evidence and ensuring your conclusion directly addresses the initial question.";
    }
  };

  return (
    <ChatContainer elevation={3}>
      <ChatHeader>
        <Typography variant="h6">Assignment Chat Assistant</Typography>
        <Typography variant="body2">
          Ask questions about your submission and grading
        </Typography>
      </ChatHeader>
      
      <ChatMessages>
        {messages.map((message) => (
          <MessageBubble key={message.id} isUser={message.sender === 'user'}>
            <Avatar sx={{ 
              mr: message.sender === 'user' ? 0 : 1, 
              ml: message.sender === 'user' ? 1 : 0,
              bgcolor: message.sender === 'user' ? 'primary.dark' : 'secondary.dark',
              order: message.sender === 'user' ? 2 : 0
            }}>
              {message.sender === 'user' ? <PersonIcon /> : <SmartToyIcon />}
            </Avatar>
            <MessageContent isUser={message.sender === 'user'}>
              <Typography variant="body1">{message.text}</Typography>
              <Typography variant="caption" color="textSecondary" sx={{ 
                display: 'block', 
                mt: 0.5,
                textAlign: message.sender === 'user' ? 'right' : 'left',
                opacity: 0.7
              }}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </MessageContent>
          </MessageBubble>
        ))}
        
        {loading && (
          <Box display="flex" justifyContent="flex-start" mb={2}>
            <CircularProgress size={20} />
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </ChatMessages>
      
      <ChatInput>
        <TextField
          fullWidth
          placeholder="Type your message..."
          variant="outlined"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          multiline
          maxRows={3}
          disabled={loading}
          sx={{ mr: 1 }}
        />
        <Button 
          variant="contained" 
          color="primary" 
          endIcon={<SendIcon />}
          onClick={handleSendMessage}
          disabled={loading || !newMessage.trim()}
        >
          Send
        </Button>
      </ChatInput>
    </ChatContainer>
  );
};

export default ChatInterface; 