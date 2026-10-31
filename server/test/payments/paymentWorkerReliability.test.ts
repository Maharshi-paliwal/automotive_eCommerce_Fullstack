import { afterEach, describe, expect, it, jest } from '@jest/globals'
import { createHmac } from 'node:crypto'

const mockState: { order: any; stock: number; outbox: any[]; refundAttempts: any[] } = { order: null, stock: 0, outbox: [], refundAttempts: [] }
const mockOrderFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderFindFirst = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockOrderUpdate = jest.fn<(...args: any[]) => Promise<any>>()
const mockProductUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockOutboxCreateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockOutboxUpsert = jest.fn<(...args: any[]) => Promise<any>>()
const mockOutboxFindMany = jest.fn<(...args: any[]) => Promise<any[]>>()
const mockOutboxUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockOutboxUpdate = jest.fn<(...args: any[]) => Promise<any>>()
const mockTransaction = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundCreate = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundFetch = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptFindFirst = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptFindUnique = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptCreate = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptUpsert = jest.fn<(...args: any[]) => Promise<any>>()
const mockRefundAttemptUpdateMany = jest.fn<(...args: any[]) => Promise<any>>()
const mockQueueAdd = jest.fn<(...args: any[]) => Promise<any>>()

const mockTx = {
  order: { findUnique: mockOrderFindUnique, findFirst: mockOrderFindFirst, updateMany: mockOrderUpdateMany, update: mockOrderUpdate },
  product: { updateMany: mockProductUpdateMany },
  outboxEvent: { createMany: mockOutboxCreateMany, upsert: mockOutboxUpsert },
  refundAttempt: { findFirst: mockRefundAttemptFindFirst, findUnique: mockRefundAttemptFindUnique, create: mockRefundAttemptCreate, upsert: mockRefundAttemptUpsert, updateMany: mockRefundAttemptUpdateMany },
}

const mockPrisma = {
  $transaction: mockTransaction,
  order: mockTx.order,
  product: mockTx.product,
  outboxEvent: {
    ...mockTx.outboxEvent,
    findMany: mockOutboxFindMany,
    updateMany: mockOutboxUpdateMany,
    update: mockOutboxUpdate,
  },
  refundAttempt: mockTx.refundAttempt,
}

jest.mock('../../config/prisma.js', () => ({ prisma: mockPrisma }))
jest.mock('../../config/redis.js', () => ({ redisConnection: {} }))
jest.mock('../../config/razorpay.js', () => ({
  razorpay: { refunds: { fetch: mockRefundFetch } },
  createIdempotentRefund: mockRefundCreate,
}))
jest.mock('bullmq', () => ({
  Queue: jest.fn().mockImplementation(() => ({ add: mockQueueAdd })),
  Worker: jest.fn().mockImplementation(() => ({ on: jest.fn() })),
}))

import { expireUnpaidOrder, processOrderJob } from '../../bullmq/orderWorker.js'
import { dispatchOutboxOnce } from '../../bullmq/outboxDispatcher.js'
import { recordGatewayPayment } from '../../services/paymentService.js'

const matchesCondition = (actual: any, expected: any): boolean => {
  if (expected && typeof expected === 'object' && !(expected instanceof Date)) {
    if ('not' in expected && actual === expected.not) return false
    if ('lt' in expected && !(actual < expected.lt)) return false
    if ('lte' in expected && !(actual <= expected.lte)) return false
    if ('gt' in expected && !(actual > expected.gt)) return false
    if ('in' in expected && !expected.in.includes(actual)) return false
    return true
  }
  return actual === expected
}

const matchesWhere = (record: any, where: any): boolean => Object.entries(where).every(([key, expected]) => {
  if (key === 'OR') return (expected as any[]).some((clause) => matchesWhere(record, clause))
  if (key === 'AND') return (expected as any[]).every((clause) => matchesWhere(record, clause))
  return matchesCondition(record[key], expected)
})

const applyData = (record: any, data: any) => {
  for (const [key, value] of Object.entries(data)) {
    if (value && typeof value === 'object' && 'increment' in value) record[key] = (record[key] ?? 0) + (value as any).increment
    else record[key] = value
  }
}

const seedOrder = (status = 'Cancelled') => {
  mockState.order = {
    id: 'local-order-1', userId: 'user-1', status, paymentMethod: 'card', isPaid: false,
    total: 265, items: [{ product: 'product-1', quantity: 2 }], statusHistory: [{ status }],
    razorpayOrderId: 'order_gateway_1', razorpayPaymentId: 'pay_late',
    paymentStatus: 'refund_pending', refundStatus: 'pending', refundId: null,
    refundAmount: 26500, refundIdempotencyKey: 'tn-refund-local-order-1', refundAttempts: 0,
  }
  mockState.stock = 8
  mockState.outbox = []
  mockState.refundAttempts = []
  mockTransaction.mockImplementation(async (operation: (tx: typeof mockTx) => Promise<any>) => operation(mockTx))
  mockOrderFindUnique.mockImplementation(async () => mockState.order)
  mockOrderFindFirst.mockImplementation(async ({ where }: any) => mockState.order?.razorpayOrderId === where.razorpayOrderId ? mockState.order : null)
  mockOrderUpdateMany.mockImplementation(async ({ where, data }: any) => {
    const order = mockState.order
    const matches = order && matchesWhere(order, where)
    if (!matches) return { count: 0 }
    applyData(order, data)
    return { count: 1 }
  })
  mockOrderUpdate.mockImplementation(async ({ data }: any) => {
    applyData(mockState.order, data)
    return mockState.order
  })
  mockProductUpdateMany.mockImplementation(async ({ data }: any) => {
    mockState.stock += data.stock.increment
    return { count: 1 }
  })
  mockOutboxCreateMany.mockImplementation(async ({ data }: any) => { mockState.outbox.push(...data); return { count: data.length } })
  mockOutboxUpsert.mockImplementation(async ({ create, update }: any) => {
    const found = mockState.outbox.find((item) => item.dedupeKey === create.dedupeKey)
    if (found) Object.assign(found, update)
    else mockState.outbox.push(create)
    return found ?? create
  })
  mockRefundAttemptFindFirst.mockImplementation(async ({ where, orderBy }: any) => {
    const matches = mockState.refundAttempts.filter((item) => item.orderId === where.orderId && (!where.status || item.status === where.status))
    return matches.sort((a, b) => orderBy?.attemptNumber?.sort === 'asc' ? a.attemptNumber - b.attemptNumber : b.attemptNumber - a.attemptNumber)[0] ?? null
  })
  mockRefundAttemptFindUnique.mockImplementation(async ({ where }: any) => mockState.refundAttempts.find((item) => item.refundId === where.refundId || item.id === where.id) ?? null)
  mockRefundAttemptCreate.mockImplementation(async ({ data }: any) => {
    const created = { id: `refund-attempt-${data.attemptNumber}`, ...data }
    mockState.refundAttempts.push(created)
    return created
  })
  mockRefundAttemptUpsert.mockImplementation(async ({ where, create, update }: any) => {
    let found = mockState.refundAttempts.find((item) => item.orderId === where.orderId_attemptNumber.orderId && item.attemptNumber === where.orderId_attemptNumber.attemptNumber)
    if (found) Object.assign(found, update)
    else { found = { id: `refund-attempt-${create.attemptNumber}`, ...create }; mockState.refundAttempts.push(found) }
    return found
  })
  mockRefundAttemptUpdateMany.mockImplementation(async ({ where, data }: any) => {
    const attempt = mockState.refundAttempts.find((item) => matchesWhere(item, where))
    if (!attempt) return { count: 0 }
    applyData(attempt, data)
    return { count: 1 }
  })
  mockOutboxFindMany.mockImplementation(async () => mockState.outbox.filter((item) => !item.processedAt).map((item, index) => { item.id = item.id ?? String(index); item.attempts = item.attempts ?? 0; return { ...item, createdAt: item.createdAt ?? new Date(), lockedUntil: item.lockedUntil ?? null, processedAt: null } }))
  mockOutboxUpdateMany.mockImplementation(async ({ where, data }: any) => {
    const event = mockState.outbox.find((item) => (where.dedupeKey && item.dedupeKey === where.dedupeKey) || (where.id && (item.id === where.id || String(mockState.outbox.indexOf(item)) === where.id)))
    if (!event) return { count: 0 }
    if (data.attempts?.increment) event.attempts = (event.attempts ?? 0) + data.attempts.increment
    Object.assign(event, { ...data, attempts: event.attempts })
    return { count: 1 }
  })
  mockOutboxUpdate.mockImplementation(async ({ where, data }: any) => {
    const event = mockState.outbox.find((item) => item.id === where.id)
    Object.assign(event, data)
    return event
  })
  mockRefundCreate.mockReset()
  mockRefundFetch.mockReset()
  mockRefundAttemptFindFirst.mockClear()
  mockRefundAttemptFindUnique.mockClear()
  mockRefundAttemptCreate.mockClear()
  mockRefundAttemptUpsert.mockClear()
  mockRefundAttemptUpdateMany.mockClear()
  mockQueueAdd.mockReset().mockResolvedValue({ id: 'job-1' })
}

describe('payment worker reliability', () => {
  afterEach(() => jest.clearAllMocks())

  it('persists refund API failure and leaves the same operation retryable', async () => {
    seedOrder()
    mockRefundCreate.mockRejectedValueOnce(new Error('gateway unavailable'))
    await expect(processOrderJob({ name: 'refund-expired-payment', data: { orderId: 'local-order-1' } } as any)).rejects.toThrow('Razorpay refund submission failed')
    expect(mockState.order).toMatchObject({ refundStatus: 'pending', refundAttempts: 1 })
    expect(mockState.refundAttempts[0]).toMatchObject({ status: 'pending', lastError: 'Razorpay refund submission failed; safe retry will reuse the same idempotency key' })
  })

  it('retries a failed refund request with the same idempotency key', async () => {
    seedOrder()
    mockRefundCreate.mockRejectedValueOnce(new Error('temporary failure')).mockResolvedValueOnce({ id: 'rf_1', payment_id: 'pay_late', amount: 26500, status: 'pending' })
    await expect(processOrderJob({ name: 'refund-expired-payment', data: { orderId: 'local-order-1' } } as any)).rejects.toThrow()
    await processOrderJob({ name: 'refund-expired-payment', data: { orderId: 'local-order-1' } } as any)
    expect(mockRefundCreate).toHaveBeenNthCalledWith(1, 'pay_late', 26500, 'tn-refund-local-order-1')
    expect(mockRefundCreate).toHaveBeenNthCalledWith(2, 'pay_late', 26500, 'tn-refund-local-order-1')
    expect(mockState.order).toMatchObject({ refundId: 'rf_1', refundStatus: 'pending' })
  })

  it('reuses the same refund attempt and idempotency key after the provider accepts but local acknowledgement fails', async () => {
    seedOrder()
    mockState.order.isPaid = true
    mockState.order.refundAttempts = 1
    mockState.refundAttempts.push({
      id: 'refund-attempt-1', orderId: mockState.order.id, attemptNumber: 1, paymentId: 'pay_late',
      amount: 26500, idempotencyKey: 'tn-refund-local-order-1-1', status: 'pending', refundId: null,
    })
    const providerRefunds = new Map<string, { id: string; payment_id: string; amount: number; status: string }>()
    const providerCreate = jest.fn(async (paymentId: string, amount: number, idempotencyKey: string) => {
      const existing = providerRefunds.get(idempotencyKey)
      if (existing) return existing
      const created = { id: 'rf_accepted_once', payment_id: paymentId, amount, status: 'pending' }
      providerRefunds.set(idempotencyKey, created)
      return created
    })
    mockRefundCreate.mockImplementation(providerCreate)
    mockRefundAttemptUpdateMany.mockRejectedValueOnce(new Error('database acknowledgement failed'))

    await expect(processOrderJob({ name: 'refund-expired-payment', data: { orderId: mockState.order.id, attemptNumber: 1 } } as any))
      .rejects.toThrow('database acknowledgement failed')
    expect(providerRefunds.size).toBe(1)
    expect(mockState.refundAttempts[0]).toMatchObject({ status: 'pending', refundId: null })

    await processOrderJob({ name: 'refund-expired-payment', data: { orderId: mockState.order.id, attemptNumber: 1 } } as any)

    expect(providerCreate).toHaveBeenCalledTimes(2)
    expect(providerCreate.mock.calls.map((call) => call[2])).toEqual([
      'tn-refund-local-order-1-1', 'tn-refund-local-order-1-1',
    ])
    expect(providerRefunds.size).toBe(1)
    expect(mockState.refundAttempts[0]).toMatchObject({ status: 'pending', refundId: 'rf_accepted_once' })
    expect(mockState.order).toMatchObject({ refundStatus: 'pending', refundId: 'rf_accepted_once' })
  })

  it('does not create another refund when a previously requested refund is processed', async () => {
    seedOrder()
    mockState.order.refundId = 'rf_existing'
    mockRefundFetch.mockResolvedValue({ id: 'rf_existing', payment_id: 'pay_late', amount: 26500, status: 'processed' })
    await processOrderJob({ name: 'refund-expired-payment', data: { orderId: 'local-order-1' } } as any)
    await processOrderJob({ name: 'refund-expired-payment', data: { orderId: 'local-order-1' } } as any)
    expect(mockRefundFetch).toHaveBeenCalledTimes(1)
    expect(mockRefundCreate).not.toHaveBeenCalled()
    expect(mockState.order).toMatchObject({ paymentStatus: 'refunded', refundStatus: 'processed' })
  })

  it('keeps a paid cancellation in refund_failed when Razorpay reports a failed refund', async () => {
    seedOrder()
    mockState.order.isPaid = true
    mockState.order.refundAttempts = 1
    mockState.refundAttempts.push({
      id: 'refund-attempt-1', orderId: mockState.order.id, attemptNumber: 1, paymentId: 'pay_late',
      amount: 26500, idempotencyKey: 'tn-refund-local-order-1-1', status: 'pending',
    })
    mockRefundCreate.mockResolvedValueOnce({ id: 'rf_failed', payment_id: 'pay_late', amount: 26500, status: 'failed' })

    await processOrderJob({ name: 'refund-expired-payment', data: { orderId: 'local-order-1', attemptNumber: 1 } } as any)

    expect(mockRefundCreate).toHaveBeenCalledTimes(1)
    expect(mockState.order).toMatchObject({ isPaid: true, refundStatus: 'failed', paymentStatus: 'refund_failed' })
    expect(mockState.refundAttempts[0].status).toBe('failed')
    expect(mockState.order.paymentStatus).not.toBe('refunded')
  })

  it('serializes payment verification and expiry so stock restores only when expiry wins', async () => {
    seedOrder('Placed')
    mockState.order.razorpayPaymentId = null
    mockState.order.paymentStatus = 'pending'
    const [paymentResult] = await Promise.all([
      recordGatewayPayment({ razorpayOrderId: 'order_gateway_1', paymentId: 'pay_race', amount: 26500, currency: 'INR' }),
      expireUnpaidOrder('local-order-1'),
    ])
    const paid = mockState.order.isPaid
    const expired = mockState.order.status === 'Cancelled'
    expect(paid !== expired).toBe(true)
    expect(mockState.stock).toBe(expired ? 10 : 8)
    if (expired) expect(paymentResult.kind).toBe('expired')
    else expect(paymentResult.kind).toBe('paid')
  })

  it('restores inventory once when the expiry job is delivered more than once', async () => {
    seedOrder('Placed')
    mockState.order.razorpayPaymentId = null
    mockState.order.paymentStatus = 'pending'
    await processOrderJob({ name: 'expire-unpaid-order', data: { orderId: 'local-order-1' } } as any)
    await processOrderJob({ name: 'expire-unpaid-order', data: { orderId: 'local-order-1' } } as any)
    expect(mockState.order.status).toBe('Cancelled')
    expect(mockState.stock).toBe(10)
    expect(mockProductUpdateMany).toHaveBeenCalledTimes(1)
  })

  it('retains a paid order in the database outbox when Redis queue delivery fails', async () => {
    seedOrder('Placed')
    mockState.order.razorpayPaymentId = null
    mockState.order.paymentStatus = 'pending'
    await recordGatewayPayment({ razorpayOrderId: 'order_gateway_1', paymentId: 'pay_1', amount: 26500, currency: 'INR' })
    mockQueueAdd.mockRejectedValue(new Error('Redis unavailable'))
    await dispatchOutboxOnce()
    expect(mockState.order.isPaid).toBe(true)
    expect(mockState.outbox.length).toBeGreaterThan(0)
    expect(mockState.outbox.every((event) => !event.processedAt)).toBe(true)
  })

  it('processes COD orders without entering any Razorpay refund/payment path', async () => {
    seedOrder('Placed')
    mockState.order.paymentMethod = 'cash'
    mockState.order.razorpayPaymentId = null
    await processOrderJob({ name: 'process-order', data: { orderId: 'local-order-1' } } as any)
    expect(mockState.order.status).toBe('Confirmed')
    expect(mockRefundCreate).not.toHaveBeenCalled()
    expect(mockRefundFetch).not.toHaveBeenCalled()
  })
})
