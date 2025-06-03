import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Typography, Button } from '@mui/material';
import ListAltIcon from '@mui/icons-material/ListAlt';

const CanvasGrading = () => {
  const [error, setError] = useState(null);

  return (
    <div>
      {/* Rest of the component content */}
      <Box sx={{ mt: 4, p: 2, border: '1px dashed #ccc', borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          Having Trouble with 404 Errors?
        </Typography>
        <Typography variant="body1" paragraph>
          If you're experiencing 404 Not Found errors when trying to access Canvas submissions, use our 
          Canvas Submission Processor to directly handle the JSON response from Canvas API.
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          component={Link}
          to="/canvas-processor"
          startIcon={<ListAltIcon />}
        >
          Go to Canvas Processor
        </Button>
      </Box>
    </div>
  );
};

export default CanvasGrading; 