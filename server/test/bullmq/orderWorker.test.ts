import { afterEach, describe, expect, it, jest } from '@jest/globals'

const mockFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
let mockProcessJob: (job: any) => Promise<any> = async () => { throw new Error('Worker processor was not initialized') }

jest.mock('../../config/prisma.js', () => ({ prisma: { order: { findUnique: mockFindUnique, updateMany: mockUpdateMany } } }))
jest.mock('../../config/redis.js', () => ({ redisConnection: {} }))
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: jest.fn().mockResolvedValue({ id: 'job-1' }) })),
  Worker: jest.fn().mockImplementation((_queue: string, processor: (job: any) => Promise<any>) => {
    mockProcessJob = processor
    return { on: jest.fn() }
  }),
}))

import '../../bullmq/orderWorker.js'

describe('order processing worker', () => {
  afterEach(() => jest.clearAllMocks())

  it('confirms a placed order and appends to its history', async () => {
    const order = { id: 'order-1', status: 'Placed', paymentMethod: 'cash', isPaid: false, statusHistory: [{ status: 'Placed' }] }
    mockFindUnique.mockResolvedValue(order)
    mockUpdateMany.mockResolvedValue({ count: 1 })

    await mockProcessJob({ name: 'process-order', data: { orderId: 'order-1' } })

    expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'order-1' } })
    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { id: 'order-1', status: 'Placed', OR: [{ paymentMethod: 'cash' }, { paymentMethod: 'card', isPaid: true }] },
      data: {
        status: 'Confirmed',
        statusHistory: [
          { status: 'Placed' },
          expect.objectContaining({ status: 'Confirmed', note: 'Order accepted for processing' }),
        ],
      },
    })
  })

  it.each([
    [{ id: 'order-1', status: 'Placed', paymentMethod: 'card', isPaid: false }, 'unpaid card order'],
    [{ id: 'order-1', status: 'Confirmed', paymentMethod: 'cash', isPaid: false }, 'order already advanced'],
    [{ id: 'order-1', status: 'Cancelled', paymentMethod: 'cash', isPaid: false }, 'cancelled order'],
  ])('does not update an ineligible order', async (order) => {
    mockFindUnique.mockResolvedValue(order)

    await mockProcessJob({ name: 'process-order', data: { orderId: 'order-1' } })

    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('rejects missing orders and malformed job data', async () => {
    mockFindUnique.mockResolvedValue(null)
    await expect(mockProcessJob({ name: 'process-order', data: { orderId: 'order-1' } })).rejects.toThrow('was not found')
    await expect(mockProcessJob({ name: 'process-order', data: { orderId: ' ' } })).rejects.toThrow('invalid order ID')
    expect(mockUpdateMany).not.toHaveBeenCalled()
  })

  it('rejects unknown job types', async () => {
    await expect(mockProcessJob({ name: 'unexpected-job', data: {} })).rejects.toThrow('Unknown job type')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })
})
