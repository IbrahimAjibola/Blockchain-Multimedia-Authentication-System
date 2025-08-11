import React, { useState } from 'react';
import { useWeb3 } from './Web3Provider';
import FileUpload from './FileUpload';
import { toast } from 'react-hot-toast';
import { FiUpload, FiCheck, FiX, FiAlertCircle, FiInfo, FiUser, FiTag, FiDollarSign, FiSettings } from 'react-icons/fi';

const ContentRegistration = () => {
  const { account, isConnected, mintAsset, formatBalance, balance } = useWeb3();
  
  const [formData, setFormData] = useState({
    originalCreator: '',
    description: '',
    tags: '',
    licenseType: '',
    licensePrice: '',
    optimize: false
  });

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationStep, setRegistrationStep] = useState(0);
  const [registrationResult, setRegistrationResult] = useState(null);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileSelect = (files) => {
    setSelectedFiles(files);
  };

  const validateForm = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select at least one file to register.');
      return false;
    }

    if (!formData.originalCreator.trim()) {
      toast.error('Please enter the original creator name.');
      return false;
    }

    if (formData.licenseType && !formData.licensePrice) {
      toast.error('Please enter a license price when setting a license type.');
      return false;
    }

    if (formData.licensePrice && parseFloat(formData.licensePrice) < 0) {
      toast.error('License price must be a positive number.');
      return false;
    }

    return true;
  };

  const registerContent = async () => {
    if (!validateForm()) return;

    setIsRegistering(true);
    setRegistrationStep(1);

    try {
      const results = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const fileObj = selectedFiles[i];
        setRegistrationStep(2 + i);

        // Update file status
        const updatedFiles = selectedFiles.map((f, index) => 
          index === i ? { ...f, status: 'uploading' } : f
        );
        setSelectedFiles(updatedFiles);

        try {
          // Create FormData for API
          const formDataToSend = new FormData();
          formDataToSend.append('file', fileObj.file);
          formDataToSend.append('originalCreator', formData.originalCreator);
          formDataToSend.append('description', formData.description);
          
          // Convert tags string to array
          const tagsArray = formData.tags ? formData.tags.split(',').map(tag => tag.trim()) : [];
          formDataToSend.append('tags', JSON.stringify(tagsArray));
          
          formDataToSend.append('licenseType', formData.licenseType);
          formDataToSend.append('licensePrice', formData.licensePrice);
          formDataToSend.append('optimize', formData.optimize);

          // Register with backend
          const token = localStorage.getItem('token');
          if (!token) {
            throw new Error('Authentication required. Please connect your wallet first.');
          }

          console.log('Sending registration request:', {
            file: fileObj.file.name,
            size: fileObj.file.size,
            type: fileObj.file.type,
            token: token ? 'present' : 'missing'
          });

          const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
              // Note: Don't set Content-Type for FormData, let browser set it with boundary
            },
            body: formDataToSend
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('Registration error response:', {
              status: response.status,
              statusText: response.statusText,
              body: errorText
            });
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
          }

          const result = await response.json();
          
          // Debug: Log the response structure
          console.log('Registration response:', result);

          // Update file status to success
          const successFiles = selectedFiles.map((f, index) => 
            index === i ? { ...f, status: 'success', result } : f
          );
          setSelectedFiles(successFiles);

          results.push({
            file: fileObj.file.name,
            success: true,
            result
          });

          toast.success(`${fileObj.file.name} registered successfully!`);

        } catch (error) {
          console.error(`Error registering ${fileObj.file.name}:`, error);
          
          // Update file status to error
          const errorFiles = selectedFiles.map((f, index) => 
            index === i ? { ...f, status: 'error', error: error.message } : f
          );
          setSelectedFiles(errorFiles);

          results.push({
            file: fileObj.file.name,
            success: false,
            error: error.message
          });

          toast.error(`Failed to register ${fileObj.file.name}: ${error.message}`);
        }
      }

      setRegistrationResult({
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      });

      if (results.every(r => r.success)) {
        toast.success(`All ${results.length} files registered successfully!`);
      } else if (results.some(r => r.success)) {
        toast.success(`${results.filter(r => r.success).length} files registered successfully!`);
      }

    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
      setRegistrationStep(0);
    }
  };

  const resetForm = () => {
    setFormData({
      originalCreator: '',
      description: '',
      tags: '',
      licenseType: '',
      licensePrice: '',
      optimize: false
    });
    setSelectedFiles([]);
    setRegistrationResult(null);
    setRegistrationStep(0);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiAlertCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Wallet Connection Required</h2>
            <p className="text-xl text-gray-600 mb-8">
              Please connect your wallet to register multimedia content on the blockchain.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FiUpload className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Register Content
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Upload and register your multimedia files as NFTs on the blockchain with complete provenance tracking
          </p>
        </div>

        {/* Account Info */}
        <div className="card-modern mb-8 animate-slide-down">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connected Account</h3>
              <p className="text-gray-600 font-mono text-sm">{account}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Balance</p>
              <p className="text-lg font-semibold text-gradient-blue">{formatBalance(balance)} ETH</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* File Upload Section */}
          <div className="space-y-6">
            <div className="card-modern animate-slide-left">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <FiUpload className="w-6 h-6 mr-3 text-gradient-blue" />
                Upload Files
              </h2>
              <FileUpload 
                onFileSelect={handleFileSelect}
                selectedFiles={selectedFiles}
                maxFiles={10}
                acceptedTypes={{
                  'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
                  'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
                  'audio/*': ['.mp3', '.wav', '.m4a', '.flac']
                }}
              />
            </div>

            {/* Registration Progress */}
            {isRegistering && (
              <div className="card animate-scale-in">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Registration Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="loading-spinner mr-3"></div>
                    <span className="text-gray-700">
                      Step {registrationStep}: {
                        registrationStep === 1 ? 'Preparing files...' :
                        registrationStep === 2 ? 'Uploading to IPFS...' :
                        `Registering file ${registrationStep - 1}...`
                      }
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, (registrationStep / (selectedFiles.length + 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Section */}
          <div className="space-y-6">
            <div className="card-modern animate-slide-right">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <FiInfo className="w-6 h-6 mr-3 text-gradient-purple" />
                Content Details
              </h2>
              
              <div className="space-y-6">
                {/* Original Creator */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiUser className="w-4 h-4 mr-2" />
                    Original Creator *
                  </label>
                  <input
                    type="text"
                    name="originalCreator"
                    value={formData.originalCreator}
                    onChange={handleInputChange}
                    className="input-modern focus-modern"
                    placeholder="Enter creator name"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="input-field resize-none"
                    placeholder="Describe your content..."
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiTag className="w-4 h-4 mr-2" />
                    Tags
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleInputChange}
                    className="input-modern focus-modern"
                    placeholder="art, photography, music (comma-separated)"
                  />
                </div>

                {/* License Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    License Type
                  </label>
                  <select
                    name="licenseType"
                    value={formData.licenseType}
                    onChange={handleInputChange}
                    className="input-modern focus-modern"
                  >
                    <option value="">Select license type</option>
                    <option value="CC0">CC0 (Public Domain)</option>
                    <option value="CC-BY">CC BY (Attribution)</option>
                    <option value="CC-BY-SA">CC BY-SA (Attribution-ShareAlike)</option>
                    <option value="CC-BY-NC">CC BY-NC (Attribution-NonCommercial)</option>
                    <option value="Commercial">Commercial License</option>
                    <option value="Custom">Custom License</option>
                  </select>
                </div>

                {/* License Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
                    <FiDollarSign className="w-4 h-4 mr-2" />
                    License Price (ETH)
                  </label>
                  <input
                    type="number"
                    name="licensePrice"
                    value={formData.licensePrice}
                    onChange={handleInputChange}
                    step="0.001"
                    min="0"
                    className="input-modern focus-modern"
                    placeholder="0.001"
                  />
                </div>

                {/* Optimization */}
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="optimize"
                    id="optimize"
                    checked={formData.optimize}
                    onChange={handleInputChange}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                  />
                  <label htmlFor="optimize" className="ml-2 text-sm font-medium text-gray-700 flex items-center">
                    <FiSettings className="w-4 h-4 mr-2" />
                    Optimize files for web
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="card-modern animate-slide-up">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={registerContent}
                  disabled={isRegistering || selectedFiles.length === 0}
                  className="btn-primary hover-lift flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRegistering ? (
                    <>
                      <div className="loading-spinner-sm mr-2"></div>
                      Registering...
                    </>
                  ) : (
                    <>
                      <FiUpload className="w-4 h-4 mr-2" />
                      Register Content
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetForm}
                  disabled={isRegistering}
                  className="btn-modern hover-scale"
                >
                  Reset Form
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Results */}
        {registrationResult && (
          <div className="mt-8 card animate-scale-in">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <FiCheck className="w-5 h-5 mr-2 text-green-600" />
              Registration Complete
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                <div className="text-2xl font-bold text-green-800">{registrationResult.success}</div>
                <div className="text-green-600">Files Registered</div>
              </div>
              
              {registrationResult.failed > 0 && (
                <div className="bg-gradient-to-r from-red-50 to-red-100 p-4 rounded-xl border border-red-200">
                  <div className="text-2xl font-bold text-red-800">{registrationResult.failed}</div>
                  <div className="text-red-600">Failed</div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {registrationResult.results.map((result, index) => (
                <div 
                  key={index}
                  className={`p-4 rounded-xl border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {result.success ? (
                        <FiCheck className="w-5 h-5 text-green-600 mr-2" />
                      ) : (
                        <FiX className="w-5 h-5 text-red-600 mr-2" />
                      )}
                      <span className="font-medium">{result.file}</span>
                    </div>
                    <span className={`status-badge ${
                      result.success ? 'status-success' : 'status-error'
                    }`}>
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </div>
                  
                  {result.error && (
                    <p className="text-red-600 text-sm mt-2">{result.error}</p>
                  )}
                  
                  {result.result && (
                    <div className="text-sm text-gray-600 mt-2">
                      <p>IPFS Hash: {result.result.ipfs?.fileHash || result.result.asset?.ipfsHash || 'Not available'}</p>
                      {result.result.blockchain?.tokenId && (
                        <p>Token ID: {result.result.blockchain.tokenId}</p>
                      )}
                      {result.result.asset?.gatewayUrl && (
                        <p className="break-all">
                          <a 
                            href={result.result.asset.gatewayUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            View on IPFS Gateway
                          </a>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentRegistration;