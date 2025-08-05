import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FiHome, FiUpload, FiSearch, FiImage, FiUser, FiMenu, FiX } from 'react-icons/fi';

// Import components
import Web3Provider from './components/Web3Provider';
import ContentRegistration from './components/ContentRegistration';
import ContentVerification from './components/ContentVerification';
import NFTGallery from './components/NFTGallery';
import { useWeb3 } from './components/Web3Provider';

// Navigation component
const Navigation = () => {
  const { account, isConnected, connectWallet, disconnectWallet, formatBalance, balance, getShortAddress } = useWeb3();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: FiHome },
    { path: '/register', label: 'Register', icon: FiUpload },
    { path: '/verify', label: 'Verify', icon: FiSearch },
    { path: '/gallery', label: 'Gallery', icon: FiImage },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Multimedia Auth</h1>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-6 md:flex md:space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    isActive(item.path)
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center space-x-4">
            {isConnected ? (
              <div className="flex items-center space-x-4">
                <div className="hidden md:block text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {getShortAddress(account)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBalance(balance)} ETH
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors duration-200"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors duration-200"
              >
                Connect Wallet
              </button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-gray-400 hover:text-gray-500"
              >
                {isMobileMenuOpen ? (
                  <FiX className="w-6 h-6" />
                ) : (
                  <FiMenu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.label}
                </div>
              </Link>
            ))}
            
            {isConnected && (
              <div className="px-3 py-2 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-900">
                  {getShortAddress(account)}
                </p>
                <p className="text-xs text-gray-500">
                  {formatBalance(balance)} ETH
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

// Home component
const Home = () => {
  const { isConnected } = useWeb3();

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Blockchain Multimedia
          <span className="text-blue-600"> Authentication</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Secure, verify, and manage your multimedia content on the blockchain. 
          Register files as NFTs, verify authenticity, and maintain provenance.
        </p>
        
        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-gray-500">Connect your wallet to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Link
              to="/register"
              className="bg-blue-600 text-white p-6 rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              <FiUpload className="w-8 h-8 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Register Content</h3>
              <p className="text-blue-100">Upload and register your multimedia files as NFTs</p>
            </Link>
            
            <Link
              to="/verify"
              className="bg-green-600 text-white p-6 rounded-lg hover:bg-green-700 transition-colors duration-200"
            >
              <FiSearch className="w-8 h-8 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Verify Content</h3>
              <p className="text-green-100">Verify the authenticity of multimedia files</p>
            </Link>
            
            <Link
              to="/gallery"
              className="bg-purple-600 text-white p-6 rounded-lg hover:bg-purple-700 transition-colors duration-200"
            >
              <FiImage className="w-8 h-8 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">View Gallery</h3>
              <p className="text-purple-100">Browse and manage your NFT collection</p>
            </Link>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Key Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUpload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Registration</h3>
            <p className="text-gray-600">Upload multimedia files and register them as NFTs on the blockchain</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiSearch className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Content Verification</h3>
            <p className="text-gray-600">Verify the authenticity and provenance of multimedia files</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiImage className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">NFT Gallery</h3>
            <p className="text-gray-600">View and manage your registered multimedia NFTs</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiUser className="w-8 h-8 text-yellow-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Provenance Tracking</h3>
            <p className="text-gray-600">Track the complete history and ownership of your content</p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-12 bg-gray-50 rounded-lg">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload & Hash</h3>
              <p className="text-gray-600">Upload your multimedia file and generate cryptographic hashes for verification</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Store on IPFS</h3>
              <p className="text-gray-600">Your file is stored on IPFS for decentralized, permanent storage</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Mint NFT</h3>
              <p className="text-gray-600">An NFT is minted on the blockchain representing ownership and provenance</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App component
const App = () => {
  return (
    <Web3Provider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/register" element={<ContentRegistration />} />
              <Route path="/verify" element={<ContentVerification />} />
              <Route path="/gallery" element={<NFTGallery />} />
            </Routes>
          </main>
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </Web3Provider>
  );
};

export default App; 