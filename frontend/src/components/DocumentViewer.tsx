/**
 * DocumentViewer - Universal document viewer component for ScorePAL
 * Supports PDFs, images, and other document types with preview capabilities
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  IconButton,
  Toolbar,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  Download as DownloadIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  RotateLeft as RotateLeftIcon,
  RotateRight as RotateRightIcon,
  Fullscreen as FullscreenIcon,
  FullscreenExit as FullscreenExitIcon,
  GetApp as GetAppIcon,
  Description as DescriptionIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { API_BASE_URL } from '@/config/api';

interface FileInfo {
  filename: string;
  path: string;
  size: number;
  content_type: string;
  last_modified?: string;
}

interface DocumentViewerProps {
  file: FileInfo | null;
  open: boolean;
  onClose: () => void;
  assignmentId?: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  file,
  open,
  onClose,
  assignmentId
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset state when file changes
  useEffect(() => {
    if (file) {
      setLoading(true);
      setError(null);
      setZoom(100);
      setRotation(0);
      setImageLoaded(false);
    }
  }, [file]);

  const handleDownload = () => {
    if (!file) return;
    
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${file.path}`;
    link.download = file.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, 300));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, 25));
  };

  const handleRotateLeft = () => {
    setRotation(prev => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation(prev => prev + 90);
  };

  const toggleFullscreen = () => {
    setFullscreen(prev => !prev);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileIcon = (contentType: string) => {
    if (contentType?.includes('pdf')) {
      return <PdfIcon sx={{ color: '#d32f2f', fontSize: 20 }} />;
    } else if (contentType?.includes('image')) {
      return <ImageIcon sx={{ color: '#2e7d32', fontSize: 20 }} />;
    } else if (contentType?.includes('word') || contentType?.includes('document')) {
      return <DescriptionIcon sx={{ color: '#1976d2', fontSize: 20 }} />;
    }
    return <FileIcon sx={{ color: '#757575', fontSize: 20 }} />;
  };

  const renderFilePreview = () => {
    if (!file) return null;

    const fileUrl = `${API_BASE_URL}${file.path}`;
    const contentType = file.content_type || '';

    // PDF Preview
    if (contentType.includes('pdf')) {
      return (
        <Box
          sx={{
            width: '100%',
            height: fullscreen ? '90vh' : '70vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#f5f5f5',
            borderRadius: 1,
            position: 'relative',
          }}
        >
          {loading && (
            <Box sx={{ position: 'absolute', zIndex: 1 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Loading PDF...
              </Typography>
            </Box>
          )}
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1&page=1&view=FitH`}
            width="100%"
            height="100%"
            style={{
              border: 'none',
              borderRadius: '4px',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Failed to load PDF. Please try downloading the file.');
            }}
          />
        </Box>
      );
    }

    // Image Preview
    if (contentType.includes('image')) {
      return (
        <Box
          sx={{
            width: '100%',
            height: fullscreen ? '90vh' : '70vh',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#f5f5f5',
            borderRadius: 1,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {loading && !imageLoaded && (
            <Box sx={{ position: 'absolute', zIndex: 1 }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Loading image...
              </Typography>
            </Box>
          )}
          <img
            src={fileUrl}
            alt={file.filename}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-in-out',
            }}
            onLoad={() => {
              setImageLoaded(true);
              setLoading(false);
            }}
            onError={() => {
              setLoading(false);
              setError('Failed to load image. Please try downloading the file.');
            }}
          />
        </Box>
      );
    }

    // Text files preview
    if (contentType.includes('text') || contentType.includes('json')) {
      return (
        <Box
          sx={{
            width: '100%',
            height: fullscreen ? '90vh' : '70vh',
            bgcolor: '#f5f5f5',
            borderRadius: 1,
            overflow: 'auto',
          }}
        >
          <iframe
            src={fileUrl}
            width="100%"
            height="100%"
            style={{
              border: 'none',
              borderRadius: '4px',
              backgroundColor: 'white',
            }}
            onLoad={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setError('Failed to load text file. Please try downloading the file.');
            }}
          />
        </Box>
      );
    }

    // Unsupported file type
    return (
      <Paper
        sx={{
          p: 4,
          textAlign: 'center',
          height: fullscreen ? '90vh' : '70vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: '#f9f9f9',
        }}
      >
        <FileIcon sx={{ fontSize: 64, color: '#bdbdbd', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          Preview not available
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          This file type cannot be previewed in the browser.
          <br />
          Please download the file to view its contents.
        </Typography>
        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownload}
        >
          Download File
        </Button>
      </Paper>
    );
  };

  if (!file) return null;

  const canZoom = file.content_type?.includes('image') || file.content_type?.includes('pdf');
  const canRotate = file.content_type?.includes('image');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={fullscreen ? false : 'lg'}
      fullWidth
      fullScreen={fullscreen}
      PaperProps={{
        sx: {
          height: fullscreen ? '100vh' : '90vh',
          maxHeight: fullscreen ? '100vh' : '90vh',
        }
      }}
    >
      <DialogTitle sx={{ p: 0 }}>
        <Toolbar>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
            {getFileIcon(file.content_type)}
            <Box sx={{ ml: 1, flex: 1 }}>
              <Typography variant="h6" noWrap>
                {file.filename}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                <Chip
                  label={file.content_type || 'Unknown'}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={formatFileSize(file.size)}
                  size="small"
                  variant="outlined"
                />
                {file.last_modified && (
                  <Chip
                    label={new Date(file.last_modified).toLocaleDateString()}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Box>

          {/* Toolbar Controls */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canZoom && (
              <>
                <IconButton onClick={handleZoomOut} disabled={zoom <= 25}>
                  <ZoomOutIcon />
                </IconButton>
                <Typography variant="body2" sx={{ alignSelf: 'center', minWidth: '45px', textAlign: 'center' }}>
                  {zoom}%
                </Typography>
                <IconButton onClick={handleZoomIn} disabled={zoom >= 300}>
                  <ZoomInIcon />
                </IconButton>
                <Divider orientation="vertical" flexItem />
              </>
            )}

            {canRotate && (
              <>
                <IconButton onClick={handleRotateLeft}>
                  <RotateLeftIcon />
                </IconButton>
                <IconButton onClick={handleRotateRight}>
                  <RotateRightIcon />
                </IconButton>
                <Divider orientation="vertical" flexItem />
              </>
            )}

            <IconButton onClick={toggleFullscreen}>
              {fullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
            </IconButton>

            <IconButton onClick={handleDownload}>
              <DownloadIcon />
            </IconButton>

            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </DialogTitle>

      <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}

        {renderFilePreview()}
      </DialogContent>

      {!fullscreen && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={handleDownload} startIcon={<GetAppIcon />}>
            Download
          </Button>
          <Button onClick={onClose} variant="contained">
            Close
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default DocumentViewer; 