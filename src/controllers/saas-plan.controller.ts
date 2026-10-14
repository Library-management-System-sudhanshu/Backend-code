import { Request, Response } from 'express';
import { SaaSPlan } from '../models/saas-plan.model';

export const getSaaSPlans = async (req: Request, res: Response) => {
  try {
    const plans = await SaaSPlan.findAll({
      order: [['price', 'ASC']],
    });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching SaaS plans', error });
  }
};

export const createSaaSPlan = async (req: Request, res: Response) => {
  try {
    // Only SUPER_ADMIN can reach here (protected by middleware)
    const {
      name,
      price,
      description,
      maxSeats,
      features,
      durationDays = 30,
    } = req.body;

    if (
      (maxSeats !== undefined &&
        (!Number.isInteger(maxSeats) || maxSeats < -1)) ||
      !name ||
      price === undefined ||
      !Number.isInteger(durationDays) ||
      durationDays <= 0 ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0
    ) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    const plan = await SaaSPlan.create({
      name,
      price,
      description,
      durationDays,
      maxSeats: maxSeats ?? -1,
      features: features || [],
      isActive: true,
    } as any);

    res.status(201).json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error creating SaaS plan', error });
  }
};

export const updateSaaSPlan = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      price,
      description,
      maxSeats,
      features,
      isActive,
      durationDays,
    } = req.body;

    if (
      (durationDays !== undefined &&
        (!Number.isInteger(durationDays) || durationDays < 1)) ||
      (price !== undefined &&
        (!Number.isFinite(Number(price)) || Number(price) < 0)) ||
      (maxSeats !== undefined && (!Number.isInteger(maxSeats) || maxSeats < -1))
    ) {
      return res
        .status(400)
        .json({ message: 'Invalid duration, price, or seat limit' });
    }
    const plan = await SaaSPlan.findByPk(id as string);
    if (!plan) {
      return res.status(404).json({ message: 'SaaS plan not found' });
    }

    await plan.update({
      name,
      price,
      description,
      maxSeats,
      ...(durationDays !== undefined ? { durationDays } : {}),
      features,
      isActive,
    });

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error updating SaaS plan', error });
  }
};
