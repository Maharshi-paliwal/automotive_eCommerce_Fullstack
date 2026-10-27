import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals'

jest.mock('../../config/prisma.js', () => ({ prisma: { $transaction: jest.fn() } }))
jest.mock('../../config/redis.js', () => ({ redisConnection: {} }))
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: 'assignment-job' }) })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}))

import { prisma } from '../../config/prisma.js'
import { assignRiderAfterDelay, riderAssignmentQueue, scheduleRiderAssignment } from '../../bullmq/riderAssignment.js'

describe('rider assignment jobs', () => {
  const transaction = prisma.$transaction as jest.Mock

  afterEach(() => jest.clearAllMocks())

  it('schedules one assignment job with a five minute delay and stable order job ID', async () => {
    await scheduleRiderAssignment('order-123')

    expect(riderAssignmentQueue.add).toHaveBeenCalledWith('auto-assign-rider', { orderId: 'order-123' }, {
      delay: 5 * 60 * 1000,
      jobId: 'auto-assign-rider-order-123',
    })
  })

  it('rejects scheduling without a valid order ID', async () => {
    await expect(scheduleRiderAssignment(' ')).rejects.toThrow('A valid order ID is required')
    expect(riderAssignmentQueue.add).not.toHaveBeenCalled()
  })

  it('assigns an available rider, creates a six digit OTP, and appends history', async () => {
    const order = { id: 'order-1', status: 'Placed', deliveryPartnerId: null, statusHistory: [{ status: 'Placed' }] }
    const rider = { id: 'rider-1', name: 'Sam Rider' }
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue(order),
        findMany: jest.fn().mockResolvedValue([{ deliveryPartnerId: 'busy-rider' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      deliveryPartner: { findFirst: jest.fn().mockResolvedValue(rider) },
    }
    transaction.mockImplementation(async (callback: any, options: any) => {
      expect(options).toEqual({ isolationLevel: 'Serializable' })
      return callback(tx)
    })

    const result = await assignRiderAfterDelay('order-1')

    expect(result).toEqual({ assigned: true, orderId: 'order-1', riderId: 'rider-1', riderName: 'Sam Rider' })
    expect(tx.deliveryPartner.findFirst).toHaveBeenCalledWith({
      where: { isActive: true, id: { notIn: ['busy-rider'] } },
      orderBy: { createdAt: 'asc' },
    })
    const update = tx.order.updateMany.mock.calls[0][0]
    expect(update.where).toEqual({ id: 'order-1', deliveryPartnerId: null, status: { notIn: ['Cancelled', 'Delivered'] } })
    expect(update.data.deliveryOtp).toMatch(/^\d{6}$/)
    expect(update.data).toMatchObject({ deliveryPartnerId: 'rider-1', status: 'Assigned' })
    expect(update.data.statusHistory).toHaveLength(2)
    expect(update.data.statusHistory[1].note).toContain('Sam Rider')
  })

  it.each([
    [null, 'Order not found'],
    [{ id: 'order-1', status: 'Placed', deliveryPartnerId: 'rider-1' }, 'Order already assigned'],
    [{ id: 'order-1', status: 'Cancelled', deliveryPartnerId: null }, 'Order is cancelled'],
    [{ id: 'order-1', status: 'Delivered', deliveryPartnerId: null }, 'Order is delivered'],
  ])('skips assignment when the order is not eligible', async (order, reason) => {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue(order),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      deliveryPartner: { findFirst: jest.fn() },
    }
    transaction.mockImplementation(async (callback: any) => callback(tx))

    await expect(assignRiderAfterDelay('order-1')).resolves.toEqual({ skipped: true, reason })
    expect(tx.order.updateMany).not.toHaveBeenCalled()
    expect(tx.deliveryPartner.findFirst).not.toHaveBeenCalled()
  })

  it('skips assignment when every active rider is busy', async () => {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'order-1', status: 'Placed', deliveryPartnerId: null }),
        findMany: jest.fn().mockResolvedValue([{ deliveryPartnerId: 'rider-1' }]),
        updateMany: jest.fn(),
      },
      deliveryPartner: { findFirst: jest.fn().mockResolvedValue(null) },
    }
    transaction.mockImplementation(async (callback: any) => callback(tx))

    await expect(assignRiderAfterDelay('order-1')).resolves.toEqual({ skipped: true, reason: 'No available riders' })
    expect(tx.deliveryPartner.findFirst).toHaveBeenCalled()
    expect(tx.order.updateMany).not.toHaveBeenCalled()
  })

  it('skips the write if order state changed before assignment', async () => {
    const tx = {
      order: {
        findUnique: jest.fn().mockResolvedValue({ id: 'order-1', status: 'Placed', deliveryPartnerId: null }),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      deliveryPartner: { findFirst: jest.fn().mockResolvedValue({ id: 'rider-1', name: 'Sam Rider' }) },
    }
    transaction.mockImplementation(async (callback: any) => callback(tx))

    await expect(assignRiderAfterDelay('order-1')).resolves.toEqual({ skipped: true, reason: 'Order changed before assignment' })
  })
})
