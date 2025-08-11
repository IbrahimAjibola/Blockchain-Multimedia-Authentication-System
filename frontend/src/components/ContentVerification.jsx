import React, { useState } from 'react';
import { useWeb3 } from './Web3Provider';
import FileUpload from './FileUpload';
import { toast } from 'react-hot-toast';
import { FiSearch, FiCheck, FiX, FiAlertCircle, FiInfo, FiShield, FiEye, FiHash, FiUpload } from 'react-icons/fi';

const ContentVerification = () => {
  const { account, isConnected, checkIPFSHashExists, getAsset } = useWeb3();
  
  const [verificationMethod, setVerificationMethod] = useState('file'); // 'file' or 'hash'
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [hashInput, setHashInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);

  const handleFileSelect = (files) => {
    setSelectedFiles(files);
  };

  const handleHashInputChange = (e) => {
    setHashInput(e.target.value);
  };

  const verifyByFile = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select a file to verify.');
      return;
    }

    setIsVerifying(true);

    try {
      const results = [];

      for (const fileObj of selectedFiles) {
        try {
          // Create FormData for API
          const formData = new FormData();
          formData.append('file', fileObj.file);
          formData.append('verifyOnBlockchain', 'true');

          // Verify with backend
          const response = await fetch('/api/verify', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}` // You'll need to implement auth
            },
            body: formData
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();

          results.push({
            file: fileObj.file.name,
            success: true,
            ...result
          });

          toast.success(`${fileObj.file.name} verification complete!`);

        } catch (error) {
          console.error(`Error verifying ${fileObj.file.name}:`, error);
          
          results.push({
            file: fileObj.file.name,
            success: false,
            error: error.message,
            status: 'error'
          });

          toast.error(`Failed to verify ${fileObj.file.name}: ${error.message}`);
        }
      }

      setVerificationResult({
        method: 'file',
        results
      });

    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyByHash = async () => {
    if (!hashInput.trim()) {
      toast.error('Please enter a hash to verify.');
      return;
    }

    setIsVerifying(true);

    try {
      // Verify hash using backend API
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication required. Please connect your wallet first.');
      }

      const response = await fetch('/api/verify/hash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ipfsHash: hashInput
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();

      if (result.success) {
        setVerificationResult({
          method: 'hash',
          results: [{
            hash: hashInput,
            success: true,
            status: 'verified',
            exists: true,
            assetDetails: result.asset,
            message: 'Hash found in database'
          }]
        });

        toast.success('Hash verified successfully!');
      } else {
        setVerificationResult({
          method: 'hash',
          results: [{
            hash: hashInput,
            success: false,
            status: 'not_found',
            exists: false,
            message: 'Hash not found in database'
          }]
        });

        toast.error('Hash not found in database.');
      }

    } catch (error) {
      console.error('Hash verification error:', error);
      
      setVerificationResult({
        method: 'hash',
        results: [{
          hash: hashInput,
          success: false,
          status: 'error',
          error: error.message,
          message: 'Error verifying hash'
        }]
      });

      toast.error('Hash verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setSelectedFiles([]);
    setHashInput('');
    setVerificationResult(null);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiAlertCircle className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Wallet Connection Required</h2>
            <p className="text-xl text-gray-600 mb-8">
              Please connect your wallet to verify multimedia content on the blockchain.
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FiShield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Verify Content
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Verify the authenticity and provenance of multimedia files using blockchain verification
          </p>
        </div>

        {/* Verification Method Selection */}
        <div className="card-modern mb-8 animate-slide-down">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Verification Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setVerificationMethod('file')}
              className={`p-8 rounded-2xl border-2 transition-all duration-300 hover-lift ${
                verificationMethod === 'file'
                  ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FiUpload className={`w-10 h-10 mx-auto mb-4 ${
                verificationMethod === 'file' ? 'text-blue-600' : 'text-gray-400'
              }`} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload File</h3>
              <p className="text-gray-600">Upload a file to check if it exists on the blockchain</p>
            </button>

            <button
              onClick={() => setVerificationMethod('hash')}
              className={`p-8 rounded-2xl border-2 transition-all duration-300 hover-lift ${
                verificationMethod === 'hash'
                  ? 'border-green-500 bg-gradient-to-br from-green-50 to-green-100 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FiHash className={`w-10 h-10 mx-auto mb-4 ${
                verificationMethod === 'hash' ? 'text-green-600' : 'text-gray-400'
              }`} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Hash</h3>
              <p className="text-gray-600">Enter an IPFS hash to verify its existence on blockchain</p>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Verification Input */}
          <div className="space-y-6">
            {verificationMethod === 'file' ? (
              <div className="card-modern animate-slide-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FiUpload className="w-6 h-6 mr-3 text-gradient-blue" />
                  Upload File to Verify
                </h2>
                <FileUpload 
                  onFileSelect={handleFileSelect}
                  selectedFiles={selectedFiles}
                  maxFiles={5}
                  acceptedTypes={{
                    'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
                    'video/*': ['.mp4', '.mov', '.avi', '.mkv'],
                    'audio/*': ['.mp3', '.wav', '.m4a', '.flac']
                  }}
                />
              </div>
            ) : (
              <div className="card-modern animate-slide-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                  <FiHash className="w-6 h-6 mr-3 text-gradient-green" />
                  Enter IPFS Hash
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    IPFS Hash
                  </label>
                  <input
                    type="text"
                    value={hashInput}
                    onChange={handleHashInputChange}
                    className="input-modern focus-modern"
                    placeholder="QmXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  />
                  <p className="text-sm text-gray-500 mt-2">
                    Enter the IPFS hash you want to verify on the blockchain
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="card-modern animate-slide-up">
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={verificationMethod === 'file' ? verifyByFile : verifyByHash}
                  disabled={
                    isVerifying || 
                    (verificationMethod === 'file' && selectedFiles.length === 0) ||
                    (verificationMethod === 'hash' && !hashInput.trim())
                  }
                  className="btn-primary hover-lift flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isVerifying ? (
                    <>
                      <div className="loading-spinner-sm mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    <>
                      <FiSearch className="w-4 h-4 mr-2" />
                      Verify Content
                    </>
                  )}
                </button>
                
                <button
                  onClick={resetVerification}
                  disabled={isVerifying}
                  className="btn-modern hover-scale"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          {/* Verification Progress & Info */}
          <div className="space-y-6">
            {/* Account Info */}
            <div className="card-modern animate-slide-right">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Connected Account</h3>
              <p className="text-gray-600 font-mono text-sm break-all">{account}</p>
            </div>

            {/* Verification Progress */}
            {isVerifying && (
              <div className="card animate-scale-in">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Verification in Progress</h3>
                <div className="flex items-center">
                  <div className="loading-spinner mr-3"></div>
                  <span className="text-gray-700">
                    {verificationMethod === 'file' 
                      ? 'Analyzing file and checking blockchain...' 
                      : 'Checking hash on blockchain...'
                    }
                  </span>
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="card animate-fade-in-up">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FiInfo className="w-5 h-5 mr-2 text-blue-600" />
                How Verification Works
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 font-semibold text-xs">1</span>
                  </div>
                  <p>File is hashed using cryptographic algorithms</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 font-semibold text-xs">2</span>
                  </div>
                  <p>Hash is checked against blockchain records</p>
                </div>
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 font-semibold text-xs">3</span>
                  </div>
                  <p>Provenance and ownership information is retrieved</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Results */}
        {verificationResult && (
          <div className="mt-8 space-y-6">
            <div className="card animate-scale-in">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <FiEye className="w-6 h-6 mr-3 text-purple-600" />
                Verification Results
              </h3>

              <div className="space-y-4">
                {verificationResult.results.map((result, index) => (
                  <div 
                    key={index}
                    className={`p-6 rounded-2xl border-2 ${
                      result.success && result.status === 'verified'
                        ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200'
                        : result.success && result.status === 'similar'
                        ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200'
                        : result.success && result.status === 'partial'
                        ? 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200'
                        : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        {result.success && result.status === 'verified' ? (
                          <FiCheck className="w-6 h-6 text-green-600 mr-3" />
                        ) : result.success && (result.status === 'similar' || result.status === 'partial') ? (
                          <FiAlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
                        ) : (
                          <FiX className="w-6 h-6 text-red-600 mr-3" />
                        )}
                        <div>
                          <h4 className="font-semibold text-lg text-gray-900">
                            {result.file || `Hash: ${result.hash?.substring(0, 20)}...`}
                          </h4>
                          <p className="text-gray-600">{result.message}</p>
                        </div>
                      </div>
                      <span className={`status-badge ${
                        result.status === 'verified' ? 'status-verified' :
                        result.status === 'similar' ? 'status-similar' :
                        result.status === 'partial' ? 'status-partial' :
                        result.status === 'not_found' ? 'status-not-found' :
                        'status-error'
                      }`}>
                        {result.status === 'verified' ? 'Verified' :
                         result.status === 'similar' ? 'Similar Found' :
                         result.status === 'partial' ? 'Partial Match' :
                         result.status === 'not_found' ? 'Not Found' :
                         'Error'
                        }
                      </span>
                    </div>

                    {/* Detailed Information */}
                    {result.assetDetails && (
                      <div className="bg-white/50 rounded-xl p-4 space-y-3">
                        <h5 className="font-semibold text-gray-900 mb-3">Asset Details</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Creator:</span>
                            <span className="ml-2 font-medium">{result.assetDetails.originalCreator || 'Unknown'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Token ID:</span>
                            <span className="ml-2 font-medium">{result.assetDetails.tokenId || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Registration Date:</span>
                            <span className="ml-2 font-medium">
                              {result.assetDetails.createdAt 
                                ? new Date(result.assetDetails.createdAt).toLocaleDateString()
                                : 'N/A'
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">License:</span>
                            <span className="ml-2 font-medium">{result.assetDetails.licenseType || 'Not specified'}</span>
                          </div>
                        </div>
                        
                        {result.assetDetails.description && (
                          <div>
                            <span className="text-gray-500">Description:</span>
                            <p className="mt-1 text-gray-700">{result.assetDetails.description}</p>
                          </div>
                        )}

                        {result.assetDetails.ipfsHash && (
                          <div>
                            <span className="text-gray-500">IPFS Hash:</span>
                            <p className="mt-1 font-mono text-sm text-gray-700 break-all">{result.assetDetails.ipfsHash}</p>
                          </div>
                        )}

                        {result.assetDetails.gatewayUrl && (
                          <div>
                            <span className="text-gray-500">Gateway URL:</span>
                            <p className="mt-1">
                              <a 
                                href={result.assetDetails.gatewayUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline break-all"
                              >
                                {result.assetDetails.gatewayUrl}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {result.error && (
                      <div className="bg-white/50 rounded-xl p-4">
                        <h5 className="font-semibold text-red-800 mb-2">Error Details</h5>
                        <p className="text-red-700 text-sm">{result.error}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentVerification;