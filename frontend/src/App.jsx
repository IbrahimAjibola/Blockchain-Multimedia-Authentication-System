import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { FiHome, FiUpload, FiSearch, FiImage, FiUser, FiMenu, FiX, FiShield, FiCheckCircle, FiZap } from 'react-icons/fi';

// Import components
import Web3Provider from './components/Web3Provider';
import ContentRegistration from './components/ContentRegistration';
import ContentVerification from './components/ContentVerification';
import NFTGallery from './components/NFTGallery';
import { useWeb3 } from './components/Web3Provider';

// Navigation component
const Navigation = () => {
  const { 
    account, 
    isConnected, 
    connectWallet, 
    disconnectWallet, 
    formatBalance, 
    balance, 
    getShortAddress, 
    getConnectionStatus,
    clearMetaMaskState,
    refreshConnection,
    retryAuthentication
  } = useWeb3();
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
    <nav className="frosted-glass dark:frosted-glass-dark sticky top-0 z-50 border-gradient">
      <div className="container-modern">
        <div className="flex justify-between h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 gradient-cosmic rounded-xl flex items-center justify-center shadow-neon transform hover:scale-110 transition-all duration-300">
                  <FiShield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-xl font-bold gradient-text-animate dark:text-gradient-dark-auto">
                  Multimedia Auth
                </h1>
              </div>
            </div>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-8 md:flex md:space-x-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-bounce ${
                    isActive(item.path)
                      ? 'gradient-cosmic text-white shadow-neon transform hover:scale-105'
                      : 'frosted-glass dark:frosted-glass-dark hover:shadow-lg'
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
                  <p className="text-sm font-medium text-gradient-blue dark:text-gradient-dark-auto">
                    {getShortAddress(account)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatBalance(balance)} ETH
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="gradient-sunset text-white px-6 py-2 rounded-xl font-medium shadow-neon transform hover:scale-105 transition-bounce"
                >
                  Disconnect
                </button>
                <div className="flex space-x-2">
                  <button
                    onClick={() => console.log('Connection status:', getConnectionStatus())}
                    className="text-xs text-gray-500 px-2 py-1 rounded border hover:bg-gray-100"
                    title="Debug: Check connection status"
                  >
                    Status
                  </button>
                  <button
                    onClick={clearMetaMaskState}
                    className="text-xs text-red-500 px-2 py-1 rounded border border-red-300 hover:bg-red-50"
                    title="Clear connection state (use if circuit breaker error)"
                  >
                    Clear
                  </button>
                  <button
                    onClick={refreshConnection}
                    className="text-xs text-blue-500 px-2 py-1 rounded border border-blue-300 hover:bg-blue-50"
                    title="Refresh connection"
                  >
                    Refresh
                  </button>
                  <button
                    onClick={retryAuthentication}
                    className="text-xs text-green-500 px-2 py-1 rounded border border-green-300 hover:bg-green-50"
                    title="Retry authentication"
                  >
                    Auth
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                className="gradient-cosmic text-white px-6 py-2 rounded-xl font-medium shadow-neon transform hover:scale-105 transition-bounce"
              >
                Connect Wallet
              </button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="frosted-glass dark:frosted-glass-dark p-2 rounded-xl transform hover:scale-110 transition-bounce"
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
        <div className="md:hidden frosted-glass dark:frosted-glass-dark border-t border-gradient animate-slide-down">
          <div className="px-2 pt-2 pb-3 space-y-2 sm:px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-4 py-3 rounded-xl text-base font-medium transition-bounce ${
                  isActive(item.path)
                    ? 'gradient-cosmic text-white shadow-neon transform hover:scale-105'
                    : 'frosted-glass dark:frosted-glass-dark hover:shadow-lg'
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <div className="flex items-center">
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.label}
                </div>
              </Link>
            ))}
            
            {isConnected && (
              <div className="px-4 py-4 mt-2 rounded-xl frosted-glass dark:frosted-glass-dark border-gradient">
                <p className="text-base font-medium text-gradient-blue dark:text-gradient-dark-auto">
                  {getShortAddress(account)}
                </p>
                <p className="text-sm text-gray-500 mt-1">
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
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-animate backdrop-blur backdrop-saturate">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white/50 to-purple-50/50 dark:from-gray-900/50 dark:via-gray-800/50 dark:to-purple-900/50"></div>
        <div className="relative container-modern py-20">
          <div className="text-center">
            <div className="mb-8 animate-slide-down">
              <div className="badge-modern hover-scale shadow-neon transition-bounce">
                <FiZap className="w-4 h-4 mr-2" />
                Secure Blockchain Authentication
              </div>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-slide-up">
              <span className="gradient-text-animate dark:text-gradient-dark-auto">
                Blockchain
              </span>
              <span className="block gradient-cosmic bg-clip-text text-transparent">
                Multimedia Auth
              </span>
            </h1>
            
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-4xl mx-auto leading-relaxed animate-fade-in-up">
              Secure, verify, and manage your multimedia content on the blockchain. 
              Register files as NFTs, verify authenticity, and maintain complete provenance.
            </p>
            
            {!isConnected ? (
              <div className="space-y-6 animate-fade-in-up">
                <p className="text-gray-500 dark:text-gray-400 text-lg">Connect your wallet to get started</p>
                <div className="flex justify-center">
                  <div className="loading-spinner-lg shadow-neon"></div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto animate-slide-up">
                <Link
                  to="/register"
                  className="card-3d group"
                >
                  <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                    <div className="w-20 h-20 gradient-cosmic rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-bounce">
                      <FiUpload className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-3">Register Content</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Upload and register your multimedia files as NFTs with complete provenance tracking</p>
                  </div>
                </Link>
                
                <Link
                  to="/verify"
                  className="card-3d group"
                >
                  <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                    <div className="w-20 h-20 gradient-ocean rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-bounce">
                      <FiSearch className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-3">Verify Content</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Verify the authenticity and provenance of multimedia files using blockchain verification</p>
                  </div>
                </Link>
                
                <Link
                  to="/gallery"
                  className="card-3d group"
                >
                  <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                    <div className="w-20 h-20 gradient-sunset rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-bounce">
                      <FiImage className="w-10 h-10 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-3">View Gallery</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Browse and manage your registered multimedia NFTs in a beautiful gallery interface</p>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container-modern">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text-animate dark:text-gradient-dark-auto">
              Powerful Features
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to secure and verify your multimedia content on the blockchain
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center group animate-fade-in-up">
              <div className="card-3d">
                <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                  <div className="w-20 h-20 gradient-cosmic rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-bounce shadow-neon">
                    <FiUpload className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-4">Content Registration</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Upload multimedia files and register them as NFTs with complete blockchain provenance</p>
                </div>
              </div>
            </div>
            
            <div className="text-center group animate-fade-in-up">
              <div className="card-3d">
                <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                  <div className="w-20 h-20 gradient-ocean rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-bounce shadow-neon">
                    <FiSearch className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-4">Content Verification</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Verify the authenticity and provenance of multimedia files using cryptographic hashes</p>
                </div>
              </div>
            </div>
            
            <div className="text-center group animate-fade-in-up">
              <div className="card-3d">
                <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                  <div className="w-20 h-20 gradient-sunset rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-bounce shadow-neon">
                    <FiImage className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-4">NFT Gallery</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">View and manage your registered multimedia NFTs in a beautiful, organized gallery</p>
                </div>
              </div>
            </div>
            
            <div className="text-center group animate-fade-in-up">
              <div className="card-3d">
                <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                  <div className="w-20 h-20 gradient-cosmic rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-bounce shadow-neon">
                    <FiUser className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-4">Provenance Tracking</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Track the complete history and ownership of your content with immutable blockchain records</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="py-20 bg-gradient-to-br from-white via-purple-50/30 to-blue-50/30 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="container-modern">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 gradient-text-animate dark:text-gradient-dark-auto">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Simple three-step process to secure your multimedia content
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center group animate-fade-in-up">
              <div className="card-3d">
                <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 gradient-cosmic rounded-full flex items-center justify-center mx-auto text-3xl font-bold text-white shadow-neon group-hover:scale-110 transition-bounce">
                      1
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 gradient-cosmic rounded-full shadow-neon"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-4">Upload & Hash</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Upload your multimedia file and generate cryptographic hashes for verification and security</p>
                </div>
              </div>
            </div>
            
            <div className="text-center group animate-fade-in-up">
              <div className="card-3d">
                <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 gradient-ocean rounded-full flex items-center justify-center mx-auto text-3xl font-bold text-white shadow-neon group-hover:scale-110 transition-bounce">
                      2
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 gradient-ocean rounded-full shadow-neon"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-4">Store on IPFS</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">Your file is stored on IPFS for decentralized, permanent, and censorship-resistant storage</p>
                </div>
              </div>
            </div>
            
            <div className="text-center group animate-fade-in-up">
              <div className="card-3d">
                <div className="frosted-glass dark:frosted-glass-dark p-8 rounded-3xl transition-all duration-300 hover:shadow-neon">
                  <div className="relative mb-8">
                    <div className="w-24 h-24 gradient-sunset rounded-full flex items-center justify-center mx-auto text-3xl font-bold text-white shadow-neon group-hover:scale-110 transition-bounce">
                      3
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 gradient-sunset rounded-full shadow-neon"></div>
                  </div>
                  <h3 className="text-2xl font-bold text-gradient-blue dark:text-gradient-dark-auto mb-4">Mint NFT</h3>
                  <p className="text-gray-600 dark:text-gray-300 leading-relaxed">An NFT is minted on the blockchain representing ownership and complete provenance history</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 gradient-cosmic relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20 backdrop-blur backdrop-saturate"></div>
        <div className="container-modern relative">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-slide-up">
              Ready to Secure Your Content?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto animate-fade-in-up">
              Join thousands of creators who trust blockchain authentication for their multimedia content
            </p>
            {!isConnected && (
              <button className="frosted-glass px-8 py-4 text-blue-600 rounded-2xl font-bold text-lg shadow-neon hover:scale-105 transition-bounce animate-slide-up">
                Connect Wallet to Start
              </button>
            )}
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
        </div>
      </div>
    </div>
  );
};

// Main App component
const App = () => {
  return (
    <Web3Provider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
                borderRadius: '12px',
                padding: '16px',
              },
            }}
          />
        </div>
      </Router>
    </Web3Provider>
  );
};

export default App; 