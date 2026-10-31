import { afterEach, describe, expect, it, jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import request from 'supertest'

const mockPrisma = {
  $transaction: jest.fn<(...args: any[]) => Promise<any>>(),
  product: { findMany: jest.fn<(...args: any[]) => Promise<any[]>>() },
}

jest.mock('../../config/prisma.js', () => ({ prisma: mockPrisma }))
jest.mock('../../config/redis.js', () => ({ redisConnection: {} }))
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: 'queue-job' }) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}))

const { default: app } = require('../../app.js') as typeof import('../../app.js')
const token = jwt.sign({ id: 'user-1' }, 'jest-only-secret-with-more-than-thirty-two-characters')
const products = [{ id: 'product-1', name: 'Apples', image: 'apples.png', price: 100, stock: 5, unit: 'kg' }]

describe('order routes', () => {
  afterEach(() => jest.clearAllMocks())

  it('reads item pricing from database records before creating an order', async () => {
    mockPrisma.product.findMany.mockResolvedValue(products)
    const tx = {
      product: { findMany: jest.fn<(...args: any[]) => Promise<any[]>>().mockResolvedValue(products), updateMany: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ count: 1 }) },
      order: { create: jest.fn<(...args: any[]) => Promise<any>>().mockImplementation(async ({ data }) => ({ id: 'order-1', ...data })) },
      outboxEvent: { createMany: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ count: 2 }), create: jest.fn() },
    }
    mockPrisma.$transaction.mockImplementation(async (operation) => operation(tx))
    const response = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      items: [{ product: 'product-1', quantity: 2 }], shippingAddress: { address: '123 Test Street' }, paymentMethod: 'cash', total: 0,
    })
    expect(response.status).toBe(201)
    expect(response.body.order.total).toBe(265)
    expect(mockPrisma.product.findMany).toHaveBeenCalled()
  })

  it('validates items before accessing inventory', async () => {
    const response = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({ items: [] })
    expect(response.status).toBe(400)
    expect(response.body.message).toBe('no order items')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('calculates totals from database prices and decrements stock in the order transaction', async () => {
    mockPrisma.product.findMany.mockResolvedValue(products)
    const tx = {
      product: {
        findMany: jest.fn<(...args: any[]) => Promise<any[]>>().mockResolvedValue(products),
        updateMany: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ count: 1 }),
      },
      outboxEvent: { createMany: jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue({ count: 2 }), create: jest.fn() },
      order: { create: jest.fn<(...args: any[]) => Promise<any>>().mockImplementation(async ({ data }) => ({ id: 'order-1', ...data })) },
    }
    mockPrisma.$transaction.mockImplementation(async (operation) => operation(tx))

    const response = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      items: [{ product: 'product-1', quantity: 2 }],
      shippingAddress: { address: '123 Test Street' },
      paymentMethod: 'cash',
    })

    expect(response.status).toBe(201)
    expect(response.body.order).toMatchObject({ subtotal: 200, deliveryFee: 49, tax: 16, total: 265 })
    expect(tx.product.updateMany).toHaveBeenCalledWith({
      where: { id: 'product-1', stock: { gte: 2 } }, data: { stock: { decrement: 2 } },
    })
    expect(tx.order.create).toHaveBeenCalled()
    expect(tx.outboxEvent.createMany).toHaveBeenCalledWith({ data: expect.arrayContaining([
      expect.objectContaining({ dedupeKey: `order:${response.body.order.id}:process`, jobName: 'process-order' }),
      expect.objectContaining({ dedupeKey: `order:${response.body.order.id}:rider`, jobName: 'auto-assign-rider' }),
    ]) })
  })

  it('does not create an order when stock is unavailable', async () => {
    mockPrisma.product.findMany.mockResolvedValue([])
    const tx = {
      product: { findMany: jest.fn<(...args: any[]) => Promise<any[]>>().mockResolvedValue([]) },
      outboxEvent: { createMany: jest.fn(), create: jest.fn() },
      order: { create: jest.fn() },
    }
    mockPrisma.$transaction.mockImplementation(async (operation) => operation(tx))

    const response = await request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      items: [{ product: 'missing-product', quantity: 1 }], shippingAddress: { address: '123 Test Street' }, paymentMethod: 'cash',
    })

    expect(response.status).toBe(404)
    expect(response.body.message).toBe('Product out of stock')
    expect(tx.order.create).not.toHaveBeenCalled()
  })
})
