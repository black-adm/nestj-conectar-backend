import {
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { User } from '../../domain/users/entities/user.entity';
import { UserRole } from '../../domain/users/enums/user-role.enum';
import { UsersService } from '../../domain/users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser: User = {
    id: '1',
    email: 'test@example.com',
    password: 'hashedPassword',
    name: 'Test User',
    role: UserRole.USER,
    googleId: "GT-XXXXXXXXX",
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    validatePassword: jest.fn(),
    hashPassword: jest.fn(),
  };

  const mockUsersService: Partial<Record<keyof UsersService, jest.Mock>> = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    updateLastLogin: jest.fn()
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const registerDto: RegisterDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
    };

    it('should register a new user successfully', async () => {
      const createdUser = {
        ...mockUser,
        email: registerDto.email,
        name: registerDto.name
      };

      mockUsersService.findByEmail?.mockResolvedValue(null);
      mockUsersService.create?.mockResolvedValue(createdUser);

      const result = await service.register(registerDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerDto,
        role: UserRole.USER,
      });
      expect(result).toEqual({ userId: createdUser.id });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail?.mockResolvedValue(mockUser);

      await expect(service.register(registerDto)).rejects.toThrow(
        new ConflictException('Email já está em uso')
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email
      );
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginDto: LoginDto = {
      email: 'test@example.com',
      password: 'password123',
    };

    const mockToken = 'mock.jwt.token';

    beforeEach(() => {
      mockJwtService.sign.mockReturnValue(mockToken);
    });

    it('should login user successfully with valid credentials', async () => {
      const userWithValidPassword = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(true),
      };

      mockUsersService.findByEmail?.mockResolvedValue(userWithValidPassword);
      mockUsersService.updateLastLogin?.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        loginDto.email
      );
      expect(userWithValidPassword.validatePassword).toHaveBeenCalledWith(
        loginDto.password
      );
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
        role: mockUser.role,
      });

      expect(result).toEqual({
        user: {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          role: mockUser.role,
        },
        accessToken: mockToken,
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockUsersService.findByEmail?.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Credenciais inválidas')
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        loginDto.email
      );
      expect(mockUsersService.updateLastLogin).not.toHaveBeenCalled();
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if password is invalid',
      async () => {
        const userWithInvalidPassword = {
          ...mockUser,
          validatePassword: jest.fn().mockResolvedValue(false),
        };

        mockUsersService.findByEmail?.mockResolvedValue(userWithInvalidPassword);

        await expect(service.login(loginDto)).rejects.toThrow(
          new UnauthorizedException('Credenciais inválidas')
        );

        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
          loginDto.email
        );
        expect(userWithInvalidPassword.validatePassword).toHaveBeenCalledWith(
          loginDto.password
        );
        expect(mockUsersService.updateLastLogin).not.toHaveBeenCalled();
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      }
    );

    it('should throw UnauthorizedException if validatePassword throws error',
      async () => {
        const userWithPasswordError = {
          ...mockUser,
          validatePassword: jest.fn().mockRejectedValue(
            new UnauthorizedException('Credenciais inválidas')
          ),
        };

        mockUsersService.findByEmail?.mockResolvedValue(userWithPasswordError);

        await expect(service.login(loginDto)).rejects.toThrow(
          new UnauthorizedException('Credenciais inválidas')
        );

        expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
          loginDto.email
        );
        expect(userWithPasswordError.validatePassword).toHaveBeenCalledWith(
          loginDto.password
        );
        expect(mockUsersService.updateLastLogin).not.toHaveBeenCalled();
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      }
    );
  });

  describe('googleLogin', () => {
    const googleUser = {
      id: '2',
      email: 'google@example.com',
      name: 'Google User',
      role: UserRole.USER,
      googleId: 'google123',
      picture: 'https://example.com/photo.jpg',
    };

    const mockToken = 'mock.jwt.token';

    beforeEach(() => {
      mockJwtService.sign.mockReturnValue(mockToken);
    });

    it('should login user via Google successfully', async () => {
      mockUsersService.updateLastLogin?.mockResolvedValue(undefined);

      const result = await service.googleLogin(googleUser);

      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        googleUser.id
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: googleUser.email,
        sub: googleUser.id,
        role: googleUser.role,
      });

      expect(result).toEqual({
        user: googleUser,
        accessToken: mockToken,
      });
    });

    it('should handle Google login even if updateLastLogin fails',
      async () => {
        mockUsersService.updateLastLogin?.mockRejectedValue(
          new Error('Update failed')
        );

        await expect(service.googleLogin(googleUser)).rejects.toThrow(
          'Update failed'
        );

        expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
          googleUser.id
        );

        expect(mockJwtService.sign).not.toHaveBeenCalled();
        expect(mockJwtService.sign).not.toHaveBeenCalled();
      }
    );
  });

  describe('generateToken (private method tested through public methods)',
    () => {
      it('should generate token with correct payload structure', async () => {
        const userWithValidPassword = {
          ...mockUser,
          validatePassword: jest.fn().mockResolvedValue(true),
        };

        const mockToken = 'generated.jwt.token';
        mockJwtService.sign.mockReturnValue(mockToken);
        mockUsersService.findByEmail?.mockResolvedValue(userWithValidPassword);
        mockUsersService.updateLastLogin?.mockResolvedValue(undefined);

        const loginDto: LoginDto = {
          email: 'test@example.com',
          password: 'password123',
        };

        await service.login(loginDto);

        expect(mockJwtService.sign).toHaveBeenCalledWith({
          email: mockUser.email,
          sub: mockUser.id,
          role: mockUser.role,
        });
      });

      it('should generate token for Google user with correct payload',
        async () => {
          const googleUser = {
            id: '2',
            email: 'google@example.com',
            name: 'Google User',
            role: UserRole.ADMIN,
          };

          const mockToken = 'google.jwt.token';
          mockJwtService.sign.mockReturnValue(mockToken);
          mockUsersService.updateLastLogin?.mockResolvedValue(undefined);

          await service.googleLogin(googleUser);

          expect(mockJwtService.sign).toHaveBeenCalledWith({
            email: googleUser.email,
            sub: googleUser.id,
            role: googleUser.role,
          });
        }
      );
    }
  );

  describe('Edge cases and error handling', () => {
    it('should handle register when usersService.create fails', async () => {
      const registerDto: RegisterDto = {
        email: 'newuser@example.com',
        password: 'password123',
        name: 'New User',
      };

      mockUsersService.findByEmail?.mockResolvedValue(null);
      mockUsersService.create?.mockRejectedValue(new Error('Database error'));

      await expect(service.register(registerDto)).rejects.toThrow(
        'Database error'
      );

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        registerDto.email
      );
      expect(mockUsersService.create).toHaveBeenCalledWith({
        ...registerDto,
        role: UserRole.USER,
      });
    });

    it('should handle login when updateLastLogin fails', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const userWithValidPassword = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(true),
      };

      mockUsersService.findByEmail?.mockResolvedValue(userWithValidPassword);
      mockUsersService.updateLastLogin?.mockRejectedValue(
        new Error('Update failed')
      );

      await expect(service.login(loginDto)).rejects.toThrow('Update failed');

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith(
        loginDto.email
      );
      expect(userWithValidPassword.validatePassword).toHaveBeenCalledWith(
        loginDto.password
      );
      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id
      );
    });

    it('should handle JWT signing failure', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const userWithValidPassword = {
        ...mockUser,
        validatePassword: jest.fn().mockResolvedValue(true),
      };

      mockUsersService.findByEmail?.mockResolvedValue(userWithValidPassword);
      mockUsersService.updateLastLogin?.mockResolvedValue(undefined);
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      await expect(service.login(loginDto)).rejects.toThrow(
        'JWT signing failed'
      );

      expect(mockUsersService.updateLastLogin).toHaveBeenCalledWith(
        mockUser.id
      );
      expect(mockJwtService.sign).toHaveBeenCalled();
    });
  });
});