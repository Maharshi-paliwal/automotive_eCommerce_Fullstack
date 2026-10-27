import { afterEach, describe, expect, it, jest } from '@jest/globals'
import jwt from 'jsonwebtoken'
import request from 'supertest'

const mockPrisma = { user: { findUnique: jest.fn<(...args: any[]) => Promise<any>>() } }
const mockSend = jest.fn<(...args: any[]) => Promise<any>>()

jest.mock('../../config/prisma.js', () => ({ prisma: mockPrisma }))
jest.mock('../../config/redis.js', () => ({ redisConnection: {} }))
jest.mock('../../config/s3.js', () => ({ s3Client: { send: mockSend }, bucketName: 'jest-test-bucket' }))
jest.mock('bullmq', () => ({ Queue: jest.fn().mockImplementation(() => ({ add: jest.fn() })), Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })) }))

const { default: app } = require('../../app.js') as typeof import('../../app.js')
const token = jwt.sign({ id: 'admin-1' }, 'jest-only-secret')

describe('upload routes', () => {
  afterEach(() => jest.clearAllMocks())

  it('requires authentication and admin access', async () => {
    expect((await request(app).post('/api/upload')).status).toBe(401)
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@example.test' })
    const response = await request(app).post('/api/upload').set('Authorization', `Bearer ${token}`)
    expect(response.status).toBe(400)
    expect(response.body.message).toBe('No image file provided')
    expect(mockSend).not.toHaveBeenCalled()
  })

  it('uploads an allowed image to S3 and returns its key', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@example.test' })
    mockSend.mockResolvedValue({})

    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('fake png image'), { filename: 'product.png', contentType: 'image/png' })

    expect(response.status).toBe(201)
    expect(response.body.message).toBe('Image uploaded successfully')
    expect(response.body.key).toMatch(/^products\/.+\.png$/)
    const command = mockSend.mock.calls[0][0] as any
    expect(command.input).toMatchObject({ Bucket: 'jest-test-bucket', Key: response.body.key, ContentType: 'image/png' })
    expect(command.input.Body).toEqual(Buffer.from('fake png image'))
  })

  it('returns an upload error when S3 rejects the request', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'admin-1', email: 'admin@example.test' })
    mockSend.mockRejectedValue(new Error('S3 unavailable'))
    const error = jest.spyOn(console, 'error').mockImplementation(() => undefined)

    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', Buffer.from('fake image'), { filename: 'product.webp', contentType: 'image/webp' })

    expect(response.status).toBe(500)
    expect(response.body.message).toBe('Image upload failed')
    error.mockRestore()
  })
})
