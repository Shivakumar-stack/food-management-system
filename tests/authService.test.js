const authService = require('../services/authService');
const User = require('../models/User');

// Mocking Mongoose model interactions
jest.mock('../models/User');

describe('Auth Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('loginUser', () => {
        it('should throw an error if the user is not found', async () => {
            // Setup the mock to return null (user not found)
            User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(null)
            });

            await expect(authService.loginUser('test@foodbridge.com', 'password123'))
                .rejects
                .toThrow('Invalid email or password');
        });

        it('should throw an error if the user account is not active', async () => {
            const mockUser = {
                email: 'suspended@foodbridge.com',
                status: 'suspended',
                comparePassword: jest.fn().mockResolvedValue(true)
            };

            User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            await expect(authService.loginUser(mockUser.email, 'password123'))
                .rejects
                .toThrow('Account is not active. Please contact support.');
        });

        it('should log in a valid active user', async () => {
            const mockUser = {
                email: 'active@foodbridge.com',
                status: 'active',
                loginCount: 0,
                comparePassword: jest.fn().mockResolvedValue(true),
                save: jest.fn().mockResolvedValue(true)
            };

            User.findOne.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockUser)
            });

            const user = await authService.loginUser(mockUser.email, 'password123');
            expect(user).toBeDefined();
            expect(user.loginCount).toBe(1);
            expect(mockUser.save).toHaveBeenCalledTimes(1);
        });
    });
});
