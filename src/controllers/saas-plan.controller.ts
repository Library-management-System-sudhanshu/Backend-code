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
    const { name, price, description, maxSeats, features } = req.body;
    
    if (!name || price === undefined) {
      return res.status(400).json({ message: 'Name and price are required' });
    }

    const plan = await SaaSPlan.create({
      name,
      price,
      description,
      maxSeats: maxSeats || -1,
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
    const { name, price, description, maxSeats, features, isActive } = req.body;

    const plan = await SaaSPlan.findByPk(id as string);
    if (!plan) {
      return res.status(404).json({ message: 'SaaS plan not found' });
    }

    await plan.update({
      name,
      price,
      description,
      maxSeats,
      features,
      isActive,
    });

    res.json(plan);
  } catch (error) {
    res.status(500).json({ message: 'Error updating SaaS plan', error });
  }
};
