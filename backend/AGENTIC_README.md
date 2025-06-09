# Multi-Agentic Grading Framework

This project has been enhanced with a multi-agentic framework that manages the grading process using specialized agents working in coordination.

## Architecture Overview

The system uses multiple specialized agents that work together to handle different aspects of the grading workflow:

### Agents

1. **CoordinatorAgent** - Orchestrates the entire grading workflow
2. **PreprocessingAgent** - Handles file processing and text extraction
3. **AnswerKeyAgent** - Generates and manages answer keys
4. **GradingAgent** - Grades individual submissions

### Tools

Each agent can use specialized tools to accomplish their tasks:

1. **FileProcessingTool** - Extracts text from various file formats
2. **GeminiTool** - Interfaces with Google Gemini API for AI operations
3. **CanvasTool** - Handles Canvas LMS interactions

## How It Works

### Workflow Process

1. **Initialization**: The agentic system starts all agents in background processes
2. **Task Coordination**: The CoordinatorAgent receives grading requests and breaks them down into tasks
3. **Agent Communication**: Agents communicate through a message-passing system
4. **Parallel Processing**: Different aspects of grading are handled concurrently by specialized agents
5. **Result Aggregation**: The coordinator collects results from all agents and provides the final output

### Message Flow

```
Frontend Request → CoordinatorAgent → Task Distribution → Specialized Agents → Tools → Results → CoordinatorAgent → Response
```

### Example Workflow: Canvas Assignment Grading

1. **Input**: Course ID, Assignment ID, Selected Students
2. **Step 1**: CoordinatorAgent requests Canvas data via CanvasTool
3. **Step 2**: PreprocessingAgent extracts text from submission files
4. **Step 3**: AnswerKeyAgent generates answer key if needed
5. **Step 4**: GradingAgent grades each submission using the rubric
6. **Step 5**: CoordinatorAgent aggregates results and saves them
7. **Output**: Grading results with scores and feedback

## Key Features

### Scalability
- Agents run asynchronously and can process multiple tasks concurrently
- Easy to add new agents for additional functionality
- Load can be distributed across different agents

### Reliability
- Each agent handles errors independently
- Fallback mechanisms to traditional grading if agentic system fails
- Retry logic and timeout handling

### Extensibility
- New agents can be easily added for specific tasks
- Tools can be shared between agents
- Custom workflows can be defined

### Monitoring
- Workflow status tracking
- Real-time monitoring of agent activities
- Detailed logging and error reporting

## Integration with Existing System

The agentic framework is designed to work alongside the existing system:

- **Backward Compatibility**: All existing endpoints continue to work
- **Gradual Migration**: Can switch between traditional and agentic processing
- **Frontend Unchanged**: The frontend doesn't need significant modifications

## API Endpoints

### Agentic-Specific Endpoints

1. **GET /api/canvas/workflow-status/{workflow_id}** - Get workflow status
2. **GET /api/canvas/workflows** - Get all tracked workflows
3. **POST /api/canvas/start-agentic-grading** - Start agentic grading workflow
4. **POST /api/canvas/initialize-agentic-system** - Initialize the agentic system
5. **POST /api/canvas/shutdown-agentic-system** - Shutdown the agentic system

### Modified Endpoints

- Canvas service creation now uses agentic framework by default
- Existing grading endpoints can fallback to traditional methods if needed

## Configuration

### Environment Variables

```bash
GEMINI_API_KEY=your_gemini_api_key
CANVAS_URL=your_canvas_url
CANVAS_API_KEY=your_canvas_api_key
```

### Agentic System Settings

The system can be configured to use traditional or agentic processing:

```python
# Use agentic framework (default)
canvas_service = create_canvas_service(
    canvas_url=url,
    canvas_api_key=api_key,
    gemini_api_key=gemini_key,
    use_agentic=True
)

# Use traditional processing
canvas_service = create_canvas_service(
    canvas_url=url,
    canvas_api_key=api_key,
    gemini_api_key=gemini_key,
    use_agentic=False
)
```

## Benefits

### For Students
- Faster grading due to parallel processing
- More consistent feedback across submissions
- Detailed rubric-based evaluation

### For Instructors
- Automated workflow management
- Real-time status updates
- Scalable grading for large classes

### For Developers
- Modular architecture for easy maintenance
- Clear separation of concerns
- Easy to add new features and agents

## Technical Details

### Agent Communication

Agents communicate using a message-passing system with these message types:
- `TASK_REQUEST` - Request to execute a task
- `TASK_RESPONSE` - Response with task results
- `STATUS_UPDATE` - Progress updates
- `ERROR` - Error notifications
- `COORDINATION` - Coordination between agents

### Task Management

Tasks are managed with the following statuses:
- `PENDING` - Task is queued
- `IN_PROGRESS` - Task is being executed
- `COMPLETED` - Task finished successfully
- `FAILED` - Task failed with error
- `CANCELLED` - Task was cancelled

### Error Handling

The system includes comprehensive error handling:
- Individual agent failures don't crash the entire system
- Automatic fallback to traditional processing
- Detailed error logging and reporting
- Graceful degradation of functionality

## Future Enhancements

### Planned Features

1. **LoadBalancerAgent** - Distribute work across multiple grading agents
2. **QualityAssuranceAgent** - Review and validate grading results
3. **NotificationAgent** - Send updates to instructors and students
4. **AnalyticsAgent** - Generate insights and reports
5. **CacheAgent** - Cache frequently used data and results

### Potential Improvements

1. **Dynamic Scaling** - Automatically scale agents based on load
2. **Machine Learning** - Learn from grading patterns to improve accuracy
3. **Multi-Modal Processing** - Handle video, audio, and interactive submissions
4. **Collaborative Grading** - Multiple instructors working together
5. **Real-time Collaboration** - Live grading sessions with multiple participants

## Troubleshooting

### Common Issues

1. **Agentic System Not Starting**
   - Check Gemini API key is valid
   - Ensure all dependencies are installed
   - Check logs for initialization errors

2. **Workflow Timeouts**
   - Increase timeout values in configuration
   - Check network connectivity
   - Monitor agent resource usage

3. **Fallback to Traditional Processing**
   - This is normal behavior when agentic system encounters issues
   - Check agentic system status endpoints
   - Review error logs for root cause

### Debugging

Use the monitoring endpoints to debug issues:

```bash
# Check workflow status
curl GET /api/canvas/workflow-status/{workflow_id}

# Check all workflows
curl GET /api/canvas/workflows

# Initialize system manually
curl POST /api/canvas/initialize-agentic-system
```

## Performance Considerations

### Resource Usage
- Each agent runs in its own async context
- Memory usage scales with number of concurrent workflows
- CPU usage distributed across agents

### Optimization Tips
1. Monitor workflow completion times
2. Adjust agent timeout values based on typical task duration
3. Consider implementing agent pooling for high-load scenarios
4. Use caching for frequently accessed data

## Security

### Considerations
- Agent communication is internal to the system
- API keys are handled securely by individual tools
- No sensitive data is logged in plain text
- All external API calls use proper authentication

### Best Practices
1. Regularly rotate API keys
2. Monitor agent activity for unusual patterns
3. Implement rate limiting for external API calls
4. Use environment variables for sensitive configuration

---

This multi-agentic framework provides a solid foundation for scalable, reliable, and extensible automated grading while maintaining compatibility with existing systems. 