import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  onFilesProcessed: (files: FileList) => void;
  isProcessing: boolean;
}

export function FileUpload({ onFilesProcessed, isProcessing }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      onFilesProcessed(files);
    }
  }, [onFilesProcessed]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesProcessed(files);
    }
  }, [onFilesProcessed]);

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className={`
          relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300
          ${isDragOver 
            ? 'border-purple-500 bg-purple-50 scale-105' 
            : 'border-gray-300 hover:border-purple-400'
          }
          ${isProcessing ? 'pointer-events-none opacity-60' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          id="file-upload"
          multiple
          accept=".json,.plist,.xml,.zip"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isProcessing}
        />
        
        <div className="space-y-6">
          <div className={`transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
            {isProcessing ? (
              <div className="animate-spin mx-auto w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
            ) : (
              <Upload className="mx-auto w-16 h-16 text-purple-600" />
            )}
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {isProcessing ? 'Processing Files...' : 'Upload Podcast Data'}
            </h3>
            <p className="text-gray-600 mb-6">
              Drag and drop your Apple Podcast data files here, or click to browse
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center justify-center space-x-2 p-3 bg-blue-50 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
              <span className="text-blue-700">JSON Files</span>
            </div>
            <div className="flex items-center justify-center space-x-2 p-3 bg-green-50 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
              <span className="text-green-700">PLIST/XML</span>
            </div>
            <div className="flex items-center justify-center space-x-2 p-3 bg-orange-50 rounded-lg">
              <FileText className="w-5 h-5 text-orange-600" />
              <span className="text-orange-700">ZIP Archives</span>
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-left">
                <h4 className="font-medium text-amber-800 mb-1">
                  Privacy First
                </h4>
                <p className="text-sm text-amber-700">
                  All processing happens locally in your browser. No data is uploaded to any server.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}