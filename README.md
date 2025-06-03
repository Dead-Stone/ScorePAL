# ScorePAL

ScorePAL (Score Processing and Assessment with AI Learning) is an advanced AI-powered grading system for educators that streamlines the assessment process for written assignments.

## Features

- **AI-Powered Grading**: Uses Google's Gemini AI to provide consistent, objective grading based on customizable rubrics
- **Single or Batch Grading**: Grade individual submissions or entire classes at once
- **Customizable Rubrics**: Create and reuse detailed rubrics with specific criteria and scoring levels
- **Adjustable Strictness**: Control grading severity to match your teaching philosophy
- **Detailed Feedback**: Provides comprehensive feedback for each criterion and overall assessment
- **Analytics**: View class performance metrics and grade distributions
- **Canvas LMS Integration**: Connect to Canvas to automatically grade assignments from your courses
- **Export Options**: Download results in various formats for record-keeping

## Project Structure

The project is organized into two main directories:

- **backend/**: Contains all Python code for the API server, AI grading logic, and data processing
- **frontend/**: Contains the Next.js frontend application

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 14+ and npm
- Google Gemini API key
- Canvas LMS API key (optional, for Canvas integration)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/scorepal.git
   cd scorepal
   ```

2. Install Python dependencies:
   ```
   pip install -r backend/requirements.txt
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with:
   ```
   GEMINI_API_KEY=your_api_key_here
   ```

4. Install frontend dependencies:
   ```
   cd frontend
   npm install
   ```

### Running the Application

Start the entire application:
```
python start.py
```

This will launch both the backend API server and the frontend application. The application will be available at http://localhost:3000.

To run components individually:

- Backend only: `python -m backend.api`
- Frontend only: `cd frontend && npm run dev`

## Usage

1. **Home Page**: Choose between single submission or batch grading
2. **Single Submission**: Upload a question paper, student submission, and optional answer key
3. **Batch Grading**: Upload a question paper, ZIP file of student submissions, and optional answer key
4. **Rubrics**: Create and manage rubrics for your assignments
5. **Canvas Integration**: Connect to Canvas LMS to auto-grade assignments directly from your courses
6. **Results**: View detailed grading results and analytics

## Canvas LMS Integration

ScorePAL integrates with Canvas LMS to streamline the grading process:

1. Connect to your Canvas instance using your Canvas URL and API key
2. Browse your courses and assignments
3. Select an assignment to auto-grade all student submissions
4. Review grading results and post grades back to Canvas

To use this feature, you'll need:
- A Canvas instance URL (e.g., https://canvas.instructure.com)
- An API key from your Canvas account
- Instructor-level access to the courses you want to grade

## Customizing Rubrics

Rubrics can be customized with:
- Multiple criteria, each with its own point value and weight
- Performance levels for each criterion
- Detailed descriptions for each level

You can also adjust the grading strictness to control how rigorously submissions are evaluated.

## File Support

ScorePAL supports the following file formats:
- PDF (.pdf)
- Word documents (.docx)
- Text files (.txt)
- Submissions ZIP (for batch grading)

## Troubleshooting

If you encounter issues:

1. Check your API key in the `.env` file
2. Ensure all dependencies are installed
3. Check the console for error messages
4. Make sure your submission files are in a supported format
5. For Canvas integration issues, verify your Canvas API key and permissions

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgements

- Google Gemini for AI capabilities
- Canvas LMS for the integration API
- Next.js and Material UI for the frontend
- FastAPI for the backend
- All contributors and educators who provided feedback 