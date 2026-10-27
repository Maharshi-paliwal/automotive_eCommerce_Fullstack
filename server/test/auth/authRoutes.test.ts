import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import request from 'supertest'
import bcrypt from 'bcrypt'

const mockPrisma = {
  user: {
    findUnique: jest.fn<(...args: any[]) => Promise<any>>(),
    create: jest.fn<(...args: any[]) => Promise<any>>(),
  },
}

jest.mock('../../config/prisma.js', () => ({ prisma: mockPrisma }))
jest.mock('../../config/redis.js', () => ({ redisConnection: {} }))
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: 'queue-job' }) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}))

const { default: app } = require('../../app.js') as typeof import('../../app.js')

describe('authentication routes', () => {
  beforeEach(() => { jest.clearAllMocks() })

  describe('POST /api/auth/register', () => {
    it('creates a user with a normalized email and hashed password', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null)
      mockPrisma.user.create.mockImplementation(async ({ data }: any) => ({
        id: 'user-1', ...data,
      }))

      const response = await request(app).post('/api/auth/register').send({
        name: 'Test User', email: 'TEST@example.test', password: 'good-password',
      })

      expect(response.status).toBe(201)
      expect(response.body.token).toEqual(expect.any(String))
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'test@example.test' } })
      const createArg = mockPrisma.user.create.mock.calls[0][0] as any
      expect(createArg.data.email).toBe('test@example.test')
      expect(await bcrypt.compare('good-password', createArg.data.password)).toBe(true)
      expect(response.body.user).not.toHaveProperty('password')
    })

    it.each([
      [{ email: 'test@example.test', password: 'pass' }],
      [{ name: 'Test', password: 'pass' }],
      [{ name: 'Test', email: 'test@example.test' }],
    ])('rejects missing required fields', async (payload) => {
      const response = await request(app).post('/api/auth/register').send(payload)
      expect(response.status).toBe(400)
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })

    it('rejects duplicate email addresses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' })
      const response = await request(app).post('/api/auth/register').send({
        name: 'Test', email: 'test@example.test', password: 'pass',
      })
      expect(response.status).toBe(400)
      expect(response.body.message).toBe('user already exists')
      expect(mockPrisma.user.create).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/auth/login', () => {
    let passwordHash: string
    beforeEach(async () => { passwordHash = await bcrypt.hash('good-password', 4) })

    it('returns a signed token and user without the password hash', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1', name: 'Test', email: 'test@example.test', password: passwordHash, addresses: [],
      })
      const response = await request(app).post('/api/auth/login').send({
        email: 'TEST@example.test', password: 'good-password',
      })
      expect(response.status).toBe(200)
      expect(response.body.token).toEqual(expect.any(String))
      expect(response.body.user).not.toHaveProperty('password')
      expect(response.body.user.isAdmin).toBe(false)
    })

    it('rejects incorrect passwords and unknown accounts', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1', email: 'test@example.test', password: passwordHash, addresses: [],
      })
      expect((await request(app).post('/api/auth/login').send({ email: 'test@example.test', password: 'wrong' })).status).toBe(401)
      mockPrisma.user.findUnique.mockResolvedValue(null)
      expect((await request(app).post('/api/auth/login').send({ email: 'missing@example.test', password: 'pass' })).status).toBe(401)
    })

    it('rejects missing credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({ email: 'test@example.test' })
      expect(response.status).toBe(400)
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled()
    })
  })
})
