import jwt from 'jsonwebtoken';
import config from '../config';

export const generateToken = (id: string | import('mongoose').Types.ObjectId): string => {
  const options: jwt.SignOptions = {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign({ id: id.toString() }, config.jwt.secret, options);
};
