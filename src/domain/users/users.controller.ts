import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags
} from '@nestjs/swagger';

import { Roles } from '@application/auth/decorators/roles.decorator';
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@application/auth/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { FiltersUsersDto } from './dto/filters-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entities/user.entity';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Criar novo usuário (Administradores)' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários (Administradores)' })
  @ApiResponse({ status: 200, description: 'Lista de usuários' })
  findAll(@Query() query: FiltersUsersDto, @Request() req) {
    return this.usersService.findAll(query, req.user);
  }

  @Get('inactive')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Listar usuários inativos (Administradores)' })
  @ApiResponse({ status: 200, description: 'Lista de usuários inativos' })
  async findInactiveUsers() {
    const inactiveUsers = await this.usersService.findInactiveUsers();

    return {
      data: inactiveUsers.map(user => {
        const { password, ...sanitizedUser } = user;
        return sanitizedUser;
      }),
      count: inactiveUsers.length,
    };
  }

  @Get('me')
  @ApiOperation({ summary: 'Obter dados do usuário logado' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  getProfile(@Request() req) {
    const { password, ...user } = req.user;

    return user;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter usuário por ID' })
  @ApiResponse({ status: 200, description: 'Dados do usuário' })
  async findOne(@Param('id') id: string, @Request() req) {
    const user = await this.usersService.findOne(id);

    if (req.user.role !== UserRole.ADMIN && req.user.id !== id) {
      throw new ForbiddenException('Você só pode ver seus próprios dados');
    }

    const { password, ...sanitizedUser } = user;

    return sanitizedUser;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar usuário' })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    const user = await this.usersService.update(id, updateUserDto, req.user);
    const { password, ...sanitizedUser } = user;

    return sanitizedUser;
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Excluir usuário (Administradores)' })
  @ApiResponse({ status: 200, description: 'Usuário excluído com sucesso' })
  remove(@Param('id') id: string, @Request() req) {
    return this.usersService.remove(id, req.user);
  }
}