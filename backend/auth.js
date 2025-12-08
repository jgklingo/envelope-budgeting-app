import { CognitoUserPool, CognitoUser, AuthenticationDetails, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { CognitoIdentityProviderClient, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import crypto from 'crypto';
import { query } from './db.js';

const userPool = new CognitoUserPool({
  UserPoolId: process.env.COGNITO_USER_POOL_ID,
  ClientId: process.env.COGNITO_CLIENT_ID,
});

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.COGNITO_REGION || process.env.AWS_REGION,
});

export async function register(req, res) {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    const attributeList = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'name', Value: name }),
    ];

    userPool.signUp(email, password, attributeList, null, async (err, result) => {
      if (err) {
        console.error('Cognito signup error:', err);
        return res.status(400).json({ error: err.message });
      }

      const cognitoSub = result.userSub;
      const userId = crypto.randomUUID();

      try {
        await query(
          `INSERT INTO users (id, cognito_sub, email, name, interval_type, interval_start_date)
           VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)`,
          [userId, cognitoSub, email, name, 'MONTHLY']
        );

        res.status(201).json({
          userId,
          email,
          name,
          message: 'User registered successfully. Please check your email for verification.'
        });
      } catch (dbErr) {
        console.error('Database error:', dbErr);
        res.status(500).json({ error: 'Failed to create user in database' });
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const authenticationDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: async (result) => {
        const accessToken = result.getAccessToken().getJwtToken();
        const idToken = result.getIdToken().getJwtToken();
        const refreshToken = result.getRefreshToken().getToken();

        const payload = result.getIdToken().payload;
        const cognitoSub = payload.sub;

        try {
          const userResult = await query('SELECT * FROM users WHERE cognito_sub = $1', [cognitoSub]);

          if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found in database' });
          }

          const user = userResult.rows[0];

          res.json({
            accessToken,
            idToken,
            refreshToken,
            userId: user.id,
            email: user.email,
            name: user.name,
          });
        } catch (dbErr) {
          console.error('Database error:', dbErr);
          res.status(500).json({ error: 'Failed to retrieve user from database' });
        }
      },
      onFailure: (err) => {
        console.error('Cognito auth error:', err);
        res.status(401).json({ error: err.message });
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
}

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const command = new GetUserCommand({ AccessToken: token });
    const cognitoResponse = await cognitoClient.send(command);

    const cognitoSub = cognitoResponse.UserAttributes.find(attr => attr.Name === 'sub')?.Value;

    if (!cognitoSub) {
      return res.status(403).json({ error: 'Invalid token' });
    }

    const userResult = await query('SELECT * FROM users WHERE cognito_sub = $1', [cognitoSub]);

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    req.user = { userId: userResult.rows[0].id, email: userResult.rows[0].email };
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).json({ error: 'Invalid or expired token' });
  }
}

export async function getUserSettings(req, res) {
  try {
    const userId = req.user.userId;
    const result = await query(
      'SELECT interval_type, interval_start_date, name, email FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user settings error:', error);
    res.status(500).json({ error: 'Failed to retrieve user settings' });
  }
}

export async function updateUserSettings(req, res) {
  try {
    const userId = req.user.userId;
    const { interval_type, interval_start_date } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (interval_type) {
      updates.push(`interval_type = $${paramCount}`);
      values.push(interval_type);
      paramCount++;
    }

    if (interval_start_date) {
      updates.push(`interval_start_date = $${paramCount}`);
      values.push(interval_start_date);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    await query(
      `UPDATE users SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = $${paramCount}`,
      values
    );

    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update user settings error:', error);
    res.status(500).json({ error: 'Failed to update user settings' });
  }
}
