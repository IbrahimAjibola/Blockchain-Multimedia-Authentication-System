import React, { useState } from 'react';
import { useWeb3 } from './Web3Provider';
import FileUpload from './FileUpload';
import { toast } from 'react-hot-toast';
import { FiUpload, FiCheck, FiX, FiAlertCircle, FiInfo } from 'react-icons/fi';

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
          formDataToSend.append('tags', formData.tags);
          formDataToSend.append('licenseType', formData.licenseType);
          formDataToSend.append('licensePrice', formData.licensePrice);
          formDataToSend.append('optimize', formData.optimize);

          // Register with backend
          const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}` // You'll need to implement auth
            },
            body: formDataToSend
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          // Update file status to success
          const updatedFiles = selectedFiles.map((f, index) => 
            index === i ? { ...f, status: 'success' } : f
          );
          setSelectedFiles(updatedFiles);

          results.push({
            file: fileObj.file.name,
            success: true,
            data: result
          });

          toast.success(`${fileObj.file.name} registered successfully!`);

        } catch (error) {
          console.error(`Error registering ${fileObj.file.name}:`, error);
          
          // Update file status to error
          const updatedFiles = selectedFiles.map((f, index) => 
            index === i ? { ...f, status: 'error' } : f
          );
          setSelectedFiles(updatedFiles);

          results.push({
            file: fileObj.file.name,
            success: false,
            error: error.message
          });

          toast.error(`Failed to register ${fileObj.file.name}: ${error.message}`);
        }
      }

      setRegistrationResult({
        total: selectedFiles.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      });

      setRegistrationStep(2 + selectedFiles.length);

    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsRegistering(false);
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
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <FiAlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Wallet Not Connected
          </h2>
          <p className="text-yellow-700">
            Please connect your wallet to register multimedia content.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Register Multimedia Content
          </h1>
          <p className="text-gray-600">
            Upload your multimedia files to register them on the blockchain and mint NFTs.
          </p>
        </div>

        {/* Wallet Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Connected Wallet: {account}
              </p>
              <p className="text-sm text-blue-600">
                Balance: {formatBalance(balance)} ETH
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">Connected</span>
            </div>
          </div>
        </div>

        {!isRegistering ? (
          <>
            {/* File Upload */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Select Files
              </h2>
              <FileUpload
                onFileSelect={handleFileSelect}
                multiple={true}
                maxSize={100 * 1024 * 1024}
              />
            </div>

            {/* Registration Form */}
            {selectedFiles.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Content Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Original Creator */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Original Creator *
                    </label>
                    <input
                      type="text"
                      name="originalCreator"
                      value={formData.originalCreator}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter the original creator's name"
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
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Describe your content"
                    />
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tags
                    </label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter tags separated by commas"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">No License</option>
                      <option value="Personal">Personal Use</option>
                      <option value="Commercial">Commercial Use</option>
                      <option value="Educational">Educational Use</option>
                      <option value="Creative Commons">Creative Commons</option>
                    </select>
                  </div>

                  {/* License Price */}
                  {formData.licenseType && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        License Price (ETH)
                      </label>
                      <input
                        type="number"
                        name="licensePrice"
                        value={formData.licensePrice}
                        onChange={handleInputChange}
                        step="0.001"
                        min="0"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.01"
                      />
                    </div>
                  )}

                  {/* Optimize Images */}
                  <div className="md:col-span-2">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="optimize"
                        checked={formData.optimize}
                        onChange={handleInputChange}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Optimize images for web (recommended)
                      </span>
                    </label>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                  >
                    Reset
                  </button>
                  <button
                    onClick={registerContent}
                    disabled={selectedFiles.length === 0}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
                  >
                    <FiUpload className="w-4 h-4" />
                    <span>Register Content</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Registration Progress */
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiUpload className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Registering Content
              </h2>
              <p className="text-gray-600">
                Step {registrationStep} of {2 + selectedFiles.length}
              </p>
            </div>

            <div className="space-y-4">
              {selectedFiles.map((fileObj, index) => (
                <div
                  key={fileObj.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {fileObj.status === 'pending' && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    )}
                    {fileObj.status === 'uploading' && (
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    )}
                    {fileObj.status === 'success' && (
                      <FiCheck className="w-4 h-4 text-green-600" />
                    )}
                    {fileObj.status === 'error' && (
                      <FiX className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                      {fileObj.file.name}
                    </span>
                  </div>
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
              ))}
            </div>
          </div>
        )}

        {/* Registration Result */}
        {registrationResult && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FiInfo className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Registration Complete
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900">
                  {registrationResult.total}
                </div>
                <div className="text-sm text-gray-600">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {registrationResult.successful}
                </div>
                <div className="text-sm text-gray-600">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {registrationResult.failed}
                </div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
            </div>

            <div className="space-y-3">
              {registrationResult.results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">
                      {result.file}
                    </span>
                    {result.success ? (
                      <FiCheck className="w-5 h-5 text-green-600" />
                    ) : (
                      <FiX className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  {result.success && result.data && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Token ID: {result.data.asset.tokenId}</p>
                      <p>Transaction: {result.data.blockchain.transactionHash}</p>
                      <p>IPFS Hash: {result.data.asset.ipfsHash}</p>
                    </div>
                  )}
                  {!result.success && (
                    <div className="mt-2 text-sm text-red-600">
                      Error: {result.error}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={resetForm}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Register More Content
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentRegistration; 