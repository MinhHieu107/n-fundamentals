// src/auth/auth.controller.ts
import { Body, Controller, Post, UseGuards, Request, Get, Req, UnauthorizedException, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { AuthGuard } from '@nestjs/passport';




@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService,
    private jwtService: JwtService,
  ) {}

  @Post('register')
  async register(@Body() body: { username: string, password: string }) {
    return this.authService.register(body.username, body.password);
  }

  @Post('login')
async login(@Body() body: { username: string, password: string }) {
  console.log('Login attempt:', body);
  const user = await this.authService.validateUser(body.username, body.password);
  console.log('Validated user:', user);
  if (!user) return { message: 'Invalid credentials' };
  return this.authService.login(user);
}

  @Post('refresh')
async refresh(@Req() req, @Body() body: { refresh_token: string }) {
  try {
    // Lấy access token từ header
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token missing');
    }
    const accessToken = authHeader.split(' ')[1];

    // Kiểm tra access token (có thể hết hạn nhưng vẫn decode payload)
    let accessPayload;
    try {
      accessPayload = this.jwtService.verify(accessToken, { secret: 'SECRET_KEY' });
    } catch (e) {
      // Nếu muốn vẫn cho refresh khi access token expired, có thể dùng decode thay verify strict
      accessPayload = this.jwtService.decode(accessToken);
      if (!accessPayload) throw new UnauthorizedException('Invalid access token');
    }

    // Kiểm tra refresh token
    const refreshPayload = this.jwtService.verify(body.refresh_token, { secret: 'SECRET_KEY' });

    // So sánh user/sub của access token và refresh token
    if (accessPayload.sub !== refreshPayload.sub) {
      throw new UnauthorizedException('Token mismatch');
    }

    // Tạo access token mới
    const newAccessToken = this.jwtService.sign(
      { username: refreshPayload.username, sub: refreshPayload.sub },
      { expiresIn: '1h' },
    );

    return { access_token: newAccessToken };
  } catch (e) {
    console.log(e);
    return { message: 'Refresh token expired or invalid' };
  }
}
    @Post('forgot-password')
  async forgotPassword(@Body('username') username: string) {
    const resetToken = await this.authService.forgotPassword(username);
    if (!resetToken) {
      return { message: 'Username not found' };
    }
    return { message: 'Reset token generated', resetToken };
  }
  @Post('reset-password')
  async resetPassword(
    @Body() body: { token: string; newPassword: string }
  ) {
    try {
      await this.authService.resetPassword(body.token, body.newPassword);
      return { message: 'Password updated successfully' };
    } catch (e) {
      return { message: e.message };
    }
  }
  
    //@Get('google')
    //@UseGuards(AuthGuard('google'))
   // async googleAuth(@Req() req: Request) {
       
    //}
  @Get('test')
   async  Test(@Req() req, @Res() res) {    
    const redirectUrl = `http://localhost:5500/indexs.html`
    const httpCode = 307; 

  return res.redirect(httpCode, redirectUrl);
  }

  @Get('google/callback')
    @UseGuards(AuthGuard('google'))
  async  googleAuthRedirect(@Req() req, @Res() res) {

    //console.log('req.user:', req.user); 
    const jwt = await this.authService.login(req.user);
    
    console.log(jwt);

    
    const redirectUrl = `http://localhost:5500/index.html?access_token=${jwt.access_token}&refresh_token=${jwt.refresh_token}`;
    const httpCode = 307; 

  return res.redirect(httpCode, redirectUrl);
  }

@UseGuards(JwtAuthGuard)
@Get('protected-route')
getProtected(@Req() req) {
  return { user: req.user };
}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
getProfile(@Request() req) {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];
  return "Token is verify, you can access the resources";
}

}
