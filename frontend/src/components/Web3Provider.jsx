import React, { createContext, useContext, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { Web3Modal } from '@web3modal/react';
import { WagmiConfig, createConfig, configureChains } from 'wagmi';
import { sepolia, mainnet } from 'wagmi/chains';
import { MetaMaskConnector } from 'wagmi/connectors/metaMask';
import { WalletConnectConnector } from 'wagmi/connectors/walletConnect';
import { CoinbaseWalletConnector } from 'wagmi/connectors/coinbaseWallet';
import { publicProvider } from 'wagmi/providers/public';
import { InjectedConnector } from 'wagmi/connectors/injected';
import { Buffer } from 'buffer';

// Polyfill Buffer for browser
window.Buffer = Buffer;

// Contract ABIs
import MultimediaNFTABI from '../contracts/MultimediaNFT.json';
import LicensingContractABI from '../contracts/LicensingContract.json';

const Web3Context = createContext();

export const useWeb3 = () => {
  const context = useContext(Web3Context);
  if (!context) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
};

// Configure chains & providers
const { chains, publicClient, webSocketPublicClient } = configureChains(
  [sepolia, mainnet],
  [publicProvider()]
);

// Set up wagmi config
const config = createConfig({
  autoConnect: true,
  connectors: [
    new MetaMaskConnector({ chains }),
    new WalletConnectConnector({
      chains,
      options: {
        projectId: 'c4f79cc821944d9680842e34466bfbd9',
        showQrModal: false,
      },
    }),
    new CoinbaseWalletConnector({
      chains,
      options: {
        appName: 'Multimedia Auth dApp',
      },
    }),
    new InjectedConnector({
      chains,
      options: {
        name: 'Injected',
        shimDisconnect: true,
      },
    }),
  ],
  publicClient,
  webSocketPublicClient,
});

export const Web3Provider = ({ children }) => {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contracts, setContracts] = useState({});
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [network, setNetwork] = useState(null);
  const [balance, setBalance] = useState('0');

  // Contract addresses (should be from environment variables)
  const CONTRACT_ADDRESSES = {
    multimediaNFT: process.env.REACT_APP_MULTIMEDIA_NFT_ADDRESS,
    licensingContract: process.env.REACT_APP_LICENSING_CONTRACT_ADDRESS,
  };

  // Initialize contracts
  const initializeContracts = async (signer) => {
    try {
      const multimediaNFT = new ethers.Contract(
        CONTRACT_ADDRESSES.multimediaNFT,
        MultimediaNFTABI,
        signer
      );

      const licensingContract = new ethers.Contract(
        CONTRACT_ADDRESSES.licensingContract,
        LicensingContractABI,
        signer
      );

      setContracts({
        multimediaNFT,
        licensingContract,
      });

      return { multimediaNFT, licensingContract };
    } catch (error) {
      console.error('Error initializing contracts:', error);
      throw error;
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    try {
      setIsConnecting(true);

      if (typeof window.ethereum !== 'undefined') {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_requestAccounts', []);
        const signer = await provider.getSigner();
        const network = await provider.getNetwork();

        setProvider(provider);
        setSigner(signer);
        setAccount(accounts[0]);
        setNetwork(network);
        setIsConnected(true);

        // Initialize contracts
        await initializeContracts(signer);

        // Get account balance
        const balance = await provider.getBalance(accounts[0]);
        setBalance(ethers.formatEther(balance));

        // Listen for account changes
        window.ethereum.on('accountsChanged', handleAccountsChanged);
        window.ethereum.on('chainChanged', handleChainChanged);

        return accounts[0];
      } else {
        throw new Error('MetaMask is not installed');
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContracts({});
    setIsConnected(false);
    setNetwork(null);
    setBalance('0');

    if (window.ethereum) {
      window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      window.ethereum.removeListener('chainChanged', handleChainChanged);
    }
  };

  // Handle account changes
  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
      if (provider) {
        const balance = await provider.getBalance(accounts[0]);
        setBalance(ethers.formatEther(balance));
      }
    }
  };

  // Handle chain changes
  const handleChainChanged = async (chainId) => {
    if (provider) {
      const network = await provider.getNetwork();
      setNetwork(network);
    }
  };

  // Check if wallet is connected
  const checkConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const network = await provider.getNetwork();

          setProvider(provider);
          setSigner(signer);
          setAccount(accounts[0]);
          setNetwork(network);
          setIsConnected(true);

          await initializeContracts(signer);

          const balance = await provider.getBalance(accounts[0]);
          setBalance(ethers.formatEther(balance));
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  // Contract interaction functions
  const mintAsset = async (assetData) => {
    try {
      if (!contracts.multimediaNFT) {
        throw new Error('Contract not initialized');
      }

      const {
        ipfsHash,
        fileType,
        fileSize,
        originalCreator,
        provenanceHash,
        tokenURI,
      } = assetData;

      const mintingFee = await contracts.multimediaNFT.mintingFee();
      
      const tx = await contracts.multimediaNFT.mintAsset(
        ipfsHash,
        fileType,
        fileSize,
        originalCreator,
        provenanceHash,
        tokenURI,
        { value: mintingFee }
      );

      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error minting asset:', error);
      throw error;
    }
  };

  const setLicense = async (tokenId, licenseData) => {
    try {
      if (!contracts.multimediaNFT) {
        throw new Error('Contract not initialized');
      }

      const { licenseType, licensePrice, duration, terms } = licenseData;
      
      const tx = await contracts.multimediaNFT.setLicense(
        tokenId,
        licenseType,
        licensePrice,
        duration,
        terms
      );

      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error setting license:', error);
      throw error;
    }
  };

  const purchaseLicense = async (tokenId, price) => {
    try {
      if (!contracts.multimediaNFT) {
        throw new Error('Contract not initialized');
      }

      const tx = await contracts.multimediaNFT.purchaseLicense(tokenId, {
        value: price,
      });

      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error purchasing license:', error);
      throw error;
    }
  };

  const getAsset = async (tokenId) => {
    try {
      if (!contracts.multimediaNFT) {
        throw new Error('Contract not initialized');
      }

      const asset = await contracts.multimediaNFT.getAsset(tokenId);
      return asset;
    } catch (error) {
      console.error('Error getting asset:', error);
      throw error;
    }
  };

  const getTokenCount = async () => {
    try {
      if (!contracts.multimediaNFT) {
        throw new Error('Contract not initialized');
      }

      const count = await contracts.multimediaNFT.getTokenCount();
      return count;
    } catch (error) {
      console.error('Error getting token count:', error);
      throw error;
    }
  };

  const checkIPFSHashExists = async (ipfsHash) => {
    try {
      if (!contracts.multimediaNFT) {
        throw new Error('Contract not initialized');
      }

      const exists = await contracts.multimediaNFT.checkIPFSHashExists(ipfsHash);
      return exists;
    } catch (error) {
      console.error('Error checking IPFS hash:', error);
      throw error;
    }
  };

  const verifyAsset = async (tokenId) => {
    try {
      if (!contracts.multimediaNFT) {
        throw new Error('Contract not initialized');
      }

      const verificationFee = await contracts.multimediaNFT.verificationFee();
      
      const tx = await contracts.multimediaNFT.verifyAsset(tokenId, {
        value: verificationFee,
      });

      const receipt = await tx.wait();
      return receipt;
    } catch (error) {
      console.error('Error verifying asset:', error);
      throw error;
    }
  };

  // Get user's tokens
  const getUserTokens = async (address) => {
    try {
      if (!contracts.multimediaNFT) {
        throw new Error('Contract not initialized');
      }

      const tokens = await contracts.multimediaNFT.getCreatorTokens(address);
      return tokens;
    } catch (error) {
      console.error('Error getting user tokens:', error);
      throw error;
    }
  };

  // Switch network
  const switchNetwork = async (chainId) => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      }
    } catch (error) {
      console.error('Error switching network:', error);
      throw error;
    }
  };

  // Add network
  const addNetwork = async (networkConfig) => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkConfig],
        });
      }
    } catch (error) {
      console.error('Error adding network:', error);
      throw error;
    }
  };

  // Check if network is supported
  const isNetworkSupported = () => {
    if (!network) return false;
    
    const supportedChainIds = [11155111, 1]; // Sepolia, Mainnet
    return supportedChainIds.includes(network.chainId);
  };

  // Get network name
  const getNetworkName = () => {
    if (!network) return 'Unknown';
    
    switch (network.chainId) {
      case 11155111:
        return 'Sepolia Testnet';
      case 1:
        return 'Ethereum Mainnet';
      default:
        return `Chain ID: ${network.chainId}`;
    }
  };

  // Format balance
  const formatBalance = (balance) => {
    return parseFloat(balance).toFixed(4);
  };

  // Get short address
  const getShortAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Initialize on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const value = {
    // State
    account,
    provider,
    signer,
    contracts,
    isConnecting,
    isConnected,
    network,
    balance,

    // Functions
    connectWallet,
    disconnectWallet,
    mintAsset,
    setLicense,
    purchaseLicense,
    getAsset,
    getTokenCount,
    checkIPFSHashExists,
    verifyAsset,
    getUserTokens,
    switchNetwork,
    addNetwork,
    isNetworkSupported,
    getNetworkName,
    formatBalance,
    getShortAddress,
  };

  return (
    <Web3Context.Provider value={value}>
      <WagmiConfig config={config}>
        {children}
        <Web3Modal
          projectId="c4f79cc821944d9680842e34466bfbd9"
          ethereum={{
            appName: 'Multimedia Auth dApp',
            chains: [sepolia, mainnet],
          }}
          themeMode="light"
          themeVariables={{
            '--w3m-accent-color': '#3b82f6',
            '--w3m-background-color': '#ffffff',
            '--w3m-overlay-background-color': 'rgba(0, 0, 0, 0.5)',
            '--w3m-border-radius-master': '12px',
            '--w3m-container-border-radius': '16px',
          }}
        />
      </WagmiConfig>
    </Web3Context.Provider>
  );
};

export default Web3Provider; 