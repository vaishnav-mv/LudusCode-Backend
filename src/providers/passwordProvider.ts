import bcrypt from 'bcryptjs'
import { singleton } from 'tsyringe'
import { IPasswordProvider } from '../interfaces/providers'

@singleton()
export class PasswordProvider implements IPasswordProvider {
    hash(password: string): string {
        return bcrypt.hashSync(password, 10);
    }

    compare(password: string, hash: string): boolean {
        return bcrypt.compareSync(password, hash);
    }
}
