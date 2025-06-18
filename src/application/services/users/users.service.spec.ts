import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { User } from '@domain/users/entities/user.entity';
import { UserRole } from '@domain/users/enums/user-role.enum';
import { CreateUserDto } from '@infrastructure/http/dtos/users/create-user.dto';
import { FiltersUsersDto } from '@infrastructure/http/dtos/users/filters-user.dto';
import { UpdateUserDto } from '@infrastructure/http/dtos/users/update-user.dto';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;
  let queryBuilder: SelectQueryBuilder<User>;

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
    hashPassword: jest.fn(),
    validatePassword: jest.fn().mockResolvedValue(true)
  };

  const mockAdmin: User = {
    id: '2',
    email: 'admin@example.com',
    password: 'hashedPassword',
    name: 'Admin User',
    role: UserRole.ADMIN,
    googleId: "GT-XXXXXXXXX",
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    hashPassword: jest.fn(),
    validatePassword: jest.fn().mockResolvedValue(true)
  };

  const mockQueryBuilder = {
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
    createQueryBuilder: jest.fn(() => mockQueryBuilder),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
    queryBuilder = mockQueryBuilder as any;

    jest.clearAllMocks();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: UserRole.USER,
    };

    it('should create a new user successfully', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockUser);
      mockRepository.save.mockResolvedValue(mockUser);

      const result = await service.create(createUserDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createUserDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockUser);
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.create(createUserDto)).rejects.toThrow(
        new ConflictException('Email já está em uso')
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: createUserDto.email },
      });
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const query: FiltersUsersDto = {
      order: 'asc',
      page: 1,
      limit: 10,
      sortBy: 'name',
      role: UserRole.USER,
    };

    it('should return paginated users for admin', async () => {
      const users = [mockUser];
      const total = 1;

      mockQueryBuilder.getManyAndCount.mockResolvedValue([users, total]);
      const result = await service.findAll(query, mockAdmin);

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'user.role = :role',
        { role: query.role }
      );

      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        'user.name',
        'ASC'
      );

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);

      expect(result).toEqual({
        data: [{
          id: '1',
          email: 'test@example.com',
          name: 'Test User',
          role: UserRole.USER,
          googleId: 'GT-XXXXXXXXX',
          lastLoginAt: mockUser.lastLoginAt,
          createdAt: mockUser.createdAt,
          updatedAt: mockUser.updatedAt
        }],
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          pages: 1,
        },
      });
    });

    it('should throw ForbiddenException for non-admin users', async () => {
      await expect(service.findAll(query, mockUser)).rejects.toThrow(
        new ForbiddenException(
          'Apenas administradores podem listar todos os usuários'
        )
      );
    });

    it('should return null if query parameters are missing', async () => {
      const incompleteQuery = { order: 'asc' } as FiltersUsersDto;

      const result = await service.findAll(incompleteQuery, mockAdmin);

      expect(result).toBeNull();
    });

    it('should not filter by role if role is not provided', async () => {
      const queryWithoutRole = { ...query, role: undefined };
      const users = [mockUser];
      const total = 1;

      mockQueryBuilder.getManyAndCount.mockResolvedValue([users, total]);

      await service.findAll(queryWithoutRole, mockAdmin);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a user by id', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findOne('1');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' }
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        new NotFoundException('Usuário não encontrado')
      );
    });
  });

  describe('findByEmail', () => {
    it('should return a user by email', async () => {
      mockRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.findByEmail('test@example.com');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findByGoogleId', () => {
    it('should return a user by googleId', async () => {
      const userWithGoogleId = { ...mockUser, googleId: 'google123' };
      mockRepository.findOne.mockResolvedValue(userWithGoogleId);

      const result = await service.findByGoogleId('google123');

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { googleId: 'google123' },
      });
      expect(result).toEqual(userWithGoogleId);
    });

    it('should return null if user not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findByGoogleId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated Name',
      email: 'updated@example.com',
    };

    beforeEach(() => {
      jest.clearAllMocks();
      mockRepository.findOne.mockReset();
    });

    it('should update user successfully when admin updates any user', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue({ ...mockUser, ...updateUserDto });

      const result = await service.update('1', updateUserDto, mockAdmin);

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { email: updateUserDto.email },
      });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateUserDto.name);
      expect(result.email).toBe(updateUserDto.email);
    });


    it('should update user successfully when user updates own data', async () => {
      const userToUpdate = {
        ...mockUser,
        email: 'original@example.com'
      };

      mockRepository.findOne.mockResolvedValueOnce(userToUpdate);
      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.save.mockResolvedValue({ ...userToUpdate, ...updateUserDto });

      const result = await service.update('1', updateUserDto, mockUser);

      expect(mockRepository.findOne).toHaveBeenCalledTimes(2);

      expect(mockRepository.findOne).toHaveBeenNthCalledWith(1, {
        where: { id: '1' }
      });

      expect(mockRepository.findOne).toHaveBeenNthCalledWith(2, {
        where: { email: updateUserDto.email },
      });

      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateUserDto.name);
      expect(result.email).toBe(updateUserDto.email);
    });

    it('should update user successfully when user updates own data without changing email', async () => {
      const updateUserDtoWithoutEmail: UpdateUserDto = {
        name: 'Updated Name',
      };

      mockRepository.findOne.mockResolvedValueOnce(mockUser);
      mockRepository.save.mockResolvedValue({ ...mockUser, ...updateUserDtoWithoutEmail });

      const result = await service.update('1', updateUserDtoWithoutEmail, mockUser);

      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateUserDtoWithoutEmail.name);
    });

    it('should throw ForbiddenException when non-admin tries to update other user', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.update('2', updateUserDto, mockUser)).rejects.toThrow(
        new ForbiddenException('Você só pode atualizar seus próprios dados')
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '2' } });
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when non-admin tries to update role', async () => {
      const updateWithRole = { ...updateUserDto, role: UserRole.ADMIN };

      mockRepository.findOne.mockResolvedValueOnce(mockUser);

      await expect(service.update('1', updateWithRole, mockUser)).rejects.toThrow(
        new ForbiddenException('Você não pode alterar seu próprio papel')
      );

      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: '1' } });
      expect(mockRepository.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('remove', () => {
    beforeEach(() => {
      jest.spyOn(service, 'findOne').mockResolvedValue(mockUser);
    });

    it('should remove user successfully when admin removes other user',
      async () => {
        await service.remove('1', mockAdmin);

        expect(service.findOne).toHaveBeenCalledWith('1');
        expect(mockRepository.remove).toHaveBeenCalledWith(mockUser);
      }
    );

    it('should throw ForbiddenException when non-admin tries to remove user',
      async () => {
        await expect(service.remove('1', mockUser)).rejects.toThrow(
          new ForbiddenException('Apenas administradores podem excluir usuários')
        );
      }
    );

    it('should throw ForbiddenException when admin tries to remove own account',
      async () => {
        await expect(service.remove('2', mockAdmin)).rejects.toThrow(
          new ForbiddenException('Você não pode excluir sua própria conta')
        );
      }
    );
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      const userId = '1';

      await service.updateLastLogin(userId);

      expect(mockRepository.update).toHaveBeenCalledWith(userId, {
        lastLoginAt: expect.any(Date),
      });
    });
  });

  describe('findInactiveUsers', () => {
    it('should return users inactive for more than 30 days', async () => {
      const inactiveUsers = [mockUser];
      mockQueryBuilder.getMany.mockResolvedValue(inactiveUsers);

      const result = await service.findInactiveUsers();

      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('user');

      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'user.lastLoginAt < :date OR user.lastLoginAt IS NULL',
        { date: expect.any(Date) }
      );

      expect(result).toEqual(inactiveUsers);
    });
  });

  describe('sanitizeUser', () => {
    it('should remove password from user object', () => {
      const user = {
        id: '1',
        email: 'test@example.com',
        password: 'secret',
        name: 'Test User',
        role: UserRole.USER,
        googleId: 'GT-XXXXXXXXX',
        lastLoginAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      } as User;

      const sanitized = service['sanitizeUser'](user);

      expect(sanitized).not.toHaveProperty('password');
      expect(sanitized).toEqual({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        role: UserRole.USER,
        googleId: 'GT-XXXXXXXXX',
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      });
    });
  });
});