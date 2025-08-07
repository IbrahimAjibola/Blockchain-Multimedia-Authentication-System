import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FiUpload, FiX, FiImage, FiVideo, FiMusic, FiFile, FiCheck, FiAlertCircle } from 'react-icons/fi';
import { toast } from 'react-hot-toast';

const FileUpload = ({ 
  onFileSelect, 
  maxSize = 100 * 1024 * 1024, 
  maxFiles = 10,
  acceptedTypes = {
    'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.tiff'],
    'video/*': ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
    'audio/*': ['.mp3', '.wav', '.flac', '.ogg', '.aac', '.m4a']
  },
  selectedFiles = []
}) => {
  const [files, setFiles] = useState(selectedFiles);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(({ file, errors }) => {
        errors.forEach((error) => {
          if (error.code === 'file-too-large') {
            toast.error(`${file.name} is too large. Maximum size is ${formatFileSize(maxSize)}.`);
          } else if (error.code === 'file-invalid-type') {
            toast.error(`${file.name} is not a supported file type.`);
          } else if (error.code === 'too-many-files') {
            toast.error(`Too many files. Maximum is ${maxFiles} files.`);
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
        status: 'pending',
        type: getFileType(file.type),
        size: formatFileSize(file.size)
      }));

      const updatedFiles = [...files, ...newFiles].slice(0, maxFiles);
      setFiles(updatedFiles);
      
      if (onFileSelect) {
        onFileSelect(updatedFiles);
      }

      toast.success(`${acceptedFiles.length} file(s) added successfully!`);
    }
  }, [files, onFileSelect, maxSize, maxFiles]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize,
    maxFiles,
    multiple: true
  });

  const removeFile = (fileId) => {
    const updatedFiles = files.filter(file => file.id !== fileId);
    setFiles(updatedFiles);
    
    if (onFileSelect) {
      onFileSelect(updatedFiles);
    }
  };

  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return FiImage;
      case 'video': return FiVideo;
      case 'audio': return FiMusic;
      default: return FiFile;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <FiCheck className="w-4 h-4 text-green-600" />;
      case 'error':
        return <FiAlertCircle className="w-4 h-4 text-red-600" />;
      case 'uploading':
        return <div className="loading-spinner-sm"></div>;
      default:
        return null;
    }
  };

  const getDropzoneClasses = () => {
    let classes = "file-upload-area ";
    
    if (isDragActive && !isDragReject) {
      classes += "file-upload-area-active";
    } else if (isDragReject) {
      classes += "file-upload-area-reject";
    } else {
      classes += "file-upload-area-default";
    }
    
    return classes;
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div {...getRootProps()} className={getDropzoneClasses()}>
        <input {...getInputProps()} />
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragActive && !isDragReject 
              ? 'bg-gradient-to-r from-blue-500 to-purple-500 scale-110' 
              : isDragReject 
              ? 'bg-gradient-to-r from-red-500 to-pink-500 scale-110'
              : 'bg-gradient-to-r from-gray-400 to-gray-500'
          }`}>
            <FiUpload className={`w-8 h-8 transition-all duration-300 ${
              isDragActive ? 'text-white' : 'text-white'
            }`} />
          </div>
          
          {isDragActive ? (
            isDragReject ? (
              <>
                <p className="text-xl font-semibold text-red-600 mb-2">
                  Some files are not supported
                </p>
                <p className="text-red-500">
                  Please check file types and sizes
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-blue-600 mb-2">
                  Drop files here
                </p>
                <p className="text-blue-500">
                  Release to upload
                </p>
              </>
            )
          ) : (
            <>
              <p className="text-xl font-semibold text-gray-900 mb-2">
                Drag & drop files here
              </p>
              <p className="text-gray-600 mb-4">
                or click to select files
              </p>
              <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5">
                <FiUpload className="w-4 h-4 mr-2" />
                Choose Files
              </div>
            </>
          )}
        </div>
      </div>

      {/* File Requirements */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
        <h4 className="font-semibold text-gray-900 mb-2">File Requirements</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium text-gray-900">Max Size:</span> {formatFileSize(maxSize)}
          </div>
          <div>
            <span className="font-medium text-gray-900">Max Files:</span> {maxFiles}
          </div>
          <div>
            <span className="font-medium text-gray-900">Supported:</span> Images, Videos, Audio
          </div>
        </div>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Selected Files ({files.length}/{maxFiles})
            </h3>
            <button
              onClick={() => {
                setFiles([]);
                if (onFileSelect) onFileSelect([]);
              }}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {files.map((fileObj) => {
              const IconComponent = getFileIcon(fileObj.type);
              
              return (
                <div
                  key={fileObj.id}
                  className={`flex items-center p-4 rounded-xl border-2 transition-all duration-200 ${
                    fileObj.status === 'success' ? 'border-green-200 bg-green-50' :
                    fileObj.status === 'error' ? 'border-red-200 bg-red-50' :
                    fileObj.status === 'uploading' ? 'border-blue-200 bg-blue-50' :
                    'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  {/* File Preview/Icon */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden mr-4 flex-shrink-0">
                    {fileObj.preview ? (
                      <img
                        src={fileObj.preview}
                        alt={fileObj.file.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center"
                      style={{ display: fileObj.preview ? 'none' : 'flex' }}
                    >
                      <IconComponent className="w-6 h-6 text-gray-400" />
                    </div>
                  </div>

                  {/* File Info */}
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">
                      {fileObj.file.name}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{fileObj.size}</span>
                      <span className="capitalize">{fileObj.type}</span>
                      {fileObj.status && fileObj.status !== 'pending' && (
                        <span className={`status-badge ${
                          fileObj.status === 'success' ? 'status-success' :
                          fileObj.status === 'error' ? 'status-error' :
                          fileObj.status === 'uploading' ? 'status-uploading' :
                          'status-pending'
                        }`}>
                          {fileObj.status}
                        </span>
                      )}
                    </div>
                    
                    {fileObj.error && (
                      <p className="text-red-600 text-sm mt-1">{fileObj.error}</p>
                    )}
                  </div>

                  {/* Status & Actions */}
                  <div className="flex items-center gap-3">
                    {getStatusIcon(fileObj.status)}
                    
                    <button
                      onClick={() => removeFile(fileObj.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      disabled={fileObj.status === 'uploading'}
                    >
                      <FiX className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Upload Progress Summary */}
          {files.some(f => f.status === 'uploading') && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-800 font-medium">Upload Progress</span>
                <span className="text-blue-600 text-sm">
                  {files.filter(f => f.status === 'success').length} / {files.length} completed
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${(files.filter(f => f.status === 'success').length / files.length) * 100}%` 
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUpload;