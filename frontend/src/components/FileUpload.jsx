import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiX, FiImage, FiVideo, FiMusic, FiFile } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const FileUpload = ({ onFileSelect, maxSize = 100 * 1024 * 1024, multiple = false }) => {
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            toast.error(`${file.name} is too large. Maximum size is 100MB.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name} is not a supported file type.`);
          } else {
            toast.error(`${file.name} was rejected: ${error.message}`);
          }
        });
      });
    }

    // Handle accepted files
    if (acceptedFiles.length > 0) {
      const newFiles = acceptedFiles.map(file => ({
        file,
        id: Math.random().toString(36).substr(2, 9),
        preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
        status: 'pending'
      }));

      setFiles(prev => multiple ? [...prev, ...newFiles] : newFiles);
      
      if (onFileSelect) {
        onFileSelect(multiple ? [...files, ...newFiles] : newFiles);
      }

      toast.success(`${acceptedFiles.length} file(s) selected successfully!`);
    }
  }, [files, multiple, onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.tiff'],
      'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
      'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a']
    },
    maxSize,
    multiple
  });

  const removeFile = (fileId) => {
    setFiles(prev => {
      const updatedFiles = prev.filter(f => f.id !== fileId);
      if (onFileSelect) {
        onFileSelect(updatedFiles);
      }
      return updatedFiles;
    });
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <FiImage className="w-6 h-6" />;
    if (fileType.startsWith('video/')) return <FiVideo className="w-6 h-6" />;
    if (fileType.startsWith('audio/')) return <FiMusic className="w-6 h-6" />;
    return <FiFile className="w-6 h-6" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (fileType) => {
    if (fileType.startsWith('image/')) return 'Image';
    if (fileType.startsWith('video/')) return 'Video';
    if (fileType.startsWith('audio/')) return 'Audio';
    return 'File';
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : isDragReject 
              ? 'border-red-500 bg-red-50' 
              : 'border-gray-300 hover:border-gray-400'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          <div className={`
            p-4 rounded-full
            ${isDragActive 
              ? 'bg-blue-100 text-blue-600' 
              : isDragReject 
                ? 'bg-red-100 text-red-600' 
                : 'bg-gray-100 text-gray-600'
            }
          `}>
            <FiUpload className="w-8 h-8" />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-900">
              {isDragActive 
                ? 'Drop files here' 
                : isDragReject 
                  ? 'Invalid file type' 
                  : 'Drag & drop files here'
              }
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to browse
            </p>
          </div>
          
          <div className="text-xs text-gray-400">
            <p>Supported formats: Images (JPEG, PNG, GIF, WebP, BMP, TIFF)</p>
            <p>Videos (MP4, AVI, MOV, WMV, FLV, WebM)</p>
            <p>Audio (MP3, WAV, FLAC, OGG, AAC)</p>
            <p>Maximum file size: 100MB</p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <h3 className="text-lg font-medium text-gray-900">
            Selected Files ({files.length})
          </h3>
          
          <div className="space-y-3">
            {files.map((fileObj) => (
              <div
                key={fileObj.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg shadow-sm"
              >
                <div className="flex items-center space-x-4">
                  {/* File Preview */}
                  {fileObj.preview ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                      <img
                        src={fileObj.preview}
                        alt={fileObj.file.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center">
                      {getFileIcon(fileObj.file.type)}
                    </div>
                  )}
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {fileObj.file.name}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{getFileType(fileObj.file.type)}</span>
                      <span>{formatFileSize(fileObj.file.size)}</span>
                      <span className={`
                        px-2 py-1 rounded-full text-xs font-medium
                        ${fileObj.status === 'pending' && 'bg-yellow-100 text-yellow-800'}
                        ${fileObj.status === 'uploading' && 'bg-blue-100 text-blue-800'}
                        ${fileObj.status === 'success' && 'bg-green-100 text-green-800'}
                        ${fileObj.status === 'error' && 'bg-red-100 text-red-800'}
                      `}>
                        {fileObj.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Remove Button */}
                <button
                  onClick={() => removeFile(fileObj.id)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors duration-200"
                  title="Remove file"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-6">
          <div className="bg-gray-100 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: '0%' }}>
              {/* Progress bar would be controlled by parent component */}
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-2 text-center">
            Uploading files...
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUpload; 