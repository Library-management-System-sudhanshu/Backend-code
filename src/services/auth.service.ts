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

    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Automatically generate a unique subdomain from the workspace name
    const baseSubdomain = data.workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'workspace';
    let subdomain = baseSubdomain;
    let counter = 1;
    while (await Workspace.findOne({ where: { subdomain } })) {
      subdomain = `${baseSubdomain}-${counter}`;
      counter++;
    }

    const workspace = await Workspace.create({
      name: data.workspaceName,
      subdomain,
      address: data.address,
      logo: data.logo || null,
      gstNumber: data.gstNumber || null,
      pincode: data.pincode || null,
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
      role: 'OWNER',
      workspaceId: workspace.id,
      branchId: branch.id,
    } as any);

    const userWithWorkspace = await User.findByPk(user.id, {
      include: [Workspace]
    });

    return this.generateTokenResponse(userWithWorkspace!);
  }

  async login(data: any) {
    const user = await User.findOne({ 
      where: { email: data.email },
      include: [Workspace]
    });
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
        workspace: user.workspace ? {
          id: user.workspace.id,
          name: user.workspace.name,
          address: user.workspace.address,
          pincode: user.workspace.pincode,
          gstNumber: user.workspace.gstNumber,
          subdomain: user.workspace.subdomain
        } : null
      },
    };
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await user.update({ fcmToken });
    return user;
  }

  async getProfile(userId: string) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [Workspace]
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, data: any) {
    const user = await User.findByPk(userId, { include: [Workspace] });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) {
      if (data.email !== user.email) {
        const existing = await User.findOne({ where: { email: data.email } });
        if (existing) {
          throw new BadRequestException('Email already registered');
        }
      }
      updateData.email = data.email;
    }
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.avatar !== undefined) updateData.avatar = data.avatar;

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    await user.update(updateData);

    // Update Workspace details if provided
    if (user.workspace) {
      const wsUpdate: any = {};
      if (data.workspaceName !== undefined) wsUpdate.name = data.workspaceName;
      if (data.address !== undefined) wsUpdate.address = data.address;
      if (data.gstNumber !== undefined) wsUpdate.gstNumber = data.gstNumber;
      if (data.pincode !== undefined) wsUpdate.pincode = data.pincode;

      if (Object.keys(wsUpdate).length > 0) {
        await user.workspace.update(wsUpdate);
      }
    }
    
    // Fetch fresh user record with workspace info
    const freshUser = await User.findByPk(userId, { include: [Workspace] });
    return {
      id: freshUser!.id,
      email: freshUser!.email,
      name: freshUser!.name,
      role: freshUser!.role,
      workspaceId: freshUser!.workspaceId,
      branchId: freshUser!.branchId,
      mobile: freshUser!.mobile,
      avatar: freshUser!.avatar,
      workspace: freshUser!.workspace ? {
        id: freshUser!.workspace.id,
        name: freshUser!.workspace.name,
        address: freshUser!.workspace.address,
        gstNumber: freshUser!.workspace.gstNumber,
        pincode: freshUser!.workspace.pincode,
        subdomain: freshUser!.workspace.subdomain
      } : null
    };
  }

  async googleLogin(idToken: string) {
    let googlePayload: any;
    if (idToken.startsWith('mock-token-')) {
      try {
        const parts = idToken.replace('mock-token-', '').split('.');
        const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
        googlePayload = JSON.parse(payloadJson);
      } catch (err) {
        throw new UnauthorizedException('Invalid mock token format');
      }
    } else {
      try {
        const verifyRes = await (globalThis as any).fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        googlePayload = await verifyRes.json();
        if (googlePayload.error_description) {
          throw new Error(googlePayload.error_description);
        }
      } catch (err: any) {
        throw new UnauthorizedException(err.message || 'Google token validation failed');
      }
    }

    const { email, name, sub: googleId } = googlePayload;
    if (!email) {
      throw new BadRequestException('Email address not provided by Google');
    }

    let user = await User.findOne({
      where: { email },
      include: [Workspace]
    });

    if (!user) {
      // Register new user (Owner role, workspaceId is null initially)
      user = await User.create({
        email,
        name: name || 'Google User',
        googleId,
        role: 'OWNER',
      } as any);
    } else if (!user.googleId) {
      // Link Google Account to existing email
      await user.update({ googleId });
    }

    const tokenResponse = this.generateTokenResponse(user);
    return {
      ...tokenResponse,
      requiresWorkspaceInfo: !user.workspaceId,
    };
  }

  async setupWorkspace(userId: string, data: any) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.workspaceId) {
      throw new BadRequestException('User already has a registered workspace');
    }

    // Generate unique subdomain
    const baseSubdomain = data.workspaceName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'workspace';
    let subdomain = baseSubdomain;
    let counter = 1;
    while (await Workspace.findOne({ where: { subdomain } })) {
      subdomain = `${baseSubdomain}-${counter}`;
      counter++;
    }

    // Create Workspace
    const workspace = await Workspace.create({
      name: data.workspaceName,
      subdomain,
      address: data.address,
      pincode: data.pincode || null,
      gstNumber: data.gstNumber || null,
      logo: data.logo || null,
    } as any);

    // Create default branch
    const branch = await Branch.create({
      workspaceId: workspace.id,
      name: 'Main Branch',
      address: data.address,
    } as any);

    // Create default settings
    await WorkspaceSetting.create({
      workspaceId: workspace.id,
      themeColor: '#2563EB',
    } as any);

    // Link user to workspace & branch
    await user.update({
      workspaceId: workspace.id,
      branchId: branch.id,
    });

    // Fetch user with inclusion
    const updatedUser = await User.findByPk(userId, {
      include: [Workspace]
    });

    return this.generateTokenResponse(updatedUser!);
  }
}
