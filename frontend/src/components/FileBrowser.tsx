/**
 * FileBrowser - File browser component for viewing uploaded documents
 * Shows files with metadata and provides preview/download functionality
 * 
 * @author Mohana Moganti (@Dead-Stone)
 * @license MIT
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Button,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  InsertDriveFile as FileIcon,
  Visibility as VisibilityIcon,
  Download as DownloadIcon,
  Folder as FolderIcon,
  CloudUpload as UploadIcon,
} from '@mui/icons-material';
import DocumentViewer from './DocumentViewer';
import { API_BASE_URL } from '@/config/api';
import axios from 'axios';

interface FileInfo {
  filename: string;
  path: string;
  size: number;
  content_type: string;
  last_modified?: string;
}

interface FileCategory {
  question_papers: FileInfo[];
  submissions: FileInfo[];
  answer_keys: FileInfo[];
  original_files?: FileInfo[];
}

interface FileBrowserProps {
  assignmentId: string;
  title?: string;
  showCategories?: boolean;
  compact?: boolean;
}

const FileBrowser: React.FC<FileBrowserProps> = ({
  assignmentId,
  title = "Uploaded Files",
  showCategories = true,
  compact = false
}) => {
  const [files, setFiles] = useState<FileCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, [assignmentId]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_BASE_URL}/grading-results/${assignmentId}/files`);
      setFiles(response.data);
    } catch (err: any) {
      console.error('Error fetching files:', err);
      setError(err.response?.data?.detail || 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFilePreview = (file: FileInfo) => {
    setSelectedFile(file);
    setViewerOpen(true);
  };

  const handleFileDownload = (file: FileInfo) => {
    const link = document.createElement('a');
    link.href = `${API_BASE_URL}${file.path}`;
    link.download = file.filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileIcon = (contentType: string) => {
    if (contentType?.includes('pdf')) {
      return <PdfIcon sx={{ color: '#d32f2f' }} />;
    } else if (contentType?.includes('image')) {
      return <ImageIcon sx={{ color: '#2e7d32' }} />;
    } else if (contentType?.includes('word') || contentType?.includes('document')) {
      return <DescriptionIcon sx={{ color: '#1976d2' }} />;
    }
    return <FileIcon sx={{ color: '#757575' }} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const canPreview = (contentType: string) => {
    return contentType?.includes('pdf') || 
           contentType?.includes('image') || 
           contentType?.includes('text');
  };

  const renderFileList = (fileList: FileInfo[], categoryName: string) => {
    if (!fileList || fileList.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          <Typography variant="body2">
            No {categoryName.toLowerCase()} uploaded
          </Typography>
        </Box>
      );
    }

    return (
      <List dense={compact}>
        {fileList.map((file, index) => (
          <React.Fragment key={index}>
            <ListItem
              sx={{
                '&:hover': {
                  bgcolor: 'action.hover',
                  cursor: 'pointer',
                },
                borderRadius: 1,
                mb: 0.5,
              }}
              onClick={() => canPreview(file.content_type) ? handleFilePreview(file) : handleFileDownload(file)}
            >
              <ListItemIcon>
                {getFileIcon(file.content_type)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                      {file.filename}
                    </Typography>
                    <Chip
                      label={formatFileSize(file.size)}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                    <Chip
                      label={file.content_type || 'Unknown'}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.6rem', height: 18 }}
                    />
                    {file.last_modified && (
                      <Chip
                        label={new Date(file.last_modified).toLocaleDateString()}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.6rem', height: 18 }}
                      />
                    )}
                  </Box>
                }
              />
              <ListItemSecondaryAction>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  {canPreview(file.content_type) && (
                    <Tooltip title="Preview">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFilePreview(file);
                        }}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Download">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFileDownload(file);
                      }}
                    >
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </ListItemSecondaryAction>
            </ListItem>
            {index < fileList.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  const renderFileCategory = (fileList: FileInfo[], categoryName: string, icon: React.ReactNode) => {
    const fileCount = fileList?.length || 0;
    
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ pb: compact ? 1 : 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            {icon}
            <Typography variant="h6" sx={{ ml: 1, flex: 1 }}>
              {categoryName}
            </Typography>
            <Chip
              label={`${fileCount} file${fileCount !== 1 ? 's' : ''}`}
              size="small"
              color={fileCount > 0 ? 'primary' : 'default'}
            />
          </Box>
          {renderFileList(fileList, categoryName)}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography variant="body2" sx={{ mt: 2 }}>
              Loading files...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" action={
            <Button size="small" onClick={fetchFiles}>
              Retry
            </Button>
          }>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!files) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No files found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Upload some files to see them here
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const totalFiles = (files.question_papers?.length || 0) + 
                    (files.submissions?.length || 0) + 
                    (files.answer_keys?.length || 0) + 
                    (files.original_files?.length || 0);

  if (totalFiles === 0) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No files uploaded
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Files will appear here once they are uploaded
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Box>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <FolderIcon sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            {title}
          </Typography>
          <Chip
            label={`${totalFiles} total file${totalFiles !== 1 ? 's' : ''}`}
            color="primary"
            variant="outlined"
          />
        </Box>

        {/* File Categories */}
        {showCategories ? (
          <>
            {files.question_papers && files.question_papers.length > 0 && 
              renderFileCategory(files.question_papers, "Question Papers", <DescriptionIcon color="primary" />)
            }
            
            {files.submissions && files.submissions.length > 0 && 
              renderFileCategory(files.submissions, "Submissions", <FileIcon color="secondary" />)
            }
            
            {files.answer_keys && files.answer_keys.length > 0 && 
              renderFileCategory(files.answer_keys, "Answer Keys", <DescriptionIcon color="success" />)
            }
            
            {files.original_files && files.original_files.length > 0 && 
              renderFileCategory(files.original_files, "Original Files", <FolderIcon color="info" />)
            }
          </>
        ) : (
          <Card>
            <CardContent>
              {/* Combined file list */}
              {renderFileList([
                ...(files.question_papers || []),
                ...(files.submissions || []),
                ...(files.answer_keys || []),
                ...(files.original_files || [])
              ], "Files")}
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Document Viewer */}
      <DocumentViewer
        file={selectedFile}
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false);
          setSelectedFile(null);
        }}
        assignmentId={assignmentId}
      />
    </>
  );
};

export default FileBrowser; 