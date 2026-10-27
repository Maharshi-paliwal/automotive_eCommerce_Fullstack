import { afterEach, describe, expect, it, jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import request from 'supertest'

const mockPrisma = {
  user: { findUnique: jest.fn<(...args: any[]) => Promise<any>>() },
  product: {
    findMany: jest.fn<(...args: any[]) => Promise<any[]>>(),
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    create: jest.fn<(...args: any[]) => Promise<any>>(),
    update: jest.fn<(...args: any[]) => Promise<any>>(),
    delete: jest.fn<(...args: any[]) => Promise<any>>(),
  },
}

jest.mock('../../config/prisma.js', () => ({ prisma: mockPrisma }))
jest.mock('../../config/redis.js', () => ({ redisConnection: {} }))
jest.mock('bullmq', () => ({ Queue: jest.fn().mockImplementation(() => ({ add: jest.fn() })), Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })) }))

const { default: app } = require('../../app.js') as typeof import('../../app.js')
const token = jwt.sign({ id: 'admin-1' }, 'jest-only-secret')

describe('product routes', () => {
  afterEach(() => jest.clearAllMocks())

  it('lists available flash deals with discounts', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      { id: 'p1', name: 'Apples', price: 80, originalPrice: 100, stock: 4 },
    ])

    const response = await request(app).get('/api/products/flash-deals')

    expect(response.status).toBe(200)
    expect(response.body.produtcs).toEqual([{ id: 'p1', name: 'Apples', price: 80, originalPrice: 100, stock: 4, discount: 20 }])
    expect(mockPrisma.product.findMany).toHaveBeenCalledWith({ where: { stock: { gt: 0 } }, orderBy: { originalPrice: 'desc' } })
  })

  it('returns a product and its calculated discount, or 404 when missing', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'p1', price: 75, originalPrice: 100 })
    const found = await request(app).get('/api/products/p1')
    expect(found.status).toBe(200)
    expect(found.body.product.discount).toBe(25)

    mockPrisma.product.findUnique.mockResolvedValue(null)
    const missing = await request(app).get('/api/products/missing')
    expect(missing.status).toBe(404)
    expect(missing.body.message).toBe('product not found')
  })

  it('requires an admin for product mutations and creates, updates, and deletes products', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@example.test' })
    mockPrisma.product.create.mockImplementation(async ({ data }: any) => data)
    mockPrisma.product.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }))
    mockPrisma.product.delete.mockResolvedValue({})
    const auth = { Authorization: `Bearer ${token}` }

    const created = await request(app).post('/api/products').set(auth).send({ name: 'Pear', price: 5 })
    expect(created.status).toBe(201)
    expect(created.body.product).toMatchObject({ name: 'Pear', price: 5 })
    expect(created.body.product.id).toEqual(expect.any(String))

    const updated = await request(app).put('/api/products/p1').set(auth).send({ price: 6 })
    expect(updated.status).toBe(200)
    expect(mockPrisma.product.update).toHaveBeenCalledWith({ where: { id: 'p1' }, data: { price: 6 } })

    const deleted = await request(app).delete('/api/products/p1').set(auth)
    expect(deleted.status).toBe(200)
    expect(deleted.body.message).toBe('Deleted')

    mockPrisma.user.findUnique.mockResolvedValue({ id: 'customer-1', email: 'customer@example.test' })
    const forbidden = await request(app).post('/api/products').set('Authorization', `Bearer ${jwt.sign({ id: 'customer-1' }, 'jest-only-secret')}`).send({ name: 'Pear' })
    expect(forbidden.status).toBe(403)
    expect(mockPrisma.product.create).toHaveBeenCalledTimes(1)
  })
})
