import {
  addOwnerMembership,
  listMemberships,
  resolveMembership,
} from './membership.service';
import { requireWorkspaceWrite } from './workspace-access.service';
import { WorkspaceMembership } from '../models/workspace-membership.model';
import sequelize from '../config/database';
import { Transaction } from 'sequelize';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';
import { UserDevice } from '../models/user-device.model';
import { Workspace } from '../models/workspace.model';
import { Branch } from '../models/branch.model';
import { WorkspaceSetting } from '../models/workspace-setting.model';
import { StudentProfile } from '../models/student-profile.model';
import {
  BadRequestException,
  UnauthorizedException,
  ForbiddenException,
  HttpException,
} from '../middlewares/error.middleware';
import { getJwtSecret } from '../config/auth';
export class AuthService {
  async register(data: any, transaction?: Transaction): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) => this.register(data, t));
    const existingUser = await User.findOne({
      ...{ where: { email: data.email } },
      transaction,
    });
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(data.password, 10);
    // Automatically generate a unique subdomain from the workspace name
    const baseSubdomain =
      data.workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'workspace';
    let subdomain = baseSubdomain;
    let counter = 1;
    while (
      await Workspace.findOne({ ...{ where: { subdomain } }, transaction })
    ) {
      subdomain = `${baseSubdomain}-${counter}`;
      counter++;
    }
    const workspace = await Workspace.create(
      {
        name: data.workspaceName,
        subdomain,
        address: data.address,
        logo: data.logo || null,
        gstNumber: data.gstNumber || null,
        pincode: data.pincode || null,
      } as any,
      { transaction },
    );
    // Create default branch
    const branch = await Branch.create(
      {
        workspaceId: workspace.id,
        name: 'Main Branch',
        address: data.address,
      } as any,
      { transaction },
    );
    // Create Workspace settings
    await WorkspaceSetting.create(
      {
        workspaceId: workspace.id,
        themeColor: '#2563EB',
      } as any,
      { transaction },
    );
    // Create User (Workspace Owner)
    const user = await User.create(
      {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        mobile: data.mobile || null,
        role: 'OWNER',
        workspaceId: workspace.id,
        branchId: branch.id,
      } as any,
      { transaction },
    );
    await addOwnerMembership(user.id, workspace.id, transaction);
    const userWithWorkspace = await User.findByPk(user.id, {
      ...{
        include: [Workspace],
      },
      transaction,
    });
    return this.generateTokenResponse(
      userWithWorkspace!,
      workspace.id,
      transaction,
    );
  }
  async login(data: any) {
    const user = await User.findOne({
      where: { email: data.email },
      include: [Workspace],
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const isMatch =
      typeof data.password === 'string' && user.password
        ? await bcrypt.compare(data.password, user.password)
        : false;
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.generateTokenResponse(user, data.workspaceId);
  }
  async requestOtp(_mobile: string) {
    throw new HttpException(
      503,
      'OTP login is unavailable until an SMS verification provider is configured.',
    );
  }
  async verifyOtp(_mobile: string, _otp: string) {
    throw new HttpException(
      503,
      'OTP login is unavailable until an SMS verification provider is configured.',
    );
  }
  async generateTokenResponse(
    user: User,
    workspaceId?: string,
    transaction?: Transaction,
  ) {
    const memberships = await listMemberships(user.id, transaction);
    await resolveMembership(user, workspaceId, undefined, transaction);
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: user.workspaceId,
    };
    return {
      memberships,
      accessToken: jwt.sign(
        { ...payload, tokenUse: 'access' },
        getJwtSecret(),
        { expiresIn: '1d', algorithm: 'HS256' },
      ),
      refreshToken: jwt.sign(
        { ...payload, tokenUse: 'refresh' },
        getJwtSecret(),
        { expiresIn: '7d', algorithm: 'HS256' },
      ),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        workspaceId: user.workspaceId,
        branchId: user.branchId,
        workspace: user.workspace
          ? {
              id: user.workspace.id,
              name: user.workspace.name,
              address: user.workspace.address,
              pincode: user.workspace.pincode,
              gstNumber: user.workspace.gstNumber,
              subdomain: user.workspace.subdomain,
              logo: user.workspace.logo,
            }
          : null,
      },
    };
  }
  async updateFcmToken(
    userId: string,
    fcmToken: string,
    deviceType?: string,
    deviceName?: string,
  ) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    // Upsert: find existing device with this token, or create a new one
    const [device] = await UserDevice.findOrCreate({
      where: { userId, fcmToken },
      defaults: {
        userId,
        fcmToken,
        deviceType: deviceType || null,
        deviceName: deviceName || null,
      } as any,
    });
    return device;
  }
  async getProfile(userId: string, workspaceId?: string) {
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password'] },
      include: [Workspace],
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await resolveMembership(user, workspaceId);
    return { ...user.toJSON(), memberships: await listMemberships(userId) };
  }
  async updateProfile(userId: string, data: any, workspaceId?: string) {
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
    const workspaceFields = [
      'workspaceName',
      'address',
      'gstNumber',
      'pincode',
      'logo',
    ];
    if (workspaceFields.some((key) => data[key] !== undefined)) {
      const membership = await WorkspaceMembership.findOne({
        where: { userId, workspaceId, role: 'OWNER', status: 'ACTIVE' },
      });
      if (!membership)
        throw new ForbiddenException(
          'Only the library owner can change its details',
        );
      await requireWorkspaceWrite(membership.workspaceId);
      const workspace = await Workspace.findByPk(membership.workspaceId);
      if (!workspace) throw new BadRequestException('Library not found');
      const values: any = {};
      for (const key of workspaceFields)
        if (data[key] !== undefined)
          values[key === 'workspaceName' ? 'name' : key] = data[key];
      await workspace.update(values);
    }
    return this.getProfile(userId, workspaceId);
  }
  async googleLogin(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
      throw new HttpException(503, 'Google login is not configured.');
    if (typeof idToken !== 'string' || idToken.startsWith('mock-token-')) {
      throw new UnauthorizedException('Invalid Google token');
    }
    let googlePayload: any;
    try {
      const response = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
        {
          signal: AbortSignal.timeout(10000),
        },
      );
      googlePayload = await response.json();
      if (
        !response.ok ||
        googlePayload.aud !== clientId ||
        !['accounts.google.com', 'https://accounts.google.com'].includes(
          googlePayload.iss,
        ) ||
        ![true, 'true'].includes(googlePayload.email_verified) ||
        Number(googlePayload.exp) <= Date.now() / 1000 ||
        !Number.isFinite(Number(googlePayload.exp)) ||
        typeof googlePayload.sub !== 'string'
      ) {
        throw new Error('Invalid token');
      }
    } catch {
      throw new UnauthorizedException('Google token validation failed');
    }
    const { email, name, sub: googleId } = googlePayload;
    if (!email) {
      throw new BadRequestException('Email address not provided by Google');
    }
    let user = await User.findOne({
      where: { email },
      include: [Workspace],
    });
    if (!user) {
      // Register new user (Owner role, workspaceId is null initially)
      user = await User.create({
        email,
        name: name || 'Google User',
        googleId,
        role: 'OWNER',
      } as any);
    } else if (user.googleId && user.googleId !== googleId) {
      throw new UnauthorizedException('Google account does not match');
    } else if (!user.googleId) {
      if (!email.endsWith('@gmail.com') && !googlePayload.hd) {
        throw new UnauthorizedException(
          'Sign in with your password before linking this Google account',
        );
      }
      // Link only when Google is authoritative for this email
      await user.update({ googleId });
    }
    const tokenResponse = await this.generateTokenResponse(user);
    return {
      ...tokenResponse,
      requiresWorkspaceInfo: tokenResponse.memberships.length === 0,
    };
  }
  async setupWorkspace(
    userId: string,
    data: any,
    transaction?: Transaction,
  ): Promise<any> {
    if (!transaction)
      return sequelize.transaction((t) => this.setupWorkspace(userId, data, t));
    const user = await User.findByPk(userId, { transaction });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Generate unique subdomain
    const baseSubdomain =
      data.workspaceName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'workspace';
    let subdomain = baseSubdomain;
    let counter = 1;
    while (
      await Workspace.findOne({ ...{ where: { subdomain } }, transaction })
    ) {
      subdomain = `${baseSubdomain}-${counter}`;
      counter++;
    }
    // Create Workspace
    const workspace = await Workspace.create(
      {
        name: data.workspaceName,
        subdomain,
        address: data.address,
        pincode: data.pincode || null,
        gstNumber: data.gstNumber || null,
        logo: data.logo || null,
      } as any,
      { transaction },
    );
    // Create default branch
    const branch = await Branch.create(
      {
        workspaceId: workspace.id,
        name: 'Main Branch',
        address: data.address,
      } as any,
      { transaction },
    );
    // Create default settings
    await WorkspaceSetting.create(
      {
        workspaceId: workspace.id,
        themeColor: '#2563EB',
      } as any,
      { transaction },
    );
    await addOwnerMembership(user.id, workspace.id, transaction);
    // Legacy default only; permissions now come from membership.
    // Link user to workspace & branch
    if (!user.workspaceId)
      await user.update(
        {
          workspaceId: workspace.id,
          branchId: branch.id,
        },
        { transaction },
      );
    // Fetch user with inclusion
    const updatedUser = await User.findByPk(userId, {
      ...{
        include: [Workspace],
      },
      transaction,
    });
    return this.generateTokenResponse(updatedUser!, workspace.id, transaction);
  }
}
