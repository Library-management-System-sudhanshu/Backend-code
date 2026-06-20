import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { Workspace } from '../models/workspace.model';
import { Branch } from '../models/branch.model';
import { WorkspaceSetting } from '../models/workspace-setting.model';
import { StudentProfile } from '../models/student-profile.model';
import { BadRequestException, UnauthorizedException } from '../middlewares/error.middleware';

const JWT_SECRET = process.env.JWT_SECRET || 'studyflow_secret_key_12345';

export class AuthService {
  async register(data: any) {
    const existingUser = await User.findOne({ where: { email: data.email } });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    const existingWorkspace = await Workspace.findOne({ where: { subdomain: data.subdomain } });
    if (existingWorkspace) {
      throw new BadRequestException('Subdomain already in use');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Create Workspace
    const workspace = await Workspace.create({
      name: data.workspaceName,
      subdomain: data.subdomain,
      address: data.address,
      logo: data.logo || null,
      gstNumber: data.gstNumber || null,
    } as any);

    // Create default branch
    const branch = await Branch.create({
      workspaceId: workspace.id,
      name: 'Main Branch',
      address: data.address,
    } as any);

    // Create Workspace settings
    await WorkspaceSetting.create({
      workspaceId: workspace.id,
      themeColor: '#2563EB',
    } as any);

    // Create User (Workspace Owner)
    const user = await User.create({
      email: data.email,
      password: hashedPassword,
      name: data.name,
      mobile: data.mobile || null,
      role: 'WORKSPACE_OWNER',
      workspaceId: workspace.id,
      branchId: branch.id,
    } as any);

    return this.generateTokenResponse(user);
  }

  async login(data: any) {
    const user = await User.findOne({ where: { email: data.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateTokenResponse(user);
  }

  async requestOtp(mobile: string) {
    const user = await User.findOne({ where: { mobile } });
    if (!user) {
      throw new BadRequestException('Mobile number not registered');
    }
    // Mock OTP dispatch
    console.log(`[OTP] Generated OTP 123456 for mobile: ${mobile}`);
    return { message: 'OTP sent successfully (Mock: 123456)' };
  }

  async verifyOtp(mobile: string, otp: string) {
    const user = await User.findOne({ where: { mobile } });
    if (!user) {
      throw new BadRequestException('Mobile number not registered');
    }

    if (otp !== '123456') {
      throw new UnauthorizedException('Invalid OTP');
    }

    return this.generateTokenResponse(user);
  }

  private generateTokenResponse(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role, workspaceId: user.workspaceId };
    return {
      accessToken: jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' }),
      refreshToken: jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId,
        branchId: user.branchId,
      },
    };
  }
}
