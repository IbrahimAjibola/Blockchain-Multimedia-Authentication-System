import React, { useState, useEffect } from 'react';
import { useWeb3 } from './Web3Provider';
import { toast } from 'react-hot-toast';
import { FiImage, FiVideo, FiMusic, FiFile, FiEye, FiDownload, FiShare, FiInfo, FiClock, FiUser, FiTag, FiGrid, FiList, FiFilter, FiSearch, FiX } from 'react-icons/fi';

// Component to handle image loading with authentication
const ImageWithFallback = ({ tokenId, alt, className }) => {
  const [imageSrc, setImageSrc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let currentBlobUrl = null;

    const loadImage = async () => {
      try {
        console.log('Loading image for tokenId:', tokenId);
        const token = localStorage.getItem('token');
        console.log('Token for image request:', !!token);
        
        const response = await fetch(`/api/assets/${tokenId}/file`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        console.log('Image fetch response:', response.status, response.statusText);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Image fetch error:', response.status, errorText);
          throw new Error(`HTTP ${response.status} - ${errorText}`);
        }
        
        const blob = await response.blob();
        console.log('Image blob size:', blob.size, 'type:', blob.type);
        
        if (blob.size === 0) {
          console.error('Received empty blob for tokenId:', tokenId);
          throw new Error('Empty image data received');
        }
        
        const dataUrl = URL.createObjectURL(blob);
        currentBlobUrl = dataUrl;
        console.log('Created blob URL:', dataUrl);
        
        // Only set state if component is still mounted
        if (isMounted) {
          setImageSrc(dataUrl);
          setLoading(false);
          console.log('Image loaded successfully:', tokenId, 'dataUrl:', dataUrl);
        } else {
          // Clean up if component unmounted
          URL.revokeObjectURL(dataUrl);
        }
      } catch (err) {
        console.error('Failed to load image:', tokenId, err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      }
    };

    loadImage();
    
    // Cleanup
    return () => {
      isMounted = false;
      if (currentBlobUrl) {
        URL.revokeObjectURL(currentBlobUrl);
      }
    };
  }, [tokenId]);

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100`}>
        <div className="loading-spinner-sm"></div>
      </div>
    );
  }

  if (error || !imageSrc) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200`}>
        <div className="text-center p-4">
          <div className="w-16 h-16 mx-auto mb-3">
            <svg viewBox="0 0 64 64" className="w-full h-full text-gray-400">
              <rect x="8" y="8" width="48" height="48" rx="4" fill="currentColor" opacity="0.2"/>
              <circle cx="24" cy="24" r="3" fill="currentColor"/>
              <path d="M8 44l12-12 8 8 12-12 16 16" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <p className="text-xs text-gray-500">Image unavailable</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onLoad={() => console.log('Image rendered successfully:', tokenId, 'src:', imageSrc.substring(0, 50))}
      onError={(e) => {
        console.error('Image render error:', tokenId, 'src:', imageSrc.substring(0, 50), e);
        setError(true);
      }}
      style={{ 
        maxWidth: '100%', 
        height: 'auto',
        display: 'block'
      }}
    />
  );
};

const NFTGallery = () => {
  const { account, isConnected, formatBalance, getShortAddress, retryAuthentication } = useWeb3();
  
  // Debug function to set test token
  const setTestToken = () => {
    const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhZGRyZXNzIjoiMHhmMzlmZDZlNTFhYWQ4OGY2ZjRjZTZhYjg4MjcyNzljZmZmYjkyMjY2IiwidHlwZSI6IndhbGxldCIsIm5vbmNlIjoxNzU0Njg3ODM3ODcxLCJpYXQiOjE3NTQ2ODc4MzcsImV4cCI6MTc1NDc3NDIzN30.dmacx64i2EFAvca1tP45BGpdQfzhX4p_OYC5Yeb7oGA';
    localStorage.setItem('token', testToken);
    toast.success('Test token set for debugging');
    loadUserNFTs(); // Reload NFTs with the new token
  };
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, images, videos, audio
  const [sortBy, setSortBy] = useState('recent'); // recent, oldest, name, size
  const [viewMode, setViewMode] = useState('grid'); // grid, list
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isConnected && account) {
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, user needs to authenticate');
        // Don't automatically load NFTs without a token
        return;
      }
      loadUserNFTs();
    }
  }, [isConnected, account]);

  // Listen for token changes (for when authentication succeeds)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token' && e.newValue && isConnected && account) {
        console.log('Token updated, reloading NFTs');
        loadUserNFTs();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isConnected, account]);

  const loadUserNFTs = async () => {
    setLoading(true);
    try {
      // Get user's NFTs from backend API
      const token = localStorage.getItem('token');
      console.log('Loading NFTs for account:', account);
      console.log('Token available:', !!token);
      
      if (!token) {
        console.warn('No authentication token found');
        throw new Error('Authentication required');
      }

      const response = await fetch(`/api/assets/user/${account}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('Assets API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Assets API error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Assets API result:', result);
      const assets = result.assets || [];
      
      const nfts = assets.map(asset => {
        return {
          tokenId: asset.tokenId,
          asset: {
            fileType: asset.fileType,
            fileSize: asset.fileSize,
            originalCreator: asset.originalCreator,
            timestamp: asset.createdAt
          },
          metadata: asset,
          type: getFileType(asset.fileType || ''),
          formattedSize: formatFileSize(asset.fileSize || 0),
          formattedDate: formatDate(asset.createdAt || Date.now())
        };
      });
      

      setNfts(nfts);
      
      if (nfts.length === 0) {
        toast.info('No NFTs found for this account.');
      } else {
        toast.success(`Loaded ${nfts.length} NFT${nfts.length > 1 ? 's' : ''}`);
      }
      
    } catch (error) {
      console.error('Error loading NFTs:', error);
      toast.error('Failed to load NFTs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (fileType) => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    return 'file';
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image': return FiImage;
      case 'video': return FiVideo;
      case 'audio': return FiMusic;
      default: return FiFile;
    }
  };

  const handleNFTClick = (nft) => {
    setSelectedNFT(nft);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNFT(null);
  };

  const handleDownload = async (nft) => {
    try {
      if (nft.metadata?.ipfsHash) {
        const ipfsUrl = `${process.env.REACT_APP_IPFS_GATEWAY}/ipfs/${nft.metadata.ipfsHash}`;
        window.open(ipfsUrl, '_blank');
        toast.success('Opening file in new tab');
      } else {
        toast.error('IPFS hash not available');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  const handleShare = async (nft) => {
    try {
      const shareData = {
        title: `NFT #${nft.tokenId}`,
        text: `Check out this NFT: ${nft.metadata?.description || 'Multimedia NFT'}`,
        url: window.location.href
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      console.error('Share error:', error);
      toast.error('Failed to share');
    }
  };

  // Filter and sort NFTs
  const filteredAndSortedNFTs = nfts
    .filter(nft => {
      if (filter === 'all') return true;
      return nft.type === filter;
    })
    .filter(nft => {
      if (!searchTerm) return true;
      const searchLower = searchTerm.toLowerCase();
      return (
        nft.metadata?.description?.toLowerCase().includes(searchLower) ||
        nft.metadata?.originalCreator?.toLowerCase().includes(searchLower) ||
        nft.metadata?.tags?.toLowerCase().includes(searchLower) ||
        nft.tokenId.includes(searchTerm)
      );
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return (b.asset?.timestamp || 0) - (a.asset?.timestamp || 0);
        case 'oldest':
          return (a.asset?.timestamp || 0) - (b.asset?.timestamp || 0);
        case 'name':
          return (a.asset?.description || '').localeCompare(b.asset?.description || '');
        case 'size':
          return (b.asset?.fileSize || 0) - (a.asset?.fileSize || 0);
        default:
          return 0;
      }
    });

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiImage className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Wallet Connection Required</h2>
            <p className="text-xl text-gray-600 mb-8">
              Please connect your wallet to view your NFT gallery.
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <FiImage className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            NFT Gallery
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Browse and manage your registered multimedia NFTs
          </p>
        </div>

        {/* Account Info */}
        <div className="card-modern mb-8 animate-slide-down">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Connected Account</h3>
              <p className="text-gray-600 font-mono">{getShortAddress(account)}</p>
              {!localStorage.getItem('token') && (
                <div className="mt-2">
                  <p className="text-sm text-orange-600 mb-2">⚠️ Authentication required to view NFTs</p>
                  <button
                    onClick={retryAuthentication}
                    className="btn-primary text-sm px-4 py-2"
                  >
                    🔐 Retry Authentication
                  </button>
                </div>
              )}
              {localStorage.getItem('token') && (
                <div className="mt-2">
                  <p className="text-sm text-green-600">✅ Authenticated</p>
                </div>
              )}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-2">
                  <button
                    onClick={setTestToken}
                    className="btn-outline text-xs px-3 py-1"
                  >
                    🔧 Set Test Token
                  </button>
                </div>
              )}
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Total NFTs</p>
              <p className="text-2xl font-bold text-gradient-purple">{nfts.length}</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="card-modern mb-8 animate-slide-left">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search NFTs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 input-modern focus-modern"
              />
            </div>

            {/* Filters and Controls */}
            <div className="flex items-center gap-4">
              {/* Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="input-modern focus-modern min-w-0"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="input-modern focus-modern min-w-0"
              >
                <option value="recent">Most Recent</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name</option>
                <option value="size">File Size</option>
              </select>

              {/* View Mode */}
              <div className="flex bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 rounded-xl transition-all duration-300 hover-scale ${
                    viewMode === 'grid'
                      ? 'bg-white shadow-lg text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FiGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 rounded-xl transition-all duration-300 hover-scale ${
                    viewMode === 'list'
                      ? 'bg-white shadow-lg text-purple-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FiList className="w-4 h-4" />
                </button>
              </div>

              {/* Refresh Button */}
              <button
                onClick={loadUserNFTs}
                disabled={loading}
                className="btn-modern hover-scale"
              >
                {loading ? (
                  <div className="loading-spinner-sm"></div>
                ) : (
                  'Refresh'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="card text-center animate-scale-in">
            <div className="loading-spinner-lg mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your NFTs...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && nfts.length === 0 && (
          <div className="card text-center animate-fade-in-up">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiImage className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No NFTs Found</h3>
            <p className="text-gray-600 mb-6">
              You haven't registered any multimedia content yet.
            </p>
            <button
              onClick={() => window.location.href = '/register'}
              className="btn-primary"
            >
              Register Your First NFT
            </button>
          </div>
        )}

        {/* NFT Grid/List */}
        {!loading && filteredAndSortedNFTs.length > 0 && (
          <div className={`animate-slide-up ${
            viewMode === 'grid' 
              ? 'grid-modern grid-auto-fit'
              : 'space-y-4'
          }`}>
            {filteredAndSortedNFTs.map((nft, index) => (
              <div
                key={nft.tokenId}
                className={`nft-card cursor-pointer hover-lift ${
                  viewMode === 'list' ? 'flex items-center p-6' : 'p-0'
                }`}
                onClick={() => handleNFTClick(nft)}
              >
                {viewMode === 'grid' ? (
                  <>
                    {/* NFT Image/Icon */}
                    <div className="nft-card-image" style={{ minHeight: '200px', backgroundColor: '#f0f0f0' }}>
                      {nft.type === 'image' ? (
                        <div className="w-full h-full relative">
                          <ImageWithFallback
                            tokenId={nft.tokenId}
                            alt={nft.metadata?.description || 'NFT'}
                            className="w-full h-full object-cover absolute inset-0"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                          <div className="text-center p-4">
                            {React.createElement(getFileIcon(nft.type), {
                              className: "w-16 h-16 text-gray-400 mx-auto mb-3"
                            })}
                            <p className="text-xs text-gray-600 font-medium truncate max-w-full">
                              {nft.metadata?.description || `NFT #${nft.tokenId}`}
                            </p>
                            <p className="text-xs text-gray-500 capitalize mt-1">{nft.type}</p>
                          </div>
                        </div>
                      )}

                      <div className="nft-card-badge">
                        #{nft.tokenId}
                      </div>
                    </div>

                    {/* NFT Details */}
                    <div className="p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
                        {nft.metadata?.description || `NFT #${nft.tokenId}`}
                      </h3>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <FiUser className="w-4 h-4 mr-2" />
                          <span className="truncate">{nft.metadata?.originalCreator || 'Unknown'}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <FiClock className="w-4 h-4 mr-2" />
                          <span>{nft.formattedDate}</span>
                        </div>
                        
                        <div className="flex items-center">
                          <FiFile className="w-4 h-4 mr-2" />
                          <span>{nft.formattedSize}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(nft);
                          }}
                          className="flex-1 btn-outline text-xs py-2"
                        >
                          <FiDownload className="w-3 h-3 mr-1" />
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleShare(nft);
                          }}
                          className="flex-1 btn-outline text-xs py-2"
                        >
                          <FiShare className="w-3 h-3 mr-1" />
                          Share
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  // List View
                  <>
                    <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mr-4">
                      {React.createElement(getFileIcon(nft.type), {
                        className: "w-8 h-8 text-gray-400"
                      })}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {nft.metadata?.description || `NFT #${nft.tokenId}`}
                      </h3>
                      <p className="text-gray-600 text-sm">
                        By {nft.metadata?.originalCreator || 'Unknown'} • {nft.formattedDate} • {nft.formattedSize}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="status-badge status-verified">#{nft.tokenId}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(nft);
                        }}
                        className="btn-outline text-sm py-2 px-3"
                      >
                        <FiEye className="w-4 h-4 mr-1" />
                        View
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* No Results */}
        {!loading && filteredAndSortedNFTs.length === 0 && nfts.length > 0 && (
          <div className="card text-center animate-fade-in-up">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiSearch className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Found</h3>
            <p className="text-gray-600">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {/* NFT Detail Modal */}
        {showModal && selectedNFT && (
          <div className="modal-overlay animate-fade-in-up" onClick={closeModal}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">NFT Details</h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <FiX className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* NFT Preview */}
                  <div>
                    <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
                      {selectedNFT.type === 'image' ? (
                        <div className="w-full h-full relative">
                          <ImageWithFallback
                            tokenId={selectedNFT.tokenId}
                            alt={selectedNFT.metadata?.description || 'NFT'}
                            className="w-full h-full object-cover rounded-2xl absolute inset-0"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
                          <div className="text-center p-6">
                            {React.createElement(getFileIcon(selectedNFT.type), {
                              className: "w-24 h-24 text-gray-400 mx-auto mb-4"
                            })}
                            <p className="text-sm text-gray-600 font-medium truncate max-w-full">
                              {selectedNFT.metadata?.description || `NFT #${selectedNFT.tokenId}`}
                            </p>
                            <p className="text-xs text-gray-500 capitalize mt-1">{selectedNFT.type}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleDownload(selectedNFT)}
                        className="btn-primary flex-1"
                      >
                        <FiDownload className="w-4 h-4 mr-2" />
                        View File
                      </button>
                      <button
                        onClick={() => handleShare(selectedNFT)}
                        className="btn-outline flex-1"
                      >
                        <FiShare className="w-4 h-4 mr-2" />
                        Share
                      </button>
                    </div>
                  </div>

                  {/* NFT Information */}
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">
                        {selectedNFT.metadata?.description || `NFT #${selectedNFT.tokenId}`}
                      </h3>
                      <p className="text-gray-600">Token ID: #{selectedNFT.tokenId}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-600">Creator</span>
                        <span className="font-medium">{selectedNFT.metadata?.originalCreator || 'Unknown'}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-600">Registration Date</span>
                        <span className="font-medium">{selectedNFT.formattedDate}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-600">File Size</span>
                        <span className="font-medium">{selectedNFT.formattedSize}</span>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-gray-600">File Type</span>
                        <span className="font-medium capitalize">{selectedNFT.type}</span>
                      </div>

                                              {selectedNFT.metadata?.licenseType && (
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                            <span className="text-gray-600">License</span>
                            <span className="font-medium">{selectedNFT.metadata.licenseType}</span>
                          </div>
                        )}
                    </div>

                    {selectedNFT.metadata?.ipfsHash && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">IPFS Hash</h4>
                        <p className="font-mono text-sm text-gray-600 break-all bg-gray-50 p-3 rounded-xl">
                          {selectedNFT.metadata.ipfsHash}
                        </p>
                      </div>
                    )}

                    {selectedNFT.metadata?.tags && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedNFT.metadata.tags.split(',').map((tag, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                            >
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTGallery;