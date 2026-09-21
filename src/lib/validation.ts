import { z } from 'zod'

export const checkoutSchema = z.object({
  email: z.string().email('Valid email is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  address1: z.string().min(1, 'Address is required'),
  address2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
  phone: z.string().optional(),
  shippingMethodId: z.string().min(1, 'Shipping method is required'),
  paymentProvider: z.enum(['stripe', 'paypal', 'paypal_standard', 'cod']).optional(),
  discountCode: z.string().optional(),
  notes: z.string().optional(),
  createAccount: z.boolean().optional(),
  password: z.string().min(8).optional().or(z.literal(''))
})

export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  slug: z.string().min(1, 'Slug is required'),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  price: z.number().min(0),
  compareAtPrice: z.number().optional().nullable(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  inventoryQty: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
  featured: z.boolean(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  weight: z.number().optional().nullable(),
  length: z.number().optional().nullable(),
  width: z.number().optional().nullable(),
  height: z.number().optional().nullable()
})

export const categorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  parentId: z.string().optional().nullable(),
  isVisible: z.boolean().default(true),
  sortOrder: z.number().int().default(0)
})

export const discountSchema = z.object({
  code: z.string().min(1).toUpperCase(),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT', 'FREE_SHIPPING']),
  value: z.number().min(0),
  minOrderAmount: z.number().optional().nullable(),
  maxDiscount: z.number().optional().nullable(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  usageLimit: z.number().int().optional().nullable(),
  perCustomerLimit: z.number().int().optional().nullable(),
  isActive: z.boolean()
})

export const shippingMethodSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.number().min(0),
  freeShippingThreshold: z.number().optional().nullable(),
  countries: z.string(),
  estimatedDays: z.string().optional(),
  isActive: z.boolean(),
  sortOrder: z.number().int().default(0)
})

export const taxRateSchema = z.object({
  country: z.string().min(1),
  region: z.string().optional(),
  rate: z.number().min(0).max(100),
  name: z.string().optional(),
  isActive: z.boolean()
})

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional()
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})
