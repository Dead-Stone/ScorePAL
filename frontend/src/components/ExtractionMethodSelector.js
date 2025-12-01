import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Alert, AlertDescription } from './ui/alert';
import { CheckCircle, AlertCircle, Clock, Zap, Brain } from 'lucide-react';

const ExtractionMethodSelector = ({ onMethodChange, onExtractionComplete }) => {
  const [methods, setMethods] = useState({});
  const [selectedMethod, setSelectedMethod] = useState('ocr_traditional');
  const [isLoading, setIsLoading] = useState(false);
  const [extractionResult, setExtractionResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExtractionMethods();
  }, []);

  const fetchExtractionMethods = async () => {
    try {
      const response = await fetch('/api/extraction-methods');
      if (response.ok) {
        const data = await response.json();
        setMethods(data.methods);
        setSelectedMethod(data.recommended);
      }
    } catch (error) {
      console.error('Failed to fetch extraction methods:', error);
    }
  };

  const handleMethodChange = (method) => {
    setSelectedMethod(method);
    setExtractionResult(null);
    setError(null);
    onMethodChange?.(method);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setExtractionResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', selectedMethod);
    formData.append('file_type', 'networking_homework');

    try {
      const response = await fetch('/api/extract-with-ai', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setExtractionResult(result);
        onExtractionComplete?.(result);
      } else {
        setError(result.detail || 'Extraction failed');
      }
    } catch (error) {
      setError('Network error: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getMethodIcon = (method) => {
    switch (method) {
      case 'ai_gemini_2.5_flash':
        return <Brain className="w-5 h-5" />;
      case 'ocr_traditional':
        return <Zap className="w-5 h-5" />;
      default:
        return <CheckCircle className="w-5 h-5" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'bg-green-500';
    if (confidence >= 0.75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Extraction Method Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(methods).map(([key, method]) => (
              <Card
                key={key}
                className={`cursor-pointer transition-all ${
                  selectedMethod === key
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => handleMethodChange(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    {getMethodIcon(key)}
                    <div>
                      <h3 className="font-semibold">{method.name}</h3>
                      <p className="text-sm text-gray-600">{method.description}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Confidence Threshold:</span>
                      <Badge variant={method.available ? 'default' : 'secondary'}>
                        {(method.confidence_threshold * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Speed:</span>
                      <Badge variant="outline">{method.processing_speed}</Badge>
                    </div>
                    
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <Badge variant={method.available ? 'default' : 'destructive'}>
                        {method.available ? 'Available' : 'Unavailable'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>File Upload & Extraction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select PDF File
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={isLoading}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            {isLoading && (
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Extracting content with {methods[selectedMethod]?.name}...
                  This may take a few moments.
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {extractionResult && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Extraction completed successfully!
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Extraction Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Method:</span>
                        <Badge variant="outline">
                          {extractionResult.method}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Confidence Score:</span>
                          <div className="flex items-center gap-2">
                            <Progress 
                              value={extractionResult.confidence_score * 100} 
                              className="w-24"
                            />
                            <span className="text-sm font-medium">
                              {(extractionResult.confidence_score * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className={`w-full h-2 rounded-full ${getConfidenceColor(extractionResult.confidence_score)}`} />
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-medium">Processing Time:</span>
                        <Badge variant="outline">
                          {extractionResult.processing_time.toFixed(2)}s
                        </Badge>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-medium">Content Length:</span>
                        <Badge variant="outline">
                          {extractionResult.content.length} characters
                        </Badge>
                      </div>

                      <div className="mt-4">
                        <h4 className="font-medium mb-2">Extracted Content Preview:</h4>
                        <div className="bg-gray-50 p-3 rounded-md max-h-40 overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap">
                            {extractionResult.content.substring(0, 500)}
                            {extractionResult.content.length > 500 && '...'}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExtractionMethodSelector; 