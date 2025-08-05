import React, { createContext, useContext, useState, useEffect } from 'react';
import { useWeb3React } from '@web3-react/core';
import { InjectedConnector } from '@web3-react/injected-connector';
import { WalletConnectConnector } from '@web3-react/walletconnect-connector';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';

const Web3Context = createContext();

// Connectors
const injected = new InjectedConnector({
  supportedChainIds: [1, 3, 4, 5, 42, 56, 97, 1337], // Add your supported chains
});

const walletconnect = new WalletConnectConnector({
  rpc: {
    1: process.env.REACT_APP_RPC_URL || 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
    5: 'https://goerli.infura.io/v3/YOUR-PROJECT-ID',
    1337: 'http://localhost:8545',
  },
  qrcode: true,
});

export const connectors = {
  injected: injected,
  walletConnect: walletconnect,
};

export function Web3Provider({ children }) {
  const { active, account, library, connector, activate, deactivate } = useWeb3React();
  const [contracts, setContracts] = useState(null);
  const [loading, setLoading] = useState(false);

  // Contract ABIs and addresses
  const contractConfig = {
    multimediaNFT: {
      address: process.env.REACT_APP_MULTIMEDIA_NFT_ADDRESS,
      abi: [], // Add your contract ABI here
    },
    licensingContract: {
      address: process.env.REACT_APP_LICENSING_CONTRACT_ADDRESS,
      abi: [], // Add your contract ABI here
    },
  };

  const connectWallet = async (connectorName) => {
    try {
      setLoading(true);
      const connector = connectors[connectorName];
      
      if (!connector) {
        throw new Error(`Connector ${connectorName} not found`);
      }

      await activate(connector);
      toast.success('Wallet connected successfully!');
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    try {
      deactivate();
      setContracts(null);
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const switchNetwork = async (chainId) => {
    if (!library) return;

    try {
      await library.provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error) {
      console.error('Switch network error:', error);
      toast.error('Failed to switch network');
    }
  };

  const getContract = (contractName) => {
    if (!library || !active) return null;
    
    const contract = contractConfig[contractName];
    if (!contract || !contract.address) return null;

    return new ethers.Contract(
      contract.address,
      contract.abi,
      library.getSigner()
    );
  };

  const mintAsset = async (assetData) => {
    if (!active || !library) {
      toast.error('Please connect your wallet first');
      return null;
    }

    try {
      setLoading(true);
      const contract = getContract('multimediaNFT');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      const tx = await contract.mintAsset(
        assetData.ipfsHash,
        assetData.fileType,
        assetData.fileSize,
        assetData.originalCreator,
        assetData.provenanceHash,
        assetData.tokenURI
      );

      const receipt = await tx.wait();
      
      toast.success('Asset minted successfully!');
      return receipt;
    } catch (error) {
      console.error('Mint error:', error);
      toast.error('Failed to mint asset');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const setLicense = async (tokenId, licenseData) => {
    if (!active || !library) {
      toast.error('Please connect your wallet first');
      return null;
    }

    try {
      setLoading(true);
      const contract = getContract('multimediaNFT');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      const tx = await contract.setLicense(
        tokenId,
        licenseData.isLicensed,
        ethers.utils.parseEther(licenseData.licensePrice.toString()),
        licenseData.licenseType
      );

      const receipt = await tx.wait();
      
      toast.success('License updated successfully!');
      return receipt;
    } catch (error) {
      console.error('Set license error:', error);
      toast.error('Failed to update license');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const createLicense = async (licenseData) => {
    if (!active || !library) {
      toast.error('Please connect your wallet first');
      return null;
    }

    try {
      setLoading(true);
      const contract = getContract('licensingContract');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      const tx = await contract.createLicense(
        licenseData.tokenId,
        licenseData.licensee,
        ethers.utils.parseEther(licenseData.price.toString()),
        licenseData.duration,
        licenseData.licenseType,
        licenseData.terms
      );

      const receipt = await tx.wait();
      
      toast.success('License created successfully!');
      return receipt;
    } catch (error) {
      console.error('Create license error:', error);
      toast.error('Failed to create license');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const purchaseLicense = async (tokenId, licenseIndex, price) => {
    if (!active || !library) {
      toast.error('Please connect your wallet first');
      return null;
    }

    try {
      setLoading(true);
      const contract = getContract('licensingContract');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      const tx = await contract.purchaseLicense(tokenId, licenseIndex, {
        value: ethers.utils.parseEther(price.toString())
      });

      const receipt = await tx.wait();
      
      toast.success('License purchased successfully!');
      return receipt;
    } catch (error) {
      console.error('Purchase license error:', error);
      toast.error('Failed to purchase license');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const getAsset = async (tokenId) => {
    if (!active || !library) return null;

    try {
      const contract = getContract('multimediaNFT');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      const asset = await contract.getAsset(tokenId);
      return asset;
    } catch (error) {
      console.error('Get asset error:', error);
      return null;
    }
  };

  const getTokenLicenses = async (tokenId) => {
    if (!active || !library) return [];

    try {
      const contract = getContract('licensingContract');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      const licenses = await contract.getTokenLicenses(tokenId);
      return licenses;
    } catch (error) {
      console.error('Get licenses error:', error);
      return [];
    }
  };

  const getUserLicenses = async (userAddress) => {
    if (!active || !library) return [];

    try {
      const contract = getContract('licensingContract');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      const tokenIds = await contract.getUserLicenses(userAddress);
      return tokenIds;
    } catch (error) {
      console.error('Get user licenses error:', error);
      return [];
    }
  };

  const getCreatorTokens = async (creatorAddress) => {
    if (!active || !library) return [];

    try {
      const contract = getContract('multimediaNFT');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      const tokenIds = await contract.getCreatorTokens(creatorAddress);
      return tokenIds;
    } catch (error) {
      console.error('Get creator tokens error:', error);
      return [];
    }
  };

  const checkIPFSHashExists = async (ipfsHash) => {
    if (!active || !library) return false;

    try {
      const contract = getContract('multimediaNFT');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      return await contract.checkIPFSHashExists(ipfsHash);
    } catch (error) {
      console.error('Check IPFS hash error:', error);
      return false;
    }
  };

  const getNetworkInfo = async () => {
    if (!library) return null;

    try {
      const network = await library.getNetwork();
      const blockNumber = await library.getBlockNumber();
      const gasPrice = await library.getGasPrice();

      return {
        chainId: network.chainId,
        blockNumber,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei'),
      };
    } catch (error) {
      console.error('Get network info error:', error);
      return null;
    }
  };

  const estimateGas = async (method, ...args) => {
    if (!active || !library) return null;

    try {
      const contract = getContract('multimediaNFT');
      
      if (!contract) {
        throw new Error('Contract not available');
      }

      return await contract[method].estimateGas(...args);
    } catch (error) {
      console.error('Estimate gas error:', error);
      return null;
    }
  };

  // Initialize contracts when library changes
  useEffect(() => {
    if (library && active) {
      const contractInstances = {};
      
      Object.keys(contractConfig).forEach(contractName => {
        const contract = getContract(contractName);
        if (contract) {
          contractInstances[contractName] = contract;
        }
      });

      setContracts(contractInstances);
    } else {
      setContracts(null);
    }
  }, [library, active]);

  const value = {
    active,
    account,
    library,
    connector,
    contracts,
    loading,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    mintAsset,
    setLicense,
    createLicense,
    purchaseLicense,
    getAsset,
    getTokenLicenses,
    getUserLicenses,
    getCreatorTokens,
    checkIPFSHashExists,
    getNetworkInfo,
    estimateGas,
  };

  return (
    <Web3Context.Provider value={value}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error('useWeb3 must be used within a Web3Provider');
  }
  return context;
} 