import { Controller, Get, Post, Query, Body, Res, UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import { OAuthClientService } from './oauth.service';
import { AuthService } from 'src/auth/auth.service';
import { JwtService } from '@nestjs/jwt/dist/jwt.service';

@Controller('oauth')
export class OauthController {
  constructor(
    private readonly oauthClientService: OAuthClientService,
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
  ) {}

  private codes = new Map<string, string>(); // code -> userId
  private pendingConsents = new Map<
    string,
    { clientId: string; redirectUri: string; state: string }
  >();

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

    // ✅ Dùng AuthService để xác thực user từ DB
    const user = await this.authService.validateUser(username, password);
    if (!user) return res.status(401).send('Invalid credentials');

    this.pendingConsents.set(user.id.toString(), { clientId, redirectUri, state });
    return res.redirect(`/oauth/consent?user_id=${user.id}`);
  }

  /** Consent page */
  @Get('consent')
async consentPage(@Query('user_id') userId: string, @Res() res: Response) {
  const consent = this.pendingConsents.get(userId);
  if (!consent) return res.status(400).send('No pending consent');

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
  @Post('consent')
  handleConsent(
    @Body('user_id') userId: string,
    @Body('decision') decision: string,
    @Res() res: Response,
  ) {
    const consent = this.pendingConsents.get(userId);
    if (!consent) return res.status(400).send('No pending consent');

    this.pendingConsents.delete(userId);

    if (decision !== 'approve') {
      return res.redirect(
        `${consent.redirectUri}?error=access_denied&state=${consent.state}`,
      );
    }

    const code = uuidv4();
    this.codes.set(code, userId);

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

  // ✅ 1. Xác minh client
  const client = await this.oauthClientService.validateClient(
    client_id,
    client_secret,
    redirect_uri,
  );
  if (!client) throw new UnauthorizedException('Invalid client');

  // ✅ 2. Password Grant
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

  // ✅ 3. Authorization Code Grant
  if (grant_type === 'authorization_code') {
    const userId = this.codes.get(code);
    if (!userId) throw new UnauthorizedException('Invalid or expired code');
    this.codes.delete(code);

    // 🔑 Tìm user từ danh sách users hoặc DB
    const user = await this.authService.findById(Number(userId)) // nếu bạn lưu trong map `this.users`
    // Nếu bạn dùng DB thì: const user = await this.authService.findById(userId);

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
      // Có thể lấy thêm user từ DB nếu cần
      return { sub: payload.sub, username: payload.username };
    } catch (err) {
      return { error: 'invalid_token' };
    }
  }

  /** Quick test redirect-to-login */
  @Get('redirect-to-login')
  redirectToLogin(@Res() res: Response) {
    const clientId = 'client_123';
    const redirectUri = 'http://localhost:3000/callback';
    const state = 'xyz';
    const url = `http://localhost:3000/oauth/login?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
    return res.redirect(url);
  }
}