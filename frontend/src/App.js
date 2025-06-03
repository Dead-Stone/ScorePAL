import CanvasSubmissionProcessor from './components/CanvasSubmissionProcessor';

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex' }}>
          <SideNav isOpen={sideNavOpen} toggleSideNav={toggleSideNav} />
          <Box
            component="main"
            sx={{
              flexGrow: 1,
              p: 3,
              width: { sm: `calc(100% - ${sideNavWidth}px)` },
              ml: { sm: `${sideNavWidth}px` },
              transition: (theme) =>
                theme.transitions.create(['margin', 'width'], {
                  easing: theme.transitions.easing.sharp,
                  duration: theme.transitions.duration.leavingScreen,
                }),
              ...(sideNavOpen && {
                width: { sm: `calc(100% - ${sideNavWidth}px)` },
                ml: { sm: `${sideNavWidth}px` },
                transition: (theme) =>
                  theme.transitions.create(['margin', 'width'], {
                    easing: theme.transitions.easing.easeOut,
                    duration: theme.transitions.duration.enteringScreen,
                  }),
              }),
            }}
          >
            <Box sx={{ marginTop: '64px' }}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/agentic-grading" element={<AgenticGrading />} />
                <Route path="/batch-upload" element={<BatchUpload />} />
                <Route path="/canvas-grading" element={<CanvasGrading />} />
                <Route path="/canvas-processor" element={<CanvasSubmissionProcessor />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/help" element={<Help />} />
              </Routes>
            </Box>
          </Box>
        </Box>
      </ThemeProvider>
    </Router>
  );
}

export default App; 