import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Request } from 'express';
import { Model, Types } from 'mongoose';
import { RegistrationEvents } from '../../common/events/registration.events';
import { JwtUser } from '../../common/types/jwt-user.type';
import { generateCode } from '../../common/utils/code';
import {
  capitalizeFirstLetter,
  normalizePhoneNumber,
} from '../../common/utils/helper';
import { MailService } from '../../mail/mail.service';
import { RefreshTokensService } from '../refresh-tokens/refresh-tokens.service';
import { TokenPurpose } from '../tokens/schemas/token.schema';
import { TokensService } from '../tokens/tokens.service';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { BlacklistedToken } from './schemas/black-listed-token.schema';

@Injectable()
export class AuthService {
  private readonly SALT_VALUE = 12;

  constructor(
    @InjectModel('BlacklistedToken')
    private blacklistedToken: Model<BlacklistedToken>,
    // private usersRepository: UsersRepository,
    // private tokensRepository: TokensRepository,

    private readonly eventEmitter: EventEmitter2,
    private usersService: UsersService,
    private tokensService: TokensService,
    private jwtService: JwtService,
    private mailService: MailService,
    private refreshTokensService: RefreshTokensService,
  ) {}
  async registerUser(registerUserDto: RegisterUserDto) {
    const { firstName, lastName, email, password, phoneNumber } =
      registerUserDto;

    const userExist = await this.usersService.findByEmail(email);

    if (userExist) {
      throw new ConflictException({
        message: 'Email already in use',
        status: 409,
        success: false,
      });
    }

    const hashed = await this.passwordHashing(password.trim());

    const payload = {
      firstName: firstName.toLowerCase().trim(),
      lastName: lastName.toLowerCase().trim(),
      email: email.toLowerCase().trim(),
      phoneNumber: normalizePhoneNumber(phoneNumber.trim()),
      password: hashed,
    };

    const newUser = await this.usersService.create(payload);

    console.log('newUser:', newUser);

    const token = generateCode(6);
    const input = {
      userId: newUser._id,
      purpose: TokenPurpose.EMAIL_VERIFICATION,
      token: token.toString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
    const userToken = await this.tokensService.createToken(input);
    console.log('userToken:', userToken);

    const capitalizedName = capitalizeFirstLetter(newUser.firstName);
    console.log('capitalizedName:', capitalizedName);

    const mailResponse = await this.mailService.sendVerificationEmail(
      newUser.email,
      capitalizedName,
      userToken.token,
    );
    console.log('mailResponse:', mailResponse);

    return {
      data: null,
      message: `${capitalizeFirstLetter(newUser.firstName)} ${capitalizeFirstLetter(newUser.lastName)}, your registration is successful, kindly check your email to proceed.`,
    };
  }

  async verifyUserEmail(token: string) {
    const purpose = TokenPurpose.EMAIL_VERIFICATION;
    const tokenExist = await this.tokensService.findToken(token, purpose);

    const userExist = await this.usersService.findUserById(tokenExist.user);

    const verify = await this.usersService.verifyUser(userExist._id);

    await this.tokensService.deleteToken(tokenExist._id);

    const userId = userExist._id;
    const userEmail = userExist.email;

    this.eventEmitter.emit(RegistrationEvents.email_verified, {
      userId,
      userEmail,
    });

    return {
      message: 'Email verification successful',
    };
  }

  async loginUser(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);

    if (!user || user === null) {
      throw new UnauthorizedException({
        message: 'Invalid credentials.',
        status: 401,
        success: false,
      });
    }

    const hash = user?.password;

    if (!hash) {
      throw new UnauthorizedException({
        message: 'Invalid credentials',
        success: false,
        status: 401,
      });
    }
    const passwordMatch = await this.comaparePassword(password, hash);

    if (passwordMatch !== true) {
      throw new UnauthorizedException({
        message: 'Invalid credentials.',
        status: 401,
        success: false,
      });
    }

    if (user.isVerified !== true) {
      const tokenNum = generateCode(6);
      const purpose = TokenPurpose.EMAIL_VERIFICATION;
      const input = {
        userId: user._id,
        purpose,
        token: tokenNum.toString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
      const token =
        (await this.tokensService.findOneByUserIdAndPurpose(
          user._id,
          purpose,
        )) ?? (await this.tokensService.createToken(input));

      const capitalizedName = capitalizeFirstLetter(user.firstName);
      console.log('capitalizedName:', capitalizedName);

      await this.mailService.sendVerificationEmail(
        user.email,
        capitalizedName,
        token.token,
      );

      throw new UnauthorizedException({
        message: `${capitalizeFirstLetter(user.firstName)} ${capitalizeFirstLetter(user.lastName)}, Please verify your email to proceed.`,
        status: 401,
        success: false,
      });
    } else {
      const userId = user._id.toString();

      // generate tokens

      const refreshToken = await this.refreshTokensService.generateRefreshToken(
        user.email,
        user.role,
        user._id,
      );
      const accessToken = await this.generateAccessTokens(
        user.email,
        user._id,
        user.role,
      );

      const { password, ...others } = user.toObject();

      return {
        refreshToken: refreshToken.refreshToken,
        accessToken,
        user: {
          ...others,
        },
      };
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new NotFoundException({
        message: 'User not found',
        success: false,
        status: 404,
      });
    }

    // work on a situation that user that is not verified what to use the forgot password endpoint(throw error. generate email verification pin for the user to first verify his email address and in this situation, the frontend route the user to the email verification page if the response is to verify email)
    // if(user.isVerified !== true) {

    // }

    let realToken: string;

    const purpose = TokenPurpose.PASSWORD_RESET;
    const checkTokenExist = await this.tokensService.findOneByUserIdAndPurpose(
      user._id,
      purpose,
    );

    if (checkTokenExist) {
      realToken = checkTokenExist.token;
    } else {
      const token = generateCode(6);

      const input = {
        userId: user._id,
        purpose,
        token: token.toString(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };

      const newToken = await this.tokensService.createToken(input);

      realToken = newToken.token;
    }

    const capitalizedName = capitalizeFirstLetter(user.firstName);
    console.log('capitalizedName:', capitalizedName);

    await this.mailService.sendPasswordReset(
      user.email,
      capitalizedName,
      realToken,
    );
  }
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, password } = resetPasswordDto;

    const purpose = TokenPurpose.PASSWORD_RESET;
    const findToken = await this.tokensService.findOneByTokenAndPurpose(
      token,
      purpose,
    );

    if (!findToken) {
      throw new NotFoundException({
        message: 'Token not found or token has expired.',
        success: false,
        status: 404,
      });
    }

    const hashedPassword = await this.passwordHashing(password);

    const user = await this.usersService.updatePassword(
      findToken.user,
      hashedPassword,
    );

    if (!user) {
      throw new BadRequestException({
        message: 'Unable to change password',
        success: false,
        status: 400,
      });
    }

    return {
      message: 'Password changed successfully.',
    };
  }
  async requestAccessToken(user: {
    sub: Types.ObjectId;
    email: string;
    role: string;
  }) {
    const { email, sub, role } = user;
    const accessToken = this.generateAccessTokens(email, sub, role);

    return accessToken;
  }
  async resendEmailVerificationToken(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const userExist = await this.usersService.findByEmail(email);

    if (!userExist) {
      throw new NotFoundException({
        message: 'User not found',
        status: 404,
        success: false,
      });
    }

    if (userExist.isVerified) {
      throw new UnauthorizedException({
        message: 'User already verified',
        status: 401,
        success: false,
      });
    }

    const tokenNum = generateCode(6);
    const purpose = TokenPurpose.EMAIL_VERIFICATION;
    const input = {
      userId: userExist._id,
      purpose,
      token: tokenNum.toString(),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
    const token =
      (await this.tokensService.findOneByUserIdAndPurpose(
        userExist._id,
        purpose,
      )) ?? (await this.tokensService.createToken(input));

    const capitalizedName = capitalizeFirstLetter(userExist.firstName);
    console.log('capitalizedName:', capitalizedName);

    await this.mailService.sendVerificationEmail(
      userExist.email,
      capitalizedName,
      token.token,
    );

    return {
      message: `${capitalizeFirstLetter(userExist.firstName)} ${capitalizeFirstLetter(userExist.lastName)}, Please verify your email to proceed.`,
    };
  }
  async logoutUser(req: Request, user: JwtUser) {
    const accessToken = req.headers.authorization
      ?.replace('Bearer', '')
      .trim() as string;
    const refreshToken = req.headers['x-refresh-token'] as string;

    const deleteRefreshToken =
      await this.refreshTokensService.deleteRefreshToken(
        refreshToken,
        user.sub,
      );

    const decoded = this.jwtService.decode(accessToken);

    if (!decoded?.exp) {
      throw new UnauthorizedException('Invalid access token');
    }
    const expiresAt = new Date(decoded.exp * 1000);

    await new this.blacklistedToken({
      token: accessToken,
      expiresAt,
    }).save();

    return { message: 'User logged out successfully.' };
  }

  private async comaparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    const compare = await bcrypt.compare(password, hashedPassword);
    return compare;
  }

  private async passwordHashing(password: string): Promise<string> {
    const hash = await bcrypt.hash(password, this.SALT_VALUE);

    return hash;
  }

  private async generateAccessTokens(
    email: string,
    id: Types.ObjectId,
    role: string,
  ) {
    console.log('I want to generate access token');
    const payload = { sub: id, email, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: process.env.NODE_ENV === 'production' ? '15m' : '3d',
    });

    return accessToken;
  }
}
