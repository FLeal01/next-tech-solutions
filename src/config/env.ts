const jwtSecret = process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !jwtSecret) {
  throw new Error('JWT_SECRET es obligatorio cuando NODE_ENV=production');
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: jwtSecret ?? 'dev-secret-cambiar-en-produccion',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
} as const;
