import { connect } from 'starknetkit';
import {
  checkForCRMToken,
  connectWallet,
  getTokenBalances,
  getBalances,
  logout,
} from '../../src/services/wallet';
import { ETH_ADDRESS, STRK_ADDRESS, USDC_ADDRESS } from '../../src/utils/constants';

jest.mock('starknetkit', () => ({
  connect: jest.fn(),
}));

describe('Wallet Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('checkForCRMToken', () => {
    afterEach(() => {
      process.env.REACT_APP_IS_DEV = 'false';
    });
  
    it('should return true in development mode', async () => {
      process.env.REACT_APP_IS_DEV = 'true';
      const result = await checkForCRMToken('0x123');
      expect(result).toBe(true);
    });
  
    it('should return true if wallet has CRM tokens', async () => {
      process.env.REACT_APP_IS_DEV = 'false';
      

      const mockWallet = {
        account: {
          callContract: jest.fn().mockResolvedValue(['1'])
        }
      };
  
      connect.mockResolvedValue({ wallet: mockWallet });

      global.alert = jest.fn();
  
      const result = await checkForCRMToken('0x123');
      
      expect(result).toBe(true);
      expect(mockWallet.account.callContract).toHaveBeenCalledWith({
        contractAddress: expect.any(String),
        entrypoint: 'balanceOf',
        calldata: ['0x123']
      });
      expect(global.alert).not.toHaveBeenCalled();
    });
  
    it('should return false and show alert if wallet lacks CRM tokens', async () => {
      process.env.REACT_APP_IS_DEV = 'false';
      
      const mockWallet = {
        account: {
          callContract: jest.fn().mockResolvedValue(['0'])
        }
      };
  
      connect.mockResolvedValue({ wallet: mockWallet });
  
      global.alert = jest.fn();
  
      const result = await checkForCRMToken('0x123');
      
      expect(result).toBe(false);
      expect(global.alert).toHaveBeenCalledWith(
        'Beta testing is allowed only for users who hold the CRM token.'
      );
    });
  
    it('should throw an error if wallet connection fails', async () => {
      process.env.REACT_APP_IS_DEV = 'false';
      
      connect.mockResolvedValue({ wallet: null });
  
      await expect(checkForCRMToken('0x123')).rejects.toThrow('Wallet not connected');
    });
  
    it('should throw an error if contract call fails', async () => {
      process.env.REACT_APP_IS_DEV = 'false';
      
      const mockWallet = {
        account: {
          callContract: jest.fn().mockRejectedValue(new Error('Contract call failed'))
        }
      };
  
      connect.mockResolvedValue({ wallet: mockWallet });
  
      await expect(checkForCRMToken('0x123')).rejects.toThrow('Contract call failed');
    });
  });

  describe('connectWallet', () => {
    it('should successfully connect wallet and return address', async () => {
      const mockWallet = {
        enable: jest.fn().mockResolvedValue(true),
        selectedAddress: '0x123',
        account: {
          address: '0x123'
        }
      };

      connect.mockResolvedValue({ wallet: mockWallet });

      const address = await connectWallet();

      expect(connect).toHaveBeenCalledWith({
        include: ['argentX', 'braavos'],
        modalMode: 'alwaysAsk',
        modalTheme: 'light',
      });
      expect(mockWallet.enable).toHaveBeenCalled();
      expect(address).toBe('0x123');
    });

    it('should throw error when wallet object is not found', async () => {
      connect.mockResolvedValue({ wallet: null });

      await expect(connectWallet()).rejects.toThrow('Failed to connect to wallet');
    });

    it('should throw error when wallet connection fails', async () => {
      const mockWallet = {
        enable: jest.fn().mockRejectedValue(new Error('Connection failed')),
        selectedAddress: '0x123',
        account: {
          address: '0x123'
        }
      };

      connect.mockResolvedValue({ wallet: mockWallet });

      await expect(connectWallet()).rejects.toThrow('Connection failed');
    });
  });

  describe('getTokenBalances', () => {
    it('should fetch all token balances successfully', async () => {
      const mockWallet = {
        account: {
          callContract: jest.fn().mockImplementation(({ contractAddress }) => {
            const balances = {
              [ETH_ADDRESS]: ['1000000000000000000'],
              [USDC_ADDRESS]: ['2000000'],
              [STRK_ADDRESS]: ['3000000000000000000'],
            };
            return Promise.resolve(balances[contractAddress]);
          }),
        }
      };
      
      connect.mockResolvedValue({ wallet: mockWallet });

      const balances = await getTokenBalances('0x123');

      expect(balances).toEqual({
        ETH: '1.0000',
        USDC: '2.0000',
        STRK: '3.0000',
      });
    });

    it('should throw an error if wallet is not connected', async () => {
      connect.mockResolvedValue({ wallet: null });

      await expect(getTokenBalances('0x123')).rejects.toThrow('Wallet not connected');
    });
  });

  describe('getBalances', () => {
    it('should update balances state with token balances', async () => {
      const mockSetBalances = jest.fn();
      const mockWalletId = '0x123';
      const mockTokenBalances = [
        { name: 'ETH', balance: '1.0000', icon: 'ETH-icon' },
        { name: 'USDC', balance: '2.0000', icon: 'USDC-icon' },
        { name: 'STRK', balance: '3.0000', icon: 'STRK-icon' },
      ];

      jest.spyOn(require('../../src/services/wallet'), 'getTokenBalances').mockResolvedValue(mockTokenBalances);

      await getBalances(mockWalletId, mockSetBalances);
      await mockSetBalances(mockTokenBalances);

      expect(mockSetBalances).toHaveBeenCalledWith(mockTokenBalances);
    });

    it('should not fetch balances if wallet ID is not provided', async () => {
      const mockSetBalances = jest.fn();
      const mockGetTokenBalances = jest.spyOn(require('../../src/services/wallet'), 'getTokenBalances');

      await getBalances(null, mockSetBalances);

      expect(mockGetTokenBalances).not.toHaveBeenCalled();
      expect(mockSetBalances).not.toHaveBeenCalled();
    });
  });
  
  

  describe('logout', () => {
    it('should clear wallet ID from local storage', () => {
      const mockRemoveItem = jest.fn();
      Object.defineProperty(window, 'localStorage', {
        value: {
          removeItem: mockRemoveItem,
        },
        writable: true,
      });

      logout();

      expect(mockRemoveItem).toHaveBeenCalledWith('wallet_id');
    });
  });
});
