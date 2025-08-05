import React, { useState, useEffect } from 'react';
import { useWeb3 } from './Web3Provider';
import { toast } from 'react-hot-toast';
import { FiImage, FiVideo, FiMusic, FiFile, FiEye, FiDownload, FiShare, FiInfo, FiClock, FiUser, FiTag } from 'react-icons/fi';

const NFTGallery = () => {
  const { account, isConnected, getUserTokens, getAsset, formatBalance, getShortAddress } = useWeb3();
  
  const [nfts, setNfts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, images, videos, audio
  const [sortBy, setSortBy] = useState('recent'); // recent, oldest, name, size

  useEffect(() => {
    if (isConnected && account) {
      loadUserNFTs();
    }
  }, [isConnected, account]);

  const loadUserNFTs = async () => {
    setLoading(true);
    try {
      // Get user's tokens from blockchain
      const tokenIds = await getUserTokens(account);
      
      // Fetch NFT details for each token
      const nftPromises = tokenIds.map(async (tokenId) => {
        try {
          const asset = await getAsset(tokenId);
          
          // Fetch additional metadata from backend
          const response = await fetch(`/api/assets/${tokenId}`);
          const metadata = response.ok ? await response.json() : null;
          
          return {
            tokenId: tokenId.toString(),
            asset,
            metadata,
            type: getFileType(asset?.fileType || ''),
            formattedSize: formatFileSize(asset?.fileSize || 0),
            formattedDate: formatDate(asset?.timestamp || Date.now())
          };
        } catch (error) {
          console.error(`Error loading NFT ${tokenId}:`, error);
          return null;
        }
      });

      const nftResults = await Promise.all(nftPromises);
      const validNFTs = nftResults.filter(nft => nft !== null);
      
      setNfts(validNFTs);
    } catch (error) {
      console.error('Error loading NFTs:', error);
      toast.error('Failed to load NFTs');
    } finally {
      setLoading(false);
    }
  };

  const getFileType = (mimeType) => {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
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
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getFileIcon = (type) => {
    switch (type) {
      case 'image':
        return <FiImage className="w-6 h-6" />;
      case 'video':
        return <FiVideo className="w-6 h-6" />;
      case 'audio':
        return <FiMusic className="w-6 h-6" />;
      default:
        return <FiFile className="w-6 h-6" />;
    }
  };

  const getGatewayUrl = (ipfsHash) => {
    return `https://ipfs.io/ipfs/${ipfsHash}`;
  };

  const openNFTModal = (nft) => {
    setSelectedNFT(nft);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNFT(null);
  };

  const downloadNFT = async (nft) => {
    try {
      const response = await fetch(getGatewayUrl(nft.asset.ipfsHash));
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nft.metadata?.originalName || `nft-${nft.tokenId}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('NFT downloaded successfully!');
    } catch (error) {
      console.error('Error downloading NFT:', error);
      toast.error('Failed to download NFT');
    }
  };

  const shareNFT = async (nft) => {
    try {
      const shareData = {
        title: nft.metadata?.originalName || `NFT #${nft.tokenId}`,
        text: `Check out this NFT on the blockchain!`,
        url: `${window.location.origin}/nft/${nft.tokenId}`
      };
      
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.url);
        toast.success('NFT link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing NFT:', error);
      toast.error('Failed to share NFT');
    }
  };

  const filteredAndSortedNFTs = () => {
    let filtered = nfts;
    
    // Apply filter
    if (filter !== 'all') {
      filtered = nfts.filter(nft => nft.type === filter);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'recent':
        return filtered.sort((a, b) => b.asset.timestamp - a.asset.timestamp);
      case 'oldest':
        return filtered.sort((a, b) => a.asset.timestamp - b.asset.timestamp);
      case 'name':
        return filtered.sort((a, b) => 
          (a.metadata?.originalName || '').localeCompare(b.metadata?.originalName || '')
        );
      case 'size':
        return filtered.sort((a, b) => b.asset.fileSize - a.asset.fileSize);
      default:
        return filtered;
    }
  };

  if (!isConnected) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <FiInfo className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-yellow-800 mb-2">
            Wallet Not Connected
          </h2>
          <p className="text-yellow-700">
            Please connect your wallet to view your NFT collection.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          My NFT Collection
        </h1>
        <p className="text-gray-600">
          View and manage your registered multimedia NFTs
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">{nfts.length}</div>
          <div className="text-sm text-gray-600">Total NFTs</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {nfts.filter(nft => nft.type === 'image').length}
          </div>
          <div className="text-sm text-gray-600">Images</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            {nfts.filter(nft => nft.type === 'video').length}
          </div>
          <div className="text-sm text-gray-600">Videos</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">
            {nfts.filter(nft => nft.type === 'audio').length}
          </div>
          <div className="text-sm text-gray-600">Audio</div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 space-y-4 md:space-y-0">
        <div className="flex space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="image">Images</option>
            <option value="video">Videos</option>
            <option value="audio">Audio</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">Most Recent</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
            <option value="size">Largest First</option>
          </select>
        </div>

        <button
          onClick={loadUserNFTs}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* NFT Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your NFTs...</p>
        </div>
      ) : nfts.length === 0 ? (
        <div className="text-center py-12">
          <FiImage className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No NFTs Found</h3>
          <p className="text-gray-600">You haven't registered any multimedia content yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAndSortedNFTs().map((nft) => (
            <div
              key={nft.tokenId}
              className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200"
            >
              {/* NFT Preview */}
              <div className="relative aspect-square bg-gray-100">
                {nft.type === 'image' ? (
                  <img
                    src={getGatewayUrl(nft.asset.ipfsHash)}
                    alt={nft.metadata?.originalName || `NFT #${nft.tokenId}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileIcon(nft.type)}
                  </div>
                )}
                <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  #{nft.tokenId}
                </div>
              </div>

              {/* NFT Info */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 truncate mb-2">
                  {nft.metadata?.originalName || `NFT #${nft.tokenId}`}
                </h3>
                
                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <FiUser className="w-4 h-4" />
                    <span className="truncate">
                      {nft.asset.originalCreator || 'Unknown'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <FiTag className="w-4 h-4" />
                    <span className="capitalize">{nft.type}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <FiClock className="w-4 h-4" />
                    <span>{nft.formattedDate}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <FiInfo className="w-4 h-4" />
                    <span>{nft.formattedSize}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 mt-4">
                  <button
                    onClick={() => openNFTModal(nft)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-1"
                  >
                    <FiEye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                  
                  <button
                    onClick={() => downloadNFT(nft)}
                    className="px-3 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors duration-200"
                    title="Download"
                  >
                    <FiDownload className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => shareNFT(nft)}
                    className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors duration-200"
                    title="Share"
                  >
                    <FiShare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NFT Modal */}
      {showModal && selectedNFT && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedNFT.metadata?.originalName || `NFT #${selectedNFT.tokenId}`}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* NFT Preview */}
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {selectedNFT.type === 'image' ? (
                    <img
                      src={getGatewayUrl(selectedNFT.asset.ipfsHash)}
                      alt={selectedNFT.metadata?.originalName || `NFT #${selectedNFT.tokenId}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileIcon(selectedNFT.type)}
                    </div>
                  )}
                </div>

                {/* NFT Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Token Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Token ID:</span>
                        <span className="font-medium">#{selectedNFT.tokenId}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium capitalize">{selectedNFT.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Size:</span>
                        <span className="font-medium">{selectedNFT.formattedSize}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span className="font-medium">{selectedNFT.formattedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Creator Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Original Creator:</span>
                        <span className="font-medium">{selectedNFT.asset.originalCreator || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Uploader:</span>
                        <span className="font-medium">{getShortAddress(selectedNFT.asset.uploader)}</span>
                      </div>
                    </div>
                  </div>

                  {selectedNFT.metadata && (
                    <div>
                      <h3 className="font-medium text-gray-900 mb-2">Metadata</h3>
                      <div className="space-y-2 text-sm">
                        {selectedNFT.metadata.description && (
                          <div>
                            <span className="text-gray-600">Description:</span>
                            <p className="text-gray-900 mt-1">{selectedNFT.metadata.description}</p>
                          </div>
                        )}
                        {selectedNFT.metadata.tags && selectedNFT.metadata.tags.length > 0 && (
                          <div>
                            <span className="text-gray-600">Tags:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedNFT.metadata.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Blockchain Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">IPFS Hash:</span>
                        <span className="font-medium font-mono text-xs">{selectedNFT.asset.ipfsHash}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Transaction Hash:</span>
                        <span className="font-medium font-mono text-xs">{selectedNFT.asset.transactionHash}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Block Number:</span>
                        <span className="font-medium">{selectedNFT.asset.blockNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    <button
                      onClick={() => downloadNFT(selectedNFT)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <FiDownload className="w-4 h-4" />
                      <span>Download</span>
                    </button>
                    
                    <button
                      onClick={() => shareNFT(selectedNFT)}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <FiShare className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NFTGallery; 