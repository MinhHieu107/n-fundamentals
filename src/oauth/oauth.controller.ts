import { Controller, Get, Post, Query, Body, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OAuthClientService } from './oauth.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';
import { RedisService } from './redis.service';


@Controller('oauth')
export class OauthController {
  constructor(
    private readonly oauthClientService: OAuthClientService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService, // ✅ inject Redis
  ) {}

  /** Form login */
  @Get('login')
  loginForm(
    @Query('client_id') clientId: string,
    @Query('redirect_uri') redirectUri: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    return res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Login</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
        }
        .card {
          background: #fff;
          border-radius: 16px;
          padding: 40px 30px;
          width: 340px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          animation: fadeIn 0.6s ease;
        }
        h2 {
          font-size: 22px;
          text-align: center;
          margin-bottom: 20px;
          color: #444;
        }
        label {
          display: block;
          font-weight: bold;
          margin-bottom: 6px;
          color: #555;
        }
        input[type="text"],
        input[type="password"],
        input[name="username"],
        input[name="password"] {
          width: 100%;
          padding: 10px 12px;
          margin-bottom: 18px;
          border: 1px solid #ccc;
          border-radius: 8px;
          font-size: 14px;
        }
        button {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 15px;
          font-weight: bold;
          background-color: #2575fc;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        button:hover {
          background-color: #1a5ed1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37,117,252,0.4);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9);}
          to { opacity: 1; transform: scale(1);}
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Login</h2>
        <form method="POST" action="/oauth/login">
          <input type="hidden" name="client_id" value="${clientId}" />
          <input type="hidden" name="redirect_uri" value="${redirectUri}" />
          <input type="hidden" name="state" value="${state}" />

          <label for="username">Username</label>
          <input id="username" name="username" type="text" placeholder="Enter your username" required />

          <label for="password">Password</label>
          <input id="password" name="password" type="password" placeholder="Enter your password" required />

          <button type="submit">Login</button>
        </form>
      </div>
    </body>
    </html>
    `);
  }

  /** Handle login -> redirect to consent */
  @Post('login')
  async handleLogin(
    @Body('username') username: string,
    @Body('password') password: string,
    @Body('client_id') clientId: string,
    @Body('redirect_uri') redirectUri: string,
    @Body('state') state: string,
    @Res() res: Response,
  ) {
    const client = await this.oauthClientService.findByClientId(clientId);
    if (!client || client.redirectUri !== redirectUri) {
      return res.status(400).send('Invalid client or redirect_uri');
    }

    const user = await this.authService.validateUser(username, password);
    if (!user) return res.status(401).send('Invalid credentials');

    
    // Khi restart lại thì app có mất cái state, data hiện tại, nếu như code cũ khi restart app rồi f5 trên front thì sẽ báo no pending ngay
    // Do nếu chỉ dùng Map hoặc object thường thì data chỉ nằm trong RAM của node process, nên nếu reset thì ram sẽ reset theo -> mất data
    //Có 1 số phương pháp thường dùng như có thể lưu vào bảng trong database, lưu các ttin quan trọng tại cái phase đó
    // Có thể dùng redis đẻ lưu data trong redis server để tách với nodejs
    // Session store nếu chỉ cần gắn với phiên người dùng
    await this.redisService.set(
      `oauth:consent:${user.id}`,
      JSON.stringify({ clientId, redirectUri, state }),
      300, // TTL 5 phút
    );

    return res.redirect(`/oauth/consent?user_id=${user.id}`);
  }

  /** Consent page */
  @Get('consent')
  async consentPage(@Query('user_id') userId: string, @Res() res: Response) {
    const consentRaw = await this.redisService.get(`oauth:consent:${userId}`);
    if (!consentRaw) return res.status(400).send('No pending consent');

    const consent = JSON.parse(consentRaw);
    const client = await this.oauthClientService.findByClientId(consent.clientId);
    const scopes = client?.scopes?.join(', ') || 'basic';

    return res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Consent</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, sans-serif;
          background: linear-gradient(135deg, #6a11cb, #2575fc);
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          color: #333;
        }
        .card {
          background: #fff;
          border-radius: 16px;
          padding: 40px 30px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          width: 340px;
          text-align: center;
          animation: fadeIn 0.6s ease;
        }
        h2 {
          font-size: 22px;
          margin-bottom: 16px;
          color: #444;
        }
        p {
          font-size: 15px;
          color: #555;
          margin-bottom: 28px;
        }
        form {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        button {
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        button[name="decision"][value="approve"] {
          background-color: #2575fc;
          color: #fff;
        }
        button[name="decision"][value="approve"]:hover {
          background-color: #1a5ed1;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(37,117,252,0.4);
        }
        button[name="decision"][value="deny"] {
          background-color: #db4437;
          color: #fff;
        }
        button[name="decision"][value="deny"]:hover {
          background-color: #b23327;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(219,68,55,0.4);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9);}
          to { opacity: 1; transform: scale(1);}
        }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>${client?.name || 'This app'} requests access</h2>
        <p>Requested scopes: <strong>${scopes}</strong></p>
        <form method="POST" action="/oauth/consent">
          <input type="hidden" name="user_id" value="${userId}" />
          <button type="submit" name="decision" value="approve">Allow</button>
          <button type="submit" name="decision" value="deny">Deny</button>
        </form>
      </div>
    </body>
    </html>
    `);
  }

  /** Handle consent -> issue code */
  /** Handle consent -> issue code */
@Post('consent')
async handleConsent(
  @Body('user_id') userId: string,
  @Body('decision') decision: string,
  @Res() res: Response,
) {
  const consentRaw = await this.redisService.get(`oauth:consent:${userId}`);
  if (!consentRaw) return res.status(400).send('No pending consent');

  const consent = JSON.parse(consentRaw);

  if (decision !== 'approve') {
  
    return res.redirect(
      `/oauth/login?client_id=${consent.clientId}&redirect_uri=${consent.redirectUri}&state=${consent.state}`,
    );
  }

  // ✅ Nếu approve thì mới xóa pending consent
  await this.redisService.del(`oauth:consent:${userId}`);

  const code = uuidv4();
  await this.redisService.set(`oauth:codes:${code}`, userId, 300);

  let redirect = `${consent.redirectUri}?code=${code}`;
  if (consent.state) redirect += `&state=${consent.state}`;
  return res.redirect(redirect);
}

  /** Exchange code or password for JWT access token */
  @Post('token')
  async getToken(
    @Body()
    body: {
      grant_type: string;
      client_id: string;
      client_secret: string;
      redirect_uri: string;
      username?: string;
      password?: string;
      code?: string;
    },
  ) {
    const {
      grant_type,
      client_id,
      client_secret,
      redirect_uri,
      username,
      password,
      code,
    } = body;

    const client = await this.oauthClientService.validateClient(
      client_id,
      client_secret,
      redirect_uri,
    );
    if (!client) throw new UnauthorizedException('Invalid client');

    if (grant_type === 'password') {
      const user = await this.authService.validateUser(username, password);
      if (!user) throw new UnauthorizedException('Invalid credentials');

      const tokens = await this.authService.login(user);
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: 'Bearer',
        expires_in: 3600,
      };
    }

    if (grant_type === 'authorization_code') {
      const userId = await this.redisService.get(`oauth:codes:${code}`);
      if (!userId) throw new UnauthorizedException('Invalid or expired code');
      await this.redisService.del(`oauth:codes:${code}`);

      const user = await this.authService.findById(Number(userId));
      if (!user) throw new UnauthorizedException('User not found');

      const tokens = await this.authService.login(user);
      return {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: 'Bearer',
        expires_in: 3600,
      };
    }

    throw new UnauthorizedException('Unsupported grant_type');
  }

  /** Get user info from JWT */
  @Get('userinfo')
  async userinfo(@Query('access_token') token: string) {
    try {
      const payload = this.jwtService.verify(token);
      return { sub: payload.sub, username: payload.username };
    } catch (err) {
      return { error: 'invalid_token' };
    }
  }

  @Get('redirect-to-login')
  redirectToLogin(@Res() res: Response) {
    const clientId = 'client_123';
    const redirectUri = 'http://localhost:3000/callback';
    const state = 'xyz';
    const url = `http://localhost:3000/oauth/login?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
    return res.redirect(url);
  }
}
