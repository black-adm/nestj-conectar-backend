import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { User } from '@domain/users/entities/user.entity';
import { UserRole } from '@domain/users/enums/user-role.enum';
import { CreateUserDto } from '@infrastructure/http/input/dtos/users/create-user.dto';
import { FiltersUsersDto } from '@infrastructure/http/input/dtos/users/filters-user.dto';
import { UpdateUserDto } from '@infrastructure/http/input/dtos/users/update-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email já está em uso');
    }

    const user = this.usersRepository.create(createUserDto);
    return await this.usersRepository.save(user);
  }

  async findAll(query: FiltersUsersDto, currentUser: User) {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        'Apenas administradores podem listar todos os usuários'
      );
    }

    if (!query.order || !query.page || !query.limit) return null;

    const queryBuilder = this.usersRepository.createQueryBuilder('user');

    if (query.role) {
      queryBuilder.andWhere('user.role = :role', { role: query.role });
    }

    queryBuilder.orderBy(
      `user.${query.sortBy}`,
      query.order.toUpperCase() as 'ASC' | 'DESC'
    );

    const [users, total] = await queryBuilder
      .skip((query.page - 1) * query.limit)
      .take(query.limit)
      .getManyAndCount();

    return {
      data: users.map(user => this.sanitizeUser(user)),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        pages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { googleId } });
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUser: User): Promise<User> {
    const user = await this.findOne(id);

    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
      throw new ForbiddenException('Você só pode atualizar seus próprios dados');
    }

    if (currentUser.role !== UserRole.ADMIN && updateUserDto.role) {
      throw new ForbiddenException('Você não pode alterar seu próprio papel');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email já está em uso');
      }
    }

    Object.assign(user, updateUserDto);
    return this.usersRepository.save(user);
  }

  async remove(id: string, currentUser: User): Promise<void> {
    if (currentUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Apenas administradores podem excluir usuários');
    }

    if (currentUser.id === id) {
      throw new ForbiddenException('Você não pode excluir sua própria conta');
    }

    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.usersRepository.update(id, { lastLoginAt: new Date() });
  }

  async findInactiveUsers(): Promise<User[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.usersRepository
      .createQueryBuilder('user')
      .where('user.lastLoginAt < :date OR user.lastLoginAt IS NULL', {
        date: thirtyDaysAgo,
      })
      .getMany();
  }

  private sanitizeUser(user: User): Partial<User> {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      googleId: user.googleId,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}