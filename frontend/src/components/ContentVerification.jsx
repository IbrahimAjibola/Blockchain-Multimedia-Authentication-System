import React, { useState } from 'react';
import { useWeb3 } from './Web3Provider';
import FileUpload from './FileUpload';
import { toast } from 'react-hot-toast';
import { FiSearch, FiCheck, FiX, FiAlertCircle, FiInfo, FiShield, FiEye } from 'react-icons/fi';

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
            data: result
          });

          toast.success(`${fileObj.file.name} verification completed!`);

        } catch (error) {
          console.error(`Error verifying ${fileObj.file.name}:`, error);
          
          results.push({
            file: fileObj.file.name,
            success: false,
            error: error.message
          });

          toast.error(`Failed to verify ${fileObj.file.name}: ${error.message}`);
        }
      }

      setVerificationResult({
        method: 'file',
        total: selectedFiles.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
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
      // Verify with backend
      const response = await fetch('/api/verify/hash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}` // You'll need to implement auth
        },
        body: JSON.stringify({
          contentHash: hashInput,
          verifyOnBlockchain: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      setVerificationResult({
        method: 'hash',
        hash: hashInput,
        success: true,
        data: result
      });

      toast.success('Hash verification completed!');

    } catch (error) {
      console.error('Hash verification error:', error);
      
      setVerificationResult({
        method: 'hash',
        hash: hashInput,
        success: false,
        error: error.message
      });

      toast.error(`Hash verification failed: ${error.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setSelectedFiles([]);
    setHashInput('');
    setVerificationResult(null);
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-100';
      case 'similar':
        return 'text-yellow-600 bg-yellow-100';
      case 'partial':
        return 'text-orange-600 bg-orange-100';
      case 'not_found':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getVerificationStatusIcon = (status) => {
    switch (status) {
      case 'verified':
        return <FiCheck className="w-5 h-5" />;
      case 'similar':
        return <FiEye className="w-5 h-5" />;
      case 'partial':
        return <FiAlertCircle className="w-5 h-5" />;
      case 'not_found':
        return <FiX className="w-5 h-5" />;
      default:
        return <FiInfo className="w-5 h-5" />;
    }
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
            Please connect your wallet to verify multimedia content.
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
            Verify Multimedia Content
          </h1>
          <p className="text-gray-600">
            Verify the authenticity and provenance of multimedia files on the blockchain.
          </p>
        </div>

        {/* Wallet Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Connected Wallet: {account}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-700">Connected</span>
            </div>
          </div>
        </div>

        {!isVerifying ? (
          <>
            {/* Verification Method Selection */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Verification Method
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => setVerificationMethod('file')}
                  className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                    verificationMethod === 'file'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FiSearch className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">Upload File</h3>
                      <p className="text-sm text-gray-600">Upload a file to verify its authenticity</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setVerificationMethod('hash')}
                  className={`p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                    verificationMethod === 'hash'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <FiShield className="w-6 h-6 text-blue-600" />
                    <div>
                      <h3 className="font-medium text-gray-900">Enter Hash</h3>
                      <p className="text-sm text-gray-600">Verify by providing a content hash</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* File Upload Method */}
            {verificationMethod === 'file' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Upload File to Verify
                </h2>
                <FileUpload
                  onFileSelect={handleFileSelect}
                  multiple={false}
                  maxSize={100 * 1024 * 1024}
                />
              </div>
            )}

            {/* Hash Input Method */}
            {verificationMethod === 'hash' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Enter Content Hash
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Hash
                  </label>
                  <input
                    type="text"
                    value={hashInput}
                    onChange={handleHashInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter SHA-256 hash of the content"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter the SHA-256 hash of the file you want to verify
                  </p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                onClick={resetVerification}
                className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors duration-200"
              >
                Reset
              </button>
              <button
                onClick={verificationMethod === 'file' ? verifyByFile : verifyByHash}
                disabled={
                  (verificationMethod === 'file' && selectedFiles.length === 0) ||
                  (verificationMethod === 'hash' && !hashInput.trim())
                }
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
              >
                <FiSearch className="w-4 h-4" />
                <span>Verify Content</span>
              </button>
            </div>
          </>
        ) : (
          /* Verification Progress */
          <div className="text-center py-12">
            <div className="mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiSearch className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Verifying Content
              </h2>
              <p className="text-gray-600">
                Checking blockchain records and IPFS storage...
              </p>
            </div>

            {verificationMethod === 'file' && (
              <div className="space-y-4">
                {selectedFiles.map((fileObj, index) => (
                  <div
                    key={fileObj.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                      <span className="text-sm font-medium text-gray-900">
                        {fileObj.file.name}
                      </span>
                    </div>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Verifying
                    </span>
                  </div>
                ))}
              </div>
            )}

            {verificationMethod === 'hash' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-sm font-medium text-gray-900">
                      {hashInput}
                    </span>
                  </div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Verifying
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Verification Result */}
        {verificationResult && (
          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <div className="flex items-center space-x-3 mb-4">
              <FiInfo className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Verification Results
              </h3>
            </div>

            {verificationResult.method === 'file' ? (
              /* File Verification Results */
              <div className="space-y-4">
                {verificationResult.results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
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
                      <div className="space-y-3">
                        {/* Verification Status */}
                        <div className="flex items-center space-x-2">
                          {getVerificationStatusIcon(result.data.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationStatusColor(result.data.status)}`}>
                            {result.data.status.toUpperCase()}
                          </span>
                        </div>

                        {/* Summary */}
                        {result.data.summary && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">Total Matches:</span>
                              <span className="ml-2 font-medium">{result.data.summary.totalMatches}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Exact Matches:</span>
                              <span className="ml-2 font-medium text-green-600">{result.data.summary.exactMatches}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Blockchain Verified:</span>
                              <span className="ml-2 font-medium text-blue-600">{result.data.summary.blockchainVerified}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Integrity Valid:</span>
                              <span className="ml-2 font-medium text-green-600">{result.data.summary.integrityValid}</span>
                            </div>
                          </div>
                        )}

                        {/* Matches */}
                        {result.data.matches && result.data.matches.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Found Matches:</h4>
                            <div className="space-y-2">
                              {result.data.matches.map((match, matchIndex) => (
                                <div key={matchIndex} className="p-3 bg-white rounded border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-gray-900">
                                      Token ID: {match.tokenId}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationStatusColor(match.matchType)}`}>
                                      {match.matchType.toUpperCase()}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 space-y-1">
                                    <p>IPFS Hash: {match.ipfsHash}</p>
                                    <p>Original Creator: {match.originalCreator}</p>
                                    <p>Uploader: {match.uploader}</p>
                                    <p>Confidence: {(match.confidence * 100).toFixed(1)}%</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {!result.success && (
                      <div className="text-sm text-red-600">
                        Error: {result.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* Hash Verification Results */
              <div className={`p-4 rounded-lg border ${
                verificationResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">
                    Hash: {verificationResult.hash}
                  </span>
                  {verificationResult.success ? (
                    <FiCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <FiX className="w-5 h-5 text-red-600" />
                  )}
                </div>

                {verificationResult.success && verificationResult.data && (
                  <div className="space-y-3">
                    {/* Verification Status */}
                    <div className="flex items-center space-x-2">
                      {getVerificationStatusIcon(verificationResult.data.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationStatusColor(verificationResult.data.status)}`}>
                        {verificationResult.data.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Summary */}
                    {verificationResult.data.summary && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Total Matches:</span>
                          <span className="ml-2 font-medium">{verificationResult.data.summary.totalMatches}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Exact Matches:</span>
                          <span className="ml-2 font-medium text-green-600">{verificationResult.data.summary.exactMatches}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Blockchain Verified:</span>
                          <span className="ml-2 font-medium text-blue-600">{verificationResult.data.summary.blockchainVerified}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Similar Matches:</span>
                          <span className="ml-2 font-medium text-yellow-600">{verificationResult.data.summary.similarMatches}</span>
                        </div>
                      </div>
                    )}

                    {/* Matches */}
                    {verificationResult.data.matches && verificationResult.data.matches.length > 0 && (
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Found Matches:</h4>
                        <div className="space-y-2">
                          {verificationResult.data.matches.map((match, matchIndex) => (
                            <div key={matchIndex} className="p-3 bg-white rounded border">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-gray-900">
                                  Token ID: {match.tokenId}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getVerificationStatusColor(match.matchType)}`}>
                                  {match.matchType.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 space-y-1">
                                <p>IPFS Hash: {match.ipfsHash}</p>
                                <p>Original Creator: {match.originalCreator}</p>
                                <p>Uploader: {match.uploader}</p>
                                <p>Confidence: {(match.confidence * 100).toFixed(1)}%</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!verificationResult.success && (
                  <div className="text-sm text-red-600">
                    Error: {verificationResult.error}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={resetVerification}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Verify Another
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContentVerification; 