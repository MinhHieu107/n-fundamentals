import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
@Controller()
export class CallbackController {
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    if (!code) {
      return res.status(400).send('Missing code');
    }
    try {
     
      const tokenRes = await axios.post('http://localhost:3000/oauth/token', {
        grant_type: 'authorization_code',
        code,
        client_id: 'client_123',
        client_secret: 'secret_abc',
        redirect_uri: 'http://localhost:3000/callback', 
      });

      const accessToken = tokenRes.data.access_token;
      const refreshToken = tokenRes.data.refresh_token;

      if (!accessToken) {
        return res.status(400).send('Token exchange failed');
      }

      const redirectUrl =
        `http://localhost:5500/index.html?access_token=${accessToken}` +
        `&refresh_token=${refreshToken}&state=${state}`;

      return res.redirect(307, redirectUrl);
    } catch (err) {
      console.error('Callback error:', err.message);
      return res.status(500).send('Internal server error');
    }
  }
}
